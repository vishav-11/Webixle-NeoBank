// hooks/useAppUpdate.ts
import { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';

export interface UpdateState {
  isChecking:    boolean;
  isDownloading: boolean;
  isAvailable:   boolean;
  isReady:       boolean;
  error:         string | null;
  manifest:      any | null;
}

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({
    isChecking:    false,
    isDownloading: false,
    isAvailable:   false,
    isReady:       false,
    error:         null,
    manifest:      null,
  });

  // ── Check for update ────────────────────────────────────────────────────────
  const checkForUpdate = useCallback(async () => {
    // ✅ Expo Go mein ya dev mode mein skip karo
    if (__DEV__) {
      console.log('[Update] Dev mode - skipping update check');
      return;
    }

    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      const result = await Updates.checkForUpdateAsync();

      if (result.isAvailable) {
        setState(prev => ({
          ...prev,
          isChecking:  false,
          isAvailable: true,
          manifest:    result.manifest,
        }));
      } else {
        setState(prev => ({ ...prev, isChecking: false }));
      }
    } catch (err: any) {
      console.error('[Update] Check error:', err);
      setState(prev => ({
        ...prev,
        isChecking: false,
        error:      err.message ?? 'Failed to check for update',
      }));
    }
  }, []);

  // ── Download + apply update ─────────────────────────────────────────────────
  const downloadAndApply = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isDownloading: true, error: null }));

      await Updates.fetchUpdateAsync();

      setState(prev => ({ ...prev, isDownloading: false, isReady: true }));

      // ✅ Reload app
      await Updates.reloadAsync();

    } catch (err: any) {
      console.error('[Update] Download error:', err);
      setState(prev => ({
        ...prev,
        isDownloading: false,
        error:         err.message ?? 'Failed to download update',
      }));
    }
  }, []);

  // ── Dismiss update ──────────────────────────────────────────────────────────
  const dismissUpdate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAvailable: false,
      isReady:     false,
      error:       null,
    }));
  }, []);

  // ── Auto check on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    // App open hone ke 3s baad check karo (splash ke baad)
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return {
    ...state,
    checkForUpdate,
    downloadAndApply,
    dismissUpdate,
  };
}