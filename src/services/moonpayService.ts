// services/moonpayService.ts
import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

// ─── Request Types ─────────────────────────────────────────────────────────────
export interface BuyQuoteParams {
  currencyCode:      string;
  baseCurrencyCode?: string;
  amount:            number;
}

export interface SellQuoteParams {
  currencyCode:      string;
  baseCurrencyCode?: string;
  amount:            number;
}

export interface BuyTransactionParams {
  currencyCode:       string;
  chainId:            string;
  assetId:            string;
  baseCurrencyCode?:  string;
  baseCurrencyAmount: number;
  returnUrl?:         string;
}

export interface SellTransactionParams {
  currencyCode:       string;
  chainId:            string;
  assetId:            string;
  baseCurrencyCode?:  string;
  baseCurrencyAmount: number;
  returnUrl?:         string;
}

// ─── Response Types ────────────────────────────────────────────────────────────
export interface BuyQuoteResponse {
  success: boolean;
  data: {
    baseCurrencyCode:    string;
    baseCurrencyAmount:  number;
    currencyCode:        string;
    quoteCurrencyAmount: number;
    feeAmount:           number;
    networkFeeAmount:    number;
    totalAmount:         number;
    extraFeeAmount?:     number;
  };
}

export interface SellQuoteResponse {
  success: boolean;
  data: {
    baseCurrencyCode:    string;
    baseCurrencyAmount:  number;
    quoteCurrencyCode:   string;
    quoteCurrencyAmount: number;
    feeAmount:           number;
    networkFeeAmount:    number;
  };
}

// ✅ Updated - transactionId aur status bhi include hai
export interface TransactionUrlResponse {
  success: boolean;
  data: {
    url:           string;
    status:        string;
    transactionId: string;
    meta?: {
      userEmail:     string;
      walletAddress: string;
      chain:         string;
      asset:         string;
    };
  };
}

// ── Full MoonPay Currency type ────────────────────────────────────────────────
export interface MoonPayCurrency {
  id:                   string;
  type:                 'crypto' | 'fiat';
  name:                 string;
  code:                 string;
  precision:            number;
  decimals?:            number;
  icon?:                string;
  minBuyAmount?:        number | null;
  maxBuyAmount?:        number | null;
  minSellAmount?:       number | null;
  maxSellAmount?:       number | null;
  isSellSupported?:     boolean;
  isSuspended?:         boolean;
  isStableCoin?:        boolean;
  supportsLiveMode?:    boolean;
  notAllowedCountries?: string[];
  metadata?: {
    contractAddress: string | null;
    chainId:         string | null;
    networkCode:     string;
    coinType:        string | null;
  };
}

// ── MoonPay Country type ──────────────────────────────────────────────────────
export interface MoonPayCountry {
  alpha2:              string;
  alpha3:              string;
  name:                string;
  isAllowed:           boolean;
  isBuyAllowed:        boolean;
  isSellAllowed:       boolean;
  supportedDocuments?: string[];
  currencies?:         string[];
}

// ── MoonPay Fiat Currency ─────────────────────────────────────────────────────
export interface MoonPayFiatCurrency extends MoonPayCurrency {
  type:            'fiat';
  isBuySupported:  boolean;
  isSellSupported: boolean;
  symbol?:         string;
  flagEmoji?:      string;
}

// ── MoonPay Stage (transaction progress) ─────────────────────────────────────
export interface MoonPayStage {
  stage:         string;
  status:        string;
  failureReason: string | null;
  actions:       any[];
  metaData?:     any[];
}

