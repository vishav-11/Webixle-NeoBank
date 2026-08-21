// hooks/useKycGuard.ts
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export function useKycGuard() {
  const { user } = useAuth();
  const router   = useRouter();

  const isKycApproved = user?.kycStatus === 'Approved';

  // ✅ Guard - KYC approved nahi to kyc screen pe bhejo
  const guardedNavigate = useCallback(
    (href: string) => {
      if (!isKycApproved) {
        router.push('/(app)/kyc' as any);
        return false; // blocked
      }
      router.push(href as any);
      return true; // allowed
    },
    [isKycApproved, router],
  );

  return { isKycApproved, guardedNavigate };
}