// CardModule/screens/KycFormScreen.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useProfile } from '@/hooks/queires';
import { useSubmitAccountKyc, useUploadKycFiles } from '../hooks';
import { ID_TYPES, ACCOUNT_PURPOSE_OPTIONS } from '../constants';
import type { SubmitAccountKycPayload } from '../types';

// ✅ Import components
import OccupationPickerModal from '../components/OccupationPickerModal';
import FileUploadOptionsModal from '../components/FileUploadOptionsModal';
import DatePickerModal from '../components/DatePickerModal';

// ═══════════════════════════════════════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════════════════════════════════════

interface Occupation { code: string; title: string }

const STEPS = [
  { id: 'personal',  label: 'Personal',  icon: 'person-outline' as const },
  { id: 'financial', label: 'Financial', icon: 'briefcase-outline' as const },
  { id: 'document',  label: 'Document',  icon: 'card-outline' as const },
  { id: 'address',   label: 'Address',   icon: 'home-outline' as const },
  { id: 'review',    label: 'Review',    icon: 'checkmark-done-outline' as const },
] as const;

function stripPlus(code: string): string {
  return (code ?? '').replace(/^\+/, '').trim();
}

function parseDob(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.split('T')[0];
}

function safeStr(val: any): string {
  if (!val || val === 'null') return '';
  return String(val).trim();
}

