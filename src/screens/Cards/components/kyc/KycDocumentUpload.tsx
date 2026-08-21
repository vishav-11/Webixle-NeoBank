/**
 * KycDocumentUpload.tsx
 * Multi-step KYC document upload flow adapted for the new dark theme project.
 * Steps: documents → details → liveness → processing
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Image, FlatList, ActivityIndicator, Linking,
  Platform, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  AlertCircle, Calendar, Camera, CheckCircle, ChevronDown,
  ChevronLeft, ChevronRight, CreditCard, FileText, Globe,
  Search, Shield, Upload, User, X,
} from 'lucide-react-native';
import type { ColorScheme } from '@/styles/theme';
import type { Country, IdentityCardType } from '@/types/cardTypes';
import { ID_CARD_TYPES } from '@/constants/card';
import cardService from '@/services/cardService';

interface Props {
  userCode:   string;
  onComplete: () => void;
  onCancel:   () => void;
  colors:     ColorScheme;
}

interface FormData {
  frontUri:           string | null;
  backUri:            string | null;
  dob:                string;
  identityCardType:   IdentityCardType;
  identityCardNumber: string;
  identityExpiry:     string;
  countryCode:        string;
  countryName:        string;
}

type Step = 'documents' | 'details' | 'liveness' | 'processing';

export default function KycDocumentUpload({ userCode, onComplete, onCancel, colors }: Props) {
  const [step,    setStep]    = useState<Step>('documents');
  const [form,    setForm]    = useState<FormData>({
    frontUri: null, backUri: null, dob: '', identityCardType: 'ID_CARD',
    identityCardNumber: '', identityExpiry: '2099-12-31', countryCode: '', countryName: '',
  });
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [kycUrl,           setKycUrl]           = useState<string | null>(null);
  const [checkingLiveness, setCheckingLiveness] = useState(false);

  // Country picker
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showIdTypePicker,  setShowIdTypePicker]  = useState(false);
  const [countries,         setCountries]         = useState<Country[]>([]);
  const [countrySearch,     setCountrySearch]     = useState('');
  const [loadingCountries,  setLoadingCountries]  = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load countries
  const loadCountries = useCallback(async (search?: string) => {
    setLoadingCountries(true);
    try {
      const data = await cardService.getCountries(search);
      setCountries(data.slice(0, 30));
    } catch {}
    finally { setLoadingCountries(false); }
  }, []);

  useEffect(() => {
    if (showCountryPicker) loadCountries();
  }, [showCountryPicker]);

  useEffect(() => {
    if (!showCountryPicker) return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadCountries(countrySearch), 300) as any;
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [countrySearch, showCountryPicker]);

  const pickImage = async (side: 'front' | 'back', useCamera: boolean) => {
    setError(null);
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { setError('Camera permission needed.'); return; }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setError('Gallery permission needed.'); return; }
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });

    if (!result.canceled && result.assets?.[0]) {
      setForm(p => ({ ...p, [side === 'front' ? 'frontUri' : 'backUri']: result.assets[0].uri }));
    }
  };

  const handleSubmit = async () => {
    if (!form.frontUri || !form.backUri) { setError('Please upload both sides of your ID.'); return; }
    if (!form.dob)                       { setError('Please enter your date of birth.');       return; }
    if (!form.identityCardNumber)        { setError('Please enter your ID number.');           return; }
    if (!form.countryCode)               { setError('Please select your country.');            return; }

    setSubmitting(true); setError(null);
    try {
      const fd = new FormData();
      if (Platform.OS === 'web') {
        const fr = await fetch(form.frontUri); fd.append('front', new File([await fr.blob()], 'front.jpg', { type: 'image/jpeg' }));
        const br = await fetch(form.backUri);  fd.append('back',  new File([await br.blob()], 'back.jpg',  { type: 'image/jpeg' }));
      } else {
        fd.append('front', { uri: form.frontUri, type: 'image/jpeg', name: 'front.jpg' } as any);
        fd.append('back',  { uri: form.backUri,  type: 'image/jpeg', name: 'back.jpg'  } as any);
      }
      fd.append('dob',                form.dob);
      fd.append('identityCardType',   form.identityCardType);
      fd.append('identityCardNumber', form.identityCardNumber);
      fd.append('identityExpiry',     form.identityExpiry);
      fd.append('countryCode',        form.countryCode);

      await cardService.submitKycWithDocs(fd);

      const kycRes = await cardService.getKycUrl();
      if (kycRes?.link) { setKycUrl(kycRes.link); setStep('liveness'); }
      else               { setStep('processing'); }
    } catch (err: any) {
      setError(err?.response?.data?.msg || err.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const checkLiveness = async () => {
    setCheckingLiveness(true); setError(null);
    try {
      const result      = await cardService.getLivenessStatus();
      const auditStatus = result?.data?.data?.auditStatus;
      if      (auditStatus === 1)                   onComplete();
      else if (auditStatus === 0 || auditStatus === 3) setError('Verification still in progress. Complete the liveness check and try again.');
      else if (auditStatus === 2)                   setError('Liveness check failed. Please try again.');
      else                                          setError('Verification not completed yet.');
    } catch (err: any) {
      setError(err?.response?.data?.msg || 'Failed to check status.');
    } finally { setCheckingLiveness(false); }
  };

  const goBack = () => {
    if      (step === 'details')  setStep('documents');
    else if (step === 'liveness') setStep('details');
    else                          onCancel();
  };

  // ── Progress bar ────────────────────────────────────────────────────────────
  const STEPS: Step[] = ['documents', 'details', 'liveness', 'processing'];
  const stepIdx = STEPS.indexOf(step);

  const ProgressBar = () => (
    <View style={s.progressBar}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[
            s.progressSeg,
            { backgroundColor: i < stepIdx ? colors.green : i === stepIdx ? colors.blue : colors.border },
          ]}
        />
      ))}
    </View>
  );

  // ── Processing ──────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <View style={[s.container, s.center, { backgroundColor: colors.bg }]}>
        <View style={[s.iconCircle, { backgroundColor: colors.green + '22' }]}>
          <CheckCircle size={48} color={colors.green} />
        </View>
        <Text style={[s.bigTitle, { color: colors.text }]}>Verification Submitted!</Text>
        <Text style={[s.bigDesc, { color: colors.text2 }]}>
          Your documents have been submitted for review. You will be notified once complete.
        </Text>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.green }]} onPress={onComplete}>
          <Text style={s.btnTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Liveness ────────────────────────────────────────────────────────────────
  if (step === 'liveness') {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Liveness Verification</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={[s.iconCircle, { backgroundColor: colors.purple + '22', alignSelf: 'center' }]}>
            <User size={40} color={colors.purple} />
          </View>
          <Text style={[s.bigTitle, { color: colors.text, textAlign: 'center' }]}>Complete Face Verification</Text>
          <Text style={[s.bigDesc, { color: colors.text2, textAlign: 'center' }]}>
            Click "Start Verification", follow the on-screen instructions, then return here and click "Check Status".
          </Text>
          {[1, 2, 3].map((n, i) => (
            <View key={n} style={[s.livenessStep, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[s.stepNum, { backgroundColor: colors.blue }]}>
                <Text style={s.stepNumTxt}>{n}</Text>
              </View>
              <Text style={[s.livenessStepTxt, { color: colors.text2 }]}>
                {['Click "Start Verification" below', 'Follow the on-screen instructions', 'Return here and click "Check Status"'][i]}
              </Text>
            </View>
          ))}

          {error && <ErrorBox error={error} colors={colors} />}

          <TouchableOpacity style={[s.btn, { backgroundColor: colors.green }]} onPress={() => kycUrl && Linking.openURL(kycUrl)}>
            <User size={16} color="#000" />
            <Text style={s.btnTxt}>Start Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, marginTop: 10 }]}
            onPress={checkLiveness}
            disabled={checkingLiveness}
          >
            {checkingLiveness
              ? <ActivityIndicator size="small" color={colors.text} />
              : <><CheckCircle size={16} color={colors.text} /><Text style={[s.btnTxt, { color: colors.text }]}>Check Status</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Details ─────────────────────────────────────────────────────────────────
  if (step === 'details') {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}><ChevronLeft size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Personal Details</Text>
          <TouchableOpacity onPress={onCancel} style={s.backBtn}><X size={20} color={colors.text2} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <ProgressBar />
          {/* Preview */}
          <View style={s.previewRow}>
            {[form.frontUri, form.backUri].map((uri, i) => uri && (
              <View key={i} style={s.previewItem}>
                <Image source={{ uri }} style={s.previewThumb} />
                <Text style={[s.previewLabel, { color: colors.text2 }]}>{i === 0 ? 'Front' : 'Back'}</Text>
              </View>
            ))}
          </View>

          {/* Country */}
          <FieldLabel label="Country" colors={colors} />
          <TouchableOpacity style={[s.selectBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setShowCountryPicker(true)}>
            <Globe size={18} color={colors.text2} />
            <Text style={[s.selectTxt, { color: form.countryName ? colors.text : colors.text3 }]}>{form.countryName || 'Select Country'}</Text>
            <ChevronDown size={18} color={colors.text2} />
          </TouchableOpacity>

          {/* ID Type */}
          <FieldLabel label="ID Type" colors={colors} />
          <TouchableOpacity style={[s.selectBtn, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setShowIdTypePicker(true)}>
            <CreditCard size={18} color={colors.text2} />
            <Text style={[s.selectTxt, { color: colors.text }]}>
              {ID_CARD_TYPES.find(t => t.value === form.identityCardType)?.label || 'ID Card'}
            </Text>
            <ChevronDown size={18} color={colors.text2} />
          </TouchableOpacity>

          {/* ID Number */}
          <FieldLabel label="ID Card Number" colors={colors} />
          <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <CreditCard size={18} color={colors.text2} />
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholderTextColor={colors.text3}
              placeholder="Enter ID number"
              value={form.identityCardNumber}
              onChangeText={v => setForm(p => ({ ...p, identityCardNumber: v }))}
              autoCapitalize="characters"
            />
          </View>

          {/* DOB */}
          <FieldLabel label="Date of Birth" colors={colors} />
          <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Calendar size={18} color={colors.text2} />
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholderTextColor={colors.text3}
              placeholder="YYYY-MM-DD"
              value={form.dob}
              onChangeText={v => setForm(p => ({ ...p, dob: v }))}
              maxLength={10}
            />
          </View>
          <Text style={[s.hint, { color: colors.text3 }]}>Format: 2001-09-27</Text>

          {/* Expiry */}
          <FieldLabel label="ID Expiry Date" colors={colors} />
          <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Calendar size={18} color={colors.text2} />
            <TextInput
              style={[s.input, { color: colors.text }]}
              placeholderTextColor={colors.text3}
              placeholder="YYYY-MM-DD"
              value={form.identityExpiry}
              onChangeText={v => setForm(p => ({ ...p, identityExpiry: v }))}
              maxLength={10}
            />
          </View>
          <Text style={[s.hint, { color: colors.text3 }]}>For long-term validity, use 2099-12-31</Text>

          {error && <ErrorBox error={error} colors={colors} />}

          <TouchableOpacity style={[s.btn, { backgroundColor: colors.green }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#000" /> : <><Shield size={16} color="#000" /><Text style={s.btnTxt}>Submit for Verification</Text></>}
          </TouchableOpacity>
        </ScrollView>

        {/* Country picker modal */}
        <Modal visible={showCountryPicker} transparent animationType="slide">
          <View style={[s.pickerOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[s.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Select Country</Text>
              <View style={[s.searchWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Search size={16} color={colors.text2} />
                <TextInput style={[s.searchInput, { color: colors.text }]} placeholderTextColor={colors.text3} placeholder="Search…" value={countrySearch} onChangeText={setCountrySearch} />
              </View>
              <FlatList
                data={countries}
                keyExtractor={item => item.code}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.countryRow, form.countryCode === item.code && { backgroundColor: colors.greenDim }]}
                    onPress={() => { setForm(p => ({ ...p, countryCode: item.code, countryName: item.name })); setShowCountryPicker(false); setCountrySearch(''); }}
                  >
                    <Text style={[s.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[s.countryCode, { color: colors.text3 }]}>{item.code}</Text>
                    {form.countryCode === item.code && <CheckCircle size={16} color={colors.green} />}
                  </TouchableOpacity>
                )}
                ListFooterComponent={loadingCountries ? <ActivityIndicator color={colors.green} style={{ padding: 12 }} /> : null}
              />
            </View>
          </View>
        </Modal>

        {/* ID type picker modal */}
        <Modal visible={showIdTypePicker} transparent animationType="slide">
          <View style={[s.pickerOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[s.pickerSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.pickerTitle, { color: colors.text }]}>Select ID Type</Text>
              {ID_CARD_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[s.countryRow, form.identityCardType === t.value && { backgroundColor: colors.greenDim }]}
                  onPress={() => { setForm(p => ({ ...p, identityCardType: t.value })); setShowIdTypePicker(false); }}
                >
                  <CreditCard size={16} color={form.identityCardType === t.value ? colors.green : colors.text2} />
                  <Text style={[s.countryName, { color: colors.text, flex: 1, marginLeft: 10 }]}>{t.label}</Text>
                  {form.identityCardType === t.value && <CheckCircle size={16} color={colors.green} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Documents (default) ─────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onCancel} style={s.backBtn}><ChevronLeft size={22} color={colors.text} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Upload Documents</Text>
        <TouchableOpacity onPress={onCancel} style={s.backBtn}><X size={20} color={colors.text2} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <ProgressBar />

        <View style={[s.docInfo, { alignItems: 'center' }]}>
          <View style={[s.iconCircle, { backgroundColor: colors.blue + '22' }]}>
            <FileText size={30} color={colors.blue} />
          </View>
          <Text style={[s.bigTitle, { color: colors.text, textAlign: 'center' }]}>Identity Document</Text>
          <Text style={[s.bigDesc, { color: colors.text2, textAlign: 'center' }]}>
            Upload clear photos of both sides of your ID.
          </Text>
        </View>

        {/* Front */}
        <UploadSection
          label="Front Side"
          uri={form.frontUri}
          onCamera={() => pickImage('front', true)}
          onGallery={() => pickImage('front', false)}
          onRemove={() => setForm(p => ({ ...p, frontUri: null }))}
          colors={colors}
        />

        {/* Back */}
        <UploadSection
          label="Back Side"
          uri={form.backUri}
          onCamera={() => pickImage('back', true)}
          onGallery={() => pickImage('back', false)}
          onRemove={() => setForm(p => ({ ...p, backUri: null }))}
          colors={colors}
        />

        {/* Tips */}
        <View style={[s.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.tipsTitle, { color: colors.text }]}>📸 Tips for a good photo</Text>
          {['All text is clearly visible', 'No glare or shadows', 'All 4 corners visible'].map(tip => (
            <View key={tip} style={s.tip}>
              <CheckCircle size={13} color={colors.green} />
              <Text style={[s.tipTxt, { color: colors.text2 }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {error && <ErrorBox error={error} colors={colors} />}

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.green, opacity: (!form.frontUri || !form.backUri) ? 0.4 : 1 }]}
          onPress={() => {
            if (!form.frontUri || !form.backUri) { setError('Please upload both sides of your ID.'); return; }
            setError(null); setStep('details');
          }}
        >
          <ChevronRight size={16} color="#000" />
          <Text style={s.btnTxt}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ label, colors }: { label: string; colors: ColorScheme }) {
  return <Text style={[s.fieldLabel, { color: colors.text2 }]}>{label}</Text>;
}

function ErrorBox({ error, colors }: { error: string; colors: ColorScheme }) {
  return (
    <View style={[s.errorBox, { backgroundColor: colors.red + '18', borderColor: colors.red + '44' }]}>
      <AlertCircle size={16} color={colors.red} />
      <Text style={[s.errorTxt, { color: colors.red }]}>{error}</Text>
    </View>
  );
}

function UploadSection({ label, uri, onCamera, onGallery, onRemove, colors }: {
  label: string; uri: string | null;
  onCamera: () => void; onGallery: () => void; onRemove: () => void;
  colors: ColorScheme;
}) {
  return (
    <View style={s.uploadSection}>
      <Text style={[s.uploadLabel, { color: colors.text }]}>{label}</Text>
      {uri ? (
        <View>
          <Image source={{ uri }} style={s.previewImg} />
          <TouchableOpacity style={s.removeBtn} onPress={onRemove}>
            <X size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.uploadBtns}>
          {[{ icon: Camera, label: 'Camera', fn: onCamera }, { icon: Upload, label: 'Gallery', fn: onGallery }].map(({ icon: Icon, label: l, fn }) => (
            <TouchableOpacity key={l} style={[s.uploadBtn, { backgroundColor: colors.blue + '18', borderColor: colors.blue + '44' }]} onPress={fn}>
              <Icon size={22} color={colors.blue} />
              <Text style={[s.uploadBtnTxt, { color: colors.blue }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  backBtn:   { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 20, paddingBottom: 40 },

  progressBar: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },

  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bigTitle:   { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  bigDesc:    { fontSize: 14, lineHeight: 20, marginBottom: 20 },

  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#000' },

  fieldLabel: { fontSize: 13, marginBottom: 6, marginTop: 14 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  input:      { flex: 1, fontSize: 14 },
  hint:       { fontSize: 11, marginTop: 4, marginBottom: 4 },
  selectBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  selectTxt:  { flex: 1, fontSize: 14 },

  previewRow:  { flexDirection: 'row', gap: 12, marginBottom: 20 },
  previewItem: { flex: 1, alignItems: 'center' },
  previewThumb:{ width: '100%', height: 90, borderRadius: 8 },
  previewLabel:{ fontSize: 11, marginTop: 6 },

  docInfo: { marginBottom: 20 },

  uploadSection: { marginBottom: 16 },
  uploadLabel:   { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  uploadBtns:    { flexDirection: 'row', gap: 12 },
  uploadBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  uploadBtnTxt:  { fontSize: 13, fontWeight: '600' },
  previewImg:    { width: '100%', height: 160, borderRadius: 12 },
  removeBtn:     { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },

  tipsCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  tip:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipTxt:    { fontSize: 12, flex: 1 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 10 },
  errorTxt: { flex: 1, fontSize: 13 },

  livenessStep:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  livenessStepTxt: { flex: 1, fontSize: 13 },
  stepNum:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt:      { fontSize: 13, fontWeight: '700', color: '#fff' },

  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet:   { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, maxHeight: '70%' },
  pickerTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchInput:   { flex: 1, fontSize: 14 },
  countryRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  countryName:   { flex: 1, fontSize: 14 },
  countryCode:   { fontSize: 12, marginRight: 8 },
});
