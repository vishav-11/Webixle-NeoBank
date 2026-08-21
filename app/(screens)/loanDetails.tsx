/**
 * app/loanDetails.tsx
 * Loan Details screen — React Query version
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

// ✅ React Query hooks
import {
  useLoanDetail,
  useLoanTransactions,
  useRepayLoan,
  useAddLoanCollateral,
  useWithdrawLoanCollateral,
} from '@/hooks/queires';

import type { LoanDetail, LoanTransaction } from '@/types/loanType';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n?: number | string | null, dp = 4) =>
  Number(n ?? 0).toFixed(dp);

const fmtUsd = (n?: number | string | null) => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}k`;
  return `$${v.toFixed(2)}`;
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()} ${dt
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    .replace('AM', 'Am')
    .replace('PM', 'Pm')}`;
};

const collSym = (l: LoanDetail) =>
  typeof l.collateralAsset === 'object'
    ? (l.collateralAsset as any).symbol ?? '?'
    : '?';

const borSym = (l: LoanDetail) =>
  typeof l.borrowAsset === 'object'
    ? (l.borrowAsset as any).symbol ?? '?'
    : '?';

// ─── LTV bar colours ──────────────────────────────────────────────────────────
function ltvColor(ltv: number): string {
  if (ltv < 60) return '#00D395';
  if (ltv < 80) return '#F5A623';
  return '#FF4D6A';
}

// ─── Tx icon ──────────────────────────────────────────────────────────────────
const TX_CFG: Record<
  string,
  { icon: string; color: string; bg: string; label: string }
> = {
  BORROW: {
    icon:  'arrow-down',
    color: '#F5A623',
    bg:    '#F5A62322',
    label: 'Borrowed',
  },
  REPAY: {
    icon:  'checkmark',
    color: '#00D395',
    bg:    '#00D39522',
    label: 'Repaid',
  },
  ADD_COLLATERAL: {
    icon:  'add-circle',
    color: '#4A9EFF',
    bg:    '#4A9EFF22',
    label: 'Added',
  },
  WITHDRAW_COLLATERAL: {
    icon:  'remove-circle',
    color: '#FF4D6A',
    bg:    '#FF4D6A22',
    label: 'Withdrawn',
  },
  LIQUIDATION: {
    icon:  'warning',
    color: '#FF4D6A',
    bg:    '#FF4D6A22',
    label: 'Liquidated',
  },
};

// ─── Action Modal ─────────────────────────────────────────────────────────────
function ActionModal({
  visible,
  title,
  placeholder,
  onClose,
  onConfirm,
  colors,
  confirmColor,
  submitting,
}: {
  visible:       boolean;
  title:         string;
  placeholder:   string;
  onClose:       () => void;
  onConfirm:     (amount: string) => void;
  colors:        any;
  confirmColor:  string;
  submitting?:   boolean;
}) {
  const [val, setVal] = useState('');

  const handleConfirm = () => {
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid positive number.');
      return;
    }
    onConfirm(val);
    setVal('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={ms.overlay}>
        <View
          style={[
            ms.sheet,
            {
              backgroundColor: colors.card,
              borderColor:     colors.border,
            },
          ]}
        >
          <Text style={[ms.title, { color: colors.text }]}>{title}</Text>
          <TextInput
            style={[
              ms.input,
              {
                backgroundColor: colors.surface,
                borderColor:     colors.border,
                color:           colors.text,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={val}
            onChangeText={setVal}
            editable={!submitting}
          />
          <View style={ms.btnRow}>
            <TouchableOpacity
              style={[ms.btn, { backgroundColor: colors.surface }]}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={[ms.btnTxt, { color: colors.text2 }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                ms.btn,
                {
                  backgroundColor: submitting
                    ? `${confirmColor}88`
                    : confirmColor,
                },
              ]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[ms.btnTxt, { color: '#fff' }]}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  },
  sheet: {
    width:        '100%',
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[5],
    gap:          16,
  },
  title: { fontSize: Typography.md, fontWeight: '700' },
  input: {
    borderWidth:      1,
    borderRadius:     Radius.lg,
    paddingHorizontal: 16,
    paddingVertical:  12,
    fontSize:         Typography.base,
  },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn:    {
    flex:           1,
    paddingVertical: 14,
    borderRadius:   Radius.lg,
    alignItems:     'center',
  },
  btnTxt: { fontSize: Typography.base, fontWeight: '700' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function LoanDetailsScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { loanId } = useLocalSearchParams<{ loanId: string }>();

  const GREEN  = colors.green;
  const ORANGE = colors.orange;
  const RED    = colors.red;

  // ── Modal states ──────────────────────────────────────────────────────────
  const [modal, setModal] = useState<'repay' | 'add' | 'withdraw' | null>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Loan Detail
  // ══════════════════════════════════════════════════════════════════════════
  const {
    data:        loanData,
    isLoading:   loanLoading,
    isError:     loanError,
    refetch:     refetchLoan,
    isFetching:  loanFetching,
  } = useLoanDetail(loanId ?? '');

  // ✅ Normalize loan
  const loan: LoanDetail | null = loanData
    ? ((loanData as any)?.data ?? loanData)
    : null;

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Loan Transactions
  // ══════════════════════════════════════════════════════════════════════════
  const {
    data:       txData,
    isLoading:  txLoading,
    refetch:    refetchTx,
    isFetching: txFetching,
  } = useLoanTransactions(loanId ?? '');

  // ✅ Normalize transactions
  const txs: LoanTransaction[] = txData
    ? (Array.isArray(txData)
        ? txData
        : Array.isArray((txData as any)?.data)
        ? (txData as any).data
        : Array.isArray((txData as any)?.transactions)
        ? (txData as any).transactions
        : [])
    : [];

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Mutations
  // ══════════════════════════════════════════════════════════════════════════
  const { mutateAsync: repayLoan,        isPending: repaying }    = useRepayLoan();
  const { mutateAsync: addCollateral,    isPending: adding }      = useAddLoanCollateral();
  const { mutateAsync: withdrawCollateral, isPending: withdrawing } = useWithdrawLoanCollateral();

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchLoan(), refetchTx()]);
    setRefreshing(false);
  }, [refetchLoan, refetchTx]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleRepay = useCallback(
    async (amount: string) => {
      if (!loanId) return;
      try {
        await repayLoan({ loanId, payload: { amount } });
        setModal(null);
        Alert.alert('Success', 'Loan repayment successful');
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Repay failed');
      }
    },
    [loanId, repayLoan],
  );

  const handleAdd = useCallback(
    async (amount: string) => {
      if (!loanId) return;
      try {
        await addCollateral({ loanId, payload: { amount } });
        setModal(null);
        Alert.alert('Success', 'Collateral added successfully');
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Add collateral failed');
      }
    },
    [loanId, addCollateral],
  );

  const handleWithdraw = useCallback(
    async (amount: string) => {
      if (!loanId) return;
      try {
        await withdrawCollateral({ loanId, payload: { amount } });
        setModal(null);
        Alert.alert('Success', 'Collateral withdrawn successfully');
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Withdraw failed');
      }
    },
    [loanId, withdrawCollateral],
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loanLoading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View
          style={[
            s.header,
            {
              paddingTop:       insets.top + 10,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Loan Details
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </View>
    );
  }

  // ── Error / Not Found ─────────────────────────────────────────────────────
  if (loanError || !loan) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View
          style={[
            s.header,
            {
              paddingTop:       insets.top + 10,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Loan Details
          </Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.center}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.text3}
          />
          <Text style={[s.errorTxt, { color: colors.text2 }]}>
            {loanError ? 'Failed to load loan' : 'Loan not found'}
          </Text>
          {loanError && (
            <TouchableOpacity
              onPress={() => refetchLoan()}
              style={[
                s.retryBtn,
                {
                  backgroundColor: colors.greenDim,
                  borderColor:     colors.greenBorder,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color={GREEN} />
              <Text style={[s.retryTxt, { color: GREEN }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const cSym        = collSym(loan);
  const bSym        = borSym(loan);
  const ltv         = loan.currentLtv ?? loan.ltv;
  const ltvPct      = Math.min(ltv, 100);
  const ltvClr      = ltvColor(ltv);
  const totalOwed   = Number(loan.borrowedAmount) + Number(loan.totalInterestAccrued);
  const createdDate = new Date(loan.createdAt);
  const createdStr  = `${createdDate.getMonth() + 1}/${createdDate.getDate()}/${createdDate.getFullYear()}`;

  // ✅ Track which mutation is active
  const isBusy = repaying || adding || withdrawing;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:       insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>
          Loan Details
        </Text>

        {/* ✅ Show sync indicator when refetching in background */}
        {(loanFetching || txFetching) && !loanLoading && !txLoading ? (
          <View style={{ width: 38, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={GREEN} />
          </View>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:     40 + insets.bottom,
          paddingHorizontal: Spacing[4],
          paddingTop:        Spacing[4],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {/* ── Hero Card: Pair + LTV bar ── */}
        <View
          style={[
            s.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={s.heroTop}>
            <View>
              <Text style={[s.heroPair, { color: colors.text }]}>
                {cSym} → {bSym}
              </Text>
              <Text style={[s.heroDate, { color: colors.text2 }]}>
                Created {createdStr}
              </Text>
            </View>
            <View style={[s.heroBadge, { borderColor: GREEN }]}>
              <View style={[s.heroDot, { backgroundColor: GREEN }]} />
              <Text style={[s.heroBadgeText, { color: GREEN }]}>
                {loan.status}
              </Text>
            </View>
          </View>

          {/* LTV bar */}
          <View style={s.ltvSection}>
            <View style={s.ltvLabelRow}>
              <Text style={[s.ltvLabel, { color: colors.text2 }]}>
                Current LTV
              </Text>
              <Text style={[s.ltvValue, { color: ltvClr }]}>
                {ltvPct.toFixed(1)}%
              </Text>
            </View>
            <View style={[s.ltvTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  s.ltvFill,
                  {
                    width:           `${Math.max(ltvPct, 3)}%`,
                    backgroundColor: ltvClr,
                  },
                ]}
              />
              {/* Margin marker at 80% */}
              <View
                style={[
                  s.ltvMarker,
                  { left: '80%', backgroundColor: ORANGE },
                ]}
              />
            </View>
            <View style={s.ltvScale}>
              <Text style={[s.ltvScaleTxt, { color: GREEN }]}>Safe</Text>
              <Text style={[s.ltvScaleTxt, { color: ORANGE }]}>
                Margin {loan.marginCallLtv}%
              </Text>
              <Text style={[s.ltvScaleTxt, { color: RED }]}>
                Liq: {loan.liquidationLtv}%
              </Text>
            </View>
          </View>
        </View>

        {/* ── Collateral / Outstanding ── */}
        <View style={[s.twoCol, { borderColor: colors.border }]}>
          <View
            style={[
              s.colBox,
              {
                backgroundColor: colors.card,
                borderColor:     colors.border,
              },
            ]}
          >
            <Text style={[s.colLabel, { color: colors.text3 }]}>
              Collateral
            </Text>
            <Text style={[s.colBig, { color: colors.text }]}>
              {fmt(loan.collateralAmount)} {cSym}
            </Text>
            <Text style={[s.colSub, { color: colors.text2 }]}>
              ~ {fmtUsd(loan.collateralUsd)}
            </Text>
          </View>
          <View
            style={[
              s.colBox,
              {
                backgroundColor: colors.card,
                borderColor:     colors.border,
              },
            ]}
          >
            <Text style={[s.colLabel, { color: colors.text3 }]}>
              Outstanding
            </Text>
            <Text style={[s.colBig, { color: colors.text }]}>
              {fmt(loan.borrowedAmount)} {bSym}
            </Text>
            <Text style={[s.colSub, { color: colors.text2 }]}>
              ~ {fmtUsd(loan.borrowedUsd)}
            </Text>
          </View>
        </View>

        {/* ── Loan Parameters ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Loan Parameters
        </Text>
        <View
          style={[
            s.paramCard,
            {
              backgroundColor: colors.card,
              borderColor:     colors.border,
            },
          ]}
        >
          {[
            {
              label: 'Interest',
              value: `${loan.interestRate}%`,
              color: GREEN,
            },
            {
              label: 'Daily Rate',
              value: `${(loan.interestRate / 365).toFixed(4)}%`,
              color: colors.text,
            },
            {
              label: 'Initial LTV',
              value: `${loan.ltv}%`,
              color: colors.text,
            },
            {
              label: 'Margin Call LTV',
              value: `${loan.marginCallLtv}%`,
              color: ORANGE,
            },
            {
              label: 'Liquidation LTV',
              value: `${loan.liquidationLtv}%`,
              color: RED,
            },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[
                s.paramRow,
                i < arr.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[s.paramLabel, { color: colors.text2 }]}>
                {row.label}
              </Text>
              <Text style={[s.paramVal, { color: row.color }]}>
                {row.value}
              </Text>
            </View>
          ))}

          {/* Divider */}
          <View style={[s.paramDivider, { backgroundColor: colors.border }]} />

          <View style={s.paramRow}>
            <Text style={[s.paramLabel, { color: colors.text2 }]}>
              Accrued Interest
            </Text>
            <Text style={[s.paramVal, { color: colors.text }]}>
              {fmt(loan.totalInterestAccrued, 6)} {bSym}
            </Text>
          </View>
          <View style={s.paramRow}>
            <Text style={[s.paramLabel, { color: colors.text2 }]}>
              Total Owed
            </Text>
            <Text style={[s.paramVal, { color: RED }]}>
              {totalOwed.toFixed(4)} {bSym}
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Actions</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: `${GREEN}22` }]}
            onPress={() => setModal('repay')}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <View style={[s.actionIcon, { backgroundColor: GREEN }]}>
              <Ionicons name="cash-outline" size={22} color="#fff" />
            </View>
            <Text style={[s.actionLabel, { color: colors.text }]}>Repay</Text>
            <Text style={[s.actionSub, { color: colors.text3 }]}>
              Partial or full
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: `${ORANGE}22` }]}
            onPress={() => setModal('add')}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <View style={[s.actionIcon, { backgroundColor: ORANGE }]}>
              <Ionicons name="add" size={22} color="#fff" />
            </View>
            <Text style={[s.actionLabel, { color: colors.text }]}>Add</Text>
            <Text style={[s.actionSub, { color: colors.text3 }]}>
              Collateral
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: `${RED}22` }]}
            onPress={() => setModal('withdraw')}
            disabled={isBusy}
            activeOpacity={0.8}
          >
            <View style={[s.actionIcon, { backgroundColor: RED }]}>
              <Ionicons name="remove" size={22} color="#fff" />
            </View>
            <Text style={[s.actionLabel, { color: colors.text }]}>
              Withdraw
            </Text>
            <Text style={[s.actionSub, { color: colors.text3 }]}>
              Collateral
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Transaction History ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Transaction History
        </Text>

        {/* ✅ Loading state for transactions */}
        {txLoading ? (
          <View style={s.emptyTx}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={[s.emptyTxText, { color: colors.text2 }]}>
              Loading transactions…
            </Text>
          </View>
        ) : txs.length === 0 ? (
          <View style={s.emptyTx}>
            <Ionicons name="time-outline" size={32} color={colors.text3} />
            <Text style={[s.emptyTxText, { color: colors.text2 }]}>
              No transactions yet
            </Text>
          </View>
        ) : (
          txs.map(tx => {
            const cfg = TX_CFG[tx.type] ?? TX_CFG.BORROW;
            return (
              <View
                key={tx._id}
                style={[
                  s.txRow,
                  {
                    backgroundColor: colors.card,
                    borderColor:     colors.border,
                  },
                ]}
              >
                <View style={[s.txIcon, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={18} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.txLabel, { color: colors.text }]}>
                    {cfg.label}
                  </Text>
                  <Text style={[s.txDate, { color: colors.text2 }]}>
                    {fmtDate(tx.createdAt)}
                  </Text>
                  {tx.note ? (
                    <Text style={[s.txNote, { color: colors.text3 }]}>
                      {tx.note}
                    </Text>
                  ) : null}
                </View>
                <Text style={[s.txAmount, { color: cfg.color }]}>
                  {Number(tx.amount).toFixed(4)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <ActionModal
        visible={modal === 'repay'}
        title="Repay Loan"
        placeholder={`Amount in ${bSym}`}
        confirmColor={GREEN}
        colors={colors}
        onClose={() => setModal(null)}
        onConfirm={handleRepay}
        submitting={repaying}
      />
      <ActionModal
        visible={modal === 'add'}
        title="Add Collateral"
        placeholder={`Amount in ${cSym}`}
        confirmColor={ORANGE}
        colors={colors}
        onClose={() => setModal(null)}
        onConfirm={handleAdd}
        submitting={adding}
      />
      <ActionModal
        visible={modal === 'withdraw'}
        title="Withdraw Collateral"
        placeholder={`Amount in ${cSym}`}
        confirmColor={RED}
        colors={colors}
        onClose={() => setModal(null)}
        onConfirm={handleWithdraw}
        submitting={withdrawing}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            16,
  },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing[4],
    paddingBottom:    12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex:       1,
    textAlign:  'center',
    fontSize:   Typography.lg,
    fontWeight: '700',
  },
  iconBtn: {
    width:          38,
    height:         38,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Error
  errorTxt: { fontSize: Typography.base, fontWeight: '500' },
  retryBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      10,
    borderWidth:       1,
    marginTop:         4,
  },
  retryTxt: { fontSize: 13, fontWeight: '600' },

  // Hero Card
  heroCard: {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: Spacing[3],
  },
  heroTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   Spacing[4],
  },
  heroPair: { fontSize: Typography['2xl'], fontWeight: '800' },
  heroDate: { fontSize: Typography.xs, marginTop: 2 },
  heroBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderWidth:       1.5,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.full,
  },
  heroDot:       { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },

  // LTV
  ltvSection:  { gap: 8 },
  ltvLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ltvLabel:    { fontSize: Typography.sm, fontWeight: '500' },
  ltvValue:    { fontSize: Typography.sm, fontWeight: '700' },
  ltvTrack:    {
    height:       8,
    borderRadius: 4,
    overflow:     'visible',
    position:     'relative',
  },
  ltvFill:   { height: '100%', borderRadius: 4 },
  ltvMarker: {
    position:     'absolute',
    top:          -3,
    bottom:       -3,
    width:        3,
    borderRadius: 2,
  },
  ltvScale:    { flexDirection: 'row', justifyContent: 'space-between' },
  ltvScaleTxt: { fontSize: 10, fontWeight: '600' },

  // Two columns
  twoCol: { flexDirection: 'row', gap: 10, marginBottom: Spacing[4] },
  colBox: {
    flex:         1,
    borderRadius: Radius.xl,
    borderWidth:  1,
    padding:      Spacing[4],
  },
  colLabel: { fontSize: Typography.xs, marginBottom: 4 },
  colBig:   { fontSize: Typography.md, fontWeight: '800' },
  colSub:   { fontSize: Typography.xs, marginTop: 2 },

  // Params
  sectionTitle: {
    fontSize:     Typography.lg,
    fontWeight:   '700',
    marginBottom: 12,
    marginTop:    4,
  },
  paramCard: {
    borderRadius: Radius.xl,
    borderWidth:  1,
    overflow:     'hidden',
    marginBottom: Spacing[4],
  },
  paramRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing[4],
    paddingVertical:   14,
  },
  paramLabel:   { fontSize: Typography.sm, fontWeight: '500' },
  paramVal:     { fontSize: Typography.sm, fontWeight: '700' },
  paramDivider: { height: 6 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing[4] },
  actionBtn:  {
    flex:         1,
    borderRadius: Radius.xl,
    padding:      16,
    alignItems:   'center',
    gap:          8,
  },
  actionIcon: {
    width:          52,
    height:         52,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: Typography.base, fontWeight: '700' },
  actionSub:   { fontSize: Typography.xs },

  // Tx rows
  txRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       Spacing[4],
    marginBottom:  10,
  },
  txIcon: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
  },
  txLabel: { fontSize: Typography.base, fontWeight: '700' },
  txDate:  { fontSize: Typography.xs, marginTop: 2 },
  txNote:  { fontSize: Typography.xs, marginTop: 1 },
  txAmount:{ fontSize: Typography.md, fontWeight: '700' },

  emptyTx:     { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxText: { fontSize: Typography.base, fontWeight: '500' },
});