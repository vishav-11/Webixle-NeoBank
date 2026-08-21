// app/(app)/settings.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fully theme-aware – all gradients use proper [string, string] tuples
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Share,
  Linking,
  Modal,
  Animated,
  TextInput,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useBiometric } from "@/hooks/useBiomatric";
import { usePin } from "@/hooks/usePin";
import { twoFactorService } from "@/services/twoFactorService";
import { Spacing, Typography, Radius } from "@/styles/theme";

// ─── Fix: gradient tuples (not CSS strings) ───────────────────────────────────
// theme.ts primaryGradient = 'linear-gradient(...)' which LinearGradient rejects
// We define proper tuples matching the brand navy palette
const GRADIENT_NAV_DARK: [string, string] = ["#1E2172", "#2D33A8"];
const GRADIENT_NAV_LIGHT: [string, string] = ["#1E2172", "#2D33A8"];

// Helper to get the right tuple based on isDark
const getPrimaryGradient = (isDark: boolean): [string, string] =>
  isDark ? GRADIENT_NAV_DARK : GRADIENT_NAV_LIGHT;

// ─── Explicit color type (no `colors: any`) ───────────────────────────────────
interface AppColors {
  bg: string;
  bgAlt: string;
  bgGradient: string[];
  bgGradientPos: number[];
  surface: string;
  card: string;
  cardAlt: string;
  border: string;
  borderSoft: string;
  hover: string;
  text: string;
  text2: string;
  text3: string;
  primary: string;
  primaryBright: string;
  primaryDim: string;
  primaryBorder: string;
  primaryGlow: string;
  accent: string;
  accentDim: string;
  green: string;
  greenBright: string;
  greenDim: string;
  greenBorder: string;
  greenGlow: string;
  red: string;
  redBright: string;
  redDim: string;
  redBorder: string;
  orange: string;
  orangeDim: string;
  purple: string;
  purpleDim: string;
  blue: string;
  blueDim: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  lightning: string;
  lightningGlow: string;
}

interface SettingsScreenProps {
  onClose?: () => void;
}

// ─── Toast types ──────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastState {
  visible: boolean;
  type: ToastType;
  message: string;
}

// ─── Animation Hook ───────────────────────────────────────────────────────────
function useFadeInDown(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 100,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
    // opacity and translateY are stable Animated.Value refs — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return { opacity, transform: [{ translateY }] };
}

function AnimatedSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const animStyle = useFadeInDown(delay);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, colors }: { toast: ToastState; colors: AppColors }) {
  if (!toast.visible) return null;

  const bg =
    toast.type === "success"
      ? colors.greenDim
      : toast.type === "error"
        ? colors.redDim
        : colors.primaryDim;

  const border =
    toast.type === "success"
      ? colors.green
      : toast.type === "error"
        ? colors.red
        : colors.primary;

  const icon: "checkmark-circle" | "alert-circle" | "information-circle" =
    toast.type === "success"
      ? "checkmark-circle"
      : toast.type === "error"
        ? "alert-circle"
        : "information-circle";

  return (
    <View style={[tSt.wrap, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={18} color={border} />
      <Text style={[tSt.msg, { color: border }]}>{toast.message}</Text>
    </View>
  );
}

const tSt = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 80,
    left: Spacing[4],
    right: Spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    zIndex: 999,
  },
  msg: { fontSize: Typography.sm, fontWeight: "600", flex: 1 },
});

// ─── Confirm Modal ────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  colors: AppColors;
  isDark: boolean;
}

