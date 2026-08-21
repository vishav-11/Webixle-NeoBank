/**
 * CreateCardModal.tsx
 * Apply flow: choose Virtual or Physical → fill details → create card.
 *
 * - Virtual card: minimal form (just phone)
 * - Physical card: full billing + postal address
 * - If user already has a virtual card, Virtual option is disabled (and vice versa)
 * - No react-native-reanimated dependency
 */

import React, { useCallback, useState } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  CreditCard,
  Smartphone,
  MapPin,
  Phone,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import type { ColorScheme } from '@/styles/theme';
import type { NormalizedCard, CreateCardPayload, CardType } from '@/types/cardTypes';

interface Props {
  visible:        boolean;
  onClose:        () => void;
  onSuccess:      () => void;
  existingCards:  NormalizedCard[];
  createCard:     (payload: CreateCardPayload) => Promise<boolean>;
  colors:         ColorScheme;
}

type Step = 'choose_type' | 'fill_form' | 'success' | 'error';

interface FormState {
  dialCode:    string;
  phoneNumber: string;
  // Billing
  billAddress:  string;
  billCity:     string;
  billCountry:  string;
  billPostCode: string;
  // Postal (physical only)
  postAddress:  string;
  postCity:     string;
  postCountry:  string;
  postPostCode: string;
  postState:    string;
}

const DEFAULT_FORM: FormState = {
  dialCode: '+1', phoneNumber: '',
  billAddress: '', billCity: '', billCountry: '', billPostCode: '',
  postAddress: '', postCity: '', postCountry: '', postPostCode: '', postState: '',
};

