import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Platform, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, BOTTOM_TAB_H } from '@/styles/theme';

// ✅ Import React Query hook and types
import { 
  useTransactionHistory, 
  type Transaction 
} from '@/hooks/queires';

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_WEB     = Platform.OS === 'web';
const PAGE_LIMIT = 20;

const WALLET_TYPE_OPTIONS = [
  { label: 'All Types',     value: 'all'          },
  { label: 'Deposit',       value: 'DEPOSIT'       },
  { label: 'Withdraw',      value: 'WITHDRAW'      },
  { label: 'Send',          value: 'INTERNAL_SEND' },
  { label: 'Swap',          value: 'SWAP'          },
  { label: 'Card',          value: 'CARD'          },
  { label: 'Earn',          value: 'EARN'          },
  { label: 'Escrow Lock',   value: 'ESCROW_LOCK'   },
  { label: 'Escrow Refund', value: 'ESCROW_REFUND' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all'       },
  { label: 'Pending',    value: 'PENDING'   },
  { label: 'Completed',  value: 'COMPLETED' },
  { label: 'Failed',     value: 'FAILED'    },
  { label: 'Cancelled',  value: 'CANCELLED' },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TxAsset {
  _id:    string;
  name:   string;
  symbol: string;
}

// ─── Asset helpers ─────────────────────────────────────────────────────────────
const getAssetSymbol = (asset: TxAsset | string): string => {
  if (!asset) return '';
  if (typeof asset === 'string') return asset;
  return asset.symbol ?? '';
};

const getAssetName = (asset: TxAsset | string): string => {
  if (!asset) return '';
  if (typeof asset === 'string') return asset;
  return asset.name ?? asset.symbol ?? '';
};

// ─── Format helpers ───────────────────────────────────────────────────────────
const formatAmt = (val?: string | number, decimals = 8) => {
  const n = parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
};

const formatUsd = (val?: string | number) => {
  const n = parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '$0.00';
  return n.toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const formatDateGroup = (iso: string) => {
  if (!iso) return 'Unknown';
  const d      = new Date(iso);
  const now    = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDay === 0) return 'Today';
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7)   return `${diffDay} days ago`;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  icon: string; color: string; bgColor: string; label: string; sign: string;
}> = {
  DEPOSIT:       { icon: 'arrow-down-circle',  color: '#00C07A', bgColor: '#00C07A18', label: 'Deposit',       sign: '+' },
  WITHDRAW:      { icon: 'arrow-up-circle',    color: '#FF4D6A', bgColor: '#FF4D6A18', label: 'Withdraw',      sign: '-' },
  INTERNAL_SEND: { icon: 'paper-plane',        color: '#4A9EFF', bgColor: '#4A9EFF18', label: 'Send',          sign: '-' },
  SEND:          { icon: 'paper-plane',        color: '#4A9EFF', bgColor: '#4A9EFF18', label: 'Send',          sign: '-' },
  SWAP:          { icon: 'swap-horizontal',    color: '#A78BFA', bgColor: '#A78BFA18', label: 'Swap',          sign: '~' },
  CARD:          { icon: 'card',               color: '#F5A623', bgColor: '#F5A62318', label: 'Card',          sign: '-' },
  EARN:          { icon: 'trending-up',        color: '#00C07A', bgColor: '#00C07A18', label: 'Earn',          sign: '+' },
  ESCROW_LOCK:   { icon: 'lock-closed',        color: '#F5A623', bgColor: '#F5A62318', label: 'Escrow Lock',   sign: '-' },
  ESCROW_REFUND: { icon: 'lock-open',          color: '#00C07A', bgColor: '#00C07A18', label: 'Escrow Refund', sign: '+' },
  P2P:           { icon: 'people',             color: '#A78BFA', bgColor: '#A78BFA18', label: 'P2P',           sign: '+' },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type?.toUpperCase()] ?? {
    icon: 'ellipse-outline', color: '#888', bgColor: '#88888818',
    label: type ?? 'Unknown', sign: '',
  };

// ─── Status colors ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: '#00C07A18', text: '#00C07A' },
  PENDING:   { bg: '#F5A62318', text: '#F5A623' },
  FAILED:    { bg: '#FF4D6A18', text: '#FF4D6A' },
  CANCELLED: { bg: '#88888818', text: '#888888' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Sub-components ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = React.memo(function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cfg   = STATUS_COLORS[status?.toUpperCase()] ?? { bg: '#88888818', text: '#888' };
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <View style={[sbSt.wrap, { backgroundColor: cfg.bg }]}>
      <View style={[sbSt.dot, { backgroundColor: cfg.text }]} />
      <Text style={[sbSt.text, { color: cfg.text }]}>{label}</Text>
    </View>
  );
});

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = React.memo(function SkeletonRow({ colors }: { colors: any }) {
  return (
    <View style={[skSt.row, { borderBottomColor: colors.borderSoft }]}>
      <View style={[skSt.icon, { backgroundColor: colors.border }]} />
      <View style={{ flex: 1, gap: 7 }}>
        <View style={[skSt.line, { width: 90,  backgroundColor: colors.border }]} />
        <View style={[skSt.line, { width: 130, backgroundColor: colors.border, opacity: 0.5 }]} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 7 }}>
        <View style={[skSt.line, { width: 70, backgroundColor: colors.border }]} />
        <View style={[skSt.line, { width: 50, backgroundColor: colors.border, opacity: 0.5 }]} />
      </View>
    </View>
  );
});

