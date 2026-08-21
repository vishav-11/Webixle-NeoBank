import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius, IconSize } from '@/styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import { useResolvedAsset } from '@/cache/assetCache';
import { useAuth } from '@/context/AuthContext';
import { fmtDate } from '../constants';
import type { P2POrder, P2PAd } from '@/types/p2pTypes';

// helpers to safely pull fields from populated adId
function getAdField(order: P2POrder, field: 'price' | 'currency' | 'type'): string {
  const ad = order.adId;
  if (ad && typeof ad === 'object') return (ad as P2PAd)[field] ?? '';
  return order[field as keyof P2POrder] as string ?? '';
}

// ── Single order card ─────────────────────────────────────────────────────────
function OrderCard({
  order, onSelect, colors,
}: {
  order: P2POrder; onSelect: () => void; colors: any;
}) {
  const { user } = useAuth();
  const isBuyer  = user?._id === order.buyerId;

  const asset    = useResolvedAsset(order.asset, order.chainId);
  const adType   = getAdField(order, 'type') as 'BUY' | 'SELL';
  const price    = order.price ?? getAdField(order, 'price');
  const currency = order.currency ?? getAdField(order, 'currency');

  // Status color mapping using theme
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':       return colors.orange;
      case 'FIAT_SENT':     return colors.accent;
      case 'COMPLETED':     return colors.greenBright;
      case 'CANCELLED':     return colors.text3;
      case 'DISPUTED':      return colors.red;
      case 'RELEASED':      return colors.greenBright;
      default:              return colors.text2;
    }
  };

  const statusColor = getStatusColor(order.status);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.cardHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
          <Text style={[s.assetTxt, { color: colors.text }]}>{asset.symbol}</Text>
          <Text style={[s.chainTxt, { color: colors.text3 }]}>{order.chainId}</Text>
          <View style={[
            s.roleTag,
            { backgroundColor: isBuyer ? colors.accentDim : colors.redDim },
          ]}>
            <Text style={[s.roleTagTxt, { color: isBuyer ? colors.accent : colors.red }]}>
              {isBuyer ? 'BUYING' : 'SELLING'}
            </Text>
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[s.statusTxt, { color: statusColor }]}>
            {order.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={[s.infoBox, { backgroundColor: colors.surface }]}>
        {[
          { label: 'Amount', val: `${order.amount} ${asset.symbol}` },
          { label: 'Total',  val: `${order.fiatAmount} ${currency}` },
          { label: 'Price',  val: price ? `${price} ${currency}` : '—' },
        ].map((r, i, arr) => (
          <View
            key={r.label}
            style={[
              s.infoRow,
              i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
            ]}
          >
            <Text style={[s.infoLbl, { color: colors.text2 }]}>{r.label}</Text>
            <Text style={[s.infoVal, { color: colors.text }]}>{r.val}</Text>
          </View>
        ))}
      </View>

      {/* Cancel reason */}
      {order.cancelReason && (
        <Text style={[s.cancelReason, { color: colors.text3 }]}>
          ✕ {order.cancelReason}
          {order.cancelledBy ? ` · ${order.cancelledBy}` : ''}
        </Text>
      )}

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={[s.dateText, { color: colors.text3 }]}>{fmtDate(order.createdAt)}</Text>
        <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
          <Text style={[s.viewDetail, { color: colors.accent }]}>View Detail →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
interface OrdersTabProps {
  orders:        P2POrder[];
  ordersLoading: boolean;
  onRefresh:     () => void;
  onSelectOrder: (order: P2POrder) => void;
  colors:        any;
}

export default function OrdersTab({
  orders, ordersLoading, onRefresh, onSelectOrder, colors,
}: OrdersTabProps) {
  const insets = useSafeAreaInsets();

  const safeOrders     = Array.isArray(orders) ? orders : [];
  const pendingCount   = safeOrders.filter(o => o.status === 'PENDING').length;
  const fiatSentCount  = safeOrders.filter(o => o.status === 'FIAT_SENT').length;
  const completedCount = safeOrders.filter(o => o.status === 'COMPLETED').length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={ordersLoading}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={{
        padding: Spacing[4],
        gap: Spacing[3],
        paddingBottom: insets.bottom + 80,
      }}
    >
      {/* Stats */}
      <View style={[s.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: 'Pending',   val: pendingCount,   color: colors.orange      },
          { label: 'Fiat Sent', val: fiatSentCount,  color: colors.accent      },
          { label: 'Completed', val: completedCount, color: colors.greenBright },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={s.statItem}>
              <Text style={[s.statVal, { color: stat.color }]}>{stat.val}</Text>
              <Text style={[s.statLabel, { color: colors.text2 }]}>{stat.label}</Text>
            </View>
            {i < arr.length - 1 && (
              <View style={[s.statSep, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {ordersLoading
        ? [1, 2, 3].map(i => <SkeletonBox key={i} h={160} r={Radius.xl} />)
        : safeOrders.length === 0
          ? (
            <View style={[s.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={48} color={colors.text3} />
              <Text style={[s.emptyTxt, { color: colors.text2 }]}>No orders yet</Text>
            </View>
          )
          : safeOrders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onSelect={() => onSelectOrder(order)}
              colors={colors}
            />
          ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  statsCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] + 2, flexDirection: 'row', alignItems: 'center' },
  statItem:     { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: Typography['2xl'], fontWeight: '800' },
  statLabel:    { fontSize: Typography.xs, marginTop: 4 },
  statSep:      { width: 1, height: 36 },

  card:         { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[2] + 2 },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetTxt:     { fontSize: Typography.base, fontWeight: '700' },
  chainTxt:     { fontSize: Typography.xs },
  roleTag:      { paddingHorizontal: Spacing[1] + 3, paddingVertical: 2, borderRadius: Radius.sm },
  roleTagTxt:   { fontSize: 10, fontWeight: '800' },
  statusBadge:  { paddingHorizontal: Spacing[2] + 2, paddingVertical: 4, borderRadius: Radius.full },
  statusTxt:    { fontSize: Typography.xs, fontWeight: '700', textTransform: 'capitalize' },

  infoBox:      { borderRadius: Radius.md, overflow: 'hidden' },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing[3] },
  infoLbl:      { fontSize: Typography.sm },
  infoVal:      { fontSize: Typography.sm, fontWeight: '600' },

  cancelReason: { fontSize: Typography.xs, fontStyle: 'italic' },

  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:     { fontSize: Typography.xs },
  viewDetail:   { fontSize: Typography.sm, fontWeight: '700' },

  empty:        { alignItems: 'center', padding: Spacing[12], borderRadius: Radius.xl, borderWidth: 1, gap: Spacing[2] + 2 },
  emptyTxt:     { fontSize: Typography.md, fontWeight: '600' },
});