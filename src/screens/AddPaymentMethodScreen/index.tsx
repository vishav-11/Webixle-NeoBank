// src/screens/AddPaymentMethodScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Radius, Spacing, Typography, IconSize, IconBox, getShadow,
} from '@/styles/theme';

import {
  usePaginatedPaymentMethods,
  useAddPaymentAccount,
  type PaymentMethod,
} from '@/hooks/queires';

const { height: SCREEN_H } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ─── Web portal ───────────────────────────────────────────────────────────────
let createPortal: any = null;
if (IS_WEB && typeof document !== 'undefined') {
  createPortal = require('react-dom').createPortal;
}

// ─── Cross-platform alert ─────────────────────────────────────────────────────
const showAlert = (title: string, message?: string) => {
  if (IS_WEB) {
    window.alert(`${title}${message ? `\n\n${message}` : ''}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

// ─── Method color map ─────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, [string, string]> = {
  GOOGLEPAY:     ['#4285f4', '#34a853'],
  GOOGLE_PAY:    ['#4285f4', '#34a853'],
  BANK:          ['#1e3a8a', '#3b82f6'],
  BANK_TRANSFER: ['#1e3a8a', '#3b82f6'],
  PAYPAL:        ['#003087', '#009cde'],
  UPI:           ['#6366f1', '#8b5cf6'],
};

const getMethodColors = (code: string): [string, string] =>
  METHOD_COLORS[code?.toUpperCase()] ?? ['#64748b', '#475569'];

// ═══════════════════════════════════════════════════════════════════════════════
// METHOD PICKER
// ═══════════════════════════════════════════════════════════════════════════════
function MethodPicker({
  selected, onSelect, colors,
}: {
  selected: PaymentMethod | null;
  onSelect: (m: PaymentMethod) => void;
  colors: any;
}) {
  const triggerRef = useRef<View>(null);
  const [open,    setOpen]    = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const { methods, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    usePaginatedPaymentMethods({ enabled: open });

  const openPicker = () => {
    if (IS_WEB) {
      const el   = triggerRef.current as any;
      const rect = el?.getBoundingClientRect?.();
      if (rect) {
        setDropPos({
          top:   rect.bottom + window.scrollY + 6,
          left:  rect.left   + window.scrollX,
          width: rect.width,
        });
      }
      setOpen(true);
      return;
    }
    triggerRef.current?.measure((_fx, _fy, width, height, px, py) => {
      const panelH    = Math.min(320, SCREEN_H * 0.45);
      const spaceBelow = SCREEN_H - py - height;
      const top = spaceBelow > panelH ? py + height + 6 : py - panelH - 6;
      setDropPos({ top, left: px, width });
      setOpen(true);
    });
  };

  // ── Drop panel ─────────────────────────────────────────────────────────────
  const Panel = (
    <View
      style={[
        mpSt.panel,
        { backgroundColor: colors.card, borderColor: colors.border },
        IS_WEB
          ? ({
              position: 'fixed',
              top: dropPos.top, left: dropPos.left, width: dropPos.width,
              zIndex: 99999,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            } as any)
          : { position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width },
      ]}
    >
      {isLoading ? (
        <View style={mpSt.center}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[mpSt.centerTxt, { color: colors.text2 }]}>Loading…</Text>
        </View>
      ) : methods.length === 0 ? (
        <View style={mpSt.center}>
          <Ionicons name="card-outline" size={IconSize.md} color={colors.text3} />
          <Text style={[mpSt.centerTxt, { color: colors.text3 }]}>No methods available</Text>
        </View>
      ) : (
        <FlatList
          data={methods}
          keyExtractor={m => m._id}
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ maxHeight: 300 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) => {
            const isSel  = selected?._id === item._id;
            const isLast = index === methods.length - 1;
            return (
              <TouchableOpacity
                style={[
                  mpSt.item,
                  isSel && { backgroundColor: colors.primaryDim },
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => { onSelect(item); setOpen(false); }}
                activeOpacity={0.75}
              >
                <LinearGradient colors={getMethodColors(item.code)} style={mpSt.itemIcon}>
                  <Text style={mpSt.itemIconTxt}>{item.name[0]?.toUpperCase()}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[mpSt.itemLabel, { color: isSel ? colors.primary : colors.text }]}>
                    {item.name}
                  </Text>
                  <Text style={[mpSt.itemSub, { color: colors.text3 }]}>
                    {item.fields.length} field{item.fields.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {isSel && (
                  <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ padding: Spacing[3], alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : hasNextPage ? (
              <TouchableOpacity
                style={{ padding: Spacing[3], alignItems: 'center' }}
                onPress={() => fetchNextPage()}
              >
                <Text style={{ fontSize: Typography.xs, fontWeight: '600', color: colors.primary }}>
                  Load more
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity
        ref={triggerRef as any}
        style={[
          mpSt.trigger,
          {
            backgroundColor: colors.surface,
            borderColor: open ? colors.primary : colors.border,
          },
        ]}
        onPress={openPicker}
        activeOpacity={0.75}
      >
        <View style={mpSt.triggerLeft}>
          {selected ? (
            <>
              <LinearGradient colors={getMethodColors(selected.code)} style={mpSt.triggerIcon}>
                <Text style={mpSt.triggerIconTxt}>{selected.name[0]?.toUpperCase()}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[mpSt.triggerLabel, { color: colors.text }]}>{selected.name}</Text>
                <Text style={[mpSt.triggerSub, { color: colors.text2 }]}>
                  {selected.fields.length} field{selected.fields.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[mpSt.placeholder, { color: colors.text3 }]}>
              Choose payment method
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={IconSize.xs}
          color={open ? colors.primary : colors.text2}
        />
      </TouchableOpacity>

      {/* Dropdown */}
      {IS_WEB ? (
        open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }}
              onClick={() => setOpen(false)}
            />
            {createPortal && createPortal(Panel, document.body)}
          </>
        )
      ) : (
        <Modal
          transparent visible={open} animationType="none"
          onRequestClose={() => setOpen(false)} statusBarTranslucent
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject} activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          {Panel}
        </Modal>
      )}
    </>
  );
}

const mpSt = StyleSheet.create({
  trigger: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical:   Spacing[3],
    borderRadius:      Radius.lg,
    borderWidth:       1,
    minHeight:         52,
  },
  triggerLeft:    { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing[3] },
  triggerIcon:    { width: IconBox.xs, height: IconBox.xs, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  triggerIconTxt: { fontSize: Typography.sm, fontWeight: '800', color: '#fff' },
  triggerLabel:   { fontSize: Typography.base, fontWeight: '600' },
  triggerSub:     { fontSize: Typography.xs, marginTop: 1 },
  placeholder:    { fontSize: Typography.base },

  panel:       { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  center:      { alignItems: 'center', justifyContent: 'center', gap: Spacing[2], padding: Spacing[5] },
  centerTxt:   { fontSize: Typography.sm },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], gap: Spacing[3] },
  itemIcon:    { width: IconBox.xs, height: IconBox.xs, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemIconTxt: { fontSize: Typography.xs, fontWeight: '800', color: '#fff' },
  itemLabel:   { fontSize: Typography.sm, fontWeight: '600' },
  itemSub:     { fontSize: Typography.xs, marginTop: 2 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC FIELD INPUT
// ═══════════════════════════════════════════════════════════════════════════════
function DynamicFieldInput({
  field, value, onChange, error, colors,
}: {
  field:    PaymentMethod['fields'][0];
  value:    string;
  onChange: (val: string) => void;
  error?:   string;
  colors:   any;
}) {
  const triggerRef = useRef<View>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [dropPos,    setDropPos]    = useState({ top: 0, left: 0, width: 0 });

  const openSelect = () => {
    if (IS_WEB) {
      const el   = triggerRef.current as any;
      const rect = el?.getBoundingClientRect?.();
      if (rect) {
        setDropPos({
          top:   rect.bottom + window.scrollY + 4,
          left:  rect.left   + window.scrollX,
          width: rect.width,
        });
      }
      setSelectOpen(true);
      return;
    }
    triggerRef.current?.measure((_fx, _fy, width, height, px, py) => {
      const panelH     = Math.min(200, (field.options?.length || 1) * 52 + 16);
      const spaceBelow = SCREEN_H - py - height;
      const top = spaceBelow > panelH ? py + height + 4 : py - panelH - 4;
      setDropPos({ top, left: px, width });
      setSelectOpen(true);
    });
  };

  // ── Select field ────────────────────────────────────────────────────────────
  if (field.fieldType === 'select') {
    const Panel = (
      <View
        style={[
          mpSt.panel,
          { backgroundColor: colors.card, borderColor: colors.border },
          IS_WEB
            ? ({
                position: 'fixed',
                top: dropPos.top, left: dropPos.left, width: dropPos.width,
                zIndex: 99999,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              } as any)
            : { position: 'absolute', top: dropPos.top, left: dropPos.left, width: dropPos.width },
        ]}
      >
        <FlatList
          data={field.options || []}
          keyExtractor={opt => opt}
          bounces={false}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: opt, index }) => {
            const isSel  = value === opt;
            const isLast = index === (field.options?.length || 0) - 1;
            return (
              <TouchableOpacity
                style={[
                  mpSt.item,
                  isSel && { backgroundColor: colors.primaryDim },
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => { onChange(opt); setSelectOpen(false); }}
                activeOpacity={0.75}
              >
                <Text style={[mpSt.itemLabel, { color: isSel ? colors.primary : colors.text, flex: 1 }]}>
                  {opt}
                </Text>
                {isSel && (
                  <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );

    return (
      <>
        <TouchableOpacity
          ref={triggerRef as any}
          style={[
            fiSt.input,
            {
              backgroundColor: colors.surface,
              borderColor: error ? colors.red : selectOpen ? colors.primary : colors.border,
              flexDirection: 'row', alignItems: 'center',
            },
          ]}
          onPress={openSelect}
          activeOpacity={0.75}
        >
          <Text style={[fiSt.inputTxt, { color: value ? colors.text : colors.text3, flex: 1 }]}>
            {value || field.placeholder || `Select ${field.fieldLabel}`}
          </Text>
          <Ionicons
            name={selectOpen ? 'chevron-up' : 'chevron-down'}
            size={IconSize.xs}
            color={selectOpen ? colors.primary : colors.text2}
          />
        </TouchableOpacity>

        {IS_WEB ? (
          selectOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'transparent' }}
                onClick={() => setSelectOpen(false)}
              />
              {createPortal && createPortal(Panel, document.body)}
            </>
          )
        ) : (
          <Modal
            transparent visible={selectOpen} animationType="none"
            onRequestClose={() => setSelectOpen(false)} statusBarTranslucent
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject} activeOpacity={1}
              onPress={() => setSelectOpen(false)}
            />
            {Panel}
          </Modal>
        )}
      </>
    );
  }

  // ── Text field ──────────────────────────────────────────────────────────────
  return (
    <TextInput
      style={[
        fiSt.input,
        {
          backgroundColor: colors.surface,
          borderColor:     error ? colors.red : colors.border,
          color:           colors.text,
        },
        IS_WEB && ({ outlineWidth: 0 } as any),
      ]}
      placeholder={field.placeholder || `Enter ${field.fieldLabel}`}
      placeholderTextColor={colors.text3}
      value={value}
      onChangeText={onChange}
      keyboardType={
        field.fieldType === 'number' ? 'numeric'      :
        field.fieldType === 'tel'    ? 'phone-pad'    :
        field.fieldType === 'email'  ? 'email-address':
        'default'
      }
      autoCapitalize={field.fieldType === 'email' ? 'none' : 'sentences'}
      autoCorrect={false}
      underlineColorAndroid="transparent"
    />
  );
}

const fiSt = StyleSheet.create({
  input: {
    paddingHorizontal: Spacing[4],
    paddingVertical:   Spacing[3],
    borderRadius:      Radius.lg,
    borderWidth:       1,
    fontSize:          Typography.sm,
    fontWeight:        '500',
    minHeight:         50,
  },
  inputTxt: { fontSize: Typography.sm, fontWeight: '500' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function AddPaymentMethodScreen() {
  const { colors, isDark } = useTheme();
  const router             = useRouter();
  const insets             = useSafeAreaInsets();

  const addMutation = useAddPaymentAccount();

  const [selectedMethod,  setSelectedMethod]  = useState<PaymentMethod | null>(null);
  const [label,           setLabel]           = useState('');
  const [fieldValues,     setFieldValues]     = useState<Record<string, string>>({});
  const [fieldErrors,     setFieldErrors]     = useState<Record<string, string>>({});
  const [isDefault,       setIsDefault]       = useState(false);
  const [success,         setSuccess]         = useState(false);

  const saving = addMutation.isPending;

  useEffect(() => {
    if (selectedMethod) {
      setFieldValues({});
      setFieldErrors({});
      setLabel(selectedMethod.name);
    }
  }, [selectedMethod]);

  const updateField = (key: string, val: string) => {
    setFieldValues(prev => ({ ...prev, [key]: val }));
    if (fieldErrors[key]) setFieldErrors(prev => ({ ...prev, [key]: '' }));
  };

  const sortedFields = useMemo(
    () => selectedMethod
      ? [...selectedMethod.fields].sort((a, b) => a.order - b.order)
      : [],
    [selectedMethod],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!selectedMethod) { showAlert('Please select a payment method'); return false; }
    if (!label.trim())   { showAlert('Please enter an account label');  return false; }
    const errors: Record<string, string> = {};
    for (const field of sortedFields) {
      const val = fieldValues[field.fieldKey]?.trim();
      if (field.isRequired && !val) {
        errors[field.fieldKey] = `${field.fieldLabel} is required`;
      } else if (field.fieldType === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[field.fieldKey] = 'Invalid email format';
      } else if (field.fieldType === 'tel' && val && !/^\+?[\d\s\-()]{7,15}$/.test(val)) {
        errors[field.fieldKey] = 'Invalid phone number';
      }
    }
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !selectedMethod) return;
    try {
      await addMutation.mutateAsync({
        paymentMethodId: selectedMethod._id,
        label: label.trim(),
        fieldValues,
        isDefault,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (e: any) {
      showAlert(
        'Save Failed',
        e?.response?.data?.message || e?.message || 'Failed to save payment account',
      );
    }
  };

  const canSave =
    !!selectedMethod &&
    !!label.trim() &&
    sortedFields.filter(f => f.isRequired).every(f => fieldValues[f.fieldKey]?.trim());

  // ── Step badge helper ───────────────────────────────────────────────────────
  const StepBadge = ({ n }: { n: number }) => (
    <View style={[s.stepBadge, { backgroundColor: colors.primaryDim }]}>
      <Text style={[s.stepBadgeTxt, { color: colors.primary }]}>{n}</Text>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />

      {/* ── Navbar (transparent) ─────────────────────────────────────────── */}
      <View
        style={[
          s.navbar,
          {
            paddingTop:        insets.top,
            borderBottomColor: colors.border,
            backgroundColor:   'transparent',
          },
        ]}
      >
        <View style={s.navbarInner}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={[s.iconBtn, {
              backgroundColor: colors.surface,
              borderColor:     colors.border,
              ...getShadow(isDark, 'sm'),
            }]}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
          </TouchableOpacity>

          <View style={s.titleBlock}>
            <Text style={[s.navTitle, { color: colors.text }]}>Add Payment Method</Text>
            <Text style={[s.navSub, { color: colors.text2 }]}>
              {selectedMethod ? selectedMethod.name : 'Select a method to continue'}
            </Text>
          </View>

          {/* spacer so title stays centred */}
          <View style={{ width: IconBox.sm }} />
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success banner */}
          {success && (
            <View style={[s.successBanner, {
              backgroundColor: colors.greenDim,
              borderColor:     colors.greenBorder,
            }]}>
              <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.green} />
              <Text style={[s.successTxt, { color: colors.text }]}>
                Payment account added successfully!
              </Text>
            </View>
          )}

          {/* ── Step 1: Select Method ───────────────────────────────────── */}
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <StepBadge n={1} />
              <Text style={[s.cardTitle, { color: colors.text }]}>Select Payment Method</Text>
            </View>
            <MethodPicker
              selected={selectedMethod}
              onSelect={setSelectedMethod}
              colors={colors}
            />
          </View>

          {/* ── Step 2: Label ───────────────────────────────────────────── */}
          {selectedMethod && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.cardHeader}>
                <StepBadge n={2} />
                <Text style={[s.cardTitle, { color: colors.text }]}>Account Label</Text>
              </View>
              <TextInput
                style={[
                  fiSt.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor:     colors.border,
                    color:           colors.text,
                  },
                  IS_WEB && ({ outlineWidth: 0 } as any),
                ]}
                placeholder="e.g. My Google Pay, Personal Bank"
                placeholderTextColor={colors.text3}
                value={label}
                onChangeText={setLabel}
                underlineColorAndroid="transparent"
              />
              <Text style={[s.hint, { color: colors.text3 }]}>
                A nickname to identify this account
              </Text>
            </View>
          )}

          {/* ── Step 3: Account Details ─────────────────────────────────── */}
          {selectedMethod && sortedFields.length > 0 && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.cardHeader}>
                <StepBadge n={3} />
                <Text style={[s.cardTitle, { color: colors.text }]}>Account Details</Text>
              </View>

              {sortedFields.map((field, idx) => (
                <View
                  key={field.fieldKey}
                  style={[
                    s.fieldGroup,
                    idx < sortedFields.length - 1 && {
                      borderBottomWidth:  StyleSheet.hairlineWidth,
                      borderBottomColor:  colors.border,
                    },
                  ]}
                >
                  {/* Field label row */}
                  <View style={s.fieldLabelRow}>
                    <Text style={[s.fieldLabel, { color: colors.text2 }]}>
                      {field.fieldLabel}
                    </Text>
                    {field.isRequired ? (
                      <Text style={[s.requiredStar, { color: colors.red }]}>*</Text>
                    ) : (
                      <Text style={[s.optionalTag, {
                        backgroundColor: colors.surface,
                        color:           colors.text3,
                      }]}>
                        Optional
                      </Text>
                    )}
                  </View>

                  <DynamicFieldInput
                    field={field}
                    value={fieldValues[field.fieldKey] || ''}
                    onChange={val => updateField(field.fieldKey, val)}
                    error={fieldErrors[field.fieldKey]}
                    colors={colors}
                  />

                  {fieldErrors[field.fieldKey] && (
                    <View style={s.errorRow}>
                      <Ionicons name="alert-circle-outline" size={IconSize.xs} color={colors.red} />
                      <Text style={[s.errorTxt, { color: colors.red }]}>
                        {fieldErrors[field.fieldKey]}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── Set as Default ──────────────────────────────────────────── */}
          {selectedMethod && (
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={s.defaultRow}
                onPress={() => setIsDefault(v => !v)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, paddingRight: Spacing[4] }}>
                  <Text style={[s.defaultTitle, { color: colors.text }]}>Set as Default</Text>
                  <Text style={[s.defaultSub, { color: colors.text2 }]}>
                    Use this account by default for transactions
                  </Text>
                </View>
                {/* Toggle */}
                <View style={[
                  s.track,
                  { backgroundColor: isDefault ? colors.primary : colors.border },
                ]}>
                  <View style={[s.thumb, isDefault && s.thumbOn]} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Save button ─────────────────────────────────────────────── */}
          {selectedMethod && (
            <TouchableOpacity
              style={[s.saveBtn, (!canSave || saving || success) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!canSave || saving || success}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  success
                    ? [colors.green, isDark ? '#0FAE72' : '#22C58B']
                    : colors.primaryGradient as [string, string]
                }
                style={s.saveBtnInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : success ? (
                  <>
                    <Ionicons name="checkmark-circle" size={IconSize.sm} color="#fff" />
                    <Text style={s.saveTxt}>Saved!</Text>
                  </>
                ) : (
                  <Text style={s.saveTxt}>Save Payment Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Navbar ─────────────────────────────────────────────────────────────────
  navbar: { borderBottomWidth: StyleSheet.hairlineWidth },
  navbarInner: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom:     Spacing[3],
    minHeight:         56,
  },
  iconBtn: {
    width:          IconBox.sm,
    height:         IconBox.sm,
    borderRadius:   IconBox.sm / 2,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  navTitle:   { fontSize: Typography.base, fontWeight: '700' },
  navSub:     { fontSize: Typography.xs, marginTop: 1 },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: { padding: Spacing[4], paddingBottom: Spacing[10], gap: Spacing[3] },

  // ── Success banner ─────────────────────────────────────────────────────────
  successBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing[2], borderRadius: Radius.lg,
    padding: Spacing[4], borderWidth: 1,
  },
  successTxt: { fontSize: Typography.sm, fontWeight: '600', flex: 1 },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    borderRadius:    Radius.xl,
    padding:         Spacing[4],
    borderWidth:     1,
    gap:             Spacing[3],
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  stepBadge: {
    width:          26,
    height:         26,
    borderRadius:   13,
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepBadgeTxt: { fontSize: Typography.xs, fontWeight: '800' },
  cardTitle:    { fontSize: Typography.base, fontWeight: '700' },
  hint:         { fontSize: Typography.xs },

  // ── Fields ─────────────────────────────────────────────────────────────────
  fieldGroup: {
    gap:           Spacing[2],
    paddingBottom: Spacing[4],
    marginBottom:  Spacing[4],
  },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  fieldLabel:    { fontSize: Typography.sm, fontWeight: '600' },
  requiredStar:  { fontSize: Typography.sm, fontWeight: '700' },
  optionalTag: {
    fontSize:          Typography.xs,
    paddingHorizontal: Spacing[2],
    paddingVertical:   2,
    borderRadius:      Radius.sm,
    fontWeight:        '600',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  errorTxt:  { fontSize: Typography.xs, fontWeight: '500' },

  // ── Default toggle ─────────────────────────────────────────────────────────
  defaultRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  defaultTitle: { fontSize: Typography.sm, fontWeight: '700' },
  defaultSub:   { fontSize: Typography.xs, marginTop: 2 },
  track: {
    width:          44,
    height:         26,
    borderRadius:   13,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  thumbOn:  { alignSelf: 'flex-end' },

  // ── Save button ────────────────────────────────────────────────────────────
  saveBtn:      { borderRadius: Radius.xl, overflow: 'hidden', height: 52 },
  saveBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], width: '100%', height: '100%',
  },
  saveTxt: { fontSize: Typography.base, fontWeight: '700', color: '#FFF' },
});