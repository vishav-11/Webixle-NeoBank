/**
 * ForgotPasswordScreen.tsx
 * ✅ 3‑step flow: Email → OTP + New Password → Success
 * ✅ Fully theme‑aware (all colours from `colors`) + responsive
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { authService, isSuccess } from '@/services/authService';
import FormInput from '@/components/common/FormInput';
import {
  Radius,
  Spacing,
  Typography,
  IconSize,
  IconBox,
  getShadow,
} from '@/styles/theme';

const IS_WEB  = Platform.OS === 'web';
const OTP_LEN = 6;

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = 'email' | 'verify' | 'success';

export default function ForgotPasswordScreen() {
  const { colors, isDark } = useTheme();
  const router             = useRouter();
  const { width: sw }      = useWindowDimensions();

  // ── State ────────────────────────────────────────────────────────────────────
  const [step, setStep]               = useState<Step>('email');
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState<string[]>(Array(OTP_LEN).fill(''));
  const [newPassword, setNewPass]     = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [resendTimer, setResend]      = useState(0);

  // OTP input refs
  const otpRefs = useRef<(TextInput | null)[]>([]);

  // ── Responsive card width ────────────────────────────────────────────────────
  const cardMaxW = 460;
  const cardW    = IS_WEB ? Math.min(sw * 0.9, cardMaxW) : '100%';

  // ── Derived theme colours (no hardcoded constants) ──────────────────────────
  const bgGradient    = isDark
    ? (['#1C1030', '#0C0716', '#0C0716'] as [string, string, string])
    : (['#FFFFFF', '#FBFAFF', '#F7F5FF'] as [string, string, string]);
  const bgGradientPos = isDark
    ? ([0, 0.4, 1] as [number, number, number])
    : ([0, 0.4, 1] as [number, number, number]);

  // card background & border
  const cardBg   = isDark ? colors.card            : 'rgba(255,255,255,0.95)';
  const cardBd   = isDark ? colors.border          : colors.primaryBorder;

  // back button background
  const backBg   = isDark ? colors.surface         : 'rgba(255,255,255,0.9)';

  // input background
  const inputBg  = colors.surface;

  // OTP box styles
  const otpBoxEmptyBd = isDark ? colors.border : 'rgba(0,0,0,0.12)'; // fallback for light
  const otpBoxEmptyBg = colors.surface;

  // disabled button gradient colours
  const disabledGrad: [string, string] = [colors.border, colors.border];

  // enabled button gradient colours
  const enabledGrad: [string, string]  = [colors.primary, colors.primary];

  // ── Resend timer ──────────────────────────────────────────────────────────────
  const startTimer = () => {
    setResend(60);
    const interval = setInterval(() => {
      setResend(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (isSuccess(res)) {
        setStep('verify');
        startTimer();
      } else {
        Alert.alert('Error', res.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      if (isSuccess(res)) {
        setOtp(Array(OTP_LEN).fill(''));
        otpRefs.current[0]?.focus();
        startTimer();
        Alert.alert('Sent', 'A new OTP has been sent to your email');
      } else {
        Alert.alert('Error', res.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handlers ────────────────────────────────────────────────────────
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LEN - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  // ── Step 2: Verify OTP + Reset Password ───────────────────────────────────────
  const handleReset = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== OTP_LEN) {
      Alert.alert('Error', `Enter the ${OTP_LEN}-digit OTP`);
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyForgetPasswordPassword(
        Number(otpStr),
        newPassword,
      );
      if (!res) {
        Alert.alert('Error', 'No response from server');
        return;
      }
      if (isSuccess(res as any)) {
        setStep('success');
      } else {
        Alert.alert('Error', (res as any).message || 'Invalid OTP or expired');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ── Helper flags ──────────────────────────────────────────────────────────────
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const otpFilled  = otp.every(d => d !== '');
  const resetValid = otpFilled && newPassword.length >= 8 && newPassword === confirmPassword;

  // ── OTP box dynamic style ──────────────────────────────────────────────────────
  const getOtpStyle = (index: number) => ({
    borderColor:     otp[index] ? colors.primary : otpBoxEmptyBd,
    backgroundColor: otp[index] ? colors.primaryDim : otpBoxEmptyBg,
    color:           colors.text,
  });

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <LinearGradient
      colors={bgGradient}
      locations={bgGradientPos}
      style={st.root}
    >
      <ScrollView
        contentContainerStyle={[
          st.scroll,
          IS_WEB && { alignItems: 'center', paddingHorizontal: Spacing[4] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back button ── */}
        <TouchableOpacity
          onPress={() => {
            if (step === 'verify') setStep('email');
            else router.back();
          }}
          activeOpacity={0.75}
          style={[
            st.back,
            {
              backgroundColor: backBg,
              borderColor:     colors.border,
              ...getShadow(isDark, 'sm'),
            },
            IS_WEB && st.backWeb,
          ]}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>

        {/* ── Card ── */}
        <View style={[st.cardOuter, IS_WEB && { width: cardW }]}>
          <View
            style={[
              st.card,
              {
                backgroundColor: cardBg,
                borderColor:     cardBd,
                ...getShadow(isDark, 'lg'),
              },
            ]}
          >
            {/* EMAIL STEP ────────────────────────────────────────────── */}
            {step === 'email' && (
              <View style={st.form}>
                <View style={st.header}>
                  <View style={[st.iconCircle, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
                    <Ionicons name="lock-closed-outline" size={IconSize['2xl']} color={colors.primary} />
                  </View>
                  <Text style={[st.title, { color: colors.text }]}>Forgot Password?</Text>
                  <Text style={[st.subtitle, { color: colors.text2 }]}>
                    Enter your email and we'll send you a 6‑digit OTP.
                  </Text>
                </View>

                <FormInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  icon="mail-outline"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  inputBgColor={inputBg}
                />

                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={loading || !emailValid}
                  activeOpacity={0.85}
                  style={st.fullBtn}
                >
                  <LinearGradient
                    colors={loading || !emailValid ? disabledGrad : enabledGrad}
                    style={[st.btn, (loading || !emailValid) && { opacity: 0.6 }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    {loading
                      ? <ActivityIndicator color={isDark ? '#fff' : '#fff'} />
                      : <Text style={[st.btnTxt, { color: isDark ? '#fff' : '#fff' }]}>Send OTP</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
                  style={st.linkBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[st.link, { color: colors.text2 }]}>
                    Remember your password?{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VERIFY STEP ──────────────────────────────────────────── */}
            {step === 'verify' && (
              <View style={st.form}>
                <View style={st.header}>
                  <View style={[st.iconCircle, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
                    <Ionicons name="shield-checkmark-outline" size={IconSize['2xl']} color={colors.primary} />
                  </View>
                  <Text style={[st.title, { color: colors.text }]}>Verify OTP</Text>
                  <Text style={[st.subtitle, { color: colors.text2 }]}>
                    Enter the 6‑digit code sent to{' '}
                    <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
                  </Text>
                </View>

                {/* OTP boxes */}
                <View style={st.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={r => { otpRefs.current[i] = r; }}
                      style={[st.otpBox, getOtpStyle(i)]}
                      value={digit}
                      onChangeText={v => handleOtpChange(v, i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      returnKeyType="next"
                    />
                  ))}
                </View>

                {/* Resend */}
                <View style={st.resendRow}>
                  <Text style={[st.resendLabel, { color: colors.text2 }]}>Didn't receive the code? </Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0 || loading}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      st.resendLink,
                      {
                        color: resendTimer > 0 ? colors.text3 : colors.primary,
                        opacity: resendTimer > 0 ? 0.5 : 1,
                      },
                    ]}>
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={[st.divider, { backgroundColor: colors.border }]} />

                {/* New password */}
                <FormInput
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPass}
                  placeholder="Min. 8 characters"
                  icon="lock-closed-outline"
                  secureTextEntry={!showNew}
                  rightIcon={showNew ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowNew(p => !p)}
                  inputBgColor={inputBg}
                />

                {/* Confirm password */}
                <FormInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirm}
                  placeholder="Re‑enter password"
                  icon="lock-closed-outline"
                  secureTextEntry={!showConfirm}
                  rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowConfirm(p => !p)}
                  inputBgColor={inputBg}
                />

                {/* Match hint */}
                {confirmPassword.length > 0 && (
                  <View style={st.matchRow}>
                    <Ionicons
                      name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                      size={IconSize.xs}
                      color={newPassword === confirmPassword ? colors.primary : colors.red}
                    />
                    <Text style={[st.matchTxt, {
                      color: newPassword === confirmPassword ? colors.primary : colors.red,
                    }]}>
                      {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading || !resetValid}
                  activeOpacity={0.85}
                  style={st.fullBtn}
                >
                  <LinearGradient
                    colors={loading || !resetValid ? disabledGrad : enabledGrad}
                    style={[st.btn, (loading || !resetValid) && { opacity: 0.6 }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    {loading
                      ? <ActivityIndicator color={isDark ? '#fff' : '#fff'} />
                      : <Text style={[st.btnTxt, { color: isDark ? '#fff' : '#fff' }]}>Reset Password</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* SUCCESS STEP ────────────────────────────────────────── */}
            {step === 'success' && (
              <View style={st.success}>
                <View style={[st.iconCircle, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
                  <Ionicons name="checkmark-circle" size={IconSize['2xl']} color={colors.primary} />
                </View>
                <Text style={[st.title, { color: colors.text }]}>Password Reset!</Text>
                <Text style={[st.subtitle, { color: colors.text2 }]}>
                  Your password has been reset successfully. You can now sign in with your new password.
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                  style={st.fullBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={enabledGrad}
                    style={st.btn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={[st.btnTxt, { color: isDark ? '#fff' : '#fff' }]}>Go to Login</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: IS_WEB ? Spacing[8] : Spacing[6],
    paddingHorizontal: IS_WEB ? Spacing[4] : Spacing[5],
  },

  // Back button
  back: {
    position: 'absolute',
    top:   IS_WEB ? Spacing[5] : Spacing[8],
    left:  IS_WEB ? Spacing[5] : Spacing[4],
    width:  IconBox.sm,
    height: IconBox.sm,
    borderRadius: IconBox.sm / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backWeb: { top: Spacing[4], left: Spacing[4] },

  // Card wrapper
  cardOuter: {
    width:     '100%',
    alignSelf: 'center',
    marginTop: IS_WEB ? Spacing[8] : Spacing[6],
  },

  // Card
  card: {
    width: '100%',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: IS_WEB ? Spacing[8] : Spacing[5],
    paddingVertical:   IS_WEB ? Spacing[10] : Spacing[6],
    gap: Spacing[4],
  },

  // Generic layout chunks
  form:    { gap: Spacing[4] },
  success: { alignItems: 'center', gap: Spacing[4] },
  header:  { gap: Spacing[2], alignItems: 'center' },

  // Icon circle
  iconCircle: {
    width:  IconBox['2xl'],
    height: IconBox['2xl'],
    borderRadius: IconBox['2xl'] / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  // Text
  title: {
    fontSize:   Typography.xl,
    fontWeight: '700',
    textAlign:  'center',
  },
  subtitle: {
    fontSize:   Typography.sm,
    lineHeight: Typography.lineHeightBase,
    textAlign:  'center',
  },

  // ── OTP ──────────────────────────────────────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    gap:           Spacing[2],
    marginVertical: Spacing[2],
    justifyContent: 'center',
  },
  otpBox: {
    width:      IS_WEB ? 48 : 44,
    height:     IS_WEB ? 52 : 46,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    fontSize:   Typography.xl,
    fontWeight: '700',
    textAlign:  'center',
    // Remove web outline
    ...(IS_WEB && ({ outlineWidth: 0 } as any)),
  },

  // ── Resend ───────────────────────────────────────────────────────────────────
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendLabel: { fontSize: Typography.sm },
  resendLink:  { fontSize: Typography.sm, fontWeight: '600' },

  // ── Divider ──────────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.3,
    marginVertical: Spacing[1],
  },

  // ── Password match indicator ─────────────────────────────────────────────────
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginTop: -Spacing[2],
  },
  matchTxt: { fontSize: Typography.xs, fontWeight: '500' },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  fullBtn: { width: '100%' },
  btn: {
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTxt: {
    fontSize:   Typography.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Link ─────────────────────────────────────────────────────────────────────
  linkBtn: { alignSelf: 'center', paddingVertical: Spacing[2] },
  link:    { fontSize: Typography.sm, textAlign: 'center' },
});