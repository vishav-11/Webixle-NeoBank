/**
 * OTPScreen.tsx
 * ✅ Fully theme-aware + responsive
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { authService, isSuccess } from '@/services/authService';
import {
  Radius, Spacing, Typography, IconSize, IconBox, getShadow,
} from '@/styles/theme';

const OTP_LENGTH = 6;
const IS_WEB = Platform.OS === 'web';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function OTPScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const params = useLocalSearchParams<{
    email: string;
    mode: string;
    firstName?: string;
    password?: string;
    referralCode?: string;
  }>();

  // ── State ──────────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  // ── Responsive ─────────────────────────────────────────────────────────────
  const isTablet = width >= 600;
  const cardMaxWidth = isTablet ? 440 : 400;

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Auto-focus ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => inputs.current[0]?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // ── OTP handlers ───────────────────────────────────────────────────────────
  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[idx] = cleaned;
    setOtp(next);

    if (cleaned && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (!cleaned && idx > 0) inputs.current[idx - 1]?.focus();
    if (next.every(d => d) && cleaned) handleVerify(next.join(''));
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length < OTP_LENGTH) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOTP({ email: params.email, otp: otpCode });
      if (!isSuccess(res)) {
        Alert.alert('Invalid OTP', res.message || 'OTP verification failed');
        setOtp(Array(OTP_LENGTH).fill(''));
        inputs.current[0]?.focus();
        return;
      }
      if (params.mode === 'register') {
        router.replace({ pathname: '/(auth)/otp-success' as any, params: { email: params.email } });
      } else if (params.mode === 'forgot-password') {
        router.replace({ pathname: '/(auth)/reset-password' as any, params: { email: params.email } });
      } else {
        router.replace('/(auth)/login' as any);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Something went wrong.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ─────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const res = await authService.sendOTP(params.email);
      if (isSuccess(res)) {
        setCountdown(60);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputs.current[0]?.focus();
        Alert.alert('OTP Sent', 'A new code has been sent to your email');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const isComplete = otp.every(d => d.length > 0);

  // ── Derived colors (all from theme) ────────────────────────────────────────
  const bgGrad = isDark
    ? ['#1C1030', '#10081D', '#08050D'] as const
    : ['#8B5CF6', '#6D3CE8', '#4B2AD1'] as const;

  const bgGradPos = isDark
    ? [0, 0.48, 1] as const
    : [0, 0.5, 1] as const;

  // OTP box states
  const emptyBoxBg = isDark ? colors.surface : colors.bgAlt;
  const emptyBoxBd = isDark ? colors.border : colors.primaryBorder;
  const filledBoxBg = colors.primaryDim;
  const filledBoxBd = colors.primary;

  // card
  const cardBg = isDark ? colors.card : 'rgba(255,255,255,0.95)';
  const cardBd = isDark ? colors.border : colors.primaryBorder;

  // back button
  const backBg = isDark ? colors.surface : 'rgba(255,255,255,0.90)';

  // icon gradient
  const iconGrad = isDark
    ? [colors.primaryDim, 'transparent'] as [string, string]
    : [colors.primaryDim, 'transparent'] as [string, string];

  // verify btn gradient
  const btnGrad = isComplete && !loading
    ? [colors.primary, colors.primary] as [string, string]
    : [colors.border, colors.border] as [string, string];
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient colors={bgGrad} locations={bgGradPos} style={s.root}>

        <ScrollView
          contentContainerStyle={[
            s.scroll,
            IS_WEB && { paddingHorizontal: Spacing[5] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back button ────────────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.75}
            style={[
              s.back,
              {
                backgroundColor: backBg,
                borderColor: colors.border,
                ...getShadow(isDark, 'sm'),
              },
            ]}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
          </TouchableOpacity>

          {/* ── Card ───────────────────────────────────────────────────────── */}
          <View
            style={[
              s.card,
              {
                maxWidth: cardMaxWidth,
                backgroundColor: cardBg,
                borderColor: cardBd,
                ...getShadow(isDark, 'lg'),
              },
            ]}
          >
            {/* Icon */}
            <LinearGradient colors={iconGrad} style={[s.iconCircle, { borderColor: colors.primaryBorder }]}>
              <Ionicons name="mail" size={IconSize['2xl']} color={colors.primary} />
            </LinearGradient>

            {/* Title */}
            <Text style={[s.title, { color: colors.primary }]}>
              Verify Your Email
            </Text>
            <Text style={[s.subtitle, { color: colors.text2 }]}>
              We sent a 6-digit code to{'\n'}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {params.email}
              </Text>
            </Text>

            {/* OTP Boxes */}
            <View style={s.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={r => { inputs.current[i] = r; }}
                  value={digit}
                  onChangeText={v => handleChange(v, i)}
                  onKeyPress={e => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectionColor={colors.primary}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  style={[
                    s.otpBox,
                    {
                      color: digit ? colors.text : colors.text2,
                      borderColor: digit ? filledBoxBd : emptyBoxBd,
                      backgroundColor: digit ? filledBoxBg : emptyBoxBg,
                    },
                    // web: remove browser outline
                    IS_WEB && ({ outlineWidth: 0 } as any),
                  ]}
                />
              ))}
            </View>

            {/* Verify button */}
            <TouchableOpacity
              onPress={() => handleVerify()}
              disabled={loading || !isComplete}
              activeOpacity={0.85}
              style={s.btnWrap}
            >
              <LinearGradient
                colors={btnGrad}
                style={[s.btn, (!isComplete || loading) && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading
                  ? <ActivityIndicator color={isDark ? '#030E12' : '#fff'} />
                  : (
                    <Text style={[s.btnTxt, { color: isDark ? '#030E12' : '#fff' }]}>
                      VERIFY EMAIL
                    </Text>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[s.divider, { backgroundColor: colors.border }]} />

            {/* Resend */}
            <View style={s.resendRow}>
              <Text style={[s.resendTxt, { color: colors.text2 }]}>
                Didn't receive a code?{'  '}
              </Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || resending}
                activeOpacity={0.75}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[
                    s.resendLink,
                    { color: countdown > 0 ? colors.text3 : colors.primary },
                  ]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Helper */}
            <Text style={[s.helper, { color: colors.text3 }]}>
              Check your spam folder if you don't see it
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const OTP_BOX_SIZE = IS_WEB ? 52 : 48;

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[10],
    paddingHorizontal: Spacing[4],
  },

  // ── Back button ─────────────────────────────────────────────────────────────
  back: {
    position: 'absolute',
    top: IS_WEB ? Spacing[5] : Spacing[8],
    left: IS_WEB ? Spacing[5] : Spacing[4],
    width: IconBox.sm,
    height: IconBox.sm,
    borderRadius: IconBox.sm / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
    marginTop: IS_WEB ? Spacing[8] : Spacing[6],
  },

  // ── Icon ────────────────────────────────────────────────────────────────────
  iconCircle: {
    width: IconBox['2xl'],
    height: IconBox['2xl'],
    borderRadius: IconBox['2xl'] / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },

  // ── Text ────────────────────────────────────────────────────────────────────
  title: {
    fontSize: Typography.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeightBase,
    marginBottom: Spacing[7],
  },

  // ── OTP Boxes ───────────────────────────────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[7],
    justifyContent: 'center',
  },
  otpBox: {
    width: OTP_BOX_SIZE,
    height: OTP_BOX_SIZE + 8,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    textAlign: 'center',
    fontSize: Typography.xl,
    fontWeight: '700',
  },

  // ── Button ──────────────────────────────────────────────────────────────────
  btnWrap: { width: '100%' },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: {
    fontSize: Typography.sm,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing[5],
  },

  // ── Resend ──────────────────────────────────────────────────────────────────
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  resendTxt: { fontSize: Typography.sm, fontWeight: '400' },
  resendLink: { fontSize: Typography.sm, fontWeight: '700' },

  // ── Helper ──────────────────────────────────────────────────────────────────
  helper: {
    fontSize: Typography.xs,
    textAlign: 'center',
    marginTop: Spacing[3],
    lineHeight: Typography.lineHeightSm,
    opacity: 0.75,
  },
});