function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  colors,
  isDark,
}: ConfirmModalProps) {
  if (!visible) return null;

  // Fix: use tuple instead of colors.primaryGradient string
  const gradient = getPrimaryGradient(isDark);

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={[cmSt.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            cmSt.box,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[cmSt.title, { color: colors.text }]}>{title}</Text>
          <Text style={[cmSt.msg, { color: colors.text2 }]}>{message}</Text>
          <View style={cmSt.row}>
            <TouchableOpacity
              style={[
                cmSt.btn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={onCancel}
            >
              <Text style={[cmSt.btnTxt, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={cmSt.confirmBtnWrap}
            >
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={cmSt.confirmGradient}
              >
                <Text style={cmSt.confirmTxt}>Confirm</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cmSt = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing[5],
  },
  box: {
    width: "100%",
    maxWidth: 340,
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: Spacing[5],
    gap: Spacing[3],
  },
  title: { fontSize: Typography.md, fontWeight: "700" },
  msg: { fontSize: Typography.sm, lineHeight: 20 },
  row: { flexDirection: "row", gap: Spacing[3], marginTop: Spacing[2] },
  btn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  btnTxt: { fontSize: Typography.sm, fontWeight: "600" },
  confirmBtnWrap: { flex: 1 },
  confirmGradient: {
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  confirmTxt: { fontSize: Typography.sm, fontWeight: "700", color: "#fff" },
});

// ─── 2FA Method Modal ─────────────────────────────────────────────────────────
interface TwoFAMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectEmail: () => void;
  onSelectAuthenticator: () => void;
  colors: AppColors;
}

function TwoFAMethodModal({
  visible,
  onClose,
  onSelectEmail,
  onSelectAuthenticator,
  colors,
}: TwoFAMethodModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={m2St.overlay}>
        <View
          style={[
            m2St.box,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[m2St.handle, { backgroundColor: colors.border }]} />

          <View
            style={[m2St.headerIcon, { backgroundColor: colors.primaryDim }]}
          >
            <Ionicons
              name="shield-checkmark"
              size={28}
              color={colors.primary}
            />
          </View>

          <Text style={[m2St.title, { color: colors.text }]}>
            Choose 2FA Method
          </Text>
          <Text style={[m2St.subtitle, { color: colors.text2 }]}>
            Select how you want to verify your identity
          </Text>

          {/* Email option */}
          <TouchableOpacity
            style={[
              m2St.option,
              {
                backgroundColor: colors.greenDim,
                borderColor: colors.greenBorder,
              },
            ]}
            onPress={onSelectEmail}
            activeOpacity={0.8}
          >
            <View
              style={[m2St.optionIcon, { backgroundColor: colors.greenDim }]}
            >
              <Ionicons name="mail" size={24} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m2St.optionTitle, { color: colors.text }]}>
                Email OTP
              </Text>
              <Text style={[m2St.optionDesc, { color: colors.text2 }]}>
                Receive a one-time code on your email
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </TouchableOpacity>

          {/* Authenticator option */}
          <TouchableOpacity
            style={[
              m2St.option,
              {
                backgroundColor: colors.primaryDim,
                borderColor: colors.primaryBorder,
              },
            ]}
            onPress={onSelectAuthenticator}
            activeOpacity={0.8}
          >
            <View
              style={[m2St.optionIcon, { backgroundColor: colors.primaryDim }]}
            >
              <Ionicons
                name="phone-portrait"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m2St.optionTitle, { color: colors.text }]}>
                Authenticator App
              </Text>
              <Text style={[m2St.optionDesc, { color: colors.text2 }]}>
                Use Google Authenticator or similar app
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={m2St.cancelBtn}>
            <Text style={[m2St.cancelText, { color: colors.text2 }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const m2St = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  box: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing[6],
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing[6],
    gap: Spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing[2],
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing[4],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 15, fontWeight: "700" },
  optionDesc: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  cancelBtn: { alignItems: "center", paddingVertical: Spacing[2] },
  cancelText: { fontSize: 14, fontWeight: "500" },
});

// ─── OTP Input (shared between Email and Authenticator modals) ────────────────
interface OtpInputProps {
  digits: string[];
  inputs: React.MutableRefObject<any[]>;
  colors: AppColors;
  onChange: (val: string, idx: number) => void;
  onKeyPress: (e: any, idx: number) => void;
}

function OtpInput({
  digits,
  inputs,
  colors,
  onChange,
  onKeyPress,
}: OtpInputProps) {
  return (
    <View style={otpShared.row}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            inputs.current[i] = r;
          }}
          value={digit}
          onChangeText={(v) => onChange(v, i)}
          onKeyPress={(e) => onKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          style={[
            otpShared.box,
            {
              color: digit ? colors.text : colors.text3,
              borderColor: digit ? colors.primary : colors.border,
              backgroundColor: digit ? colors.primaryDim : colors.surface,
            },
          ]}
          selectionColor={colors.primary}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
        />
      ))}
    </View>
  );
}

const otpShared = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing[2], justifyContent: "center" },
  box: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
});

// ─── Verify Button (shared) ───────────────────────────────────────────────────
interface VerifyButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  colors: AppColors;
  isDark: boolean;
  label?: string;
}

function VerifyButton({
  onPress,
  loading,
  disabled,
  colors,
  isDark,
  label = "Verify & Enable 2FA",
}: VerifyButtonProps) {
  // Fix: proper tuple, not CSS string
  const gradient: [string, string] = disabled
    ? [colors.border, colors.border]
    : getPrimaryGradient(isDark);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
      style={{ width: "100%" }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={vbSt.btn}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={vbSt.txt}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const vbSt = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: "center",
    width: "100%",
  },
  txt: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// ─── Email OTP Modal ──────────────────────────────────────────────────────────
interface EmailOTPModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  loading: boolean;
  colors: AppColors;
  isDark: boolean;
  email: string;
}

function EmailOTPModal({
  visible,
  onClose,
  onVerify,
  loading,
  colors,
  isDark,
  email,
}: EmailOTPModalProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<any[]>([]);

  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = cleaned;
    setDigits(newDigits);
    if (cleaned && idx < 5) inputs.current[idx + 1]?.focus();
    if (!cleaned && idx > 0) inputs.current[idx - 1]?.focus();
    if (newDigits.every((d) => d) && cleaned) onVerify(newDigits.join(""));
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  useEffect(() => {
    if (visible) {
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 400);
    }
  }, [visible]);

  const isComplete = digits.every((d) => d);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={otpMSt.overlay}>
          <View
            style={[
              otpMSt.box,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[otpMSt.handle, { backgroundColor: colors.border }]} />

            <View
              style={[otpMSt.iconWrap, { backgroundColor: colors.greenDim }]}
            >
              <Ionicons name="mail" size={32} color={colors.green} />
            </View>

            <Text style={[otpMSt.title, { color: colors.text }]}>
              Verify Your Email
            </Text>
            <Text style={[otpMSt.subtitle, { color: colors.text2 }]}>
              {"Enter the 6-digit code sent to\n"}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {email}
              </Text>
            </Text>

            <OtpInput
              digits={digits}
              inputs={inputs}
              colors={colors}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
            />

            <VerifyButton
              onPress={() => onVerify(digits.join(""))}
              loading={loading}
              disabled={!isComplete}
              colors={colors}
              isDark={isDark}
            />

            <TouchableOpacity onPress={onClose} style={otpMSt.cancelBtn}>
              <Text style={[otpMSt.cancelText, { color: colors.text2 }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const otpMSt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  box: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing[6],
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing[6],
    alignItems: "center",
    gap: Spacing[4],
  },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: Spacing[2] },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  cancelBtn: { paddingVertical: Spacing[2] },
  cancelText: { fontSize: 14, fontWeight: "500" },
});

