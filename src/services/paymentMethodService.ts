import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'email' | 'tel' | 'select';

export interface PaymentFieldDefinition {
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  placeholder?: string;
  isRequired: boolean;
  options?: string[];
  order: number;
}

export interface PaymentMethod {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  fields: PaymentFieldDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPaymentAccount {
  _id: string;
  userId: string;
  paymentMethodId: string | PaymentMethod;
  label: string;
  fieldValues: Record<string, string>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddPaymentAccountPayload {
  paymentMethodId: string;
  label: string;
  fieldValues: Record<string, string>;
  isDefault?: boolean;
}

export interface ActiveMethodsParams {
  page?: number;
  limit?: number;
}

export interface ActiveMethodsResponse {
  methods: PaymentMethod[];
  total: number;
  totalPages: number;
  page: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const paymentMethodService = {
  /** GET /payment-method/user/list — active payment methods (paginated) */
  getActiveMethods: (params: ActiveMethodsParams = {}) =>
    api.get(ENDPOINTS.PAYMENT_METHOD.USER.LIST, { isActive: true, ...params }),

  /** GET /payment-method/user/:id — single payment method detail */
  getMethodDetail: (id: string) =>
    api.get(ENDPOINTS.PAYMENT_METHOD.USER.DETAIL(id)),

  /** GET /payment-method/user/accounts — user's saved payment accounts */
  getAccounts: () =>
    api.get(ENDPOINTS.PAYMENT_METHOD.USER.ACCOUNTS),

  /** POST /payment-method/user/accounts — add new payment account */
  addAccount: (payload: AddPaymentAccountPayload) =>
    api.post(ENDPOINTS.PAYMENT_METHOD.USER.ADD_ACCOUNT, payload),

  /** DELETE /payment-method/user/accounts/:id — delete payment account */
  deleteAccount: (id: string) =>
    api.delete(ENDPOINTS.PAYMENT_METHOD.USER.DELETE_ACCOUNT(id)),

  /** PATCH /payment-method/user/accounts/:id/default — set default account */
  setDefaultAccount: (id: string) =>
    api.patch(ENDPOINTS.PAYMENT_METHOD.USER.SET_DEFAULT(id), {}),
};