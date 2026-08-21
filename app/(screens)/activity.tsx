/**
 * app/(screens)/activity.tsx
 * Activity page — 100% theme adaptive, zero hardcoded colors
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";

import {
  useTransactionHistory,
  type Transaction as ApiTransaction,
} from "@/hooks/queires";

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType   = "received" | "sent" | "swapped" | "locked" | "released";
type TxStatus = "completed" | "pending" | "failed";

interface UiTransaction {
  id:          string;
  type:        TxType;
  title:       string;
  hash:        string;
  time:        string;
  status:      TxStatus;
  amount:      string;
  amountSign:  "+" | "-" | "";
  amountValue: number;
  symbol:      string;
  symbolBg:    string;   // coin-specific static color — kept intentionally
  symbolColor: string;   // text on symbolBg
  symbolIcon:  string;
  date:        string;
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const FILTERS = ["All", "Sent", "Received", "Locked"] as const;
type Filter = typeof FILTERS[number];

// ─── Asset icon config (coin colors — static by design) ──────────────────────
const ASSET_CFG: Record<string, { symbolBg: string; symbolColor: string; symbolIcon: string }> = {
  ETH:     { symbolBg: "#627EEA", symbolColor: "#fff", symbolIcon: "diamond-outline"  },
  BTC:     { symbolBg: "#F7931A", symbolColor: "#fff", symbolIcon: "logo-bitcoin"     },
  SOL:     { symbolBg: "#9945FF", symbolColor: "#fff", symbolIcon: "flash-outline"    },
  BNB:     { symbolBg: "#F3BA2F", symbolColor: "#000", symbolIcon: "cube-outline"     },
  USDT:    { symbolBg: "#26A17B", symbolColor: "#fff", symbolIcon: "cash-outline"     },
  USDC:    { symbolBg: "#2775CA", symbolColor: "#fff", symbolIcon: "cash-outline"     },
  TRX:     { symbolBg: "#FF5570", symbolColor: "#fff", symbolIcon: "flash-outline"    },
  DEFAULT: { symbolBg: "#7B4DFF", symbolColor: "#fff", symbolIcon: "wallet-outline"   },
};

const getAssetCfg = (symbol: string) =>
  ASSET_CFG[symbol?.toUpperCase()] ?? ASSET_CFG.DEFAULT;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const mapApiTypeToUiType = (apiType: string): TxType => {
  const t = apiType?.toUpperCase();
  if (["DEPOSIT", "ESCROW_REFUND", "CREDIT", "ESCROW_UNLOCK"].includes(t)) return "received";
  if (["WITHDRAW", "INTERNAL_SEND", "WITHDRAW_COMPLETE"].includes(t))       return "sent";
  if (["ESCROW_LOCK", "ESCROW_RELEASE"].includes(t))                         return "locked";
  if (t === "SWAP")                                                           return "swapped";
  return "sent";
};

const mapApiStatusToUiStatus = (apiStatus?: string): TxStatus => {
  const s = apiStatus?.toUpperCase();
  if (s === "COMPLETED") return "completed";
  if (s === "PENDING")   return "pending";
  if (s === "FAILED")    return "failed";
  return "completed";
};

const getAssetSymbol = (asset: any): string => {
  if (!asset)               return "USD";
  if (typeof asset === "string") return asset;
  return asset.symbol ?? asset.name ?? "USD";
};

const getAmountSign = (type: string): "+" | "-" | "" => {
  const t = type?.toUpperCase();
  if (["DEPOSIT", "ESCROW_REFUND", "CREDIT", "ESCROW_UNLOCK"].includes(t)) return "+";
  if (["WITHDRAW", "INTERNAL_SEND", "WITHDRAW_COMPLETE", "ESCROW_LOCK"].includes(t)) return "-";
  return "";
};

const getTxTitle = (type: string, apiTx: ApiTransaction): string => {
  const t      = type?.toUpperCase();
  const symbol = getAssetSymbol(apiTx.asset);
  switch (t) {
    case "DEPOSIT":           return apiTx.refType === "P2P" ? `P2P Buy ${symbol}` : `Received ${symbol}`;
    case "WITHDRAW":
    case "WITHDRAW_COMPLETE": return `Sent ${symbol}`;
    case "INTERNAL_SEND":     return `Sent ${symbol}`;
    case "ESCROW_LOCK":       return `Locked ${symbol}`;
    case "ESCROW_REFUND":     return `Refunded ${symbol}`;
    case "ESCROW_RELEASE":    return `Released ${symbol}`;
    case "ESCROW_UNLOCK":     return `Unlocked ${symbol}`;
    case "CREDIT":            return `Credited ${symbol}`;
    case "SWAP":              return `Swapped ${symbol}`;
    default:                  return `${t} ${symbol}`;
  }
};

const formatAmount = (amount: string | number, symbol: string, sign: string): string => {
  const n = parseFloat(String(amount));
  if (isNaN(n)) return `${sign}0 ${symbol}`;
  return `${sign}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })} ${symbol}`;
};

const formatDate = (isoDate: string): string => {
  const date     = new Date(isoDate);
  const now      = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

const formatTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const transformApiTx = (apiTx: ApiTransaction): UiTransaction => {
  const symbol    = getAssetSymbol(apiTx.asset);
  const cfg       = getAssetCfg(symbol);
  const uiType    = mapApiTypeToUiType(apiTx.type);
  const status    = mapApiStatusToUiStatus(apiTx.status);
  const amountSign = getAmountSign(apiTx.type);

  return {
    id:          apiTx._id,
    type:        uiType,
    title:       getTxTitle(apiTx.type, apiTx),
    hash:        apiTx.txHash?.slice(0, 9) ?? apiTx._id.slice(0, 9),
    time:        formatTime(apiTx.createdAt),
    status,
    amount:      formatAmount(apiTx.amount, symbol, amountSign),
    amountSign,
    amountValue: parseFloat(String(apiTx.amount)) || 0,
    symbol,
    symbolBg:    cfg.symbolBg,
    symbolColor: cfg.symbolColor,
    symbolIcon:  cfg.symbolIcon,
    date:        formatDate(apiTx.createdAt),
  };
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
const StatusBadge = React.memo(function StatusBadge({
  status,
  colors,
}: {
  status: TxStatus;
  colors: any;
}) {
  // All status colors from theme — no hardcode
  const cfg = {
    completed: { bg: colors.greenDim,   color: colors.green,   label: "Completed" },
    pending:   { bg: colors.orangeDim,  color: colors.orange,  label: "Pending"   },
    failed:    { bg: colors.redDim,     color: colors.red,     label: "Failed"    },
  }[status];

  return (
    <View style={[sb.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[sb.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
});

const sb = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing[3],
    paddingVertical:   3,
    borderRadius:      Radius.full,
    alignSelf:         "flex-start",
    marginTop:         5,
  },
  txt: { fontSize: Typography.xs, fontWeight: "700" },
});

// ─── TxRow ────────────────────────────────────────────────────────────────────
const TxRow = React.memo(function TxRow({
  tx,
  colors,
  isLast,
}: {
  tx: UiTransaction;
  colors: any;
  isLast: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Amount color from theme
  const amtColor =
    tx.amountSign === "+" ? colors.green :
    tx.amountSign === "-" ? colors.red   :
    colors.orange;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          tr.row,
          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
        ]}
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1.0, useNativeDriver: true }).start()
        }
      >
        {/* Coin icon — static bg by design */}
        <View style={[tr.iconWrap, { backgroundColor: tx.symbolBg }]}>
          <Ionicons name={tx.symbolIcon as any} size={20} color={tx.symbolColor} />
        </View>

        {/* Info */}
        <View style={tr.info}>
          <Text style={[tr.title, { color: colors.text }]}>{tx.title}</Text>
          <Text style={[tr.meta, { color: colors.text2 }]}>
            {tx.hash}{"  "}{tx.time}
          </Text>
          <StatusBadge status={tx.status} colors={colors} />
        </View>

        {/* Amount */}
        <Text style={[tr.amt, { color: amtColor }]}>{tx.amount}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const tr = StyleSheet.create({
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            Spacing[3],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[4],
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  info:  { flex: 1, minWidth: 0 },
  title: { fontSize: Typography.base, fontWeight: "700" },
  meta:  { fontSize: Typography.xs, marginTop: 3 },
  amt:   { fontSize: Typography.sm, fontWeight: "800", flexShrink: 0 },
});

