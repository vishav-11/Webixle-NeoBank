// CardModule/CardsScreen.tsx

import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, FlatList, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius, IconSize } from '@/styles/theme';
import { WebixleBrand } from '@/components/common/WebixleBrand';
import { useLayout } from '@/hooks/useLayout';

import {
  useCards, useCardReveal, useCardSummary, useFreezeCard, useUnfreezeCard,
  useCardModuleStage,
} from './hooks';
import { CARD_FACE, CARD_ASPECT, STATUS_META, MAX_CARDS_PER_USER } from './constants';
import type { CardInfo } from './types';

import KycWelcomeScreen from './screens/KycWelcomeScreen';
import KycFormScreen from './screens/KycFormScreen';
import KycPendingScreen from './screens/KycPendingScreen';
import CreateCardScreen from './screens/CreateCardScreen';
import CardPendingScreen from './screens/CardPendingScreen';
import ManageCardsScreen from './screens/ManageCardsScreen';
import FreezeConfirmModal from './components/FreezeConfirmModal';
import CardSettingsSheet from './components/CardSettingsSheet';
import SetPinModal from './components/SetPinModal';
import CardDetailsModal from './components/CardDetailsModal';
import SpendControlsModal from './components/SpendControlsModal';
import KycGuardScreen from './screens/KycGuardScreen';
import CardTransactionsScreen from './screens/CardTransactionsScreen';

const CARD_SIDE_MARGIN = 28;
const MAX_CARD_WIDTH = 460;
const MIN_CARD_HEIGHT = 210;
const MAX_CARD_HEIGHT = 360;

function extractAvailable(balance: any): string {
  if (balance !== null && typeof balance === 'object') {
    return parseFloat(balance.available ?? '0').toFixed(2);
  }
  if (balance != null) {
    return parseFloat(String(balance)).toFixed(2);
  }
  return '0.00';
}

