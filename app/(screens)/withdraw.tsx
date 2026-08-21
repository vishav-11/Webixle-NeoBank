/**
 * app/(screens)/withdraw.tsx
 * Withdraw Screen — Dark Navy Theme Applied ✅
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Platform, Alert, Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';
import * as Clipboard from 'expo-clipboard';

import {
  useSupportedBlockchains,
  useAssetsByChain,
  useAssetBalance,
  useWithdraw,
  type WalletAsset,
} from '@/hooks/queires';

import { TransferInstructionModal } from '@/components/common/TransferInstructionModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Blockchain {
  id: string;
  name: string;
  native_currency: string;
  chainId: number | null;
  image?: { thumb?: string; small?: string; large?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUICK_AMOUNTS = [0.25, 0.5, 1.0];

const COIN_COLORS: Record<string, [string, string]> = {
  BTC:  ['#F7931A', '#E8830A'],
  ETH:  ['#627EEA', '#4A6DD8'],
  TRX:  ['#FF4D6A', '#E83050'],
  BNB:  ['#F5A623', '#E09510'],
  USDT: ['#26A17B', '#1A8A66'],
  USDC: ['#2775CA', '#1A60B5'],
};

// ✅ Theme Colors (Dark Navy aligned)
const ACCENT        = '#8A63FF';  // theme.accent
const ACCENT_BRIGHT = '#6c0db0';  // accentGradient[1]
const ACCENT_DIM    = 'rgba(42,169,224,0.15)'; // theme.accentDim
const GREEN         = '#27AE60';  // theme.green (kept for success states)
const IS_WEB        = Platform.OS === 'web';
const WEB_SIDEBAR_BP = 860;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#334155', '#1E293B'];

const formatBal = (b?: string | number, decimals = 6) => {
  const val = typeof b === 'number' ? b : parseFloat(b ?? '0');
  if (isNaN(val)) return '0.00';
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
};

const validateEth  = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a);
const validateTron = (a: string) => /^T[a-zA-Z0-9]{33}$/.test(a);
const validateBtc  = (a: string) => /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(a);

const validateAddress = (address: string, chain: string) => {
  if (!address || address.length < 10) return false;
  switch (chain.toUpperCase()) {
    case 'ETH': case 'BSC': return validateEth(address);
    case 'TRX': case 'TRON': return validateTron(address);
    case 'BTC': return validateBtc(address);
    default: return address.length > 10;
  }
};

const getApiChainId = (chain: Blockchain) => {
  const map: Record<string, string> = {
    'ethereum':            'ETH',
    'binance-smart-chain': 'BSC',
    'tron':                'TRX',
    'bitcoin':             'BTC',
  };
  return map[chain.id] ?? chain.native_currency;
};

const chainImageUrl = (chain: Blockchain) =>
  chain.image?.small ?? chain.image?.thumb ?? null;

// ─── Cross-platform Alert ─────────────────────────────────────────────────────
const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    const msg = `${title}${message ? `\n\n${message}` : ''}`;
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(msg);
      if (confirmed) buttons.find(b => b.text !== 'Cancel')?.onPress?.();
      else buttons.find(b => b.text === 'Cancel')?.onPress?.();
    } else {
      window.alert(msg);
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// ─── BottomSheet ──────────────────────────────────────────────────────────────
function BottomSheet({ visible, title, onClose, colors, children }: any) {
  if (IS_WEB) {
    if (!visible) return null;
    return (
      <View style={webSheet.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[webSheet.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[webSheet.header, { borderBottomColor: colors.border }]}>
            <Text style={[webSheet.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[webSheet.closeBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="close" size={18} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            {children}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={nativeSheet.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[nativeSheet.sheet, { backgroundColor: colors.card }]}>
          <View style={[nativeSheet.handle, { backgroundColor: colors.border }]} />
          <View style={[nativeSheet.header, { borderBottomColor: colors.border }]}>
            <Text style={[nativeSheet.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const webSheet = StyleSheet.create({
  backdrop: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.75)', // ✅ theme.overlay
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  panel:    { width: '100%', maxWidth: 480, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  header:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title:    { fontSize: 16, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

const nativeSheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' }, // ✅ theme.overlay
  sheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', paddingBottom: 24 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
});

// ─── Web Right Panel ──────────────────────────────────────────────────────────
function WebRightPanel({
  colors, selectedChain, selectedAsset, amount, toAddress,
  loadingBalance, availableBalance,
  networkFee, recipientGets, hasInsufficient,
  isValidAddress, canSubmit, isWithdrawing, onSubmit,
}: any) {
  return (
    <View style={[wp.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[wp.titleRow, { borderBottomColor: colors.border }]}>
        <View style={[wp.titleIcon, { backgroundColor: ACCENT_DIM }]}>
          <Ionicons name="arrow-up-circle" size={18} color={ACCENT} />
        </View>
        <Text style={[wp.titleText, { color: colors.text }]}>Withdrawal Summary</Text>
      </View>

      {selectedAsset ? (
        <View style={[wp.assetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LinearGradient colors={getCoinColors(selectedAsset.symbol)} style={wp.assetIcon}>
            <Text style={wp.assetIconText}>{selectedAsset.symbol[0]}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[wp.assetName, { color: colors.text }]}>{selectedAsset.name}</Text>
            <Text style={[wp.assetChain, { color: colors.text2 }]}>
              {selectedChain?.name} · {selectedAsset.symbol}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[wp.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="arrow-up-circle-outline" size={28} color={colors.text3} />
          <Text style={[wp.emptyText, { color: colors.text3 }]}>Select network & asset to begin</Text>
        </View>
      )}

      {selectedAsset && (
        <View style={[wp.balCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={wp.balRow}>
            <Text style={[wp.balLabel, { color: colors.text2 }]}>Available</Text>
            {loadingBalance
              ? <ActivityIndicator size="small" color={ACCENT} />
              : <Text style={[wp.balValue, { color: GREEN }]}>
                  {formatBal(availableBalance, selectedAsset.decimals)} {selectedAsset.symbol}
                </Text>}
          </View>
          <View style={[wp.balDivider, { backgroundColor: colors.border }]} />
          <View style={wp.balRow}>
            <Text style={[wp.balLabel, { color: colors.text2 }]}>Min Withdrawal</Text>
            <Text style={[wp.balValue, { color: colors.text }]}>
              {selectedAsset.minWithdrawalAmount} {selectedAsset.symbol}
            </Text>
          </View>
        </View>
      )}

      {selectedAsset && amount && !hasInsufficient && (
        <View style={[wp.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[wp.breakdownTitle, { color: colors.text2 }]}>Breakdown</Text>
          {[
            { label: 'You Withdraw', value: `${amount} ${selectedAsset.symbol}`,                   color: colors.text },
            { label: 'Network Fee',  value: `${networkFee} ${selectedAsset.symbol}`,               color: colors.text },
            { label: 'You Will Get', value: `${recipientGets.toFixed(6)} ${selectedAsset.symbol}`, color: GREEN },
          ].map(({ label, value, color }, i, arr) => (
            <View key={label} style={[wp.breakdownRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[wp.breakdownLabel, { color: colors.text2 }]}>{label}</Text>
              <Text style={[wp.breakdownValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {toAddress ? (
        <View style={[wp.addrCard, { backgroundColor: ACCENT_DIM, borderColor: ACCENT + '44' }]}>
          <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
          <Text style={[wp.addrText, { color: ACCENT }]} numberOfLines={1} ellipsizeMode="middle">{toAddress}</Text>
        </View>
      ) : (
        <View style={[wp.addrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={16} color={colors.text3} />
          <Text style={[wp.addrText, { color: colors.text3 }]}>No address entered</Text>
        </View>
      )}

      {!selectedAsset && (
        <View style={wp.stepsWrap}>
          {[
            { step: '1', text: 'Select a blockchain network' },
            { step: '2', text: 'Choose the asset to withdraw' },
            { step: '3', text: 'Enter amount & destination address' },
            { step: '4', text: 'Review transfer instructions' },
          ].map(({ step, text }) => (
            <View key={step} style={wp.stepRow}>
              <View style={[wp.stepBadge, { backgroundColor: ACCENT_DIM }]}>
                <Text style={[wp.stepNum, { color: ACCENT }]}>{step}</Text>
              </View>
              <Text style={[wp.stepText, { color: colors.text2 }]}>{text}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />

      <TouchableOpacity onPress={onSubmit} disabled={!canSubmit} activeOpacity={0.85}>
        <LinearGradient
          colors={canSubmit ? [ACCENT, ACCENT_BRIGHT] : [colors.surface, colors.surface]}
          style={[wp.ctaBtn, !canSubmit && { borderWidth: 1, borderColor: colors.border }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {isWithdrawing
            ? <ActivityIndicator color={canSubmit ? '#fff' : colors.text3} size="small" />
            : (
              <>
                <Ionicons name="arrow-up-circle-outline" size={18} color={canSubmit ? '#fff' : colors.text3} />
                <Text style={[wp.ctaText, { color: canSubmit ? '#fff' : colors.text3 }]}>
                  {canSubmit ? 'Withdraw' : 'Fill in all fields'}
                </Text>
              </>
            )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const wp = StyleSheet.create({
  container:      { width: 320, borderRadius: 20, borderWidth: 1, padding: 20, gap: 16, alignSelf: 'flex-start' },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottomWidth: 1 },
  titleIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  titleText:      { fontSize: 15, fontWeight: '700' },
  assetCard:      { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1 },
  assetIcon:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  assetIconText:  { fontSize: 17, fontWeight: '700', color: '#fff' },
  assetName:      { fontSize: 14, fontWeight: '700' },
  assetChain:     { fontSize: 12, marginTop: 2 },
  emptyCard:      { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' as any, gap: 8 },
  emptyText:      { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  balCard:        { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  balRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  balDivider:     { height: 1 },
  balLabel:       { fontSize: 12 },
  balValue:       { fontSize: 13, fontWeight: '700' },
  breakdownCard:  { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  breakdownTitle: { fontSize: 11, fontWeight: '600', padding: 12, paddingBottom: 0 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  breakdownLabel: { fontSize: 12 },
  breakdownValue: { fontSize: 12, fontWeight: '700' },
  addrCard:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  addrText:       { flex: 1, fontSize: 12, fontWeight: '500' },
  stepsWrap:      { gap: 10 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBadge:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum:        { fontSize: 12, fontWeight: '700' },
  stepText:       { fontSize: 12, flex: 1 },
  ctaBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  ctaText:        { fontSize: 14, fontWeight: '700' },
});

// ─── FormContent ──────────────────────────────────────────────────────────────
interface FormContentProps {
  colors: any;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  amount: string;
  toAddress: string;
  amountFocused: boolean;
  addressFocused: boolean;
  amountError: string;
  addressError: string;
  hasInsufficient: boolean;
  isValidAddress: boolean;
  availableBalance: number;
  loadingChains: boolean;
  loadingAssets: boolean;
  loadingBalance: boolean;
  networkFee: number;
  recipientGets: number;
  showInlineSummary: boolean;
  onAmountChange: (v: string) => void;
  onMaxAmount: () => void;
  onAddressChange: (v: string) => void;
  onClearAddress: () => void;
  onPasteAddress: () => void;
  onAmountFocus: (v: boolean) => void;
  onAddressFocus: (v: boolean) => void;
  onOpenChainPicker: () => void;
  onOpenAssetPicker: () => void;
  onQuickAmount: (q: number) => void;
}

function FormContent({
  colors, selectedChain, selectedAsset,
  amount, toAddress,
  amountFocused, addressFocused,
  amountError, addressError,
  hasInsufficient, isValidAddress,
  availableBalance, loadingChains, loadingAssets, loadingBalance,
  networkFee, recipientGets, showInlineSummary,
  onAmountChange, onMaxAmount,
  onAddressChange, onClearAddress, onPasteAddress,
  onAmountFocus, onAddressFocus,
  onOpenChainPicker, onOpenAssetPicker,
  onQuickAmount,
}: FormContentProps) {
  return (
    <View style={s.formWrap}>

      {/* ── Network Selector ── */}
      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.text2 }]}>Network</Text>
        <TouchableOpacity onPress={onOpenChainPicker} activeOpacity={0.8}>
          <View style={[s.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selectedChain ? (
              <>
                {chainImageUrl(selectedChain) ? (
                  <Image source={{ uri: chainImageUrl(selectedChain)! }} style={s.chainLogo} />
                ) : (
                  <LinearGradient colors={getCoinColors(selectedChain.native_currency)} style={s.chainLogo}>
                    <Text style={s.iconText}>{selectedChain.native_currency[0]}</Text>
                  </LinearGradient>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.selectTitle, { color: colors.text }]}>{selectedChain.name}</Text>
                  <Text style={[s.selectSub, { color: colors.text2 }]}>{selectedChain.native_currency}</Text>
                </View>
              </>
            ) : (
              <View style={s.placeholderRow}>
                <View style={[s.placeholderCircle, { backgroundColor: colors.surface }]}>
                  {loadingChains
                    ? <ActivityIndicator size="small" color={ACCENT} />
                    : <Ionicons name="layers-outline" size={18} color={colors.text3} />}
                </View>
                <Text style={[s.placeholderText, { color: colors.text3 }]}>
                  {loadingChains ? 'Loading networks…' : 'Select Network'}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.text2} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Asset Selector ── */}
      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.text2 }]}>Asset</Text>
        <TouchableOpacity
          onPress={onOpenAssetPicker}
          activeOpacity={selectedChain ? 0.8 : 1}
          disabled={!selectedChain}
        >
          <View style={[
            s.selectBox,
            { backgroundColor: colors.card, borderColor: colors.border },
            !selectedChain && { opacity: 0.45 },
          ]}>
            {selectedAsset ? (
              <>
                <LinearGradient
                  colors={getCoinColors(selectedAsset.symbol)}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>{selectedAsset.symbol[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.selectTitle, { color: colors.text }]}>{selectedAsset.name}</Text>
                  <Text style={[s.selectSub, { color: colors.text2 }]}>
                    {selectedAsset.symbol} · Min: {selectedAsset.minWithdrawalAmount}
                  </Text>
                </View>
              </>
            ) : (
              <View style={s.placeholderRow}>
                <View style={[s.placeholderCircle, { backgroundColor: colors.surface }]}>
                  {loadingAssets
                    ? <ActivityIndicator size="small" color={ACCENT} />
                    : <Ionicons name="wallet-outline" size={18} color={colors.text3} />}
                </View>
                <Text style={[s.placeholderText, { color: colors.text3 }]}>
                  {!selectedChain ? 'Select network first' : loadingAssets ? 'Loading assets…' : 'Select Asset'}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.text2} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Amount ── */}
      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.text2 }]}>Amount</Text>
        <View style={[
          s.amountBox,
          {
            backgroundColor: amountFocused ? ACCENT_DIM : colors.card,
            borderColor: hasInsufficient ? colors.red : amountFocused ? ACCENT : colors.border,
          },
          !selectedAsset && { opacity: 0.45 },
        ]}>
          <View style={s.amountTopRow}>
            <View style={[s.amountInputPill, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[s.bareInput, { color: colors.text, fontSize: 24, fontWeight: '600' }]}
                placeholder="0.00"
                placeholderTextColor={colors.text3}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={onAmountChange}
                onFocus={() => onAmountFocus(true)}
                onBlur={() => onAmountFocus(false)}
                editable={!!selectedAsset}
                underlineColorAndroid="transparent"
              />
            </View>
            <TouchableOpacity
              style={[s.symbolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={onOpenAssetPicker}
              activeOpacity={0.8}
            >
              <Text style={[s.symbolText, { color: colors.text }]}>
                {selectedAsset ? selectedAsset.symbol : 'Asset'}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMaxAmount}
              activeOpacity={0.8}
              disabled={!selectedAsset || loadingBalance}
            >
              <Text style={[s.maxText, { color: selectedAsset && !loadingBalance ? ACCENT : colors.text3 }]}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>

          <View style={s.amountBottomRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {loadingBalance
                ? <ActivityIndicator size="small" color={ACCENT} />
                : (
                  <Text style={[s.hintText, { color: colors.text2 }]}>
                    Avail:{' '}
                    <Text style={{ color: GREEN, fontWeight: '600' }}>
                      {formatBal(availableBalance, 4)} {selectedAsset?.symbol ?? ''}
                    </Text>
                  </Text>
                )}
            </View>
            <View style={s.quickRow}>
              {QUICK_AMOUNTS.map(q => (
                <TouchableOpacity
                  key={q}
                  onPress={() => onQuickAmount(q)}
                  style={[s.quickPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.7}
                  disabled={!selectedAsset}
                >
                  <Text style={[s.quickText, { color: colors.text2 }]}>{q * 100}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        {!!amountError && (
          <View style={s.errRow}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
            <Text style={[s.errText, { color: colors.red }]}>{amountError}</Text>
          </View>
        )}
      </View>

      {/* ── Destination Address ── */}
      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: colors.text2 }]}>Destination Address</Text>
        <View style={[
          s.addressBox,
          {
            backgroundColor: addressFocused ? ACCENT_DIM : colors.card,
            borderColor: addressError ? colors.red : addressFocused ? ACCENT : colors.border,
          },
          !selectedAsset && { opacity: 0.45 },
        ]}>
          <View style={[s.addressInputPill, { backgroundColor: colors.surface }]}>
            <Ionicons name="location-outline" size={16} color={colors.text3} style={{ marginRight: 6 }} />
            <TextInput
              style={[s.bareInput, { color: colors.text, fontSize: Typography.sm, flex: 1 }]}
              placeholder={
                !selectedChain ? 'Select network first'
                  : selectedChain.id === 'ethereum' || selectedChain.id === 'binance-smart-chain' ? '0x…'
                    : selectedChain.id === 'tron' ? 'T…'
                      : 'Enter destination address'
              }
              placeholderTextColor={colors.text3}
              value={toAddress}
              onChangeText={onAddressChange}
              onFocus={() => onAddressFocus(true)}
              onBlur={() => onAddressFocus(false)}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!!selectedAsset}
              underlineColorAndroid="transparent"
            />
            {!toAddress && (
              <TouchableOpacity
                onPress={onPasteAddress}
                style={[s.pasteBtn, { backgroundColor: ACCENT_DIM }]}
              >
                <Text style={[s.pasteBtnText, { color: ACCENT }]}>Paste</Text>
              </TouchableOpacity>
            )}
            {!!toAddress && (
              <TouchableOpacity onPress={onClearAddress} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color={colors.text3} />
              </TouchableOpacity>
            )}
          </View>

          {toAddress.length > 0 && (
            <View style={[
              s.addrValidRow,
              {
                backgroundColor: isValidAddress ? ACCENT_DIM : colors.redDim,
                borderRadius: Radius.lg,
                padding: 8,
              },
            ]}>
              <Ionicons
                name={isValidAddress ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={isValidAddress ? ACCENT : colors.red}
              />
              <Text style={[s.addrValidText, { color: isValidAddress ? ACCENT : colors.red }]}>
                {isValidAddress ? 'Valid address' : 'Invalid address format'}
              </Text>
            </View>
          )}
        </View>
        {!!addressError && (
          <View style={s.errRow}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
            <Text style={[s.errText, { color: colors.red }]}>{addressError}</Text>
          </View>
        )}
      </View>

      {/* ── Warning Banner ── */}
      <View style={[s.warningBanner, { backgroundColor: colors.orangeDim, borderColor: colors.orange + '44' }]}>
        <Ionicons name="warning-outline" size={16} color={colors.orange} />
        <Text style={[s.warningText, { color: colors.orange }]}>
          Double-check the destination address. Crypto withdrawals cannot be reversed.
        </Text>
      </View>

      {/* ── Summary (mobile native + narrow web) ── */}
      {showInlineSummary && selectedAsset && amount && toAddress && !hasInsufficient && isValidAddress && (
        <View style={[s.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'You Withdraw', val: `${amount} ${selectedAsset.symbol}`,                   color: colors.text },
            { label: 'Network Fee',  val: `${networkFee} ${selectedAsset.symbol}`,               color: colors.text },
            { label: 'You Will Get', val: `${recipientGets.toFixed(6)} ${selectedAsset.symbol}`, color: GREEN },
          ].map(({ label, val, color }, i, arr) => (
            <View
              key={label}
              style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}
            >
              <Text style={[s.summaryLabel, { color: colors.text2 }]}>{label}</Text>
              <Text style={[s.summaryVal, { color }]}>{val}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── PickersSheet ─────────────────────────────────────────────────────────────
interface PickersSheetProps {
  colors: any;
  showChainPicker: boolean;
  showAssetPicker: boolean;
  onCloseChain: () => void;
  onCloseAsset: () => void;
  blockchains: Blockchain[];
  assets: WalletAsset[];
  loadingChains: boolean;
  loadingAssets: boolean;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  onSelectChain: (c: Blockchain) => void;
  onSelectAsset: (a: WalletAsset) => void;
}

function PickersSheet({
  colors, showChainPicker, showAssetPicker,
  onCloseChain, onCloseAsset,
  blockchains, assets, loadingChains, loadingAssets,
  selectedChain, selectedAsset,
  onSelectChain, onSelectAsset,
}: PickersSheetProps) {
  return (
    <>
      <BottomSheet visible={showChainPicker} title="Select Network" onClose={onCloseChain} colors={colors}>
        {loadingChains
          ? <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
          : blockchains.map((c: Blockchain) => (
            <TouchableOpacity
              key={c.id}
              style={[s.pickerRow, { borderBottomColor: colors.borderSoft }]}
              onPress={() => onSelectChain(c)}
              activeOpacity={0.7}
            >
              {chainImageUrl(c) ? (
                <Image source={{ uri: chainImageUrl(c)! }} style={s.pickerImg} />
              ) : (
                <LinearGradient colors={getCoinColors(c.native_currency)} style={s.pickerCircle}>
                  <Text style={s.pickerCircleText}>{c.native_currency[0]}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.pickerLabel, { color: colors.text }]}>{c.name}</Text>
                <Text style={[s.pickerSub, { color: colors.text2 }]}>{c.native_currency}</Text>
              </View>
              {selectedChain?.id === c.id && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
            </TouchableOpacity>
          ))}
      </BottomSheet>

      <BottomSheet visible={showAssetPicker} title="Select Asset" onClose={onCloseAsset} colors={colors}>
        {loadingAssets
          ? <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
          : assets.length === 0
            ? <Text style={[s.emptyText, { color: colors.text2 }]}>No withdrawal-enabled assets</Text>
            : assets.map((a: WalletAsset) => (
              <TouchableOpacity
                key={a._id}
                style={[
                  s.pickerRow,
                  { borderBottomColor: colors.borderSoft },
                  selectedAsset?._id === a._id && { backgroundColor: ACCENT_DIM },
                ]}
                onPress={() => onSelectAsset(a)}
                activeOpacity={0.7}
              >
                <LinearGradient colors={getCoinColors(a.symbol)} style={s.pickerCircle}>
                  <Text style={s.pickerCircleText}>{a.symbol[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.pickerLabel, { color: colors.text }]}>{a.symbol}</Text>
                  <Text style={[s.pickerSub, { color: colors.text2 }]}>
                    {a.name} · Min: {a.minWithdrawalAmount}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {a.balance && (
                    <Text style={[s.pickerBal, { color: GREEN }]}>{formatBal(a.balance, a.decimals)}</Text>
                  )}
                  {selectedAsset?._id === a._id && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                </View>
              </TouchableOpacity>
            ))}
      </BottomSheet>
    </>
  );
}

// ─── ModalsSheet ──────────────────────────────────────────────────────────────
function ModalsSheet({
  colors,
  showConfirm,
  isWithdrawing,
  selectedChain,
  selectedAsset,
  toAddress,
  amount,
  networkFee,
  recipientGets,
  onCancelConfirm,
  onExecute,
}: {
  colors: any;
  showConfirm: boolean;
  isWithdrawing: boolean;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  toAddress: string;
  amount: string;
  networkFee: number;
  recipientGets: number;
  onCancelConfirm: () => void;
  onExecute: () => void;
}) {
  return (
    <>
      <Modal visible={showConfirm} transparent animationType="fade" statusBarTranslucent>
        <View style={[s.overlay, { backgroundColor: 'rgba(0,0,0,0.78)' }]}>
          <View style={[s.confirmCard, { backgroundColor: colors.card, maxWidth: IS_WEB ? 440 : undefined }]}>
            <View style={[s.confirmIcon, { backgroundColor: ACCENT_DIM }]}>
              <Ionicons name="arrow-up-circle" size={32} color={ACCENT} />
            </View>
            <Text style={[s.confirmTitle, { color: colors.text }]}>Confirm Withdrawal</Text>
            <Text style={[s.confirmSub, { color: colors.text2 }]}>Please review before confirming</Text>

            {[
              { label: 'Network', value: selectedChain?.name },
              { label: 'Asset',   value: `${selectedAsset?.name} (${selectedAsset?.symbol})` },
              { label: 'To',      value: toAddress, mono: true },
              { label: 'Amount',  value: `${amount} ${selectedAsset?.symbol}`, green: true },
              { label: 'Fee',     value: `${networkFee} ${selectedAsset?.symbol}` },
              { label: 'You Get', value: `${recipientGets.toFixed(6)} ${selectedAsset?.symbol}`, green: true },
            ].map(({ label, value, green, mono }: any) => (
              <View key={label} style={[s.confirmRow, { borderBottomColor: colors.borderSoft }]}>
                <Text style={[s.confirmLabel, { color: colors.text2 }]}>{label}</Text>
                <Text
                  style={[
                    s.confirmValue,
                    { color: green ? GREEN : colors.text },
                    green && { fontWeight: '700' },
                    mono && { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {value}
                </Text>
              </View>
            ))}

            <View style={[s.confirmWarning, { backgroundColor: colors.orangeDim }]}>
              <Ionicons name="warning-outline" size={14} color={colors.orange} />
              <Text style={[s.confirmWarningText, { color: colors.orange }]}>
                This action cannot be undone
              </Text>
            </View>

            <View style={s.confirmActions}>
              <TouchableOpacity
                style={[s.cancelBtn, { backgroundColor: colors.surface }]}
                onPress={onCancelConfirm}
              >
                <Text style={[s.cancelText, { color: colors.text2 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.withdrawBtn, isWithdrawing && { opacity: 0.6 }]}
                onPress={onExecute}
                disabled={isWithdrawing}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[ACCENT, ACCENT_BRIGHT]}
                  style={s.withdrawBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {isWithdrawing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[s.withdrawBtnText, { color: '#fff' }]}>Confirm Withdrawal</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Screen ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function WithdrawScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const { width: scrWidth } = useWindowDimensions();
  const showSidebar         = IS_WEB && scrWidth >= WEB_SIDEBAR_BP;

  const [selectedChain, setSelectedChain] = useState<Blockchain | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<WalletAsset | null>(null);
  const [amount,        setAmount]        = useState('');
  const [toAddress,     setToAddress]     = useState('');
  const [network,       setNetwork]       = useState('');

  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const [showInstruction, setShowInstruction] = useState(false);

  const [showConfirm,    setShowConfirm]    = useState(false);
  const [amountError,    setAmountError]    = useState('');
  const [addressError,   setAddressError]   = useState('');
  const [amountFocused,  setAmountFocused]  = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);

  const chainApiId = selectedChain ? getApiChainId(selectedChain) : '';

  const { data: blockchainsData, isLoading: loadingChains } = useSupportedBlockchains();
  const blockchains: Blockchain[] = useMemo(() => {
    const data = blockchainsData as any;
    return Array.isArray(data) ? data : data?.data ?? data?.blockchains ?? [];
  }, [blockchainsData]);

  const { data: assetsData, isLoading: loadingAssets } = useAssetsByChain(chainApiId);
  const assets = useMemo(() => {
    const all = assetsData as WalletAsset[] ?? [];
    return all.filter((a: any) => a.withdrawalEnabled !== false);
  }, [assetsData]);

  const { data: availableBalanceStr, isLoading: loadingBalance } = useAssetBalance(
    chainApiId || undefined,
    selectedAsset?._id || undefined,
  );

  const availableBalance = useMemo(() => {
    if (availableBalanceStr) return parseFloat(availableBalanceStr);
    return parseFloat(selectedAsset?.balance ?? '0');
  }, [availableBalanceStr, selectedAsset]);

  const withdrawMutation = useWithdraw();
  const isWithdrawing    = withdrawMutation.isPending;

  const enteredAmount   = useMemo(() => parseFloat(amount) || 0, [amount]);
  const hasInsufficient = useMemo(() => enteredAmount > availableBalance, [enteredAmount, availableBalance]);

  const isValidAmount = useMemo(() => {
    const min = parseFloat(selectedAsset?.minWithdrawalAmount ?? '0');
    return enteredAmount > 0 && !hasInsufficient && enteredAmount >= min;
  }, [enteredAmount, hasInsufficient, selectedAsset]);

  const isValidAddress = useMemo(() => {
    if (!toAddress) return false;
    if (selectedChain) return validateAddress(toAddress, getApiChainId(selectedChain));
    return toAddress.length > 10;
  }, [toAddress, selectedChain]);

  const canSubmit = useMemo(() =>
    !!selectedChain && !!selectedAsset && isValidAmount && isValidAddress && !isWithdrawing,
    [selectedChain, selectedAsset, isValidAmount, isValidAddress, isWithdrawing],
  );

  const networkFee    = parseFloat(selectedAsset?.withdrawalFee ?? '0.0002');
  const recipientGets = Math.max(0, enteredAmount - networkFee);

  const prevChainRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedChain || selectedChain.id === prevChainRef.current) return;
    prevChainRef.current = selectedChain.id;
    setSelectedAsset(null);
    setAmount('');
    setToAddress('');
    setNetwork(getApiChainId(selectedChain));
  }, [selectedChain]);

  useEffect(() => {
    if (!amount) { setAmountError(''); return; }
    if (isNaN(parseFloat(amount))) { setAmountError('Invalid amount'); return; }
    if (parseFloat(amount) <= 0)   { setAmountError('Amount must be > 0'); return; }
    const min = parseFloat(selectedAsset?.minWithdrawalAmount ?? '0');
    if (parseFloat(amount) < min)  {
      setAmountError(`Minimum withdrawal: ${min} ${selectedAsset?.symbol}`);
      return;
    }
    if (hasInsufficient) {
      setAmountError(`Insufficient. Available: ${formatBal(availableBalance, 6)}`);
      return;
    }
    setAmountError('');
  }, [amount, hasInsufficient, availableBalance, selectedAsset]);

  useEffect(() => {
    if (!toAddress) { setAddressError(''); return; }
    if (selectedChain && !validateAddress(toAddress, getApiChainId(selectedChain))) {
      setAddressError(`Invalid ${selectedChain.name} address`);
      return;
    }
    setAddressError('');
  }, [toAddress, selectedChain]);

  const handleAmountChange = useCallback((v: string) => {
    const s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    setAmount(s);
  }, []);

  const handleMaxAmount = useCallback(() => {
    if (availableBalance <= 0) return;
    const maxAmt = Math.max(0, availableBalance - networkFee);
    setAmount(maxAmt > 0 ? maxAmt.toString() : availableBalance.toString());
  }, [availableBalance, networkFee]);

  const handleQuickAmount = useCallback((q: number) => {
    if (!selectedAsset) return;
    setAmount((availableBalance * q).toFixed(6));
  }, [availableBalance, selectedAsset]);

  const handlePasteAddress = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setToAddress(text.trim());
    } catch {}
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setShowInstruction(true);
  }, [canSubmit]);

  const handleInstructionConfirm = useCallback(() => {
    setShowInstruction(false);
    setShowConfirm(true);
  }, []);

  const handleSelectChain = useCallback((c: Blockchain) => {
    setSelectedChain(c);
    setShowChainPicker(false);
  }, []);

  const handleSelectAsset = useCallback((a: WalletAsset) => {
    setSelectedAsset(a);
    setShowAssetPicker(false);
  }, []);

  const executeWithdraw = useCallback(async () => {
    setShowConfirm(false);
    try {
      await withdrawMutation.mutateAsync({
        toAddress,
        amount:  enteredAmount,
        assetId: selectedAsset!._id,
        chainId: getApiChainId(selectedChain!),
        network,
      });

      showAlert(
        'Withdrawal Submitted 🎉',
        `${amount} ${selectedAsset?.symbol} withdrawal initiated.\nIt may take a few minutes to process.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );

      setAmount('');
      setToAddress('');
      setSelectedAsset(null);
      setSelectedChain(null);
      prevChainRef.current = null;

    } catch (e: any) {
      showAlert(
        'Withdrawal Failed',
        e?.response?.data?.message ?? e?.message ?? 'Something went wrong. Try again.',
      );
    }
  }, [withdrawMutation, toAddress, enteredAmount, selectedAsset, selectedChain, network, amount, router]);

  const formProps: FormContentProps = {
    colors, selectedChain, selectedAsset,
    amount, toAddress,
    amountFocused, addressFocused,
    amountError, addressError,
    hasInsufficient, isValidAddress,
    availableBalance, loadingChains, loadingAssets, loadingBalance,
    networkFee, recipientGets,
    showInlineSummary: !showSidebar,
    onAmountChange:    handleAmountChange,
    onMaxAmount:       handleMaxAmount,
    onAddressChange:   setToAddress,
    onClearAddress:    () => setToAddress(''),
    onPasteAddress:    handlePasteAddress,
    onAmountFocus:     setAmountFocused,
    onAddressFocus:    setAddressFocused,
    onOpenChainPicker: () => setShowChainPicker(true),
    onOpenAssetPicker: () => selectedChain && setShowAssetPicker(true),
    onQuickAmount:     handleQuickAmount,
  };

  const modalsProps = {
    colors,
    showConfirm,
    isWithdrawing,
    selectedChain,
    selectedAsset,
    toAddress,
    amount,
    networkFee,
    recipientGets,
    onCancelConfirm: () => setShowConfirm(false),
    onExecute:       executeWithdraw,
  };

  const pickersProps: PickersSheetProps = {
    colors,
    showChainPicker,
    showAssetPicker,
    onCloseChain:  () => setShowChainPicker(false),
    onCloseAsset:  () => setShowAssetPicker(false),
    blockchains,
    assets,
    loadingChains,
    loadingAssets,
    selectedChain,
    selectedAsset,
    onSelectChain: handleSelectChain,
    onSelectAsset: handleSelectAsset,
  };

  const instructionCautions = [
    { id: '1', text: 'Input the exact amount which displayed in the following page.' },
    { id: '2', text: 'Do NOT save or reuse this wallet address.' },
    {
      id: '3',
      text: `Only accept ${selectedAsset?.symbol ?? 'crypto'} on ${selectedChain?.name ?? 'selected'} network. Incorrect currency may result in loss of funds.`,
    },
  ];

  if (IS_WEB) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[webS.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
          <View style={webS.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[webS.backBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[webS.headerTitle, { color: colors.text }]}>Withdraw Crypto</Text>
              <Text style={[webS.headerSub, { color: colors.text2 }]}>Withdraw to any external wallet</Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            webS.bodyScroll,
            !showSidebar && { alignItems: 'stretch' },
          ]}
        >
          <View style={[
            webS.body,
            !showSidebar && {
              flexDirection: 'column',
              maxWidth:      600,
              alignSelf:     'center',
              width:         '100%',
            },
          ]}>
            <View style={[
              webS.leftCol,
              !showSidebar && { maxWidth: '100%', minWidth: 0 },
            ]}>
              <FormContent {...formProps} />
            </View>

            {showSidebar && (
              <WebRightPanel
                colors={colors}
                selectedChain={selectedChain}
                selectedAsset={selectedAsset}
                amount={amount}
                toAddress={toAddress}
                loadingBalance={loadingBalance}
                availableBalance={availableBalance}
                networkFee={networkFee}
                recipientGets={recipientGets}
                hasInsufficient={hasInsufficient}
                isValidAddress={isValidAddress}
                canSubmit={canSubmit}
                isWithdrawing={isWithdrawing}
                onSubmit={handleSubmit}
              />
            )}
          </View>

          {!showSidebar && <View style={{ height: 100 }} />}
        </ScrollView>

        {!showSidebar && (
          <View style={[webS.bottomBar, { paddingBottom: 16, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={{ width: '100%' }}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_BRIGHT]}
                style={[s.continueBtn, !canSubmit && { opacity: 0.5 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {isWithdrawing
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[s.continueBtnText, { color: '#fff' }]}>Withdraw</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <PickersSheet {...pickersProps} />

        <TransferInstructionModal
          visible={showInstruction}
          onClose={() => setShowInstruction(false)}
          onConfirm={handleInstructionConfirm}
          title="Withdrawal Instruction"
          cautions={instructionCautions}
        />

        <ModalsSheet {...modalsProps} />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Withdraw</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        <FormContent {...formProps} />
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={[ACCENT, ACCENT_BRIGHT]}
            style={[s.continueBtn, !canSubmit && { opacity: 0.5 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {isWithdrawing
              ? <ActivityIndicator color="#fff" />
              : <Text style={[s.continueBtnText, { color: '#fff' }]}>Withdraw</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <PickersSheet {...pickersProps} />

      <TransferInstructionModal
        visible={showInstruction}
        onClose={() => setShowInstruction(false)}
        onConfirm={handleInstructionConfirm}
        title="Withdrawal Instruction"
        cautions={instructionCautions}
      />

      <ModalsSheet {...modalsProps} />
    </View>
  );
}

// ─── Web Styles ───────────────────────────────────────────────────────────────
const webS = StyleSheet.create({
  header:      { borderBottomWidth: 1, paddingVertical: 16, paddingHorizontal: 32 },
  headerInner: { flexDirection: 'row', alignItems: 'center', maxWidth: 1100, width: '100%', alignSelf: 'center', gap: 16 },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub:   { fontSize: 13, marginTop: 2 },
  bodyScroll:  { flexGrow: 1, paddingHorizontal: 32, paddingVertical: 32, alignItems: 'center' },
  body:        { flexDirection: 'row', gap: 24, width: '100%', maxWidth: 1100, alignItems: 'flex-start' },
  leftCol:     { flex: 1, minWidth: 320, maxWidth: 640 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[3],
    borderTopWidth: 1,
  },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, width: '100%' },
  scroll: { padding: Spacing[4] },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[5], paddingBottom: Spacing[4], borderBottomWidth: 1,
  },
  iconBtn:     { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontWeight: '700' },
  formWrap:    { gap: Spacing[4] },
  fieldGroup:  { gap: 8 },
  fieldLabel:  { fontSize: Typography.sm, fontWeight: '600', marginLeft: 2 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    borderRadius: Radius.xl, borderWidth: 1, minHeight: 68,
  },
  selectTitle:       { fontSize: Typography.base, fontWeight: '600' },
  selectSub:         { fontSize: Typography.xs, marginTop: 2 },
  chainLogo:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText:          { fontSize: 16, fontWeight: '700', color: '#FFF' },
  placeholderRow:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeholderCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  placeholderText:   { fontSize: Typography.sm },
  amountBox:         { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  amountTopRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInputPill:   { flex: 1, borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  symbolPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.lg, borderWidth: 1,
  },
  symbolText:      { fontSize: Typography.sm, fontWeight: '700' },
  maxText:         { fontSize: Typography.sm, fontWeight: '700' },
  amountBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hintText:        { fontSize: Typography.xs },
  quickRow:        { flexDirection: 'row', gap: 6 },
  quickPill:       { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full, borderWidth: 1 },
  quickText:       { fontSize: Typography.xs },
  addressBox:       { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  addressInputPill: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  pasteBtn:         { paddingVertical: 6, paddingHorizontal: 12, borderRadius: Radius.lg },
  pasteBtnText:     { fontSize: Typography.xs, fontWeight: '700' },
  addrValidRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addrValidText:    { fontSize: Typography.xs, fontWeight: '600' },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1,
  },
  warningText:   { flex: 1, fontSize: Typography.xs, lineHeight: 18 },
  summaryBox:    { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[4],
  },
  summaryLabel:  { fontSize: Typography.sm },
  summaryVal:    { fontSize: Typography.sm, fontWeight: '700' },
  errRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  errText:       { fontSize: Typography.xs },
  bareInput: {
    padding: 0, margin: 0,
    ...(Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'none' } as any),
  },
  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', paddingHorizontal: Spacing[5], paddingTop: Spacing[3] },
  continueBtn:     { borderRadius: Radius['2xl'], paddingVertical: 16, alignItems: 'center' },
  continueBtnText: { fontSize: Typography.base, fontWeight: '700', letterSpacing: 0.5 },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[4], paddingHorizontal: Spacing[5], borderBottomWidth: 1 },
  pickerImg:        { width: 40, height: 40, borderRadius: 20 },
  pickerCircle:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerCircleText: { fontSize: Typography.sm, fontWeight: '700', color: '#FFF' },
  pickerLabel:      { fontSize: Typography.base, fontWeight: '600' },
  pickerSub:        { fontSize: Typography.xs, marginTop: 2 },
  pickerBal:        { fontSize: Typography.xs, fontWeight: '600' },
  emptyText:        { textAlign: 'center', padding: Spacing[6], fontSize: Typography.sm },
  overlay:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[5] },

  confirmCard:        { width: '100%', borderRadius: Radius['2xl'], padding: Spacing[6] },
  confirmIcon:        { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: Spacing[4] },
  confirmTitle:       { fontSize: Typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  confirmSub:         { fontSize: Typography.sm, textAlign: 'center', marginBottom: Spacing[5] },
  confirmRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[3], borderBottomWidth: 1 },
  confirmLabel:       { fontSize: Typography.sm },
  confirmValue:       { fontSize: Typography.sm, flex: 1, textAlign: 'right', marginLeft: Spacing[3] },
  confirmWarning:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing[3], borderRadius: Radius.lg, marginTop: Spacing[3] },
  confirmWarningText: { fontSize: Typography.xs },
  confirmActions:     { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[5] },
  cancelBtn:          { flex: 1, padding: Spacing[4], borderRadius: Radius.lg, alignItems: 'center' },
  cancelText:         { fontSize: Typography.sm, fontWeight: '600' },
  withdrawBtn:        { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  withdrawBtnGrad:    { padding: Spacing[4], alignItems: 'center', justifyContent: 'center' },
  withdrawBtnText:    { fontSize: Typography.sm, fontWeight: '700' },
  borderSoft:         {},
});