// ─── SummaryCard ──────────────────────────────────────────────────────────────
const SummaryCard = React.memo(function SummaryCard({
  txs,
  colors,
}: {
  txs: UiTransaction[];
  colors: any;
}) {
  const stats = useMemo(() => ({
    received: txs.filter(t => t.amountSign === "+").length,
    sent:     txs.filter(t => t.amountSign === "-").length,
    total:    txs.length,
  }), [txs]);

  return (
    <View style={[
      sm.card,
      {
        backgroundColor: colors.primaryDim,
        borderColor:     colors.border,
      },
    ]}>
      {/* Received */}
      <View style={sm.col}>
        <View style={[sm.iconBox, { backgroundColor: colors.greenDim }]}>
          <Ionicons name="arrow-down-circle-outline" size={16} color={colors.green} />
        </View>
        <Text style={[sm.label, { color: colors.text2 }]}>Received</Text>
        <Text style={[sm.val, { color: colors.green }]}>{stats.received}</Text>
      </View>

      <View style={[sm.divider, { backgroundColor: colors.border }]} />

      {/* Sent */}
      <View style={sm.col}>
        <View style={[sm.iconBox, { backgroundColor: colors.redDim }]}>
          <Ionicons name="arrow-up-circle-outline" size={16} color={colors.red} />
        </View>
        <Text style={[sm.label, { color: colors.text2 }]}>Sent</Text>
        <Text style={[sm.val, { color: colors.red }]}>{stats.sent}</Text>
      </View>

      <View style={[sm.divider, { backgroundColor: colors.border }]} />

      {/* Total */}
      <View style={sm.col}>
        <View style={[sm.iconBox, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="list-outline" size={16} color={colors.primary} />
        </View>
        <Text style={[sm.label, { color: colors.text2 }]}>Total</Text>
        <Text style={[sm.val, { color: colors.text }]}>{stats.total}</Text>
      </View>
    </View>
  );
});

const sm = StyleSheet.create({
  card: {
    flexDirection:  "row",
    alignItems:     "center",
    borderRadius:   Radius["2xl"],
    borderWidth:    1,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[2],
    marginBottom:   Spacing[5],
  },
  col:     { flex: 1, alignItems: "center", gap: Spacing[1] },
  iconBox: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label:   { fontSize: Typography.xs, fontWeight: "600" },
  val:     { fontSize: Typography.lg, fontWeight: "800" },
  divider: { width: 1, height: 40 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = React.memo(function SkeletonRow({ colors }: { colors: any }) {
  return (
    <View style={[skl.row, { borderBottomColor: colors.borderSoft }]}>
      <View style={[skl.icon,    { backgroundColor: colors.border }]} />
      <View style={skl.info}>
        <View style={[skl.line, { width: 130, backgroundColor: colors.border }]} />
        <View style={[skl.line, { width: 90,  backgroundColor: colors.border, marginTop: 6 }]} />
        <View style={[skl.line, { width: 60,  backgroundColor: colors.border, marginTop: 6 }]} />
      </View>
      <View style={[skl.line, { width: 70, backgroundColor: colors.border }]} />
    </View>
  );
});

const skl = StyleSheet.create({
  row:   {
    flexDirection: "row", alignItems: "center", gap: Spacing[3],
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[4],
    borderBottomWidth: 1,
  },
  icon:  { width: 46, height: 46, borderRadius: 23, opacity: 0.4 },
  info:  { flex: 1 },
  line:  { height: 12, borderRadius: 6, opacity: 0.5 },
});

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = React.memo(function EmptyState({
  search,
  colors,
}: {
  search: string;
  colors: any;
}) {
  return (
    <View style={es.wrap}>
      <View style={[es.iconBox, { backgroundColor: colors.primaryDim, borderColor: colors.border }]}>
        <Ionicons name="receipt-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[es.title, { color: colors.text }]}>No Transactions</Text>
      <Text style={[es.sub,   { color: colors.text2 }]}>
        {search
          ? `No results for "${search}"`
          : "Your transaction history will appear here"}
      </Text>
    </View>
  );
});

const es = StyleSheet.create({
  wrap:    { alignItems: "center", paddingTop: Spacing[10], gap: Spacing[4] },
  iconBox: {
    width: 80, height: 80, borderRadius: Radius["2xl"],
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  title: { fontSize: Typography.lg, fontWeight: "800" },
  sub:   {
    fontSize: Typography.sm, textAlign: "center",
    paddingHorizontal: Spacing[8], lineHeight: Typography.lineHeightBase,
  },
});

// ─── Filter Chip ──────────────────────────────────────────────────────────────
const FilterChip = React.memo(function FilterChip({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        fc.chip,
        {
          backgroundColor: active ? colors.primary       : "transparent",
          borderColor:     active ? colors.primary       : colors.border,
        },
      ]}
    >
      <Text style={[fc.txt, { color: active ? "#fff" : colors.text2 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const fc = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing[5],
    paddingVertical:   Spacing[2] + 1,
    borderRadius:      Radius.full,
    borderWidth:       1.5,
  },
  txt: { fontSize: Typography.sm, fontWeight: "700" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ActivityScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<Filter>("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const [page,          setPage]          = useState(1);
  const [allTxs,        setAllTxs]        = useState<ApiTransaction[]>([]);

  const { data, isLoading, isFetching, refetch } =
    useTransactionHistory(page, 50);

  // Accumulate
  React.useEffect(() => {
    if (data?.items && data.items.length > 0) {
      setAllTxs(prev => {
        if (page === 1) return data.items;
        const ids     = new Set(prev.map((t: any) => t._id));
        const newOnes = data.items.filter((t: any) => !ids.has(t._id));
        return [...prev, ...newOnes];
      });
    }
  }, [data, page]);

  // Transform
  const allTransactions = useMemo(() =>
    allTxs.map(transformApiTx),
  [allTxs]);

  // Filter + Search
  const filtered = useMemo(() => {
    let list = [...allTransactions];
    if (filter !== "All") {
      const f = filter.toLowerCase() as TxType;
      list    = list.filter(t => t.type === f);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list    = list.filter(t =>
        t.title.toLowerCase().includes(q)  ||
        t.hash.toLowerCase().includes(q)   ||
        t.symbol.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allTransactions, filter, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, UiTransaction[]> = {};
    filtered.forEach(tx => {
      if (!map[tx.date]) map[tx.date] = [];
      map[tx.date].push(tx);
    });
    return Object.entries(map);
  }, [filtered]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setAllTxs([]);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (isFetching || !data) return;
    if (page >= data.totalPages) return;
    setPage(p => p + 1);
  }, [isFetching, data, page]);

  const hasMore = data ? page < data.totalPages : false;

  // ── RENDER ──────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, {
        paddingTop:      insets.top + Spacing[3],
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.canGoBack() ? router.back() : router.push("/")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>Activity</Text>

        {/* Right placeholder for symmetry */}
        <View style={s.iconBtn} />
      </View>

      {/* ── Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching && page === 1}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {/* ── Search Bar ── */}
        <View style={[s.searchBar, {
          backgroundColor: colors.card,
          borderColor:     searchFocused ? colors.primary : colors.border,
        }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? colors.primary : colors.text2}
          />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search Transactions"
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.text2} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map(f => (
            <FilterChip
              key={f}
              label={f}
              active={filter === f}
              colors={colors}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>

        {/* ── Summary Card ── */}
        {!isLoading && filtered.length > 0 && (
          <SummaryCard txs={filtered} colors={colors} />
        )}

        {/* ── Loading ── */}
        {isLoading ? (
          <View style={[s.groupCard, {
            backgroundColor: colors.card,
            borderColor:     colors.border,
          }]}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} colors={colors} />
            ))}
          </View>

        ) : grouped.length === 0 ? (
          /* ── Empty ── */
          <EmptyState search={search} colors={colors} />

        ) : (
          /* ── Grouped List ── */
          <>
            {grouped.map(([date, txs]) => (
              <View key={date} style={s.group}>
                {/* Date label */}
                <View style={s.dateLabelRow}>
                  <View style={[s.dateDot, { backgroundColor: colors.primary }]} />
                  <Text style={[s.dateLabel, { color: colors.text2 }]}>{date}</Text>
                  <View style={[s.dateLine, { backgroundColor: colors.borderSoft }]} />
                </View>

                <View style={[s.groupCard, {
                  backgroundColor: colors.card,
                  borderColor:     colors.border,
                }]}>
                  {txs.map((tx, idx) => (
                    <TxRow
                      key={tx.id}
                      tx={tx}
                      colors={colors}
                      isLast={idx === txs.length - 1}
                    />
                  ))}
                </View>
              </View>
            ))}

            {/* Load More */}
            {hasMore && (
              <TouchableOpacity
                style={[s.loadMoreBtn, {
                  backgroundColor: colors.card,
                  borderColor:     colors.primary,
                }]}
                onPress={loadMore}
                disabled={isFetching}
                activeOpacity={0.8}
              >
                {isFetching && page > 1 ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="chevron-down-circle-outline" size={18} color={colors.primary} />
                    <Text style={[s.loadMoreText, { color: colors.primary }]}>
                      Load More ({(data?.total ?? 0) - allTxs.length} remaining)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Pagination info */}
            {data && (
              <View style={s.paginationInfo}>
                <View style={[s.paginationPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="layers-outline" size={12} color={colors.text3} />
                  <Text style={[s.paginationText, { color: colors.text3 }]}>
                    {allTxs.length} of {data.total} transactions
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection:    "row",
    alignItems:       "center",
    paddingHorizontal: Spacing[4],
    paddingBottom:    Spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex:       1,
    textAlign:  "center",
    fontSize:   Typography.lg,
    fontWeight: "700",
  },
  iconBtn: {
    width:           38,
    height:          38,
    borderRadius:    Radius.lg,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop:        Spacing[4],
  },

  // Search
  searchBar: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              Spacing[2],
    borderRadius:     Radius.full,
    borderWidth:      1.5,
    paddingHorizontal: Spacing[4],
    height:           50,
    marginBottom:     Spacing[4],
  },
  searchInput: {
    flex:     1,
    fontSize: Typography.base,
    padding:  0,
  },

  // Filter
  filterRow: {
    gap:          Spacing[2],
    paddingBottom: Spacing[1],
    paddingRight:  Spacing[1],
    marginBottom:  Spacing[5],
  },

  // Date group
  group: { marginBottom: Spacing[5] },
  dateLabelRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing[2],
    marginBottom:  Spacing[3],
  },
  dateDot:  { width: 7, height: 7, borderRadius: 4 },
  dateLabel:{ fontSize: Typography.sm, fontWeight: "700" },
  dateLine: { flex: 1, height: 1 },

  groupCard: {
    borderRadius: Radius["2xl"],
    borderWidth:  1,
    overflow:     "hidden",
  },

  // Load more
  loadMoreBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius:   Radius.xl,
    borderWidth:    1,
    marginTop:      Spacing[4],
  },
  loadMoreText: {
    fontSize:   Typography.sm,
    fontWeight: "700",
  },

  // Pagination
  paginationInfo: {
    alignItems:    "center",
    paddingVertical: Spacing[4],
  },
  paginationPill: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              Spacing[1],
    paddingVertical:  Spacing[1] + 2,
    paddingHorizontal: Spacing[3],
    borderRadius:     Radius.full,
    borderWidth:      1,
  },
  paginationText: {
    fontSize:   Typography.xs,
    fontWeight: "600",
  },
});