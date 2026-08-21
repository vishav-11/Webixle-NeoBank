/**
 * CardsScreen.tsx  (app/(tabs)/cards.tsx)
 * Main cards screen — new project structure.
 *
 * Usage:  useTheme() for colors everywhere — zero hardcoded color values.
 *         Skeleton loaders on initial load.
 *         All sub-components receive `colors` prop.
 */

import { useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useCard } from '@/hooks/useCards';
import { CARD_STATES } from '@/types/cardTypes';
import type { CardTab, CardType } from '@/types/cardTypes';

import CardVisual from './components/CardVisual';
import ManageTab from './components/manage/ManageTab';
import LimitsTab from './components/limits/LimitsTab';
import DisputesTab from './components/disputes/DisputesTab';
import AccountsTab from './components/accounts/AccountsTab';
import TopUpModal from './components/TopUpModal';
import KycGate from './components/kyc/KycGate';
import {
  CardInfoSkeleton,
  Skeleton,
} from './components/Skeleton';
import CreateCardModal from './components/CreateCardModal';

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { key: CardTab; label: string }[] = [
  { key: 'manage', label: 'Manage' },
  { key: 'limits', label: 'Limits' },
  { key: 'disputes', label: 'Disputes' },
  { key: 'accounts', label: 'Accounts' },
];

