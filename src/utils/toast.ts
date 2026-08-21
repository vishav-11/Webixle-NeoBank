// utils/toast.ts
/**
 * Cross-platform toast utility
 * Works on iOS, Android & Web
 * No extra library needed — uses Alert as fallback
 * 
 * To use react-native-toast-message (optional):
 *   npm install react-native-toast-message
 *   Then replace AlertToast with Toast from that library
 */
import { Alert, Platform } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?:    string;
  message:   string;
  type?:     ToastType;
  duration?: number; // ms (used only when real toast lib is available)
}

// ─── Title map ────────────────────────────────────────────────────
const DEFAULT_TITLES: Record<ToastType, string> = {
  success: '✅ Success',
  error:   '❌ Error',
  warning: '⚠️ Warning',
  info:    'ℹ️ Info',
};

/**
 * If you install `react-native-toast-message`:
 *   1. import Toast from 'react-native-toast-message';
 *   2. Add <Toast /> in your root layout
 *   3. Replace the body below with Toast.show(...)
 *
 * For now, falls back to Alert (always works).
 */
function showToast(opts: ToastOptions) {
  const type    = opts.type    ?? 'info';
  const title   = opts.title   ?? DEFAULT_TITLES[type];
  const message = opts.message;

  // ── Try react-native-toast-message if available ────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Toast = require('react-native-toast-message').default;
    Toast.show({
      type:           type === 'error'   ? 'error'
                    : type === 'success' ? 'success'
                    : 'info',
      text1:          title,
      text2:          message,
      visibilityTime: opts.duration ?? 3500,
      position:       'top',
    });
    return;
  } catch {
    // Library not installed → fall through to Alert
  }

  // ── Fallback: Alert ────────────────────────────────────────────
  Alert.alert(title, message);
}

// ─── Convenience helpers ──────────────────────────────────────────
export const toast = {
  success: (message: string, title?: string) =>
    showToast({ type: 'success', message, title }),

  error: (message: string, title?: string) =>
    showToast({ type: 'error', message, title }),

  warning: (message: string, title?: string) =>
    showToast({ type: 'warning', message, title }),

  info: (message: string, title?: string) =>
    showToast({ type: 'info', message, title }),

  show: (opts: ToastOptions) => showToast(opts),
};