// app/(screens)/profile.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, ActivityIndicator,
  KeyboardAvoidingView, Share, Modal, Pressable, Animated, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  Spacing, Typography, Radius, IconSize, IconBox, getShadow,
} from '@/styles/theme';
import {
  useProfile, useUpdateProfile, type UpdateProfilePayload,
} from '@/hooks/queires';

// ─── DateTimePicker ───────────────────────────────────────────────────────────
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try { DateTimePicker = require('@react-native-community/datetimepicker').default; }
  catch {}
}

// ─── Country Codes ────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+1',   country: 'US/CA',     flag: '🇺🇸' },
  { code: '+91',  country: 'India',     flag: '🇮🇳' },
  { code: '+44',  country: 'UK',        flag: '🇬🇧' },
  { code: '+971', country: 'UAE',       flag: '🇦🇪' },
  { code: '+966', country: 'Saudi',     flag: '🇸🇦' },
  { code: '+65',  country: 'Singapore', flag: '🇸🇬' },
  { code: '+61',  country: 'Australia', flag: '🇦🇺' },
  { code: '+49',  country: 'Germany',   flag: '🇩🇪' },
  { code: '+33',  country: 'France',    flag: '🇫🇷' },
  { code: '+81',  country: 'Japan',     flag: '🇯🇵' },
  { code: '+92',  country: 'Pakistan',  flag: '🇵🇰' },
  { code: '+62',  country: 'Indonesia', flag: '🇮🇩' },
  { code: '+60',  country: 'Malaysia',  flag: '🇲🇾' },
];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  firstName:   string;
  lastName:    string;
  mobileCode:  string;
  mobileNo:    string;
  address:     string;
  dateOfBirth: Date | null;
}
type ToastType  = 'success' | 'error' | 'info';
interface ToastState { visible: boolean; type: ToastType; message: string }

// ─── FadeInView ───────────────────────────────────────────────────────────────
function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(15)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, delay, duration: 400, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, tension: 40, friction: 7 }),
    ]).start();
  }, [delay, opacity, translateY]);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = React.memo(function Toast({ toast, colors }: { toast: ToastState; colors: any }) {
  if (!toast.visible) return null;

  const bg     = toast.type === 'success' ? colors.greenDim  : toast.type === 'error' ? colors.redDim  : colors.blueDim;
  const border = toast.type === 'success' ? colors.green     : toast.type === 'error' ? colors.red     : colors.blue;
  const icon   = toast.type === 'success' ? 'checkmark-circle' : toast.type === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <View style={[toastSt.wrap, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon as any} size={IconSize.sm} color={border} />
      <Text style={[toastSt.msg, { color: border }]}>{toast.message}</Text>
    </View>
  );
});