// ── MoonPay Data (nested inside transaction) ──────────────────────────────────
export interface MoonPayData {
  id?:                  string;
  isFromQuote?:         boolean;
  status?:              string;
  createdAt?:           string;
  updatedAt?:           string;
  baseCurrencyAmount?:  number;
  quoteCurrencyAmount?: number;
  feeAmount?:           number;
  extraFeeAmount?:      number;
  networkFeeAmount?:    number;
  areFeesIncluded?:     boolean;
  flow?:                string;
  walletAddress?:       string;
  walletAddressTag?:    string | null;
  cryptoTransactionId?: string | null;
  failureReason?:       string | null;
  redirectUrl?:         string | null;
  returnUrl?:           string | null;
  widgetRedirectUrl?:   string | null;
  paymentMethod?:       string;
  cardType?:            string;
  cardPaymentType?:     string;
  country?:             string;
  state?:               string;
  eurRate?:             number;
  usdRate?:             number;
  gbpRate?:             number;
  stages?:              MoonPayStage[];
  baseCurrency?: {
    id?:              string;
    type?:            string;
    name:             string;
    code:             string;
    precision?:       number;
    icon?:            string;
    maxAmount?:       number;
    minAmount?:       number;
    minBuyAmount?:    number;
    maxBuyAmount?:    number;
    isSellSupported?: boolean;
  };
  currency?: {
    id?:              string;
    type?:            string;
    name:             string;
    code:             string;
    precision?:       number;
    icon?:            string;
    minBuyAmount?:    number;
    maxBuyAmount?:    number;
    isSellSupported?: boolean;
    minSellAmount?:   number;
    maxSellAmount?:   number;
    supportsLiveMode?: boolean;
    isSuspended?:     boolean;
    metadata?: {
      contractAddress?: string;
      coinType?:        string;
      chainId?:         string;
      networkCode:      string;
    };
  };
}

// ✅ Full normalized transaction type - API se aane wale data ke saath match
export interface MoonPayTransactionListItem {
  // ── Core IDs ──
  id:                   string;   // moonpayTransactionId (API lookup ke liye)
  _id:                  string;   // MongoDB _id
  moonpayTransactionId: string;   // actual MoonPay tx ID

  // ── Status & Type ──
  status:      string;
  type:        'buy' | 'sell';

  // ── Amounts ──
  baseCurrencyCode:    string;
  baseCurrencyAmount:  number;
  currencyCode:        string;
  quoteCurrencyAmount: number;
  cryptoAmount:        string;

  // ── User Info ──
  walletAddress: string;
  email:         string;
  firstName:     string;
  lastName:      string;

  // ── Timestamps ──
  createdAt:    string;
  updatedAt:    string;
  completedAt?: string;

  // ── Extra ──
  txHash?:        string;
  failureReason?: string;

  // ✅ Rich nested MoonPay data (from your API response)
  moonpayData?: MoonPayData;
}

// ─── Helper: Normalize raw API response → MoonPayTransactionListItem ──────────
export function normalizeMoonPayTransaction(item: any): MoonPayTransactionListItem {
  const md: MoonPayData | null = item.moonpayData ?? null;

  return {
    // IDs
    id:                   item.moonpayTransactionId ?? item._id ?? '',
    _id:                  item._id ?? '',
    moonpayTransactionId: item.moonpayTransactionId ?? '',

    // Status
    status: item.status ?? md?.status?.toUpperCase() ?? 'PENDING',
    type:   item.type ?? 'buy',

    // Amounts - API strings ko number mein convert karo
    baseCurrencyCode:    (item.baseCurrencyCode ?? md?.baseCurrency?.code ?? 'USD').toUpperCase(),
    baseCurrencyAmount:  parseFloat(item.baseCurrencyAmount ?? md?.baseCurrencyAmount ?? '0'),
    currencyCode:        (item.currencyCode ?? md?.currency?.code ?? '').toUpperCase(),
    quoteCurrencyAmount: parseFloat(item.cryptoAmount ?? md?.quoteCurrencyAmount ?? '0'),
    cryptoAmount:        item.cryptoAmount ?? '0',

    // User
    walletAddress: item.walletAddress ?? md?.walletAddress ?? '',
    email:         item.email         ?? '',
    firstName:     item.firstName     ?? '',
    lastName:      item.lastName      ?? '',

    // Timestamps
    createdAt:   item.createdAt  ?? '',
    updatedAt:   item.updatedAt  ?? '',
    completedAt: item.completedAt,

    // Extra
    txHash:        md?.cryptoTransactionId  ?? undefined,
    failureReason: md?.failureReason        ?? undefined,

    // Full moonpayData as-is
    moonpayData: md ?? undefined,
  };
}

