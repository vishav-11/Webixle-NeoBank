// app/(auth)/splash.tsx
import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

const logoSource = require('@/assets/images/webixle_icon_white.jpg');

export default function SplashScreen() {
  const router    = useRouter();
  const { user, isLoading } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;
  // ✅ Track karo navigate hua ya nahi - double navigation rokne ke liye
  const navigated = useRef(false);

  // ── Animation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }),
      Animated.timing(opacAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Navigation Logic ───────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ Auth load hone ka wait karo
    if (isLoading) return;

    const timer = setTimeout(async () => {
      // ✅ Double navigation rokne ke liye
      if (navigated.current) return;
      navigated.current = true;

      try {
        if (user) {
          // ✅ User logged in hai → app pe jao
          // replace use karo taaki back press pe splash na aaye
          router.replace('/(app)' as any);
          return;
        }

        // ✅ User logged out hai → onboarding dekha ya nahi check karo
        const onboardingDone = await AsyncStorage.getItem('onboarding_complete');

        if (onboardingDone === 'true') {
          // ✅ Onboarding dekh chuka → login pe bhejo
          router.replace('/(auth)/login' as any);
        } else {
          // ✅ Pehli baar → onboarding dikhao
          router.replace('/(auth)/onboarding' as any);
        }
      } catch (err) {
        console.error('[Splash] Navigation error:', err);
        router.replace('/(auth)/login' as any);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isLoading, user]); // ✅ user aur isLoading pe depend karo

  return (
    <LinearGradient
      colors={['#1C1030', '#0C0716']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View
        style={[
          styles.inner,
          { transform: [{ scale: scaleAnim }], opacity: opacAnim },
        ]}
      >
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
          onError={(e) => console.warn('❌ Logo error:', e.nativeEvent.error)}
          onLoad={() => console.log('✅ Logo loaded')}
        />
        <Text style={styles.appName}>WEBIXLE</Text>
        <Text style={styles.tagline}>Your Crypto, Your Control</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0C0716',
  },
  inner: {
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 90,
    height: 90,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 14,
    color: '#8899A6',
  },
});