import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useResolvedAsset } from '@/cache/assetCache';
import {
  usePlaceP2POrder,
  usePaymentAccounts,
  useAssetBalance,
} from '@/hooks/queires';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing,
  Typography,
  Radius,
  IconSize,
  getPrimaryGradient,
} from '@/styles/theme';
import { fmtDate, showAlert } from '../constants';
import type { P2PAd } from '@/types/p2pTypes';
import type { UserPaymentAccount } from '@/services/paymentMethodService';

const IS_WEB = Platform.OS === 'web';

const webReset = Platform.OS === 'web'
  ? ({
      outlineWidth: 0,
      outlineStyle: 'none',
      boxShadow: 'none',
      WebkitAppearance: 'none',
    } as any)
  : {};

interface Props {
  visible: boolean;
  ad: P2PAd | null;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}

type Step = 'enter_amount' | 'confirmed';

const METHOD_COLORS: Record<string, [string, string]> = {
  GOOGLEPAY: ['#4285f4', '#34a853'],
  GOOGLE_PAY: ['#4285f4', '#34a853'],
  BANK: ['#1e3a8a', '#3b82f6'],
  BANK_TRANSFER: ['#1e3a8a', '#3b82f6'],
  PAYPAL: ['#003087', '#009cde'],
  UPI: ['#6366f1', '#8b5cf6'],
};

const getPmColors = (code: string): [string, string] =>
  METHOD_COLORS[code?.toUpperCase()] ?? ['#2AA9E0', '#1E8FC0'];

const getPmName = (a: UserPaymentAccount): string => {
  const pm = a.paymentMethodId;
  return typeof pm === 'object' && (pm as any)?.name
    ? (pm as any).name
    : 'Payment';
};

const getPmCode = (a: UserPaymentAccount): string => {
  const pm = a.paymentMethodId;
  return typeof pm === 'object' && (pm as any)?.code ? (pm as any).code : '';
};