// ─── Authenticator Modal ──────────────────────────────────────────────────────
interface AuthenticatorModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  loading: boolean;
  colors: AppColors;
  isDark: boolean;
  qrCode: string;
  secret: string;
}

function AuthenticatorModal({
  visible,
  onClose,
  onVerify,
  loading,
  colors,
  isDark,
  qrCode,
  secret,
}: AuthenticatorModalProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<any[]>([]);

  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = cleaned;
    setDigits(newDigits);
    if (cleaned && idx < 5) inputs.current[idx + 1]?.focus();
    if (!cleaned && idx > 0) inputs.current[idx - 1]?.focus();
    if (newDigits.every((d) => d) && cleaned) onVerify(newDigits.join(""));
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[idx] && idx > 0)
      inputs.current[idx - 1]?.focus();
  };

  useEffect(() => {
    if (visible) setDigits(["", "", "", "", "", ""]);
  }, [visible]);

  const isComplete = digits.every((d) => d);

  // Fix: step number gradient as proper tuple
  const stepGradient = getPrimaryGradient(isDark);

  const STEPS = [
    "Install Google Authenticator or Authy",
    'Tap "+" and scan the QR code above',
    "Enter the 6-digit code shown in the app",
  ] as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={authMSt.overlay}>
          <ScrollView>
            <View
              style={[
                authMSt.box,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[authMSt.handle, { backgroundColor: colors.border }]}
              />

              <View
                style={[
                  authMSt.iconWrap,
                  { backgroundColor: colors.primaryDim },
                ]}
              >
                <Ionicons
                  name="phone-portrait"
                  size={32}
                  color={colors.primary}
                />
              </View>

              <Text style={[authMSt.title, { color: colors.text }]}>
                Setup Authenticator
              </Text>
              <Text style={[authMSt.subtitle, { color: colors.text2 }]}>
                Scan the QR code with Google Authenticator or any TOTP app
              </Text>

              {/* QR Code */}
              {qrCode ? (
                <View
                  style={[
                    authMSt.qrWrap,
                    { backgroundColor: "#FFFFFF", borderColor: colors.border },
                  ]}
                >
                  <Image
                    source={{ uri: qrCode }}
                    style={authMSt.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={[authMSt.qrWrap, { borderColor: colors.border }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}

              {/* Manual key */}
              {Boolean(secret) && (
                <View
                  style={[
                    authMSt.secretBox,
                    {
                      backgroundColor: colors.primaryDim,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[authMSt.secretLabel, { color: colors.text2 }]}>
                    Manual entry key:
                  </Text>
                  <Text style={[authMSt.secretKey, { color: colors.primary }]}>
                    {secret.match(/.{1,4}/g)?.join(" ") ?? secret}
                  </Text>
                </View>
              )}

              {/* Steps */}
              <View
                style={[
                  authMSt.stepsBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {STEPS.map((step, i) => (
                  <View key={i} style={authMSt.stepRow}>
                    {/* Fix: proper tuple gradient for step numbers */}
                    <LinearGradient
                      colors={stepGradient}
                      style={authMSt.stepNum}
                    >
                      <Text style={authMSt.stepNumText}>{i + 1}</Text>
                    </LinearGradient>
                    <Text style={[authMSt.stepText, { color: colors.text2 }]}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={[authMSt.enterLabel, { color: colors.text }]}>
                Enter 6-digit code from app:
              </Text>

              <OtpInput
                digits={digits}
                inputs={inputs}
                colors={colors}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
              />

              <VerifyButton
                onPress={() => onVerify(digits.join(""))}
                loading={loading}
                disabled={!isComplete}
                colors={colors}
                isDark={isDark}
              />

              <TouchableOpacity onPress={onClose} style={authMSt.cancelBtn}>
                <Text style={[authMSt.cancelText, { color: colors.text2 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const authMSt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  box: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: Spacing[6],
    paddingBottom: Platform.OS === "ios" ? 40 : Spacing[6],
    alignItems: "center",
    gap: Spacing[4],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing[2],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  qrWrap: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  qrImage: { width: 184, height: 184 },
  secretBox: {
    width: "100%",
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    gap: 4,
  },
  secretLabel: { fontSize: 11, fontWeight: "500" },
  secretKey: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },
  stepsBox: {
    width: "100%",
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[3] },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  stepText: { fontSize: 13, flex: 1, lineHeight: 20 },
  enterLabel: { fontSize: 14, fontWeight: "600", alignSelf: "flex-start" },
  cancelBtn: { paddingVertical: Spacing[2] },
  cancelText: { fontSize: 14, fontWeight: "500" },
});

// ─── Reusable Sub-Components ──────────────────────────────────────────────────
function Card({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: AppColors;
}) {
  return (
    <View
      style={[
        cSt.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

const cSt = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
  },
});

function SectionLabel({ label, colors }: { label: string; colors: AppColors }) {
  return <Text style={[slSt.lbl, { color: colors.text3 }]}>{label}</Text>;
}

const slSt = StyleSheet.create({
  lbl: {
    fontSize: Typography.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing[2],
    marginLeft: 2,
  },
});

interface MenuItemProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  onPress: () => void;
  colors: AppColors;
  isLast?: boolean;
}

function MenuItem({
  icon,
  iconBg,
  iconColor,
  label,
  desc,
  onPress,
  colors,
  isLast,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[
        miSt.row,
        {
          borderBottomColor: colors.borderSoft,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[miSt.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[miSt.label, { color: colors.text }]}>{label}</Text>
        {desc.length > 0 && (
          <Text style={[miSt.desc, { color: colors.text2 }]}>{desc}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={15} color={colors.text3} />
    </TouchableOpacity>
  );
}

const miSt = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: Typography.sm, fontWeight: "600" },
  desc: { fontSize: Typography.xs, marginTop: 1 },
});

interface SecRowProps {
  icon: string;
  iconColor: string;
  label: string;
  sub?: string;
  right: React.ReactNode;
  colors: AppColors;
}

function SecRow({ icon, iconColor, label, sub, right, colors }: SecRowProps) {
  return (
    <View style={[srSt.row, { backgroundColor: colors.surface }]}>
      <View style={srSt.left}>
        <Ionicons name={icon as any} size={15} color={iconColor} />
        <View>
          <Text style={[srSt.label, { color: colors.text }]}>{label}</Text>
          {typeof sub === "string" && sub.length > 0 && (
            <Text style={[srSt.sub, { color: colors.text3 }]}>{sub}</Text>
          )}
        </View>
      </View>
      {right}
    </View>
  );
}

const srSt = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    marginBottom: Spacing[2],
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    flex: 1,
  },
  label: { fontSize: Typography.xs, fontWeight: "600" },
  sub: { fontSize: 10, marginTop: 1 },
});

function Chip({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <View style={[chSt.chip, { backgroundColor: bg }]}>
      <Text style={[chSt.txt, { color }]}>{label}</Text>
    </View>
  );
}

const chSt = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.md,
  },
  txt: { fontSize: 10, fontWeight: "700" },
});

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: AppColors;
  disabled?: boolean;
}

function ToggleSwitch({
  value,
  onValueChange,
  colors,
  disabled,
}: ToggleSwitchProps) {
  const translateX = useRef(new Animated.Value(value ? 14 : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 14 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 150,
    }).start();
    // translateX is a stable ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TouchableOpacity
      style={[
        tgSt.track,
        { backgroundColor: value ? colors.primary : colors.border },
        disabled && { opacity: 0.5 },
      ]}
      onPress={() => !disabled && onValueChange(!value)}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Animated.View style={[tgSt.thumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
}

const tgSt = StyleSheet.create({
  track: {
    width: 38,
    height: 22,
    borderRadius: 11,
    padding: 2,
    justifyContent: "center",
  },
  thumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
});

// ─── Security score helper (pure function, outside component) ─────────────────
interface SecurityResult {
  score: number;
  level: "low" | "medium" | "high";
  label: string;
}

function computeSecurityScore(
  user: any,
  bioEnabled: boolean,
  isPinSet: boolean,
): SecurityResult {
  if (!user) return { score: 0, level: "low", label: "Low" };
  let score = 0;
  if (user.isEmailVerified) score += 1;
  if (user.twoFactorEnabled) score += 2;
  if (user.kycStatus === "Approved") score += 1;
  if (bioEnabled) score += 1;
  if (isPinSet) score += 1;
  if (score >= 5) return { score, level: "high", label: "Excellent" };
  if (score >= 3) return { score, level: "medium", label: "Good" };
  return { score, level: "low", label: "Weak" };
}

// ─── Security palette helper ──────────────────────────────────────────────────
function getSecurityPalette(level: SecurityResult["level"], colors: AppColors) {
  if (level === "high") {
    return {
      color: colors.green,
      bg: colors.greenDim,
      // Fix: use greenBorder not orangeDim as border
      border: colors.greenBorder,
    };
  }
  if (level === "medium") {
    return {
      color: colors.orange,
      bg: colors.orangeDim,
      // Fix: orangeDim is rgba — too faint for a border; use primaryBorder as neutral
      border: colors.primaryBorder,
    };
  }
  return {
    color: colors.red,
    bg: colors.redDim,
    border: colors.redBorder,
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    status: bioStatus,
    isEnabled: bioEnabled,
    isLoading: bioLoading,
    enable: bioEnable,
    disable: bioDisable,
    checkStatus: bioCheck,
  } = useBiometric();

  const { isPinSet, checkPinStatus } = usePin();

  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showEmailOTP, setShowEmailOTP] = useState(false);
  const [showAuthenticator, setShowAuthenticator] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: "success",
    message: "",
  });

  // Fix: proper cleanup on unmount
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      3000,
    );
  }, []);

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void) => {
      setConfirmState({ visible: true, title, message, onConfirm });
    },
    [],
  );

  const dismissConfirm = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Fix: add deps to avoid stale closure warning
  useEffect(() => {
    bioCheck();
    checkPinStatus();
    // bioCheck and checkPinStatus should be stable refs from hooks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = useCallback(() => {
    if (onClose) onClose();
    else router.back();
  }, [onClose, router]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const appColors = colors as unknown as AppColors;
  const security = computeSecurityScore(user, bioEnabled, isPinSet);
  const palette = getSecurityPalette(security.level, appColors);
  const MAX_SCORE = 6;

  // ── 2FA handlers ──────────────────────────────────────────────────────────
  const handleToggle2FA = useCallback(
    async (enable: boolean) => {
      if (!user || twoFaLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (enable) {
        setShowMethodModal(true);
      } else {
        showConfirm(
          "Disable 2FA",
          "This will make your account less secure. Are you sure?",
          async () => {
            setTwoFaLoading(true);
            try {
              const res = await twoFactorService.toggle(false);
              if (res.success || res.status === "success") {
                await refresh();
                showToast("success", "2FA has been disabled.");
              } else {
                showToast("error", res.message || "Failed to disable 2FA.");
              }
            } catch (err: any) {
              showToast(
                "error",
                err?.response?.data?.message || "Failed to disable 2FA.",
              );
            } finally {
              setTwoFaLoading(false);
            }
          },
        );
      }
    },
    [user, twoFaLoading, showConfirm, showToast, refresh],
  );

  const handleSelectEmail = useCallback(async () => {
    setShowMethodModal(false);
    setTwoFaLoading(true);
    try {
      const res = await twoFactorService.toggle(true);
      if (res.success || res.status === "success") {
        setShowEmailOTP(true);
        showToast("info", "OTP sent to your email!");
      } else {
        showToast("error", res.message || "Failed to send OTP.");
      }
    } catch (err: any) {
      showToast("error", err?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setTwoFaLoading(false);
    }
  }, [showToast]);

  const handleVerifyEmail = useCallback(
    async (code: string) => {
      if (code.length < 6) return;
      setVerifyLoading(true);
      try {
        const res = await twoFactorService.verifyEmail(code);
        if (res.success || res.status === "success") {
          setShowEmailOTP(false);
          await refresh();
          showToast("success", "Email 2FA enabled successfully!");
        } else {
          showToast("error", res.message || "Invalid OTP. Please try again.");
        }
      } catch (err: any) {
        showToast(
          "error",
          err?.response?.data?.message || "Verification failed.",
        );
      } finally {
        setVerifyLoading(false);
      }
    },
    [refresh, showToast],
  );

  const handleSelectAuthenticator = useCallback(async () => {
    setShowMethodModal(false);
    setTwoFaLoading(true);
    try {
      const res = await twoFactorService.setupAuthenticator();
      if (res.success && res.qrCode) {
        setQrCode(res.qrCode);
        setSecret(res.secret);
        setShowAuthenticator(true);
      } else {
        showToast("error", "Failed to setup authenticator.");
      }
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message || "Failed to setup authenticator.",
      );
    } finally {
      setTwoFaLoading(false);
    }
  }, [showToast]);

  const handleVerifyAuthenticator = useCallback(
    async (code: string) => {
      if (code.length < 6) return;
      setVerifyLoading(true);
      try {
        const res = await twoFactorService.verifyAuthenticator(code);
        if (res.success) {
          setShowAuthenticator(false);
          await refresh();
          showToast("success", "Authenticator 2FA enabled successfully!");
        } else {
          showToast("error", res.message || "Invalid code. Please try again.");
        }
      } catch (err: any) {
        showToast(
          "error",
          err?.response?.data?.message || "Verification failed.",
        );
      } finally {
        setVerifyLoading(false);
      }
    },
    [refresh, showToast],
  );

  const handleToggleBio = useCallback(
    async (enable: boolean) => {
      if (bioLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!bioStatus?.isAvailable) {
        showToast("error", "Biometric not available on this device.");
        return;
      }
      if (!bioStatus?.isEnrolled) {
        showToast(
          "info",
          `Please set up ${bioStatus?.biometryTypeName ?? "Biometric"} in device settings.`,
        );
        return;
      }
      if (enable) {
        if (!user?.email) {
          showToast("error", "User email not found.");
          return;
        }
        const result = await bioEnable(user.email);
        if (result.success)
          showToast(
            "success",
            `${bioStatus?.biometryTypeName ?? "Biometric"} enabled!`,
          );
        else if (result.error !== "Authentication cancelled")
          showToast("error", result.error || "Failed to enable biometric.");
      } else {
        showConfirm(
          `Disable ${bioStatus?.biometryTypeName ?? "Biometric"}?`,
          "Are you sure?",
          async () => {
            const result = await bioDisable();
            if (result.success) showToast("success", "Biometric disabled.");
            else showToast("error", result.error || "Failed to disable.");
          },
        );
      }
    },
    [
      bioLoading,
      bioStatus,
      user,
      bioEnable,
      bioDisable,
      showToast,
      showConfirm,
    ],
  );

  const handleLogout = useCallback(() => {
    showConfirm("Log Out", "Are you sure you want to log out?", async () => {
      try {
        await logout();
      } catch {
        showToast("error", "Failed to log out.");
      }
    });
  }, [showConfirm, showToast, logout]);

  const navigate = useCallback(
    (route: string) => router.push(route as any),
    [router],
  );

  const openLink = useCallback(
    (url: string) =>
      Linking.openURL(url).catch(() =>
        showToast("error", "Could not open link."),
      ),
    [showToast],
  );

  const handleShare = useCallback(async () => {
    const code = (user as any)?.referralCode;
    if (!code) return;
    try {
      await Share.share({ message: `Join using my referral code: ${code}` });
    } catch {}
  }, [user]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.root, s.center, { backgroundColor: appColors.bg }]}>
        <ActivityIndicator size="large" color={appColors.primary} />
        <Text style={[s.loadTxt, { color: appColors.text2 }]}>Loading…</Text>
      </View>
    );
  }

  const fullName =
    `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim() ||
    "User";
  const initials = fullName.slice(0, 2).toUpperCase();
  const kycStatus = (user as any).kycStatus || "Not Submitted";
  const isKycApproved = kycStatus === "Approved";

  const twoFaMethod: string | null = user.twoFactorEnabled
    ? (user as any).twoFactorMethod === "authenticator"
      ? "Authenticator App"
      : "Email OTP"
    : null;

  const languageLabel =
    (user as any).settings?.language === "en"
      ? "English"
      : (user as any).settings?.language || "English";
  const currencyLabel = (user as any).settings?.preferredCurrency || "USD";
  const langDesc = `${languageLabel} · ${currencyLabel}`;

  // Fix: proper gradient tuple for profile avatar
  const avatarGradient = getPrimaryGradient(isDark);

  // Fix: proper gradient tuple for referral share button
  const shareGradient = getPrimaryGradient(isDark);

  return (
    <View style={[s.root, { backgroundColor: appColors.bg }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={appColors.bgGradient as [string, string, string]}
        locations={appColors.bgGradientPos as [number, number, number]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          hdrSt.wrap,
          {
            paddingTop: insets.top + Spacing[2],
            backgroundColor: appColors.card,
            borderBottomColor: appColors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={hdrSt.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[hdrSt.title, { color: appColors.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: insets.bottom + 80 },
        ]}
      >
        {/* ── Profile Card ────────────────────────────────────────────── */}
        <AnimatedSection delay={60}>
          <TouchableOpacity
            style={[
              profSt.card,
              {
                backgroundColor: appColors.card,
                borderColor: appColors.border,
              },
            ]}
            onPress={() => navigate("/(screens)/profile")}
            activeOpacity={0.8}
          >
            {/* Fix: proper tuple for avatar gradient */}
            <LinearGradient
              colors={avatarGradient}
              style={profSt.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={profSt.initials}>{initials}</Text>
            </LinearGradient>

            <View style={profSt.meta}>
              <Text style={[profSt.name, { color: appColors.text }]}>
                {fullName}
              </Text>
              <Text
                style={[profSt.email, { color: appColors.text2 }]}
                numberOfLines={1}
              >
                {user.email}
              </Text>
              <View style={profSt.badges}>
                <View
                  style={[
                    profSt.kycBadge,
                    {
                      backgroundColor: isKycApproved
                        ? appColors.greenDim
                        : appColors.orangeDim,
                    },
                  ]}
                >
                  <Ionicons
                    name={isKycApproved ? "shield-checkmark" : "shield-outline"}
                    size={10}
                    color={isKycApproved ? appColors.green : appColors.orange}
                  />
                  <Text
                    style={[
                      profSt.kycTxt,
                      {
                        color: isKycApproved
                          ? appColors.green
                          : appColors.orange,
                      },
                    ]}
                  >
                    {`KYC ${kycStatus}`}
                  </Text>
                </View>
                <Text style={[profSt.uid, { color: appColors.text3 }]}>
                  {`#${user._id.slice(-6).toUpperCase()}`}
                </Text>
              </View>
            </View>

            <View
              style={[
                profSt.chevBtn,
                {
                  backgroundColor: appColors.primaryDim,
                  borderColor: appColors.border,
                },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={appColors.primary}
              />
            </View>
          </TouchableOpacity>
        </AnimatedSection>

        {/* ── Security Score Card ─────────────────────────────────────── */}
        <AnimatedSection delay={100}>
          <Card colors={appColors}>
            <View style={secSt.top}>
              <View style={[secSt.iconBox, { backgroundColor: palette.bg }]}>
                <Ionicons
                  name="shield-checkmark"
                  size={22}
                  color={palette.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[secSt.title, { color: appColors.text }]}>
                  Security Level
                </Text>
                <Text style={[secSt.level, { color: palette.color }]}>
                  {security.label}
                </Text>
              </View>
              <View style={[secSt.pill, { backgroundColor: palette.bg }]}>
                <Text style={[secSt.pillTxt, { color: palette.color }]}>
                  {`${security.score}/${MAX_SCORE}`}
                </Text>
              </View>
            </View>

            <View
              style={[
                secSt.progress,
                { backgroundColor: appColors.borderSoft },
              ]}
            >
              <View
                style={[
                  secSt.progressFill,
                  {
                    backgroundColor: palette.color,
                    width: `${(security.score / MAX_SCORE) * 100}%`,
                  },
                ]}
              />
            </View>

            <View style={secSt.items}>
              {/* Email verified */}
              <SecRow
                icon="mail"
                iconColor={
                  user.isEmailVerified ? appColors.green : appColors.text3
                }
                label="Email Verified"
                colors={appColors}
                right={
                  <Chip
                    label={user.isEmailVerified ? "Verified" : "Pending"}
                    bg={
                      user.isEmailVerified
                        ? appColors.greenDim
                        : appColors.orangeDim
                    }
                    color={
                      user.isEmailVerified ? appColors.green : appColors.orange
                    }
                  />
                }
              />

              {/* 2FA */}
              <SecRow
                icon="key"
                iconColor={
                  user.twoFactorEnabled ? appColors.primary : appColors.text3
                }
                label="Two-Factor Auth"
                sub={twoFaMethod ?? undefined}
                colors={appColors}
                right={
                  twoFaLoading ? (
                    <ActivityIndicator size="small" color={appColors.primary} />
                  ) : (
                    <ToggleSwitch
                      value={user.twoFactorEnabled}
                      onValueChange={handleToggle2FA}
                      colors={appColors}
                      disabled={twoFaLoading}
                    />
                  )
                }
              />

              {/* Biometric */}
              <SecRow
                icon="finger-print"
                iconColor={bioEnabled ? appColors.primary : appColors.text3}
                label={bioStatus?.biometryTypeName ?? "Biometric"}
                sub={
                  !bioStatus?.isAvailable || !bioStatus?.isEnrolled
                    ? "Not available"
                    : undefined
                }
                colors={appColors}
                right={
                  bioLoading ? (
                    <ActivityIndicator size="small" color={appColors.primary} />
                  ) : (
                    <ToggleSwitch
                      value={bioEnabled}
                      onValueChange={handleToggleBio}
                      colors={appColors}
                      disabled={
                        !bioStatus?.isAvailable ||
                        !bioStatus?.isEnrolled ||
                        bioLoading
                      }
                    />
                  )
                }
              />

              {/* PIN */}
              {/* <TouchableOpacity
                onPress={() => navigate("/(screens)/pin-setup")}
              >
                <SecRow
                  icon="lock-closed"
                  iconColor={isPinSet ? appColors.primary : appColors.text3}
                  label="Transaction PIN"
                  sub={!isPinSet ? "Tap to set up" : undefined}
                  colors={appColors}
                  right={
                    <Chip
                      label={isPinSet ? "Active" : "Set Up"}
                      bg={isPinSet ? appColors.primaryDim : appColors.orangeDim}
                      color={isPinSet ? appColors.primary : appColors.orange}
                    />
                  }
                />
              </TouchableOpacity> */}
            </View>
          </Card>
        </AnimatedSection>

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <AnimatedSection delay={120}>
          <SectionLabel label="Appearance" colors={appColors} />
          <Card colors={appColors}>
            <SecRow
              icon={isDark ? "moon" : "sunny"}
              iconColor={appColors.primary}
              label="Dark Mode"
              sub={isDark ? "On" : "Off"}
              colors={appColors}
              right={
                <ToggleSwitch
                  value={isDark}
                  onValueChange={() => toggleTheme()}
                  colors={appColors}
                />
              }
            />
          </Card>
        </AnimatedSection>
        {/* ── Referral Card ────────────────────────────────────────────── */}
        {Boolean((user as any).referralCode) && (
          <AnimatedSection delay={140}>
            <View
              style={[
                refSt.card,
                {
                  backgroundColor: appColors.primaryDim,
                  borderColor: appColors.border,
                },
              ]}
            >
              <View style={refSt.refLeft}>
                <View
                  style={[
                    refSt.refIconWrap,
                    { backgroundColor: appColors.primaryDim },
                  ]}
                >
                  <Ionicons
                    name="gift-outline"
                    size={18}
                    color={appColors.primary}
                  />
                </View>
                <View>
                  <Text style={[refSt.lbl, { color: appColors.text2 }]}>
                    Referral Code
                  </Text>
                  <Text style={[refSt.code, { color: appColors.primary }]}>
                    {(user as any).referralCode}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={{ borderRadius: Radius.lg, overflow: "hidden" }}
                onPress={handleShare}
              >
                {/* Fix: proper gradient tuple */}
                <LinearGradient
                  colors={shareGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={refSt.shareBtn}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={15}
                    color="#fff"
                  />
                  <Text style={refSt.shareTxt}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </AnimatedSection>
        )}

        {/* ── Account ─────────────────────────────────────────────────── */}
        <AnimatedSection delay={160}>
          <SectionLabel label="Account" colors={appColors} />
          <Card colors={appColors}>
            <MenuItem
              icon="person-outline"
              iconBg={appColors.primaryDim}
              iconColor={appColors.primary}
              label="Profile"
              desc="Personal information"
              onPress={() => navigate("/(screens)/profile")}
              colors={appColors}
            />
            <MenuItem
              icon="notifications-outline"
              iconBg={appColors.orangeDim}
              iconColor={appColors.orange}
              label="Notifications"
              desc="Push, email, SMS"
              onPress={() => navigate("/(screens)/notification")}
              colors={appColors}
            />
            {/* <MenuItem
              icon="language-outline"
              iconBg={appColors.greenDim}
              iconColor={appColors.green}
              label="Language & Region"
              desc={langDesc}
              onPress={() => navigate("/(screens)/language-settings")}
              colors={appColors}
            /> */}
            <MenuItem
              icon="card-outline"
              iconBg={appColors.blueDim}
              iconColor={appColors.blue}
              label="Payment Methods"
              desc="Manage saved accounts"
              onPress={() => navigate("/(screens)/payment-methods")}
              colors={appColors}
              isLast
            />
          </Card>
        </AnimatedSection>

        {/* ── Support ─────────────────────────────────────────────────── */}
        <AnimatedSection delay={180}>
          <SectionLabel label="Support" colors={appColors} />
          <Card colors={appColors}>
            <MenuItem
              icon="help-circle-outline"
              iconBg={appColors.blueDim}
              iconColor={appColors.blue}
              label="Help Centre"
              desc="FAQs & guides"
              onPress={() => navigate("/(screens)/support")}
              colors={appColors}
            />
            <MenuItem
              icon="chatbubble-ellipses-outline"
              iconBg={appColors.greenDim}
              iconColor={appColors.green}
              label="Contact Support"
              desc="Chat with our team"
              onPress={() => Linking.openURL("mailto:support@yourapp.com")}
              colors={appColors}
              isLast
            />
          </Card>
        </AnimatedSection>

        {/* ── Legal ───────────────────────────────────────────────────── */}
        <AnimatedSection delay={200}>
          <SectionLabel label="Legal" colors={appColors} />
          <Card colors={appColors}>
            <MenuItem
              icon="document-text-outline"
              iconBg={appColors.surface}
              iconColor={appColors.text3}
              label="Terms of Service"
              desc="Read our terms"
              onPress={() => openLink("https://yourapp.com/terms")}
              colors={appColors}
            />
            <MenuItem
              icon="document-text-outline"
              iconBg={appColors.surface}
              iconColor={appColors.text3}
              label="Privacy Policy"
              desc="How we use your data"
              onPress={() => openLink("https://yourapp.com/privacy")}
              colors={appColors}
              isLast
            />
          </Card>
        </AnimatedSection>

        {/* ── Version ─────────────────────────────────────────────────── */}
        <AnimatedSection delay={220}>
          <View style={verSt.row}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={appColors.text3}
            />
            <Text style={[verSt.txt, { color: appColors.text3 }]}>v1.0.0</Text>
          </View>
        </AnimatedSection>

        {/* ── Logout ──────────────────────────────────────────────────── */}
        <AnimatedSection delay={240}>
          <TouchableOpacity
            style={[
              logSt.btn,
              { backgroundColor: appColors.card, borderColor: appColors.red },
            ]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View
              style={[logSt.iconBox, { backgroundColor: appColors.redDim }]}
            >
              <Ionicons name="exit-outline" size={18} color={appColors.red} />
            </View>
            <Text style={[logSt.txt, { color: appColors.red }]}>Log Out</Text>
          </TouchableOpacity>
        </AnimatedSection>
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <TwoFAMethodModal
        visible={showMethodModal}
        onClose={() => setShowMethodModal(false)}
        onSelectEmail={handleSelectEmail}
        onSelectAuthenticator={handleSelectAuthenticator}
        colors={appColors}
      />
      <EmailOTPModal
        visible={showEmailOTP}
        onClose={() => setShowEmailOTP(false)}
        onVerify={handleVerifyEmail}
        loading={verifyLoading}
        colors={appColors}
        isDark={isDark}
        email={user.email}
      />
      <AuthenticatorModal
        visible={showAuthenticator}
        onClose={() => setShowAuthenticator(false)}
        onVerify={handleVerifyAuthenticator}
        loading={verifyLoading}
        colors={appColors}
        isDark={isDark}
        qrCode={qrCode}
        secret={secret}
      />
      <ConfirmModal
        {...confirmState}
        colors={appColors}
        isDark={isDark}
        onCancel={dismissConfirm}
        onConfirm={() => {
          confirmState.onConfirm();
          dismissConfirm();
        }}
      />
      <Toast toast={toast} colors={appColors} />
    </View>
  );
}

// ─── Page-level styles ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  loadTxt: { marginTop: Spacing[3], fontSize: Typography.sm },
  scroll: { padding: Spacing[4], gap: Spacing[1] },
});