// ─── Transaction Row ──────────────────────────────────────────────────────────
const TransactionRow = React.memo(function TransactionRow({
  tx, colors, isLast, onPress,
}: {
  tx: Transaction; colors: any; isLast: boolean; onPress: () => void;
}) {
  const cfg    = getTypeConfig(tx.type);
  const symbol = getAssetSymbol(tx.asset);
  const name   = getAssetName(tx.asset);

  const subLabel = tx.note
    ? (tx.note.length > 32 ? tx.note.slice(0, 32) + '…' : tx.note)
    : tx.refType
      ? `via ${tx.refType}`
      : name || '';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        txSt.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
      ]}
    >
      <View style={[txSt.iconWrap, { backgroundColor: cfg.bgColor }]}>
        <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
      </View>

      <View style={txSt.mid}>
        <Text style={[txSt.type, { color: colors.text }]}>{cfg.label}</Text>
        <Text style={[txSt.meta, { color: colors.text2 }]} numberOfLines={1}>
          {subLabel}
        </Text>
        <Text style={[txSt.time, { color: colors.text3 }]}>
          {formatDate(tx.createdAt)}{'  '}{formatTime(tx.createdAt)}
        </Text>
      </View>

      <View style={txSt.right}>
        <Text style={[txSt.amount, { color: cfg.color }]}>
          {cfg.sign}{formatAmt(tx.amount)} {symbol}
        </Text>
        {tx.usdValue ? (
          <Text style={[txSt.usd, { color: colors.text2 }]}>
            {formatUsd(tx.usdValue)}
          </Text>
        ) : null}
        {tx.status ? (
          <StatusBadge status={tx.status} />
        ) : tx.refType ? (
          <View style={[txSt.refBadge, { backgroundColor: colors.surface }]}>
            <Text style={[txSt.refText, { color: colors.text2 }]}>{tx.refType}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

// ─── Filter Pills ─────────────────────────────────────────────────────────────
const FilterPills = React.memo(function FilterPills({
  options, value, onChange, colors,
}: {
  options:  { label: string; value: string }[];
  value:    string;
  onChange: (v: string) => void;
  colors:   any;
}) {
  const GREEN  = colors.green;
  const TABEBG = colors.greenDim;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={fpSt.wrap}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
            style={[
              fpSt.pill,
              {
                backgroundColor: active ? TABEBG      : colors.surface,
                borderColor:     active ? GREEN        : colors.border,
              },
            ]}
          >
            <Text style={[fpSt.text, { color: active ? GREEN : colors.text2 }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

// ─── Summary Cards ────────────────────────────────────────────────────────────
const SummaryCards = React.memo(function SummaryCards({
  transactions, colors,
}: {
  transactions: Transaction[]; colors: any;
}) {
  const GREEN = colors.green;

  const stats = useMemo(() => {
    const inTypes  = ['DEPOSIT', 'ESCROW_REFUND', 'EARN'];
    const outTypes = ['WITHDRAW', 'INTERNAL_SEND', 'SEND', 'ESCROW_LOCK'];
    const totalIn  = transactions
      .filter(t => inTypes.includes(t.type?.toUpperCase()))
      .reduce((s, t) => s + parseFloat(String(t.amount ?? 0)), 0);
    const totalOut = transactions
      .filter(t => outTypes.includes(t.type?.toUpperCase()))
      .reduce((s, t) => s + parseFloat(String(t.amount ?? 0)), 0);
    return { totalIn, totalOut, count: transactions.length };
  }, [transactions]);

  const items = useMemo(() => [
    { label: 'Total In',     value: formatAmt(stats.totalIn),  color: GREEN,       icon: 'arrow-down-circle' },
    { label: 'Total Out',    value: formatAmt(stats.totalOut), color: '#FF4D6A',   icon: 'arrow-up-circle'   },
    { label: 'Transactions', value: String(stats.count),       color: colors.blue, icon: 'list'              },
  ], [stats, GREEN, colors.blue]);

  return (
    <View style={scSt.row}>
      {items.map(({ label, value, color, icon }) => (
        <View
          key={label}
          style={[scSt.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[scSt.iconWrap, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon as any} size={16} color={color} />
          </View>
          <Text style={[scSt.value, { color: colors.text }]}>{value}</Text>
          <Text style={[scSt.label, { color: colors.text2 }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
});

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const TransactionDetailModal = React.memo(function TransactionDetailModal({
  tx, visible, onClose, colors,
}: {
  tx: Transaction | null; visible: boolean; onClose: () => void; colors: any;
}) {
  if (!tx) return null;

  const cfg    = getTypeConfig(tx.type);
  const symbol = getAssetSymbol(tx.asset);
  const name   = getAssetName(tx.asset);

  const rows: { label: string; value: string }[] = [
    { label: 'Transaction ID', value: tx._id                                                               },
    { label: 'Type',           value: cfg.label                                                            },
    { label: 'Asset',          value: `${name} (${symbol})`                                               },
    { label: 'Amount',         value: `${cfg.sign}${formatAmt(tx.amount)} ${symbol}`                      },
    { label: 'USD Value',      value: tx.usdValue    ? formatUsd(tx.usdValue)                    : '—'    },
    { label: 'Fee',            value: tx.fee         ? `${formatAmt(tx.fee)} ${symbol}`          : '—'    },
    { label: 'Balance Before', value: tx.balanceBefore ? `${formatAmt(tx.balanceBefore)} ${symbol}` : '—' },
    { label: 'Balance After',  value: tx.balanceAfter  ? `${formatAmt(tx.balanceAfter)} ${symbol}`  : '—' },
    { label: 'Ref Type',       value: tx.refType     ?? '—'                                               },
    { label: 'Ref ID',         value: tx.refId       ?? '—'                                               },
    { label: 'To Address',     value: tx.toAddress   ?? '—'                                               },
    { label: 'From Address',   value: tx.fromAddress ?? '—'                                               },
    { label: 'Tx Hash',        value: tx.txHash      ?? '—'                                               },
    { label: 'Note',           value: tx.note        ?? '—'                                               },
    { label: 'Status',         value: tx.status      ?? '—'                                               },
    { label: 'Date',           value: `${formatDate(tx.createdAt)} ${formatTime(tx.createdAt)}`            },
  ].filter(r => r.value && r.value !== '—');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={dmSt.overlay}>
        <View style={[
          dmSt.sheet,
          { backgroundColor: colors.card, borderColor: colors.border },
          IS_WEB && dmSt.sheetWeb,
        ]}>
          {!IS_WEB && (
            <View style={[dmSt.handle, { backgroundColor: colors.border }]} />
          )}

          {/* Header */}
          <View style={[dmSt.header, { borderBottomColor: colors.border }]}>
            <View style={[dmSt.headerIcon, { backgroundColor: cfg.bgColor }]}>
              <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[dmSt.headerTitle, { color: colors.text }]}>
                {cfg.label}
              </Text>
              <Text style={[dmSt.headerSub, { color: colors.text2 }]}>
                Transaction Details
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[dmSt.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {/* Amount hero */}
          <View style={[dmSt.amountWrap, { backgroundColor: cfg.bgColor }]}>
            <Text style={[dmSt.amountLabel, { color: cfg.color }]}>
              {cfg.sign}{formatAmt(tx.amount)} {symbol}
            </Text>
            {tx.usdValue ? (
              <Text style={[dmSt.amountUsd, { color: colors.text2 }]}>
                ≈ {formatUsd(tx.usdValue)}
              </Text>
            ) : null}
            {tx.status && <StatusBadge status={tx.status} />}
          </View>

          {/* Detail rows */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[dmSt.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {rows.map((r, i) => (
                <View
                  key={r.label}
                  style={[
                    dmSt.detailRow,
                    i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
                  ]}
                >
                  <Text style={[dmSt.detailLabel, { color: colors.text2 }]}>{r.label}</Text>
                  <Text
                    style={[dmSt.detailValue, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {r.value}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Screen ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function HistoryScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const GREEN      = colors.green;

  // ── State ──────────────────────────────────────────────────────────────────
  const [page,          setPage]         = useState(1);
  const [allTxs,        setAllTxs]       = useState<Transaction[]>([]);
  const [typeFilter,    setTypeFilter]   = useState('all');
  const [statusFilter,  setStatusFilter] = useState('all');
  const [search,        setSearch]       = useState('');
  const [searchFocused, setSearchFocused]= useState(false);
  const [selectedTx,    setSelectedTx]   = useState<Transaction | null>(null);
  const [showDetail,    setShowDetail]   = useState(false);

  // ✅ Use React Query hook
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTransactionHistory(page, PAGE_LIMIT);

  const transactions = data?.items ?? [];
  const meta = data ? {
    total:      data.total,
    page:       data.page,
    limit:      data.limit,
    totalPages: data.totalPages,
  } : null;

  // ✅ Accumulate transactions for "Load More" pattern
  React.useEffect(() => {
    if (transactions.length > 0) {
      setAllTxs(prev => {
        // If page is 1, replace all
        if (page === 1) return transactions;
        
        // Otherwise, append new items (avoid duplicates)
        const existingIds = new Set(prev.map((t: any) => t._id));
        const newItems = transactions.filter((t: any) => !existingIds.has(t._id));
        return [...prev, ...newItems];
      });
    }
  }, [transactions, page]);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setPage(1);
    setAllTxs([]);
    refetch();
  }, [refetch]);

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!meta || isFetching) return;
    if (page >= meta.totalPages) return;
    setPage(prev => prev + 1);
  }, [meta, page, isFetching]);

  // ── Open / close detail ────────────────────────────────────────────────────
  const openDetail = useCallback((tx: Transaction) => {
    setSelectedTx(tx);
    setShowDetail(true);
  }, []);

  const closeDetail = useCallback(() => {
    setShowDetail(false);
  }, []);

  // ── Reset filters ──────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setSearch('');
  }, []);

  const clearSearch = useCallback(() => setSearch(''), []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allTxs;

    if (typeFilter !== 'all')
      list = list.filter(t => t.type?.toUpperCase() === typeFilter);

    if (statusFilter !== 'all')
      list = list.filter(t => t.status?.toUpperCase() === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => {
        const asset = t.asset;
        const symbol = typeof asset === 'string' ? asset : asset?.symbol ?? '';
        const name = typeof asset === 'string' ? asset : asset?.name ?? '';
        
        return (
          t.type?.toLowerCase().includes(q)       ||
          t.status?.toLowerCase().includes(q)     ||
          symbol.toLowerCase().includes(q)        ||
          name.toLowerCase().includes(q)          ||
          t.txHash?.toLowerCase().includes(q)     ||
          t.toAddress?.toLowerCase().includes(q)  ||
          t.fromAddress?.toLowerCase().includes(q)||
          t.note?.toLowerCase().includes(q)       ||
          t.refType?.toLowerCase().includes(q)    ||
          String(t.amount).includes(q)
        );
      });
    }
    return list;
  }, [allTxs, typeFilter, statusFilter, search]);

  // ── Group by date ──────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { title: string; data: Transaction[] }[] = [];
    const seen   = new Map<string, Transaction[]>();
    
    for (const tx of filtered) {
      const key = formatDateGroup(tx.createdAt);
      if (!seen.has(key)) {
        const arr: Transaction[] = [];
        seen.set(key, arr);
        groups.push({ title: key, data: arr });
      }
      seen.get(key)!.push(tx);
    }
    return groups;
  }, [filtered]);

  const hasMore = meta ? page < meta.totalPages : false;
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || !!search;
  const loading = isLoading && page === 1;
  const refreshing = isFetching && page === 1;
  const loadingMore = isFetching && page > 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── Render helpers ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const renderSearchBar = () => (
    <View style={[
      srSt.wrap,
      {
        backgroundColor: searchFocused ? colors.greenDim : colors.surface,
        borderColor:     searchFocused ? GREEN           : colors.border,
      },
    ]}>
      <Ionicons name="search" size={16} color={searchFocused ? GREEN : colors.text3} />
      <TextInput
        style={[
          srSt.input,
          { color: colors.text },
          IS_WEB && { outlineWidth: 0 } as any,
        ]}
        placeholder="Search type, asset, note…"
        placeholderTextColor={colors.text3}
        value={search}
        onChangeText={setSearch}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        underlineColorAndroid="transparent"
      />
      {!!search && (
        <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color={colors.text3} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTransactionList = () => (
    <View style={[lsSt.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {loading ? (
        // Skeleton
        Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} colors={colors} />
        ))
      ) : filtered.length === 0 ? (
        // Empty state
        <View style={lsSt.empty}>
          <View style={[lsSt.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text-outline" size={36} color={colors.text3} />
          </View>
          <Text style={[lsSt.emptyTitle, { color: colors.text }]}>
            No transactions found
          </Text>
          <Text style={[lsSt.emptyText, { color: colors.text2 }]}>
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Your transaction history will appear here'}
          </Text>
        </View>
      ) : (
        // Grouped rows
        grouped.map(group => (
          <View key={group.title}>
            <View style={[lsSt.groupHeader, { backgroundColor: colors.surface }]}>
              <Text style={[lsSt.groupTitle, { color: colors.text2 }]}>
                {group.title}
              </Text>
              <View style={[lsSt.groupBadge, { backgroundColor: colors.border }]}>
                <Text style={[lsSt.groupCount, { color: colors.text2 }]}>
                  {group.data.length}
                </Text>
              </View>
            </View>

            {group.data.map((tx, i) => (
              <TransactionRow
                key={tx._id}
                tx={tx}
                colors={colors}
                isLast={i === group.data.length - 1}
                onPress={() => openDetail(tx)}
              />
            ))}
          </View>
        ))
      )}

      {/* Load more */}
      {!loading && hasMore && (
        <TouchableOpacity
          onPress={loadMore}
          disabled={loadingMore}
          style={[lsSt.loadMore, { borderTopColor: colors.borderSoft }]}
          activeOpacity={0.8}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={GREEN} />
          ) : (
            <View style={lsSt.loadMoreInner}>
              <Ionicons name="chevron-down" size={16} color={GREEN} />
              <Text style={[lsSt.loadMoreText, { color: GREEN }]}>Load More</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWebPanel = () => (
    <View style={[wpSt.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[wpSt.header, { borderBottomColor: colors.border }]}>
        <View style={[wpSt.headerIcon, { backgroundColor: colors.greenDim }]}>
          <Ionicons name="stats-chart" size={16} color={GREEN} />
        </View>
        <Text style={[wpSt.headerTitle, { color: colors.text }]}>Summary</Text>
      </View>

      {/* Type breakdown */}
      <View style={wpSt.body}>
        <Text style={[wpSt.sectionLabel, { color: colors.text2 }]}>By Type</Text>
        {WALLET_TYPE_OPTIONS.filter(o => o.value !== 'all').map(opt => {
          const count = allTxs.filter(
            t => t.type?.toUpperCase() === opt.value
          ).length;
          if (count === 0) return null;
          const cfg = getTypeConfig(opt.value);
          const isActive = typeFilter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setTypeFilter(isActive ? 'all' : opt.value)}
              activeOpacity={0.75}
              style={[
                wpSt.typeRow,
                isActive && { backgroundColor: colors.greenDim, borderRadius: 10 },
              ]}
            >
              <View style={[wpSt.typeIcon, { backgroundColor: cfg.bgColor }]}>
                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
              </View>
              <Text style={[wpSt.typeLabel, { color: colors.text }]}>{opt.label}</Text>
              <View style={[wpSt.badge, { backgroundColor: cfg.bgColor }]}>
                <Text style={[wpSt.badgeText, { color: cfg.color }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[wpSt.divider, { backgroundColor: colors.border }]} />

      {/* Reset */}
      {hasActiveFilters && (
        <TouchableOpacity
          onPress={resetFilters}
          style={[wpSt.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={14} color={colors.text2} />
          <Text style={[wpSt.resetText, { color: colors.text2 }]}>Reset Filters</Text>
        </TouchableOpacity>
      )}

      {/* Pagination info */}
      {meta && (
        <View style={[wpSt.body, { paddingTop: 8 }]}>
          <Text style={[wpSt.sectionLabel, { color: colors.text2 }]}>Pagination</Text>
          {[
            { label: 'Total',    value: String(meta.total)                  },
            { label: 'Page',     value: `${meta.page} / ${meta.totalPages}` },
            { label: 'Per Page', value: String(meta.limit)                  },
            { label: 'Loaded',   value: String(allTxs.length)               },
          ].map(r => (
            <View key={r.label} style={wpSt.infoRow}>
              <Text style={[wpSt.infoLabel, { color: colors.text2 }]}>{r.label}</Text>
              <Text style={[wpSt.infoValue, { color: colors.text }]}>{r.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderBody = () => (
    <>
      <View style={{ paddingVertical: Spacing[3] }}>
        {renderSearchBar()}
      </View>

      {!loading && allTxs.length > 0 && (
        <>
          <SummaryCards transactions={filtered} colors={colors} />
          <View style={{ height: 12 }} />
        </>
      )}

      <FilterPills
        options={WALLET_TYPE_OPTIONS}
        value={typeFilter}
        onChange={setTypeFilter}
        colors={colors}
      />
      <View style={{ height: 8 }} />
      <FilterPills
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={setStatusFilter}
        colors={colors}
      />
      <View style={{ height: 14 }} />

      <View style={{ paddingHorizontal: Spacing[4] }}>
        {renderTransactionList()}
      </View>
    </>
  );

  // ─── WEB ────────────────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={[webSt.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
          <View style={webSt.headerInner}>
            <View style={webSt.headerLeft}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={[webSt.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <View>
                <Text style={[webSt.headerTitle, { color: colors.text }]}>
                  Transaction History
                </Text>
                <Text style={[webSt.headerSub, { color: colors.text2 }]}>
                  {meta ? `${meta.total} total transactions` : 'Loading…'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              style={[webSt.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {refreshing
                ? <ActivityIndicator size="small" color={GREEN} />
                : <Ionicons name="refresh-outline" size={18} color={colors.text} />}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={webSt.bodyScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
          }
        >
          <View style={webSt.body}>
            <View style={webSt.leftCol}>{renderBody()}</View>
            {renderWebPanel()}
          </View>
        </ScrollView>

        <TransactionDetailModal
          tx={selectedTx}
          visible={showDetail}
          onClose={closeDetail}
          colors={colors}
        />
      </View>
    );
  }

  // ─── MOBILE ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[
        styles.mobileHeader,
        {
          paddingTop:       insets.top + 8,
          backgroundColor:  colors.bg,
          borderBottomColor:colors.border,
        },
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.mobileIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.mobileTitle, { color: colors.text }]}>History</Text>
          {meta && (
            <Text style={[styles.mobileSub, { color: colors.text2 }]}>
              {meta.total} transactions
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.mobileIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={GREEN} />
            : <Ionicons name="refresh-outline" size={18} color={colors.text} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_TAB_H + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />
        }
      >
        {renderBody()}
      </ScrollView>

      <TransactionDetailModal
        tx={selectedTx}
        visible={showDetail}
        onClose={closeDetail}
        colors={colors}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Styles (all moved outside components) ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const sbSt = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  dot:  { width: 5, height: 5, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '700' },
});

const skSt = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 22, opacity: 0.4 },
  line: { height: 12, borderRadius: 6, opacity: 0.6 },
});

const txSt = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mid:      { flex: 1, gap: 3 },
  type:     { fontSize: 14, fontWeight: '700' },
  meta:     { fontSize: 11 },
  time:     { fontSize: 10 },
  right:    { alignItems: 'flex-end', gap: 4 },
  amount:   { fontSize: 13, fontWeight: '700' },
  usd:      { fontSize: 11 },
  refBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  refText:  { fontSize: 10, fontWeight: '600' },
});

const fpSt = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing[4], gap: 8, paddingVertical: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' },
});

const scSt = StyleSheet.create({
  row:     { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing[4] },
  card:    { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, gap: 6, alignItems: 'center' },
  iconWrap:{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value:   { fontSize: 14, fontWeight: '800' },
  label:   { fontSize: 10, fontWeight: '500', textAlign: 'center' },
});

const dmSt = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', borderWidth: 1, borderBottomWidth: 0 },
  sheetWeb:  { alignSelf: 'center' as any, maxWidth: 520, borderRadius: 24, borderBottomWidth: 1, marginBottom: 40, maxHeight: '85%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: 1 },
  headerIcon:{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  closeBtn:  { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  amountWrap:{ alignItems: 'center', padding: 24, gap: 6 },
  amountLabel:{ fontSize: 28, fontWeight: '800' },
  amountUsd: { fontSize: 14 },
  card:      { margin: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  detailLabel:{ fontSize: 12, fontWeight: '500', flex: 1 },
  detailValue:{ fontSize: 12, fontWeight: '700', flex: 2, textAlign: 'right' },
});

const srSt = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, marginHorizontal: Spacing[4] },
  input: { flex: 1, fontSize: 13, padding: 0, margin: 0 },
});

const lsSt = StyleSheet.create({
  card:        { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  groupTitle:  { fontSize: 12, fontWeight: '700', flex: 1 },
  groupBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  groupCount:  { fontSize: 10, fontWeight: '700' },
  empty:       { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyIcon:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '700' },
  emptyText:   { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadMore:    { padding: 16, alignItems: 'center', borderTopWidth: 1 },
  loadMoreInner:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadMoreText:{ fontSize: 13, fontWeight: '700' },
});

const wpSt = StyleSheet.create({
  wrap:       { width: 256, borderRadius: 20, borderWidth: 1, overflow: 'hidden', alignSelf: 'flex-start' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1 },
  headerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 14, fontWeight: '700' },
  body:       { padding: 16, gap: 4 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', marginBottom: 4 },
  typeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  typeIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typeLabel:  { flex: 1, fontSize: 12, fontWeight: '600' },
  badge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  divider:    { height: 1 },
  resetBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, margin: 16, padding: 10, borderRadius: 12, borderWidth: 1 },
  resetText:  { fontSize: 12, fontWeight: '600' },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel:  { fontSize: 11 },
  infoValue:  { fontSize: 11, fontWeight: '700' },
});

const webSt = StyleSheet.create({
  header:      { borderBottomWidth: 1, paddingVertical: 16, paddingHorizontal: 32 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1100, width: '100%', alignSelf: 'center' },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub:   { fontSize: 13, marginTop: 2 },
  iconBtn:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  bodyScroll:  { flexGrow: 1, paddingHorizontal: 32, paddingVertical: 32, alignItems: 'center' },
  body:        { flexDirection: 'row', gap: 24, width: '100%', maxWidth: 1100, alignItems: 'flex-start' },
  leftCol:     { flex: 1, minWidth: 320 },
});

const styles = StyleSheet.create({
  root:          { flex: 1 },
  mobileHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[5], paddingBottom: Spacing[4], borderBottomWidth: 1 },
  mobileIconBtn: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  mobileTitle:   { fontSize: 20, fontWeight: '800' },
  mobileSub:     { fontSize: 12, marginTop: 1 },
});