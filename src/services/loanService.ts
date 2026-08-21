/**
 * loanService.ts
 * All Loan API calls with safe response unwrapping — mirrors p2pService pattern.
 */

import { api } from '@/services/apiClient';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  LoanPair,
  LoanPreview,
  LoanPreviewPayload,
  LoanData,
  LoanDetail,
  LoanTransaction,
  LoanStats,
  CreateLoanPayload,
  RepayLoanPayload,
  AddCollateralPayload,
  WithdrawCollateralPayload,
} from '@/types/loanType';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unwrap<T>(res: any): T {
  const d = res?.data !== undefined ? res.data : res;
  return (d?.data !== undefined ? d.data : d) as T;
}

function toArray<T>(res: any): T[] {
  const d = res?.data !== undefined ? res.data : res;
  const inner = d?.data !== undefined ? d.data : d;
  return Array.isArray(inner) ? inner : [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

const loanService = {
  // ── Market / Pairs ──────────────────────────────────────────────────────────
  /** Get all available loan pairs (collateral + borrow combinations) */
  getPairs: async (): Promise<LoanPair[]> =>
    toArray<LoanPair>(await api.get(ENDPOINTS.LOAN.PAIRS)),

  /** Get a loan preview before creating */
  getPreview: async (payload: LoanPreviewPayload): Promise<LoanPreview> =>
    unwrap<LoanPreview>(await api.post(ENDPOINTS.LOAN.PREVIEW, payload)),

  // ── User Loans ──────────────────────────────────────────────────────────────
  /** Get user's active loans */
  getMyLoans: async (): Promise<LoanData[]> =>
    toArray<LoanData>(await api.get(ENDPOINTS.LOAN.MY_LOANS)),

  /** Get user's completed / past loans */
  getCompleted: async (): Promise<LoanData[]> =>
    toArray<LoanData>(await api.get(ENDPOINTS.LOAN.COMPLETED)),

  /** Get detailed info for a single loan (includes currentLtv) */
  getDetail: async (loanId: string): Promise<LoanDetail> =>
    unwrap<LoanDetail>(await api.get(ENDPOINTS.LOAN.DETAIL(loanId))),

  /** Get transaction history for a single loan */
  getTransactions: async (loanId: string): Promise<LoanTransaction[]> =>
    toArray<LoanTransaction>(await api.get(ENDPOINTS.LOAN.TRANSACTIONS(loanId))),

  /** Get portfolio stats for the current user */
  getStats: async (): Promise<LoanStats> =>
    unwrap<LoanStats>(await api.get(ENDPOINTS.LOAN.STATS)),

  // ── Loan Actions ────────────────────────────────────────────────────────────
  /** Create a new loan */
  create: async (payload: CreateLoanPayload): Promise<LoanData> =>
    unwrap<LoanData>(await api.post(ENDPOINTS.LOAN.CREATE, payload)),

  /** Repay loan (partial or full) */
  repay: async (loanId: string, payload: RepayLoanPayload): Promise<LoanData> =>
    unwrap<LoanData>(await api.post(ENDPOINTS.LOAN.REPAY(loanId), payload)),

  /** Add more collateral to an existing loan */
  addCollateral: async (loanId: string, payload: AddCollateralPayload): Promise<LoanData> =>
    unwrap<LoanData>(await api.post(ENDPOINTS.LOAN.ADD_COLLATERAL(loanId), payload)),

  /** Withdraw excess collateral from a loan */
  withdrawCollateral: async (loanId: string, payload: WithdrawCollateralPayload): Promise<LoanData> =>
    unwrap<LoanData>(await api.post(ENDPOINTS.LOAN.WITHDRAW_COLLATERAL(loanId), payload)),

  /** Close a fully repaid loan */
  close: async (loanId: string): Promise<LoanData> =>
    unwrap<LoanData>(await api.post(ENDPOINTS.LOAN.CLOSE(loanId), {})),
};

export default loanService;