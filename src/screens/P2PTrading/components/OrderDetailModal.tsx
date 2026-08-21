import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Clipboard,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResolvedAsset } from '@/cache/assetCache';
import { useAuth } from '@/context/AuthContext';
import { useP2POrderDetail } from '@/hooks/queires';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing,
  Typography,
  Radius,
  IconSize,
  getPrimaryGradient,
} from '@/styles/theme';
import { fmtDate } from '../constants';
import type { P2POrder, P2PAd } from '@/types/p2pTypes';

const IS_WEB = Platform.OS === 'web';

function adField(order: P2POrder, field: keyof P2PAd): string {
  if (order.adId && typeof order.adId === 'object') {
    return String((order.adId as P2PAd)[field] ?? '');
  }
  return '';
}

// ─── Payment Methods Block ───────────────────────────────────────────────────
function PaymentMethodsBlock({
  order,
  colors,
}: {
  order: P2POrder;
  colors: any;
}) {
  const adData = typeof order.adId === 'object' ? (order.adId as P2PAd) : null;
  const methods = adData?.paymentMethods;

  const isPopulated =
    Array.isArray(methods) &&
    methods.length > 0 &&
    typeof methods[0] === 'object';

  if (!isPopulated) return null;

  const handleCopy = (val: string) => {
    if (IS_WEB) {
      navigator.clipboard?.writeText(val).catch(() => {});
    } else {
      Clipboard.setString(val);
    }
  };

  return (
    <View
      style={[
        ps.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[ps.header, { borderBottomColor: colors.borderSoft }]}>
        <Ionicons
          name="card-outline"
          size={IconSize.xs}
          color={colors.accent}
        />
        <Text style={[ps.headerTxt, { color: colors.text }]}>
          Payment Details
        </Text>
      </View>

      {(methods as any[]).map((m, idx, arr) => {
        if (typeof m !== 'object' || !m) return null;

        const methodName =
          m.label ?? m.paymentMethodId?.name ?? 'Payment';
        const methodCode = m.paymentMethodId?.code ?? '';

        const fieldDefs = Array.isArray(m.paymentMethodId?.fields)
          ? m.paymentMethodId.fields
          : [];

        const fieldValues =
          m.fieldValues && typeof m.fieldValues === 'object'
            ? m.fieldValues
            : {};

        const displayFields: { fieldLabel: string; value: string }[] = [];

        fieldDefs.forEach((def: any) => {
          const value = fieldValues[def.fieldKey];
          if (value && typeof value === 'string' && value.trim()) {
            displayFields.push({
              fieldLabel: def.fieldLabel || def.fieldKey,
              value: value,
            });
          }
        });

        if (displayFields.length === 0 && Object.keys(fieldValues).length > 0) {
          Object.entries(fieldValues).forEach(([k, v]) => {
            if (typeof v === 'string' && v.trim()) {
              displayFields.push({
                fieldLabel: k
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase()),
                value: v,
              });
            }
          });
        }

        return (
          <View
            key={idx}
            style={[
              ps.methodBlock,
              idx < arr.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSoft,
              },
            ]}
          >
            <View style={ps.methodBadgeWrap}>
              <View
                style={[
                  ps.methodBadge,
                  { backgroundColor: colors.accentDim },
                ]}
              >
                <Ionicons
                  name="wallet-outline"
                  size={IconSize.xs}
                  color={colors.accent}
                />
                <Text
                  style={[ps.methodName, { color: colors.accent }]}
                  numberOfLines={1}
                >
                  {methodName}
                </Text>
              </View>
              {!!methodCode && (
                <Text style={[ps.methodCode, { color: colors.text2 }]}>
                  {methodCode}
                </Text>
              )}
            </View>

            {displayFields.length === 0 ? (
              <Text style={[ps.emptyTxt, { color: colors.text2 }]}>
                No details available
              </Text>
            ) : (
              displayFields.map((f, fi) => (
                <View
                  key={fi}
                  style={[
                    ps.fieldRow,
                    fi < displayFields.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderSoft,
                    },
                  ]}
                >
                  <Text
                    style={[ps.fieldLbl, { color: colors.text2 }]}
                    numberOfLines={2}
                  >
                    {f.fieldLabel}
                  </Text>

                  <View style={ps.fieldRight}>
                    <Text
                      style={[ps.fieldVal, { color: colors.text }]}
                      selectable
                      numberOfLines={3}
                      ellipsizeMode="middle"
                    >
                      {f.value}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCopy(f.value)}
                      style={[
                        ps.copyBtn,
                        { backgroundColor: colors.accentDim },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={IconSize.xs}
                        color={colors.accent}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const ps = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[4],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderBottomWidth: 1,
  },
  headerTxt: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  methodBlock: {
    padding: Spacing[3],
  },
  methodBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[2],
    flexWrap: 'wrap',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.sm,
    maxWidth: '100%',
  },
  methodName: {
    fontSize: Typography.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  methodCode: {
    fontSize: Typography.xs,
    fontWeight: '500',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing[2],
    gap: Spacing[2],
  },
  fieldLbl: {
    fontSize: Typography.xs,
    fontWeight: '500',
    flex: 1,
    minWidth: 80,
    maxWidth: '40%',
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  fieldVal: {
    fontSize: Typography.sm,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    minWidth: 0,
  },
  copyBtn: {
    padding: Spacing[1],
    borderRadius: Radius.xs,
    flexShrink: 0,
  },
  emptyTxt: {
    fontSize: Typography.xs,
    fontStyle: 'italic',
    paddingVertical: Spacing[1],
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  hidden?: boolean;
  order: P2POrder | null;
  onClose: () => void;
  onMarkFiatSent: () => void;
  onCancel: () => void;
  onRelease: () => void;
  onDispute: () => void;
  onRateSeller: () => void;
  colors: any;
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function OrderDetailModal({
  visible,
  hidden = false,
  order,
  onClose,
  onMarkFiatSent,
  onCancel,
  onRelease,
  onDispute,
  onRateSeller,
  colors,
}: Props) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const primaryGrad = getPrimaryGradient(isDark);

  const {
    data: freshOrder,
    isLoading: loadingFreshOrder,
    refetch: refetchOrder,
  } = useP2POrderDetail(order?._id ?? '');

  const displayOrder = freshOrder ?? order;

  const asset = useResolvedAsset(
    displayOrder?.asset ?? '',
    displayOrder?.chainId ?? ''
  );

  useEffect(() => {
    if (visible && order?._id) {
      refetchOrder();
    }
  }, [visible, order?._id, refetchOrder]);

  if (!visible || !displayOrder) return null;

  const currency =
    displayOrder.currency ?? adField(displayOrder, 'currency') ?? '—';
  const price =
    displayOrder.price ?? adField(displayOrder, 'price') ?? '—';

  // Status color mapping using theme
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'ESCROW_LOCKED':
        return {
          color: colors.orange,
          bg: colors.orangeDim,
          label: status.replace(/_/g, ' '),
        };
      case 'FIAT_SENT':
        return {
          color: colors.accent,
          bg: colors.accentDim,
          label: 'Fiat Sent',
        };
      case 'COMPLETED':
        return {
          color: colors.greenBright,
          bg: colors.greenDim,
          label: 'Completed',
        };
      case 'CANCELLED':
        return {
          color: colors.red,
          bg: colors.redDim,
          label: 'Cancelled',
        };
      case 'DISPUTED':
        return {
          color: colors.orange,
          bg: colors.orangeDim,
          label: 'Disputed',
        };
      case 'RELEASED':
        return {
          color: colors.greenBright,
          bg: colors.greenDim,
          label: 'Released',
        };
      default:
        return {
          color: colors.text2,
          bg: colors.surface,
          label: status,
        };
    }
  };

  const statusCfg = getStatusConfig(displayOrder.status);

  const buyerId =
    typeof displayOrder.buyerId === 'object' && displayOrder.buyerId
      ? (displayOrder.buyerId as any)._id
      : displayOrder.buyerId;
  const sellerId =
    typeof displayOrder.sellerId === 'object' && displayOrder.sellerId
      ? (displayOrder.sellerId as any)._id
      : displayOrder.sellerId;

  const isBuyer = !!user?._id && user._id === buyerId;
  const isSeller = !!user?._id && user._id === sellerId;

  const showPaymentDetails =
    isBuyer &&
    (displayOrder.status === 'ESCROW_LOCKED' ||
      displayOrder.status === 'PENDING' ||
      displayOrder.status === 'FIAT_SENT');

  if (loadingFreshOrder && !displayOrder) {
    return (
      <Modal visible={!hidden} transparent animationType={IS_WEB ? 'fade' : 'slide'}>
        <View
          style={IS_WEB ? s.webOverlay : s.mobileOverlay}
        >
          <View
            style={[
              IS_WEB ? s.webPanel : s.inner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={{ padding: 60, alignItems: 'center', gap: Spacing[3] }}>
              <ActivityIndicator
                size="large"
                color={colors.primaryBright}
              />
              <Text
                style={{ color: colors.text2, fontSize: Typography.base }}
              >
                Loading order details...
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const Content = (
    <>
      {/* ── Header ── */}
      <View style={s.headerRow}>
        <View style={{ flex: 1, marginRight: Spacing[3] }}>
          <Text style={[s.title, { color: colors.text }]}>Order Detail</Text>
          <Text
            style={[s.sub, { color: colors.text2 }]}
            numberOfLines={2}
          >
            #{displayOrder._id.slice(-8).toUpperCase()}
            {isBuyer
              ? ' · You are buying'
              : isSeller
                ? ' · You are selling'
                : ''}
          </Text>
        </View>
        <View
          style={[
            s.statusBadge,
            { backgroundColor: statusCfg.bg },
          ]}
        >
          <Text
            style={[s.statusTxt, { color: statusCfg.color }]}
            numberOfLines={1}
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* ── Order Info ── */}
      <View
        style={[
          s.infoBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {[
          {
            label: 'Asset',
            val: `${asset.symbol} (${displayOrder.chainId})`,
            color: colors.text,
          },
          {
            label: 'Amount',
            val: `${displayOrder.amount} ${asset.symbol}`,
            color: colors.greenBright,
          },
          {
            label: 'Total',
            val: `${displayOrder.fiatAmount} ${currency}`,
            color: colors.text,
          },
          {
            label: 'Price',
            val: price !== '—' ? `${price} ${currency}` : '—',
            color: colors.text,
          },
          {
            label: 'Date',
            val: fmtDate(displayOrder.createdAt),
            color: colors.text,
          },
          ...(displayOrder.fiatSentAt
            ? [
              {
                label: 'Fiat Sent',
                val: fmtDate(displayOrder.fiatSentAt),
                color: colors.accent,
              },
            ]
            : []),
          ...(displayOrder.completedAt
            ? [
              {
                label: 'Completed',
                val: fmtDate(displayOrder.completedAt),
                color: colors.greenBright,
              },
            ]
            : []),
          ...(displayOrder.fiatProof
            ? [
              {
                label: 'Payment Ref',
                val: displayOrder.fiatProof,
                color: colors.text,
              },
            ]
            : []),
          ...(displayOrder.cancelReason
            ? [
              {
                label: 'Cancel Reason',
                val: `${displayOrder.cancelReason}${
                  displayOrder.cancelledBy ? ` · ${displayOrder.cancelledBy}` : ''
                }`,
                color: colors.red,
              },
            ]
            : []),
        ].map((r, i, arr) => (
          <View
            key={r.label}
            style={[
              s.infoRow,
              i < arr.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSoft,
              },
            ]}
          >
            <Text style={[s.infoLbl, { color: colors.text2 }]}>
              {r.label}
            </Text>
            <Text
              style={[s.infoVal, { color: r.color }]}
              numberOfLines={3}
            >
              {r.val}
            </Text>
          </View>
        ))}
      </View>

      {showPaymentDetails && (
        <PaymentMethodsBlock order={displayOrder} colors={colors} />
      )}

      {/* ── ESCROW_LOCKED / PENDING ── */}
      {(displayOrder.status === 'ESCROW_LOCKED' ||
        displayOrder.status === 'PENDING') && (
        <View style={{ gap: Spacing[2] }}>
          {isBuyer && (
            <>
              <View
                style={[
                  s.noticeBox,
                  {
                    backgroundColor: colors.accentDim,
                    borderColor: colors.accentBorder,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={IconSize.sm}
                  color={colors.accent}
                  style={{ flexShrink: 0 }}
                />
                <Text style={[s.noticeTxt, { color: colors.text2 }]}>
                  Send {displayOrder.fiatAmount} {currency} to the seller using
                  the payment details above, then confirm below.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  s.actionBtn,
                  { backgroundColor: colors.greenBright },
                ]}
                onPress={onMarkFiatSent}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={IconSize.md}
                  color="#fff"
                />
                <Text style={s.actionBtnTxt}>I Have Sent Payment</Text>
              </TouchableOpacity>
            </>
          )}

          {isSeller && (
            <View
              style={[
                s.noticeBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={IconSize.sm}
                color={colors.text2}
                style={{ flexShrink: 0 }}
              />
              <Text style={[s.noticeTxt, { color: colors.text2 }]}>
                Waiting for buyer to send payment. Do not release until
                confirmed in your account.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.red,
              },
            ]}
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Ionicons
              name="close-circle-outline"
              size={IconSize.md}
              color={colors.red}
            />
            <Text style={[s.actionBtnTxt, { color: colors.red }]}>
              Cancel Order
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── FIAT_SENT ── */}
      {displayOrder.status === 'FIAT_SENT' && (
        <View style={{ gap: Spacing[2] }}>
          {isSeller && (
            <>
              <View
                style={[
                  s.noticeBox,
                  {
                    backgroundColor: colors.greenDim,
                    borderColor: colors.greenBorder,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={IconSize.sm}
                  color={colors.greenBright}
                  style={{ flexShrink: 0 }}
                />
                <Text style={[s.noticeTxt, { color: colors.text2 }]}>
                  Buyer claims payment of {displayOrder.fiatAmount} {currency}{' '}
                  was sent. Verify in your account before releasing.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  s.actionBtn,
                  { backgroundColor: colors.greenBright },
                ]}
                onPress={onRelease}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="lock-open-outline"
                  size={IconSize.md}
                  color="#fff"
                />
                <Text style={s.actionBtnTxt}>Release Crypto</Text>
              </TouchableOpacity>
            </>
          )}

          {isBuyer && (
            <View
              style={[
                s.noticeBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={IconSize.sm}
                color={colors.text2}
                style={{ flexShrink: 0 }}
              />
              <Text style={[s.noticeTxt, { color: colors.text2 }]}>
                Waiting for seller to verify and release crypto.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              s.actionBtn,
              {
                backgroundColor: colors.orangeDim,
                borderWidth: 1,
                borderColor: colors.orange,
              },
            ]}
            onPress={onDispute}
            activeOpacity={0.85}
          >
            <Ionicons
              name="alert-circle-outline"
              size={IconSize.md}
              color={colors.orange}
            />
            <Text style={[s.actionBtnTxt, { color: colors.orange }]}>
              Raise Dispute
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {displayOrder.status === 'DISPUTED' && (
        <View
          style={[
            s.noticeBox,
            {
              backgroundColor: colors.orangeDim,
              borderColor: colors.orangeBorder,
            },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={IconSize.sm}
            color={colors.orange}
            style={{ flexShrink: 0 }}
          />
          <Text style={[s.noticeTxt, { color: colors.text2 }]}>
            This order is under dispute review. Our team will resolve it
            shortly.
          </Text>
        </View>
      )}

      {displayOrder.status === 'CANCELLED' && (
        <View
          style={[
            s.noticeBox,
            {
              backgroundColor: colors.redDim,
              borderColor: colors.redBorder,
            },
          ]}
        >
          <Ionicons
            name="close-circle-outline"
            size={IconSize.sm}
            color={colors.red}
            style={{ flexShrink: 0 }}
          />
          <Text style={[s.noticeTxt, { color: colors.text2 }]}>
            This order was cancelled.
            {displayOrder.cancelReason
              ? ` Reason: ${displayOrder.cancelReason}.`
              : ''}
          </Text>
        </View>
      )}

      {displayOrder.status === 'COMPLETED' && (
        <View style={{ gap: Spacing[2] }}>
          <View
            style={[
              s.noticeBox,
              {
                backgroundColor: colors.greenDim,
                borderColor: colors.greenBorder,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={IconSize.sm}
              color={colors.greenBright}
              style={{ flexShrink: 0 }}
            />
            <Text style={[s.noticeTxt, { color: colors.text2 }]}>
              Order completed successfully.
            </Text>
          </View>
          {isBuyer && (
            <TouchableOpacity
              style={[
                s.actionBtn,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.greenBright,
                },
              ]}
              onPress={onRateSeller}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  s.actionBtnTxt,
                  { color: colors.greenBright },
                ]}
              >
                ⭐ Rate Seller
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          s.closeFullBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        onPress={onClose}
      >
        <Text style={[s.closeTxt, { color: colors.text2 }]}>Close</Text>
      </TouchableOpacity>
    </>
  );

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {Content}
      </ScrollView>
    </View>
  );

  if (IS_WEB) {
    return (
      <Modal visible={!hidden} transparent animationType="fade">
        <View style={[s.webOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
            activeOpacity={1}
          />
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
    <Modal visible={!hidden} transparent animationType="slide">
      <View
        style={[s.mobileOverlay, { backgroundColor: colors.overlay }]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />
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
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  mobileOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inner: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    maxHeight: '85%',
  },
  innerWeb: {
    borderRadius: Radius['2xl'],
    maxHeight: '100%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.xs,
    alignSelf: 'center',
    marginTop: Spacing[3],
    marginBottom: Spacing[4],
  },
  scrollContent: {
    padding: Spacing[6],
    paddingTop: IS_WEB ? Spacing[6] : 0,
    paddingBottom: Spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
    gap: Spacing[3],
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  sub: {
    fontSize: Typography.xs,
    marginTop: 3,
    lineHeight: Typography.lineHeightBase,
  },
  statusBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    maxWidth: 140,
  },
  statusTxt: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing[4],
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing[3],
    gap: Spacing[2],
  },
  infoLbl: {
    fontSize: Typography.sm,
    flex: 1,
    maxWidth: '40%',
  },
  infoVal: {
    fontSize: Typography.sm,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.lg,
    flexWrap: 'wrap',
  },
  actionBtnTxt: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: '#fff',
  },
  closeFullBtn: {
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: Spacing[4],
  },
  closeTxt: {
    fontSize: Typography.base,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  noticeTxt: {
    fontSize: Typography.xs,
    flex: 1,
    lineHeight: Typography.lineHeightMd,
  },
});