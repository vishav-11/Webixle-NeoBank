// hooks/useTabCloser.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

// How long to wait after calling window.close() before assuming the
// browser blocked it and falling back to manual instructions.
const CLOSE_FALLBACK_DELAY_MS = 400;

interface UseTabCloserResult {
  /** True when running in a web browser context. */
  isWeb: boolean;
  /** True if this tab/window was opened via window.open() (script-opened). */
  hasOpener: boolean;
  /**
   * True once we've attempted to close the tab and it's still open after
   * the fallback delay — meaning the browser silently blocked the close.
   * UI should switch to a "close this tab manually" instruction at this point.
   */
  manualCloseHint: boolean;
  /** Attempt to close the current tab/window. Safe to call multiple times. */
  attemptClose: () => void;
}

/**
 * Attempts to close the current browser tab/window.
 *
 * Browsers only allow `window.close()` to succeed on tabs/windows that were
 * opened by script (i.e. `window.opener` is set, typically via
 * `window.open()`). For tabs the user navigated to directly — which is the
 * case for our standard MoonPay flow, since we redirect via
 * `window.location.href` in the same tab — the call is silently ignored.
 *
 * There is no synchronous way to detect whether window.close() actually
 * worked, so we optimistically attempt it and fall back to showing manual
 * "please close this tab" instructions if the component is still mounted
 * (i.e. the tab is still open) shortly afterward.
 */
export function useTabCloser(): UseTabCloserResult {
  const [manualCloseHint, setManualCloseHint] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasOpener = IS_WEB && typeof window !== 'undefined' && !!window.opener;

  const attemptClose = useCallback(() => {
    if (!IS_WEB || typeof window === 'undefined') return;

    try {
      window.close();
    } catch (err) {
      console.error('[useTabCloser] window.close() threw:', err);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setManualCloseHint(true);
    }, CLOSE_FALLBACK_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isWeb: IS_WEB, hasOpener, manualCloseHint, attemptClose };
}