const hdrSt = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
  },
  iconBtn: { padding: Spacing[2], borderRadius: Radius.md },
  title: { fontSize: Typography.md, fontWeight: "700" },
});

const profSt = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: { fontSize: Typography.lg, fontWeight: "800", color: "#fff" },
  meta: { flex: 1 },
  name: { fontSize: Typography.base, fontWeight: "700" },
  email: { fontSize: Typography.xs, marginTop: 2, marginBottom: Spacing[1] },
  badges: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.md,
  },
  kycTxt: { fontSize: 10, fontWeight: "600" },
  uid: { fontSize: 10, fontWeight: "500" },
  chevBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

const secSt = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: Typography.sm, fontWeight: "700" },
  level: { fontSize: Typography.xs, fontWeight: "600", marginTop: 1 },
  pill: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  pillTxt: { fontSize: Typography.xs, fontWeight: "700" },
  progress: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: Spacing[3],
  },
  progressFill: { height: "100%", borderRadius: 3 },
  items: { gap: 0 },
});

const refSt = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  refLeft: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  refIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lbl: { fontSize: Typography.xs, fontWeight: "500", marginBottom: 4 },
  code: { fontSize: Typography.lg, fontWeight: "800", letterSpacing: 2 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
  },
  shareTxt: { fontSize: Typography.sm, fontWeight: "700", color: "#fff" },
});

const verSt = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: Spacing[2],
  },
  txt: { fontSize: Typography.xs, fontWeight: "500" },
});

const logSt = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  txt: { fontSize: Typography.base, fontWeight: "700" },
});