// ─── Input Row ────────────────────────────────────────────────────────────────
function InputRow({
  label, value, onChange, placeholder, keyboardType, colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  colors: ColorScheme;
}) {
  return (
    <View style={f.inputGroup}>
      <Text style={[f.inputLabel, { color: colors.text2 }]}>{label}</Text>
      <TextInput
        style={[
          f.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.text3}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function CreateCardModal({
  visible, onClose, onSuccess, existingCards, createCard, colors,
}: Props) {
  const [step,     setStep]     = useState<Step>('choose_type');
  const [cardType, setCardType] = useState<CardType>('virtual');
  const [form,     setForm]     = useState<FormState>(DEFAULT_FORM);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasVirtual  = existingCards.some(c => c.type === 'virtual');
  const hasPhysical = existingCards.some(c => c.type === 'physical');

  const updateForm = useCallback((key: keyof FormState, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleClose = useCallback(() => {
    setStep('choose_type');
    setForm(DEFAULT_FORM);
    setErrorMsg('');
    setLoading(false);
    onClose();
  }, [onClose]);

  const handleChooseType = useCallback((type: CardType) => {
    setCardType(type);
    setStep('fill_form');
    setErrorMsg('');
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!form.phoneNumber.trim()) {
      setErrorMsg('Phone number is required.');
      return;
    }
    if (
      !form.billAddress.trim() ||
      !form.billCity.trim() ||
      !form.billCountry.trim() ||
      !form.billPostCode.trim()
    ) {
      setErrorMsg('All billing address fields are required.');
      return;
    }
    if (cardType === 'physical') {
      if (
        !form.postAddress.trim() ||
        !form.postCity.trim() ||
        !form.postCountry.trim() ||
        !form.postPostCode.trim() ||
        !form.postState.trim()
      ) {
        setErrorMsg('All postal address fields are required for physical card.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    const payload: CreateCardPayload = {
      type:        cardType,
      dialCode:    form.dialCode,
      phoneNumber: form.phoneNumber.trim(),
      billingAddress: {
        address:     form.billAddress.trim(),
        countryCode: form.billCountry.trim().toUpperCase(),
        city:        form.billCity.trim(),
        postCode:    form.billPostCode.trim(),
      },
      postalAddress: {
        address:
          cardType === 'physical'
            ? form.postAddress.trim()
            : form.billAddress.trim(),
        countryCode:
          cardType === 'physical'
            ? form.postCountry.trim().toUpperCase()
            : form.billCountry.trim().toUpperCase(),
        city:
          cardType === 'physical' ? form.postCity.trim() : form.billCity.trim(),
        postCode:
          cardType === 'physical'
            ? form.postPostCode.trim()
            : form.billPostCode.trim(),
        state: cardType === 'physical' ? form.postState.trim() : '',
      },
    };

    try {
      const ok = await createCard(payload);
      if (ok) {
        setStep('success');
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 1800);
      } else {
        setStep('error');
        setErrorMsg('Card creation failed. Please try again.');
      }
    } catch (err: any) {
      setStep('error');
      setErrorMsg(
        err?.response?.data?.msg ?? err?.message ?? 'Card creation failed.'
      );
    } finally {
      setLoading(false);
    }
  }, [form, cardType, createCard, handleClose, onSuccess]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[m.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={m.kav}
        >
          <View
            style={[
              m.sheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {/* Handle */}
            <View style={[m.handle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={[m.header, { borderBottomColor: colors.borderSoft }]}>
              {step === 'fill_form' && (
                <TouchableOpacity
                  style={[m.iconBtn, { backgroundColor: colors.card }]}
                  onPress={() => setStep('choose_type')}
                >
                  <ChevronLeft size={18} color={colors.green} />
                </TouchableOpacity>
              )}
              <Text style={[m.title, { color: colors.text }]}>
                {step === 'choose_type'
                  ? 'Apply for a Card'
                  : step === 'fill_form'
                    ? `${cardType === 'virtual' ? 'Virtual' : 'Physical'} Card Details`
                    : step === 'success'
                      ? 'Card Applied!'
                      : 'Application Failed'}
              </Text>
              <TouchableOpacity
                style={[m.iconBtn, { backgroundColor: colors.card }]}
                onPress={handleClose}
                disabled={loading}
              >
                <X size={18} color={colors.text2} />
              </TouchableOpacity>
            </View>

            {/* ── STEP: Choose Type ── */}
            {step === 'choose_type' && (
              <ScrollView
                contentContainerStyle={m.body}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[m.subtitle, { color: colors.text2 }]}>
                  Choose the card type you want to apply for.
                </Text>

                {/* Virtual Card Option */}
                <TouchableOpacity
                  style={[
                    m.typeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hasVirtual ? colors.border : colors.greenBorder,
                    },
                    hasVirtual && { opacity: 0.45 },
                  ]}
                  onPress={() => !hasVirtual && handleChooseType('virtual')}
                  activeOpacity={hasVirtual ? 1 : 0.8}
                  disabled={hasVirtual}
                >
                  <View
                    style={[m.typeIconWrap, { backgroundColor: colors.greenDim }]}
                  >
                    <Smartphone size={28} color={colors.green} />
                  </View>
                  <View style={m.typeInfo}>
                    <Text style={[m.typeTitle, { color: colors.text }]}>
                      Virtual Card
                    </Text>
                    <Text style={[m.typeSub, { color: colors.text2 }]}>
                      Instant issuance • Use online & in-app
                    </Text>
                    {hasVirtual && (
                      <Text style={[m.typeTag, { color: colors.green }]}>
                        Already active
                      </Text>
                    )}
                  </View>
                  {!hasVirtual && (
                    <ChevronLeft
                      size={18}
                      color={colors.text3}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  )}
                  {hasVirtual && <CheckCircle size={18} color={colors.green} />}
                </TouchableOpacity>

                {/* Physical Card Option */}
                <TouchableOpacity
                  style={[
                    m.typeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hasPhysical ? colors.border : colors.greenBorder,
                    },
                    hasPhysical && { opacity: 0.45 },
                  ]}
                  onPress={() => !hasPhysical && handleChooseType('physical')}
                  activeOpacity={hasPhysical ? 1 : 0.8}
                  disabled={hasPhysical}
                >
                  <View
                    style={[m.typeIconWrap, { backgroundColor: colors.blueDim }]}
                  >
                    <CreditCard size={28} color={colors.blue} />
                  </View>
                  <View style={m.typeInfo}>
                    <Text style={[m.typeTitle, { color: colors.text }]}>
                      Physical Card
                    </Text>
                    <Text style={[m.typeSub, { color: colors.text2 }]}>
                      Delivered to your address • Use anywhere
                    </Text>
                    {hasPhysical && (
                      <Text style={[m.typeTag, { color: colors.green }]}>
                        Already active
                      </Text>
                    )}
                  </View>
                  {!hasPhysical && (
                    <ChevronLeft
                      size={18}
                      color={colors.text3}
                      style={{ transform: [{ rotate: '180deg' }] }}
                    />
                  )}
                  {hasPhysical && <CheckCircle size={18} color={colors.green} />}
                </TouchableOpacity>

                {hasVirtual && hasPhysical && (
                  <View
                    style={[
                      m.allActiveBox,
                      {
                        backgroundColor: colors.greenDim,
                        borderColor: colors.greenBorder,
                      },
                    ]}
                  >
                    <CheckCircle size={16} color={colors.green} />
                    <Text style={[m.allActiveTxt, { color: colors.green }]}>
                      You already have both card types active.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* ── STEP: Fill Form ── */}
            {step === 'fill_form' && (
              <ScrollView
                contentContainerStyle={m.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Phone */}
                <Text style={[m.sectionHeader, { color: colors.text }]}>
                  <Phone size={14} color={colors.text} /> Contact Info
                </Text>

                <View style={f.row}>
                  <View style={{ width: 80 }}>
                    <InputRow
                      label="Dial"
                      value={form.dialCode}
                      onChange={v => updateForm('dialCode', v)}
                      placeholder="+1"
                      keyboardType="phone-pad"
                      colors={colors}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputRow
                      label="Phone Number"
                      value={form.phoneNumber}
                      onChange={v => updateForm('phoneNumber', v)}
                      placeholder="9876543210"
                      keyboardType="phone-pad"
                      colors={colors}
                    />
                  </View>
                </View>

                {/* Billing Address */}
                <Text style={[m.sectionHeader, { color: colors.text, marginTop: 8 }]}>
                  <MapPin size={14} color={colors.text} /> Billing Address
                </Text>

                <InputRow
                  label="Address"
                  value={form.billAddress}
                  onChange={v => updateForm('billAddress', v)}
                  placeholder="123 Main St"
                  colors={colors}
                />
                <InputRow
                  label="City"
                  value={form.billCity}
                  onChange={v => updateForm('billCity', v)}
                  placeholder="New York"
                  colors={colors}
                />
                <InputRow
                  label="Country Code"
                  value={form.billCountry}
                  onChange={v => updateForm('billCountry', v)}
                  placeholder="US"
                  colors={colors}
                />
                <InputRow
                  label="Post Code"
                  value={form.billPostCode}
                  onChange={v => updateForm('billPostCode', v)}
                  placeholder="10001"
                  keyboardType="numeric"
                  colors={colors}
                />

                {/* Postal Address (physical only) */}
                {cardType === 'physical' && (
                  <>
                    <Text
                      style={[m.sectionHeader, { color: colors.text, marginTop: 8 }]}
                    >
                      <MapPin size={14} color={colors.blue} /> Delivery Address
                    </Text>
                    <InputRow
                      label="Address"
                      value={form.postAddress}
                      onChange={v => updateForm('postAddress', v)}
                      placeholder="123 Main St"
                      colors={colors}
                    />
                    <InputRow
                      label="City"
                      value={form.postCity}
                      onChange={v => updateForm('postCity', v)}
                      placeholder="New York"
                      colors={colors}
                    />
                    <InputRow
                      label="State"
                      value={form.postState}
                      onChange={v => updateForm('postState', v)}
                      placeholder="NY"
                      colors={colors}
                    />
                    <InputRow
                      label="Country Code"
                      value={form.postCountry}
                      onChange={v => updateForm('postCountry', v)}
                      placeholder="US"
                      colors={colors}
                    />
                    <InputRow
                      label="Post Code"
                      value={form.postPostCode}
                      onChange={v => updateForm('postPostCode', v)}
                      placeholder="10001"
                      keyboardType="numeric"
                      colors={colors}
                    />
                  </>
                )}

                {/* Error */}
                {!!errorMsg && (
                  <View
                    style={[
                      m.errorBox,
                      {
                        backgroundColor: colors.redDim,
                        borderColor: colors.red + '44',
                      },
                    ]}
                  >
                    <AlertCircle size={15} color={colors.red} />
                    <Text style={[m.errorTxt, { color: colors.red }]}>
                      {errorMsg}
                    </Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[
                    m.submitBtn,
                    { backgroundColor: colors.green },
                    loading && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={m.submitTxt}>
                      Apply for {cardType === 'virtual' ? 'Virtual' : 'Physical'} Card
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* ── STEP: Success ── */}
            {step === 'success' && (
              <View style={m.resultWrap}>
                <View
                  style={[
                    m.resultCircle,
                    {
                      backgroundColor: colors.greenDim,
                      borderColor: colors.green,
                    },
                  ]}
                >
                  <CheckCircle size={40} color={colors.green} />
                </View>
                <Text style={[m.resultTitle, { color: colors.text }]}>
                  Application Submitted!
                </Text>
                <Text style={[m.resultSub, { color: colors.text2 }]}>
                  Your {cardType} card application is being processed.
                </Text>
              </View>
            )}

            {/* ── STEP: Error ── */}
            {step === 'error' && (
              <View style={m.resultWrap}>
                <View
                  style={[
                    m.resultCircle,
                    { backgroundColor: colors.redDim, borderColor: colors.red },
                  ]}
                >
                  <AlertCircle size={40} color={colors.red} />
                </View>
                <Text style={[m.resultTitle, { color: colors.text }]}>
                  Application Failed
                </Text>
                <Text style={[m.resultSub, { color: colors.red }]}>{errorMsg}</Text>
                <TouchableOpacity
                  style={[
                    m.submitBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                      marginTop: 20,
                    },
                  ]}
                  onPress={() => {
                    setStep('fill_form');
                    setErrorMsg('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[m.submitTxt, { color: colors.text }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Modal styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  kav:     { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    borderWidth:          1,
    borderBottomWidth:    0,
    maxHeight:            '92%',
    ...Platform.select({
      ios: {
        shadowColor:  '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius:  16,
      },
      android: { elevation: 12 },
    }),
  },
  handle: {
    width:        36,
    height:       4,
    borderRadius: 2,
    alignSelf:    'center',
    marginTop:    10,
    marginBottom: 4,
  },
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  iconBtn: {
    width:         34,
    height:        34,
    borderRadius:  17,
    alignItems:    'center',
    justifyContent: 'center',
  },

  body:     { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  // Type selection cards
  typeCard: {
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  16,
    borderWidth:   1.5,
    padding:       16,
    marginBottom:  14,
    gap:           14,
  },
  typeIconWrap: {
    width:         52,
    height:        52,
    borderRadius:  14,
    alignItems:    'center',
    justifyContent: 'center',
  },
  typeInfo:  { flex: 1 },
  typeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  typeSub:   { fontSize: 13, lineHeight: 18 },
  typeTag:   { fontSize: 12, fontWeight: '600', marginTop: 4 },

  allActiveBox: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    padding:       14,
    borderRadius:  12,
    borderWidth:   1,
    marginTop:     4,
  },
  allActiveTxt: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Form section header
  sectionHeader: {
    fontSize:      14,
    fontWeight:    '700',
    marginBottom:  12,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },

  // Error box
  errorBox: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
    padding:       12,
    borderRadius:  10,
    borderWidth:   1,
    marginBottom:  16,
  },
  errorTxt: { flex: 1, fontSize: 13 },

  // Submit button
  submitBtn: {
    paddingVertical: 15,
    borderRadius:    14,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       8,
  },
  submitTxt: { fontSize: 15, fontWeight: '700', color: '#000' },

  // Result states
  resultWrap: { padding: 32, alignItems: 'center', gap: 12 },
  resultCircle: {
    width:         80,
    height:        80,
    borderRadius:  40,
    borderWidth:   2,
    alignItems:    'center',
    justifyContent: 'center',
    marginBottom:  8,
  },
  resultTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  resultSub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

// ─── Form field styles ─────────────────────────────────────────────────────────
const f = StyleSheet.create({
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: {
    height:           46,
    borderWidth:      1,
    borderRadius:     11,
    paddingHorizontal: 14,
    fontSize:         14,
  },
  row: { flexDirection: 'row', gap: 10 },
});