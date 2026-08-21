// hooks/useBiometric.ts
import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_KEY = '@mv_biometric_enabled';

interface BiometricStatus {
  isAvailable:     boolean;
  isEnrolled:      boolean;
  biometryType:    number;
  biometryTypeName: string;
}

export function useBiometric() {
  const [status, setStatus]       = useState<BiometricStatus | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Check device capability ──
  const checkStatus = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      const types      = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let typeName = 'Biometric';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        typeName = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        typeName = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      }

      setStatus({
        isAvailable:     compatible,
        isEnrolled:      enrolled,
        biometryType:    types[0] || 0,
        biometryTypeName: typeName,
      });

      // Check if user has enabled it
      const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
      setIsEnabled(stored === 'true' && compatible && enrolled);

    } catch (err) {
      console.error('[useBiometric] checkStatus error:', err);
      setStatus({
        isAvailable: false, isEnrolled: false,
        biometryType: 0, biometryTypeName: 'Biometric',
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // ── Enable ──
  const enable = useCallback(async (userEmail: string) => {
    if (!status?.isAvailable || !status?.isEnrolled) {
      return { success: false, error: 'Biometric not available or not enrolled' };
    }

    setIsLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Enable ${status.biometryTypeName}`,
        fallbackLabel: 'Use Passcode',
        cancelLabel:   'Cancel',
      });

      if (result.success) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
        // Store email association (optional — for multi-account)
        await AsyncStorage.setItem('@mv_biometric_email', userEmail);
        setIsEnabled(true);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to enable biometric' };
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // ── Disable ──
  const disable = useCallback(async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      await AsyncStorage.removeItem('@mv_biometric_email');
      setIsEnabled(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable biometric' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Authenticate ──
  const authenticate = useCallback(async () => {
    if (!isEnabled || !status?.isAvailable) {
      return { success: false, error: 'Biometric not enabled' };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate',
        fallbackLabel: 'Use Passcode',
        cancelLabel:   'Cancel',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [isEnabled, status]);

  return {
    status,
    isEnabled,
    isLoading,
    enable,
    disable,
    authenticate,
    checkStatus,
  };
}