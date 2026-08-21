import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from '@/styles/theme';
import type { SupportedAsset, CollateralItem } from '@/types/credit';

// ✅ Hooks from queires
import {
  useAssetBalance,
  useAddCreditCollateral,
  useRemoveCreditCollateral,
} from '@/hooks/queires';

const COIN_COLORS: Record<string, [string, string]> = {
  USDT: ['#26A17B', '#1A8A66'],
  ETH:  ['#627EEA', '#4A6DD8'],
  BTC:  ['#F7931A', '#E8830A'],
  TRX:  ['#EF0027', '#CC0022'],
};

const getCoinColors = (s: string): [string, string] =>
  COIN_COLORS[s?.toUpperCase()] ?? ['#334155', '#1E293B'];

const fmt = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const webReset = Platform.OS === 'web'
  ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any)
  : {};

const showAlert = (
  title: string,
  msg?: string,
  btns?: { text?: string; onPress?: () => void; style?: string }[]
) => {
  if (Platform.OS === 'web') {
    if (btns && btns.length > 1) {
      const ok = window.confirm(`${title}${msg ? `\n\n${msg}` : ''}`);
      ok
        ? btns.find(b => b.style !== 'cancel')?.onPress?.()
        : btns.find(b => b.style === 'cancel')?.onPress?.();
    } else {
      window.alert(`${title}${msg ? `\n\n${msg}` : ''}`);
      btns?.[0]?.onPress?.();
    }
  } else {
    require('react-native').Alert.alert(title, msg, btns);
  }
};

// ── Asset Selector Modal ───────────────────────────────────────────────────────

