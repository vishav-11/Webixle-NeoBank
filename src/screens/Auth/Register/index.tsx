import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { authService, isSuccess } from '@/services/authService';
import FormInput from '@/components/common/FormInput';
import { Radius, Spacing, Typography } from '@/styles/theme';

const logoSource = require('@/assets/images/webixle_icon_purple.png');

// ─── Theme Config ─────────────────────────────────────────────────────────────
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const gradient = GRADIENTS[isDark ? 'dark' : 'light'];
  const inputBg = INPUT_BG[isDark ? 'dark' : 'light'];

  const [form, setForm] = useState({
    firstName: '',
    email: '',
    password: '',
    referralCode: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  // ─── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (form.password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const registerRes = await authService.register({
        firstName: form.firstName.trim(),
        email: form.email.trim(),
        password: form.password,
        referralCode: form.referralCode.trim() || undefined,
      });

      if (!isSuccess(registerRes)) {
        Alert.alert('Registration Failed', registerRes.message || 'Could not create account');
        return;
      }

      const otpRes = await authService.sendOTP(form.email.trim());
      if (isSuccess(otpRes)) {
        router.push({
          pathname: '/(auth)/otp',
          params: {
            email: form.email.trim(),
            mode: 'register',
            firstName: form.firstName.trim(),
            password: form.password,
            referralCode: form.referralCode.trim(),
          },
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={gradient.colors}
        locations={gradient.pos}
        style={s.root}
      >
        {/* Decorative circles */}
        <View style={s.circleTop} />
        <View style={s.circleBottom} />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Logo / Hero ─────────────────────────────────────────────── */}
            <View style={s.hero}>
              <View style={s.logoOuter}>
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.28)',
                    'rgba(255,255,255,0.10)',
                  ]}
                  style={s.logoGlass}
                >
                  <Image
                    source={logoSource}
                    style={s.logoImg}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <Text style={s.brand}>WEBIXLE</Text>
              <Text style={s.heroSub}>Start your financial journey.</Text>
            </View>

            {/* ── Card ────────────────────────────────────────────────────── */}
            <View style={[s.card, isDark && s.cardDark]}>
              {/* drag handle */}
              <View style={s.handle} />

              {/* Tag + Title */}
              <View style={s.titleBlock}>
                <View style={[
                  s.tag,
                  { backgroundColor: isDark ? 'rgba(138,99,255,0.18)' : 'rgba(109,60,232,0.10)' },
                ]}>
                  <View style={s.tagDot} />
                  <Text style={s.tagTxt}>CREATE ACCOUNT</Text>
                </View>

                <Text style={[s.title, { color: isDark ? '#FFF' : '#1B1031' }]}>
                  Join Webixle
                </Text>
                <Text style={[s.subtitle, { color: isDark ? '#BCAFD4' : '#76688F' }]}>
                  Fill in your details below to get started.
                </Text>
              </View>

              {/* Form */}
              <View style={s.form}>
                <FormInput
                  label="Full Name"
                  value={form.firstName}
                  onChangeText={set('firstName')}
                  placeholder="John Doe"
                  icon="person-outline"
                  error={errors.firstName}
                  inputBgColor={inputBg}
                />
                <FormInput
                  label="Email Address"
                  value={form.email}
                  onChangeText={set('email')}
                  placeholder="name@example.com"
                  icon="mail-outline"
                  error={errors.email}
                  keyboardType="email-address"
                  inputBgColor={inputBg}
                />
                <FormInput
                  label="Password"
                  value={form.password}
                  onChangeText={set('password')}
                  placeholder="Min. 6 characters"
                  icon="lock-closed-outline"
                  error={errors.password}
                  secureTextEntry={!showPass}
                  rightIcon={showPass ? 'eye-off-outline' : 'eye-outline'}
                  onRightIconPress={() => setShowPass(p => !p)}
                  inputBgColor={inputBg}
                />
                <FormInput
                  label="Referral Code (Optional)"
                  value={form.referralCode}
                  onChangeText={set('referralCode')}
                  placeholder="Enter code"
                  icon="gift-outline"
                  inputBgColor={inputBg}
                />
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.86}
                style={s.btnWrap}
              >
                <LinearGradient
                  colors={loading
                    ? ['#8E80A7', '#76658E']
                    : [colors.primary, colors.primary]}
                  style={s.btn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={s.btnTxt}>CONTINUE</Text>}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={s.footer}>
                <Text style={[s.footerTxt, { color: isDark ? '#BCAFD4' : '#8A7A9F' }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/login')}
                  activeOpacity={0.75}
                >
                  <Text style={[s.footerLink, { color: colors.primary }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Terms */}
              <Text style={[s.terms, { color: isDark ? '#6B5E84' : '#A095B1' }]}>
                By signing up you agree to our{' '}
                <Text style={{ color: colors.primary }}>Terms</Text>
                {' '}&amp;{' '}
                <Text style={{ color: colors.primary }}>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // scroll
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[4],
  },

  // decorative bg circles
  circleTop: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -60,
  },
  circleBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -80,
  },

  // hero / logo
  hero: {
    alignItems: 'center',
    marginBottom: Spacing[6],
    marginTop: Spacing[6],

  },
  logoOuter: {
    width: 76,
    height: 76,
    borderRadius: 18,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },

  logoImg: {
    width: 54,
    height: 54,
  },
  brand: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
  },
  heroSub: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500',
  },

  // card
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFF',
    borderRadius: 32,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Platform.OS === 'ios' ? Spacing[8] : Spacing[6],
    shadowColor: '#16082E',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 18,
  },
  cardDark: { backgroundColor: '#130B21' },

  // handle
  handle: {
    width: 36,
    height: 4,
    borderRadius: 10,
    backgroundColor: '#E5DEF5',
    alignSelf: 'center',
    marginBottom: Spacing[5],
  },

  // title block
  titleBlock: { marginBottom: Spacing[5] },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: Spacing[3],
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#7B4DFF',
  },
  tagTxt: {
    color: '#6D3CE8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  // form
  form: { gap: Spacing[4] },

  // button
  btnWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginTop: Spacing[6],
    shadowColor: '#6D3CE8',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  btn: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing[5],
  },
  footerTxt: { fontSize: 13 },
  footerLink: { fontSize: 13, fontWeight: '800' },

  // terms
  terms: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: Spacing[4],
    lineHeight: 15,
  },
});