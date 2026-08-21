/**
 * components/AppShell/hooks/useSettingsAnimation.ts
 * ✅ Settings panel animation logic
 */
import { useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SettingsAnimation {
  slideAnim: Animated.Value;
  overlayAnim: Animated.Value;
}

export function useSettingsAnimation(isOpen: boolean): SettingsAnimation {
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Open animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 14,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SCREEN_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  return { slideAnim, overlayAnim };
}