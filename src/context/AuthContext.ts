// context/AuthContext.tsx
import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query'; // ✅ ADD
import { TokenStorage } from '@/services/apiClient';
import {
  authService, isSuccess,
  type UpdateProfilePayload, type UserProfile,
} from '@/services/authService';
import { QK, getProfileQueryKey } from '@/hooks/queires';

const BYPASS_KYC = true;

interface AuthState {
  user:            UserProfile | null;
  token:           string | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login:         (token: string, user: UserProfile) => Promise<void>;
  logout:        () => Promise<void>;
  refresh:       () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
}

const isKycApproved = (user: UserProfile | null): boolean => {
  if (BYPASS_KYC) return true;
  return user?.kycStatus === 'Approved';
};

const INITIAL_STATE: AuthState = {
  user:            null,
  token:           null,
  isLoading:       true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const router       = useRouter();
  const segments     = useSegments();
  const bootstrapped = useRef(false);

  // ✅ QueryClient access - cache clear करने के लिए
  const queryClient = useQueryClient();

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const token = await TokenStorage.get();

        if (token) {
          const res = await authService.getProfile();

          if (!cancelled && isSuccess(res) && res.data?.user) {
            setState({
              user:            res.data.user,
              token,
              isLoading:       false,
              isAuthenticated: true,
            });
            bootstrapped.current = true;
            return;
          }

          await TokenStorage.remove();
        }
      } catch (e) {
        console.warn('[AuthProvider] bootstrap error:', e);
      }

      if (!cancelled) {
        bootstrapped.current = true;
        setState({ ...INITIAL_STATE, isLoading: false });
      }
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  // ── Routing guard ──────────────────────────────────────────
  useEffect(() => {
    if (state.isLoading || !bootstrapped.current) return;

    const firstSegment  = segments[0] as string | undefined;
    const secondSegment = segments[1] as string | undefined;

    const inAuthGroup    = firstSegment === '(auth)';
    const inAppGroup     = firstSegment === '(app)';
    const inScreensGroup = firstSegment === '(screens)';
    const onSplash       = inAuthGroup && secondSegment === 'splash';
    const onKycScreen    = inScreensGroup && secondSegment === 'kyc';

    if (onSplash) return;

    if (!state.isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/splash' as any);
      return;
    }

    if (!isKycApproved(state.user)) {
      if (inAuthGroup) {
        router.replace('/(app)/kyc' as any);
        return;
      }
      if (onKycScreen || inScreensGroup) return;
      if (inAppGroup) {
        const isHome = !secondSegment || secondSegment === 'index';
        if (!isHome) router.replace('/(app)/kyc' as any);
      }
      return;
    }

    if (inAuthGroup || onKycScreen) {
      router.replace('/(app)/' as any);
    }
  }, [
    state.isLoading,
    state.isAuthenticated,
    state.user?.kycStatus,
    segments,
  ]);

// ── Login ──────────────────────────────────────────────────
const login = useCallback(async (token: string, user: UserProfile) => {
  await TokenStorage.set(token);

  // ✅ पुराने user की cache साफ़ करो
  queryClient.clear();

  setState({ user, token, isLoading: false, isAuthenticated: true });
  router.replace(isKycApproved(user) ? '/(app)/' : '/(app)/kyc' as any);
}, [router, queryClient]);


// ── Logout ─────────────────────────────────────────────────
const logout = useCallback(async () => {
  try {
    await authService.logout();
  } catch (e) {
    console.warn('[AuthProvider] logout error:', e);
  } finally {
    await TokenStorage.remove();

    // ✅ यही main fix है - logout पर cache clear करो
    queryClient.clear();

    setState({ ...INITIAL_STATE, isLoading: false });
    router.replace('/(auth)/login' as any);
  }
}, [router, queryClient]);


// ── Refresh ────────────────────────────────────────────────
const refresh = useCallback(async () => {
  try {
    const res = await authService.getProfile();
    if (isSuccess(res) && res.data?.user) {
      setState((s) => ({ ...s, user: res.data!.user! }));

      // ✅ React Query cache भी sync करो — getProfileQueryKey useProfile()
      // ke andar bani asli key ke saath EXACT match karta hai
      // (['auth','profile', userId]), isliye setQueryData yahan safe hai.
      queryClient.setQueryData(
        getProfileQueryKey(res.data.user._id),
        res.data.user,
      );
    }
  } catch (e) {
    console.warn('[AuthProvider] refresh error:', e);
  }
}, [queryClient]);

  // ── Update profile ─────────────────────────────────────────
  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const userId = state.user?._id;
    if (!userId) throw new Error('User not found. Please login again.');

    const res = await authService.updateProfile(userId, payload);

    if (!isSuccess(res)) {
      throw new Error(res.message || 'Update failed');
    }

    if (res.data?.user) {
      const updatedUser = res.data.user;
      setState((s) => ({ ...s, user: updatedUser }));

      // ✅ FIXED — pehle yahan literal ['profile'] use ho raha tha, jo
      // useProfile() ki asli key (['auth','profile', userId]) se kabhi
      // match hi nahi karta tha, isliye ye call silently no-op thi aur
      // React Query cache purana data hi dikhata rehta tha jab tak
      // 5-minute staleTime khatam na ho jaaye.
      queryClient.setQueryData(getProfileQueryKey(updatedUser._id), updatedUser);
      return;
    }

    await refresh();
  }, [state.user?._id, refresh, queryClient]);

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, login, logout, refresh, updateProfile } },
    children,
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}