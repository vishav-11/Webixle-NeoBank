// src/components/p2p/CreateAdModal.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// ── internal imports ──────────────────────────────────────────────────────────
import p2pService from '../../../services/p2pService';
import { warmChain, getCachedAssets } from '@/cache/assetCache';
import { IS_WEB, webReset, showAlert, coinColors, CURRENCIES } from '../constants';
import type { CreateAdPayload, ResolvedAsset } from '@/types/p2pTypes';

// ✅ Theme imports
import {
  Typography, Spacing, Radius, IconSize,
  type ColorScheme,
  getAccentGradient,
} from '@/styles/theme';

// ✅ React Query hooks
import {
  usePaymentAccounts,
  useSupportedBlockchains,
  type UserPaymentAccount,
} from '@/hooks/queires';

interface CreateAdModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: ColorScheme;
  isDark: boolean;
}

interface Blockchain {
  id: string;
  chainId?: string;
  name: string;
  image?: { small?: string; thumb?: string };
}

const getApiChainId = (c: Blockchain) => c.chainId ?? c.id;
const chainImageUrl = (c: Blockchain) => c.image?.small ?? c.image?.thumb ?? null;

// ─── Payment method helpers ───────────────────────────────────────────────────
const METHOD_COLORS: Record<string, [string, string]> = {
  GOOGLEPAY: ['#4285f4', '#34a853'],
  GOOGLE_PAY: ['#4285f4', '#34a853'],
  BANK: ['#1e3a8a', '#3b82f6'],
  BANK_TRANSFER: ['#1e3a8a', '#3b82f6'],
  PAYPAL: ['#003087', '#009cde'],
  UPI: ['#6366f1', '#8b5cf6'],
};

const getPmColors = (code: string, colors: ColorScheme): [string, string] =>
  METHOD_COLORS[code?.toUpperCase()] ?? [colors.accent, colors.blue];

const getPmName = (a: UserPaymentAccount): string => {
  const pm = a.paymentMethodId;
  return typeof pm === 'object' && (pm as any)?.name ? (pm as any).name : 'Payment';
};
const getPmCode = (a: UserPaymentAccount): string => {
  const pm = a.paymentMethodId;
  return typeof pm === 'object' && (pm as any)?.code ? (pm as any).code : '';
};