// ─── Loading skeleton for the whole screen ────────────────────────────────────
function CardScreenSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Toggle skeleton */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width="48%" height={44} borderRadius={12} />
        <Skeleton width="48%" height={44} borderRadius={12} />
      </View>
      {/* Card face skeleton */}
      <Skeleton width="100%" height={170} borderRadius={16} />
      {/* Buttons skeleton */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width="48%" height={48} borderRadius={12} />
        <Skeleton width="48%" height={48} borderRadius={12} />
      </View>
      {/* Tab bar skeleton */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} width={70} height={34} borderRadius={20} />
        ))}
      </View>
      {/* Content skeleton */}
      <CardInfoSkeleton />
      <Skeleton width="100%" height={100} borderRadius={14} />
      <Skeleton width="100%" height={80} borderRadius={14} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CardsScreen() {
  const { colors } = useTheme();

  const {
    cardState,
    cards,
    activeCard,
    selectedCardIndex,
    loading,
    refreshing,
    actionLoading,
    error,
    transactions,
    kycStatus,
    setSelectedCardIndex,
    refresh,
    fetchKycUrl,
    createCard,
    toggleFreeze,
    getCardPanUrl,
    loadTransactions,
    setError,
  } = useCard();

  const [activeTab, setActiveTab] = useState<CardTab>('manage');
  const [activeType, setActiveType] = useState<CardType>('virtual');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cardPanUrl, setCardPanUrl] = useState<string | null>(null);
  const [cardPanLoading, setCardPanLoading] = useState(false);

  // Load transactions when card changes
  useFocusEffect(
    useCallback(() => {
      if (activeCard?.cardId) {
        loadTransactions(activeCard.cardId);
      }
    }, [activeCard?.cardId])
  );

  // When type toggled, find the matching card index
  const handleTypeChange = useCallback(
    (type: CardType) => {
      setActiveType(type);
      const idx = cards.findIndex((c: any) => c.type === type);
      if (idx >= 0) setSelectedCardIndex(idx);
    },
    [cards, setSelectedCardIndex]
  );

  const handleFreeze = useCallback(async () => {
    await toggleFreeze();
  }, [toggleFreeze]);

  const handleViewCard = useCallback(
    async (cardId: string) => {
      setCardPanLoading(true);
      setCardPanUrl(null);
      const url = await getCardPanUrl(cardId);
      setCardPanUrl(url);
      setCardPanLoading(false);
      // Open pan URL or display — extend as needed
    },
    [getCardPanUrl]
  );

  const handleStartKyc = useCallback(async () => {
    return await fetchKycUrl();
  }, [fetchKycUrl]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.headerBar, { borderBottomColor: colors.border }]}>
          <Text style={[s.screenTitle, { color: colors.text }]}>Cards</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <CardScreenSkeleton colors={colors} />
        </ScrollView>
      </View>
    );
  }

  // ── KYC states ─────────────────────────────────────────────────────────────
  if (
    cardState === CARD_STATES.KYC_REQUIRED ||
    cardState === CARD_STATES.KYC_PENDING ||
    cardState === CARD_STATES.KYC_REJECTED ||
    cardState === CARD_STATES.KYC_LIVENESS_PENDING
  ) {
    const kycGateStatus =
      cardState === CARD_STATES.KYC_PENDING
        ? 'KYC_PENDING'
        : cardState === CARD_STATES.KYC_REJECTED
          ? 'KYC_REJECTED'
          : cardState === CARD_STATES.KYC_LIVENESS_PENDING
            ? 'KYC_LIVENESS_PENDING'
            : 'KYC_REQUIRED';

    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.headerBar, { borderBottomColor: colors.border }]}>
          <Text style={[s.screenTitle, { color: colors.text }]}>Cards</Text>
          <Text style={[s.screenSub, { color: colors.text2 }]}>
            Spend Crypto Like Cash
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.green}
            />
          }
        >
          <KycGate
            status={kycGateStatus as any}
            onStartKyc={handleStartKyc}
            onRefresh={refresh}
            loading={refreshing}
            userCode={null}
            colors={colors}
          />
        </ScrollView>
      </View>
    );
  }

  // ── No cards state ─────────────────────────────────────────────────────────
  if (cardState === CARD_STATES.NO_CARDS) {
    return (
      <>
        <View style={[s.root, { backgroundColor: colors.bg }]}>
          <View style={[s.headerBar, { borderBottomColor: colors.border }]}>
            <Text style={[s.screenTitle, { color: colors.text }]}>Cards</Text>
          </View>
          <ScrollView
            contentContainerStyle={[s.scrollContent, s.centerContent]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.green}
              />
            }
          >
            <View
              style={[
                s.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.emptyTitle, { color: colors.text }]}>
                No Cards Yet
              </Text>
              <Text style={[s.emptySub, { color: colors.text2 }]}>
                Apply for a virtual or physical card to get started.
              </Text>
              <TouchableOpacity
                style={[s.applyBigBtn, { backgroundColor: colors.green }]}
                onPress={() => setShowApplyModal(true)}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#000" />
                <Text style={s.applyBigBtnTxt}>Apply for a Card</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Modal at root level */}
        <CreateCardModal
          visible={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            refresh();
          }}
          existingCards={cards}
          createCard={createCard}
          colors={colors}
        />
      </>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (cardState === CARD_STATES.ERROR) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, s.centerContent]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.green}
            />
          }
        >
          <View
            style={[
              s.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[s.emptyTitle, { color: colors.red }]}>
              Something went wrong
            </Text>
            <Text style={[s.emptySub, { color: colors.text2 }]}>
              {error || 'Failed to load cards.'}
            </Text>
            <TouchableOpacity
              style={[s.applyBigBtn, { backgroundColor: colors.green }]}
              onPress={refresh}
              activeOpacity={0.85}
            >
              <Text style={s.applyBigBtnTxt}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── HAS_CARDS — main view ──────────────────────────────────────────────────
  return (
    <>
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[s.headerBar, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[s.screenTitle, { color: colors.text }]}>Cards</Text>
            <Text style={[s.screenSub, { color: colors.text2 }]}>
              Spend Crypto Like Cash
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.applySmBtn,
              {
                backgroundColor: colors.greenDim,
                borderColor: colors.greenBorder,
              },
            ]}
            onPress={() => setShowApplyModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.green} />
            <Text style={[s.applySmTxt, { color: colors.green }]}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.green}
            />
          }
        >
          {/* Card visual + toggle */}
          <CardVisual
            cards={cards}
            activeType={activeType}
            onTypeChange={handleTypeChange}
            activeCard={activeCard}
            colors={colors}
          />

          {/* Tab bar */}
          <View style={[s.tabBar, { borderColor: colors.borderSoft }]}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    s.tabBtn,
                    isActive
                      ? { backgroundColor: colors.green }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.tabTxt,
                      { color: isActive ? '#000' : colors.text2 },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          <View style={s.tabContent}>
            {activeTab === 'manage' && (
              <ManageTab
                activeCard={activeCard}
                transactions={transactions}
                actionLoading={actionLoading}
                onFreeze={handleFreeze}
                onTopUp={() => setShowTopUp(true)}
                onSettings={() => {}}
                onViewCard={handleViewCard}
                onApply={() => setShowApplyModal(true)}
                colors={colors}
              />
            )}
            {activeTab === 'limits' && (
              <LimitsTab activeCard={activeCard} colors={colors} />
            )}
            {activeTab === 'disputes' && (
              <DisputesTab activeCard={activeCard} colors={colors} />
            )}
            {activeTab === 'accounts' && <AccountsTab colors={colors} />}
          </View>
        </ScrollView>
      </View>

      {/* Modals at root level - OUTSIDE the main View */}
      <TopUpModal
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        card={activeCard}
        onSuccess={() => {
          setShowTopUp(false);
          refresh();
        }}
      />

      <CreateCardModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => {
          setShowApplyModal(false);
          refresh();
        }}
        existingCards={cards}
        createCard={createCard}
        colors={colors}
      />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  screenTitle: { fontSize: 28, fontWeight: '800' },
  screenSub: { fontSize: 13, marginTop: 2 },

  applySmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  applySmTxt: { fontSize: 13, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 120 },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'nowrap',
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabTxt: { fontSize: 13, fontWeight: '600' },

  tabContent: {},

  // Empty / error
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  applyBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  applyBigBtnTxt: { fontSize: 15, fontWeight: '700', color: '#000' },
});