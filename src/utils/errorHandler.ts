// utils/errorHandler.ts
import { Alert, Platform } from 'react-native';
import { AxiosError } from 'axios';

// ─── Error Types ─────────────────────────────────────────────────
export type AppErrorCode =
  | 'EMAIL_NOT_VERIFIED'
  | 'UNAUTHORIZED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export interface ParsedError {
  code:       AppErrorCode;
  message:    string;
  statusCode: number | null;
  raw:        any;
}

// ─── Message Map ─────────────────────────────────────────────────
const HTTP_MESSAGES: Record<number, string> = {
  400: 'Bad request. Please check your input.',
  401: 'Session expired. Please login again.',
  403: 'You are not authorized to perform this action.',
  404: 'Requested resource not found.',
  409: 'Conflict. This action could not be completed.',
  422: 'Validation failed. Please check your input.',
  429: 'Too many requests. Please wait and try again.',
  500: 'Internal server error. Please try again later.',
  502: 'Server is temporarily unavailable.',
  503: 'Service unavailable. Please try again later.',
};

// ─── Core Parser ─────────────────────────────────────────────────
export function parseError(err: any): ParsedError {
  // ── 1. Network / No Response ──────────────────────────────────
  if (!err?.response) {
    if (
      err?.code === 'ECONNABORTED' ||
      err?.message?.toLowerCase().includes('timeout')
    ) {
      return {
        code:       'TIMEOUT',
        message:    'Request timed out. Check your internet connection.',
        statusCode: null,
        raw:        err,
      };
    }
    if (
      err?.message?.toLowerCase().includes('network') ||
      err?.code === 'ERR_NETWORK'
    ) {
      return {
        code:       'NETWORK_ERROR',
        message:    'No internet connection. Please check your network.',
        statusCode: null,
        raw:        err,
      };
    }
  }

  const status     = err?.response?.status     as number | undefined;
  const data       = err?.response?.data;
  const apiMessage = typeof data?.message === 'string' ? data.message : null;

  // ── 2. Email Not Verified ─────────────────────────────────────
  if (
    apiMessage?.toLowerCase().includes('email not verified') ||
    data?.code === 'EMAIL_NOT_VERIFIED'
  ) {
    return {
      code:       'EMAIL_NOT_VERIFIED',
      message:    apiMessage || 'Your email is not verified.',
      statusCode: status ?? null,
      raw:        err,
    };
  }

  // ── 3. Unauthorized ───────────────────────────────────────────
  if (status === 401) {
    return {
      code:       'UNAUTHORIZED',
      message:    apiMessage || HTTP_MESSAGES[401],
      statusCode: 401,
      raw:        err,
    };
  }

  // ── 4. Known HTTP Status ──────────────────────────────────────
  if (status && HTTP_MESSAGES[status]) {
    return {
      code:       status >= 500 ? 'SERVER_ERROR' : 'VALIDATION',
      message:    apiMessage || HTTP_MESSAGES[status],
      statusCode: status,
      raw:        err,
    };
  }

  // ── 5. API returned success=false (non-throw) ─────────────────
  if (typeof err?.message === 'string') {
    return {
      code:       'UNKNOWN',
      message:    err.message,
      statusCode: status ?? null,
      raw:        err,
    };
  }

  // ── 6. Fallback ───────────────────────────────────────────────
  return {
    code:       'UNKNOWN',
    message:    'Something went wrong. Please try again.',
    statusCode: status ?? null,
    raw:        err,
  };
}

// ─── Parse from non-throw API response ───────────────────────────
// For cases where API returns { success: false, message: '...' }
// without throwing
export function parseApiResponse(res: any): ParsedError | null {
  const isOk =
    res?.status === 'success' || res?.success === true;

  if (isOk) return null; // No error

  const message = res?.message || 'Something went wrong.';

  if (message.toLowerCase().includes('email not verified')) {
    return {
      code:       'EMAIL_NOT_VERIFIED',
      message,
      statusCode: null,
      raw:        res,
    };
  }

  return {
    code:       'UNKNOWN',
    message,
    statusCode: null,
    raw:        res,
  };
}