export default function CreateAdModal({
  visible,
  onClose,
  onSuccess,
  colors,
  isDark
}: CreateAdModalProps) {
  const router = useRouter();

  const [selectedChain, setSelectedChain] = useState<Blockchain | null>(null);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [assets, setAssets] = useState<ResolvedAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [selAsset, setSelAsset] = useState<ResolvedAsset | null>(null);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [total, setTotal] = useState('');
  const [minLimit, setMinLimit] = useState('');
  const [maxLimit, setMaxLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAsset, setShowAsset] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  const {
    data: paymentAccounts = [],
    isLoading: loadingAccounts,
  } = usePaymentAccounts();

  const {
    data: blockchains = [],
    isLoading: loadingChains,
  } = useSupportedBlockchains();

  // ✅ Theme-aware gradients
  const accentGradient = getAccentGradient(isDark);
  const redGradient: [string, string] = [colors.red, colors.redBright];

  useEffect(() => {
    if (!selectedChain && (blockchains as Blockchain[]).length > 0) {
      setSelectedChain((blockchains as Blockchain[])[0]);
    }
  }, [blockchains, selectedChain]);

  useEffect(() => {
    if (!visible || !selectedChain) return;
    const chainId = getApiChainId(selectedChain);
    setAssetsLoading(true);
    setSelAsset(null);
    warmChain(chainId).then(() => {
      setAssets(getCachedAssets(chainId));
      setAssetsLoading(false);
    });
  }, [visible, selectedChain]);

  const reset = () => {
    setType('BUY');
    setSelAsset(null);
    setPrice('');
    setCurrency('USD');
    setTotal('');
    setMinLimit('');
    setMaxLimit('');
    setSelectedChain((blockchains as Blockchain[])[0] ?? null);
    setSelectedPaymentIds([]);
  };

  const togglePaymentAccount = (id: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!selAsset || !price || !total || !minLimit || !maxLimit) {
      showAlert('Required', 'Please fill all fields');
      return;
    }
    if (selectedPaymentIds.length === 0) {
      showAlert('Required', 'Please select at least one payment method');
      return;
    }
    setLoading(true);
    try {
      const payload: CreateAdPayload = {
        type,
        asset: selAsset._id,
        chainId: selAsset.chainId,
        currency,
        price,
        totalAmount: total,
        paymentMethods: selectedPaymentIds,
        minLimit,
        maxLimit,
      };
      await p2pService.createAd(payload);
      onSuccess();
      onClose();
      reset();
      showAlert('Ad Created!', 'Your P2P ad is now live.');
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Failed to create ad');
    } finally {
      setLoading(false);
    }
  };

  const goToAddPayment = () => {
    onClose();
    router.push('/add-payment-method');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!visible) return null;

  const Inner = (
    <View style={[s.inner, { backgroundColor: colors.card }, IS_WEB && s.innerWeb]}>
      {!IS_WEB && <View style={[s.handle, { backgroundColor: colors.border }]} />}
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 }}>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: colors.primary }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={IconSize.md} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.title, { color: colors.text }]}>Create P2P Ad</Text>
          </View>
          <TouchableOpacity
            style={[s.closeBtn, { backgroundColor: colors.surface }]}
            onPress={handleClose}
          >
            <Ionicons name="close" size={IconSize.sm} color={colors.text2} />
          </TouchableOpacity>
        </View>


        {/* ── BUY / SELL toggle ── */}
        <View style={[s.typeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['BUY', 'SELL'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                s.typeBtn,
                type === t && {
                  backgroundColor: t === 'BUY' ? colors.primary : colors.red
                }
              ]}
              onPress={() => setType(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.typeTxt, { color: type === t ? '#fff' : colors.text2 }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Chain selector ── */}
        <Text style={[s.label, { color: colors.text2 }]}>Blockchain</Text>
        <TouchableOpacity
          style={[s.select, {
            backgroundColor: colors.surface,
            borderColor: selectedChain ? colors.primaryBorder : colors.border
          }]}
          onPress={() => setShowChainPicker(true)}
          activeOpacity={0.8}
        >
          {selectedChain ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 }}>
              {chainImageUrl(selectedChain) ? (
                <Image source={{ uri: chainImageUrl(selectedChain)! }} style={s.chainImg} />
              ) : (
                <LinearGradient colors={coinColors(selectedChain.name)} style={s.assetDot}>
                  <Text style={s.assetDotTxt}>{selectedChain.name[0]}</Text>
                </LinearGradient>
              )}
              <View>
                <Text style={[s.selectVal, { color: colors.text }]}>{selectedChain.name}</Text>
                <Text style={{ fontSize: Typography.xs, color: colors.text3 }}>
                  {getApiChainId(selectedChain)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[s.selectPlaceholder, { color: colors.text3 }]}>
              {loadingChains ? 'Loading blockchains…' : 'Select Blockchain'}
            </Text>
          )}
          {loadingChains ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text3} />
          )}
        </TouchableOpacity>

        {/* ── Asset selector ── */}
        <Text style={[s.label, { color: colors.text2 }]}>Asset</Text>
        <TouchableOpacity
          style={[s.select, {
            backgroundColor: colors.surface,
            borderColor: selAsset ? colors.primaryBorder : colors.border
          }]}
          onPress={() => setShowAsset(true)}
          activeOpacity={0.8}
        >
          {selAsset ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 }}>
              <LinearGradient colors={coinColors(selAsset.symbol)} style={s.assetDot}>
                <Text style={s.assetDotTxt}>{(selAsset.symbol ?? '?')[0]}</Text>
              </LinearGradient>
              <View>
                <Text style={[s.selectVal, { color: colors.text }]}>{selAsset.name}</Text>
                <Text style={{ fontSize: Typography.xs, color: colors.text3 }}>
                  {selAsset.chainId}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[s.selectPlaceholder, { color: colors.text3 }]}>
              {assetsLoading ? 'Loading assets…' : 'Select Asset'}
            </Text>
          )}
          {assetsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text3} />
          )}
        </TouchableOpacity>

        {/* ── Currency ── */}
        <Text style={[s.label, { color: colors.text2 }]}>Currency</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: Spacing[4] }}
          contentContainerStyle={{ gap: Spacing[2] }}
        >
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                s.currencyBtn,
                { borderColor: currency === c ? colors.primaryBorder : colors.border },
                currency === c && { backgroundColor: colors.primaryDim }
              ]}
              onPress={() => setCurrency(c)}
              activeOpacity={0.8}
            >
              <Text style={[s.currencyTxt, {
                color: currency === c ? colors.primary : colors.text2
              }]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Price ── */}
        <Text style={[s.label, { color: colors.text2 }]}>Price per unit ({currency})</Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[s.input, { color: colors.text }, webReset]}
            placeholder="0.00"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={v => setPrice(v.replace(/[^0-9.]/g, ''))}
            underlineColorAndroid="transparent"
          />
          <Text style={[s.inputUnit, { color: colors.primary }]}>{currency}</Text>
        </View>

        {/* ── Total amount ── */}
        <Text style={[s.label, { color: colors.text2 }]}>
          Total Amount{selAsset ? ` (${selAsset.symbol})` : ''}
        </Text>
        <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[s.input, { color: colors.text }, webReset]}
            placeholder="0.00"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={total}
            onChangeText={v => setTotal(v.replace(/[^0-9.]/g, ''))}
            underlineColorAndroid="transparent"
          />
          {selAsset && (
            <Text style={[s.inputUnit, { color: colors.primary }]}>{selAsset.symbol}</Text>
          )}
        </View>

        {/* ── Min / Max limits ── */}
        <Text style={[s.label, { color: colors.text2 }]}>Order Limits ({currency})</Text>
        <View style={{ flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[5] }}>
          {[
            { placeholder: 'Min', value: minLimit, onChange: setMinLimit },
            { placeholder: 'Max', value: maxLimit, onChange: setMaxLimit },
          ].map(({ placeholder, value, onChange }, idx) => (
            <React.Fragment key={placeholder}>
              {idx === 1 && <Text style={{ color: colors.text3, alignSelf: 'center' }}>—</Text>}
              <View style={[s.inputRow, {
                flex: 1,
                backgroundColor: colors.surface,
                borderColor: colors.border
              }]}>
                <TextInput
                  style={[s.input, { color: colors.text, fontSize: Typography.base }, webReset]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={value}
                  onChangeText={v => onChange(v.replace(/[^0-9.]/g, ''))}
                  underlineColorAndroid="transparent"
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ══ PAYMENT METHODS ══ */}
        <View style={{ marginBottom: Spacing[5] }}>
          {/* header row */}
          <View style={pm.topRow}>
            <Text style={[s.label, { color: colors.text2, marginBottom: 0 }]}>
              Payment Methods{' '}
              {selectedPaymentIds.length > 0 && (
                <Text style={{ color: colors.primary, fontWeight: Typography.bold }}>
                  ({selectedPaymentIds.length})
                </Text>
              )}
            </Text>
            <TouchableOpacity
              style={[pm.addBtn, {
                backgroundColor: colors.primaryDim,
                borderColor: colors.primaryBorder
              }]}
              onPress={goToAddPayment}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={IconSize.xs} color={colors.primary} />
              <Text style={[pm.addBtnTxt, { color: colors.primary }]}>Add New</Text>
            </TouchableOpacity>
          </View>

          {loadingAccounts ? (
            <View style={[pm.loadBox, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[pm.loadTxt, { color: colors.text2 }]}>Loading accounts…</Text>
            </View>
          ) : paymentAccounts.length === 0 ? (
            <View style={[pm.emptyBox, {
              backgroundColor: colors.surface,
              borderColor: colors.border
            }]}>
              <View style={[pm.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="card-outline" size={IconSize.lg} color={colors.primary} />
              </View>
              <Text style={[pm.emptyTitle, { color: colors.text }]}>
                No payment accounts yet
              </Text>
              <Text style={[pm.emptySub, { color: colors.text2 }]}>
                Add a payment method to use in your P2P ads
              </Text>
              <TouchableOpacity style={{ width: '100%' }} onPress={goToAddPayment} activeOpacity={0.85}>
                <LinearGradient
                  colors={accentGradient}
                  style={pm.emptyBtnGrad}
                >
                  <Ionicons name="add" size={IconSize.sm} color="#fff" />
                  <Text style={pm.emptyBtnTxt}>Add Payment Method</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={pm.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {paymentAccounts.map((acc) => {
                const isSel = selectedPaymentIds.includes(acc._id);
                const code = getPmCode(acc);
                const name = getPmName(acc);
                const gradColors = getPmColors(code, colors);
                const firstVal = Object.values(acc.fieldValues || {})[0];

                return (
                  <TouchableOpacity
                    key={acc._id}
                    style={[
                      pm.chip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSel && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
                    ]}
                    onPress={() => togglePaymentAccount(acc._id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={gradColors} style={pm.chipIcon}>
                      <Text style={pm.chipIconTxt}>{name[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[pm.chipName, { color: isSel ? colors.primary : colors.text }]}
                        numberOfLines={1}
                      >
                        {acc.label || name}
                      </Text>
                      {firstVal ? (
                        <Text style={[pm.chipVal, { color: colors.text2 }]} numberOfLines={1}>
                          {firstVal}
                        </Text>
                      ) : null}
                    </View>
                    {isSel && (
                      <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.85}
        >
         <LinearGradient
  colors={[colors.primary, colors.primary]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={s.btnGrad}
>
  {loading ? (
    <ActivityIndicator color="#fff" size="small" />
  ) : (
    <Text style={s.btnTxt}>
      {type === 'BUY' ? 'Create Buy Ad' : 'Create Sell Ad'}
    </Text>
  )}
</LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Chain picker sub-modal ── */}
      <Modal visible={showChainPicker} transparent animationType={IS_WEB ? 'fade' : 'slide'}>
        <View style={IS_WEB ? s.webPickerOverlay : s.pickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowChainPicker(false)}
            activeOpacity={1}
          />
          <View style={[
            s.pickerSheet,
            { backgroundColor: colors.card },
            IS_WEB && {
              borderRadius: Radius.xl,
              maxWidth: 400,
              width: '100%',
              borderWidth: 1,
              borderColor: colors.border
            }
          ]}>
            {!IS_WEB && <View style={[s.pickerHandle, { backgroundColor: colors.border }]} />}

            {/* ✅ Picker Header with Back Button */}
            <View style={s.pickerHeader}>
              <TouchableOpacity
                style={[s.pickerBackBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowChainPicker(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={IconSize.md} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.pickerTitle, { color: colors.text, flex: 1, marginLeft: Spacing[3] }]}>
                Select Blockchain
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {loadingChains ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing[6] }} />
              ) : (blockchains as Blockchain[]).length === 0 ? (
                <Text style={{
                  color: colors.text3,
                  textAlign: 'center',
                  marginVertical: Spacing[6],
                  fontSize: Typography.sm
                }}>
                  No blockchains available
                </Text>
              ) : (
                (blockchains as Blockchain[]).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.pickerRow,
                      { borderBottomColor: colors.borderSoft },
                      selectedChain?.id === c.id && { backgroundColor: colors.primaryDim }
                    ]}
                    onPress={() => { setSelectedChain(c); setShowChainPicker(false); }}
                    activeOpacity={0.8}
                  >
                    {chainImageUrl(c) ? (
                      <Image source={{ uri: chainImageUrl(c)! }} style={s.pickerDot} />
                    ) : (
                      <LinearGradient colors={coinColors(c.name)} style={s.pickerDot}>
                        <Text style={s.pickerDotTxt}>{c.name[0]}</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                      <Text style={{
                        fontSize: Typography.sm,
                        fontWeight: Typography.bold,
                        color: colors.text
                      }}>
                        {c.name}
                      </Text>
                      <Text style={{
                        fontSize: Typography.xs,
                        color: colors.text2,
                        marginTop: 2
                      }}>
                        {getApiChainId(c)}
                      </Text>
                    </View>
                    {selectedChain?.id === c.id && (
                      <Ionicons name="checkmark-circle" size={IconSize.md} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Asset picker sub-modal ── */}
      <Modal visible={showAsset} transparent animationType={IS_WEB ? 'fade' : 'slide'}>
        <View style={IS_WEB ? s.webPickerOverlay : s.pickerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowAsset(false)}
            activeOpacity={1}
          />
          <View style={[
            s.pickerSheet,
            { backgroundColor: colors.card },
            IS_WEB && {
              borderRadius: Radius.xl,
              maxWidth: 400,
              width: '100%',
              borderWidth: 1,
              borderColor: colors.border
            }
          ]}>
            {!IS_WEB && <View style={[s.pickerHandle, { backgroundColor: colors.border }]} />}

            {/* ✅ Picker Header with Back Button */}
            <View style={s.pickerHeader}>
              <TouchableOpacity
                style={[s.pickerBackBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowAsset(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={IconSize.md} color={colors.text} />
              </TouchableOpacity>
              <Text style={[s.pickerTitle, { color: colors.text, flex: 1, marginLeft: Spacing[3] }]}>
                Select Asset
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {assetsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing[6] }} />
              ) : assets.length === 0 ? (
                <Text style={{
                  color: colors.text3,
                  textAlign: 'center',
                  marginVertical: Spacing[6],
                  fontSize: Typography.sm
                }}>
                  No assets found for {selectedChain?.name ?? 'selected chain'}
                </Text>
              ) : (
                assets.map(a => (
                  <TouchableOpacity
                    key={a._id}
                    style={[
                      s.pickerRow,
                      { borderBottomColor: colors.borderSoft },
                      selAsset?._id === a._id && { backgroundColor: colors.primaryDim }
                    ]}
                    onPress={() => { setSelAsset(a); setShowAsset(false); }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={coinColors(a.symbol)} style={s.pickerDot}>
                      <Text style={s.pickerDotTxt}>{(a.symbol ?? '?')[0]}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                      <Text style={{
                        fontSize: Typography.sm,
                        fontWeight: Typography.bold,
                        color: colors.text
                      }}>
                        {a.name}
                      </Text>
                      <Text style={{
                        fontSize: Typography.xs,
                        color: colors.text2,
                        marginTop: 2
                      }}>
                        {a.symbol} · {a.chainId}
                      </Text>
                    </View>
                    {selAsset?._id === a._id && (
                      <Ionicons name="checkmark-circle" size={IconSize.md} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  if (IS_WEB) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={s.webOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
            activeOpacity={1}
          />
          <View style={[s.webPanel, { borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false}>{Inner}</ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={s.mobileOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          activeOpacity={1}
        />
        {Inner}
      </View>
    </Modal>
  );
}

// ─── Payment methods section styles ───────────────────────────────────────────
const pm = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  addBtnTxt: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },

  loadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderRadius: Radius.lg,
    padding: Spacing[4],
    justifyContent: 'center',
  },
  loadTxt: { fontSize: Typography.xs },

  emptyBox: {
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: Spacing[6],
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing[2],
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  emptyTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  emptySub: {
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: Typography.lineHeightSm,
    marginBottom: Spacing[1],
  },
  emptyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    marginTop: Spacing[2],
  },
  emptyBtnTxt: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: '#fff',
  },

  chipsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingBottom: Spacing[1],
    paddingTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    minWidth: 130,
    maxWidth: 190,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipIconTxt: {
    fontSize: Typography.sm,
    fontWeight: Typography.extrabold,
    color: '#fff',
  },
  chipName: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
  },
  chipVal: {
    fontSize: Typography.xs,
    marginTop: 1,
  },
});

const s = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
  },
  webPanel: {
    width: '100%',
    maxWidth: 480,
    borderRadius: Radius['3xl'],
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '92%' as any,
  },
  mobileOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  inner: {
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    padding: Spacing[6],
    paddingBottom: Spacing[10],
  },
  chainImg: {
    width: 32,
    height: 32,
    borderRadius: Radius.xl,
  },
  innerWeb: {
    borderRadius: Radius['3xl'],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.sm,
    alignSelf: 'center',
    marginBottom: Spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[5],
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing[1],
    marginBottom: Spacing[4],
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  typeTxt: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    marginBottom: Spacing[2],
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    marginBottom: Spacing[4],
  },
  selectVal: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  selectPlaceholder: {
    fontSize: Typography.sm,
    flex: 1,
  },
  assetDot: {
    width: 32,
    height: 32,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetDotTxt: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  currencyBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  currencyTxt: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    marginBottom: Spacing[4],
  },
  input: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    padding: 0,
  },
  inputUnit: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  btn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  btnGrad: {
    paddingVertical: Spacing[4],
    alignItems: 'center',
  },
  btnTxt: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  webPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing[6],
  },
  pickerSheet: {
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    padding: Spacing[5],
    paddingBottom: Spacing[8],
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: Radius.sm,
    alignSelf: 'center',
    marginBottom: Spacing[4],
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[4],
  },
  pickerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
  },
  pickerDot: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDotTxt: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: '#fff',
  },
});