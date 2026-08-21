// CardModule/screens/CreateCardScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, TextInput, Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useProfile } from '@/hooks/queires';
import {
  useCardBins, useCardholders, useCreateCardholder,
  useCreateCard, useCreateBudgetCard,
} from '../hooks';
import {
  CARD_FACE, USE_TYPE_OPTIONS, CARDHOLDER_TIER_DEFAULT,
  BIN_TYPE_LABEL, binTypeToCardCreationType, CARD_MODE_OPTIONS,
} from '../constants';
import type { CardBin, CardMode, Budget, CardholderInfo } from '../types';
import { useInterlaceStatus } from '../hooks/useInterlaceStatus';
import BudgetPickerModal from '../components/BudgetPickerModal';

type WizardStep = 'bin' | 'cardholder' | 'issue';

const CARDHOLDER_READY_STATUSES = ['ACTIVE', 'KYC_PASSED'];

// ─────────────────────────────────────────────────────────────────────────────
// Small building blocks
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ step, title, subtitle, colors }: {
  step?: number; title: string; subtitle?: string; colors: any;
}) {
  return (
    <View style={{ marginBottom: Spacing[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
        {step != null && (
          <View style={[S.stepBadge, { backgroundColor: colors.primaryDim ?? colors.cardHover }]}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>{step}</Text>
          </View>
        )}
        <Text style={[S.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {subtitle && (
        <Text style={[S.sectionSubtitle, { color: colors.text2 }]}>{subtitle}</Text>
      )}
    </View>
  );
}

function StepProgress({ current, colors }: { current: WizardStep; colors: any }) {
  const steps: { key: WizardStep; num: number; label: string }[] = [
    { key: 'bin', num: 3, label: 'Card form' },
    { key: 'cardholder', num: 4, label: 'Cardholder' },
    { key: 'issue', num: 5, label: 'Create card' },
  ];
  const order: WizardStep[] = ['bin', 'cardholder', 'issue'];
  const currentIdx = order.indexOf(current);

  return (
    <View style={SP.row}>
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const tone = isDone || isCurrent ? colors.primary : colors.border;
        return (
          <React.Fragment key={s.key}>
            <View style={SP.stepCol}>
              <View style={[
                SP.dot,
                { backgroundColor: isDone ? colors.primary : 'transparent', borderColor: tone },
              ]}>
                {isDone
                  ? <Ionicons name="checkmark" size={11} color="#fff" />
                  : <Text style={{ fontSize: 10, fontWeight: '800', color: isCurrent ? colors.primary : colors.text3 }}>
                      {s.num}
                    </Text>}
              </View>
              <Text style={[SP.label, {
                color: isCurrent ? colors.text : colors.text3,
                fontWeight: isCurrent ? '800' : '600',
              }]}>
                {s.label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[SP.line, { backgroundColor: i < currentIdx ? colors.primary : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function BinOption({ bin, selected, onPress, colors }: {
  bin: CardBin; selected: boolean; onPress: () => void; colors: any;
}) {
  const typeLabel = BIN_TYPE_LABEL[bin.type] ?? 'Card';
  const isBudget = bin.type === 0;
  const limits = bin.purchaseLimit;
  const hasLimits = limits && (limits.day !== '/' || limits.single !== '/' || limits.lifetime !== '/');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        S.binCard,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
        <View style={[S.binIcon, { backgroundColor: colors.iconTileBg ?? colors.cardHover }]}>
          <Ionicons
            name={isBudget ? 'pie-chart-outline' : 'card-outline'}
            size={20}
            color={colors.primary}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[S.binTitle, { color: colors.text }]} numberOfLines={1}>
            {bin.network} · {(bin.currencies ?? []).join(', ') || '—'}
          </Text>
          <Text style={[S.binSub, { color: colors.text2 }]} numberOfLines={1}>
            {[typeLabel, bin.countryRegion].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={[
          S.badge,
          { backgroundColor: isBudget ? (colors.yellowDim ?? '#fef3c7') : (colors.greenDim ?? '#d1fae5') },
        ]}>
          <Text style={{
            color: isBudget ? (colors.yellow ?? '#d97706') : (colors.green ?? '#059669'),
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 0.4,
          }}>
            {typeLabel.toUpperCase()}
          </Text>
        </View>

        <Ionicons
          name={selected ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selected ? colors.primary : colors.text3}
        />
      </View>

      {/* Feature chips */}
      <View style={S.binMetaRow}>
        {bin.supportPhysicalCard && (
          <View style={[S.binMetaChip, { backgroundColor: colors.cardHover }]}>
            <Ionicons name="card-outline" size={10} color={colors.text2} />
            <Text style={[S.binMetaText, { color: colors.text2 }]}>Physical</Text>
          </View>
        )}
        {bin.verification?.threeDs && (
          <View style={[S.binMetaChip, { backgroundColor: colors.cardHover }]}>
            <Ionicons name="shield-checkmark-outline" size={10} color={colors.text2} />
            <Text style={[S.binMetaText, { color: colors.text2 }]}>3DS</Text>
          </View>
        )}
        {bin.extend?.isSupportGoogleWallet && (
          <View style={[S.binMetaChip, { backgroundColor: colors.cardHover }]}>
            <Ionicons name="logo-google" size={10} color={colors.text2} />
            <Text style={[S.binMetaText, { color: colors.text2 }]}>Google Pay</Text>
          </View>
        )}
        {bin.extend?.isSupportApplePay && (
          <View style={[S.binMetaChip, { backgroundColor: colors.cardHover }]}>
            <Ionicons name="logo-apple" size={10} color={colors.text2} />
            <Text style={[S.binMetaText, { color: colors.text2 }]}>Apple Pay</Text>
          </View>
        )}
      </View>

      {hasLimits && (
        <Text style={[S.binLimits, { color: colors.text3 }]}>
          Limits — day: {limits.day} · single: {limits.single} · lifetime: {limits.lifetime}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function CardModeOption({ option, selected, disabled, onPress, colors }: {
  option: typeof CARD_MODE_OPTIONS[number];
  selected: boolean; disabled?: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        S.optionCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={[S.optionIconBox, {
        backgroundColor: selected ? (colors.primaryDim ?? colors.cardHover) : colors.cardHover,
      }]}>
        <Ionicons name={option.icon as any} size={18} color={selected ? colors.primary : colors.text2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.optionTitle, { color: colors.text }]}>{option.label}</Text>
        <Text style={[S.optionSub, { color: colors.text2 }]}>
          {disabled ? 'Not available on this card form' : option.description}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={selected ? colors.primary : colors.text3}
      />
    </TouchableOpacity>
  );
}

function UseTypeOption({ option, selected, onPress, colors }: {
  option: typeof USE_TYPE_OPTIONS[number];
  selected: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        S.optionCard,
        { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <View style={[S.optionIconBox, {
        backgroundColor: selected ? (colors.primaryDim ?? colors.cardHover) : colors.cardHover,
      }]}>
        <Ionicons name={option.icon as any} size={18} color={selected ? colors.primary : colors.text2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.optionTitle, { color: colors.text }]}>{option.label}</Text>
        <Text style={[S.optionSub, { color: colors.text2 }]}>{option.description}</Text>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={selected ? colors.primary : colors.text3}
      />
    </TouchableOpacity>
  );
}

function CardPreview({ cardMode, label, holderName, isBudget, colors }: {
  cardMode?: CardMode; label?: string; holderName?: string; isBudget: boolean; colors: any;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - Spacing[4] * 2, 400);
  const cardHeight = cardWidth / 1.586;

  const design = cardMode === 'PHYSICAL_CARD' ? 'physical_metal' : 'virtual_black';
  const face = CARD_FACE[design as keyof typeof CARD_FACE] ?? CARD_FACE.virtual_black;

  return (
    <View style={[S.previewWrap, { marginHorizontal: Spacing[4] }]}>
      <LinearGradient
        colors={face.gradient as any}
        locations={face.gradientLocations as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[S.previewCard, { width: cardWidth, height: cardHeight }]}
      >
        {face.image && (
          <Image source={face.image} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
        )}

        {/* Top row */}
        <View style={S.previewTopRow}>
          <View style={[S.previewChip, { backgroundColor: face.chip }]} />
          <View style={[S.previewTypeTag, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons
              name={isBudget ? 'pie-chart-outline' : 'card-outline'}
              size={10}
              color={face.text}
            />
            <Text style={[S.previewTypeText, { color: face.text }]}>
              {isBudget ? 'BUDGET' : 'PREPAID'}
            </Text>
          </View>
        </View>

        {/* Card number placeholder */}
        <Text style={[S.previewNumber, { color: face.text }]}>•••• •••• •••• ••••</Text>

        {/* Bottom row */}
        <View style={S.previewBottomRow}>
          <View>
            <Text style={[S.previewLabelCaption, { color: face.text2 }]}>CARD LABEL</Text>
            <Text style={[S.previewLabel, { color: face.text }]} numberOfLines={1}>
              {label?.trim() || (holderName ? `${holderName}'s Card` : 'My Card')}
            </Text>
          </View>
          <Text style={[S.previewNetwork, { color: face.text }]}>
            {cardMode === 'PHYSICAL_CARD' ? 'PHYSICAL' : 'VIRTUAL'}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function KycStatusBadge({ status, colors }: { status: string; colors: any }) {
  const config: Record<string, any> = {
    approved: { bg: colors.greenDim, color: colors.green, icon: 'checkmark-circle', label: 'KYC Approved' },
    pending: { bg: colors.yellowDim ?? '#fef3c7', color: colors.yellow ?? '#d97706', icon: 'time-outline', label: 'KYC Pending' },
    rejected: { bg: colors.redDim, color: colors.red, icon: 'close-circle', label: 'KYC Rejected' },
  };
  const c = config[status] ?? { bg: colors.cardHover, color: colors.text2, icon: 'help-circle-outline', label: 'KYC Unknown' };

  return (
    <View style={[S.kycBadge, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon} size={13} color={c.color} />
      <Text style={{ color: c.color, fontSize: 11, fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}

function CardholderStatusPill({ status, colors }: { status: string; colors: any }) {
  const ready = CARDHOLDER_READY_STATUSES.includes(status);
  const c = ready
    ? { bg: colors.greenDim, color: colors.green, icon: 'checkmark-circle', label: 'Verified & ready' }
    : { bg: colors.yellowDim ?? '#fef3c7', color: colors.yellow ?? '#d97706', icon: 'time-outline', label: 'Verification in progress' };
  return (
    <View style={[S.kycBadge, { backgroundColor: c.bg }]}>
      <Ionicons name={c.icon as any} size={13} color={c.color} />
      <Text style={{ color: c.color, fontSize: 11, fontWeight: '700' }}>{c.label}</Text>
    </View>
  );
}

function ErrorBox({ message, colors }: { message: string; colors: any }) {
  return (
    <View style={[S.errorBox, { backgroundColor: colors.redDim, borderColor: colors.redBorder ?? colors.red }]}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
      <Text style={[S.errorText, { color: colors.red }]}>{message}</Text>
    </View>
  );
}

function InterlaceStatusGuard({ flowState, onBack, colors }: {
  flowState: string; onBack: () => void; colors: any;
}) {
  const messages: Record<string, { icon: string; title: string; subtitle: string }> = {
    kyc_pending: {
      icon: 'time-outline',
      title: 'KYC Under Review',
      subtitle: 'Your identity verification is in progress. We\'ll notify you once approved.',
    },
    kyc_rejected: {
      icon: 'close-circle-outline',
      title: 'KYC Rejected',
      subtitle: 'Your verification was rejected. Please contact support to proceed.',
    },
    kyc_not_started: {
      icon: 'shield-outline',
      title: 'KYC Required',
      subtitle: 'Please complete identity verification before creating a card.',
    },
    card_active: {
      icon: 'checkmark-circle-outline',
      title: 'Card Already Created',
      subtitle: 'You already have an active card.',
    },
  };
  const msg = messages[flowState] ?? messages.kyc_not_started;

  return (
    <View style={S.guardWrap}>
      <View style={[S.guardIconCircle, { backgroundColor: colors.cardHover }]}>
        <Ionicons name={msg.icon as any} size={40} color={colors.text3} />
      </View>
      <Text style={[S.guardTitle, { color: colors.text }]}>{msg.title}</Text>
      <Text style={[S.guardSubtitle, { color: colors.text2 }]}>{msg.subtitle}</Text>
      <TouchableOpacity
        style={[S.cta, { backgroundColor: colors.primary, paddingHorizontal: Spacing[8] }]}
        onPress={onBack}
      >
        <Text style={[S.ctaText, { color: '#fff' }]}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateCardScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { colors } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout();
  const { data: profileData } = useProfile();
  const prof = profileData as any;
  const accountId: string | undefined = prof?.interlaceAccountId;

  const { flowState, interlaceKycStatus } = useInterlaceStatus();

  const [wizardStep, setWizardStep] = useState<WizardStep>('bin');

  // ── Step 3: BIN ────────────────────────────────────────────────
  const { data: bins, isLoading: binsLoading } = useCardBins();
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBinId && bins?.length) setSelectedBinId(bins[0].binId);
  }, [bins, selectedBinId]);

  const selectedBin = useMemo(
    () => bins?.find(b => b.binId === selectedBinId) ?? null,
    [bins, selectedBinId]
  );

  const cardType = selectedBin ? binTypeToCardCreationType(selectedBin.type) : null;
  const isBudget = cardType === 'BUDGET';

  // ── Step 4: Cardholder ─────────────────────────────────────────
  const { data: existingCardholders, isLoading: cardholdersLoading } =
    useCardholders(wizardStep === 'cardholder');
  const createCardholder = useCreateCardholder();
  // const triggerKyc = useTriggerCardholderKyc();

  const [cardholder, setCardholder] = useState<CardholderInfo | null>(null);
  const [cardholderChecked, setCardholderChecked] = useState(false);
  const [cardholderError, setCardholderError] = useState<string | null>(null);

  useEffect(() => {
    if (wizardStep !== 'cardholder' || cardholder || cardholderChecked) return;
    if (cardholdersLoading) return;
    const reusable = (existingCardholders ?? []).find((c) => c.cardBinList?.includes(selectedBinId!));
    if (reusable) setCardholder(reusable);
    setCardholderChecked(true);
  }, [wizardStep, cardholder, cardholderChecked, cardholdersLoading, existingCardholders, selectedBinId]);

const handleCreateCardholder = async () => {
  if (!selectedBinId) return;
  setCardholderError(null);
  try {
    const initials = [prof?.firstName?.[0], prof?.lastName?.[0]]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();
    const created = await createCardholder.mutateAsync({
      binId: selectedBinId,
      cardholderTier: CARDHOLDER_TIER_DEFAULT,
      nameAbbreviation: initials || undefined,
      accountId,
    });
    setCardholder(created);
  } catch (err: any) {
    setCardholderError(
      err?.response?.data?.message ?? err?.message ?? 'Could not set up your cardholder profile. Please try again.'
    );
  }
};

  // ── Step 5: Issue ──────────────────────────────────────────────
  const createCard = useCreateCard();
  const createBudgetCard = useCreateBudgetCard();

  const [cardMode, setCardMode] = useState<CardMode>('VIRTUAL_CARD');
  const [useType, setUseType] = useState<string>(USE_TYPE_OPTIONS[0].value);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selectedBin && !selectedBin.supportPhysicalCard && cardMode === 'PHYSICAL_CARD') {
      setCardMode('VIRTUAL_CARD');
    }
  }, [selectedBin, cardMode]);

  const canSubmit =
    !!cardType && !!selectedBinId && !!cardholder &&
    (cardType === 'PREPAID' ? !!useType : !!selectedBudget);

  const handleCreate = async () => {
    if (!cardType || !selectedBinId || !cardholder) return;
    if (cardType === 'BUDGET' && !selectedBudget) {
      setError('Pick or create a budget first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const trimmedLabel = label.trim() || undefined;
      if (cardType === 'PREPAID') {
        await createCard.mutateAsync({
          binId: selectedBinId,
          cardholderId: cardholder.id,
          cardMode, useType,
          label: trimmedLabel,
          amount: amount ? Number(amount) : undefined,
          accountId,
        });
      } else {
        await createBudgetCard.mutateAsync({
          binId: selectedBinId,
          cardholderId: cardholder.id,
          cardMode,
          budgetId: selectedBudget!.id,
          label: trimmedLabel,
          accountId,
        });
      }
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Could not create your card. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (wizardStep === 'issue') { setWizardStep('cardholder'); return; }
    if (wizardStep === 'cardholder') { setWizardStep('bin'); return; }
    onBack();
  };

  // ── Guard ──────────────────────────────────────────────────────
  if (flowState !== 'kyc_approved_no_card') {
    return (
      <View style={[S.root, { backgroundColor: colors.bg }]}>
        <InterlaceStatusGuard flowState={flowState} onBack={onBack} colors={colors} />
      </View>
    );
  }

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing[4],
          paddingTop: insets.top ,
          paddingBottom: scrollPaddingBottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={S.header}>
          <TouchableOpacity
            onPress={goBack}
            hitSlop={12}
            style={[S.backBtn, { backgroundColor: colors.cardHover }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[S.title, { color: colors.text }]}>Create your card</Text>
            <Text style={[S.subtitle, { color: colors.text2 }]}>
              Three quick steps and your card is live
            </Text>
          </View>
          <KycStatusBadge status={interlaceKycStatus} colors={colors} />
        </View>

        {/* ── Progress ── */}
        <StepProgress current={wizardStep} colors={colors} />

        {/* ── Live preview ── */}
        <CardPreview
          cardMode={cardMode}
          label={label}
          holderName={prof?.firstName}
          isBudget={isBudget}
          colors={colors}
        />

        {/* ══════════════════════════════════════════════════════════
            STEP 3 — Choose BIN
            ══════════════════════════════════════════════════════ */}
        {wizardStep === 'bin' && (
          <View style={S.stepContainer}>
            <SectionTitle
              step={3}
              title="Choose card form"
              subtitle="Each card form is either a Prepaid BIN or a Budget BIN — this decides your card type in step 5."
              colors={colors}
            />

            {binsLoading ? (
              <View style={S.centerLoader}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[S.loaderText, { color: colors.text2 }]}>Loading card forms…</Text>
              </View>
            ) : !bins?.length ? (
              <View style={S.emptyState}>
                <Ionicons name="card-outline" size={40} color={colors.text3} />
                <Text style={[S.emptyText, { color: colors.text2 }]}>
                  No card forms available right now.
                </Text>
              </View>
            ) : (
              <View style={{ gap: Spacing[3] }}>
                {bins.map(bin => (
                  <BinOption
                    key={bin.binId}
                    bin={bin}
                    selected={bin.binId === selectedBinId}
                    onPress={() => setSelectedBinId(bin.binId)}
                    colors={colors}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[
                S.cta,
                { backgroundColor: selectedBinId ? colors.primary : colors.cardHover, marginTop: Spacing[6] },
              ]}
              activeOpacity={0.85}
              disabled={!selectedBinId}
              onPress={() => setWizardStep('cardholder')}
            >
              <Text style={[S.ctaText, { color: selectedBinId ? '#fff' : colors.text3 }]}>
                Continue
              </Text>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={selectedBinId ? '#fff' : colors.text3}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 4 — Cardholder
            ══════════════════════════════════════════════════════ */}
        {wizardStep === 'cardholder' && (
          <View style={S.stepContainer}>
            <SectionTitle
              step={4}
              title="Cardholder profile"
              subtitle="Created once and reused for every card on this BIN."
              colors={colors}
            />

            {(cardholdersLoading || (!cardholderChecked && !cardholder)) ? (
              <View style={S.centerLoader}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[S.loaderText, { color: colors.text2 }]}>Checking cardholder…</Text>
              </View>
            ) : cardholder ? (
              /* ── Existing cardholder found ── */
              <View style={[S.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={S.infoCardHeader}>
                  <View style={[S.binIcon, { backgroundColor: colors.iconTileBg ?? colors.cardHover }]}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.binTitle, { color: colors.text }]} numberOfLines={1}>
                      {cardholder.userName
                        || [cardholder.firstName, cardholder.lastName].filter(Boolean).join(' ')
                        || [prof?.firstName, prof?.lastName].filter(Boolean).join(' ')
                        || 'Cardholder profile'}
                    </Text>
                    <Text style={[S.binSub, { color: colors.text2 }]} numberOfLines={1}>
                      {cardholder.email ?? prof?.email}
                    </Text>
                  </View>
                </View>

                <CardholderStatusPill status={cardholder.status} colors={colors} />

                {!!cardholder.cardBinList?.length && (
                  <Text style={[S.hintText, { color: colors.text3 }]}>
                    Provisioned for {cardholder.cardBinList.length} BIN{cardholder.cardBinList.length > 1 ? 's' : ''} — reused instead of creating a duplicate.
                  </Text>
                )}
                {!CARDHOLDER_READY_STATUSES.includes(cardholder.status) && (
                  <Text style={[S.hintText, { color: colors.text3 }]}>
                    You can continue now — verification can finish in the background.
                  </Text>
                )}
              </View>
            ) : (
              /* ── No cardholder yet — create one ── */
              <View style={[S.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[S.binTitle, { color: colors.text, marginBottom: Spacing[3] }]}>
                  We'll set this up using your KYC details
                </Text>

                <View style={[S.profileRow, { borderColor: colors.borderSoft }]}>
                  <Ionicons name="person-outline" size={14} color={colors.text3} />
                  <Text style={[S.profileText, { color: colors.text2 }]}>
                    {[prof?.firstName, prof?.lastName].filter(Boolean).join(' ') || '—'}
                  </Text>
                </View>
                <View style={[S.profileRow, { borderColor: colors.borderSoft }]}>
                  <Ionicons name="mail-outline" size={14} color={colors.text3} />
                  <Text style={[S.profileText, { color: colors.text2 }]}>
                    {prof?.email ?? '—'}
                  </Text>
                </View>
                <View style={[S.profileRow, { borderColor: colors.borderSoft, borderBottomWidth: 0 }]}>
                  <Ionicons name="call-outline" size={14} color={colors.text3} />
                  <Text style={[S.profileText, { color: colors.text2 }]}>
                    {prof?.mobileCode ?? ''} {prof?.mobileNo ?? prof?.phone ?? '—'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[S.cta, { backgroundColor: colors.primary, marginTop: Spacing[4] }]}
                  activeOpacity={0.85}
                  onPress={handleCreateCardholder}
                  disabled={createCardholder.isPending}
                >
                  {createCardholder.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Text style={[S.ctaText, { color: '#fff' }]}>Create cardholder profile</Text>
                      </>}
                </TouchableOpacity>
              </View>
            )}

            {cardholderError && <ErrorBox message={cardholderError} colors={colors} />}

            {cardholder && (
              <TouchableOpacity
                style={[S.cta, { backgroundColor: colors.primary, marginTop: Spacing[5] }]}
                activeOpacity={0.85}
                onPress={() => setWizardStep('issue')}
              >
                <Text style={[S.ctaText, { color: '#fff' }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 5 — Issue the card
            ══════════════════════════════════════════════════════ */}
        {wizardStep === 'issue' && (
          <View style={S.stepContainer}>
            <SectionTitle
              step={5}
              title={`Set up your ${isBudget ? 'Budget' : 'Prepaid'} card`}
              subtitle={`${selectedBin?.network ?? ''} · ${(selectedBin?.currencies ?? []).join(', ')} — issues ${isBudget ? 'Budget' : 'Prepaid'} cards only.`}
              colors={colors}
            />

            {/* Card format */}
            <Text style={[S.fieldLabel, { color: colors.text2 }]}>Card format</Text>
            <View style={{ gap: Spacing[3], marginBottom: Spacing[5] }}>
              {CARD_MODE_OPTIONS.map(opt => (
                <CardModeOption
                  key={opt.value}
                  option={opt}
                  selected={cardMode === opt.value}
                  disabled={opt.value === 'PHYSICAL_CARD' && !selectedBin?.supportPhysicalCard}
                  onPress={() => setCardMode(opt.value)}
                  colors={colors}
                />
              ))}
            </View>

            {/* Budget card: budget picker */}
            {isBudget ? (
              <>
                <Text style={[S.fieldLabel, { color: colors.text2 }]}>Attach a budget</Text>
                <TouchableOpacity
                  onPress={() => setBudgetModalVisible(true)}
                  activeOpacity={0.85}
                  style={[
                    S.budgetSelector,
                    {
                      backgroundColor: colors.card,
                      borderColor: selectedBudget ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[S.binIcon, { backgroundColor: colors.iconTileBg ?? colors.cardHover }]}>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.binTitle, { color: colors.text }]}>
                      {selectedBudget ? selectedBudget.name : 'Select a budget'}
                    </Text>
                    <Text style={[S.binSub, { color: colors.text2 }]}>
                      {selectedBudget
                        ? `${selectedBudget.currency ?? 'USD'} ${selectedBudget.balance ?? '0.00'}`
                        : 'Tap to pick or create one'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.text3} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Prepaid: use type */}
                <Text style={[S.fieldLabel, { color: colors.text2 }]}>How will you use it?</Text>
                <View style={{ gap: Spacing[3], marginBottom: Spacing[5] }}>
                  {USE_TYPE_OPTIONS.map(opt => (
                    <UseTypeOption
                      key={opt.value}
                      option={opt}
                      selected={useType === opt.value}
                      onPress={() => setUseType(opt.value)}
                      colors={colors}
                    />
                  ))}
                </View>

                {/* Starting balance */}
                <Text style={[S.fieldLabel, { color: colors.text2 }]}>Starting balance (optional)</Text>
                <View style={[S.amountWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[S.amountPrefix, { color: colors.text2 }]}>$</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={colors.text3}
                    keyboardType="decimal-pad"
                    style={[S.amountInput, { color: colors.text }]}
                  />
                </View>
              </>
            )}

            {/* Card label */}
            <Text style={[S.fieldLabel, { color: colors.text2, marginTop: Spacing[4] }]}>
              Card label (optional)
            </Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Travel card, Groceries…"
              placeholderTextColor={colors.text3}
              maxLength={30}
              style={[S.labelInput, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }]}
            />

            {error && <ErrorBox message={error} colors={colors} />}

            <TouchableOpacity
              style={[
                S.cta,
                {
                  backgroundColor: canSubmit ? colors.primary : colors.cardHover,
                  marginTop: Spacing[6],
                  opacity: busy ? 0.8 : 1,
                },
              ]}
              activeOpacity={0.85}
              onPress={handleCreate}
              disabled={!canSubmit || busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons
                      name={isBudget ? 'pie-chart-outline' : 'card-outline'}
                      size={16}
                      color={canSubmit ? '#fff' : colors.text3}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[S.ctaText, { color: canSubmit ? '#fff' : colors.text3 }]}>
                      {isBudget ? 'Create Budget Card' : 'Create Prepaid Card'}
                    </Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BudgetPickerModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        onSelect={setSelectedBudget}
        selectedId={selectedBudget?.id}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: Typography.lg, fontWeight: '800', lineHeight: 22 },
  subtitle: { fontSize: Typography.xs, marginTop: 2 },

  // KYC badge
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing[3], paddingVertical: 5,
    borderRadius: Radius.full,
  },

  // Step section
  stepContainer: { marginTop: Spacing[2] },
  sectionTitle: { fontSize: Typography.base, fontWeight: '800' },
  sectionSubtitle: { fontSize: Typography.xs, marginTop: 4, lineHeight: 16 },
  stepBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // BIN card
  binCard: {
    padding: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  binIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  binTitle: { fontSize: Typography.sm, fontWeight: '700' },
  binSub: { fontSize: Typography.xs, marginTop: 2 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  binMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginTop: Spacing[3] },
  binMetaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
  },
  binMetaText: { fontSize: 10, fontWeight: '600' },
  binLimits: { fontSize: 10, marginTop: Spacing[2] },

  // Option cards (card mode / use type)
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1.5,
  },
  optionIconBox: {
    width: 38, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  optionTitle: { fontSize: Typography.sm, fontWeight: '700' },
  optionSub: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  // Cardholder info card
  infoCard: {
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1,
    marginBottom: Spacing[2],
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing[3], marginBottom: Spacing[3],
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileText: { fontSize: Typography.sm },
  hintText: { fontSize: Typography.xs, lineHeight: 17, marginTop: Spacing[3] },

  // Budget selector
  budgetSelector: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1.5,
    marginBottom: Spacing[4],
  },

  // Inputs
  fieldLabel: { fontSize: Typography.xs, fontWeight: '700', marginBottom: Spacing[2] },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing[4], marginBottom: Spacing[4],
  },
  amountPrefix: { fontSize: Typography.base, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: Typography.base, fontWeight: '700', paddingVertical: Spacing[3] },
  labelInput: {
    borderWidth: 1, borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    fontSize: Typography.sm,
  },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[4],
  },
  errorText: { fontSize: Typography.xs, fontWeight: '600', flex: 1, lineHeight: 17 },

  // CTA
  cta: {
    flexDirection: 'row',
    paddingVertical: Spacing[4], borderRadius: Radius.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontSize: Typography.base, fontWeight: '700' },

  // Card preview
  previewWrap: { marginBottom: Spacing[6], alignItems: 'center' },
  previewCard: { borderRadius: Radius['2xl'], padding: Spacing[5], justifyContent: 'space-between', overflow: 'hidden' },
  previewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  previewChip: { width: 38, height: 28, borderRadius: 6 },
  previewTypeTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full,
  },
  previewTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  previewNumber: { fontSize: Typography.md, fontWeight: '700', letterSpacing: 3, alignSelf: 'center' },
  previewBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  previewLabelCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  previewLabel: { fontSize: Typography.sm, fontWeight: '700', maxWidth: 180 },
  previewNetwork: { fontSize: Typography.base, fontWeight: '800', fontStyle: 'italic' },

  // Empty / loader states
  centerLoader: { alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[8] },
  loaderText: { fontSize: Typography.sm },
  emptyState: { alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[8] },
  emptyText: { fontSize: Typography.sm, textAlign: 'center' },

  // Guard screen
  guardWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing[8], gap: Spacing[4],
  },
  guardIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
  },
  guardTitle: { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center' },
  guardSubtitle: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
});

const SP = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[6] },
  stepCol: { alignItems: 'center', width: 72 },
  dot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  label: { fontSize: 10, textAlign: 'center' },
  line: { flex: 1, height: 1.5, marginBottom: 16 },
});