/**
 * app/(screens)/scanner/hooks/useCameraPermission.ts
 * ✅ Camera permission management hook
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

interface CameraPermissionHook {
  hasPermission: boolean | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
}

export function useCameraPermission(): CameraPermissionHook {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Check current permission status
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't need expo-camera permission
        return true;
      }

      // ✅ Dynamic import (only loads when called)
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.getCameraPermissionsAsync();
      
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (e) {
      console.warn('[useCameraPermission] Check error:', e);
      return false;
    }
  }, []);

  // ✅ Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // ✅ Dynamic import
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();

      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access to scan QR codes.',
          [{ text: 'OK' }]
        );
      }

      return granted;
    } catch (e) {
      console.warn('[useCameraPermission] Request error:', e);
      Alert.alert(
        'Camera Not Available',
        'Camera module is not installed.\n\nRun: npx expo install expo-camera',
        [{ text: 'OK' }]
      );
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    hasPermission,
    isLoading,
    requestPermission,
    checkPermission,
  };
}