// ✅ Date formatting helper
function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      .toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function StepIndicator({ current, colors }: { current: number; colors: any }) {
  return (
    <View style={ST.row}>
      {STEPS.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.id}>
            <View style={ST.item}>
              <View style={[
                ST.circle,
                {
                  backgroundColor: done || active ? colors.primary : colors.cardHover,
                  borderColor:     done || active ? colors.primary : colors.border,
                },
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color="#fff" />
                  : <Ionicons name={s.icon} size={12} color={active ? '#fff' : colors.text2} />}
              </View>
              <Text style={[
                ST.label,
                { color: active ? colors.primary : done ? colors.text : colors.text2 },
              ]}>
                {s.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[
                ST.line,
                { backgroundColor: i < current ? colors.primary : colors.borderSoft },
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType,
  editable = true, hint, error, maxLength,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; keyboardType?: any; editable?: boolean;
  hint?: string; error?: string; maxLength?: number;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={FD.wrap}>
      <Text style={[FD.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.text3 + '80'}
        keyboardType={keyboardType ?? 'default'}
        editable={editable}
        maxLength={maxLength}
        style={[
          FD.input,
          {
            color:           colors.text,
            backgroundColor: editable ? colors.card : colors.cardHover,
            borderColor:     error ? colors.red : focused ? colors.primary : colors.border,
            opacity:         editable ? 1 : 0.6,
          },
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error && <Text style={[FD.error, { color: colors.red }]}>{error}</Text>}
      {hint && !error && <Text style={[FD.hint, { color: colors.text2 }]}>{hint}</Text>}
    </View>
  );
}

// ✅ New DateField Component
function DateField({
  label, value, onChange, placeholder, hint, error, minDate, maxDate,
}: {
  label: string; value: string; onChange: (date: string) => void;
  placeholder?: string; hint?: string; error?: string;
  minDate?: Date; maxDate?: Date;
}) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={FD.wrap}>
      <Text style={[FD.label, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <View style={[
          FD.input,
          FD.dateInput,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.red : colors.border,
          },
        ]}>
          <Text style={[
            FD.dateText,
            { color: value ? colors.text : colors.text3 },
          ]}>
            {value ? formatDisplayDate(value) : placeholder || `Select ${label.toLowerCase()}`}
          </Text>
          <Ionicons name="calendar-outline" size={16} color={colors.text3} />
        </View>
      </TouchableOpacity>
      {error && <Text style={[FD.error, { color: colors.red }]}>{error}</Text>}
      {hint && !error && <Text style={[FD.hint, { color: colors.text2 }]}>{hint}</Text>}
      
      <DatePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(date) => {
          onChange(date);
          setShowPicker(false);
        }}
        value={value}
        title={`Select ${label}`}
        minDate={minDate}
        maxDate={maxDate}
      />
    </View>
  );
}

function PickerRow({
  label, value, options, onSelect, error,
}: {
  label: string; value: string;
  options: { label: string; value: string }[];
  onSelect: (v: string) => void; error?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={FD.wrap}>
      <Text style={[FD.label, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[
                FD.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor:     active ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{
                color: active ? '#fff' : colors.text,
                fontSize: Typography.xs,
                fontWeight: '600',
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {error && <Text style={[FD.error, { color: colors.red }]}>{error}</Text>}
    </View>
  );
}

function DocUpload({
  label, uri, onPick, uploading, done, colors,
}: {
  label: string; uri?: string; onPick: () => void;
  uploading?: boolean; done?: boolean; colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        DU.tile,
        {
          backgroundColor: colors.card,
          borderColor:  done ? colors.green : colors.border,
          borderStyle:  uri ? 'solid' : 'dashed',
        },
      ]}
      onPress={onPick}
      activeOpacity={0.8}
      disabled={uploading}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={DU.image} resizeMode="cover" />
          {done && (
            <View style={[DU.checkBadge, { backgroundColor: colors.green }]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
        </>
      ) : (
        <Ionicons name="camera-outline" size={28} color={colors.text2} />
      )}
      {uploading && (
        <View style={DU.overlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
      <View style={[DU.labelBadge, { backgroundColor: done ? colors.green : 'rgba(0,0,0,0.6)' }]}>
        <Text style={DU.labelText} numberOfLines={1}>
          {uploading ? 'Uploading...' : label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ReviewRow({ label, value, colors, last }: {
  label: string; value: string; colors: any; last?: boolean;
}) {
  return (
    <View style={[
      RV.row,
      { borderBottomColor: colors.borderSoft },
      last && { borderBottomWidth: 0 },
    ]}>
      <Text style={[RV.label, { color: colors.text2 }]}>{label}</Text>
      <Text style={[RV.value, { color: colors.text }]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function ReviewSection({
  title, icon, onEdit, colors, children,
}: {
  title: string; icon: any; onEdit: () => void; colors: any; children: React.ReactNode;
}) {
  return (
    <View style={[RV.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[RV.sectionHeader, { borderBottomColor: colors.borderSoft }]}>
        <Ionicons name={icon} size={15} color={colors.primary} />
        <Text style={[RV.sectionTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={onEdit} hitSlop={8}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Edit</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════

interface Props {
  onBack: () => void;
  onSubmitted: () => void;
}

export default function KycFormScreen({ onBack, onSubmitted }: Props) {
  const { colors } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout();
  const { data: profile } = useProfile();
  const uploadFiles = useUploadKycFiles();
  const submitKyc = useSubmitAccountKyc();
  const scrollRef = useRef<ScrollView>(null);

  const prof = profile as any;

  const [currentStep, setCurrentStep] = useState(0);

  // Personal
  const [firstName, setFirstName] = useState(safeStr(prof?.firstName));
  const [lastName, setLastName] = useState(safeStr(prof?.lastName));
  const [dateOfBirth, setDateOfBirth] = useState(parseDob(prof?.DOB ?? prof?.dateOfBirth));
  const [gender, setGender] = useState<'M' | 'F'>(prof?.gender === 'F' ? 'F' : 'M');
  const [nationality, setNationality] = useState(safeStr(prof?.nationality ?? prof?.country));
  const [phoneCountryCode, setPhoneCountryCode] = useState(stripPlus(safeStr(prof?.mobileCode)));
  const [phoneNumber, setPhoneNumber] = useState(safeStr(prof?.mobileNo ?? prof?.phone));

  // Financial
  const [selectedOccupation, setSelectedOccupation] = useState<Occupation | null>(null);
  const [occupationPickerVisible, setOccupationPickerVisible] = useState(false);
  const [annualSalary, setAnnualSalary] = useState('');
  const [accountPurpose, setAccountPurpose] = useState(ACCOUNT_PURPOSE_OPTIONS[0].value);
  const [expectedMonthlyVolume, setExpectedMonthlyVolume] = useState('');
  const [sourceType] = useState('api');

  // Document
  const [nationalId, setNationalId] = useState('');
  const [idType, setIdType] = useState(ID_TYPES[0].value);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [idFront, setIdFront] = useState<{ uri: string; fileId?: string } | null>(null);
  const [idBack, setIdBack] = useState<{ uri: string; fileId?: string } | null>(null);
  const [selfie, setSelfie] = useState<{ uri: string; fileId?: string } | null>(null);
  const [uploadingKey, setUploadingKey] = useState<'front' | 'back' | 'selfie' | null>(null);
  
  // ✅ File upload modal state
  const [fileUploadModal, setFileUploadModal] = useState<{
    visible: boolean;
    type: 'front' | 'back' | 'selfie' | null;
  }>({ visible: false, type: null });

  // Address
  const [addressLine1, setAddressLine1] = useState(
    typeof prof?.address === 'string' ? safeStr(prof.address) : safeStr(prof?.address?.addressLine1)
  );
  const [city, setCity] = useState(safeStr(prof?.address?.city));
  const [stateVal, setStateVal] = useState(safeStr(prof?.address?.state));
  const [country, setCountry] = useState(safeStr(prof?.address?.country ?? prof?.country));
  const [postalCode, setPostalCode] = useState(safeStr(prof?.address?.postalCode));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const needsBack = idType !== 'PASSPORT';

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setErrors({});
    setGlobalError(null);
  }, [currentStep]);

  // ✅ Updated file picker with camera/gallery options
  const pickFromCamera = useCallback(async (kind: 'front' | 'back' | 'selfie') => {
    const setter = kind === 'front' ? setIdFront : kind === 'back' ? setIdBack : setSelfie;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: false,
      cameraType: kind === 'selfie' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setter({ uri: asset.uri });
    setUploadingKey(kind);

    try {
      const uploaded = await uploadFiles.mutateAsync([
        { uri: asset.uri, name: `${kind}.jpg`, type: 'image/jpeg' },
      ]);
      setter({ uri: asset.uri, fileId: uploaded?.[0]?.id });
    } catch (err: any) {
      setter(null);
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setUploadingKey(null);
    }
  }, [uploadFiles]);

  const pickFromGallery = useCallback(async (kind: 'front' | 'back' | 'selfie') => {
    const setter = kind === 'front' ? setIdFront : kind === 'back' ? setIdBack : setSelfie;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setter({ uri: asset.uri });
    setUploadingKey(kind);

    try {
      const uploaded = await uploadFiles.mutateAsync([
        { uri: asset.uri, name: `${kind}.jpg`, type: 'image/jpeg' },
      ]);
      setter({ uri: asset.uri, fileId: uploaded?.[0]?.id });
    } catch (err: any) {
      setter(null);
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setUploadingKey(null);
    }
  }, [uploadFiles]);

  const pickAndUpload = useCallback(async (kind: 'front' | 'back' | 'selfie') => {
    const setter = kind === 'front' ? setIdFront : kind === 'back' ? setIdBack : setSelfie;

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file: File = e.target.files[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        setter({ uri });
        setUploadingKey(kind);
        try {
          const uploaded = await uploadFiles.mutateAsync([{ uri, name: file.name, type: file.type }]);
          setter({ uri, fileId: uploaded?.[0]?.id });
        } catch (err: any) {
          setter(null);
          Alert.alert('Upload failed', err?.message ?? 'Please try again.');
        } finally {
          setUploadingKey(null);
        }
      };
      input.click();
      return;
    }

    // ✅ Mobile: Show options modal
    setFileUploadModal({ visible: true, type: kind });
  }, [uploadFiles]);

  // Validation
  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!firstName.trim()) e.firstName = 'First name is required';
      if (!lastName.trim()) e.lastName = 'Last name is required';
      if (!dateOfBirth.trim()) e.dateOfBirth = 'Date of birth is required';
      if (!nationality.trim()) e.nationality = 'Nationality required (2-letter code)';
      if (!phoneCountryCode.trim()) e.phoneCountryCode = 'Country code required';
      if (!phoneNumber.trim()) e.phoneNumber = 'Phone number required';
    }
    if (step === 1) {
      if (!selectedOccupation) e.occupation = 'Please select occupation';
      if (!annualSalary.trim()) e.annualSalary = 'Annual salary required';
      if (!expectedMonthlyVolume.trim()) e.expectedMonthlyVolume = 'Monthly volume required';
    }
    if (step === 2) {
      if (!nationalId.trim()) e.nationalId = 'Document number required';
      if (!issueDate.trim()) e.issueDate = 'Issue date is required';
      if (!expiryDate.trim()) e.expiryDate = 'Expiry date is required';
      if (!idFront?.fileId) e.idFront = 'Please upload front of document';
      if (needsBack && !idBack?.fileId) e.idBack = 'Please upload back of document';
      if (!selfie?.fileId) e.selfie = 'Please upload selfie';
    }
    if (step === 3) {
      if (!addressLine1.trim()) e.addressLine1 = 'Address required';
      if (!city.trim()) e.city = 'City required';
      if (!stateVal.trim()) e.stateVal = 'State required';
      if (!country.trim()) e.country = 'Country required (2-letter code)';
      if (!postalCode.trim()) e.postalCode = 'Postal code required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) { onBack(); return; }
    setCurrentStep((s) => s - 1);
  };

  const handleSubmit = () => {
    setGlobalError(null);
    const payload: SubmitAccountKycPayload = {
      firstName, lastName, dateOfBirth, gender,
      occupation: selectedOccupation!.code,
      annualSalary, accountPurpose,
      expectedMonthlyVolume, sourceType,
      nationality, nationalId,
      idType: idType as any,
      issueDate, expiryDate,
      address: { addressLine1, city, state: stateVal, country, postalCode },
      idFrontId: idFront!.fileId!,
      idBackId: needsBack ? idBack?.fileId : undefined,
      selfie: selfie!.fileId!,
      phoneNumber, phoneCountryCode: stripPlus(phoneCountryCode),
    };

    submitKyc.mutate(payload, {
      onSuccess: onSubmitted,
      onError: (err: any) =>
        setGlobalError(
          err?.response?.data?.message ?? err?.message ?? 'Submission failed. Please try again.'
        ),
    });
  };

  const isSubmitting = submitKyc.isPending;

  // ✅ Step render with updated date fields
  const renderStep = () => {
    if (currentStep === 0) return (
      <>
        <Text style={[SC.stepTitle, { color: colors.text }]}>Personal Information</Text>
        <Text style={[SC.stepSub, { color: colors.text2 }]}>
          Enter details exactly as they appear on your ID
        </Text>

        <View style={SC.row}>
          <View style={{ flex: 1 }}>
            <Field label="First Name" value={firstName} onChange={setFirstName} error={errors.firstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last Name" value={lastName} onChange={setLastName} error={errors.lastName} />
          </View>
        </View>

        <DateField
          label="Date of Birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          error={errors.dateOfBirth}
          maxDate={new Date()}
          minDate={new Date(1900, 0, 1)}
        />

        <PickerRow
          label="Gender"
          value={gender}
          onSelect={(v) => setGender(v as 'M' | 'F')}
          options={[
            { label: '👨 Male', value: 'M' },
            { label: '👩 Female', value: 'F' },
          ]}
        />

        <Field
          label="Nationality (ISO code)"
          value={nationality}
          onChange={(v) => setNationality(v.toUpperCase())}
          placeholder="US, IN, AE..."
          hint="2-letter country code"
          maxLength={2}
          error={errors.nationality}
        />

        <View style={SC.row}>
          <View style={{ width: 90 }}>
            <Field
              label="Code"
              value={phoneCountryCode}
              onChange={(v) => setPhoneCountryCode(stripPlus(v))}
              placeholder="91"
              keyboardType="phone-pad"
              hint="No +"
              error={errors.phoneCountryCode}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Phone Number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />
          </View>
        </View>
      </>
    );

    if (currentStep === 1) return (
      <>
        <Text style={[SC.stepTitle, { color: colors.text }]}>Financial Profile</Text>
        <Text style={[SC.stepSub, { color: colors.text2 }]}>
          Help us understand your financial situation
        </Text>

        <View style={FD.wrap}>
          <Text style={[FD.label, { color: colors.text }]}>Occupation</Text>
          <TouchableOpacity
            style={[
              FD.pickerBtn,
              {
                backgroundColor: colors.card,
                borderColor: errors.occupation
                  ? colors.red
                  : selectedOccupation
                  ? colors.primary
                  : colors.border,
              },
            ]}
            onPress={() => setOccupationPickerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              {selectedOccupation ? (
                <>
                  <Text style={[FD.pickerSelected, { color: colors.text }]} numberOfLines={1}>
                    {selectedOccupation.title}
                  </Text>
                  <Text style={[FD.pickerCode, { color: colors.text2 }]}>
                    Code: {selectedOccupation.code}
                  </Text>
                </>
              ) : (
                <Text style={[FD.pickerPlaceholder, { color: colors.text3 }]}>
                  Tap to select occupation...
                </Text>
              )}
            </View>
            <Ionicons
              name={selectedOccupation ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={selectedOccupation ? colors.primary : colors.text3}
            />
          </TouchableOpacity>
          {errors.occupation && (
            <Text style={[FD.error, { color: colors.red }]}>{errors.occupation}</Text>
          )}
        </View>

        <Field
          label="Annual Salary (USD)"
          value={annualSalary}
          onChange={setAnnualSalary}
          placeholder="e.g. 50000"
          keyboardType="numeric"
          error={errors.annualSalary}
        />

        <PickerRow
          label="Account Purpose"
          value={accountPurpose}
          onSelect={setAccountPurpose}
          options={ACCOUNT_PURPOSE_OPTIONS}
        />

        <Field
          label="Expected Monthly Volume (USD)"
          value={expectedMonthlyVolume}
          onChange={setExpectedMonthlyVolume}
          placeholder="e.g. 3000"
          keyboardType="numeric"
          error={errors.expectedMonthlyVolume}
        />
      </>
    );

    if (currentStep === 2) return (
      <>
        <Text style={[SC.stepTitle, { color: colors.text }]}>Identity Document</Text>
        <Text style={[SC.stepSub, { color: colors.text2 }]}>
          Upload clear photos of your government ID
        </Text>

        <PickerRow
          label="Document Type"
          value={idType}
          onSelect={(v) => { setIdType(v); if (v === 'PASSPORT') setIdBack(null); }}
          options={ID_TYPES}
        />

        <Field
          label="Document Number"
          value={nationalId}
          onChange={setNationalId}
          placeholder="e.g. AB1234567"
          error={errors.nationalId}
        />

        <View style={SC.row}>
          <View style={{ flex: 1 }}>
            <DateField
              label="Issue Date"
              value={issueDate}
              onChange={setIssueDate}
              error={errors.issueDate}
              maxDate={new Date()}
              minDate={new Date(1950, 0, 1)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="Expiry Date"
              value={expiryDate}
              onChange={setExpiryDate}
              error={errors.expiryDate}
              minDate={new Date()}
              maxDate={new Date(2050, 11, 31)}
            />
          </View>
        </View>

        <Text style={[FD.label, { color: colors.text, marginBottom: Spacing[2] }]}>
          Upload Photos
        </Text>
        <View style={SC.uploadGrid}>
          <DocUpload
            label="Front"
            uri={idFront?.uri}
            onPick={() => pickAndUpload('front')}
            uploading={uploadingKey === 'front'}
            done={!!idFront?.fileId}
            colors={colors}
          />
          {needsBack && (
            <DocUpload
              label="Back"
              uri={idBack?.uri}
              onPick={() => pickAndUpload('back')}
              uploading={uploadingKey === 'back'}
              done={!!idBack?.fileId}
              colors={colors}
            />
          )}
          <DocUpload
            label="Selfie"
            uri={selfie?.uri}
            onPick={() => pickAndUpload('selfie')}
            uploading={uploadingKey === 'selfie'}
            done={!!selfie?.fileId}
            colors={colors}
          />
        </View>

        {errors.idFront && (
          <Text style={[FD.error, { color: colors.red, marginTop: Spacing[2] }]}>
            {errors.idFront}
          </Text>
        )}
        {errors.idBack && <Text style={[FD.error, { color: colors.red }]}>{errors.idBack}</Text>}
        {errors.selfie && <Text style={[FD.error, { color: colors.red }]}>{errors.selfie}</Text>}
      </>
    );

    if (currentStep === 3) return (
      <>
        <Text style={[SC.stepTitle, { color: colors.text }]}>Residential Address</Text>
        <Text style={[SC.stepSub, { color: colors.text2 }]}>
          Provide your current home address
        </Text>

        <Field
          label="Address Line 1"
          value={addressLine1}
          onChange={setAddressLine1}
          placeholder="Street, building no."
          error={errors.addressLine1}
        />

        <View style={SC.row}>
          <View style={{ flex: 1 }}>
            <Field label="City" value={city} onChange={setCity} error={errors.city} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="State" value={stateVal} onChange={setStateVal} error={errors.stateVal} />
          </View>
        </View>

        <View style={SC.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Country (ISO)"
              value={country}
              onChange={(v) => setCountry(v.toUpperCase())}
              placeholder="US"
              maxLength={2}
              error={errors.country}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Postal Code"
              value={postalCode}
              onChange={setPostalCode}
              keyboardType="numeric"
              error={errors.postalCode}
            />
          </View>
        </View>
      </>
    );

    if (currentStep === 4) return (
      <>
        <Text style={[SC.stepTitle, { color: colors.text }]}>Review & Submit</Text>
        <Text style={[SC.stepSub, { color: colors.text2 }]}>
          Confirm all details before submitting
        </Text>

        <ReviewSection
          title="Personal"
          icon="person-outline"
          onEdit={() => setCurrentStep(0)}
          colors={colors}
        >
          <ReviewRow label="Name" value={`${firstName} ${lastName}`} colors={colors} />
          <ReviewRow label="DOB" value={dateOfBirth ? formatDisplayDate(dateOfBirth) : ''} colors={colors} />
          <ReviewRow label="Gender" value={gender === 'M' ? 'Male' : 'Female'} colors={colors} />
          <ReviewRow label="Nationality" value={nationality} colors={colors} />
          <ReviewRow
            label="Phone"
            value={`+${phoneCountryCode} ${phoneNumber}`}
            colors={colors}
            last
          />
        </ReviewSection>

        <ReviewSection
          title="Financial"
          icon="briefcase-outline"
          onEdit={() => setCurrentStep(1)}
          colors={colors}
        >
          <ReviewRow label="Occupation" value={selectedOccupation?.title ?? '—'} colors={colors} />
          <ReviewRow label="Annual Salary" value={`$${annualSalary}`} colors={colors} />
          <ReviewRow
            label="Monthly Volume"
            value={`$${expectedMonthlyVolume}`}
            colors={colors}
            last
          />
        </ReviewSection>

        <ReviewSection
          title="Document"
          icon="card-outline"
          onEdit={() => setCurrentStep(2)}
          colors={colors}
        >
          <ReviewRow label="Type" value={idType} colors={colors} />
          <ReviewRow label="Number" value={nationalId} colors={colors} />
          <ReviewRow label="Issue Date" value={issueDate ? formatDisplayDate(issueDate) : ''} colors={colors} />
          <ReviewRow label="Expiry Date" value={expiryDate ? formatDisplayDate(expiryDate) : ''} colors={colors} />
          <ReviewRow
            label="Files"
            value={[
              idFront?.fileId ? '✓ Front' : '',
              idBack?.fileId ? '✓ Back' : '',
              selfie?.fileId ? '✓ Selfie' : '',
            ]
              .filter(Boolean)
              .join('  ')}
            colors={colors}
            last
          />
        </ReviewSection>

        <ReviewSection
          title="Address"
          icon="home-outline"
          onEdit={() => setCurrentStep(3)}
          colors={colors}
        >
          <ReviewRow label="Street" value={addressLine1} colors={colors} />
          <ReviewRow label="City" value={city} colors={colors} />
          <ReviewRow label="State" value={stateVal} colors={colors} />
          <ReviewRow label="Country" value={country} colors={colors} />
          <ReviewRow label="Postal Code" value={postalCode} colors={colors} last />
        </ReviewSection>

        {globalError && (
          <View
            style={[
              RV.errBox,
              { backgroundColor: colors.redDim, borderColor: colors.red + '40' },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.red }}>{globalError}</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top, borderBottomColor: colors.borderSoft }]}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={12}
          style={[S.backBtn, { backgroundColor: colors.cardHover }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>KYC Verification</Text>
          <Text style={[S.headerSub, { color: colors.text2 }]}>
            Step {currentStep + 1} of {STEPS.length}
          </Text>
        </View>
      </View>

      {/* Step indicator */}
      <StepIndicator current={currentStep} colors={colors} />

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[S.scrollContent, { paddingBottom: scrollPaddingBottom }]}
      >
        {renderStep()}

        {/* CTA */}
        <View style={[S.ctaContainer, { borderTopColor: colors.borderSoft }]}>
          {currentStep < STEPS.length - 1 ? (
            <TouchableOpacity activeOpacity={0.87} onPress={handleNext} style={S.ctaBtn}>
              <LinearGradient
                colors={['#7C5CFF', '#5B3FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.ctaGradient}
              >
                <Text style={S.ctaText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.87}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={S.ctaBtn}
            >
              <LinearGradient
                colors={isSubmitting ? ['#999', '#777'] : ['#7C5CFF', '#5B3FE8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={S.ctaGradient}
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={S.ctaText}>Submitting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                    <Text style={S.ctaText}>Submit KYC</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* ✅ Modals */}
      <OccupationPickerModal
        visible={occupationPickerVisible}
        onClose={() => setOccupationPickerVisible(false)}
        onSelect={(occ) => setSelectedOccupation(occ)}
        selectedCode={selectedOccupation?.code}
      />

      <FileUploadOptionsModal
        visible={fileUploadModal.visible}
        onClose={() => setFileUploadModal({ visible: false, type: null })}
        onCamera={() => {
          if (fileUploadModal.type) pickFromCamera(fileUploadModal.type);
        }}
        onGallery={() => {
          if (fileUploadModal.type) pickFromGallery(fileUploadModal.type);
        }}
        title={`Upload ${fileUploadModal.type === 'selfie' ? 'Selfie' : 'Document'}`}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const S = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: Typography.base, fontWeight: '800' },
  headerSub: { fontSize: Typography.xs },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
  },
  ctaContainer: {
    marginTop: Spacing[6],
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    gap: Spacing[2],
  },
  ctaBtn: { borderRadius: Radius.xl, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  ctaText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});

const ST = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  item: { alignItems: 'center', gap: 4 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 10, fontWeight: '600' },
  line: { flex: 1, height: 1.5, marginHorizontal: 4, marginBottom: 14 },
});

const SC = StyleSheet.create({
  stepTitle: { fontSize: Typography.lg, fontWeight: '800', marginBottom: Spacing[1] },
  stepSub: { fontSize: Typography.xs, lineHeight: 18, marginBottom: Spacing[5] },
  row: { flexDirection: 'row', gap: Spacing[3] },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
});

const FD = StyleSheet.create({
  wrap: { marginBottom: Spacing[4] },
  label: { fontSize: Typography.xs, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Platform.OS === 'ios' ? Spacing[4] : Spacing[3],
    fontSize: Typography.sm,
  },
  // ✅ New date input styles
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: Typography.sm,
    flex: 1,
  },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  pickerBtn: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
  },
  pickerSelected: { fontSize: Typography.sm, fontWeight: '700' },
  pickerCode: { fontSize: Typography.xs, marginTop: 2 },
  pickerPlaceholder: { fontSize: Typography.sm },
  error: { fontSize: 11, marginTop: 4 },
  hint: { fontSize: 11, marginTop: 4, opacity: 0.7 },
});

const DU = StyleSheet.create({
  tile: {
    width: '31%',
    height: 100,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  labelText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

const RV = StyleSheet.create({
  section: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { flex: 1, fontSize: Typography.sm, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: Typography.xs, fontWeight: '500', flex: 1 },
  value: {
    fontSize: Typography.xs,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  errBox: {
    flexDirection: 'row',
    gap: Spacing[2],
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing[4],
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
  },
});