export default function PlaceOrderModal({
  visible,
  ad,
  onClose,
  onSuccess,
  colors,
}: Props) {
  const { isDark } = useTheme();
  const primaryGrad = getPrimaryGradient(isDark);

  const [step, setStep] = useState<Step>('enter_amount');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const placeOrder = usePlaceP2POrder();

  const {
    data: paymentAccounts = [],
    isLoading: loadingAccounts,
  } = usePaymentAccounts();

  const asset = useResolvedAsset(ad?.asset ?? '', ad?.chainId ?? '');

  const {
    data: rawBalance,
    isLoading: loadingBalance,
  } = useAssetBalance(
    visible && ad ? (ad.chainId ?? undefined) : undefined,
    visible && ad ? ad.asset : undefined
  );

  const availableBalance = rawBalance ? parseFloat(rawBalance) : 0;

  useEffect(() => {
    if (visible) {
      setStep('enter_amount');
      setAmount('');
      setSelectedAccountId('');
    }
  }, [visible]);

  if (!visible || !ad) return null;

  const isBuyerFlow = ad.type === 'SELL';
  // ✅ For dark navy theme: use primary gradient instead of green/red
  const accentColor = isBuyerFlow ? colors.primaryBright : colors.accent;
  const accentGradient = isBuyerFlow ? primaryGrad : [colors.accent, colors.accentGlow];
  const amtNum = parseFloat(amount) || 0;
  const totalFiat = (amtNum * parseFloat(ad.price || '0')).toFixed(2);
  const min = parseFloat(ad.minLimit ?? '0');
  const max = parseFloat(ad.maxLimit ?? '0');

  const hasInsufficientBalance = amtNum > 0 && amtNum > availableBalance;

  // ── Handle Proceed ──────────────────────────────────────────────────────
  const handleProceed = () => {
    if (!amount || amtNum <= 0) {
      showAlert('Required', 'Please enter amount');
      return;
    }

    if (amtNum < min || amtNum > max) {
      showAlert(
        'Limit Error',
        `Amount must be between ${min} and ${max} ${ad.currency}`
      );
      return;
    }

    if (hasInsufficientBalance) {
      showAlert(
        'Insufficient Balance',
        `You don't have enough ${asset.symbol} balance.\n\n` +
          `Required: ${amtNum} ${asset.symbol}\n` +
          `Available: ${availableBalance.toFixed(6)} ${asset.symbol}`
      );
      return;
    }

    if (availableBalance <= 0 && !loadingBalance) {
      showAlert(
        'No Balance',
        `Your ${asset.symbol} balance is zero. ` +
          `Please deposit funds before placing an order.`
      );
      return;
    }

    if (!isBuyerFlow && !selectedAccountId) {
      showAlert(
        'Required',
        'Please select your payment account so buyer knows where to pay'
      );
      return;
    }

    const payload: {
      adId: string;
      cryptoAmount: string;
      paymentAccountId?: string;
    } = {
      adId: ad._id,
      cryptoAmount: amount,
    };

    if (selectedAccountId) {
      payload.paymentAccountId = selectedAccountId;
    }

    placeOrder.mutate(payload as any, {
      onSuccess: () => {
        setStep('confirmed');
        onSuccess();
      },
      onError: (e: any) =>
        showAlert('Error', e?.message ?? 'Failed to place trade request'),
    });
  };

  // ── Payment Account Selector ──────────────────────────────────────────
  const PaymentAccountSelector = ({ required }: { required: boolean }) => (
    <View style={{ marginBottom: Spacing[4] }}>
      <Text style={[s.label, { color: colors.text2 }]}>
        Your Payment Account
        {required && <Text style={{ color: colors.red }}> *</Text>}
        {!required && <Text style={{ color: colors.text3 }}> (optional)</Text>}
      </Text>

      {loadingAccounts ? (
        <View
          style={[
            s.accountLoadBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primaryBright} />
          <Text style={[s.accountLoadTxt, { color: colors.text2 }]}>
            Loading accounts…
          </Text>
        </View>
      ) : paymentAccounts.length === 0 ? (
        <View
          style={[
            s.accountEmptyBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="card-outline"
            size={IconSize.sm}
            color={colors.text3}
          />
          <Text style={[s.accountEmptyTxt, { color: colors.text2 }]}>
            No payment accounts added yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing[2], paddingBottom: Spacing[1] }}
        >
          {paymentAccounts.map((acc) => {
            const isSel = selectedAccountId === acc._id;
            const code = getPmCode(acc);
            const name = getPmName(acc);
            const gradColors = getPmColors(code);
            const firstVal = Object.values(acc.fieldValues || {})[0] as
              | string
              | undefined;

            return (
              <TouchableOpacity
                key={acc._id}
                style={[
                  s.accountChip,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  isSel && {
                    backgroundColor: `${accentColor}18`,
                    borderColor: accentColor,
                  },
                ]}
                onPress={() =>
                  setSelectedAccountId(isSel ? '' : acc._id)
                }
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gradColors}
                  style={s.accountChipIcon}
                >
                  <Text style={s.accountChipIconTxt}>
                    {name[0]?.toUpperCase() ?? 'P'}
                  </Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.accountChipName,
                      { color: isSel ? accentColor : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {acc.label || name}
                  </Text>
                  {firstVal ? (
                    <Text
                      style={[
                        s.accountChipVal,
                        { color: colors.text2 },
                      ]}
                      numberOfLines={1}
                    >
                      {firstVal}
                    </Text>
                  ) : null}
                </View>

                {isSel && (
                  <Ionicons
                    name="checkmark-circle"
                    size={IconSize.sm}
                    color={accentColor}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ── Inner JSX ───────────────────────────────────────────────────────────
  const Inner = (
    <View
      style={[
        s.inner,
        { backgroundColor: colors.card },
        IS_WEB && s.innerWeb,
      ]}
    >
      {!IS_WEB && (
        <View style={[s.handle, { backgroundColor: colors.border }]} />
      )}

      {/* Header */}
      <View style={s.headerRow}>
        <View
          style={[
            s.actionBadge,
            { backgroundColor: `${accentColor}18` },
          ]}
        >
          <Text style={[s.actionTxt, { color: accentColor }]}>
            {isBuyerFlow ? 'BUY' : 'SELL'} {asset.symbol}
          </Text>
        </View>
        {step === 'enter_amount' && (
          <TouchableOpacity
            style={[
              s.closeBtn,
              { backgroundColor: colors.surface },
            ]}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={IconSize.sm}
              color={colors.text2}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* STEP 1 — Enter Amount */}
      {step === 'enter_amount' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ad info */}
          <View
            style={[
              s.adInfo,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {[
              {
                label: 'Price',
                val: `${ad.price} ${ad.currency}/${asset.symbol}`,
              },
              {
                label: 'Available',
                val: `${ad.availableAmount} ${asset.symbol}`,
              },
              {
                label: 'Limit',
                val: `${min} – ${max} ${ad.currency}`,
              },
            ].map((r, i, arr) => (
              <View
                key={r.label}
                style={[
                  s.adInfoRow,
                  i < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSoft,
                  },
                ]}
              >
                <Text style={[s.adInfoLbl, { color: colors.text2 }]}>
                  {r.label}
                </Text>
                <Text style={[s.adInfoVal, { color: colors.text }]}>
                  {r.val}
                </Text>
              </View>
            ))}
          </View>

          {/* Balance display */}
          <View
            style={[
              s.balanceRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing[1],
              }}
            >
              <Ionicons
                name="wallet-outline"
                size={IconSize.xs}
                color={colors.text2}
              />
              <Text style={[s.balanceLabel, { color: colors.text2 }]}>
                Your Balance
              </Text>
            </View>
            {loadingBalance ? (
              <ActivityIndicator
                size="small"
                color={colors.primaryBright}
              />
            ) : (
              <Text
                style={[
                  s.balanceValue,
                  {
                    // ✅ Use accent instead of green for navy theme
                    color: hasInsufficientBalance
                      ? colors.red
                      : colors.accent,
                  },
                ]}
              >
                {availableBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}{' '}
                {asset.symbol}
              </Text>
            )}
          </View>

          {/* Amount input */}
          <Text
            style={[
              s.label,
              { color: colors.text2, marginTop: Spacing[3] },
            ]}
          >
            Amount ({asset.symbol})
          </Text>
          <View
            style={[
              s.inputRow,
              {
                backgroundColor: colors.surface,
                borderColor: hasInsufficientBalance
                  ? colors.red
                  : colors.border,
              },
            ]}
          >
            <TextInput
              style={[s.input, { color: colors.text }, webReset]}
              placeholder="0.00"
              placeholderTextColor={colors.text3}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(v) =>
                setAmount(v.replace(/[^0-9.]/g, ''))
              }
              underlineColorAndroid="transparent"
              autoFocus={IS_WEB}
            />
            <Text style={[s.inputUnit, { color: accentColor }]}>
              {asset.symbol}
            </Text>
          </View>

          {/* Insufficient balance error */}
          {hasInsufficientBalance && (
            <View style={s.insufficientRow}>
              <Ionicons
                name="alert-circle-outline"
                size={IconSize.xs}
                color={colors.red}
              />
              <Text style={[s.insufficientText, { color: colors.red }]}>
                Insufficient balance. Available:{' '}
                {availableBalance.toFixed(6)} {asset.symbol}
              </Text>
            </View>
          )}

          {/* Total fiat */}
          {amtNum > 0 && (
            <View
              style={[
                s.totalRow,
                {
                  backgroundColor: `${accentColor}10`,
                  borderColor: `${accentColor}25`,
                },
              ]}
            >
              <Text style={[s.totalLbl, { color: colors.text2 }]}>
                {isBuyerFlow ? 'You will pay' : 'Buyer will pay'}
              </Text>
              <Text style={[s.totalVal, { color: accentColor }]}>
                {totalFiat} {ad.currency}
              </Text>
            </View>
          )}

          <PaymentAccountSelector required={!isBuyerFlow} />

          {/* Escrow note */}
          <View
            style={[
              s.escrowNote,
              {
                backgroundColor: colors.accentDim,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={IconSize.sm}
              color={colors.accent}
            />
            <Text style={[s.escrowTxt, { color: colors.text2 }]}>
              {isBuyerFlow
                ? 'Your trade request will be submitted. Once admin approves, crypto will be locked in escrow and you can proceed with payment.'
                : 'After your sell request is submitted and approved, buyer will send payment to your selected account. Release crypto only after confirming receipt.'}
            </Text>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              s.btn,
              (placeOrder.isPending ||
                hasInsufficientBalance ||
                loadingBalance) && { opacity: 0.6 },
            ]}
            onPress={handleProceed}
            disabled={
              placeOrder.isPending ||
              hasInsufficientBalance ||
              loadingBalance
            }
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={accentGradient as any}
              style={s.btnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {placeOrder.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.btnTxt}>
                  {isBuyerFlow
                    ? 'Submit Buy Request'
                    : 'Submit Sell Request'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* STEP 2 — Confirmed */}
      {step === 'confirmed' && (
        <View
          style={{
            alignItems: 'center',
            gap: Spacing[3],
            paddingVertical: Spacing[2],
          }}
        >
          <View
            style={[
              s.successIcon,
              { backgroundColor: `${accentColor}18` },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={IconSize.xl}
              color={accentColor}
            />
          </View>

          <Text
            style={[s.successTitle, { color: colors.text }]}
          >
            {isBuyerFlow
              ? 'Buy Request Submitted!'
              : 'Sell Request Submitted!'}
          </Text>

          <Text
            style={[s.successSub, { color: colors.text2 }]}
          >
            {isBuyerFlow
              ? "Your buy request has been submitted for admin approval. Once approved, go to My Orders to view the seller's payment details and complete your payment."
              : 'Your sell request has been submitted. Once the admin approves, the buyer will be notified to send payment to your account.'}
          </Text>

          <TouchableOpacity
            style={[s.btn, { width: '100%' }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={primaryGrad}
              style={s.btnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.btnTxt}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (IS_WEB) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={[s.webOverlay, { backgroundColor: colors.overlay }]}>
          {step === 'enter_amount' && (
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={onClose}
              activeOpacity={1}
            />
          )}
          <View
            style={[s.webPanel, { borderColor: colors.border }]}
          >
            {Inner}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={[s.mobileOverlay, { backgroundColor: colors.overlay }]}>
        {step === 'enter_amount' && (
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
            activeOpacity={1}
          />
        )}
        {Inner}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  webOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[6],
  },
  webPanel: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '92%' as any,
  },
  mobileOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inner: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[6],
    paddingBottom: Spacing[8],
  },
  innerWeb: {
    borderRadius: Radius['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.xs,
    alignSelf: 'center',
    marginBottom: Spacing[5],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  actionBadge: {
    paddingHorizontal: Spacing[3] + 2,
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  actionTxt: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adInfo: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[4],
    overflow: 'hidden',
  },
  adInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing[3],
  },
  adInfoLbl: {
    fontSize: Typography.sm,
  },
  adInfoVal: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing[3] + 2,
    paddingVertical: Spacing[2] + 2,
    marginBottom: Spacing[1],
  },
  balanceLabel: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },

  insufficientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginTop: Spacing[1],
    marginBottom: Spacing[2],
  },
  insufficientText: {
    fontSize: Typography.xs,
    flex: 1,
  },

  label: {
    fontSize: Typography.sm,
    fontWeight: '600',
    marginBottom: Spacing[2],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing[3] + 2,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[3],
  },
  input: {
    flex: 1,
    fontSize: Typography['2xl'],
    fontWeight: '700',
    padding: 0,
  },
  inputUnit: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[4],
  },
  totalLbl: {
    fontSize: Typography.sm,
  },
  totalVal: {
    fontSize: Typography.md,
    fontWeight: '700',
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[4],
  },
  escrowTxt: {
    fontSize: Typography.xs,
    flex: 1,
    lineHeight: Typography.lineHeightMd,
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
    fontSize: Typography.base,
    fontWeight: '700',
    color: '#fff',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: Typography.lg,
    fontWeight: '800',
  },
  successSub: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeightBase,
    paddingHorizontal: Spacing[2],
  },

  accountLoadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[1],
  },
  accountLoadTxt: {
    fontSize: Typography.xs,
  },
  accountEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing[3],
    marginBottom: Spacing[1],
  },
  accountEmptyTxt: {
    fontSize: Typography.xs,
    flex: 1,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[2] + 2,
    paddingVertical: Spacing[2] + 1,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: 140,
    maxWidth: 200,
  },
  accountChipIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accountChipIconTxt: {
    fontSize: Typography.xs,
    fontWeight: '800',
    color: '#fff',
  },
  accountChipName: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  accountChipVal: {
    fontSize: Typography.xs,
    marginTop: 1,
  },
});