function AssetSelector({
  visible, assets, selected, onSelect, onClose, colors,
}: {
  visible:  boolean;
  assets:   SupportedAsset[];
  selected: SupportedAsset | null;
  onSelect: (a: SupportedAsset) => void;
  onClose:  () => void;
  colors:   ColorScheme;
}) {
  if (!visible) return null;

  const Inner = (
    <View style={[sel.sheet, { backgroundColor: colors.card }]}>
      <View style={[sel.handle, { backgroundColor: colors.border }]} />
      <Text style={[sel.title, { color: colors.text }]}>Select Asset</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {assets.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[
              sel.row,
              { borderBottomColor: colors.borderSoft },
              selected?.id === a.id && { backgroundColor: colors.primaryDim },
            ]}
            onPress={() => { onSelect(a); onClose(); }}
            activeOpacity={0.7}
          >
            <LinearGradient colors={getCoinColors(a.symbol)} style={sel.icon}>
              <Text style={sel.iconTxt}>{a.symbol.slice(0, 2)}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: Spacing[3] }}>
              <Text style={[sel.sym, { color: colors.text }]}>{a.symbol}</Text>
              <Text style={[sel.meta, { color: colors.text2 }]}>
                LTV {a.ltv}% · APR {a.apr.toFixed(2)}%
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[sel.bal, { color: colors.primary }]}>
                {fmt(a.balance, 4)} {a.symbol}
              </Text>
              <Text style={[sel.usd, { color: colors.text3 }]}>
                ${fmt(a.balanceUsd)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={sel.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[sel.webPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {Inner}
        </View>
      </View>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        {Inner}
      </View>
    </Modal>
  );
}

const sel = StyleSheet.create({
  sheet:    {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 24, maxHeight: '80%',
  },
  handle:   {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  title:    {
    fontSize: Typography.base, fontWeight: Typography.bold,
    paddingHorizontal: 20, marginBottom: 12,
  },
  row:      {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  icon:     {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTxt:  { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },
  sym:      { fontSize: Typography.sm, fontWeight: Typography.bold },
  meta:     { fontSize: Typography.xs, marginTop: 2 },
  bal:      { fontSize: Typography.sm, fontWeight: '600' },
  usd:      { fontSize: Typography.xs },
  backdrop: {
    position: 'absolute' as any, inset: 0, zIndex: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  webPanel: {
    width: '100%', maxWidth: 480,
    borderRadius: 24, borderWidth: 1, overflow: 'hidden',
  },
});

// ── Collateral Item Row ────────────────────────────────────────────────────────

const CollateralRow = React.memo(function CollateralRow({
  item, onRemove, removing, colors,
}: {
  item:     CollateralItem;
  onRemove: (id: string) => void;
  removing: boolean;
  colors:   ColorScheme;
}) {
  return (
    <View style={[cr.row, { borderBottomColor: colors.borderSoft }]}>
      <LinearGradient colors={getCoinColors(item.symbol)} style={cr.icon}>
        <Text style={cr.iconTxt}>{item.symbol.slice(0, 3)}</Text>
      </LinearGradient>

      <View style={{ flex: 1, marginLeft: Spacing[3] }}>
        <Text style={[cr.sym, { color: colors.text }]}>{item.symbol}</Text>
        <Text style={[cr.meta, { color: colors.text2 }]}>
          {fmt(item.amount, 4)} · ${fmt(item.valueUsd)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', marginRight: Spacing[3], gap: 3 }}>
        <Text style={[cr.val, { color: colors.text }]}>${fmt(item.valueUsd)}</Text>
        <Text style={[cr.ltv, { color: colors.text2 }]}>{item.ltv}% LTV</Text>
      </View>

      <TouchableOpacity
        style={[cr.delBtn, { backgroundColor: colors.redDim }]}
        onPress={() => onRemove(item.id)}
        disabled={removing}
        activeOpacity={0.7}
      >
        {removing
          ? <ActivityIndicator size="small" color={colors.red} />
          : <Ionicons name="trash-outline" size={IconSize.sm} color={colors.red} />
        }
      </TouchableOpacity>
    </View>
  );
});

const cr = StyleSheet.create({
  row:     {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing[3], borderBottomWidth: 1,
  },
  icon:    {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTxt: { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },
  sym:     { fontSize: Typography.sm, fontWeight: Typography.bold },
  meta:    { fontSize: Typography.xs, marginTop: 2 },
  val:     { fontSize: Typography.sm, fontWeight: '600' },
  ltv:     { fontSize: Typography.xs },
  delBtn:  {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── AddCollateralTab ───────────────────────────────────────────────────────────

interface Props {
  assets:      SupportedAsset[];
  collaterals: CollateralItem[];
  onSuccess:   () => void;
  bottomPad:   number;
}

export default function AddCollateralTab({
  assets, collaterals, onSuccess, bottomPad,
}: Props) {
  const { colors } = useTheme();

  const [selected,   setSelected]   = useState<SupportedAsset | null>(assets[0] ?? null);
  const [amount,     setAmount]     = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // ✅ Live balance from API
  const {
    data:      liveBalanceRaw,
    isLoading: balanceLoading,
  } = useAssetBalance(selected?.chainId, selected?.assetId);

  // ✅ Mutation hooks
  const {
    mutateAsync: addCollateral,
    isPending:   adding,
  } = useAddCreditCollateral();

  const {
    mutateAsync: removeCollateral,
  } = useRemoveCreditCollateral();

  // ✅ Parse live balance
  const availableBalance = liveBalanceRaw
    ? parseFloat(liveBalanceRaw)
    : (selected?.balance ?? 0);

  // ✅ Proportional USD
  const availableUsd = selected && selected.balance > 0
    ? (availableBalance / selected.balance) * selected.balanceUsd
    : 0;

  const handleAmountChange = (v: string) => {
    const s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    setAmount(s);
  };

  const handleMax = () => {
    if (!selected || balanceLoading) return;
    setAmount(availableBalance.toString());
  };

  // ✅ useAddCreditCollateral hook
  const handleAdd = useCallback(async () => {
    if (!selected || !amount || parseFloat(amount) <= 0) return;

    const numAmount = parseFloat(amount);

    if (numAmount > availableBalance) {
      showAlert('Insufficient Balance', 'Amount exceeds your available balance.');
      return;
    }

    if (!selected.ltv || selected.ltv <= 0) {
      showAlert('Error', 'Invalid LTV for selected asset.');
      return;
    }

    try {
      // ✅ ltv bhi bhejo
      await addCollateral({
        assetId: selected.assetId,
        chainId: selected.chainId,
        amount:  numAmount,
        ltv:     selected.ltv,
      });

      setAmount('');
      showAlert(
        'Success ✓',
        `${amount} ${selected.symbol} added as collateral.\nCredit limit updated.`
      );
      onSuccess();
    } catch (e: any) {
      showAlert('Failed', e?.message ?? 'Could not add collateral.');
    }
  }, [selected, amount, availableBalance, addCollateral, onSuccess]);

  // ✅ useRemoveCreditCollateral hook
  const handleRemove = useCallback(async (id: string) => {
    showAlert(
      'Remove Collateral',
      'Are you sure you want to remove this collateral?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(id);
            try {
              await removeCollateral(id);
              onSuccess();
            } catch (e: any) {
              showAlert('Error', e?.message ?? 'Failed to remove.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  }, [removeCollateral, onSuccess]);

  const amtNum      = parseFloat(amount) || 0;
  const isOverLimit = amtNum > availableBalance && !balanceLoading && amtNum > 0;

  // ✅ canAdd validation
  const canAdd = (
    !!selected      &&
    amtNum > 0      &&
    !isOverLimit    &&
    !adding         &&
    !balanceLoading &&
    !!selected.ltv  &&
    selected.ltv > 0
  );

  // ✅ Preview credit limit
  const previewCreditLimit = selected && amtNum > 0 && !isOverLimit
    ? ((amtNum / (selected.balance || 1)) * selected.balanceUsd) * (selected.ltv / 100)
    : 0;

  const activeCount = collaterals.filter(c => c.status === 'active').length;

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[ad.scroll, { paddingBottom: bottomPad }]}
      >

        {/* ── Add Collateral Card ── */}
        <View style={[ad.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          <View style={ad.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={IconSize.md} color={colors.primary} />
            <Text style={[ad.cardTitle, { color: colors.text }]}>Add Collateral</Text>
          </View>
          <Text style={[ad.cardSub, { color: colors.text2 }]}>
            Lock crypto from wallet to increase your credit limit
          </Text>

          {/* ── Asset Selector Pill ── */}
          <TouchableOpacity
            style={[ad.assetPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.75}
          >
            {selected ? (
              <>
                <LinearGradient colors={getCoinColors(selected.symbol)} style={ad.pillIcon}>
                  <Text style={ad.pillIconTxt}>{selected.symbol.slice(0, 2)}</Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <Text style={[ad.pillSym, { color: colors.text }]}>{selected.symbol}</Text>
                  <Text style={[ad.pillMeta, { color: colors.text2 }]}>
                    {selected.chainId} · {selected.ltv}% LTV · {selected.apr.toFixed(2)}% APR
                  </Text>

                  {/* ✅ Live balance */}
                  <View style={ad.pillBalRow}>
                    <Ionicons name="wallet-outline" size={IconSize.xs} color={colors.primary} />
                    {balanceLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: Spacing[1] }} />
                    ) : (
                      <Text style={[ad.pillBal, { color: colors.primary }]}>
                        {fmt(availableBalance, 4)} {selected.symbol} ≈ ${fmt(availableUsd)}
                      </Text>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
              </>
            ) : (
              <Text style={[ad.pillSym, { color: colors.text3 }]}>Select Asset</Text>
            )}
          </TouchableOpacity>

          {/* ── Amount Input ── */}
          <View style={ad.amtRow}>
            <Text style={[ad.amtLabel, { color: colors.text }]}>Collateral Amount</Text>
            <TouchableOpacity onPress={handleMax} disabled={balanceLoading}>
              <Text style={[ad.maxTxt, { color: balanceLoading ? colors.text3 : colors.primary }]}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[
            ad.inputBox,
            {
              backgroundColor: colors.surface,
              borderColor: isOverLimit ? colors.red : colors.border,
            },
          ]}>
            <TextInput
              style={[ad.input, { color: colors.text }, webReset]}
              placeholder="0.00"
              placeholderTextColor={colors.text3}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={handleAmountChange}
              underlineColorAndroid="transparent"
            />
            <Text style={[ad.inputSym, { color: colors.text2 }]}>
              {selected?.symbol ?? ''}
            </Text>
          </View>

          {/* ✅ Available balance - live */}
          {selected && (
            <View style={[
              ad.availRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Ionicons name="wallet-outline" size={IconSize.xs} color={colors.primary} />
                {balanceLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[ad.availTxt, { color: colors.primary }]}>
                    Available: {fmt(availableBalance, 4)} {selected.symbol}
                  </Text>
                )}
              </View>
              <Text style={[ad.availUsd, { color: colors.text2 }]}>
                ≈ ${fmt(availableUsd)}
              </Text>
            </View>
          )}

          {/* ✅ Over limit warning */}
          {isOverLimit && (
            <View style={[
              ad.warnRow,
              { backgroundColor: colors.redDim, borderColor: colors.redBorder },
            ]}>
              <Ionicons name="warning-outline" size={IconSize.xs} color={colors.red} />
              <Text style={[ad.warnTxt, { color: colors.red }]}>
                Amount exceeds available balance
              </Text>
            </View>
          )}

          {/* ✅ Credit limit preview */}
          {selected && amtNum > 0 && !isOverLimit && (
            <View style={[
              ad.previewRow,
              {
                backgroundColor: colors.primaryDim,
                borderColor: colors.primaryBorder,
              },
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Ionicons name="flash-outline" size={IconSize.xs} color={colors.primary} />
                <Text style={[ad.previewLabel, { color: colors.text2 }]}>
                  Credit Limit Increase
                </Text>
              </View>
              <Text style={[ad.previewVal, { color: colors.primary }]}>
                +${fmt(previewCreditLimit)}
              </Text>
            </View>
          )}

          {/* ✅ Asset Info row */}
          {selected && (
            <View style={[ad.infoRow, { backgroundColor: colors.surface }]}>
              <View style={ad.infoItem}>
                <Text style={[ad.infoLabel, { color: colors.text2 }]}>LTV Ratio</Text>
                <Text style={[ad.infoVal, { color: colors.text }]}>{selected.ltv}%</Text>
              </View>
              <View style={[ad.infoDivider, { backgroundColor: colors.border }]} />
              <View style={ad.infoItem}>
                <Text style={[ad.infoLabel, { color: colors.text2 }]}>APR</Text>
                <Text style={[ad.infoVal, { color: colors.text }]}>
                  {selected.apr.toFixed(2)}%
                </Text>
              </View>
              <View style={[ad.infoDivider, { backgroundColor: colors.border }]} />
              <View style={ad.infoItem}>
                <Text style={[ad.infoLabel, { color: colors.text2 }]}>Chain</Text>
                <Text style={[ad.infoVal, { color: colors.text }]}>{selected.chainId}</Text>
              </View>
            </View>
          )}

          {/* ── CTA ── */}
          <TouchableOpacity onPress={handleAdd} disabled={!canAdd} activeOpacity={0.85}>
            <LinearGradient
              colors={canAdd ? [colors.primary, colors.primaryBright] : [colors.surface, colors.surface]}
              style={[ad.cta, !canAdd && { borderWidth: 1, borderColor: colors.border }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {adding ? (
                <ActivityIndicator color={canAdd ? '#fff' : colors.text3} />
              ) : (
                <Text style={[ad.ctaTxt, { color: canAdd ? '#fff' : colors.text3 }]}>
                  Add Collateral
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </View>

        {/* ── Current Collateral Card ── */}
        {collaterals.length > 0 && (
          <View style={[ad.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={ad.colHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                <Ionicons name="shield-checkmark-outline" size={IconSize.md} color={colors.primary} />
                <Text style={[ad.cardTitle, { color: colors.text }]}>Current Collateral</Text>
              </View>
              <View style={[ad.activeBadge, { backgroundColor: colors.primaryDim }]}>
                <Text style={[ad.activeTxt, { color: colors.primary }]}>{activeCount} Active</Text>
              </View>
            </View>

            {collaterals.map((c) => (
              <CollateralRow
                key={c.id}
                item={c}
                onRemove={handleRemove}
                removing={removingId === c.id}
                colors={colors}
              />
            ))}
          </View>
        )}

      </ScrollView>

      {/* ── Asset Picker Modal ── */}
      <AssetSelector
        visible={showPicker}
        assets={assets}
        selected={selected}
        onSelect={setSelected}
        onClose={() => setShowPicker(false)}
        colors={colors}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ad = StyleSheet.create({
  scroll:       { padding: Spacing[4], gap: Spacing[3] },
  card:         { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  cardTitle:    { fontSize: Typography.base, fontWeight: Typography.bold },
  cardSub:      { fontSize: Typography.xs, marginTop: -Spacing[1] },

  assetPill:    {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1.5,
    padding: Spacing[3], gap: Spacing[3],
  },
  pillIcon:     {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  pillIconTxt:  { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },
  pillSym:      { fontSize: Typography.sm, fontWeight: Typography.bold },
  pillMeta:     { fontSize: Typography.xs, marginTop: 2 },
  pillBalRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginTop: 3 },
  pillBal:      { fontSize: Typography.xs },

  amtRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtLabel:     { fontSize: Typography.sm, fontWeight: Typography.semibold },
  maxTxt:       { fontSize: Typography.sm, fontWeight: Typography.bold },

  inputBox:     {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1.5,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
  },
  input:        {
    flex: 1, fontSize: Typography.lg, fontWeight: Typography.bold,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : {}),
  },
  inputSym:     { fontSize: Typography.sm, fontWeight: Typography.semibold },

  availRow:     {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[2],
  },
  availTxt:     { fontSize: Typography.xs },
  availUsd:     { fontSize: Typography.xs },

  warnRow:      {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[2],
    borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
  },
  warnTxt:      { fontSize: Typography.xs, fontWeight: '600' },

  previewRow:   {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
  },
  previewLabel: { fontSize: Typography.xs },
  previewVal:   { fontSize: Typography.xs, fontWeight: '700' },

  infoRow:      {
    flexDirection: 'row', borderRadius: Radius.lg,
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[2],
  },
  infoItem:     { flex: 1, alignItems: 'center', gap: Spacing[1] },
  infoLabel:    { fontSize: Typography.xs },
  infoVal:      { fontSize: Typography.xs, fontWeight: '700' },
  infoDivider:  { width: 1, marginVertical: Spacing[1] },

  cta:          {
    borderRadius: Radius['2xl'], paddingVertical: Spacing[4],
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTxt:       { fontSize: Typography.base, fontWeight: Typography.bold },

  colHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge:  { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  activeTxt:    { fontSize: Typography.xs, fontWeight: Typography.bold },
});