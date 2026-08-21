/**
 * app/(screens)/scanner/hooks/useQRScanner.ts
 * ✅ QR scanner state management
 */

import { useState, useCallback } from 'react';

type ScreenState = 'idle' | 'camera' | 'result';

interface QRScannerHook {
  screenState: ScreenState;
  scannedData: string | null;
  torch: boolean;
  scanned: boolean;
  openCamera: () => void;
  closeCamera: () => void;
  showResult: (data: string) => void;
  resetScanner: () => void;
  toggleTorch: () => void;
  resetScan: () => void;
}

export function useQRScanner(): QRScannerHook {
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // ✅ Open camera view
  const openCamera = useCallback(() => {
    setScreenState('camera');
    setScanned(false);
    setTorch(false);
  }, []);

  // ✅ Close camera and return to idle
  const closeCamera = useCallback(() => {
    setScreenState('idle');
    setScanned(false);
    setTorch(false);
  }, []);

  // ✅ Show result modal with scanned data
  const showResult = useCallback((data: string) => {
    setScannedData(data);
    setScanned(true);
    setScreenState('result');
  }, []);

  // ✅ Reset everything to idle
  const resetScanner = useCallback(() => {
    setScreenState('idle');
    setScannedData(null);
    setScanned(false);
    setTorch(false);
  }, []);

  // ✅ Toggle flashlight
  const toggleTorch = useCallback(() => {
    setTorch((prev) => !prev);
  }, []);

  // ✅ Reset scan state (for "scan again" functionality)
  const resetScan = useCallback(() => {
    setScanned(false);
  }, []);

  return {
    screenState,
    scannedData,
    torch,
    scanned,
    openCamera,
    closeCamera,
    showResult,
    resetScanner,
    toggleTorch,
    resetScan,
  };
}