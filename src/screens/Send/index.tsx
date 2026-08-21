// ─────────────────────────────────────────────────────────────────────────────
// SendScreen.tsx – Fully theme-integrated, all functionality preserved
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Platform, Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius,
  IconSize, IconBox, getShadow,
} from '@/styles/theme';
import {
  useSupportedBlockchains,
  useAssetsByChain,
  useAssetBalance,
  useTransactionHistory,
  useSendCrypto,
  type WalletAsset,
} from '@/hooks/queires';
import { TransferInstructionModal } from '@/components/common/TransferInstructionModal';

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Blockchain {
  id: string;
  name: string;
  native_currency: string;
  chainId: number | null;
  image?: { thumb?: string; small?: string; large?: string };
}

interface WalletBalance {
  availableBalance: string;
  lockedBalance: string;
  status: string;
}

interface TxAsset { _id: string; name: string; symbol: string; }
interface TxItem {
  _id: string;
  userId: string;
  asset: TxAsset;
  type: string;
  amount: string;
  balanceBefore?: string;
  balanceAfter?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar', flag: '🇺🇸' },
  { value: 'EUR', label: 'EUR - Euro',       flag: '🇪🇺' },
  { value: 'GBP', label: 'GBP - Pound',      flag: '🇬🇧' },
];

const QUICK_AMOUNTS = [0.25, 0.5, 1.0];

const COIN_COLORS: Record<string, [string, string]> = {
  BTC:  ['#F7931A', '#E8830A'],
  ETH:  ['#627EEA', '#4A6DD8'],
  TRX:  ['#FF4D6A', '#E83050'],
  BNB:  ['#F5A623', '#E09510'],
  USDT: ['#26A17B', '#1A8A66'],
  USDC: ['#2775CA', '#1A60B5'],
};

// ✅ Theme-integrated accent colors
const GREEN          = '#27AE60';
const GREEN_BRIGHT   = '#2ECC71';
const IS_WEB         = Platform.OS === 'web';
const WEB_SIDEBAR_BP = 860;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#334155', '#1E293B'];

const validateEth  = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a);
const validateTron = (a: string) => /^T[a-zA-Z0-9]{33}$/.test(a);
const validateBtc  = (a: string) => /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(a);

const validateAddress = (address: string, chain: string) => {
  if (!address || address.length < 10) return false;
  switch (chain.toUpperCase()) {
    case 'ETH': case 'BSC':  return validateEth(address);
    case 'TRX': case 'TRON': return validateTron(address);
    case 'BTC':              return validateBtc(address);
    default:                 return address.length > 10;
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

const formatBal = (b?: string, decimals = 6) =>
  b
    ? parseFloat(b).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: Math.min(decimals, 8),
      })
    : '0.00';

