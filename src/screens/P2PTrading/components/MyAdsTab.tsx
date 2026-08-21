import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography, Radius, IconSize } from '@/styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SkeletonBox from './SkeletonBox';
import { useResolvedAsset } from '@/cache/assetCache';
import { fmtDate } from '../constants';
import type { P2PAd, P2PAdListResponse } from '@/types/p2pTypes';

// ── Per-ad card ───────────────────────────────────────────────────────────────
function MyAdCard({
  ad, onDelete, colors,
}: {
  ad: P2PAd; onDelete?: () => void; colors: any;
}) {
  const asset = useResolvedAsset(ad.asset, ad.chainId);
  const isBuy = ad.type === 'BUY';
  // BUY = accent (blue), SELL = red
  const accentColor = isBuy ? colors.accent : colors.red;

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.cardHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
          <Text style={[s.adType, { color: accentColor }]}>{ad.type}</Text>
          <Text style={[s.adAsset, { color: colors.text }]}>{asset.symbol}</Text>
          <Text style={[s.adChain, { color: colors.text3 }]}>{ad.chainId}</Text>
        </View>
        <View style={[
          s.statusBadge,
          {
            backgroundColor:
              ad.status === 'ACTIVE' ? colors.greenDim : colors.surface,
          },
        ]}>
          <Text style={[
            s.statusTxt,
            { color: ad.status === 'ACTIVE' ? colors.greenBright : colors.text3 },
          ]}>
            {ad.status}
          </Text>
        </View>
      </View>

      {/* Info table */}
      <View style={[s.infoTable, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
        {[
          { label: 'Price',     val: `${ad.price} ${ad.currency}` },
          { label: 'Available', val: `${ad.availableAmount} ${asset.symbol}` },
          { label: 'Total',     val: `${ad.totalAmount} ${asset.symbol}` },
          { label: 'Limit',     val: `${ad.minLimit ?? 0}–${ad.maxLimit ?? 0} ${ad.currency}` },
        ].map((r, i, arr) => (
          <View
            key={r.label}
            style={[
              s.tableRow,
              i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
            ]}
          >
            <Text style={[s.tableLabel, { color: colors.text2 }]}>{r.label}</Text>
            <Text style={[s.tableVal,   { color: colors.text }]}>{r.val}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={[s.dateText, { color: colors.text3 }]}>{fmtDate(ad.createdAt)}</Text>
        {onDelete && (
          <TouchableOpacity
            style={[s.deleteBtn, {
              backgroundColor: colors.redDim,
              borderColor:     colors.redBorder,
            }]}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Text style={[s.deleteTxt, { color: colors.red }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────
interface MyAdsTabProps {
  myAdsResult:  P2PAdListResponse;
  myAdsLoading: boolean;
  onRefresh:    () => void;
  onCreateAd:   () => void;
  onDeleteAd?:  (ad: P2PAd) => void;
  colors:       any;
}

export default function MyAdsTab({
  myAdsResult, myAdsLoading, onRefresh, onCreateAd, onDeleteAd, colors,
}: MyAdsTabProps) {
  const insets = useSafeAreaInsets();

  const ads = myAdsResult?.ads ?? [];

  const totalFromApi = myAdsResult?.totalData ?? (myAdsResult as any)?.total ?? ads.length;
  const active       = ads.filter(a => a.status === 'ACTIVE').length;
  const sell         = ads.filter(a => a.type  === 'SELL').length;
  const buy          = ads.filter(a => a.type  === 'BUY').length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={myAdsLoading}
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
          { label: 'Total',  val: totalFromApi, color: colors.text        },
          { label: 'Active', val: active,       color: colors.greenBright },
          { label: 'Sell',   val: sell,         color: colors.red         },
          { label: 'Buy',    val: buy,          color: colors.accent      },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={s.statItem}>
              <Text style={[s.statVal,   { color: stat.color    }]}>{stat.val}</Text>
              <Text style={[s.statLabel, { color: colors.text2 }]}>{stat.label}</Text>
            </View>
            {i < arr.length - 1 && (
              <View style={[s.statSep, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Cards */}
      {myAdsLoading
        ? [1, 2, 3].map(i => <SkeletonBox key={i} h={180} r={Radius.xl} />)
        : ads.length === 0
          ? (
            <View style={[s.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="megaphone-outline" size={48} color={colors.text3} />
              <Text style={[s.emptyTxt, { color: colors.text2 }]}>No ads yet</Text>
              <TouchableOpacity
                style={[s.createBtn, { backgroundColor: colors.primary }]}
                onPress={onCreateAd}
                activeOpacity={0.85}
              >
                <Text style={s.createBtnTxt}>Create First Ad</Text>
              </TouchableOpacity>
            </View>
          )
          : ads.map(ad => (
            <MyAdCard
              key={ad._id}
              ad={ad}
              onDelete={onDeleteAd ? () => onDeleteAd(ad) : undefined}
              colors={colors}
            />
          ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  statsCard:   { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] + 2, flexDirection: 'row', alignItems: 'center' },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: Typography.xl, fontWeight: '800' },
  statLabel:   { fontSize: Typography.xs, marginTop: 4 },
  statSep:     { width: 1, height: 32 },

  card:        { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[3] },
  cardHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adType:      { fontSize: Typography.base, fontWeight: '800' },
  adAsset:     { fontSize: Typography.base, fontWeight: '700' },
  adChain:     { fontSize: Typography.xs },
  statusBadge: { paddingHorizontal: Spacing[2] + 2, paddingVertical: 4, borderRadius: Radius.full },
  statusTxt:   { fontSize: Typography.xs, fontWeight: '700' },

  infoTable:   { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  tableRow:    { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing[3] },
  tableLabel:  { fontSize: Typography.sm },
  tableVal:    { fontSize: Typography.sm, fontWeight: '600' },

  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText:    { fontSize: Typography.xs },
  deleteBtn:   { paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[1] + 2, borderRadius: Radius.full, borderWidth: 1 },
  deleteTxt:   { fontSize: Typography.xs, fontWeight: '700' },

  empty:       { alignItems: 'center', padding: Spacing[12], borderRadius: Radius.xl, borderWidth: 1, gap: Spacing[3] },
  emptyTxt:    { fontSize: Typography.md, fontWeight: '600' },
  createBtn:   { paddingHorizontal: Spacing[6], paddingVertical: Spacing[3], borderRadius: Radius.full },
  createBtnTxt:{ fontSize: Typography.base, fontWeight: '700', color: '#fff' },
});