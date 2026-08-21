// hooks/useDeepLink.ts
import { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { useRouter,Href } from 'expo-router';

// ✅ URL parse helper
function parseConversionUrl(url: string): {
  transactionId:      string;
  baseCurrencyCode:   string;
  baseCurrencyAmount: string;
  transactionStatus:  string;
} | null {
  try {
    if (
      !url.includes('/conversion/return') &&
      !url.includes('conversion/return')
    ) return null;

    // Handle both:
    // https://app.yourmetavault.com/conversion/success?transactionId=...
    // metavault://conversion/success?transactionId=...
    const searchStr = url.includes('?') ? url.split('?')[1] : '';
    const params    = new URLSearchParams(searchStr);

    const transactionId     = params.get('transactionId')      ?? '';
    const baseCurrencyCode  = params.get('baseCurrencyCode')   ?? 'usd';
    const baseCurrencyAmount = params.get('baseCurrencyAmount') ?? '0';
    const transactionStatus = params.get('transactionStatus')  ?? 'pending';

    if (!transactionId) return null;

    return { transactionId, baseCurrencyCode, baseCurrencyAmount, transactionStatus };
  } catch (err) {
    console.error('[DeepLink] Parse error:', err);
    return null;
  }
}

export function useDeepLink() {
  const router = useRouter();

  const handleUrl = useCallback((url: string) => {
    if (!url) return;
    console.log('[DeepLink] Received URL:', url);

    const parsed = parseConversionUrl(url);
    if (!parsed) return;

    console.log('[DeepLink] Navigating to success:', parsed);

    router.push({
      pathname: '/conversion/return',
      params: parsed as Record<string, string>,
    } as Href);
  }, [router]);

  useEffect(() => {
    // ✅ App already open - incoming deep link
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // ✅ App was closed - opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    }).catch(err => {
      console.error('[DeepLink] getInitialURL error:', err);
    });

    return () => subscription.remove();
  }, [handleUrl]);
}