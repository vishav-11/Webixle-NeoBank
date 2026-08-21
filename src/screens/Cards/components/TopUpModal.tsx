/**
 * TopUpModal.tsx - Complete rewrite for proper mobile bottom sheet
 */

import { router } from 'expo-router';
import {
  AlertTriangle, ArrowRight, Check, ChevronDown, ChevronLeft,
  CreditCard, DollarSign, Info, RefreshCw, Search, Shield,
  Wallet, X, Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import cardService from '@/services/cardService';
import { BalanceSkeleton, NetworkSelectorSkeleton, Skeleton } from './Skeleton';
import { walletService } from '@/services/walletService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Modal takes up this much of screen
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;

const IS_WEB = Platform.OS === 'web';
const IS_IOS = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';

// Safe bottom inset
const BOTTOM_SAFE = IS_IOS ? 34 : 0;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SupportedBlockchain {
  id: string;
  name: string;
  native_currency?: string;
  image?: { small?: string };
}
interface Asset {
  _id?: string;
  id?: string;
  symbol?: string;
  name?: string;
}
type FundingSource = 'wallet' | 'credit';
interface Props {
  isOpen: boolean;
  onClose: () => void;
  card: any;
  onSuccess?: () => void;
  creditAvailable?: number;
  creditLimit?: number;
  onCreditTopUp?: (amount: number) => Promise<boolean>;
}

// ─── Chain helpers ──────────────────────────────────────────────────────────────
function getChainIdFromBlockchain(id: string): string {
  const map: Record<string, string> = {
    ethereum: 'ETH', eth: 'ETH', bsc: 'BSC', binance: 'BSC',
    tron: 'TRON', trx: 'TRON', bitcoin: 'BTC', btc: 'BTC',
    polygon: 'POLYGON', matic: 'POLYGON', arbitrum: 'ARBITRUM',
    optimism: 'OPTIMISM', avalanche: 'AVAX', avax: 'AVAX',
    solana: 'SOL', sol: 'SOL', base: 'BASE',
  };
  return map[id?.toLowerCase()] ?? id?.toUpperCase() ?? '';
}
function getBlockchainType(id: string): string {
  const map: Record<string, string> = {
    ethereum: 'ETH', eth: 'ETH', bsc: 'BSC', binance: 'BSC',
    tron: 'TRC20', trx: 'TRC20', bitcoin: 'BTC', btc: 'BTC',
    polygon: 'MATIC', matic: 'MATIC', arbitrum: 'ARBITRUM',
    optimism: 'OPTIMISM', avalanche: 'AVAX', avax: 'AVAX',
    solana: 'SOL', sol: 'SOL', base: 'BASE',
  };
  return map[id?.toLowerCase()] ?? id?.toUpperCase() ?? '';
}

// ─── Haptics ───────────────────────────────────────────────────────────────────
let Haptics: any = {
  impactAsync: () => {},
  notificationAsync: () => {},
  ImpactFeedbackStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationFeedbackType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
};
if (!IS_WEB) { try { Haptics = require('expo-haptics'); } catch {} }

// ─── Constants ─────────────────────────────────────────────────────────────────
const TOPUP_FEE_PERCENT = 1.5;
const MIN_TOPUP = 10;
const MAX_TOPUP = 10_000;
const QUICK_AMOUNTS = [50, 100, 250, 500] as const;
const CHAIN_COLORS: Record<string, string> = {
  ETH: '#627EEA', BSC: '#F0B90B', TRON: '#FF0013', BTC: '#F7931A',
  POLYGON: '#8247E5', ARBITRUM: '#28A0F0', OPTIMISM: '#FF0420',
  AVAX: '#E84142', SOL: '#9945FF', BASE: '#0052FF',
};
const getChainColor = (id?: string) => CHAIN_COLORS[id?.toUpperCase() || ''] || '#3B82F6';

// ─── parseBalance ──────────────────────────────────────────────────────────────
const parseBalance = (data: any): number => {
  if (!data) return 0;
  const b = data.availableBalance ?? data.balance ?? data.amount ?? 0;
  if (typeof b === 'number') return isNaN(b) ? 0 : b;
  if (typeof b === 'string') {
    const clean = b.replace(/[,\s]/g, '');
    if (!clean.includes('.') && /^\d+$/.test(clean) && clean.length >= 18)
      return parseFloat(clean) / 1e18 || 0;
    return parseFloat(clean) || 0;
  }
  return 0;
};

// ─── Animation components ──────────────────────────────────────────────────────
function FadeInView({ children, duration = 300, style }: {
  children: React.ReactNode; duration?: number; style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

function ZoomInView({ children, style }: { children: React.ReactNode; style?: any }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

const SpinningLoader = React.memo(({ size = 56, color }: { size?: number; color: string }) => {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 1000, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 3, borderColor: color, borderTopColor: 'transparent',
      transform: [{ rotate: spin }],
    }} />
  );
});

// ─── Sub components ────────────────────────────────────────────────────────────
const NetworkDropdownItem = React.memo(({
  chain, isSelected, onSelect, colors,
}: { chain: SupportedBlockchain; isSelected: boolean; onSelect: () => void; colors: any }) => {
  const id = getChainIdFromBlockchain(chain.id);
  const color = getChainColor(id);
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={[s.dropItem, isSelected && { backgroundColor: colors.greenDim }]}
    >
      <View style={s.dropItemLeft}>
        {chain.image?.small
          ? <Image source={{ uri: chain.image.small }} style={s.chainImg} />
          : (
            <View style={[s.chainPlaceholder, { backgroundColor: color + '25' }]}>
              <Text style={[s.chainPlaceholderTxt, { color }]}>
                {chain.native_currency?.[0] || chain.name?.[0]}
              </Text>
            </View>
          )}
        <View>
          <Text style={[s.dropItemName, { color: colors.text }]}>{chain.name}</Text>
          <Text style={[s.dropItemId, { color: colors.text3 }]}>{id}</Text>
        </View>
      </View>
      {isSelected && <Check size={16} color={colors.green} />}
    </TouchableOpacity>
  );
});

