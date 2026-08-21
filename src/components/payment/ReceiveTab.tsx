/**
 * ReceiveTab.tsx
 * ✅ Extracted from your existing receive code
 * ✅ Removed header (handled by parent)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Modal, Platform, Image, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';
import QRCode from 'react-native-qrcode-svg';

import {
  type WalletAsset,
  useSupportedBlockchains,
  useAssetsByChain,
  useDepositAddress,
  useAssetBalance,
} from '@/hooks/queires';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Blockchain {
  id: string;
  name: string;
  native_currency: string;
  chainId: number | null;
  image?: { thumb?: string; small?: string; large?: string };
}

interface Asset extends WalletAsset {
  depositEnabled?: boolean;
  withdrawalEnabled?: boolean;
  coinGeckoId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_WEB = Platform.OS === 'web';

const COIN_COLORS: Record<string, [string, string]> = {
  BTC:  ['#F7931A', '#E8830A'],
  ETH:  ['#627EEA', '#4A6DD8'],
  TRX:  ['#FF5570', '#E83050'],
  BNB:  ['#FFB23F', '#E09510'],
  USDT: ['#26A17B', '#1A8A66'],
  USDC: ['#2775CA', '#1A60B5'],
};

const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#334155', '#1E293B'];

const getApiChainId = (chain: Blockchain): string => {
  const map: Record<string, string> = {
    'ethereum': 'ETH',
    'binance-smart-chain': 'BSC',
    'tron': 'TRX',
    'bitcoin': 'BTC',
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

const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}${message ? `\n\n${message}` : ''}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

// ─── BottomSheet ──────────────────────────────────────────────────────────────
function BottomSheet({
  visible, title, onClose, colors, children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  colors: any;
  children: React.ReactNode;
}) {
  if (IS_WEB) {
    if (!visible) return null;
    return (
      <View style={bsStyles.webBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[bsStyles.webPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[bsStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[bsStyles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[bsStyles.closeBtn, { backgroundColor: colors.surface }]}>
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
      <View style={bsStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[bsStyles.nativeSheet, { backgroundColor: colors.card }]}>
          <View style={[bsStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[bsStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[bsStyles.title, { color: colors.text }]}>{title}</Text>
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

const bsStyles = StyleSheet.create({
  webBackdrop: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webPanel: {
    width: '100%', maxWidth: 480,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  nativeSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '80%', paddingBottom: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── SelectorCard ─────────────────────────────────────────────────────────────
function SelectorCard({
  colors, label, onPress, disabled = false, loading = false,
  selected, placeholderIcon, placeholderText, renderSelected,
}: {
  colors: any;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  selected: boolean;
  placeholderIcon: string;
  placeholderText: string;
  renderSelected: () => React.ReactNode;
}) {
  return (
    <View style={scStyles.wrap}>
      <Text style={[scStyles.label, { color: colors.text2 }]}>{label}</Text>
      <TouchableOpacity onPress={onPress} activeOpacity={disabled ? 1 : 0.75} disabled={disabled}>
        <View style={[
          scStyles.card,
          {
            backgroundColor: colors.card,
            borderColor: selected ? colors.primaryBorder : colors.border,
          },
          disabled && { opacity: 0.45 },
        ]}>
          {selected && <View style={[scStyles.accentBar, { backgroundColor: colors.primary }]} />}
          <View style={scStyles.inner}>
            {selected
              ? renderSelected()
              : (
                <View style={scStyles.placeholder}>
                  <View style={[scStyles.placeholderIcon, { backgroundColor: colors.surface }]}>
                    {loading
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name={placeholderIcon as any} size={20} color={colors.text3} />
                    }
                  </View>
                  <Text style={[scStyles.placeholderText, { color: colors.text3 }]}>
                    {placeholderText}
                  </Text>
                </View>
              )
            }
          </View>
          <View style={[scStyles.chevronWrap, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-down" size={16} color={colors.text2} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const scStyles = StyleSheet.create({
  wrap: { gap: 10 },
  label: { fontSize: Typography.sm, fontWeight: '600', marginLeft: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1.5,
    minHeight: 72, overflow: 'hidden',
  },
  accentBar: { width: 3, alignSelf: 'stretch' },
  inner: { flex: 1, paddingHorizontal: 16, paddingVertical: 14 },
  placeholder: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  placeholderIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { fontSize: Typography.base },
  chevronWrap: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
});

// ─── ChainSelectedContent ─────────────────────────────────────────────────────
function ChainSelectedContent({
  chain, colors, chainImageUrl,
}: {
  chain: Blockchain; colors: any; chainImageUrl: string | null;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {chainImageUrl ? (
        <Image source={{ uri: chainImageUrl }} style={cscStyles.logo} />
      ) : (
        <LinearGradient colors={getCoinColors(chain.native_currency)} style={cscStyles.logo}>
          <Text style={cscStyles.logoText}>{chain.native_currency[0]}</Text>
        </LinearGradient>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[cscStyles.name, { color: colors.text }]}>{chain.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <View style={[cscStyles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[cscStyles.sub, { color: colors.text2 }]}>
            {chain.native_currency} · Active
          </Text>
        </View>
      </View>
    </View>
  );
}

const cscStyles = StyleSheet.create({
  logo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  name: { fontSize: Typography.base, fontWeight: '700' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  sub: { fontSize: Typography.xs },
});

// ─── AssetSelectedContent ─────────────────────────────────────────────────────
function AssetSelectedContent({
  asset, colors, balance, loadingBalance,
}: {
  asset: Asset; colors: any; balance?: string; loadingBalance: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <LinearGradient colors={getCoinColors(asset.symbol)} style={ascStyles.icon}>
        <Text style={ascStyles.iconText}>{asset.symbol[0]}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[ascStyles.name, { color: colors.text }]}>{asset.name}</Text>
        <Text style={[ascStyles.sub, { color: colors.text2 }]}>
          {asset.symbol} · {asset.assetType}
        </Text>
      </View>
      <View style={[ascStyles.balChip, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
        {loadingBalance
          ? <ActivityIndicator size="small" color={colors.primary} />
          : (
            <Text style={[ascStyles.balText, { color: colors.primary }]}>
              {formatBal(balance, asset.decimals)}
            </Text>
          )
        }
      </View>
    </View>
  );
}

const ascStyles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  name: { fontSize: Typography.base, fontWeight: '700' },
  sub: { fontSize: Typography.xs, marginTop: 3 },
  balChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1,
    minWidth: 60, alignItems: 'center',
  },
  balText: { fontSize: Typography.xs, fontWeight: '700' },
});

// ─── QR Section ───────────────────────────────────────────────────────────────
function QRSection({
  colors, address, asset, chain, memo, loadingAddress,
}: {
  colors: any;
  address: string;
  asset: Asset | null;
  chain: Blockchain | null;
  memo: string;
  loadingAddress: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [memoCopied, setMemoCopied] = useState(false);

  const handleCopy = async (text: string, isMemo = false) => {
    try {
      if (IS_WEB) {
        await navigator?.clipboard?.writeText(text);
      } else {
        await Clipboard.setStringAsync(text);
      }
    } catch {}
    if (isMemo) {
      setMemoCopied(true);
      setTimeout(() => setMemoCopied(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try { await Share.share({ message: address }); } catch {}
  };

  if (!asset || !chain) {
    return (
      <View style={[qrStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LinearGradient colors={[colors.surface, colors.card]} style={qrStyles.emptyIconGrad}>
          <Ionicons name="qr-code-outline" size={40} color={colors.text3} />
        </LinearGradient>
        <Text style={[qrStyles.emptyTitle, { color: colors.text }]}>No Address Yet</Text>
        <Text style={[qrStyles.emptySub, { color: colors.text2 }]}>
          Select a network and asset above to generate your deposit address
        </Text>
      </View>
    );
  }

  if (loadingAddress) {
    return (
      <View style={[qrStyles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[qrStyles.loadingSpinnerWrap, { backgroundColor: colors.primaryDim }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={[qrStyles.loadingTitle, { color: colors.text }]}>Generating Address</Text>
        <Text style={[qrStyles.loadingSub, { color: colors.text2 }]}>
          Creating your {asset.symbol} deposit address on {chain.name}...
        </Text>
      </View>
    );
  }

  if (!address) {
    return (
      <View style={[qrStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="warning-outline" size={36} color={colors.orange} />
        <Text style={[qrStyles.emptyTitle, { color: colors.text }]}>Unavailable</Text>
        <Text style={[qrStyles.emptySub, { color: colors.text2 }]}>
          Could not generate deposit address. Please try again.
        </Text>
      </View>
    );
  }

  const [c1, c2] = getCoinColors(asset.symbol);

  return (
    <View style={[qrStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={qrStyles.cardHeader}>
        <View>
          <Text style={[qrStyles.cardTitle, { color: colors.text }]}>Deposit Address</Text>
          <Text style={[qrStyles.cardSub, { color: colors.text2 }]}>
            {asset.symbol} on {chain.name}
          </Text>
        </View>
        <View style={[qrStyles.networkBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
          <View style={[qrStyles.networkDot, { backgroundColor: colors.primary }]} />
          <Text style={[qrStyles.networkBadgeText, { color: colors.primary }]}>
            {getApiChainId(chain)}
          </Text>
        </View>
      </View>

      <View style={[qrStyles.divider, { backgroundColor: colors.border }]} />

      <View style={qrStyles.qrCenter}>
        <View style={[qrStyles.qrOuter, { borderColor: colors.primaryBorder, backgroundColor: colors.surface }]}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View
              key={corner}
              style={[
                qrStyles.cornerAccent,
                { borderColor: colors.primary },
                corner === 'tl' && { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0 },
                corner === 'tr' && { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0 },
                corner === 'bl' && { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0 },
                corner === 'br' && { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0 },
              ]}
            />
          ))}
          <View style={[qrStyles.qrInner, { backgroundColor: '#fff' }]}>
            <QRCode value={address} size={168} color="#111" backgroundColor="#fff" />
          </View>
          <View style={[qrStyles.coinBadgeWrap, { backgroundColor: '#fff' }]}>
            <LinearGradient colors={[c1, c2]} style={qrStyles.coinBadge}>
              <Text style={qrStyles.coinBadgeText}>{asset.symbol[0]}</Text>
            </LinearGradient>
          </View>
        </View>
        <Text style={[qrStyles.scanHint, { color: colors.text3 }]}>
          Scan QR code with your wallet app
        </Text>
      </View>

      <View style={[qrStyles.divider, { backgroundColor: colors.border }]} />

      <View style={qrStyles.addrSection}>
        <View style={[qrStyles.addrBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={qrStyles.addrTextWrap}>
            <Text style={[qrStyles.addrLabel, { color: colors.text3 }]}>{asset.symbol} Address</Text>
            <Text style={[qrStyles.addrText, { color: colors.text }]} selectable numberOfLines={2}>
              {address}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleCopy(address)}
            style={[
              qrStyles.copyPill,
              {
                backgroundColor: copied ? colors.primaryDim : colors.card,
                borderColor: copied ? colors.primaryBorder : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={15}
              color={copied ? colors.primary : colors.text2}
            />
            <Text style={[qrStyles.copyPillText, { color: copied ? colors.primary : colors.text2 }]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!!memo && (
        <View style={[qrStyles.memoBox, { backgroundColor: colors.redDim, borderColor: colors.red + '44' }]}>
          <View style={qrStyles.memoHeader}>
            <Ionicons name="alert-circle" size={15} color={colors.red} />
            <Text style={[qrStyles.memoLabel, { color: colors.red }]}>Memo / Tag Required</Text>
          </View>
          <View style={qrStyles.memoRow}>
            <Text style={[qrStyles.memoText, { color: colors.text }]} selectable>{memo}</Text>
            <TouchableOpacity
              onPress={() => handleCopy(memo, true)}
              style={[
                qrStyles.copyPill,
                {
                  backgroundColor: memoCopied ? colors.primaryDim : colors.card,
                  borderColor: memoCopied ? colors.primaryBorder : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={memoCopied ? 'checkmark-circle' : 'copy-outline'}
                size={15}
                color={memoCopied ? colors.primary : colors.text2}
              />
              <Text style={[qrStyles.copyPillText, { color: memoCopied ? colors.primary : colors.text2 }]}>
                {memoCopied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[qrStyles.memoWarn, { color: colors.red }]}>
            You MUST include this memo or your funds will be lost forever.
          </Text>
        </View>
      )}

      <View style={qrStyles.actionRow}>
        <TouchableOpacity
          onPress={() => handleCopy(address)}
          style={[
            qrStyles.actionBtn,
            {
              backgroundColor: copied ? colors.primaryDim : colors.surface,
              borderColor: copied ? colors.primaryBorder : colors.border,
            },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons
            name={copied ? 'checkmark-circle-outline' : 'copy-outline'}
            size={17}
            color={copied ? colors.primary : colors.text}
          />
          <Text style={[qrStyles.actionBtnText, { color: copied ? colors.primary : colors.text }]}>
            {copied ? 'Copied!' : 'Copy Address'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShare}
          style={[qrStyles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.75}
        >
          <Ionicons name="share-social-outline" size={17} color={colors.text} />
          <Text style={[qrStyles.actionBtnText, { color: colors.text }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const qrStyles = StyleSheet.create({
  emptyCard: {
    borderRadius: Radius['2xl'], borderWidth: 1.5,
    borderStyle: 'dashed' as any, padding: 36, alignItems: 'center', gap: 14,
  },
  emptyIconGrad: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: Typography.md, fontWeight: '700' },
  emptySub: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  loadingCard: {
    borderRadius: Radius['2xl'], borderWidth: 1,
    padding: 48, alignItems: 'center', gap: 16,
  },
  loadingSpinnerWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingTitle: { fontSize: Typography.md, fontWeight: '700' },
  loadingSub: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: Radius['2xl'], borderWidth: 1, overflow: 'hidden', gap: 0 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 20,
  },
  cardTitle: { fontSize: Typography.md, fontWeight: '700' },
  cardSub: { fontSize: Typography.xs, marginTop: 3 },
  networkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
  },
  networkDot: { width: 6, height: 6, borderRadius: 3 },
  networkBadgeText: { fontSize: Typography.xs, fontWeight: '700' },
  divider: { height: 1 },
  qrCenter: { alignItems: 'center', paddingVertical: 28, gap: 16 },
  qrOuter: {
    padding: 12, borderRadius: 20, borderWidth: 1.5,
    position: 'relative', alignItems: 'center', justifyContent: 'center',
  },
  cornerAccent: {
    position: 'absolute', width: 20, height: 20,
    borderWidth: 2.5, borderRadius: 4,
  },
  qrInner: {
    borderRadius: 12, padding: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  coinBadgeWrap: {
    position: 'absolute', width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', padding: 3,
  },
  coinBadge: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  coinBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  scanHint: { fontSize: Typography.xs },
  addrSection: { padding: 16, paddingTop: 20 },
  addrBox: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 12,
  },
  addrTextWrap: { flex: 1 },
  addrLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  addrText: {
    fontSize: Typography.sm, fontWeight: '500', lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: Radius.md, borderWidth: 1,
  },
  copyPillText: { fontSize: 12, fontWeight: '600' },
  memoBox: {
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 8,
  },
  memoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memoLabel: { fontSize: Typography.sm, fontWeight: '700' },
  memoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memoText: {
    flex: 1, fontSize: Typography.base, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  memoWarn: { fontSize: Typography.xs, lineHeight: 17 },
  actionRow: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: Radius.lg, borderWidth: 1,
  },
  actionBtnText: { fontSize: Typography.sm, fontWeight: '600' },
});

// ─── PickersSheet ─────────────────────────────────────────────────────────────
interface PickersSheetProps {
  colors: any;
  showChainPicker: boolean;
  showAssetPicker: boolean;
  onCloseChain: () => void;
  onCloseAsset: () => void;
  blockchains: Blockchain[];
  assets: Asset[];
  loadingChains: boolean;
  loadingAssets: boolean;
  selectedChain: Blockchain | null;
  selectedAsset: Asset | null;
  onSelectChain: (c: Blockchain) => void;
  onSelectAsset: (a: Asset) => void;
  chainImageUrl: (c: Blockchain) => string | null;
}

function PickersSheet({
  colors, showChainPicker, showAssetPicker,
  onCloseChain, onCloseAsset,
  blockchains, assets, loadingChains, loadingAssets,
  selectedChain, selectedAsset,
  onSelectChain, onSelectAsset,
  chainImageUrl,
}: PickersSheetProps) {
  return (
    <>
      <BottomSheet
        visible={showChainPicker}
        title="Select Network"
        onClose={onCloseChain}
        colors={colors}
      >
        {loadingChains
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          : blockchains.map((c: Blockchain) => (
            <TouchableOpacity
              key={c.id}
              style={[
                pickerStyles.row,
                { borderBottomColor: colors.borderSoft },
                selectedChain?.id === c.id && { backgroundColor: colors.primaryDim },
              ]}
              onPress={() => onSelectChain(c)}
              activeOpacity={0.7}
            >
              {chainImageUrl(c)
                ? <Image source={{ uri: chainImageUrl(c)! }} style={pickerStyles.img} />
                : (
                  <LinearGradient colors={getCoinColors(c.native_currency)} style={pickerStyles.iconCircle}>
                    <Text style={pickerStyles.iconText}>{c.native_currency[0]}</Text>
                  </LinearGradient>
                )
              }
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[pickerStyles.label, { color: colors.text }]}>{c.name}</Text>
                <Text style={[pickerStyles.sub, { color: colors.text2 }]}>{c.native_currency}</Text>
              </View>
              {selectedChain?.id === c.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))
        }
      </BottomSheet>

      <BottomSheet
        visible={showAssetPicker}
        title="Select Asset"
        onClose={onCloseAsset}
        colors={colors}
      >
        {loadingAssets
          ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          : assets.length === 0
            ? <Text style={[pickerStyles.empty, { color: colors.text2 }]}>No assets available</Text>
            : assets.map((a) => (
              <TouchableOpacity
                key={a._id}
                style={[
                  pickerStyles.row,
                  { borderBottomColor: colors.borderSoft },
                  selectedAsset?._id === a._id && { backgroundColor: colors.primaryDim },
                ]}
                onPress={() => onSelectAsset(a)}
                activeOpacity={0.7}
              >
                <LinearGradient colors={getCoinColors(a.symbol)} style={pickerStyles.iconCircle}>
                  <Text style={pickerStyles.iconText}>{a.symbol[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[pickerStyles.label, { color: colors.text }]}>{a.symbol}</Text>
                  <Text style={[pickerStyles.sub, { color: colors.text2 }]}>{a.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {a.balance && (
                    <Text style={[pickerStyles.bal, { color: colors.primary }]}>
                      {formatBal(a.balance, a.decimals)}
                    </Text>
                  )}
                  {selectedAsset?._id === a._id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))
        }
      </BottomSheet>
    </>
  );
}

// ─── Main ReceiveTab ──────────────────────────────────────────────────────────
export default function ReceiveTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: blockchains = [], isLoading: loadingChains } = useSupportedBlockchains();

  const [selectedChain, setSelectedChain] = useState<Blockchain | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const prevChainRef = useRef<string | null>(null);

  const chainId = selectedChain ? getApiChainId(selectedChain) : '';
  const { data: allAssets = [], isLoading: loadingAssets } = useAssetsByChain(chainId);
  const assets: Asset[] = (allAssets as Asset[]).filter((a) => a.depositEnabled !== false);

  const { data: depositData, isLoading: loadingAddress } = useDepositAddress(
    selectedAsset?._id ?? '',
    chainId
  );

  const address = (depositData as any)?.address ?? (depositData as any)?.depositAddress ?? '';
  const memo    = (depositData as any)?.memo    ?? (depositData as any)?.tag            ?? '';

  const { data: balance, isLoading: loadingBalance } = useAssetBalance(
    chainId,
    selectedAsset?._id
  );

  const chainImageUrl = (c: Blockchain) => c.image?.small ?? c.image?.thumb ?? null;

  useEffect(() => {
    if (!selectedChain || selectedChain.id === prevChainRef.current) return;
    prevChainRef.current = selectedChain.id;
    setSelectedAsset(null);
  }, [selectedChain]);

  const handleSelectChain = (c: Blockchain) => {
    setSelectedChain(c);
    setShowChainPicker(false);
  };

  const handleSelectAsset = (a: Asset) => {
    setSelectedAsset(a);
    setShowAssetPicker(false);
  };

  return (
    <View style={[rootStyles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[rootStyles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={rootStyles.formWrap}>
          <SelectorCard
            colors={colors}
            label="Network"
            onPress={() => setShowChainPicker(true)}
            loading={loadingChains}
            selected={!!selectedChain}
            placeholderIcon="layers-outline"
            placeholderText={loadingChains ? 'Loading networks...' : 'Select Network'}
            renderSelected={() => (
              <ChainSelectedContent
                chain={selectedChain!}
                colors={colors}
                chainImageUrl={chainImageUrl(selectedChain!)}
              />
            )}
          />

          <SelectorCard
            colors={colors}
            label="Asset to Receive"
            onPress={() => selectedChain && setShowAssetPicker(true)}
            disabled={!selectedChain}
            loading={loadingAssets}
            selected={!!selectedAsset}
            placeholderIcon="wallet-outline"
            placeholderText={
              !selectedChain ? 'Select network first'
                : loadingAssets ? 'Loading assets...'
                  : 'Select Asset'
            }
            renderSelected={() => (
              <AssetSelectedContent
                asset={selectedAsset!}
                colors={colors}
                balance={balance ?? selectedAsset?.balance}
                loadingBalance={loadingBalance}
              />
            )}
          />

          <QRSection
            colors={colors}
            address={address}
            asset={selectedAsset}
            chain={selectedChain}
            memo={memo}
            loadingAddress={loadingAddress}
          />
        </View>
      </ScrollView>

      <PickersSheet
        colors={colors}
        showChainPicker={showChainPicker}
        showAssetPicker={showAssetPicker}
        onCloseChain={() => setShowChainPicker(false)}
        onCloseAsset={() => setShowAssetPicker(false)}
        blockchains={blockchains}
        assets={assets}
        loadingChains={loadingChains}
        loadingAssets={loadingAssets}
        selectedChain={selectedChain}
        selectedAsset={selectedAsset}
        onSelectChain={handleSelectChain}
        onSelectAsset={handleSelectAsset}
        chainImageUrl={chainImageUrl}
      />
    </View>
  );
}

const rootStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing[4] },
  formWrap: { gap: Spacing[4] },
});

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
  },
  img: { width: 44, height: 44, borderRadius: 22 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: Typography.sm, fontWeight: '700', color: '#fff' },
  label: { fontSize: Typography.base, fontWeight: '600' },
  sub: { fontSize: Typography.xs, marginTop: 3 },
  bal: { fontSize: Typography.xs, fontWeight: '700' },
  empty: { textAlign: 'center', padding: Spacing[6], fontSize: Typography.sm },
});