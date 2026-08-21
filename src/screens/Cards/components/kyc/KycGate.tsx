/**
 * KycGate.tsx
 * Handles all KYC states: KYC_REQUIRED, KYC_PENDING, KYC_REJECTED, KYC_LIVENESS_PENDING.
 * Uses the new project's DarkColors/LightColors theme instead of hardcoded light colors.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  FileText,
  Camera,
} from 'lucide-react-native';
import type { ColorScheme } from '@/styles/theme';
import KycDocumentUpload from './KycDocumentUpload';

export type KycGateStatus =
  | 'KYC_REQUIRED'
  | 'KYC_PENDING'
  | 'KYC_REJECTED'
  | 'KYC_LIVENESS_PENDING';

interface Props {
  status:       KycGateStatus;
  onStartKyc:   () => Promise<string | null>;
  onRefresh:    () => void;
  loading?:     boolean;
  userCode?:    string | null;
  colors:       ColorScheme;
}

const KYC_STEPS = [
  { icon: FileText, title: 'Identity Verification', description: 'Upload a valid government-issued ID (front & back)' },
  { icon: Camera,   title: 'Selfie Verification',   description: 'Take a clear selfie for identity match' },
  { icon: Shield,   title: 'Address Proof',          description: 'Upload a utility bill or bank statement' },
];

export default function KycGate({ status, onStartKyc, onRefresh, loading = false, userCode, colors }: Props) {
  const [showUpload,       setShowUpload]       = useState(false);
  const [livenessLoading,  setLivenessLoading]  = useState(false);

  const openLiveness = async () => {
    try {
      setLivenessLoading(true);
      const url = await onStartKyc();
      if (url) await Linking.openURL(url);
    } catch {}
    finally { setLivenessLoading(false); }
  };

  // ── KYC PENDING ────────────────────────────────────────────────────────────

  if (status === 'KYC_PENDING') {
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.iconCircle, { backgroundColor: colors.orange + '22' }]}>
          <Clock size={32} color={colors.orange} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Verification In Progress</Text>
        <Text style={[s.desc,  { color: colors.text2 }]}>
          Your documents are being reviewed. This usually takes a few minutes, but can take up to 24 hours.
        </Text>

        <ProgressTrack step={1} colors={colors} />

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.text} />
            : <>
                <RefreshCw size={16} color={colors.text} />
                <Text style={[s.btnTxt, { color: colors.text }]}>Check Status</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    );
  }

  // ── KYC LIVENESS PENDING ───────────────────────────────────────────────────

  if (status === 'KYC_LIVENESS_PENDING') {
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.iconCircle, { backgroundColor: colors.purple + '22' }]}>
          <Camera size={32} color={colors.purple} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Complete Face Verification</Text>
        <Text style={[s.desc,  { color: colors.text2 }]}>
          Your documents have been submitted. Please complete the liveness check to finish identity verification.
        </Text>

        <ProgressTrack step={1} colors={colors} />

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.green }]}
          onPress={openLiveness}
          activeOpacity={0.85}
        >
          {livenessLoading
            ? <ActivityIndicator size="small" color="#000" />
            : <>
                <ExternalLink size={16} color="#000" />
                <Text style={[s.btnTxt, { color: '#000' }]}>Start Face Verification</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, marginTop: 10 }]}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color={colors.text} />
          <Text style={[s.btnTxt, { color: colors.text }]}>Check Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── KYC REJECTED ──────────────────────────────────────────────────────────

  if (status === 'KYC_REJECTED') {
    return (
      <>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.iconCircle, { backgroundColor: colors.red + '22' }]}>
            <XCircle size={32} color={colors.red} />
          </View>
          <Text style={[s.title, { color: colors.text }]}>Verification Failed</Text>
          <Text style={[s.desc,  { color: colors.text2 }]}>
            Your identity verification was not approved. Please try again with clearer documents.
          </Text>

          <View style={[s.tipBox, { backgroundColor: colors.red + '12', borderColor: colors.red + '33' }]}>
            <AlertTriangle size={18} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={[s.tipTitle, { color: colors.red }]}>Common reasons for rejection</Text>
              <Text style={[s.tipBody,  { color: colors.red + 'CC' }]}>
                • Blurry or unclear document photos{'\n'}
                • Expired identification documents{'\n'}
                • Name mismatch with account{'\n'}
                • Selfie doesn't match ID photo
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.green }]}
            onPress={() => setShowUpload(true)}
            activeOpacity={0.85}
          >
            <RefreshCw size={16} color="#000" />
            <Text style={[s.btnTxt, { color: '#000' }]}>Try Again</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={showUpload} animationType="slide" presentationStyle="fullScreen">
          <KycDocumentUpload
            userCode={userCode || ''}
            onComplete={() => { setShowUpload(false); onRefresh(); }}
            onCancel={() => setShowUpload(false)}
            colors={colors}
          />
        </Modal>
      </>
    );
  }

  // ── KYC REQUIRED (default) ─────────────────────────────────────────────────

  return (
    <>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Hero banner */}
        <View style={[s.hero, { backgroundColor: colors.bgAlt }]}>
          <View style={[s.heroDecor1, { borderColor: colors.green + '20' }]} />
          <View style={[s.heroDecor2, { borderColor: colors.green + '15' }]} />
          <Shield size={48} color={colors.green} />
          <Text style={[s.heroTitle, { color: colors.text }]}>Verify Your Identity</Text>
          <Text style={[s.heroSub,   { color: colors.text2 }]}>
            Complete KYC to unlock virtual & physical crypto debit cards
          </Text>
        </View>

        {/* Steps */}
        <View style={s.steps}>
          <Text style={[s.stepsTitle, { color: colors.text }]}>What you'll need</Text>
          {KYC_STEPS.map((step, i) => (
            <View key={step.title}>
              <View style={s.step}>
                <View style={[s.stepNum, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
                  <Text style={[s.stepNumTxt, { color: colors.green }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepTitle, { color: colors.text }]}>{step.title}</Text>
                  <Text style={[s.stepDesc,  { color: colors.text2 }]}>{step.description}</Text>
                </View>
              </View>
              {i < KYC_STEPS.length - 1 && (
                <View style={[s.connector, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        {/* Feature chips */}
        <View style={s.chips}>
          {['5-min process', 'Bank-grade security', 'Data encrypted'].map(c => (
            <View key={c} style={[s.chip, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
              <CheckCircle size={12} color={colors.green} />
              <Text style={[s.chipTxt, { color: colors.green }]}>{c}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.green }]}
          onPress={() => setShowUpload(true)}
          activeOpacity={0.85}
        >
          <ExternalLink size={16} color="#000" />
          <Text style={[s.btnTxt, { color: '#000' }]}>Start Verification</Text>
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: colors.text3 }]}>
          Your documents are securely processed and never shared without your consent.
        </Text>
      </View>

      <Modal visible={showUpload} animationType="slide" presentationStyle="fullScreen">
        <KycDocumentUpload
          userCode={userCode || ''}
          onComplete={() => { setShowUpload(false); onRefresh(); }}
          onCancel={() => setShowUpload(false)}
          colors={colors}
        />
      </Modal>
    </>
  );
}

// ── Progress Track ─────────────────────────────────────────────────────────────

function ProgressTrack({ step, colors }: { step: number; colors: ColorScheme }) {
  const labels = ['Submitted', 'Reviewing', 'Approved'];
  return (
    <View style={pt.row}>
      {labels.map((label, i) => {
        const done    = i < step;
        const active  = i === step;
        return (
          <React.Fragment key={label}>
            <View style={pt.node}>
              <View style={[
                pt.dot,
                done   && { backgroundColor: colors.green },
                active && { backgroundColor: colors.orange + '33', borderColor: colors.orange, borderWidth: 2 },
                !done && !active && { backgroundColor: colors.border },
              ]}>
                {done   && <CheckCircle size={14} color="#000" />}
                {active && <ActivityIndicator size="small" color={colors.orange} />}
              </View>
              <Text style={[pt.label, { color: colors.text2 }]}>{label}</Text>
            </View>
            {i < labels.length - 1 && (
              <View style={[pt.line, { backgroundColor: done ? colors.green : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const pt = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  node:  { alignItems: 'center', gap: 6 },
  dot:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line:  { width: 40, height: 2, marginHorizontal: 4, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '500' },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card:  { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },

  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 28, marginBottom: 8 },
  title:      { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20, marginTop: 8 },
  desc:       { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24, marginTop: 8, marginBottom: 4 },

  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, marginBottom: 16, marginTop: 8, paddingVertical: 14, borderRadius: 14 },
  btnTxt: { fontSize: 15, fontWeight: '700' },

  tipBox:   { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  tipTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  tipBody:  { fontSize: 12, lineHeight: 18 },

  // Hero
  hero:      { paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center', gap: 10, position: 'relative', overflow: 'hidden' },
  heroDecor1:{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 30, top: -30, right: -30 },
  heroDecor2:{ position: 'absolute', width: 80,  height: 80,  borderRadius: 40, borderWidth: 20, bottom: -20, left: -20 },
  heroTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  heroSub:   { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 },

  // Steps
  steps:      { padding: 20 },
  stepsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },
  step:       { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 },
  stepNum:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  stepNumTxt: { fontSize: 14, fontWeight: '700' },
  stepTitle:  { fontSize: 14, fontWeight: '600' },
  stepDesc:   { fontSize: 12, marginTop: 2, lineHeight: 16 },
  connector:  { width: 2, height: 14, marginLeft: 15 },

  // Chips
  chips:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '500' },

  disclaimer: { fontSize: 11, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 16, lineHeight: 16 },
});