const extractRecipientId = (note?: string) => {
  if (!note) return '—';
  const match = note.match(/Sent to ([a-f0-9]+)/i);
  if (match) {
    const id = match[1];
    return id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-6)}` : id;
  }
  return note;
};

const extractAddressFromQr = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  const uriMatch = trimmed.match(/^[a-zA-Z0-9.\-]+:([^?]+)/);
  if (uriMatch) return uriMatch[1];
  return trimmed;
};

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
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

// ─── BottomSheet ──────────────────────────────────────────────────────────────
function BottomSheet({ visible, title, onClose, colors, children }: any) {
  if (IS_WEB) {
    if (!visible) return null;
    return (
      <View style={webSheet.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[
          webSheet.panel,
          {
            backgroundColor: colors.card,
            borderColor:     colors.border,
            ...getShadow(true, 'lg'),
          },
        ]}>
          <View style={[webSheet.header, { borderBottomColor: colors.border }]}>
            <Text style={[webSheet.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[webSheet.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={IconSize.sm} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            {children}
            <View style={{ height: Spacing[4] }} />
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
              <Ionicons name="close" size={IconSize.md} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
            <View style={{ height: Spacing[8] }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const webSheet = StyleSheet.create({
  backdrop: {
    position:        'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex:          9999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         Spacing[6],
  },
  panel: {
    width:        '100%',
    maxWidth:     480,
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    overflow:     'hidden',
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical:   Spacing[4],
    borderBottomWidth: 1,
  },
  title:    { fontSize: Typography.md, fontWeight: Typography.bold },
  closeBtn: {
    width:          IconBox.xs,
    height:         IconBox.xs,
    borderRadius:   IconBox.xs / 2,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

const nativeSheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:   {
    borderTopLeftRadius:  Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    maxHeight:            '80%',
    paddingBottom:        Spacing[6],
  },
  handle: {
    width:       40,
    height:      4,
    borderRadius: 2,
    alignSelf:   'center',
    marginTop:   Spacing[3],
    marginBottom: Spacing[2],
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical:   Spacing[4],
    borderBottomWidth: 1,
  },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold },
});

// ─── RecentList ───────────────────────────────────────────────────────────────
function RecentList({
  colors,
  onSelect,
}: {
  colors: any;
  onSelect: (addr: string) => void;
}) {
  const { data, isLoading } = useTransactionHistory(1, 5);
  const history = data?.items ?? [];

  if (isLoading) {
    return (
      <View style={{ paddingVertical: Spacing[3], alignItems: 'center' }}>
        <ActivityIndicator size="small" color={GREEN} />
      </View>
    );
  }

  if (!history.length) {
    return (
      <Text style={[rlStyles.emptyText, { color: colors.text2 }]}>
        No recent transactions
      </Text>
    );
  }

  return (
    <>
      <Text style={[rlStyles.label, { color: colors.text2 }]}>Recent</Text>
      {history.map((tx: TxItem, i: number) => {
        const recipientShort = extractRecipientId(tx.note);
        const rawId          = tx.note?.replace(/^Sent to /i, '') ?? '';
        const [c1, c2]       = getCoinColors(tx.asset?.symbol ?? '');
        const initials       = (tx.asset?.symbol ?? '??').slice(0, 2).toUpperCase();
        const dateStr        = new Date(tx.createdAt).toLocaleDateString(undefined, {
          day: '2-digit', month: 'short',
        });

        return (
          <TouchableOpacity
            key={tx._id}
            style={[
              rlStyles.row,
              i < history.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSoft,
              },
            ]}
            onPress={() => onSelect(rawId)}
            activeOpacity={0.7}
          >
            <LinearGradient colors={[c1, c2]} style={rlStyles.avatar}>
              <Text style={rlStyles.initials}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
              <Text style={[rlStyles.name, { color: colors.text }]}>
                -{parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                {tx.asset?.symbol}
              </Text>
              <Text style={[rlStyles.addr, { color: colors.text2 }]} numberOfLines={1}>
                {recipientShort}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={[rlStyles.date, { color: colors.text3 }]}>{dateStr}</Text>
              <Ionicons name="chevron-forward" size={IconSize.xs} color={colors.text3} />
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );
}

const rlStyles = StyleSheet.create({
  label:     { fontSize: Typography.xs, fontWeight: Typography.semibold, marginBottom: Spacing[2] },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3] },
  avatar:    { width: IconBox.sm, height: IconBox.sm, borderRadius: IconBox.sm / 2, alignItems: 'center', justifyContent: 'center' },
  initials:  { fontSize: Typography.sm, fontWeight: Typography.bold, color: '#fff' },
  name:      { fontSize: Typography.sm, fontWeight: Typography.semibold },
  addr:      { fontSize: Typography.xs, marginTop: 2 },
  date:      { fontSize: Typography.xs },
  emptyText: { fontSize: Typography.sm, paddingVertical: Spacing[2] },
});

// ─── RecipientField ───────────────────────────────────────────────────────────
interface RecipientFieldProps {
  colors: any;
  recipient: string;
  setRecipient: (v: string) => void;
  recipientError: string;
  focused: boolean;
  setFocused: (v: boolean) => void;
  editable: boolean;
  placeholder: string;
  onScanPress: () => void;
}

const RecipientField = React.memo(({
  colors, recipient, setRecipient, recipientError,
  focused, setFocused, editable, placeholder, onScanPress,
}: RecipientFieldProps) => (
  <View style={S.fieldGroup}>
    <Text style={[S.fieldLabel, { color: colors.text2 }]}>To</Text>
    <View style={[
      S.recipientOuterBox,
      {
        backgroundColor: focused ? colors.greenDim : colors.card,
        borderColor:     recipientError ? colors.red : focused ? GREEN : colors.border,
      },
      !editable && { opacity: 0.45 },
    ]}>
      <View style={[
        S.recipientPill,
        { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' },
      ]}>
        <TextInput
          style={[S.bareInput, { flex: 1, color: colors.text, fontSize: Typography.sm, minHeight: 36 }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          value={recipient}
          onChangeText={setRecipient}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          underlineColorAndroid="transparent"
        />
        {editable && !IS_WEB && (
          <TouchableOpacity
            onPress={onScanPress}
            style={{ padding: Spacing[1], marginLeft: Spacing[2] }}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={IconSize.md} color={colors.text2} />
          </TouchableOpacity>
        )}
      </View>
      <View style={[S.recipientDivider, { backgroundColor: colors.borderSoft }]} />
      <RecentList colors={colors} onSelect={(addr) => { if (editable) setRecipient(addr); }} />
    </View>
    {!!recipientError && (
      <View style={S.errRow}>
        <Ionicons name="alert-circle-outline" size={IconSize.xs} color={colors.red} />
        <Text style={[S.errText, { color: colors.red }]}>{recipientError}</Text>
      </View>
    )}
  </View>
));

// ─── AmountField ──────────────────────────────────────────────────────────────
interface AmountFieldProps {
  colors: any;
  amount: string;
  onAmountChange: (v: string) => void;
  amountFocused: boolean;
  setAmountFocused: (v: boolean) => void;
  hasInsufficient: boolean;
  amountError: string;
  availableBalance: number;
  loadingBalance: boolean;
  selectedAsset: WalletAsset | null;
  selectedChain: Blockchain | null;
  networkFee: number;
  onMax: () => void;
  onOpenAssetPicker: () => void;
}

const AmountField = React.memo(({
  colors, amount, onAmountChange, amountFocused, setAmountFocused,
  hasInsufficient, amountError, availableBalance, loadingBalance,
  selectedAsset, selectedChain, networkFee, onMax, onOpenAssetPicker,
}: AmountFieldProps) => (
  <View style={S.fieldGroup}>
    <Text style={[S.fieldLabel, { color: colors.text2 }]}>Amount</Text>
    <View style={[
      S.amountBox,
      {
        backgroundColor: amountFocused ? colors.greenDim : colors.card,
        borderColor:     hasInsufficient ? colors.red : amountFocused ? GREEN : colors.border,
      },
      !selectedAsset && { opacity: 0.45 },
    ]}>
      <View style={S.amountTopRow}>
        <View style={[S.amountInputPill, { backgroundColor: colors.surface }]}>
          <TextInput
            style={[S.bareInput, { color: colors.text, fontSize: Typography['2xl'], fontWeight: Typography.semibold }]}
            placeholder="0.00"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={onAmountChange}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            editable={!!selectedAsset}
            underlineColorAndroid="transparent"
          />
        </View>
        <TouchableOpacity
          style={[S.symbolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => selectedChain && onOpenAssetPicker()}
          activeOpacity={0.8}
        >
          <Text style={[S.symbolText, { color: colors.text }]}>
            {selectedAsset ? selectedAsset.symbol : 'Asset'}
          </Text>
          <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMax}
          activeOpacity={0.8}
          disabled={!selectedAsset || loadingBalance}
        >
          <Text style={[S.maxText, {
            color: selectedAsset && !loadingBalance ? GREEN : colors.text3,
          }]}>
            MAX
          </Text>
        </TouchableOpacity>
      </View>

      <View style={S.amountBottomRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[1] }}>
          {loadingBalance
            ? <ActivityIndicator size="small" color={GREEN} />
            : (
              <Text style={[S.usdHint, { color: colors.text2 }]}>
                Avail:{' '}
                <Text style={{ color: GREEN, fontWeight: Typography.semibold }}>
                  {formatBal(availableBalance.toString(), 4)} {selectedAsset?.symbol ?? ''}
                </Text>
              </Text>
            )}
        </View>
        <View style={S.quickRow}>
          {QUICK_AMOUNTS.map(q => (
            <TouchableOpacity
              key={q}
              onPress={() => {
                if (!selectedAsset) return;
                onAmountChange((availableBalance * q).toFixed(6));
              }}
              style={[S.quickPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              disabled={!selectedAsset}
            >
              <Text style={[S.quickText, { color: colors.text2 }]}>{q * 100}%</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
    {!!amountError && (
      <View style={S.errRow}>
        <Ionicons name="alert-circle-outline" size={IconSize.xs} color={colors.red} />
        <Text style={[S.errText, { color: colors.red }]}>{amountError}</Text>
      </View>
    )}
  </View>
));

// ─── FiatAmountField ──────────────────────────────────────────────────────────
interface FiatAmountFieldProps {
  colors: any;
  fiatAmount: string;
  onFiatAmountChange: (v: string) => void;
  fiatAmountFocused: boolean;
  setFiatAmountFocused: (v: boolean) => void;
}

const FiatAmountField = React.memo(({
  colors, fiatAmount, onFiatAmountChange, fiatAmountFocused, setFiatAmountFocused,
}: FiatAmountFieldProps) => (
  <View style={S.fieldGroup}>
    <Text style={[S.fieldLabel, { color: colors.text2 }]}>Amount</Text>
    <View style={[
      S.inputFieldBox,
      {
        backgroundColor: fiatAmountFocused ? colors.greenDim : colors.card,
        borderColor:     fiatAmountFocused ? GREEN : colors.border,
      },
    ]}>
      <View style={[S.amountInputPill, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[S.bareInput, { color: colors.text, fontSize: Typography.xl, fontWeight: Typography.semibold }]}
          placeholder="0.00"
          placeholderTextColor={colors.text3}
          keyboardType="decimal-pad"
          value={fiatAmount}
          onChangeText={onFiatAmountChange}
          onFocus={() => setFiatAmountFocused(true)}
          onBlur={() => setFiatAmountFocused(false)}
          underlineColorAndroid="transparent"
        />
      </View>
      <View style={[S.currencyBadge, { backgroundColor: colors.surface }]}>
        <Text style={[S.currencyBadgeText, { color: colors.text2 }]}>Crypto</Text>
        <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text2} />
      </View>
    </View>
  </View>
));

// ─── ComingSoonField ──────────────────────────────────────────────────────────
function ComingSoonField({ colors }: { colors: any }) {
  return (
    <View style={S.fieldGroup}>
      <Text style={[S.fieldLabel, { color: colors.text2 }]}>To</Text>
      <View style={[S.comingSoonBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[S.comingSoonBadge, { backgroundColor: colors.greenDim }]}>
          <Ionicons name="time-outline" size={IconSize.md} color={GREEN} />
          <Text style={[S.comingSoonTitle, { color: GREEN }]}>Coming Soon</Text>
        </View>
        <Text style={[S.comingSoonSub, { color: colors.text2 }]}>
          Fiat payout address feature is under development.{'\n'}Stay tuned for updates!
        </Text>
      </View>
    </View>
  );
}

// ─── AssetIcon ────────────────────────────────────────────────────────────────
const AssetIcon = React.memo(({ asset, size = 40 }: { asset: WalletAsset; size?: number }) => {
  const [c1, c2] = getCoinColors(asset.symbol);
  return (
    <LinearGradient
      colors={[c1, c2]}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: Typography.bold, color: '#FFF' }}>
        {asset.symbol[0]}
      </Text>
    </LinearGradient>
  );
});

// ─── NetworkSelector ──────────────────────────────────────────────────────────
interface NetworkSelectorProps {
  colors: any;
  selectedChain: Blockchain | null;
  loadingChains: boolean;
  onPress: () => void;
  chainImageUrl: (c: Blockchain) => string | null;
}

const NetworkSelector = React.memo(({
  colors, selectedChain, loadingChains, onPress, chainImageUrl,
}: NetworkSelectorProps) => (
  <View style={S.fieldGroup}>
    <Text style={[S.fieldLabel, { color: colors.text2 }]}>Network</Text>
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[S.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {selectedChain ? (
          <>
            {chainImageUrl(selectedChain) ? (
              <Image source={{ uri: chainImageUrl(selectedChain)! }} style={S.chainLogo} />
            ) : (
              <LinearGradient colors={getCoinColors(selectedChain.native_currency)} style={S.chainLogo}>
                <Text style={S.assetCircleText}>{selectedChain.native_currency[0]}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
              <Text style={[S.selectTitle, { color: colors.text }]}>{selectedChain.name}</Text>
              <Text style={[S.selectSub,   { color: colors.text2 }]}>{selectedChain.native_currency}</Text>
            </View>
          </>
        ) : (
          <View style={S.placeholderRow}>
            <View style={[S.placeholderCircle, { backgroundColor: colors.surface }]}>
              {loadingChains
                ? <ActivityIndicator size="small" color={GREEN} />
                : <Ionicons name="layers-outline" size={IconSize.sm} color={colors.text3} />}
            </View>
            <Text style={[S.placeholderText, { color: colors.text3 }]}>
              {loadingChains ? 'Loading networks...' : 'Select Network'}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
      </View>
    </TouchableOpacity>
  </View>
));

// ─── AssetSelector ────────────────────────────────────────────────────────────
interface AssetSelectorProps {
  colors: any;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  loadingAssets: boolean;
  onPress: () => void;
}

const AssetSelector = React.memo(({
  colors, selectedChain, selectedAsset, loadingAssets, onPress,
}: AssetSelectorProps) => (
  <View style={S.fieldGroup}>
    <Text style={[S.fieldLabel, { color: colors.text2 }]}>From Asset</Text>
    <TouchableOpacity
      onPress={() => selectedChain && onPress()}
      activeOpacity={selectedChain ? 0.8 : 1}
    >
      <View style={[
        S.selectBox,
        { backgroundColor: colors.card, borderColor: colors.border },
        !selectedChain && { opacity: 0.45 },
      ]}>
        {selectedAsset ? (
          <>
            <AssetIcon asset={selectedAsset} size={40} />
            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
              <Text style={[S.selectTitle, { color: colors.text }]}>{selectedAsset.name}</Text>
              <Text style={[S.selectSub,   { color: colors.text2 }]}>
                {selectedAsset.symbol} · {selectedAsset.assetType}
              </Text>
            </View>
          </>
        ) : (
          <View style={S.placeholderRow}>
            <View style={[S.placeholderCircle, { backgroundColor: colors.surface }]}>
              {loadingAssets
                ? <ActivityIndicator size="small" color={GREEN} />
                : <Ionicons name="wallet-outline" size={IconSize.sm} color={colors.text3} />}
            </View>
            <Text style={[S.placeholderText, { color: colors.text3 }]}>
              {!selectedChain ? 'Select network first' : loadingAssets ? 'Loading assets...' : 'Select Asset'}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
      </View>
    </TouchableOpacity>
  </View>
));

// ─── TabToggle ────────────────────────────────────────────────────────────────
interface TabToggleProps {
  colors: any;
  tab: 'crypto' | 'fiat';
  onChange: (t: 'crypto' | 'fiat') => void;
}

const TabToggle = React.memo(({ colors, tab, onChange }: TabToggleProps) => (
  <View style={[S.tabWrap, { backgroundColor: colors.surface }]}>
    {(['crypto', 'fiat'] as const).map(t => (
      <TouchableOpacity
        key={t}
        onPress={() => onChange(t)}
        activeOpacity={0.8}
        style={[
          S.tabBtn,
          tab === t && {
            backgroundColor: colors.primaryDim,   // ✅ navy dim
            borderColor:     colors.primary,       // ✅ navy
            borderWidth:     1,
          },
        ]}
      >
        <Ionicons
          name={t === 'crypto' ? 'wallet-outline' : 'globe-outline'}
          size={IconSize.sm}
          color={tab === t ? colors.primary : colors.text2}
        />
        <Text style={[
          S.tabText,
          { color: tab === t ? colors.primary : colors.text2 },
          tab === t && { fontWeight: Typography.bold },
        ]}>
          {t === 'crypto' ? 'Crypto' : 'Fiat Payout'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

// ─── SummaryBox ───────────────────────────────────────────────────────────────
interface SummaryBoxProps {
  colors: any;
  selectedAsset: WalletAsset | null;
  amount: string;
  hasInsufficient: boolean;
  networkFee: number;
  recipientGets: number;
}

const SummaryBox = React.memo(({
  colors, selectedAsset, amount, hasInsufficient, networkFee, recipientGets,
}: SummaryBoxProps) => {
  if (!selectedAsset || !amount || hasInsufficient) return null;
const rows = [
  { label: 'You Send',       val: `${amount} ${selectedAsset.symbol}`,                   color: colors.text },
  { label: 'Network Fee',    val: `${networkFee} ${selectedAsset.symbol}`,                color: colors.text },
  { label: 'Recipient Gets', val: `${recipientGets.toFixed(6)} ${selectedAsset.symbol}`, color: colors.accent }, // ✅ electric blue
];
  return (
    <View style={[S.summaryBox, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing[2] }]}>
      {rows.map(({ label, val, color }, i) => (
        <View
          key={label}
          style={[
            S.summaryRow,
            i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
          ]}
        >
          <Text style={[S.summaryLabel, { color: colors.text2 }]}>{label}</Text>
          <Text style={[S.summaryVal, { color }]}>{val}</Text>
        </View>
      ))}
    </View>
  );
});

// ─── CtaButton ────────────────────────────────────────────────────────────────
interface CtaButtonProps {
  colors: any;
  tab: 'crypto' | 'fiat';
  canSubmit: boolean;
  isSending: boolean;
  onPress: () => void;
  extraStyle?: any;
}

const CtaButton = React.memo(({
  colors, tab, canSubmit, isSending, onPress, extraStyle,
}: CtaButtonProps) => (
  <TouchableOpacity
    onPress={tab === 'fiat' ? () => {} : onPress}
    disabled={tab === 'crypto' && !canSubmit}
    activeOpacity={0.85}
    style={[{ width: '100%' }, extraStyle]}
  >
    <LinearGradient
      colors={[colors.primary, colors.primaryBright]}  // ✅ navy gradient
      style={[S.continueBtn, tab === 'crypto' && !canSubmit && { opacity: 0.5 }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      {isSending
        ? <ActivityIndicator color="#FFFFFF" />
        : <Text style={[S.continueBtnText, { color: '#FFFFFF' }]}>
            Continue
          </Text>}
    </LinearGradient>
  </TouchableOpacity>
));

// ─── CryptoForm ───────────────────────────────────────────────────────────────
interface CryptoFormProps {
  colors: any;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  loadingChains: boolean;
  loadingAssets: boolean;
  onOpenChainPicker: () => void;
  onOpenAssetPicker: () => void;
  chainImageUrl: (c: Blockchain) => string | null;
  amount: string;
  onAmountChange: (v: string) => void;
  amountFocused: boolean;
  setAmountFocused: (v: boolean) => void;
  hasInsufficient: boolean;
  amountError: string;
  availableBalance: number;
  loadingBalance: boolean;
  networkFee: number;
  onMax: () => void;
  recipient: string;
  setRecipient: (v: string) => void;
  recipientError: string;
  recipientFocused: boolean;
  setRecipientFocused: (v: boolean) => void;
  onScanPress: () => void;
}

const CryptoForm = React.memo((props: CryptoFormProps) => {
  const {
    colors, selectedChain, selectedAsset, loadingChains, loadingAssets,
    onOpenChainPicker, onOpenAssetPicker, chainImageUrl,
    amount, onAmountChange, amountFocused, setAmountFocused,
    hasInsufficient, amountError, availableBalance, loadingBalance, networkFee, onMax,
    recipient, setRecipient, recipientError, recipientFocused, setRecipientFocused, onScanPress,
  } = props;

  const placeholder = !selectedChain ? 'Select network first'
    : selectedChain.id === 'ethereum' || selectedChain.id === 'binance-smart-chain' ? '0x...'
      : selectedChain.id === 'tron' ? 'T...'
        : 'Enter address';

  return (
    <View style={S.formWrap}>
      <NetworkSelector
        colors={colors}
        selectedChain={selectedChain}
        loadingChains={loadingChains}
        onPress={onOpenChainPicker}
        chainImageUrl={chainImageUrl}
      />
      <AssetSelector
        colors={colors}
        selectedChain={selectedChain}
        selectedAsset={selectedAsset}
        loadingAssets={loadingAssets}
        onPress={onOpenAssetPicker}
      />
      <AmountField
        colors={colors} amount={amount} onAmountChange={onAmountChange}
        amountFocused={amountFocused} setAmountFocused={setAmountFocused}
        hasInsufficient={hasInsufficient} amountError={amountError}
        availableBalance={availableBalance} loadingBalance={loadingBalance}
        selectedAsset={selectedAsset} selectedChain={selectedChain}
        networkFee={networkFee} onMax={onMax}
        onOpenAssetPicker={onOpenAssetPicker}
      />
      <RecipientField
        colors={colors} recipient={recipient} setRecipient={setRecipient}
        recipientError={recipientError} focused={recipientFocused}
        setFocused={setRecipientFocused} editable={!!selectedAsset}
        placeholder={placeholder}
        onScanPress={onScanPress}
      />
    </View>
  );
});

// ─── FiatForm ─────────────────────────────────────────────────────────────────
interface FiatFormProps {
  colors: any;
  fiatAmount: string;
  onFiatAmountChange: (v: string) => void;
  fiatAmountFocused: boolean;
  setFiatAmountFocused: (v: boolean) => void;
  payoutCurrency: string;
  selectedCurrency: { value: string; label: string; flag: string };
  onOpenCurrencyPicker: () => void;
}

const FiatForm = React.memo((props: FiatFormProps) => {
  const {
    colors, fiatAmount, onFiatAmountChange, fiatAmountFocused, setFiatAmountFocused,
    selectedCurrency, onOpenCurrencyPicker,
  } = props;

  return (
    <View style={S.formWrap}>
      <View style={S.fieldGroup}>
        <Text style={[S.fieldLabel, { color: colors.text2 }]}>From</Text>
        <View style={[S.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={getCoinColors('USDT')} style={S.assetCircle}>
            <Text style={S.assetCircleText}>U</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: Spacing[3] }}>
            <Text style={[S.selectTitle, { color: colors.text }]}>USDT</Text>
            <Text style={[S.selectSub,   { color: colors.text2 }]}>Tether USD</Text>
          </View>
          <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
        </View>
      </View>
      <FiatAmountField
        colors={colors} fiatAmount={fiatAmount} onFiatAmountChange={onFiatAmountChange}
        fiatAmountFocused={fiatAmountFocused} setFiatAmountFocused={setFiatAmountFocused}
      />
      <View style={S.fieldGroup}>
        <Text style={[S.fieldLabel, { color: colors.text2 }]}>Payout Currency</Text>
        <TouchableOpacity onPress={onOpenCurrencyPicker} activeOpacity={0.8}>
          <View style={[S.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 22, marginRight: Spacing[2] }}>{selectedCurrency.flag}</Text>
            <Text style={[S.selectTitle, { color: colors.text, flex: 1 }]}>{selectedCurrency.label}</Text>
            <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
          </View>
        </TouchableOpacity>
      </View>
      <ComingSoonField colors={colors} />
    </View>
  );
});

// ─── QrScannerModal ───────────────────────────────────────────────────────────
interface QrScannerModalProps {
  visible: boolean;
  colors: any;
  onClose: () => void;
  onScanned: (address: string) => void;
}

function QrScannerModal({ visible, colors, onClose, onScanned }: QrScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    const address = extractAddressFromQr(result.data);
    onScanned(address);
  }, [scanned, onScanned]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[qrStyles.container, { backgroundColor: '#000' }]}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={qrStyles.permissionWrap}>
            <Ionicons name="camera-outline" size={IconSize['2xl']} color="#fff" />
            <Text style={qrStyles.permissionText}>
              {permission?.canAskAgain === false
                ? 'Camera permission denied. Please enable it from Settings.'
                : 'Camera permission is required to scan QR codes.'}
            </Text>
            {permission?.canAskAgain !== false && (
              <TouchableOpacity onPress={requestPermission} style={qrStyles.permissionBtn}>
                <Text style={qrStyles.permissionBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {permission?.granted && (
          <View style={qrStyles.overlay}>
            <View style={[qrStyles.frame, { borderColor: GREEN }]} />
            <Text style={qrStyles.hint}>Align QR code within the frame</Text>
          </View>
        )}

        <TouchableOpacity onPress={onClose} style={qrStyles.closeBtn}>
          <Ionicons name="close" size={IconSize.lg} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const qrStyles = StyleSheet.create({
  container:       { flex: 1 },
  closeBtn:        {
    position:       'absolute',
    top:            50,
    right:          20,
    width:          IconBox.sm,
    height:         IconBox.sm,
    borderRadius:   IconBox.sm / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  overlay:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame:           { width: 250, height: 250, borderWidth: 2, borderRadius: Radius.xl, backgroundColor: 'transparent' },
  hint:            { color: '#fff', marginTop: Spacing[4], fontSize: Typography.sm },
  permissionWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing[8], gap: Spacing[3] },
  permissionText:  { color: '#fff', textAlign: 'center', fontSize: Typography.base, lineHeight: Typography.lineHeightBase },
  permissionBtn:   { backgroundColor: GREEN, paddingVertical: Spacing[3], paddingHorizontal: Spacing[6], borderRadius: Radius.md, marginTop: Spacing[2] },
  permissionBtnText: { color: '#000', fontWeight: Typography.bold, fontSize: Typography.base },
});

// ─── WebRightPanel ────────────────────────────────────────────────────────────
function WebRightPanel({
  colors, tab, selectedChain, selectedAsset, amount, recipient,
  walletBalance, loadingBalance, availableBalance, networkFee, recipientGets,
  hasInsufficient, canSubmit, isSending, onSubmit,
}: any) {
  const networkFeeDisplay = parseFloat(networkFee ?? '0.0002');
  return (
    <View style={[
      webPanel.container,
      { backgroundColor: colors.card, borderColor: colors.border },
      getShadow(false, 'sm'),
    ]}>
      <View style={[webPanel.titleRow, { borderBottomColor: colors.border }]}>
        <View style={[webPanel.titleIcon, { backgroundColor: colors.greenDim }]}>
          <Ionicons name="paper-plane" size={IconSize.sm} color={GREEN} />
        </View>
        <Text style={[webPanel.titleText, { color: colors.text }]}>Transaction Summary</Text>
      </View>

      {selectedAsset ? (
        <View style={[webPanel.assetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LinearGradient colors={getCoinColors(selectedAsset.symbol)} style={webPanel.assetIcon}>
            <Text style={webPanel.assetIconText}>{selectedAsset.symbol[0]}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: Spacing[3] }}>
            <Text style={[webPanel.assetName, { color: colors.text }]}>{selectedAsset.name}</Text>
            <Text style={[webPanel.assetChain, { color: colors.text2 }]}>
              {selectedChain?.name} · {selectedAsset.symbol}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[webPanel.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="wallet-outline" size={IconSize['2xl']} color={colors.text3} />
          <Text style={[webPanel.emptyText, { color: colors.text3 }]}>
            {tab === 'crypto' ? 'Select network & asset to begin' : 'Fill in the details to continue'}
          </Text>
        </View>
      )}

      {selectedAsset && (
        <View style={[webPanel.balCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={webPanel.balRow}>
            <Text style={[webPanel.balLabel, { color: colors.text2 }]}>Available Balance</Text>
            {loadingBalance
              ? <ActivityIndicator size="small" color={GREEN} />
              : <Text style={[webPanel.balValue, { color: GREEN }]}>
                  {formatBal(availableBalance.toString(), selectedAsset.decimals)} {selectedAsset.symbol}
                </Text>}
          </View>
          <View style={[webPanel.balDivider, { backgroundColor: colors.border }]} />
          <View style={webPanel.balRow}>
            <Text style={[webPanel.balLabel, { color: colors.text2 }]}>Locked Balance</Text>
            {loadingBalance
              ? <ActivityIndicator size="small" color={colors.text3} />
              : <Text style={[webPanel.balValue, { color: colors.text }]}>
                  {formatBal(walletBalance?.lockedBalance ?? '0', selectedAsset.decimals)} {selectedAsset.symbol}
                </Text>}
          </View>
        </View>
      )}

      {selectedAsset && amount && !hasInsufficient && (
        <View style={[webPanel.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[webPanel.breakdownTitle, { color: colors.text2 }]}>Breakdown</Text>
          {[
            { label: 'You Send',       value: `${amount} ${selectedAsset.symbol}`,                   color: colors.text },
            { label: 'Network Fee',    value: `${networkFeeDisplay} ${selectedAsset.symbol}`,         color: colors.text },
            { label: 'Recipient Gets', value: `${recipientGets.toFixed(6)} ${selectedAsset.symbol}`, color: GREEN },
          ].map(({ label, value, color }, i, arr) => (
            <View
              key={label}
              style={[
                webPanel.breakdownRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[webPanel.breakdownLabel, { color: colors.text2 }]}>{label}</Text>
              <Text style={[webPanel.breakdownValue, { color }]}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {recipient ? (
        <View style={[webPanel.recipientCard, { backgroundColor: colors.greenDim, borderColor: GREEN + '44' }]}>
          <Ionicons name="checkmark-circle" size={IconSize.sm} color={GREEN} />
          <Text style={[webPanel.recipientText, { color: GREEN }]} numberOfLines={1} ellipsizeMode="middle">
            {recipient}
          </Text>
        </View>
      ) : (
        <View style={[webPanel.recipientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={IconSize.sm} color={colors.text3} />
          <Text style={[webPanel.recipientText, { color: colors.text3 }]}>No recipient yet</Text>
        </View>
      )}

      {!selectedAsset && tab === 'crypto' && (
        <View style={webPanel.stepsWrap}>
          {[
            { step: '1', text: 'Select a blockchain network' },
            { step: '2', text: 'Choose the asset to send' },
            { step: '3', text: 'Enter amount & recipient' },
            { step: '4', text: 'Review transfer instructions' },
          ].map(({ step, text }) => (
            <View key={step} style={webPanel.stepRow}>
              <View style={[webPanel.stepBadge, { backgroundColor: colors.greenDim }]}>
                <Text style={[webPanel.stepNum, { color: GREEN }]}>{step}</Text>
              </View>
              <Text style={[webPanel.stepText, { color: colors.text2 }]}>{text}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />

      <TouchableOpacity onPress={onSubmit} disabled={!canSubmit} activeOpacity={0.85}>
        <LinearGradient
          colors={canSubmit ? [GREEN, GREEN_BRIGHT] : [colors.surface, colors.surface]}
          style={[webPanel.ctaBtn, !canSubmit && { borderWidth: 1, borderColor: colors.border }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isSending
            ? <ActivityIndicator color={canSubmit ? '#fff' : colors.text3} size="small" />
            : (
              <>
                <Ionicons name="paper-plane-outline" size={IconSize.sm} color={canSubmit ? '#fff' : colors.text3} />
                <Text style={[webPanel.ctaText, { color: canSubmit ? '#fff' : colors.text3 }]}>
                  {canSubmit ? 'Continue' : 'Fill in all fields'}
                </Text>
              </>
            )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const webPanel = StyleSheet.create({
  container:      { width: 320, borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing[5], gap: Spacing[4], alignSelf: 'flex-start' },
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingBottom: Spacing[4], borderBottomWidth: 1 },
  titleIcon:      { width: IconBox.xs, height: IconBox.xs, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  titleText:      { fontSize: Typography.base, fontWeight: Typography.bold },
  assetCard:      { flexDirection: 'row', alignItems: 'center', padding: Spacing[3], borderRadius: Radius.lg, borderWidth: 1 },
  assetIcon:      { width: IconBox.sm, height: IconBox.sm, borderRadius: IconBox.sm / 2, alignItems: 'center', justifyContent: 'center' },
  assetIconText:  { fontSize: Typography.md, fontWeight: Typography.bold, color: '#fff' },
  assetName:      { fontSize: Typography.base, fontWeight: Typography.bold },
  assetChain:     { fontSize: Typography.sm, marginTop: 2 },
  emptyCard:      { alignItems: 'center', justifyContent: 'center', padding: Spacing[6], borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed' as any, gap: Spacing[2] },
  emptyText:      { fontSize: Typography.sm, textAlign: 'center', lineHeight: Typography.lineHeightBase },
  balCard:        { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  balRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[3] },
  balDivider:     { height: 1 },
  balLabel:       { fontSize: Typography.sm },
  balValue:       { fontSize: Typography.sm, fontWeight: Typography.bold },
  breakdownCard:  { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  breakdownTitle: { fontSize: Typography.xs, fontWeight: Typography.semibold, padding: Spacing[3], paddingBottom: 0 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing[3] },
  breakdownLabel: { fontSize: Typography.sm },
  breakdownValue: { fontSize: Typography.sm, fontWeight: Typography.bold },
  recipientCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1 },
  recipientText:  { flex: 1, fontSize: Typography.sm, fontWeight: Typography.medium },
  stepsWrap:      { gap: Spacing[2] },
  stepRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  stepBadge:      { width: IconBox.xs, height: IconBox.xs, borderRadius: IconBox.xs / 2, alignItems: 'center', justifyContent: 'center' },
  stepNum:        { fontSize: Typography.sm, fontWeight: Typography.bold },
  stepText:       { fontSize: Typography.sm, flex: 1 },
  ctaBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[2], paddingVertical: Spacing[3], borderRadius: Radius.lg },
  ctaText:        { fontSize: Typography.base, fontWeight: Typography.bold },
});

// ─── PickersSheet ─────────────────────────────────────────────────────────────
interface PickersProps {
  colors: any;
  showChainPicker: boolean;
  showAssetPicker: boolean;
  showCurrencyPicker: boolean;
  onCloseChain: () => void;
  onCloseAsset: () => void;
  onCloseCurrency: () => void;
  blockchains: Blockchain[];
  assets: WalletAsset[];
  loadingChains: boolean;
  loadingAssets: boolean;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  payoutCurrency: string;
  onSelectChain: (c: Blockchain) => void;
  onSelectAsset: (a: WalletAsset) => void;
  onSelectCurrency: (v: string) => void;
  chainImageUrl: (c: Blockchain) => string | null;
}

function PickersSheet({
  colors, showChainPicker, showAssetPicker, showCurrencyPicker,
  onCloseChain, onCloseAsset, onCloseCurrency,
  blockchains, assets, loadingChains, loadingAssets,
  selectedChain, selectedAsset, payoutCurrency,
  onSelectChain, onSelectAsset, onSelectCurrency, chainImageUrl,
}: PickersProps) {
  return (
    <>
      <BottomSheet visible={showChainPicker} title="Select Network" onClose={onCloseChain} colors={colors}>
        {loadingChains
          ? <ActivityIndicator color={GREEN} style={{ marginTop: Spacing[6] }} />
          : blockchains.map((c: Blockchain) => (
            <TouchableOpacity
              key={c.id}
              style={[S.pickerRow, { borderBottomColor: colors.borderSoft }]}
              onPress={() => onSelectChain(c)}
              activeOpacity={0.7}
            >
              {chainImageUrl(c) ? (
                <Image source={{ uri: chainImageUrl(c)! }} style={S.pickerImg} />
              ) : (
                <LinearGradient colors={getCoinColors(c.native_currency)} style={S.pickerIconCircle}>
                  <Text style={S.pickerIconText}>{c.native_currency[0]}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                <Text style={[S.pickerLabel, { color: colors.text }]}>{c.name}</Text>
                <Text style={[S.pickerSub,   { color: colors.text2 }]}>{c.native_currency}</Text>
              </View>
              {selectedChain?.id === c.id && (
                <Ionicons name="checkmark-circle" size={IconSize.md} color={GREEN} />
              )}
            </TouchableOpacity>
          ))}
      </BottomSheet>

      <BottomSheet visible={showAssetPicker} title="Select Asset" onClose={onCloseAsset} colors={colors}>
        {loadingAssets
          ? <ActivityIndicator color={GREEN} style={{ marginTop: Spacing[6] }} />
          : assets.length === 0
            ? <Text style={[S.emptyText, { color: colors.text2 }]}>No assets available</Text>
            : assets.map((a: WalletAsset) => (
              <TouchableOpacity
                key={a._id}
                style={[
                  S.pickerRow,
                  { borderBottomColor: colors.borderSoft },
                  selectedAsset?._id === a._id && { backgroundColor: colors.greenDim },
                ]}
                onPress={() => onSelectAsset(a)}
                activeOpacity={0.7}
              >
                <LinearGradient colors={getCoinColors(a.symbol)} style={S.pickerIconCircle}>
                  <Text style={S.pickerIconText}>{a.symbol[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                  <Text style={[S.pickerLabel, { color: colors.text }]}>{a.symbol}</Text>
                  <Text style={[S.pickerSub,   { color: colors.text2 }]}>{a.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: Spacing[1] }}>
                  {a.balance && (
                    <Text style={[S.pickerBal, { color: GREEN }]}>
                      {formatBal(a.balance, a.decimals)}
                    </Text>
                  )}
                  {selectedAsset?._id === a._id && (
                    <Ionicons name="checkmark-circle" size={IconSize.md} color={GREEN} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
      </BottomSheet>

      <BottomSheet visible={showCurrencyPicker} title="Payout Currency" onClose={onCloseCurrency} colors={colors}>
        {CURRENCIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[
              S.pickerRow,
              { borderBottomColor: colors.borderSoft },
              payoutCurrency === c.value && { backgroundColor: colors.greenDim },
            ]}
            onPress={() => onSelectCurrency(c.value)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 28 }}>{c.flag}</Text>
            <Text style={[S.pickerLabel, { color: colors.text, flex: 1, marginLeft: Spacing[3] }]}>
              {c.label}
            </Text>
            {payoutCurrency === c.value && (
              <Ionicons name="checkmark-circle" size={IconSize.md} color={GREEN} />
            )}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </>
  );
}

// ─── ModalsSheet ──────────────────────────────────────────────────────────────
function ModalsSheet({
  colors, showConfirmModal, isSending,
  selectedChain, selectedAsset, recipient, amount,
  onCancelConfirm, onExecute,
}: {
  colors: any;
  showConfirmModal: boolean;
  isSending: boolean;
  selectedChain: Blockchain | null;
  selectedAsset: WalletAsset | null;
  recipient: string;
  amount: string;
  onCancelConfirm: () => void;
  onExecute: () => void;
}) {
  return (
    <Modal visible={showConfirmModal} transparent animationType="fade" statusBarTranslucent>
      <View style={[S.overlay, { backgroundColor: 'rgba(0,0,0,0.78)' }]}>
        <View style={[
          S.confirmCard,
          { backgroundColor: colors.card, maxWidth: IS_WEB ? 440 : undefined },
          getShadow(true, 'lg'),
        ]}>
          <Text style={[S.confirmTitle, { color: colors.text }]}>Confirm Transaction</Text>
          {[
            { label: 'Network', value: selectedChain?.name },
            { label: 'Asset',   value: `${selectedAsset?.name} (${selectedAsset?.symbol})` },
            { label: 'To',      value: recipient },
            { label: 'Amount',  value: `${amount} ${selectedAsset?.symbol}`, green: true },
          ].map(({ label, value, green }) => (
            <View key={label} style={[S.confirmRow, { borderBottomColor: colors.borderSoft }]}>
              <Text style={[S.confirmLabel, { color: colors.text2 }]}>{label}</Text>
              <Text
                style={[
                  S.confirmValue,
                  { color: green ? GREEN : colors.text },
                  green && { fontWeight: Typography.bold },
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {value}
              </Text>
            </View>
          ))}
          <View style={S.confirmActions}>
            <TouchableOpacity
              style={[S.cancelBtn, { backgroundColor: colors.surface }]}
              onPress={onCancelConfirm}
            >
              <Text style={[S.cancelText, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.sendBtn, isSending && { opacity: 0.6 }]}
              onPress={onExecute}
              disabled={isSending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[GREEN, GREEN_BRIGHT]}
                style={S.sendBtnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSending
                  ? <ActivityIndicator color={colors.bg} size="small" />
                  : <Text style={[S.sendBtnText, { color: colors.bg }]}>Confirm Send</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SendScreen() {
  const { colors }          = useTheme();
  const router              = useRouter();
  const insets              = useSafeAreaInsets();
  const { width: scrWidth } = useWindowDimensions();
  const showSidebar         = IS_WEB && scrWidth >= WEB_SIDEBAR_BP;

  const { data: blockchains = [], isLoading: loadingChains } = useSupportedBlockchains();

  const [tab,           setTab]           = useState<'crypto' | 'fiat'>('crypto');
  const [selectedChain, setSelectedChain] = useState<Blockchain | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<WalletAsset | null>(null);

  const { data: assets = [], isLoading: loadingAssets } = useAssetsByChain(
    selectedChain ? getApiChainId(selectedChain) : ''
  );

  const { data: rawBalance, isLoading: loadingBalance } = useAssetBalance(
    selectedChain ? getApiChainId(selectedChain) : undefined,
    selectedAsset?._id
  );

  const sendMutation = useSendCrypto();
  const isSending    = sendMutation.isPending;

  const [amount,             setAmount]             = useState('');
  const [fiatAmount,         setFiatAmount]         = useState('');
  const [amountError,        setAmountError]        = useState('');
  const [amountFocused,      setAmountFocused]      = useState(false);
  const [fiatAmountFocused,  setFiatAmountFocused]  = useState(false);
  const [recipient,          setRecipient]          = useState('');
  const [recipientError,     setRecipientError]     = useState('');
  const [recipientFocused,   setRecipientFocused]   = useState(false);
  const [payoutCurrency,     setPayoutCurrency]     = useState('USD');
  const [showChainPicker,    setShowChainPicker]    = useState(false);
  const [showAssetPicker,    setShowAssetPicker]    = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showInstruction,    setShowInstruction]    = useState(false);
  const [showConfirmModal,   setShowConfirmModal]   = useState(false);
  const [showQrScanner,      setShowQrScanner]      = useState(false);

  const prevChainRef = useRef<string | null>(null);

  const availableBalance = useMemo(() => {
    if (rawBalance) return parseFloat(rawBalance);
    return parseFloat(selectedAsset?.balance ?? '0');
  }, [rawBalance, selectedAsset]);

  const enteredAmount   = useMemo(() => parseFloat(amount) || 0, [amount]);
  const hasInsufficient = useMemo(() => enteredAmount > availableBalance, [enteredAmount, availableBalance]);
  const isValidAmount   = useMemo(() => enteredAmount > 0 && !hasInsufficient, [enteredAmount, hasInsufficient]);

  const isValidRecipient = useMemo(() => {
    if (!recipient) return false;
    if (tab === 'crypto' && selectedChain)
      return validateAddress(recipient, getApiChainId(selectedChain));
    return recipient.length > 5;
  }, [recipient, tab, selectedChain]);

  const canSubmit = useMemo(() =>
    !!(selectedChain && selectedAsset && isValidAmount && isValidRecipient && !isSending),
    [selectedChain, selectedAsset, isValidAmount, isValidRecipient, isSending],
  );

  const networkFee    = parseFloat(selectedAsset?.withdrawalFee ?? '0.0002');
  const recipientGets = Math.max(0, enteredAmount - networkFee);

  useEffect(() => {
    if (!selectedChain || selectedChain.id === prevChainRef.current) return;
    prevChainRef.current = selectedChain.id;
    setSelectedAsset(null);
    setAmount('');
    setRecipient('');
  }, [selectedChain]);

  useEffect(() => {
    if (!amount) { setAmountError(''); return; }
    if (isNaN(parseFloat(amount))) { setAmountError('Invalid amount'); return; }
    if (parseFloat(amount) <= 0)   { setAmountError('Amount must be > 0'); return; }
    if (hasInsufficient) {
      setAmountError(`Insufficient. Available: ${formatBal(availableBalance.toString(), 6)}`);
      return;
    }
    setAmountError('');
  }, [amount, hasInsufficient, availableBalance]);

  useEffect(() => {
    if (!recipient) { setRecipientError(''); return; }
    if (tab === 'crypto' && selectedChain) {
      if (!validateAddress(recipient, getApiChainId(selectedChain))) {
        setRecipientError(`Invalid ${selectedChain.name} address`);
        return;
      }
    }
    setRecipientError('');
  }, [recipient, tab, selectedChain]);

  const handleTabChange = useCallback((t: 'crypto' | 'fiat') => {
    setTab(t);
    setSelectedChain(null); setSelectedAsset(null);
    setAmount(''); setRecipient('');
    setAmountError(''); setRecipientError('');
    prevChainRef.current = null;
  }, []);

  const handleAmountChange = useCallback((v: string) => {
    let s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    if (s.length > 1 && s.startsWith('0') && !s.startsWith('0.'))
      s = s.replace(/^0+/, '') || '0';
    setAmount(s);
  }, []);

  const handleFiatAmountChange = useCallback((v: string) => {
    let s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    if (s.length > 1 && s.startsWith('0') && !s.startsWith('0.'))
      s = s.replace(/^0+/, '') || '0';
    setFiatAmount(s);
  }, []);

  const handleMaxAmount = useCallback(() => {
    if (availableBalance <= 0) return;
    const max = Math.max(0, availableBalance - networkFee);
    setAmount(max > 0 ? max.toString() : availableBalance.toString());
  }, [availableBalance, networkFee]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setShowInstruction(true);
  }, [canSubmit]);

  const handleInstructionConfirm = useCallback(() => {
    setShowInstruction(false);
    setShowConfirmModal(true);
  }, []);

  const handleOpenScanner  = useCallback(() => setShowQrScanner(true), []);
  const handleCloseScanner = useCallback(() => setShowQrScanner(false), []);
  const handleQrScanned = useCallback((address: string) => {
    setRecipient(address);
    setShowQrScanner(false);
    showAlert('Address Scanned', 'Recipient address filled from QR code.');
  }, []);

  const executeTransaction = useCallback(async () => {
    if (!selectedChain || !selectedAsset) return;
    setShowConfirmModal(false);
    try {
      await sendMutation.mutateAsync({
        to:      recipient,
        amount:  enteredAmount,
        assetId: selectedAsset._id,
        chainId: getApiChainId(selectedChain),
      });
      showAlert('Success 🎉', `Sent ${amount} ${selectedAsset.symbol}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setAmount(''); setRecipient('');
      setSelectedAsset(null); setSelectedChain(null);
      prevChainRef.current = null;
    } catch (e: any) {
      showAlert('Failed', e?.response?.data?.message || e?.message || 'Transaction failed');
    }
  }, [selectedChain, selectedAsset, recipient, enteredAmount, amount, sendMutation, router]);

  const handleOpenChainPicker    = useCallback(() => setShowChainPicker(true), []);
  const handleOpenAssetPicker    = useCallback(() => setShowAssetPicker(true), []);
  const handleOpenCurrencyPicker = useCallback(() => setShowCurrencyPicker(true), []);

  const selectedCurrency = CURRENCIES.find(c => c.value === payoutCurrency) ?? CURRENCIES[0];
  const chainImageUrl    = useCallback(
    (chain: Blockchain) => chain.image?.small ?? chain.image?.thumb ?? null,
    [],
  );

  const instructionCautions = [
    { id: '1', text: 'Input the exact amount which displayed in the following page.' },
    { id: '2', text: 'Do NOT save or reuse this wallet address.' },
    { id: '3', text: `Only accept ${selectedAsset?.symbol ?? 'crypto'}. Incorrect currency may result in loss of funds.` },
  ];

  const pickerProps = {
    colors, showChainPicker, showAssetPicker, showCurrencyPicker,
    onCloseChain:    () => setShowChainPicker(false),
    onCloseAsset:    () => setShowAssetPicker(false),
    onCloseCurrency: () => setShowCurrencyPicker(false),
    blockchains, assets, loadingChains, loadingAssets,
    selectedChain, selectedAsset, payoutCurrency,
    onSelectChain:    (c: Blockchain)  => { setSelectedChain(c); setShowChainPicker(false); },
    onSelectAsset:    (a: WalletAsset) => { setSelectedAsset(a); setShowAssetPicker(false); },
    onSelectCurrency: (v: string)      => { setPayoutCurrency(v); setShowCurrencyPicker(false); },
    chainImageUrl,
  };

  const modalsProps = {
    colors, showConfirmModal, isSending,
    selectedChain, selectedAsset, recipient, amount,
    onCancelConfirm: () => setShowConfirmModal(false),
    onExecute:       executeTransaction,
  };

  const cryptoFormProps: CryptoFormProps = {
    colors, selectedChain, selectedAsset, loadingChains, loadingAssets,
    onOpenChainPicker: handleOpenChainPicker,
    onOpenAssetPicker: handleOpenAssetPicker,
    chainImageUrl,
    amount, onAmountChange: handleAmountChange, amountFocused, setAmountFocused,
    hasInsufficient, amountError, availableBalance, loadingBalance, networkFee,
    onMax: handleMaxAmount,
    recipient, setRecipient, recipientError, recipientFocused, setRecipientFocused,
    onScanPress: handleOpenScanner,
  };

  const fiatFormProps: FiatFormProps = {
    colors, fiatAmount, onFiatAmountChange: handleFiatAmountChange,
    fiatAmountFocused, setFiatAmountFocused,
    payoutCurrency, selectedCurrency,
    onOpenCurrencyPicker: handleOpenCurrencyPicker,
  };

  // ── WEB LAYOUT ──────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={[S.root, { backgroundColor: colors.bg }]}>
        <View style={[webStyles.header, {
          borderBottomColor: colors.border,
          backgroundColor:   colors.bg,
        }]}>
          <View style={webStyles.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[webStyles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
            </TouchableOpacity>
            <View style={webStyles.headerTextWrap}>
              <Text style={[webStyles.headerTitle, { color: colors.text }]}>Send Crypto</Text>
              <Text style={[webStyles.headerSub,   { color: colors.text2 }]}>Transfer assets securely</Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            webStyles.bodyScroll,
            !showSidebar && { alignItems: 'stretch' },
          ]}
        >
          <View style={[
            webStyles.body,
            !showSidebar && { flexDirection: 'column', maxWidth: 600, alignSelf: 'center', width: '100%' },
          ]}>
            <View style={[webStyles.leftCol, !showSidebar && { maxWidth: '100%', minWidth: 0 }]}>
              <TabToggle colors={colors} tab={tab} onChange={handleTabChange} />
              {tab === 'crypto' ? <CryptoForm {...cryptoFormProps} /> : <FiatForm {...fiatFormProps} />}
              {!showSidebar && tab === 'crypto' && (
                <>
                  <SummaryBox
                    colors={colors} selectedAsset={selectedAsset} amount={amount}
                    hasInsufficient={hasInsufficient} networkFee={networkFee} recipientGets={recipientGets}
                  />
                  <CtaButton
                    colors={colors} tab={tab} canSubmit={canSubmit} isSending={isSending}
                    onPress={handleSubmit} extraStyle={{ marginTop: Spacing[4], marginBottom: Spacing[8] }}
                  />
                </>
              )}
              {!showSidebar && tab === 'fiat' && (
                <CtaButton
                  colors={colors} tab={tab} canSubmit={canSubmit} isSending={isSending}
                  onPress={handleSubmit} extraStyle={{ marginTop: Spacing[4], marginBottom: Spacing[8] }}
                />
              )}
            </View>
            {showSidebar && (
              <WebRightPanel
                colors={colors} tab={tab}
                selectedChain={selectedChain} selectedAsset={selectedAsset}
                amount={amount} recipient={recipient}
                walletBalance={{ availableBalance: rawBalance ?? '0', lockedBalance: '0', status: 'ACTIVE' }}
                loadingBalance={loadingBalance} availableBalance={availableBalance}
                networkFee={networkFee} recipientGets={recipientGets}
                hasInsufficient={hasInsufficient} isValidRecipient={isValidRecipient}
                canSubmit={canSubmit} isSending={isSending}
                onSubmit={handleSubmit}
              />
            )}
          </View>
        </ScrollView>

        <PickersSheet {...pickerProps} />
        <TransferInstructionModal
          visible={showInstruction}
          onClose={() => setShowInstruction(false)}
          onConfirm={handleInstructionConfirm}
          cautions={instructionCautions}
        />
        <ModalsSheet {...modalsProps} />
      </View>
    );
  }

  // ── MOBILE LAYOUT ────────────────────────────────────────────────────────────
  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[
        S.header,
        {
          paddingTop:       insets.top + Spacing[3],
          borderBottomColor: colors.border,
          backgroundColor:   colors.bg,
        },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[S.iconBtn, { backgroundColor: colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.text }]}>Send</Text>
        <TouchableOpacity
          style={[S.iconBtn, { backgroundColor: colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: colors.border }]}
          onPress={handleOpenScanner}
        >
          <Ionicons name="scan-outline" size={IconSize.md} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={S.scrollView}
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 120 }]}
      >
        <TabToggle colors={colors} tab={tab} onChange={handleTabChange} />
        {tab === 'crypto' ? (
          <>
            <CryptoForm {...cryptoFormProps} />
            <SummaryBox
              colors={colors} selectedAsset={selectedAsset} amount={amount}
              hasInsufficient={hasInsufficient} networkFee={networkFee} recipientGets={recipientGets}
            />
          </>
        ) : (
          <FiatForm {...fiatFormProps} />
        )}
      </ScrollView>

      {/* Fixed bottom CTA */}
      <View style={[S.bottomBar, { paddingBottom: insets.bottom + Spacing[3], backgroundColor: colors.bg }]}>
        <CtaButton colors={colors} tab={tab} canSubmit={canSubmit} isSending={isSending} onPress={handleSubmit} />
      </View>

      <PickersSheet {...pickerProps} />
      <TransferInstructionModal
        visible={showInstruction}
        onClose={() => setShowInstruction(false)}
        onConfirm={handleInstructionConfirm}
        cautions={instructionCautions}
      />
      <ModalsSheet {...modalsProps} />
      <QrScannerModal
        visible={showQrScanner}
        colors={colors}
        onClose={handleCloseScanner}
        onScanned={handleQrScanned}
      />
    </View>
  );
}

