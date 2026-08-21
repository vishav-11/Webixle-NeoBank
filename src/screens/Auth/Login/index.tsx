/**
 * app/(auth)/login.tsx
 * ✅ Theme-aware
 * ✅ Email not verified → send OTP → OTP screen
 * ✅ Responsive mobile / web
 * ✅ Modern onboarding-style design
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authService, isSuccess } from '@/services/authService';
import FormInput from '@/components/common/FormInput';
import { Radius, Spacing, Typography } from '@/styles/theme';
import { Ionicons } from '@expo/vector-icons';

const logoSource = require('@/assets/images/webixle_icon_purple.png');

const MAX_CARD_WIDTH = 460;
const isWeb = Platform.OS === 'web';

// ─── Theme setup ──────────────────────────────────────────────────────────────
const GRADIENTS = {
  dark: {
    colors: ['#1C1030', '#10081D', '#08050D'] as const,
    pos: [0, 0.48, 1] as const,
  },
  light: {
    colors: ['#8B5CF6', '#6D3CE8', '#4B2AD1'] as const,
    pos: [0, 0.5, 1] as const,
  },
};

const INPUT_BG = {
  dark: 'rgba(255,255,255,0.06)',
  light: '#F6F2FF',
};

// ─── Email verification check ────────────────────────────────────────────────
function isEmailNotVerified(res: any, err: any): boolean {
  if (
    res?.status === 'failed' &&
    res?.success === false &&
    typeof res?.message === 'string' &&
    res.message.toLowerCase().includes('email not verified')
  ) {
    return true;
  }

  if (
    err?.response?.data?.success === false &&
    typeof err?.response?.data?.message === 'string' &&
    err.response.data.message.toLowerCase().includes('email not verified')
  ) {
    return true;
  }

  return false;
}

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyBanner, setVerifyBanner] = useState(false);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // ─── Smooth entry animations ───────────────────────────────────────────────
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 65,
        friction: 11,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 450,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const themeKey = isDark ? 'dark' : 'light';
  const gradient = GRADIENTS[themeKey];
  const inputBg = INPUT_BG[themeKey];

  const isSmallDevice = height < 700;
  const contentWidth = isWeb ? Math.min(width, MAX_CARD_WIDTH) : width;

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const nextErrors: typeof errors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // ─── Send OTP and move to OTP page ─────────────────────────────────────────
  const sendOtpAndNavigate = async (userEmail: string) => {
    if (!userEmail.trim()) {
      setErrors({ email: 'Enter your email first' });
      return;
    }

    setSendingOtp(true);
    setVerifyBanner(false);

    try {
      const otpRes = await authService.sendOTP(userEmail.trim());

      if (isSuccess(otpRes)) {
        router.push({
          pathname: '/(auth)/otp',
          params: {
            email: userEmail.trim(),
            mode: 'register',
            password,
          },
        });
      } else {
        setVerifyBanner(true);

        Alert.alert(
          'OTP Failed',
          otpRes.message || 'Unable to send verification OTP. Please try again.',
        );
      }
    } catch (err: any) {
      setVerifyBanner(true);

      Alert.alert(
        'Error',
        err?.response?.data?.message ||
        'Unable to send verification OTP. Please try again.',
      );
    } finally {
      setSendingOtp(false);
    }
  };

  // ─── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    setVerifyBanner(false);

    let apiRes: any = null;

    try {
      apiRes = await authService.login({
        email: email.trim(),
        password,
      });

      if (isSuccess(apiRes) && apiRes.data?.token && apiRes.data?.user) {
        await AsyncStorage.setItem('onboarding_complete', 'true');
        await login(apiRes.data.token, apiRes.data.user);
        return;
      }

      if (isEmailNotVerified(apiRes, null)) {
        setVerifyBanner(true);
        return;
      }

      Alert.alert(
        'Login Failed',
        apiRes?.message || 'Invalid email or password.',
      );
    } catch (err: any) {
      if (isEmailNotVerified(null, err)) {
        setVerifyBanner(true);
        return;
      }

      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <LinearGradient
        colors={gradient.colors}
        locations={gradient.pos}
        style={styles.bg}
      >
        {/* Background visual circles */}
        <View style={styles.glowCircleTop} />
        <View style={styles.glowCircleBottom} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardWrap}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              isSmallDevice && styles.scrollSmall,
            ]}
          >
            <View style={[styles.page, { width: contentWidth }]}>
              {/* ── Header / Logo ───────────────────────────────────────── */}
              <Animated.View
                style={[
                  styles.hero,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <View style={styles.logoOuter}>
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.28)',
                      'rgba(255,255,255,0.10)',
                    ]}
                    style={styles.logoGlass}
                  >
                    <Image
                      source={logoSource}
                      style={styles.logoImg}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </View>

                <Text style={styles.brand}>WEBIXLE</Text>
                <Text style={styles.heroText}>Your money. Your control.</Text>
              </Animated.View>

              {/* ── Login Card ─────────────────────────────────────────── */}
              <Animated.View
                style={[
                  styles.card,
                  isDark && styles.cardDark,
                  {
                    opacity: cardOpacity,
                    transform: [{ translateY: cardTranslateY }],
                  },
                ]}
              >
                <View style={styles.cardHandle} />

                <View style={styles.titleWrap}>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: isDark
                          ? 'rgba(138,99,255,0.18)'
                          : 'rgba(109,60,232,0.10)',
                      },
                    ]}
                  >
                    <View style={styles.tagDot} />
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      WELCOME BACK
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.title,
                      { color: isDark ? '#FFFFFF' : '#1B1031' },
                    ]}
                  >
                    Login to your account
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,
                      { color: isDark ? '#BCAFD4' : '#76688F' },
                    ]}
                  >
                    Enter your details to continue with Webixle.
                  </Text>
                </View>

                {/* ── Not verified banner ─────────────────────────────── */}
                {verifyBanner && (
                  <View
                    style={[
                      styles.banner,
                      {
                        backgroundColor: isDark
                          ? 'rgba(245,158,11,0.12)'
                          : '#FFF7E6',
                        borderColor: isDark
                          ? 'rgba(245,158,11,0.28)'
                          : '#FCD68A',
                      },
                    ]}
                  >
                    <View style={styles.bannerTop}>
                      <View style={styles.bannerIconWrap}>
                        <Text style={styles.bannerIcon}>✉</Text>
                      </View>

                      <View style={styles.bannerContent}>
                        <Text
                          style={[
                            styles.bannerTitle,
                            { color: isDark ? '#FCD34D' : '#9A5A00' },
                          ]}
                        >
                          Email verification required
                        </Text>

                        <Text
                          style={[
                            styles.bannerMessage,
                            { color: isDark ? '#EACD85' : '#8C6728' },
                          ]}
                        >
                          Your email has not been verified yet.
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      disabled={sendingOtp}
                      activeOpacity={0.85}
                      onPress={() => sendOtpAndNavigate(email)}
                      style={styles.verifyBtnWrap}
                    >
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.verifyBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {sendingOtp ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <>
                            <Text style={styles.verifyBtnText}>
                              Verify Email
                            </Text>
                            <Text style={styles.verifyArrow}>→</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Form ────────────────────────────────────────────── */}
                <View style={styles.form}>
                  <FormInput
                    label="Email Address"
                    value={email}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    icon="mail-outline"
                    error={errors.email}
                    inputBgColor={inputBg}
                    onChangeText={(value) => {
                      setEmail(value);
                      setErrors((old) => ({ ...old, email: undefined }));

                      if (verifyBanner) {
                        setVerifyBanner(false);
                      }
                    }}
                  />

                  <View>
                    <FormInput
                      label="Password"
                      value={password}
                      placeholder="Enter your password"
                      secureTextEntry={!showPass}
                      icon="lock-closed-outline"
                      error={errors.password}
                      rightIcon={
                        showPass ? 'eye-off-outline' : 'eye-outline'
                      }
                      onRightIconPress={() => setShowPass((old) => !old)}
                      inputBgColor={inputBg}
                      onChangeText={(value) => {
                        setPassword(value);
                        setErrors((old) => ({ ...old, password: undefined }));
                      }}
                    />

                    <TouchableOpacity
                      style={styles.forgotWrap}
                      onPress={() =>
                        router.push('/(auth)/forgot-password' as any)
                      }
                    >
                      <Text style={[styles.forgot, { color: colors.primary }]}>
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Login Button ────────────────────────────────────── */}
                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={loading || sendingOtp}
                  onPress={handleLogin}
                  style={styles.loginBtnWrap}
                >
                  <LinearGradient
                    colors={
                      loading || sendingOtp
                        ? [colors.primary, colors.primary]
                        : [colors.primary, colors.primary]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.loginBtnText}>LOGIN</Text>

                        <View style={styles.loginArrowWrap}>
                          <Ionicons
                            name="arrow-forward"
                            size={20}
                            color={colors.primary}
                          />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* ── Bottom link: always at last ─────────────────────── */}
                <View style={styles.footer}>
                  <Text
                    style={[
                      styles.footerText,
                      { color: isDark ? '#BCAFD4' : '#8A7A9F' },
                    ]}
                  >
                    Don't have a Webixle account?{' '}
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/register' as any)}
                  >
                    <Text style={[styles.footerLink, { color: colors.primary }]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  keyboardWrap: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 0,
  },

  scrollSmall: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },

  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    paddingBottom: 24,
  },

  page: {
    width: '100%',
    maxWidth: MAX_CARD_WIDTH,
    minHeight: '100%',
    justifyContent: 'flex-end',
  },

  // ─── Background shapes ────────────────────────────────────────────────────
  glowCircleTop: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 170,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -150,
    right: -100,
  },

  glowCircleBottom: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 120,
    left: -140,
  },

  // ─── Header ──────────────────────────────────────────────────────────────

  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#321080',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },

  logoGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },

  logoImg: {
    width: 64,
    height: 64,
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 6,
  },

  heroText: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── Card ────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: Spacing[6],
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    shadowColor: '#16082E',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 14,
  },

  cardDark: {
    backgroundColor: '#130B21',
  },

  cardHandle: {
    width: 40,
    height: 4,
    borderRadius: 10,
    backgroundColor: '#DED5F2',
    alignSelf: 'center',
    marginBottom: Spacing[5],
  },

  titleWrap: {
    marginBottom: Spacing[5],
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },

  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 10,
    backgroundColor: '#7B4DFF',
  },

  tagText: {
    // color: '#6D3CE8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  title: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },

  // ─── Banner ───────────────────────────────────────────────────────────────
  banner: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    marginBottom: Spacing[5],
  },

  bannerTop: {
    flexDirection: 'row',
    gap: 10,
  },

  bannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.16)',
  },

  bannerIcon: {
    color: '#D97706',
    fontSize: 17,
    fontWeight: '800',
  },

  bannerContent: {
    flex: 1,
    gap: 3,
  },

  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },

  bannerMessage: {
    fontSize: 11,
    lineHeight: 16,
  },

  verifyBtnWrap: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginTop: 14,
  },

  verifyBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  verifyArrow: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  // ─── Form ────────────────────────────────────────────────────────────────
  form: {
    gap: Spacing[4],
  },

  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: Spacing[2],
  },

  forgot: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Login CTA ────────────────────────────────────────────────────────────
  loginBtnWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginTop: Spacing[6],
    shadowColor: '#6D3CE8',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 9,
  },

  loginBtn: {
    minHeight: 54,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.8,
  },

  loginArrowWrap: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginArrow: {
    color: '#6D3CE8',
    fontSize: 16,
    fontWeight: '900',
  },

  // ─── Last bottom Sign Up link ──────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: Spacing[5],
    paddingTop: 3,
  },

  footerText: {
    fontSize: Typography.sm,
  },

  footerLink: {
    fontSize: Typography.sm,
    fontWeight: '800',
  },
});