const toastSt = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 80,
    left: Spacing[4], right: Spacing[4],
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    padding: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, zIndex: 999,
  },
  msg: { fontSize: Typography.sm, fontWeight: '600', flex: 1 },
});

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
const ConfirmModal = React.memo(function ConfirmModal({
  visible, title, message, onConfirm, onCancel, colors,
}: {
  visible: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; colors: any;
}) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={[cmSt.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[cmSt.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[cmSt.title, { color: colors.text }]}>{title}</Text>
          <Text style={[cmSt.msg,   { color: colors.text2 }]}>{message}</Text>
          <View style={cmSt.row}>
            <TouchableOpacity
              style={[cmSt.btn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[cmSt.btnTxt, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cmSt.btn, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
            >
              <Text style={[cmSt.btnTxt, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const cmSt = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[5] },
  box:     { width: '100%', maxWidth: 340, borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing[5], gap: Spacing[3] },
  title:   { fontSize: Typography.md, fontWeight: '700' },
  msg:     { fontSize: Typography.sm, lineHeight: 20 },
  row:     { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[2] },
  btn:     { flex: 1, paddingVertical: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center' },
  btnTxt:  { fontSize: Typography.sm, fontWeight: '600' },
});

// ─── WebDatePicker ────────────────────────────────────────────────────────────
function WebDatePicker({
  visible, value, onClose, onSelect, colors,
}: {
  visible: boolean; value: Date; onClose: () => void;
  onSelect: (d: Date) => void; colors: any;
}) {
  const [month,    setMonth]    = useState(value.getMonth());
  const [year,     setYear]     = useState(value.getFullYear());
  const [selected, setSelected] = useState(value);
  const [yearMode, setYearMode] = useState(false);
  const maxYear = new Date().getFullYear();

  if (!visible) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const isDisabled  = (d: number) => {
    const dt = new Date(year, month, d);
    return dt > new Date() || dt < new Date(1900, 0, 1);
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++)
    cells.push(<View key={`e${i}`} style={wdpSt.cell} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const isSel = (
      selected.getDate()    === d     &&
      selected.getMonth()   === month &&
      selected.getFullYear() === year
    );
    const dis = isDisabled(d);
    cells.push(
      <TouchableOpacity
        key={d}
        style={[wdpSt.cell, isSel && { backgroundColor: colors.primary, borderRadius: Radius.full }]}
        onPress={() => !dis && setSelected(new Date(year, month, d))}
        disabled={dis}
      >
        <Text style={[wdpSt.dayTxt, { color: dis ? colors.text3 : isSel ? '#fff' : colors.text }]}>
          {d}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal transparent visible animationType="fade">
      <Pressable style={[wdpSt.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[wdpSt.box, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={e => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[wdpSt.hdr, { borderBottomColor: colors.border }]}>
            <Text style={[wdpSt.hdrTxt, { color: colors.text }]}>Date of Birth</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={IconSize.md} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {yearMode ? (
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {Array.from({ length: maxYear - 1900 + 1 }, (_, i) => maxYear - i).map(y => (
                <TouchableOpacity
                  key={y}
                  style={[
                    wdpSt.yearRow,
                    y === year && { backgroundColor: colors.primaryDim, borderRadius: Radius.md },
                  ]}
                  onPress={() => { setYear(y); setYearMode(false); }}
                >
                  <Text style={[
                    wdpSt.yearTxt,
                    { color: y === year ? colors.primary : colors.text },
                    y === year && { fontWeight: '700' },
                  ]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <>
              {/* Nav */}
              <View style={wdpSt.nav}>
                <TouchableOpacity
                  style={[wdpSt.navBtn, { backgroundColor: colors.surface }]}
                  onPress={() => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1)}
                >
                  <Ionicons name="chevron-back" size={IconSize.sm} color={colors.text2} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setYearMode(true)} style={wdpSt.navCenter}>
                  <Text style={[wdpSt.navTxt, { color: colors.text }]}>{MONTHS[month]} {year}</Text>
                  <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[wdpSt.navBtn, { backgroundColor: colors.surface }]}
                  onPress={() => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1)}
                >
                  <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.text2} />
                </TouchableOpacity>
              </View>
              {/* Week days */}
              <View style={wdpSt.weekRow}>
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <Text key={d} style={[wdpSt.wdTxt, { color: colors.text3 }]}>{d}</Text>
                ))}
              </View>
              <View style={wdpSt.grid}>{cells}</View>
            </>
          )}

          {/* Footer */}
          <View style={[wdpSt.ftr, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[wdpSt.ftrBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[wdpSt.ftrTxt, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[wdpSt.ftrBtn, { backgroundColor: colors.primary }]}
              onPress={() => { onSelect(selected); onClose(); }}
            >
              <Text style={[wdpSt.ftrTxt, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const wdpSt = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[4] },
  box:       { width: '100%', maxWidth: 360, borderRadius: Radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  hdr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], borderBottomWidth: 1 },
  hdrTxt:    { fontSize: Typography.base, fontWeight: '700' },
  nav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[3] },
  navBtn:    { padding: Spacing[2], borderRadius: Radius.md },
  navCenter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navTxt:    { fontSize: Typography.base, fontWeight: '600' },
  weekRow:   { flexDirection: 'row', paddingHorizontal: Spacing[3], marginBottom: Spacing[1] },
  wdTxt:     { flex: 1, textAlign: 'center', fontSize: Typography.xs, fontWeight: '600' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing[3], paddingBottom: Spacing[3] },
  cell:      { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayTxt:    { fontSize: Typography.sm, fontWeight: '500' },
  yearRow:   { paddingVertical: Spacing[3], paddingHorizontal: Spacing[4] },
  yearTxt:   { fontSize: Typography.base, textAlign: 'center' },
  ftr:       { flexDirection: 'row', gap: Spacing[3], padding: Spacing[4], borderTopWidth: 1 },
  ftrBtn:    { flex: 1, paddingVertical: Spacing[3], borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center' },
  ftrTxt:    { fontSize: Typography.sm, fontWeight: '600' },
});

// ─── InfoRow ──────────────────────────────────────────────────────────────────
const InfoRow = React.memo(function InfoRow({
  label, value, colors, badge, badgeColor, badgeBg, copyable, onCopy,
}: {
  label: string; value: string; colors: any;
  badge?: boolean; badgeColor?: string; badgeBg?: string;
  copyable?: boolean; onCopy?: () => void;
}) {
  return (
    <View style={[irSt.row, { borderBottomColor: colors.borderSoft }]}>
      <Text style={[irSt.label, { color: colors.text2 }]}>{label}</Text>
      {badge ? (
        <View style={[irSt.badge, { backgroundColor: badgeBg }]}>
          <Text style={[irSt.badgeTxt, { color: badgeColor }]}>{value}</Text>
        </View>
      ) : copyable ? (
        <TouchableOpacity style={irSt.copyRow} onPress={onCopy}>
          <Text style={[irSt.value, { color: colors.text }]}>{value}</Text>
          <Ionicons name="copy-outline" size={IconSize.xs} color={colors.text3} />
        </TouchableOpacity>
      ) : (
        <Text style={[irSt.value, { color: colors.text }]}>{value}</Text>
      )}
    </View>
  );
});

const irSt = StyleSheet.create({
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1 },
  label:    { fontSize: Typography.sm },
  value:    { fontSize: Typography.sm, fontWeight: '500' },
  badge:    { paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.md },
  badgeTxt: { fontSize: Typography.xs, fontWeight: '600' },
  copyRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────
const Card = React.memo(function Card({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[cardSt.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
});

const cardSt = StyleSheet.create({
  card: { borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing[5], marginBottom: Spacing[4] },
});

// ─── InputGroup ───────────────────────────────────────────────────────────────
const InputGroup = React.memo(function InputGroup({
  label, icon, required, colors, hint, children,
}: {
  label: string; icon: string; required?: boolean;
  colors: any; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={formSt.group}>
      <View style={formSt.labelRow}>
        <Ionicons name={icon as any} size={IconSize.xs} color={colors.text3} />
        <Text style={[formSt.label, { color: colors.text2 }]}>{label}</Text>
        {required && <Text style={{ color: colors.red, fontSize: Typography.sm }}>*</Text>}
      </View>
      {children}
      {hint && <Text style={[formSt.hint, { color: colors.text3 }]}>{hint}</Text>}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const { colors, isDark } = useTheme();
  const { user,refresh:refreshAuth }           = useAuth();
  const router             = useRouter();
  const insets             = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [editing,           setEditing]           = useState(false);
  const [showDatePicker,    setShowDatePicker]     = useState(false);
  const [showCountryPicker, setShowCountryPicker]  = useState(false);
  const [tempDate,          setTempDate]           = useState(new Date(2000, 0, 1));
  const [confirmState, setConfirmState] = useState<{
    visible: boolean; title: string; message: string; onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState<ToastState>({ visible: false, type: 'success', message: '' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emptyForm = (): FormData => ({
    firstName: '', lastName: '', mobileCode: '+91',
    mobileNo: '', address: '', dateOfBirth: null,
  });

  const [formData,     setFormData]     = useState<FormData>(emptyForm());
  const [originalData, setOriginalData] = useState<FormData>(emptyForm());

  // ── React Query ────────────────────────────────────────────────────────────
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const saving  = updateProfileMutation.isPending;
  const profile = profileData ?? (user as any);

  // ── Populate form ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    const dob  = profile.DOB ? new Date(profile.DOB) : null;
    const data: FormData = {
      firstName:   profile.firstName  || '',
      lastName:    profile.lastName   || '',
      mobileCode:  profile.mobileCode || '+91',
      mobileNo:    profile.mobileNo   || '',
      address:     profile.address    || '',
      dateOfBirth: dob,
    };
    setFormData(data);
    setOriginalData(data);
    if (dob) setTempDate(dob);
  }, [profile]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((type: ToastType, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })), 3000,
    );
  }, []);

  // ── Confirm ────────────────────────────────────────────────────────────────
  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ visible: true, title, message, onConfirm });
  }, []);

  // ── Has changes ────────────────────────────────────────────────────────────
  const hasChanges = useCallback(() =>
    formData.firstName    !== originalData.firstName    ||
    formData.lastName     !== originalData.lastName     ||
    formData.mobileCode   !== originalData.mobileCode   ||
    formData.mobileNo     !== originalData.mobileNo     ||
    formData.address      !== originalData.address      ||
    formData.dateOfBirth?.toISOString() !== originalData.dateOfBirth?.toISOString(),
  [formData, originalData]);

  // ── Back ───────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (editing && hasChanges()) {
      showConfirm('Discard Changes?', 'You have unsaved changes. Go back anyway?', () => {
        setEditing(false);
        setFormData(originalData);
        router.back();
      });
    } else {
      router.back();
    }
  }, [editing, hasChanges, showConfirm, originalData, router]);

  // ── Cancel edit ────────────────────────────────────────────────────────────
  const handleCancelEdit = useCallback(() => {
    if (hasChanges()) {
      showConfirm('Discard Changes?', 'Are you sure?', () => {
        setEditing(false);
        setFormData(originalData);
      });
    } else {
      setEditing(false);
    }
  }, [hasChanges, showConfirm, originalData]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!formData.firstName.trim()) { showToast('error', 'First name is required.'); return; }
    if (!formData.lastName.trim())  { showToast('error', 'Last name is required.');  return; }
    if (formData.mobileNo && !/^\d{6,15}$/.test(formData.mobileNo.trim())) {
      showToast('error', 'Please enter a valid phone number (6–15 digits).');
      return;
    }
    const userId = profile?._id ?? (user as any)?._id;
    if (!userId) { showToast('error', 'User ID not found.'); return; }

    const payload: UpdateProfilePayload = {
      firstName: formData.firstName.trim(),
      lastName:  formData.lastName.trim(),
    };
    if (formData.mobileCode)       payload.mobileCode = formData.mobileCode;
    if (formData.mobileNo.trim())  payload.mobileNo   = formData.mobileNo.trim();
    if (formData.address.trim())   payload.address    = formData.address.trim();
    if (formData.dateOfBirth) {
      const d = new Date(formData.dateOfBirth);
      d.setUTCHours(0, 0, 0, 0);
      payload.DOB = d.toISOString();
    }
    try {
      await updateProfileMutation.mutateAsync({ userId, payload });
      await refreshAuth();
      setOriginalData({ ...formData });
      setEditing(false);
      showToast('success', 'Profile updated successfully!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message ?? err?.message ?? 'Failed to update profile.');
    }
  }, [formData, profile, user, updateProfileMutation, showToast,refreshAuth]);

  // ── Copy ───────────────────────────────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showToast('success', `${label} copied!`);
  }, [showToast]);

  // ── Share referral ─────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const code = profile?.referralCode;
    if (!code) return;
    try { await Share.share({ message: `Join using my referral code: ${code}` }); }
    catch {}
  }, [profile]);

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // ── Shared input style helper ──────────────────────────────────────────────
  const inputStyle = (active: boolean) => ({
    backgroundColor: active ? colors.surface : colors.cardAlt,
    borderColor:     active ? colors.primary : colors.border,
    color:           colors.text,
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (profileLoading && !profile) {
    return (
      <View style={[gs.root, gs.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[gs.loadTxt, { color: colors.text2 }]}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[gs.root, gs.center, { backgroundColor: colors.bg }]}>
        <Ionicons name="person-circle-outline" size={IconSize['2xl']} color={colors.text3} />
        <Text style={[gs.loadTxt, { color: colors.text2 }]}>Profile not available</Text>
        <TouchableOpacity
          onPress={() => refetchProfile()}
          style={[gs.retryBtn, { backgroundColor: colors.primaryDim }]}
        >
          <Text style={[gs.retryTxt, { color: colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName  = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User';
  const initials  = fullName.slice(0, 2).toUpperCase();
  const kycStatus = profile.kycStatus || 'Not Submitted';
  const isApproved = kycStatus === 'Approved';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[gs.root, { backgroundColor: colors.bg }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      <LinearGradient
        colors={colors.bgGradient as any}
        locations={colors.bgGradientPos as any}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Header (transparent) ───────────────────────────────────────── */}
      <View style={[
        hdrSt.wrap,
        {
          paddingTop:        insets.top + Spacing[2],
          backgroundColor:   'transparent',
          borderBottomColor: colors.border,
        },
      ]}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.8}
          style={[hdrSt.iconBtn, {
            backgroundColor: colors.surface,
            borderColor:     colors.border,
            ...getShadow(isDark, 'sm'),
          }]}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>

        <Text style={[hdrSt.title, { color: colors.text }]}>Profile</Text>

        <View style={hdrSt.right}>
          {editing ? (
            <View style={hdrSt.editRow}>
              {/* Cancel */}
              <TouchableOpacity
                style={[hdrSt.iconBtn, {
                  backgroundColor: colors.surface,
                  borderColor:     colors.border,
                }]}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Ionicons name="close" size={IconSize.sm} color={colors.text2} />
              </TouchableOpacity>
              {/* Save */}
              <TouchableOpacity
                style={[hdrSt.saveBtn, {
                  backgroundColor: hasChanges() ? colors.primary : colors.primaryDim,
                }]}
                onPress={handleSave}
                disabled={saving || !hasChanges()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={IconSize.xs} color="#fff" />
                    <Text style={hdrSt.saveTxt}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* Edit button */
            <TouchableOpacity
              style={[hdrSt.editBtn, {
                backgroundColor: colors.primaryDim,
                borderColor:     colors.primaryBorder,
              }]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="pencil-outline" size={IconSize.xs} color={colors.primary} />
              <Text style={[hdrSt.editTxt, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[gs.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Profile Hero ─────────────────────────────────────────── */}
          <FadeInView delay={80}>
            <Card colors={colors}>
              <View style={phSt.row}>
                <LinearGradient
                  colors={colors.primaryGradient as [string, string]}
                  style={phSt.avatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={phSt.avatarTxt}>{initials}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[phSt.name,  { color: colors.text  }]}>{fullName}</Text>
                  <Text style={[phSt.email, { color: colors.text2 }]}>{profile.email}</Text>
                  <View style={phSt.badges}>
                    {/* KYC badge */}
                    <View style={[phSt.badge, {
                      backgroundColor: isApproved ? colors.greenDim : colors.orangeDim,
                    }]}>
                      <Ionicons
                        name={isApproved ? 'shield-checkmark' : 'shield-outline'}
                        size={11}
                        color={isApproved ? colors.green : colors.orange}
                      />
                      <Text style={[phSt.badgeTxt, {
                        color: isApproved ? colors.green : colors.orange,
                      }]}>
                        KYC {kycStatus}
                      </Text>
                    </View>
                    {/* Email verified badge */}
                    {profile.isEmailVerified && (
                      <View style={[phSt.badge, { backgroundColor: colors.blueDim }]}>
                        <Ionicons name="mail" size={11} color={colors.blue} />
                        <Text style={[phSt.badgeTxt, { color: colors.blue }]}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              {profile.createdAt && (
                <View style={[phSt.memberRow, { borderTopColor: colors.borderSoft }]}>
                  <Text style={[phSt.memberLbl, { color: colors.text2 }]}>Member since</Text>
                  <Text style={[phSt.memberVal, { color: colors.text }]}>
                    {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                  </Text>
                </View>
              )}
            </Card>
          </FadeInView>

          {/* ── Personal Info ─────────────────────────────────────────── */}
          <FadeInView delay={160}>
            <Card colors={colors}>
              <Text style={[formSt.cardTitle, { color: colors.text }]}>Personal Information</Text>

              {/* First Name */}
              <InputGroup label="First Name" icon="person-outline" required={editing} colors={colors}>
                <TextInput
                  style={[formSt.input, inputStyle(editing)]}
                  value={formData.firstName}
                  onChangeText={t => setFormData(f => ({ ...f, firstName: t }))}
                  editable={editing}
                  placeholder="First name"
                  placeholderTextColor={colors.text3}
                  autoCapitalize="words"
                />
              </InputGroup>

              {/* Last Name */}
              <InputGroup label="Last Name" icon="person-outline" required={editing} colors={colors}>
                <TextInput
                  style={[formSt.input, inputStyle(editing)]}
                  value={formData.lastName}
                  onChangeText={t => setFormData(f => ({ ...f, lastName: t }))}
                  editable={editing}
                  placeholder="Last name"
                  placeholderTextColor={colors.text3}
                  autoCapitalize="words"
                />
              </InputGroup>

              {/* Email */}
              <InputGroup label="Email" icon="mail-outline" colors={colors} hint="Cannot be changed">
                <View style={formSt.rowInput}>
                  <TextInput
                    style={[formSt.input, formSt.flex, {
                      backgroundColor: colors.cardAlt,
                      borderColor:     colors.border,
                      color:           colors.text2,
                      borderTopRightRadius: 0, borderBottomRightRadius: 0,
                    }]}
                    value={profile.email}
                    editable={false}
                  />
                  <TouchableOpacity
                    style={[formSt.copyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => copyToClipboard(profile.email, 'Email')}
                  >
                    <Ionicons name="copy-outline" size={IconSize.xs} color={colors.text2} />
                  </TouchableOpacity>
                </View>
              </InputGroup>

              {/* Phone */}
              <InputGroup label="Phone" icon="call-outline" colors={colors}>
                <View style={formSt.phoneRow}>
                  <TouchableOpacity
                    style={[formSt.codeBtn, {
                      backgroundColor: editing ? colors.surface : colors.cardAlt,
                      borderColor:     editing ? colors.primary : colors.border,
                    }]}
                    onPress={() => editing && setShowCountryPicker(true)}
                    disabled={!editing}
                  >
                    <Text style={formSt.flag}>
                      {COUNTRY_CODES.find(c => c.code === formData.mobileCode)?.flag ?? '🌍'}
                    </Text>
                    <Text style={[formSt.codeText, { color: editing ? colors.text : colors.text2 }]}>
                      {formData.mobileCode}
                    </Text>
                    {editing && <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />}
                  </TouchableOpacity>
                  <TextInput
                    style={[formSt.input, formSt.flex, inputStyle(editing)]}
                    value={formData.mobileNo}
                    onChangeText={t => setFormData(f => ({ ...f, mobileNo: t.replace(/\D/g, '') }))}
                    editable={editing}
                    placeholder="Phone number"
                    placeholderTextColor={colors.text3}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                </View>
              </InputGroup>

              {/* Address */}
              <InputGroup label="Address" icon="location-outline" colors={colors}>
                <TextInput
                  style={[formSt.input, formSt.multiline, inputStyle(editing)]}
                  value={formData.address}
                  onChangeText={t => setFormData(f => ({ ...f, address: t }))}
                  editable={editing}
                  placeholder="Your address"
                  placeholderTextColor={colors.text3}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </InputGroup>

              {/* Date of Birth */}
              <InputGroup label="Date of Birth" icon="calendar-outline" colors={colors}>
                <TouchableOpacity
                  onPress={() => {
                    if (!editing) return;
                    setTempDate(formData.dateOfBirth || new Date(2000, 0, 1));
                    setShowDatePicker(true);
                  }}
                  disabled={!editing}
                >
                  <View style={[formSt.input, formSt.dateRow, {
                    backgroundColor: editing ? colors.surface  : colors.cardAlt,
                    borderColor:     editing ? colors.primary  : colors.border,
                  }]}>
                    <Text style={[formSt.dateTxt, {
                      color: formData.dateOfBirth ? colors.text : colors.text3,
                    }]}>
                      {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : 'Select date of birth'}
                    </Text>
                    {editing && <Ionicons name="calendar-outline" size={IconSize.xs} color={colors.text3} />}
                  </View>
                </TouchableOpacity>
              </InputGroup>
            </Card>
          </FadeInView>

          {/* ── Account Details ───────────────────────────────────────── */}
          <FadeInView delay={240}>
            <Card colors={colors}>
              <Text style={[formSt.cardTitle, { color: colors.text }]}>Account Details</Text>
              <InfoRow
                label="User ID" colors={colors}
                value={`${profile._id?.slice(0, 12)}…`}
                copyable onCopy={() => copyToClipboard(profile._id, 'User ID')}
              />
              <InfoRow
                label="Role" colors={colors}
                value={profile.role
                  ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
                  : 'User'}
              />
              <InfoRow
                label="Profile Status" colors={colors}
                value={profile.profileStatus || 'Active'}
                badge
                badgeBg={profile.profileStatus === 'Active' ? colors.greenDim : colors.redDim}
                badgeColor={profile.profileStatus === 'Active' ? colors.green : colors.red}
              />
              <InfoRow
                label="2FA" colors={colors}
                value={profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                badge
                badgeBg={profile.twoFactorEnabled ? colors.greenDim : colors.redDim}
                badgeColor={profile.twoFactorEnabled ? colors.green : colors.red}
              />
              {profile.dailySwapLimit && (
                <InfoRow
                  label="Daily Swap Limit" colors={colors}
                  value={`$${Number(profile.dailySwapLimit).toLocaleString()}`}
                />
              )}
            </Card>
          </FadeInView>

          {/* ── Referral ──────────────────────────────────────────────── */}
          {profile.referralCode && (
            <FadeInView delay={320}>
              <LinearGradient
                colors={colors.primaryGradient as [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={refSt.card}
              >
                <Text style={refSt.refLbl}>Referral Code</Text>
                <Text style={refSt.refCode}>{profile.referralCode}</Text>
                <Text style={refSt.refSub}>Share &amp; earn rewards!</Text>
                <View style={refSt.btnRow}>
                  <TouchableOpacity
                    style={refSt.btn}
                    onPress={() => copyToClipboard(profile.referralCode, 'Referral code')}
                  >
                    <Ionicons name="copy-outline" size={IconSize.sm} color="#fff" />
                    <Text style={refSt.btnTxt}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={refSt.btn} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={IconSize.sm} color="#fff" />
                    <Text style={refSt.btnTxt}>Share</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </FadeInView>
          )}

          {/* ── Sign-up Bonus ─────────────────────────────────────────── */}
          {profile.signUpBonus > 0 && (
            <FadeInView delay={380}>
              <View style={[bonSt.card, {
                backgroundColor: colors.orangeDim,
                borderColor:     colors.orange,
              }]}>
                <Text style={[bonSt.lbl, { color: colors.orange }]}>Sign-up Bonus</Text>
                <Text style={[bonSt.amt, { color: colors.orange }]}>
                  ${Number(profile.signUpBonus).toFixed(2)}
                </Text>
              </View>
            </FadeInView>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Date Pickers ───────────────────────────────────────────────── */}
      {Platform.OS === 'web' && (
        <WebDatePicker
          visible={showDatePicker} value={tempDate}
          onClose={() => setShowDatePicker(false)}
          onSelect={d => setFormData(f => ({ ...f, dateOfBirth: d }))}
          colors={colors}
        />
      )}

      {Platform.OS === 'ios' && DateTimePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <View style={iosDpSt.overlay}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowDatePicker(false)} />
            <View style={[iosDpSt.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <View style={[iosDpSt.hdr, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[iosDpSt.cancel, { color: colors.text2 }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[iosDpSt.hdrTxt, { color: colors.text }]}>Date of Birth</Text>
                <TouchableOpacity onPress={() => {
                  setFormData(f => ({ ...f, dateOfBirth: tempDate }));
                  setShowDatePicker(false);
                }}>
                  <Text style={[iosDpSt.done, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate} mode="date" display="spinner"
                onChange={(_: any, d?: Date) => d && setTempDate(d)}
                maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                style={{ height: 216 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showDatePicker && DateTimePicker && (
        <DateTimePicker
          value={tempDate} mode="date" display="default"
          onChange={(_: any, d?: Date) => {
            setShowDatePicker(false);
            if (d) setFormData(f => ({ ...f, dateOfBirth: d }));
          }}
          maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* ── Country Picker ─────────────────────────────────────────────── */}
      <Modal
        visible={showCountryPicker} transparent animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
            onPress={() => setShowCountryPicker(false)}
          />
          <View style={[cpSt.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[cpSt.hdr, { borderBottomColor: colors.border }]}>
              <Text style={[cpSt.title, { color: colors.text }]}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <Ionicons name="close" size={IconSize.md} color={colors.text2} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: Spacing[4] }}>
              {COUNTRY_CODES.map(c => {
                const active = formData.mobileCode === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[
                      cpSt.row,
                      { borderBottomColor: colors.borderSoft },
                      active && { backgroundColor: colors.primaryDim, borderRadius: Radius.md, borderBottomWidth: 0 },
                    ]}
                    onPress={() => {
                      setFormData(f => ({ ...f, mobileCode: c.code }));
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={cpSt.flag}>{c.flag}</Text>
                    <Text style={[cpSt.country, { color: colors.text  }]}>{c.country}</Text>
                    <Text style={[cpSt.code,    { color: colors.text2 }]}>{c.code}</Text>
                    {active && <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Confirm / Toast ────────────────────────────────────────────── */}
      <ConfirmModal
        {...confirmState}
        colors={colors}
        onCancel={() => setConfirmState(s => ({ ...s, visible: false }))}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState(s => ({ ...s, visible: false }));
        }}
      />
      <Toast toast={toast} colors={colors} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  root:     { flex: 1 },
  center:   { justifyContent: 'center', alignItems: 'center' },
  loadTxt:  { marginTop: Spacing[3], fontSize: Typography.sm },
  scroll:   { padding: Spacing[4], gap: Spacing[1] },
  retryBtn: { marginTop: Spacing[3], paddingHorizontal: Spacing[5], paddingVertical: Spacing[3], borderRadius: Radius.lg },
  retryTxt: { fontSize: Typography.sm, fontWeight: '700' },
});

const hdrSt = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: Spacing[3], paddingHorizontal: Spacing[4], borderBottomWidth: 1,
  },
  iconBtn: {
    width: IconBox.sm, height: IconBox.sm,
    borderRadius: IconBox.sm / 2, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing[2],
  },
  title:   { flex: 1, fontSize: Typography.md, fontWeight: '700' },
  right:   { marginLeft: 'auto' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.lg, borderWidth: 1,
  },
  editTxt: { fontSize: Typography.sm, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
    borderRadius: Radius.lg, minWidth: 72, justifyContent: 'center',
  },
  saveTxt: { fontSize: Typography.sm, fontWeight: '600', color: '#fff' },
});

const phSt = StyleSheet.create({
  row:       { flexDirection: 'row', gap: Spacing[4], alignItems: 'flex-start' },
  avatar:    { width: 72, height: 72, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTxt: { fontSize: Typography.xl, fontWeight: '800', color: '#fff' },
  name:      { fontSize: Typography.md, fontWeight: '700', marginBottom: 2 },
  email:     { fontSize: Typography.sm, marginBottom: Spacing[2] },
  badges:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[1] },
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.md },
  badgeTxt:  { fontSize: Typography.xs, fontWeight: '600' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing[4], paddingTop: Spacing[4], borderTopWidth: 1 },
  memberLbl: { fontSize: Typography.sm },
  memberVal: { fontSize: Typography.sm, fontWeight: '600' },
});

const formSt = StyleSheet.create({
  cardTitle: { fontSize: Typography.base, fontWeight: '700', marginBottom: Spacing[4] },
  group:     { marginBottom: Spacing[4] },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing[2] },
  label:     { fontSize: Typography.xs, fontWeight: '500' },
  hint:      { fontSize: Typography.xs, marginTop: Spacing[1], marginLeft: 2 },
  input:     { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], fontSize: Typography.sm },
  flex:      { flex: 1 },
  multiline: { minHeight: 72, textAlignVertical: 'top', paddingTop: Spacing[3] },
  rowInput:  { flexDirection: 'row', alignItems: 'center' },
  copyBtn:   { padding: Spacing[3] + 2, borderWidth: 1, borderLeftWidth: 0, borderTopRightRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  phoneRow:  { flexDirection: 'row', gap: Spacing[2] },
  codeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[3], minWidth: 95 },
  flag:      { fontSize: 16 },
  codeText:  { fontSize: Typography.sm, fontWeight: '500' },
  dateRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTxt:   { fontSize: Typography.sm },
});

const refSt = StyleSheet.create({
  card:    { borderRadius: Radius['2xl'], padding: Spacing[5], marginBottom: Spacing[4] },
  refLbl:  { fontSize: Typography.sm,    color: 'rgba(255,255,255,0.75)', marginBottom: Spacing[1] },
  refCode: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff', letterSpacing: 3, marginBottom: Spacing[1] },
  refSub:  { fontSize: Typography.xs,    color: 'rgba(255,255,255,0.6)', marginBottom: Spacing[4] },
  btnRow:  { flexDirection: 'row', gap: Spacing[3] },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.lg },
  btnTxt:  { fontSize: Typography.sm, fontWeight: '600', color: '#fff' },
});

const bonSt = StyleSheet.create({
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[4] },
  lbl:  { fontSize: Typography.sm, fontWeight: '500' },
  amt:  { fontSize: Typography.lg, fontWeight: '800' },
});

const iosDpSt = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet:   { borderTopWidth: 1, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], paddingBottom: 34 },
  hdr:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], borderBottomWidth: 1 },
  hdrTxt:  { fontSize: Typography.base, fontWeight: '600' },
  cancel:  { fontSize: Typography.base },
  done:    { fontSize: Typography.base, fontWeight: '600' },
});

const cpSt = StyleSheet.create({
  sheet:   { borderTopWidth: 1, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], maxHeight: '70%' },
  hdr:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], borderBottomWidth: 1 },
  title:   { fontSize: Typography.md, fontWeight: '700' },
  row:     { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[3], paddingHorizontal: Spacing[2], borderBottomWidth: 1 },
  flag:    { fontSize: 22 },
  country: { flex: 1, fontSize: Typography.base },
  code:    { fontSize: Typography.base, fontWeight: '600', marginRight: Spacing[2] },
});