const FundingSourceSelector = React.memo(({
  selected, onSelect, creditAvailable, colors,
}: { selected: FundingSource; onSelect: (s: FundingSource) => void; creditAvailable?: number; colors: any }) => {
  const hasCreditLine = (creditAvailable ?? 0) > 0;
  return (
    <View style={s.fundingWrap}>
      <Text style={[s.sectionLabel, { color: colors.text2, marginBottom: 8 }]}>Funding Source</Text>
      <View style={s.fundingRow}>
        <TouchableOpacity
          style={[s.fundingOption, {
            backgroundColor: colors.card,
            borderColor: selected === 'wallet' ? colors.green : colors.border,
          }]}
          onPress={() => onSelect('wallet')}
          activeOpacity={0.7}
        >
          <Wallet size={20} color={selected === 'wallet' ? colors.green : colors.text2} />
          <Text style={[s.fundingTxt, { color: selected === 'wallet' ? colors.green : colors.text2 }]}>Wallet</Text>
          <Text style={[s.fundingSub, { color: colors.text3 }]}>USDT Balance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.fundingOption, {
            backgroundColor: colors.card,
            borderColor: selected === 'credit' ? colors.purple : colors.border,
          }, !hasCreditLine && { opacity: 0.45 }]}
          onPress={() => hasCreditLine && onSelect('credit')}
          activeOpacity={hasCreditLine ? 0.7 : 1}
          disabled={!hasCreditLine}
        >
          <Shield size={20} color={selected === 'credit' ? colors.purple : colors.text2} />
          <Text style={[s.fundingTxt, { color: selected === 'credit' ? colors.purple : colors.text2 }]}>Credit</Text>
          {hasCreditLine
            ? <Text style={[s.fundingSub, { color: colors.text3 }]}>${(creditAvailable ?? 0).toFixed(0)} avail.</Text>
            : <Text style={[s.fundingSub, { color: colors.text3 }]}>No credit</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function TopUpModal({
  isOpen, onClose, card, onSuccess,
  creditAvailable = 0, creditLimit = 0, onCreditTopUp,
}: Props) {
  const { colors } = useTheme();

  // Slide animation
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [fundingSource, setFundingSource] = useState<FundingSource>('wallet');
  const [amount, setAmount] = useState('');
  const [blockchains, setBlockchains] = useState<SupportedBlockchain[]>([]);
  const [selectedChain, setSelectedChain] = useState<SupportedBlockchain | null>(null);
  const [usdtAsset, setUsdtAsset] = useState<Asset | null>(null);
  const [usdtNotFound, setUsdtNotFound] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [chainSearch, setChainSearch] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletSymbol, setWalletSymbol] = useState('USDT');
  const [loadingChains, setLoadingChains] = useState(false);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [showInsuffModal, setShowInsuffModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // ── Open / Close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Small delay so modal mounts before animating
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 30,
            stiffness: 250,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        // Reset state after close
        setStep(1); setFundingSource('wallet'); setAmount('');
        setSelectedChain(null); setUsdtAsset(null); setUsdtNotFound(false);
        setShowDropdown(false); setChainSearch(''); setWalletBalance(0);
        setWalletSymbol('USDT'); setShowInsuffModal(false);
        setProcessing(false); setSuccess(false); setError('');
      });
    }
  }, [isOpen]);

  // Fetch blockchains on open
  useEffect(() => {
    if (isOpen && !blockchains.length) fetchBlockchains();
  }, [isOpen]);

  useEffect(() => {
    if (selectedChain && fundingSource === 'wallet') fetchUSDTAsset(selectedChain);
  }, [selectedChain, fundingSource]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const num = parseFloat(amount) || 0;
  const fee = fundingSource === 'credit' ? 0 : num * (TOPUP_FEE_PERCENT / 100);
  const totalDeduct = num + fee;
  const isValidAmt = num >= MIN_TOPUP && num <= MAX_TOPUP;
  const hasSufficient = fundingSource === 'credit'
    ? creditAvailable >= num
    : walletBalance >= totalDeduct;

  const canConfirm = useMemo(() => {
    if (!isValidAmt) return false;
    if (fundingSource === 'credit') return creditAvailable >= num;
    return !!selectedChain && !!usdtAsset && !loadingAsset && !loadingBalance;
  }, [isValidAmt, fundingSource, creditAvailable, num, selectedChain, usdtAsset, loadingAsset, loadingBalance]);

  const buttonText = useMemo(() => {
    if (fundingSource === 'credit') {
      if (!isValidAmt) return 'Enter Valid Amount';
      if (creditAvailable < num) return 'Insufficient Credit';
      return 'Top Up from Credit';
    }
    if (!selectedChain) return 'Select Network';
    if (!usdtAsset) return 'USDT Not Available';
    if (!isValidAmt) return 'Enter Valid Amount';
    if (hasSufficient) return 'Confirm Top Up';
    return 'Insufficient Balance';
  }, [fundingSource, isValidAmt, selectedChain, usdtAsset, hasSufficient, creditAvailable, num]);

  // ── API calls ───────────────────────────────────────────────────────────────
  const fetchBlockchains = useCallback(async () => {
    setLoadingChains(true);
    try {
      const res = await walletService.getSupportedBlockchains() as any;
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setBlockchains(list);
    } catch { setBlockchains([]); }
    finally { setLoadingChains(false); }
  }, []);

  const fetchUSDTAsset = useCallback(async (chain: SupportedBlockchain) => {
    setLoadingAsset(true); setUsdtNotFound(false); setUsdtAsset(null); setWalletBalance(0);
    try {
      const res = await walletService.getAssetsByChain(getChainIdFromBlockchain(chain.id)) as any;
      const assets: Asset[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      const usdt = assets.find((a: Asset) => a.symbol?.toUpperCase() === 'USDT');
      if (usdt) { setUsdtAsset(usdt); await fetchWalletBalance(chain, usdt); }
      else { setUsdtAsset(null); setUsdtNotFound(true); }
    } catch { setUsdtAsset(null); setUsdtNotFound(true); }
    finally { setLoadingAsset(false); }
  }, []);

  const fetchWalletBalance = useCallback(async (chain: SupportedBlockchain, asset: Asset) => {
    setLoadingBalance(true);
    try {
      const res = await walletService.getWalletBalance(
        getBlockchainType(chain.id),
        (asset as any)?._id || (asset as any)?.id || null,
      ) as any;
      const data = res?.data ?? res;
      setWalletBalance(parseBalance(data));
      setWalletSymbol(data?.symbol || asset?.symbol || 'USDT');
    } catch { setWalletBalance(0); }
    finally { setLoadingBalance(false); }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAmountChange = useCallback((v: string) => {
    const clean = v.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2 || parts[1]?.length > 2) return;
    setAmount(clean); setError('');
  }, []);

  const handleQuickAmount = useCallback((v: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(v.toString()); setError('');
  }, []);

  const handleSelectChain = useCallback((chain: SupportedBlockchain) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChain(chain); setShowDropdown(false); setChainSearch('');
  }, []);

  const handleClose = useCallback(() => {
    if (!processing) onClose();
  }, [processing, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!isValidAmt) { setError(`Amount must be $${MIN_TOPUP}–$${MAX_TOPUP.toLocaleString()}`); return; }

    if (fundingSource === 'credit') {
      if (creditAvailable < num) { setError(`Insufficient credit. Available: $${creditAvailable.toFixed(2)}`); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setProcessing(true); setStep(2);
      try {
        const ok = onCreditTopUp ? await onCreditTopUp(num) : false;
        if (ok) {
          setSuccess(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => onSuccess?.(), 2000);
        } else { setError('Credit top-up failed.'); setSuccess(false); }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Credit top-up failed.');
        setSuccess(false);
      } finally { setProcessing(false); }
      return;
    }

    if (!selectedChain || !usdtAsset) { setError('Please select a valid network.'); return; }
    if (!hasSufficient) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setShowInsuffModal(true); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcessing(true); setStep(2);
    try {
      await cardService.topupCard({
        cardId: card?.cardId || card?.id,
        amount: num.toString(),
        assetId: (usdtAsset as any)._id || (usdtAsset as any).id,
        blockchainType: getBlockchainType(selectedChain.id),
      });
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => onSuccess?.(), 2000);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'TopUp failed.');
      setSuccess(false);
    } finally { setProcessing(false); }
  }, [isValidAmt, fundingSource, creditAvailable, num, selectedChain, usdtAsset, hasSufficient, card, onCreditTopUp, onSuccess]);

  const filteredChains = useMemo(() => {
    const safe = Array.isArray(blockchains) ? blockchains : [];
    if (!chainSearch) return safe;
    const t = chainSearch.toLowerCase();
    return safe.filter(c => c.name?.toLowerCase().includes(t) || c.id?.toLowerCase().includes(t));
  }, [blockchains, chainSearch]);

  if (!visible && !isOpen) return null;

  const backdropOpacity = backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Full screen container */}
      <View style={s.fullScreen}>

        {/* Animated backdrop */}
        <Animated.View
          style={[s.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />

        {/* Tap backdrop to close */}
        <TouchableOpacity
          style={s.backdropTap}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* ── THE SHEET ── */}
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              height: MODAL_HEIGHT,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header — fixed, not scrollable */}
          <View style={[s.header, { borderBottomColor: colors.borderSoft }]}>
            <View style={s.headerLeft}>
              {step === 2 && !processing && !success && (
                <TouchableOpacity
                  onPress={() => { setStep(1); setError(''); }}
                  style={[s.backBtn, { backgroundColor: colors.card }]}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={18} color={colors.green} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={[s.headerTitle, { color: colors.text }]}>💳 Top Up Card</Text>
                <Text style={[s.headerSub, { color: colors.text2 }]}>
                  {step === 1 ? 'Add funds to your card'
                    : processing ? 'Processing…'
                      : success ? 'Success!' : 'Failed'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={processing}
              style={[s.closeBtn, { backgroundColor: colors.card }]}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <KeyboardAvoidingView
            style={s.flex1}
            behavior={IS_IOS ? 'padding' : undefined}
          >
            <ScrollView
              style={s.flex1}
              contentContainerStyle={[s.scrollContent, { paddingBottom: BOTTOM_SAFE + 32 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={IS_IOS}
              overScrollMode="never"
            >

              {/* ══ STEP 1 ══ */}
              {step === 1 && (
                <FadeInView duration={250}>

                  {/* Card info */}
                  <View style={[s.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={s.cardLeft}>
                      <View style={[s.cardIconBox, { backgroundColor: colors.green }]}>
                        <CreditCard size={22} color="#000" />
                      </View>
                      <View>
                        <Text style={[s.cardNum, { color: colors.text }]}>
                          •••• {card?.last4 || card?.cardNumber?.slice(-4) || '••••'}
                        </Text>
                        <Text style={[s.cardTypeTxt, { color: colors.text2 }]}>
                          {card?.cardType === 1 ? 'Physical Card' : 'Virtual Card'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.balLabel, { color: colors.text2 }]}>Current Balance</Text>
                      <Text style={[s.balValue, { color: colors.text }]}>
                        ${(card?.balance ?? card?.cardBalance ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* Funding source */}
                  <FundingSourceSelector
                    selected={fundingSource}
                    onSelect={setFundingSource}
                    creditAvailable={creditAvailable}
                    colors={colors}
                  />

                  {/* Credit info */}
                  {fundingSource === 'credit' && (
                    <FadeInView duration={200} style={[s.creditBox, {
                      backgroundColor: colors.purpleDim, borderColor: colors.purple + '44',
                    }]}>
                      <View style={s.creditRow}>
                        <View style={s.creditLeft}>
                          <Zap size={15} color={colors.purple} />
                          <Text style={[s.creditLabel, { color: colors.purple }]}>Available Credit</Text>
                        </View>
                        <Text style={[s.creditValue, { color: colors.purple }]}>
                          ${creditAvailable.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[s.creditDivider, { backgroundColor: colors.purple + '33' }]} />
                      <View style={s.creditNote}>
                        <Info size={11} color={colors.text3} />
                        <Text style={[s.creditNoteTxt, { color: colors.text3 }]}>
                          No fee for credit-based top up. Amount will be added to your outstanding balance.
                        </Text>
                      </View>
                    </FadeInView>
                  )}

                  {/* Network selector */}
                  {fundingSource === 'wallet' && (
                    <>
                      <Text style={[s.sectionLabel, { color: colors.text2, marginBottom: 8 }]}>
                        Select Network
                      </Text>
                      {loadingChains ? <NetworkSelectorSkeleton /> : (
                        <TouchableOpacity
                          onPress={() => setShowDropdown(v => !v)}
                          style={[s.netSelector, {
                            backgroundColor: colors.card,
                            borderColor: showDropdown ? colors.green : colors.border,
                          }]}
                          activeOpacity={0.7}
                        >
                          <View style={s.netSelectorLeft}>
                            {selectedChain ? (
                              <>
                                {selectedChain.image?.small
                                  ? <Image source={{ uri: selectedChain.image.small }} style={s.chainImg} />
                                  : (
                                    <View style={[s.chainPlaceholder, {
                                      backgroundColor: getChainColor(getChainIdFromBlockchain(selectedChain.id)) + '25',
                                    }]}>
                                      <Text style={[s.chainPlaceholderTxt, {
                                        color: getChainColor(getChainIdFromBlockchain(selectedChain.id)),
                                      }]}>
                                        {selectedChain.native_currency?.[0] || selectedChain.name?.[0]}
                                      </Text>
                                    </View>
                                  )}
                                <View>
                                  <Text style={[s.netName, { color: colors.text }]}>{selectedChain.name}</Text>
                                  <Text style={[s.netChainId, { color: colors.text3 }]}>
                                    {getChainIdFromBlockchain(selectedChain.id)}
                                  </Text>
                                </View>
                              </>
                            ) : (
                              <Text style={[s.netPlaceholder, { color: colors.text3 }]}>Choose network</Text>
                            )}
                          </View>
                          <ChevronDown
                            size={18} color={colors.text2}
                            style={showDropdown ? { transform: [{ rotate: '180deg' }] } : undefined}
                          />
                        </TouchableOpacity>
                      )}

                      {showDropdown && (
                        <FadeInView duration={150} style={[s.dropdown, {
                          backgroundColor: colors.surface, borderColor: colors.border,
                        }]}>
                          <View style={[s.dropSearch, { borderBottomColor: colors.borderSoft }]}>
                            <Search size={14} color={colors.text3} />
                            <TextInput
                              style={[s.dropSearchInput, { color: colors.text }]}
                              placeholder="Search network…"
                              placeholderTextColor={colors.text3}
                              value={chainSearch}
                              onChangeText={setChainSearch}
                              autoFocus={false}
                            />
                          </View>
                          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {filteredChains.length === 0
                              ? <View style={s.dropEmpty}><Text style={[s.dropEmptyTxt, { color: colors.text3 }]}>No networks found</Text></View>
                              : filteredChains.map(chain => (
                                <NetworkDropdownItem
                                  key={chain.id} chain={chain}
                                  isSelected={selectedChain?.id === chain.id}
                                  onSelect={() => handleSelectChain(chain)}
                                  colors={colors}
                                />
                              ))}
                          </ScrollView>
                        </FadeInView>
                      )}

                      {selectedChain && (
                        <FadeInView duration={200} style={[s.usdtBox, {
                          backgroundColor: colors.card, borderColor: colors.border,
                        }]}>
                          {loadingAsset ? (
                            <View style={{ gap: 10 }}>
                              <View style={s.usdtLoadRow}>
                                <Skeleton width={32} height={32} borderRadius={16} />
                                <View style={{ gap: 5 }}>
                                  <Skeleton width={60} height={14} />
                                  <Skeleton width={90} height={11} />
                                </View>
                              </View>
                              <BalanceSkeleton />
                            </View>
                          ) : usdtNotFound ? (
                            <View style={s.usdtErrRow}>
                              <AlertTriangle size={18} color={colors.red} />
                              <View>
                                <Text style={[s.usdtErrTitle, { color: colors.red }]}>USDT Not Available</Text>
                                <Text style={[s.usdtErrSub, { color: colors.text2 }]}>Select a different network</Text>
                              </View>
                            </View>
                          ) : usdtAsset ? (
                            <>
                              <View style={s.usdtInfoRow}>
                                <View style={s.usdtInfoLeft}>
                                  <View style={[s.usdtIcon, { backgroundColor: '#26A17B' }]}>
                                    <DollarSign size={15} color="#fff" />
                                  </View>
                                  <View>
                                    <Text style={[s.usdtName, { color: colors.text }]}>USDT</Text>
                                    <Text style={[s.usdtFullName, { color: colors.text2 }]}>Tether USD</Text>
                                  </View>
                                </View>
                                <View style={[s.availBadge, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
                                  <Text style={[s.availBadgeTxt, { color: colors.green }]}>Available</Text>
                                </View>
                              </View>
                              <View style={[s.usdtDivider, { backgroundColor: colors.borderSoft }]} />
                              {loadingBalance ? <BalanceSkeleton /> : (
                                <View style={s.balRow}>
                                  <View style={s.balLeft}>
                                    <Wallet size={13} color={colors.text2} />
                                    <Text style={[s.balLbl, { color: colors.text2 }]}>Wallet Balance</Text>
                                  </View>
                                  <View style={s.balRight}>
                                    <Text style={[s.balVal, { color: colors.green }]}>
                                      {walletBalance.toFixed(2)} {walletSymbol}
                                    </Text>
                                    <TouchableOpacity
                                      onPress={() => selectedChain && usdtAsset && fetchWalletBalance(selectedChain, usdtAsset)}
                                      style={s.refreshBtn} activeOpacity={0.7}
                                    >
                                      <RefreshCw size={13} color={colors.green} />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </>
                          ) : null}
                        </FadeInView>
                      )}
                    </>
                  )}

                  {/* Amount */}
                  <Text style={[s.sectionLabel, { color: colors.text2, marginBottom: 8, marginTop: 4 }]}>
                    Top Up Amount (USD)
                  </Text>
                  <View style={[s.amtWrap, {
                    backgroundColor: colors.card,
                    borderColor: error ? colors.red : colors.border,
                  }]}>
                    <Text style={[s.amtSign, { color: colors.text2 }]}>$</Text>
                    <TextInput
                      style={[s.amtInput, { color: colors.text }]}
                      keyboardType="decimal-pad"
                      value={amount}
                      onChangeText={handleAmountChange}
                      placeholder="0.00"
                      placeholderTextColor={colors.text3}
                    />
                  </View>
                  {!!error && (
                    <View style={s.errRow}>
                      <AlertTriangle size={12} color={colors.red} />
                      <Text style={[s.errTxt, { color: colors.red }]}>{error}</Text>
                    </View>
                  )}
                  <Text style={[s.amtHint, { color: colors.text3 }]}>
                    Min: ${MIN_TOPUP} • Max: ${MAX_TOPUP.toLocaleString()}
                  </Text>

                  {/* Quick amounts */}
                  <View style={s.quickRow}>
                    {QUICK_AMOUNTS.map(v => {
                      const isSel = amount === v.toString();
                      return (
                        <TouchableOpacity
                          key={v} onPress={() => handleQuickAmount(v)}
                          style={[s.quickBtn, {
                            backgroundColor: isSel ? colors.green : colors.card,
                            borderColor: isSel ? colors.green : colors.border,
                          }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.quickTxt, { color: isSel ? '#000' : colors.text2 }]}>${v}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Fee breakdown */}
                  {num > 0 && (
                    <FadeInView duration={200} style={[s.feeBox, {
                      backgroundColor: colors.card, borderColor: colors.border,
                    }]}>
                      <View style={s.feeRow}>
                        <Text style={[s.feeLbl, { color: colors.text2 }]}>Top Up Amount</Text>
                        <Text style={[s.feeVal, { color: colors.text }]}>${num.toFixed(2)}</Text>
                      </View>
                      {fundingSource === 'wallet' ? (
                        <View style={s.feeRow}>
                          <View style={s.feeLblRow}>
                            <Text style={[s.feeLbl, { color: colors.text2 }]}>Fee ({TOPUP_FEE_PERCENT}%)</Text>
                            <Info size={10} color={colors.text3} />
                          </View>
                          <Text style={[s.feeVal, { color: colors.text }]}>${fee.toFixed(2)}</Text>
                        </View>
                      ) : (
                        <View style={s.feeRow}>
                          <Text style={[s.feeLbl, { color: colors.green }]}>Fee</Text>
                          <Text style={[s.feeVal, { color: colors.green }]}>$0.00 ✨</Text>
                        </View>
                      )}
                      <View style={[s.feeDivider, { backgroundColor: colors.borderSoft }]} />
                      <View style={s.feeRow}>
                        <Text style={[s.feeTotalLbl, { color: colors.text }]}>
                          {fundingSource === 'credit' ? 'Credit Used' : 'Total Deduction'}
                        </Text>
                        <Text style={[s.feeTotalVal, { color: colors.text }]}>${totalDeduct.toFixed(2)}</Text>
                      </View>
                      <View style={[s.receivesBox, {
                        backgroundColor: colors.greenDim, borderColor: colors.greenBorder,
                      }]}>
                        <Text style={[s.receivesLbl, { color: colors.green }]}>Card Receives</Text>
                        <Text style={[s.receivesVal, { color: colors.green }]}>${num.toFixed(2)}</Text>
                      </View>
                      {!hasSufficient && num > 0 && (
                        <View style={[s.insuffWarn, {
                          backgroundColor: colors.redDim, borderColor: colors.red + '44',
                        }]}>
                          <AlertTriangle size={13} color={colors.red} />
                          <Text style={[s.insuffWarnTxt, { color: colors.red }]}>
                            {fundingSource === 'credit'
                              ? `Insufficient credit. Available: $${creditAvailable.toFixed(2)}`
                              : `Insufficient balance. Need $${(totalDeduct - walletBalance).toFixed(2)} more`}
                          </Text>
                        </View>
                      )}
                    </FadeInView>
                  )}

                  {/* Confirm */}
                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={!canConfirm}
                    style={[s.confirmBtn, {
                      backgroundColor: fundingSource === 'credit' ? colors.purple : colors.green,
                    }, !canConfirm && { opacity: 0.45 }]}
                    activeOpacity={0.85}
                  >
                    <Text style={s.confirmBtnTxt}>{buttonText}</Text>
                    <ArrowRight size={16} color="#000" />
                  </TouchableOpacity>

                  {fundingSource === 'wallet' && selectedChain && usdtAsset && (
                    <Text style={[s.infoFooter, { color: colors.text3 }]}>
                      {walletSymbol} will be deducted from your {selectedChain.name} wallet
                    </Text>
                  )}
                  {fundingSource === 'credit' && (
                    <Text style={[s.infoFooter, { color: colors.text3 }]}>
                      Amount will be borrowed from your credit line
                    </Text>
                  )}
                </FadeInView>
              )}

              {/* ══ STEP 2 ══ */}
              {step === 2 && (
                <View style={s.step2}>
                  {processing ? (
                    <FadeInView style={s.processingWrap}>
                      <SpinningLoader size={56} color={fundingSource === 'credit' ? colors.purple : colors.green} />
                      <Text style={[s.processingTitle, { color: colors.text }]}>Processing Top Up</Text>
                      <Text style={[s.processingSub, { color: colors.text2 }]}>
                        {fundingSource === 'credit' ? 'Borrowing from credit line…' : 'Please wait…'}
                      </Text>
                    </FadeInView>
                  ) : success ? (
                    <ZoomInView style={s.successWrap}>
                      <View style={[s.successCircle, { backgroundColor: colors.greenDim, borderColor: colors.green }]}>
                        <Check size={36} color={colors.green} />
                      </View>
                      <Text style={[s.successTitle, { color: colors.text }]}>Top Up Successful!</Text>
                      <Text style={[s.successSub, { color: colors.text2 }]}>
                        ${num.toFixed(2)} has been added to your card
                      </Text>
                      <View style={[s.successInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={s.successInfoRow}>
                          <Text style={[s.successInfoLbl, { color: colors.text2 }]}>New Card Balance</Text>
                          <Text style={[s.successInfoVal, { color: colors.green }]}>
                            ${((card?.balance ?? card?.cardBalance ?? 0) + num).toFixed(2)}
                          </Text>
                        </View>
                        {fundingSource === 'credit' && (
                          <View style={[s.successInfoRow, { marginTop: 8 }]}>
                            <Text style={[s.successInfoLbl, { color: colors.text2 }]}>Funded via</Text>
                            <Text style={[s.successInfoVal, { color: colors.purple }]}>Credit Line</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={handleClose}
                        style={[s.doneBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.doneBtnTxt, { color: colors.text }]}>Done</Text>
                      </TouchableOpacity>
                    </ZoomInView>
                  ) : (
                    <ZoomInView style={s.failedWrap}>
                      <View style={[s.failedCircle, { backgroundColor: colors.redDim, borderColor: colors.red }]}>
                        <X size={36} color={colors.red} />
                      </View>
                      <Text style={[s.failedTitle, { color: colors.text }]}>Top Up Failed</Text>
                      <Text style={[s.failedSub, { color: colors.red }]}>{error}</Text>
                      <TouchableOpacity
                        onPress={() => { setStep(1); setError(''); }}
                        style={[s.tryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.tryBtnTxt, { color: colors.text }]}>Try Again</Text>
                      </TouchableOpacity>
                    </ZoomInView>
                  )}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>

      {/* ── Insufficient Balance Modal ── */}
      <Modal
        visible={showInsuffModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInsuffModal(false)}
        statusBarTranslucent
      >
        <View style={s.insuffOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowInsuffModal(false)} />
          <ZoomInView style={[s.insuffModal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[s.insuffIconCircle, { backgroundColor: colors.orangeDim, borderColor: colors.orange }]}>
              <AlertTriangle size={32} color={colors.orange} />
            </View>
            <Text style={[s.insuffTitle, { color: colors.text }]}>Insufficient Balance</Text>
            <Text style={[s.insuffDesc, { color: colors.text2 }]}>
              Your wallet balance is insufficient for this top up.
            </Text>
            <View style={[s.insuffInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: 'Available Balance', value: `${walletBalance.toFixed(2)} ${walletSymbol}`, color: colors.red },
                { label: 'Required Amount', value: `${totalDeduct.toFixed(2)} ${walletSymbol}`, color: colors.text },
                null,
                { label: 'Shortfall', value: `${(totalDeduct - walletBalance).toFixed(2)} ${walletSymbol}`, color: colors.orange },
              ].map((row, i) =>
                row === null
                  ? <View key={i} style={[s.insuffDivider, { backgroundColor: colors.borderSoft }]} />
                  : (
                    <View key={row.label} style={s.insuffInfoRow}>
                      <Text style={[s.insuffInfoLbl, { color: colors.text2 }]}>{row.label}</Text>
                      <Text style={[s.insuffInfoVal, { color: row.color }]}>{row.value}</Text>
                    </View>
                  )
              )}
            </View>
            <View style={s.insuffBtns}>
              <TouchableOpacity
                onPress={() => setShowInsuffModal(false)}
                style={[s.skipBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Text style={[s.skipTxt, { color: colors.text2 }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowInsuffModal(false); onClose(); router.push('/deposit' as any); }}
                style={[s.depositBtn, { backgroundColor: colors.green }]}
                activeOpacity={0.85}
              >
                <Text style={s.depositTxt}>Deposit</Text>
                <ArrowRight size={14} color="#000" />
              </TouchableOpacity>
            </View>
          </ZoomInView>
        </View>
      </Modal>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Layout ──
  fullScreen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backdropTap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    // Only tap area above the sheet closes it
    height: SCREEN_HEIGHT - MODAL_HEIGHT,
  },
  flex1: { flex: 1 },

  // ── Sheet — THIS IS THE KEY FIX ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // height is set dynamically via MODAL_HEIGHT
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 24 },
    }),
  },

  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 2,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { padding: 20 },

  // Card info
  cardBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardNum: { fontSize: 16, fontWeight: '600' },
  cardTypeTxt: { fontSize: 12, marginTop: 2 },
  balLabel: { fontSize: 11 },
  balValue: { fontSize: 22, fontWeight: '700', marginTop: 2 },

  // Funding
  fundingWrap: { marginBottom: 16 },
  fundingRow: { flexDirection: 'row', gap: 10 },
  fundingOption: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, gap: 5 },
  fundingTxt: { fontSize: 14, fontWeight: '600' },
  fundingSub: { fontSize: 11 },

  // Credit
  creditBox: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  creditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creditLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  creditLabel: { fontSize: 13, fontWeight: '600' },
  creditValue: { fontSize: 18, fontWeight: '700' },
  creditDivider: { height: 1, marginVertical: 10 },
  creditNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  creditNoteTxt: { fontSize: 11, flex: 1, lineHeight: 16 },

  sectionLabel: { fontSize: 13, fontWeight: '600' },

  // Network
  netSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, marginBottom: 4 },
  netSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  netName: { fontSize: 14, fontWeight: '600' },
  netChainId: { fontSize: 11, marginTop: 1 },
  netPlaceholder: { fontSize: 14 },
  chainImg: { width: 32, height: 32, borderRadius: 16 },
  chainPlaceholder: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chainPlaceholderTxt: { fontSize: 14, fontWeight: '700' },

  // Dropdown
  dropdown: {
    borderRadius: 12, borderWidth: 1, marginTop: 8, marginBottom: 4, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  dropSearch: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  dropSearchInput: { flex: 1, fontSize: 14, padding: 0 },
  dropEmpty: { padding: 20, alignItems: 'center' },
  dropEmptyTxt: { fontSize: 14 },
  dropItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dropItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dropItemName: { fontSize: 14, fontWeight: '500' },
  dropItemId: { fontSize: 11, marginTop: 1 },

  // USDT
  usdtBox: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  usdtLoadRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usdtErrRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usdtErrTitle: { fontSize: 14, fontWeight: '600' },
  usdtErrSub: { fontSize: 12, marginTop: 2 },
  usdtInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  usdtInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usdtIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  usdtName: { fontSize: 14, fontWeight: '600' },
  usdtFullName: { fontSize: 11, marginTop: 1 },
  usdtDivider: { height: 1, marginVertical: 12 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  availBadgeTxt: { fontSize: 10, fontWeight: '600' },
  balRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  balLbl: { fontSize: 13 },
  balRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balVal: { fontSize: 14, fontWeight: '700' },
  refreshBtn: { padding: 4 },

  // Amount
  amtWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, marginBottom: 6 },
  amtSign: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amtInput: { flex: 1, fontSize: 24, fontWeight: '700', paddingVertical: 16, textAlign: 'center' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  errTxt: { fontSize: 12 },
  amtHint: { fontSize: 11, textAlign: 'center', marginBottom: 14 },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  quickTxt: { fontSize: 14, fontWeight: '600' },

  // Fee
  feeBox: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, gap: 12 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feeLblRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feeLbl: { fontSize: 13 },
  feeVal: { fontSize: 13, fontWeight: '500' },
  feeDivider: { height: 1 },
  feeTotalLbl: { fontSize: 14, fontWeight: '600' },
  feeTotalVal: { fontSize: 18, fontWeight: '700' },
  receivesBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  receivesLbl: { fontSize: 13, fontWeight: '600' },
  receivesVal: { fontSize: 18, fontWeight: '700' },
  insuffWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  insuffWarnTxt: { fontSize: 12, flex: 1 },

  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16, marginBottom: 12 },
  confirmBtnTxt: { fontSize: 16, fontWeight: '700', color: '#000' },
  infoFooter: { fontSize: 12, textAlign: 'center' },

  // Step 2
  step2: { minHeight: 400, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  processingWrap: { alignItems: 'center', gap: 16 },
  processingTitle: { fontSize: 18, fontWeight: '600' },
  processingSub: { fontSize: 14 },
  successWrap: { alignItems: 'center', width: '100%' },
  successCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { fontSize: 14, textAlign: 'center' },
  successInfo: { borderRadius: 12, padding: 16, marginTop: 24, width: '100%', borderWidth: 1 },
  successInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successInfoLbl: { fontSize: 14 },
  successInfoVal: { fontSize: 16, fontWeight: '700' },
  doneBtn: { marginTop: 24, width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  doneBtnTxt: { fontSize: 15, fontWeight: '600' },
  failedWrap: { alignItems: 'center', width: '100%' },
  failedCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  failedTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  failedSub: { fontSize: 14, textAlign: 'center' },
  tryBtn: { marginTop: 24, width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  tryBtnTxt: { fontSize: 15, fontWeight: '600' },

  // Insufficient modal
  insuffOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.75)' },
  insuffModal: {
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 380,
    alignItems: 'center', borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  insuffIconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  insuffTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  insuffDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  insuffInfo: { borderRadius: 12, padding: 16, width: '100%', marginBottom: 24, borderWidth: 1, gap: 10 },
  insuffInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insuffInfoLbl: { fontSize: 13 },
  insuffInfoVal: { fontSize: 13, fontWeight: '600' },
  insuffDivider: { height: 1 },
  insuffBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  skipBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  skipTxt: { fontSize: 15, fontWeight: '600' },
  depositBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  depositTxt: { fontSize: 15, fontWeight: '700', color: '#000' },
});