// ─── Fiat Helper Constants ─────────────────────────────────────────────────────
export const FIAT_SYMBOLS: Record<string, string> = {
  USD: '$',   EUR: '€',   GBP: '£',   AED: 'د.إ',
  CAD: 'C$',  AUD: 'A$',  SGD: 'S$',  CHF: 'Fr',
  JPY: '¥',   HKD: 'HK$', MXN: 'MX$', BRL: 'R$',
  NOK: 'kr',  SEK: 'kr',  DKK: 'kr',  PLN: 'zł',
  CZK: 'Kč',  HUF: 'Ft',  RON: 'lei', BGN: 'лв',
  TRY: '₺',   ZAR: 'R',   NZD: 'NZ$', THB: '฿',
  MYR: 'RM',  IDR: 'Rp',  PHP: '₱',   TWD: 'NT$',
  KRW: '₩',   COP: 'COP', PEN: 'S/',  CLP: 'CLP',
  ARS: 'ARS', UAH: '₴',   ILS: '₪',   KWD: 'KD',
  SAR: '﷼',   QAR: 'QR',  OMR: 'OMR', BHD: 'BD',
  VND: '₫',   PKR: '₨',   NGN: '₦',   EGP: '£',
};

export const FIAT_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', AED: '🇦🇪',
  CAD: '🇨🇦', AUD: '🇦🇺', SGD: '🇸🇬', CHF: '🇨🇭',
  JPY: '🇯🇵', HKD: '🇭🇰', MXN: '🇲🇽', BRL: '🇧🇷',
  NOK: '🇳🇴', SEK: '🇸🇪', DKK: '🇩🇰', PLN: '🇵🇱',
  CZK: '🇨🇿', HUF: '🇭🇺', RON: '🇷🇴', BGN: '🇧🇬',
  TRY: '🇹🇷', ZAR: '🇿🇦', NZD: '🇳🇿', THB: '🇹🇭',
  MYR: '🇲🇾', IDR: '🇮🇩', PHP: '🇵🇭', TWD: '🇹🇼',
  KRW: '🇰🇷', COP: '🇨🇴', PEN: '🇵🇪', CLP: '🇨🇱',
  ARS: '🇦🇷', UAH: '🇺🇦', ILS: '🇮🇱', KWD: '🇰🇼',
  SAR: '🇸🇦', QAR: '🇶🇦', OMR: '🇴🇲', BHD: '🇧🇭',
  VND: '🇻🇳', PKR: '🇵🇰', NGN: '🇳🇬', EGP: '🇪🇬',
};

// ─── Service ───────────────────────────────────────────────────────────────────
export const moonpayService = {

  // ── Quotes ────────────────────────────────────────────────────────────────────
  getBuyQuote: (params: BuyQuoteParams) =>
    api.post<BuyQuoteResponse>(ENDPOINTS.MOONPAY.BUY_QUOTE, params),

  getSellQuote: (params: SellQuoteParams) =>
    api.post<SellQuoteResponse>(ENDPOINTS.MOONPAY.SELL_QUOTE, params),

  // ── Transactions ──────────────────────────────────────────────────────────────
  createBuyTransaction: (params: BuyTransactionParams) =>
    api.post<TransactionUrlResponse>(ENDPOINTS.MOONPAY.BUY, params),

  createSellTransaction: (params: SellTransactionParams) =>
    api.post<TransactionUrlResponse>(ENDPOINTS.MOONPAY.SELL, params),

  // ✅ GET /moonpay/transactions - list of all transactions
  getTransactions: () =>
    api.get<{ success: boolean; data: any[] }>(
      ENDPOINTS.MOONPAY.TRANSACTIONS
    ),

  // ✅ GET /moonpay/transaction/:id - single transaction by moonpayTransactionId
  getTransaction: (transactionId: string) =>
    api.get<{ success: boolean; data: any }>(
      ENDPOINTS.MOONPAY.TRANSACTION(transactionId)
    ),

  // ── Currencies ────────────────────────────────────────────────────────────────
  getSupportedCurrencies: () =>
    api.get<{ success: boolean; data: MoonPayCurrency[] }>(
      ENDPOINTS.MOONPAY.CURRENCIES
    ),

  getSupportedFiatCurrencies: () =>
    api.get<{ success: boolean; data: MoonPayFiatCurrency[] }>(
      ENDPOINTS.MOONPAY.FIAT_CURRENCIES
    ),

  getSupportedCryptoCurrencies: () =>
    api.get<{ success: boolean; data: MoonPayCurrency[] }>(
      ENDPOINTS.MOONPAY.CRYPTO_CURRENCIES
    ),

  // ── Countries ─────────────────────────────────────────────────────────────────
  getSupportedCountries: () =>
    api.get<{ success: boolean; data: MoonPayCountry[] }>(
      ENDPOINTS.MOONPAY.COUNTRIES
    ),
};