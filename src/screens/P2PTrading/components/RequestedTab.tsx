// src/components/p2p/RequestedTab.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useResolvedAsset } from '@/cache/assetCache';
import type { P2PTradeRequest } from '@/types/p2pTypes';
import { 
  Typography, Spacing, Radius, IconSize,
  type ColorScheme 
} from '@/styles/theme';

interface Props {
  requests: P2PTradeRequest[];
  requestsLoading: boolean;
  onRefresh: () => void;
  colors: ColorScheme;
}

// ── Status → color/label mapping ──────────────────────────────────────────
const STATUS_META: Record<
  string,
  { 
    colorKey: keyof Pick<ColorScheme, 'orange' | 'blue' | 'green' | 'red'>;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  PENDING:   { colorKey: 'orange', label: 'Pending Approval', icon: 'hourglass-outline' },
  ASSIGNED:  { colorKey: 'blue',   label: 'Seller Assigned',  icon: 'person-outline' },
  APPROVED:  { colorKey: 'green',  label: 'Approved',         icon: 'checkmark-circle-outline' },
  COMPLETED: { colorKey: 'green',  label: 'Completed',        icon: 'checkmark-done-outline' },
  CANCELLED: { colorKey: 'red',    label: 'Cancelled',        icon: 'close-circle-outline' },
  REJECTED:  { colorKey: 'red',    label: 'Rejected',         icon: 'close-circle-outline' },
};

const getStatusMeta = (status: string, colors: ColorScheme) => {
  const meta = STATUS_META[status?.toUpperCase()] ?? {
    colorKey: 'text3' as const,
    label: status,
    icon: 'ellipse-outline' as const,
  };
  const color = String(colors[meta.colorKey]);
  const dimColor = String(
    colors[`${meta.colorKey}Dim` as keyof ColorScheme] ?? `${color}22`
  );

  return {
    ...meta,
    color,
    dimColor,
  };
};

function RequestCard({ req, colors }: { req: P2PTradeRequest; colors: ColorScheme }) {
  const asset      = useResolvedAsset(req.asset?.symbol ?? '', req.chainId ?? '');
  const isBuy      = req.requestType === 'BUY';
  const typeColor  = isBuy ? colors.green : colors.red;
  const typeDim    = isBuy ? colors.greenDim : colors.redDim;
  const meta       = getStatusMeta(req.status, colors);
  const sellerMail = req.assignedSellerId?.email;
  const dateStr    = new Date(req.createdAt).toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Top row: type + status */}
      <View style={s.topRow}>
        <View style={[s.badge, { backgroundColor: typeDim }]}>
          <Text style={[s.badgeTxt, { color: typeColor }]}>
            {req.requestType} {req.asset?.symbol ?? asset.symbol}
          </Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: meta.dimColor }]}>
          <Ionicons name={meta.icon} size={IconSize.xs} color={meta.color} />
          <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Amount rows */}
      <View style={[s.body, { borderColor: colors.borderSoft }]}>
        <View style={s.row}>
          <Text style={[s.lbl, { color: colors.text2 }]}>Amount</Text>
          <Text style={[s.val, { color: colors.text }]}>
            {req.cryptoAmount} {req.asset?.symbol ?? asset.symbol}
          </Text>
        </View>
        <View style={s.row}>
          <Text style={[s.lbl, { color: colors.text2 }]}>Total</Text>
          <Text style={[s.val, { color: colors.text }]}>
            {req.totalFiatAmount} {req.currency}
          </Text>
        </View>
        <View style={s.row}>
          <Text style={[s.lbl, { color: colors.text2 }]}>Rate</Text>
          <Text style={[s.val, { color: colors.text }]}>
            {req.preferredPrice} {req.currency}
          </Text>
        </View>
        {sellerMail && (
          <View style={s.row}>
            <Text style={[s.lbl, { color: colors.text2 }]}>Seller</Text>
            <Text style={[s.val, { color: colors.text }]} numberOfLines={1}>
              {sellerMail}
            </Text>
          </View>
        )}
      </View>

      {/* Footer: date */}
      <Text style={[s.dateTxt, { color: colors.text3 }]}>{dateStr}</Text>
    </View>
  );
}

export default function RequestedTab({ requests, requestsLoading, onRefresh, colors }: Props) {
  if (requestsLoading && requests.length === 0) {
    return (
      <View style={s.centerFill}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.listContent}
      refreshControl={
        <RefreshControl 
          refreshing={requestsLoading} 
          onRefresh={onRefresh} 
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {requests.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="time-outline" size={IconSize['2xl']} color={colors.text3} />
          <Text style={[s.emptyTxt, { color: colors.text2 }]}>
            No trade requests yet
          </Text>
          <Text style={[s.emptySub, { color: colors.text3 }]}>
            Requests you submit from Market will show up here until they're approved.
          </Text>
        </View>
      ) : (
        requests.map(req => <RequestCard key={req._id} req={req} colors={colors} />)
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  listContent: { 
    padding: Spacing[4], 
    gap: Spacing[3],
  },
  centerFill: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: Spacing[16],
  },
  emptyBox: { 
    alignItems: 'center', 
    gap: Spacing[2], 
    paddingVertical: Spacing[16], 
    paddingHorizontal: Spacing[6],
  },
  emptyTxt: { 
    fontSize: Typography.sm, 
    fontWeight: Typography.bold,
    letterSpacing: Typography.trackingNormal,
  },
  emptySub: { 
    fontSize: Typography.xs, 
    textAlign: 'center', 
    lineHeight: Typography.lineHeightSm,
    letterSpacing: Typography.trackingNormal,
  },

  card: { 
    borderRadius: Radius.xl, 
    borderWidth: 1, 
    padding: Spacing[4], 
    gap: Spacing[3],
  },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  badge: { 
    paddingHorizontal: Spacing[3], 
    paddingVertical: Spacing[2], 
    borderRadius: Radius.full,
  },
  badgeTxt: { 
    fontSize: Typography.sm, 
    fontWeight: Typography.bold,
    letterSpacing: Typography.trackingTight,
  },
  statusPill: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: Spacing[1], 
    paddingHorizontal: Spacing[3], 
    paddingVertical: Spacing[1], 
    borderRadius: Radius.full,
  },
  statusTxt: { 
    fontSize: Typography.xs, 
    fontWeight: Typography.bold,
    letterSpacing: Typography.trackingNormal,
  },

  body: { 
    borderTopWidth: 1, 
    paddingTop: Spacing[2], 
    gap: Spacing[2],
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: Spacing[2],
  },
  lbl: { 
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    letterSpacing: Typography.trackingNormal,
  },
  val: { 
    fontSize: Typography.xs, 
    fontWeight: Typography.semibold, 
    maxWidth: '65%', 
    textAlign: 'right',
    letterSpacing: Typography.trackingTight,
  },

  dateTxt: { 
    fontSize: Typography.xs, 
    textAlign: 'right',
    fontWeight: Typography.medium,
    letterSpacing: Typography.trackingNormal,
  },
});