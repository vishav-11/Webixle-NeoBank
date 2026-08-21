// hooks/usePin.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = '@mv_transaction_pin';

export function usePin() {
  const [isPinSet, setIsPinSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkPinStatus = useCallback(async () => {
    try {
      const pin = await AsyncStorage.getItem(PIN_KEY);
      setIsPinSet(!!pin);
    } catch (err) {
      console.error('[usePin] checkPinStatus error:', err);
      setIsPinSet(false);
    }
  }, []);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  const setPin = useCallback(async (pin: string) => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(PIN_KEY, pin);
      setIsPinSet(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to set PIN' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    try {
      const stored = await AsyncStorage.getItem(PIN_KEY);
      return stored === pin;
    } catch {
      return false;
    }
  }, []);

  const removePin = useCallback(async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(PIN_KEY);
      setIsPinSet(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isPinSet,
    isLoading,
    checkPinStatus,
    setPin,
    verifyPin,
    removePin,
  };
}