// ─── Web Styles ───────────────────────────────────────────────────────────────
const webStyles = StyleSheet.create({
  header:         { borderBottomWidth: 1, paddingVertical: Spacing[4], paddingHorizontal: Spacing[8] },
  headerInner:    { flexDirection: 'row', alignItems: 'center', maxWidth: 1100, width: '100%', alignSelf: 'center', gap: Spacing[4] },
  backBtn:        { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTextWrap: { flex: 1 },
  headerTitle:    { fontSize: Typography.lg, fontWeight: Typography.bold },
  headerSub:      { fontSize: Typography.sm, marginTop: 2 },
  bodyScroll:     { flexGrow: 1, paddingHorizontal: Spacing[6], paddingVertical: Spacing[6], alignItems: 'center' },
  body:           { flexDirection: 'row', gap: Spacing[6], width: '100%', maxWidth: 1100, alignItems: 'flex-start' },
  leftCol:        { flex: 1, minWidth: 320, maxWidth: 640 },
});

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:       { flex: 1, width: '100%' },
  scrollView: { flex: 1, width: '100%' },
  scroll:     { padding: Spacing[4], width: '100%', flexGrow: 1 },

  // Header
  header:      {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing[5],
    paddingBottom:     Spacing[4],
    borderBottomWidth: 1,
    width:             '100%',
  },
  iconBtn:     { width: IconBox.sm, height: IconBox.sm, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontWeight: Typography.bold },

  // Tab
  tabWrap: {
    flexDirection:  'row',
    borderRadius:   Radius.xl,
    padding:        Spacing[1],
    marginBottom:   Spacing[5],
    gap:            Spacing[1],
    width:          '100%',
  },
  tabBtn:  {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius:   Radius.lg,
  },
  tabText: { fontSize: Typography.sm, fontWeight: Typography.medium },

  // Form
  formWrap:   { gap: Spacing[4], width: '100%' },
  fieldGroup: { gap: Spacing[2] },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, marginLeft: 2 },

  // Select box
  selectBox: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing[4],
    paddingVertical:   Spacing[4],
    borderRadius:      Radius.xl,
    borderWidth:       1,
    minHeight:         68,
  },
  selectTitle:       { fontSize: Typography.base, fontWeight: Typography.semibold },
  selectSub:         { fontSize: Typography.xs, marginTop: 2 },
  assetCircle:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  assetCircleText:   { fontSize: Typography.md, fontWeight: Typography.bold, color: '#FFF' },
  chainLogo:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  placeholderRow:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  placeholderCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  placeholderText:   { fontSize: Typography.sm },

  // Input
  bareInput: {
    padding: 0,
    margin:  0,
    ...(Platform.OS === 'web' && { outlineWidth: 0, outlineStyle: 'none' } as any),
  },

  // Fiat input
  inputFieldBox: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing[3],
    paddingVertical:   Spacing[3],
    borderRadius:      Radius.xl,
    borderWidth:       1.5,
    minHeight:         68,
    gap:               Spacing[2],
  },
  currencyBadge:     { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], borderRadius: Radius.lg },
  currencyBadgeText: { fontSize: Typography.xs, fontWeight: Typography.semibold },

  // Amount box
  amountBox:       { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  amountTopRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  amountInputPill: { flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing[2], paddingHorizontal: Spacing[3] },
  symbolPill:      { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], borderRadius: Radius.lg, borderWidth: 1 },
  symbolText:      { fontSize: Typography.sm, fontWeight: Typography.bold },
  maxText:         { fontSize: Typography.sm, fontWeight: Typography.bold },
  amountBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  usdHint:         { fontSize: Typography.xs },
  quickRow:        { flexDirection: 'row', gap: Spacing[2] },
  quickPill:       { paddingVertical: Spacing[1], paddingHorizontal: Spacing[2], borderRadius: Radius.full, borderWidth: 1 },
  quickText:       { fontSize: Typography.xs },

  // Recipient
  recipientOuterBox: { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  recipientPill:     { borderRadius: Radius.lg, paddingVertical: Spacing[2], paddingHorizontal: Spacing[3], justifyContent: 'center' },
  recipientDivider:  { height: 1, marginHorizontal: -Spacing[4] },

  // Error
  errRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginTop: Spacing[1] },
  errText: { fontSize: Typography.xs },

  // Coming soon
  comingSoonBox: {
    borderRadius:   Radius.xl,
    borderWidth:    1.5,
    borderStyle:    'dashed' as any,
    padding:        Spacing[5],
    alignItems:     'center',
    gap:            Spacing[2],
    minHeight:      100,
    justifyContent: 'center',
  },
  comingSoonBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing[2],
    paddingVertical:   Spacing[2],
    paddingHorizontal: Spacing[4],
    borderRadius:      Radius.full,
    marginBottom:      Spacing[1],
  },
  comingSoonTitle: { fontSize: Typography.base, fontWeight: Typography.bold },
  comingSoonSub:   { fontSize: Typography.sm, textAlign: 'center', lineHeight: Typography.lineHeightBase },

  // Summary
  summaryBox:   { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing[3], paddingHorizontal: Spacing[4] },
  summaryLabel: { fontSize: Typography.sm },
  summaryVal:   { fontSize: Typography.sm, fontWeight: Typography.bold },

  // Bottom bar & button
  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', paddingHorizontal: Spacing[5], paddingTop: Spacing[3] },
  continueBtn:     { borderRadius: Radius['2xl'], paddingVertical: Spacing[4], alignItems: 'center' },
  continueBtnText: { fontSize: Typography.base, fontWeight: Typography.bold, letterSpacing: 0.5 },

  // Pickers
  pickerRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[4], paddingHorizontal: Spacing[5], borderBottomWidth: 1 },
  pickerImg:        { width: 40, height: 40, borderRadius: 20 },
  pickerIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerIconText:   { fontSize: Typography.sm, fontWeight: Typography.bold, color: '#FFF' },
  pickerLabel:      { fontSize: Typography.base, fontWeight: Typography.semibold },
  pickerSub:        { fontSize: Typography.xs, marginTop: 2 },
  pickerBal:        { fontSize: Typography.xs, fontWeight: Typography.semibold },
  emptyText:        { textAlign: 'center', padding: Spacing[6], fontSize: Typography.sm },

  // Confirm modal
  overlay:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[5] },
  confirmCard:    { width: '100%', borderRadius: Radius['2xl'], padding: Spacing[6] },
  confirmTitle:   { fontSize: Typography.lg, fontWeight: Typography.bold, textAlign: 'center', marginBottom: Spacing[5] },
  confirmRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[3], borderBottomWidth: 1 },
  confirmLabel:   { fontSize: Typography.sm },
  confirmValue:   { fontSize: Typography.sm, flex: 1, textAlign: 'right', marginLeft: Spacing[3] },
  confirmActions: { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[5] },
  cancelBtn:      { flex: 1, padding: Spacing[4], borderRadius: Radius.lg, alignItems: 'center' },
  cancelText:     { fontSize: Typography.sm, fontWeight: Typography.semibold },
  sendBtn:        { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  sendBtnGrad:    { padding: Spacing[4], alignItems: 'center', justifyContent: 'center' },
  sendBtnText:    { fontSize: Typography.sm, fontWeight: Typography.bold },
});