function CardChip({ color }: { color: string }) {
  return (
    <View style={[cardFaceStyles.chip, { backgroundColor: color }]}>
      <View style={[cardFaceStyles.chipLine, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
    </View>
  );
}

function CardFace({ card, width, height }: { card: CardInfo; width: number; height: number }) {
  const face = CARD_FACE[card.design as keyof typeof CARD_FACE] ?? CARD_FACE.virtual_black;

  if (face.image) {
    return (
      <View style={[cardFaceStyles.imageCardClip, { width, height, borderRadius: Radius['2xl'] }]}>
        <Image source={face.image} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={face.gradient as any}
      locations={face.gradientLocations as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[cardFaceStyles.card, { width, height, padding: Spacing[5] }]}
    >
      <Ionicons
        name="wifi"
        size={20}
        color={face.contactless}
        style={{ alignSelf: 'center', transform: [{ rotate: '90deg' }] }}
      />
      <CardChip color={face.chip} />
      <View style={cardFaceStyles.logoRow}>
        <WebixleBrand color={face.text} size={19} />
      </View>
      {card.design === 'physical_metal' && (
        <Text style={[cardFaceStyles.legacy, { color: face.text2 }]}>{card.tierLabel}</Text>
      )}
      <View style={cardFaceStyles.bottom}>
        <Text style={[cardFaceStyles.visa, { color: face.text }]}>{card.network}</Text>
        <Text style={[cardFaceStyles.typeLabel, { color: face.text2 }]}>{card.typeLabel}</Text>
      </View>
    </LinearGradient>
  );
}

function StatusPill({ status, colors }: { status: string; colors: any }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as const };
  const toneColor =
    meta.tone === 'success' ? colors.green
      : meta.tone === 'pending' ? colors.orange
        : meta.tone === 'error' ? colors.red
          : colors.text2;
  const toneBg =
    meta.tone === 'success' ? colors.greenDim
      : meta.tone === 'pending' ? colors.orangeDim
        : meta.tone === 'error' ? colors.redDim
          : colors.cardHover;

  return (
    <View style={[P.pill, { backgroundColor: toneBg }]}>
      <View style={[P.dot, { backgroundColor: toneColor }]} />
      <Text style={[P.text, { color: toneColor }]}>{meta.label}</Text>
    </View>
  );
}

function ActionButton({ icon, iconSet, label, color, colors, onPress, loading }: {
  icon: string; iconSet: 'feather' | 'ionicons'; label: string;
  color: string; colors: any; onPress: () => void; loading?: boolean;
}) {
  const Icon = iconSet === 'feather' ? Feather : Ionicons;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={A.slot} disabled={loading}>
      <View style={[A.box, { backgroundColor: colors.cardHover }]}>
        {loading
          ? <ActivityIndicator size="small" color={color} />
          : <Icon name={icon as any} size={IconSize.sm} color={color} />}
      </View>
      <Text style={[A.label, { color: colors.text2 }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value, colors, last }: {
  label: string; value: React.ReactNode; colors: any; last?: boolean;
}) {
  const isTextValue = typeof value === 'string' || typeof value === 'number';
  return (
    <View style={[I.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
      <Text style={[I.label, { color: colors.text2 }]}>{label}</Text>
      {isTextValue
        ? <Text style={[I.value, { color: colors.text }]}>{value}</Text>
        : <View style={I.nodeValue}>{value}</View>}
    </View>
  );
}

// ── LiveCardsView ──────────────────────────────────────────────────
function LiveCardsView({ onAddCard, onManageCards, onViewTransactions }: {
  onAddCard: () => void;
  onManageCards: () => void;
  onViewTransactions: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const { scrollPaddingBottom, windowWidth } = useLayout();

  const pageWidth = windowWidth;
  const cardWidth = Math.min(pageWidth - CARD_SIDE_MARGIN * 2, MAX_CARD_WIDTH);
  const rawHeight = cardWidth / CARD_ASPECT;
  const cardHeight = Math.max(MIN_CARD_HEIGHT, Math.min(rawHeight, MAX_CARD_HEIGHT));

  const [activeIndex, setActiveIndex] = useState(0);
  const [infoVisible, setInfoVisible] = useState(false);
  const [freezeModalVisible, setFreezeModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [spendControlsVisible, setSpendControlsVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data: cardsData, isLoading: cardsLoading } = useCards();
  const cards = cardsData?.items ?? [];
  const activeCard = cards[activeIndex];
  const canAddCard = cards.length < MAX_CARDS_PER_USER;

  const { data: reveal, isFetching: revealLoading } =
    useCardReveal(activeCard?.id ?? '', infoVisible && !!activeCard);
  const revealData = reveal;

  const { data: summary } = useCardSummary(activeCard?.id ?? '', !!activeCard);

  const balanceDisplay = summary?.balance != null
    ? extractAvailable(summary.balance)
    : activeCard?.balanceUsd ?? '0.00';

  const freezeMutation = useFreezeCard();
  const unfreezeMutation = useUnfreezeCard();
  const isFrozen = activeCard?.status === 'FROZEN';
  const freezeBusy = freezeMutation.isPending || unfreezeMutation.isPending;

  const handleFreezeConfirm = () => {
    if (!activeCard) return;
    const mutation = isFrozen ? unfreezeMutation : freezeMutation;
    mutation.mutate(activeCard.id, { onSuccess: () => setFreezeModalVisible(false) });
  };

  const handleMomentumEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / pageWidth);
    setActiveIndex(Math.max(0, Math.min(idx, cards.length - 1)));
  };

  return (
    <View style={[R.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom, paddingTop: Spacing[4] }}
      >
        {/* ── Title row: "My Cards" + Add Card btn ── */}
        <View style={R.titleWrap}>
          <View style={R.titleSide} />

          <View style={R.titleCenter}>
            <Text style={[R.title, { color: colors.text }]}>My Cards</Text>
          </View>

          <View style={R.titleSide}>
            {canAddCard && (
              <TouchableOpacity
                onPress={onAddCard}
                activeOpacity={0.75}
                style={[R.addCardBtn, { borderColor: colors.border, backgroundColor: colors.cardHover }]}
              >
                <Text style={[R.addCardText, { color: colors.text }]}>Add Card</Text>
                <View style={[R.addCardIcon, { backgroundColor: colors.text }]}>
                  <Ionicons name="add" size={12} color={colors.bg} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Card carousel + footer ── */}
        {cardsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing[8] }} />
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={cards}
              keyExtractor={(c) => c.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              bounces={cards.length > 1}
              nestedScrollEnabled
              onMomentumScrollEnd={handleMomentumEnd}
              getItemLayout={(_, index) => ({
                length: pageWidth,
                offset: pageWidth * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={{
                  width: pageWidth,
                  height: cardHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CardFace card={item} width={cardWidth} height={cardHeight} />
                </View>
              )}
            />

            {/* ── Below card: dots + swipe hint OR single status pill ── */}
            <View style={R.cardFooter}>
              {cards.length > 1 ? (
                <>
                  <View style={R.dotsRow}>
                    {cards.map((c, i) => (
                      <TouchableOpacity
                        key={c.id}
                        hitSlop={8}
                        onPress={() => {
                          listRef.current?.scrollToOffset({ offset: pageWidth * i, animated: true });
                          setActiveIndex(i);
                        }}
                      >
                        <View style={[
                          R.dot,
                          { backgroundColor: i === activeIndex ? colors.text : colors.borderSoft },
                          i === activeIndex && R.dotActive,
                        ]} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[R.swipeHint, { color: colors.text3 }]}>Swipe to manage</Text>
                </>
              ) : (
                activeCard && <StatusPill status={activeCard.status} colors={colors} />
              )}
            </View>
          </>
        )}

        {/* ── Action buttons ── */}
        <View style={R.actionsRow}>
          <ActionButton icon="arrow-down" iconSet="feather" label="Top Up" color={colors.blue} colors={colors} onPress={() => router.push('/(screens)/Buy' as any)} />
          <ActionButton icon="arrow-up" iconSet="feather" label="Send" color={colors.primary} colors={colors} onPress={() => router.push('/(screens)/send' as any)} />
          <ActionButton
            icon="list"
            iconSet="feather"
            label="History"
            color={colors.text2}
            colors={colors}
            onPress={onViewTransactions}
          />
          <ActionButton
            icon={isFrozen ? 'sunny-outline' : 'snow-outline'}
            iconSet="ionicons"
            label={isFrozen ? 'Unfreeze' : 'Freeze'}
            color={colors.accent}
            colors={colors}
            onPress={() => setFreezeModalVisible(true)}
            loading={freezeBusy}
          />
          <ActionButton icon="settings" iconSet="feather" label="Settings" color={colors.text2} colors={colors} onPress={() => setSettingsVisible(true)} />
        </View>

        {/* ── Card information ── */}
        <View style={R.infoHeader}>
          <Text style={[R.infoTitle, { color: colors.text }]}>Card Information</Text>
          <TouchableOpacity style={R.showInfoBtn} onPress={() => setInfoVisible((v) => !v)} hitSlop={8}>
            <Ionicons name={infoVisible ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.text2} />
            <Text style={[R.showInfoText, { color: colors.text2 }]}>
              {infoVisible ? 'Hide info' : 'Show info'}
            </Text>
          </TouchableOpacity>
        </View>

        {activeCard && (
          <View style={[R.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: Spacing[4] }]}>
            <InfoRow label="Balance" colors={colors} value={`$ ${balanceDisplay}`} />
            <InfoRow
              label="Card number"
              colors={colors}
              value={infoVisible && revealData ? revealData.fullNumber : activeCard.maskedNumber}
            />
            <InfoRow
              label="Expires in"
              colors={colors}
              value={infoVisible && revealData
                ? `${revealData.expiryMonth} / ${revealData.expiryYear}`
                : '** / **'}
            />
            <InfoRow
              label="CVV"
              colors={colors}
              last
              value={
                !infoVisible
                  ? '***'
                  : revealLoading
                    ? <ActivityIndicator size="small" color={colors.text2} />
                    : (revealData?.cvv ?? '***')
              }
            />
          </View>
        )}
      </ScrollView>

      <FreezeConfirmModal
        visible={freezeModalVisible}
        isFrozen={isFrozen}
        cardLabel={activeCard?.label || activeCard?.typeLabel}
        onConfirm={handleFreezeConfirm}
        onClose={() => setFreezeModalVisible(false)}
        loading={freezeBusy}
      />
      <CardSettingsSheet
        visible={settingsVisible}
        card={activeCard ?? null}
        onClose={() => setSettingsVisible(false)}
        onSetPin={() => setPinModalVisible(true)}
        onViewDetails={() => setDetailsModalVisible(true)}
        onSpendControls={() => setSpendControlsVisible(true)}
        onManageCards={onManageCards}
      />
      <SetPinModal visible={pinModalVisible} card={activeCard ?? null} onClose={() => setPinModalVisible(false)} />
      <CardDetailsModal visible={detailsModalVisible} card={activeCard ?? null} onClose={() => setDetailsModalVisible(false)} />
      <SpendControlsModal visible={spendControlsVisible} card={activeCard ?? null} onClose={() => setSpendControlsVisible(false)} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function CardsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    stage,
    message,
    isLoading,
    accountCreateError,
    retryCreateAccount,
    refetch,
  } = useCardModuleStage();

  const [kycGateState, setKycGateState] = useState<'idle' | 'welcome' | 'form'>('idle');
  const [kycJustSubmitted, setKycJustSubmitted] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [managingCards, setManagingCards] = useState(false);
  const [viewingTransactions, setViewingTransactions] = useState(false);

  useEffect(() => {
    if (stage !== 'kyc_required' && stage !== 'kyc_rejected') setKycGateState('idle');
    if (stage !== 'has_cards') {
      setAddingCard(false);
      setManagingCards(false);
      setViewingTransactions(false);
    }
    if (stage === 'kyc_pending' || stage === 'kyc_approved_no_card' || stage === 'has_cards') {
      setKycJustSubmitted(false);
    }
  }, [stage]);

  if (isLoading || stage === 'loading') {
    return (
      <View style={[R.root, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (stage === 'account_create_error') {
    return (
      <View style={[R.root, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[6] }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.red} style={{ marginBottom: Spacing[4] }} />
        <Text style={{ fontSize: Typography.lg, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: Spacing[2] }}>
          Account Setup Failed
        </Text>
        <Text style={{ fontSize: Typography.sm, color: colors.text2, textAlign: 'center', marginBottom: Spacing[6], lineHeight: 20 }}>
          {accountCreateError}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, paddingVertical: Spacing[4], paddingHorizontal: Spacing[8], borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={retryCreateAccount}
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.base }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (stage === 'main_kyc_required') return <KycGuardScreen />;

  if (kycJustSubmitted) {
    return (
      <KycPendingScreen
        onBack={() => router.back()}
        onRetry={() => { setKycJustSubmitted(false); setKycGateState('welcome'); }}
      />
    );
  }

  if (stage === 'kyc_required' || stage === 'kyc_rejected') {
    if (kycGateState === 'form') {
      return (
        <KycFormScreen
          onBack={() => setKycGateState('welcome')}
          onSubmitted={() => { setKycJustSubmitted(true); setKycGateState('idle'); refetch(); }}
        />
      );
    }
    return <KycWelcomeScreen onBack={() => router.back()} onStart={() => setKycGateState('form')} />;
  }

 if (stage === 'kyc_pending') {
  return (
    <KycPendingScreen
      onBack={() => router.back()}
      onRetry={() => setKycGateState('welcome')}
      onApproved={() => {
        // stage automatically 'kyc_approved_no_card' ho jayega
        // profile invalidate already KycPendingScreen ne kar di
        // bas refetch trigger karo
        console.log('[CardsScreen] KYC approved callback → refetch');
        refetch();
      }}
    />
  );
}

// kycJustSubmitted wala screen bhi
if (kycJustSubmitted) {
  return (
    <KycPendingScreen
      onBack={() => router.back()}
      onRetry={() => { 
        setKycJustSubmitted(false); 
        setKycGateState('welcome'); 
      }}
      onApproved={() => {      
        setKycJustSubmitted(false);
        refetch();
      }}
    />
  );
}

  if (stage === 'kyc_approved_no_card') {
    return <CreateCardScreen onBack={() => router.back()} onCreated={() => refetch()} />;
  }

  if (stage === 'card_pending') {
    return <CardPendingScreen onBack={() => router.back()} />;
  }

  if (stage === 'has_cards') {
    if (addingCard) {
      return (
        <CreateCardScreen
          onBack={() => setAddingCard(false)}
          onCreated={() => { setAddingCard(false); refetch(); }}
        />
      );
    }
    if (managingCards) {
      return <ManageCardsScreen onBack={() => setManagingCards(false)} />;
    }
    if (viewingTransactions) {
      return <CardTransactionsScreen onBack={() => setViewingTransactions(false)} />;
    }
    return (
      <LiveCardsView
        onAddCard={() => setAddingCard(true)}
        onManageCards={() => setManagingCards(true)}
        onViewTransactions={() => setViewingTransactions(true)}
      />
    );
  }

  return (
    <LiveCardsView
      onAddCard={() => setAddingCard(true)}
      onManageCards={() => setManagingCards(true)}
      onViewTransactions={() => setViewingTransactions(true)}
    />
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const cardFaceStyles = StyleSheet.create({
  card: { borderRadius: Radius['2xl'], justifyContent: 'space-between' },
  imageCardClip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chip: { width: 42, height: 32, borderRadius: Radius.sm, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  chipLine: { width: '70%', height: 1.5, borderRadius: 1 },
  logoRow: { alignItems: 'center', marginTop: Spacing[4] },
  legacy: { fontSize: 10, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginTop: 4 },
  bottom: { alignItems: 'flex-end' },
  visa: { fontSize: Typography.md, fontWeight: '800', fontStyle: 'italic' },
  typeLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginTop: 2 },
});

const P = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing[3], paddingVertical: 5, borderRadius: Radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

const R = StyleSheet.create({
  root: { flex: 1 },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[5],
  },
  titleSide: { width: 100, alignItems: 'flex-end' },
  titleCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: Typography.xl, fontWeight: '800' },
  subtitle: { fontSize: Typography.sm },
  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingLeft: Spacing[3], paddingRight: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  addCardText: { fontSize: Typography.xs, fontWeight: '600' },
  addCardIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { alignItems: 'center', marginTop: Spacing[4], gap: Spacing[2] },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16 },
  swipeHint: { fontSize: Typography.xs, fontWeight: '500' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing[4], marginTop: Spacing[6] },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], marginTop: Spacing[6], marginBottom: Spacing[3] },
  infoTitle: { fontSize: Typography.base, fontWeight: '700' },
  showInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  showInfoText: { fontSize: Typography.xs, fontWeight: '600' },
  infoCard: { marginHorizontal: Spacing[4], borderRadius: Radius.xl, borderWidth: 1, paddingHorizontal: Spacing[4] },
});

const A = StyleSheet.create({
  slot: { alignItems: 'center', gap: Spacing[2], width: 60 },
  box: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

const I = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[4] },
  label: { fontSize: Typography.sm, fontWeight: '500' },
  value: { fontSize: Typography.sm, fontWeight: '700' },
  nodeValue: { alignItems: 'flex-end', justifyContent: 'center' },
});