const API_PREFIX = '/api/v1/metavault';

const rawAppUrl =
  process.env.EXPO_PUBLIC_API_URL || 'https://metaapi.yourmetavault.com';

const APP_URL = rawAppUrl
  .replace(/\/+$/, '')
  .replace(new RegExp(`(${API_PREFIX})+$`), '');

const BASE_URL = `${APP_URL}${API_PREFIX}`;

export const ENDPOINTS = {

  AUTH: {
    LOGIN:              `${BASE_URL}/users/auth/login`,
    REGISTER:           `${BASE_URL}/users/auth/register`,
    SEND_OTP:           `${BASE_URL}/users/auth/send-otp-register`,
    VERIFY_OTP:         `${BASE_URL}/users/auth/verify-otp-register`,
    PROFILE:            `${BASE_URL}/users/profile`,
    LOGOUT:             `${BASE_URL}/users/logout`,
    LOGOUT_ALL:         `${BASE_URL}/users/logout-all`,
    VERIFY_FORGET_OTP:  `${BASE_URL}/users/verify-otp`,
    UPDATE_PROFILE:     (userId: string) => `${BASE_URL}/users/update/${userId}`,
    FORGOT_PASSWORD:    `${BASE_URL}/users/forgot-password`,
    RESET_PASSWORD:     `${BASE_URL}/users/reset-password`,
    SAVE_PUSH_TOKEN: `${BASE_URL}/notifications/push-token`,
    REMOVE_PUSH_TOKEN: `${BASE_URL}/notifications/push-token`,
  },
    KYC: {
    INITIATE:  `${BASE_URL}/kyc/initiate`,
    STATUS:   `${BASE_URL}/kyc/status`,
  },

// services/endpoints.ts mein add karo
USER: {
  TOGGLE_2FA:          `${BASE_URL}/users/2fa/toggle`,
  VERIFY_EMAIL_2FA:    `${BASE_URL}/users/verify-email-2fa`,
  SETUP_AUTHENTICATOR: `${BASE_URL}/users/2fa/setup-authenticator`,
  VERIFY_AUTHENTICATOR:`${BASE_URL}/users/2fa/verify-authenticator`,
  GET_REFERRED_USERS:  `${BASE_URL}/users/get-referred-users-and-earnings`,
},

  WALLET: {
    GET_SUPPORTED_BLOCKCHAINS: `${BASE_URL}/userWallet/getSupportedBlockchain`,
    GET_ALL_WALLETS:           `${BASE_URL}/userWallet/getAllWallets`,
    GET_ASSETS_BY_CHAIN:       `${BASE_URL}/asset/getAssetsByChain`,
    GET_ASSET_LIST:            `${BASE_URL}/asset/list`,
    GET_ASSET_BALANCE_BASE:    `${BASE_URL}/userWallet/me`,
    SEND_TO_USER:              `${BASE_URL}/userWallet/sendCrypto`,
    WITHDRAW_CRYPTO:           `${BASE_URL}/userWallet/withdraw`,
    TRANSACTION_HISTORY:       `${BASE_URL}/userWallet/transactions/history`,
    EXPORT_TRANSACTIONS:       `${BASE_URL}/userWallet/transactions/export`,
    TRANSACTION_DETAIL:        (id: string) => `${BASE_URL}/userWallet/transactions/history/${id}`,
    GET_DASHBOARD:             `${BASE_URL}/userWallet/dashboard`,
    GET_DEPOSIT_ADDRESS:       `${BASE_URL}/userWallet/deposit-address`,
GET_WALLET_BALANCE: (chainId: string, assetId: string) => 
  `${BASE_URL}/userWallet/me/${chainId}/${assetId}`,
  },

  P2P: {
    CREATE_AD:    `${BASE_URL}/p2p/ads`,
    LIST_ADS:     `${BASE_URL}/p2p/ads`,
    MY_ADS:       `${BASE_URL}/p2p/ads/my`,
    MY_ORDERS:    `${BASE_URL}/p2p/orders/my`,
    ASSETS:       `${BASE_URL}/p2p/assets`,
    PLACE_ORDER:  `${BASE_URL}/p2p/orders`,
    CANCEL_ORDER: (id: string) => `${BASE_URL}/p2p/orders/${id}/cancel`,
    MARK_FIAT_SENT: (id: string) => `${BASE_URL}/p2p/orders/${id}/fiat-sent`,
    RELEASE_ORDER:  (id: string) => `${BASE_URL}/p2p/orders/${id}/release`,
    RATE_SELLER:    (id: string) => `${BASE_URL}/p2p/orders/${id}/rate`,
    RAISE_DISPUTE:  (id: string) => `${BASE_URL}/p2p/orders/${id}/dispute`,
    ORDER_DETAIL:   (id: string) => `${BASE_URL}/p2p/orders/${id}`,
    UPDATE_AD:      (id: string) => `${BASE_URL}/p2p/ads/${id}`,
    DELETE_AD:      (id: string) => `${BASE_URL}/p2p/ads/${id}`,
      LIST_DISPUTES: `${BASE_URL}/admin/p2p/disputes`,
      DISPUTE_DETAIL: (disputeId: string) => `${BASE_URL}/admin/p2p/disputes/${disputeId}`,
      RESOLVE_DISPUTE: (disputeId: string) =>
        `${BASE_URL}/admin/p2p/disputes/${disputeId}/resolve`,
      SLA_DASHBOARD: `${BASE_URL}/admin/p2p/sla-dashboard`,
      TRADE_REQUEST: `${BASE_URL}/p2p/trade-request`,
      MY_TRADE_REQUESTS: `${BASE_URL}/p2p/trade-request/my`,
  },
 PAYMENT_METHOD: {
  USER: {
    LIST: `${BASE_URL}/payment-methods`,
    DETAIL: (id: string) => `${BASE_URL}/payment-methods/${id}`,
    ACCOUNTS: `${BASE_URL}/payment-methods/my-accounts`,
    ADD_ACCOUNT: `${BASE_URL}/payment-methods/my-accounts`,
    DELETE_ACCOUNT: (id: string) => `${BASE_URL}/payment-methods/my-accounts/${id}`,
    SET_DEFAULT: (id: string) =>
      `${BASE_URL}/payment-methods/my-accounts/${id}/set-default`,
  },
},

  EARN: {
    PRODUCTS:           `${BASE_URL}/earn/products`,
    SUBSCRIBE:          `${BASE_URL}/earn/subscribe`,
    REDEEM:             (id: string) => `${BASE_URL}/earn/redeem/${id}`,
    REWARD_HISTORY:     `${BASE_URL}/earn/rewardHistory`,
    DASHBOARD:          `${BASE_URL}/earn/dashboard`,
    LEADERBOARD:        `${BASE_URL}/earn/leaderboard`,
    MY_POSITIONS:       `${BASE_URL}/earn/positions`,
    POSITION_DETAIL:    (id: string) => `${BASE_URL}/earn/position/${id}`,
    PREVIEW:            `${BASE_URL}/earn/preview`,
    REDEEM_PREVIEW:     (id: string) => `${BASE_URL}/earn/redeem-preview/${id}`,
    PORTFOLIO:          `${BASE_URL}/earn/portfolio`,
    EARNING_CALCULATOR: `${BASE_URL}/earn/calculator`,
  },

  CREDIT: {
    GET_ACCOUNT:           `${BASE_URL}/credit/account`,
    ACTIVATE:              `${BASE_URL}/credit/activate`,
    GET_OVERVIEW:          `${BASE_URL}/credit/overview`,
    GET_HEALTH:            `${BASE_URL}/credit/health`,
    GET_SUPPORTED_ASSETS:  `${BASE_URL}/credit/supported-assets`,
    PREVIEW_LIMIT:         `${BASE_URL}/credit/preview-limit`,
    REPAY_PREVIEW:         `${BASE_URL}/credit/repay-preview`,
    ADD_COLLATERAL:        `${BASE_URL}/credit/collateral`,
    LIST_COLLATERAL:       `${BASE_URL}/credit/listCollateral`,
    REMOVE_COLLATERAL:     (id: string) => `${BASE_URL}/credit/removeCollateral/${id}`,
    GET_RISK:              `${BASE_URL}/credit/risk`,
    BORROW:                `${BASE_URL}/credit/borrow`,
    REPAY:                 `${BASE_URL}/credit/repay`,
    GET_TRANSACTIONS:      `${BASE_URL}/credit/transactions`,
    ACCOUNT:               `${BASE_URL}/account`,
    CLOSE:                 `${BASE_URL}/close`,
    COLLATERAL_HISTORY:    `${BASE_URL}/collateral-history`,



  },

  LOAN: {
    PAIRS:               `${BASE_URL}/loan/pairs`,
    PREVIEW:             `${BASE_URL}/loan/preview`,
    CREATE:              `${BASE_URL}/loan/create`,
    MY_LOANS:            `${BASE_URL}/loan/my`,
    COMPLETED:           `${BASE_URL}/loan/completed`,
    DETAIL:              (id: string) => `${BASE_URL}/loan/getLoanDetail/${id}`,
    TRANSACTIONS:        (id: string) => `${BASE_URL}/loan/Transactions/${id}/tx`,
    REPAY:               (id: string) => `${BASE_URL}/loan/repay/${id}`,
    ADD_COLLATERAL:      (id: string) => `${BASE_URL}/loan/add-collateral/${id}`,
    WITHDRAW_COLLATERAL: (id: string) => `${BASE_URL}/loan/withdraw-collateral/${id}`,
    CLOSE:               (id: string) => `${BASE_URL}/loan/close/${id}`,
    STATS:               `${BASE_URL}/loan/stats`,
  },

SWAP: {
  QUOTE:     `${BASE_URL}/swap/quote`,        // POST
  EXECUTE:   `${BASE_URL}/swap/execute`,      // POST
  HISTORY:   `${BASE_URL}/swap/history`,      // GET
  PORTFOLIO: `${BASE_URL}/swap/portfolio`,    // GET
  ACTIVE:    `${BASE_URL}/swap/active`,       // GET
  DETAIL:    (id: string) => `${BASE_URL}/swap/${id}`,          // GET
  CANCEL:    (id: string) => `${BASE_URL}/swap/${id}/cancel`,   // POST
},

  NOTIFICATION: {
    GET_ALL:      `${BASE_URL}/notifications`,
    GET_LAST:     `${BASE_URL}/notifications/last`,
    MARK_READ:    (id: string) => `${BASE_URL}/notifications/read/${id}`,
    MARK_ALL_READ:`${BASE_URL}/notifications/read-all`,
    REGISTER_PUSH_TOKEN: `${BASE_URL}/notifications/push-token`,   // apna actual route daalo
    UNREGISTER_PUSH_TOKEN: `${BASE_URL}/notifications/push-token`,
  },

  SUPPORT: {
    GET_FAQ:        `${BASE_URL}/support/get/faq`,
    CREATE_CONTACT: `${BASE_URL}/support/create/contact/by-user`,
    GET_MY_CONTACTS:`${BASE_URL}/support/get/contact/by-users`,
  },

  PIN: {
    GET_STATUS: `${BASE_URL}/users/get/pin-set`,
    SET_PIN:    `${BASE_URL}/users/set-pin`,
    VERIFY_PIN: `${BASE_URL}/users/verify-pin`,
    CHANGE_PIN: `${BASE_URL}/users/change-pin`,
  },

  // ── Card (Tevau) ──────────────────────────────────────────────────────────
   CARD: {
    // --- User KYC & Onboarding ---
    CREATE_USER: `${BASE_URL}/card/tevau/create-user`,
    QUERY_USER: `${BASE_URL}/card/tevau/query-user`,
    SUBMIT_KYC: `${BASE_URL}/card/tevau/submit-kyc`,
    QUERY_KYC: `${BASE_URL}/card/tevau/query-kyc`,
    GET_KYC_URL: `${BASE_URL}/card/tevau/get-kyc-url`,
    LIVENESS_STATUS: `${BASE_URL}/card/tevau/liveness-status`,
    SIMULATE_KYC: `${BASE_URL}/card/tevau/simulate-kyc`,
    SUBMIT_KYC_V2: `${BASE_URL}/card/tevau/submit-kyc-v2`,
    COUNTRIES: `${BASE_URL}/card/countries`,

    // --- Document Upload ---
    CREATE_DOCUMENT_FILE: `${BASE_URL}/card/tevau/create-document-file`,
    UPLOAD_DOCUMENT_FILE: `${BASE_URL}/card/tevau/upload-document-file`,

    // --- Card CRUD ---
    CREATE_CARD: `${BASE_URL}/card/tevau/create-card`,
    CARD_LIST: `${BASE_URL}/card/tevau/card-list`,
    CARD_DETAILS: `${BASE_URL}/card/tevau/details`,
    CARD_PAN: `${BASE_URL}/card/tevau/card-pan`,
    CARD_PIN: `${BASE_URL}/card/tevau/card-pin`,
    CARD_LIMIT: `${BASE_URL}/card/tevau/card-limit`,

    // --- Card Actions ---
    ACTIVATE: `${BASE_URL}/card/tevau/activate`,
    FREEZE: `${BASE_URL}/card/tevau/freeze`,
    UNFREEZE: `${BASE_URL}/card/tevau/unfreeze`,
    CLOSE: `${BASE_URL}/card/tevau/close`,
    UPDATE_PHONE: `${BASE_URL}/card/tevau/update-phone`,
    UPDATE_EMAIL: `${BASE_URL}/card/tevau/update-email`,
    QUERY_CARD_FEE: `${BASE_URL}/card/tevau/query-card-fee`,

    // --- Transactions ---
    TRANSACTIONS: `${BASE_URL}/card/tevau/transactions`,
    TRANSACTION_DETAIL: `${BASE_URL}/card/tevau/transaction-detail`,

    // --- Funding ---
    TOPUP: `${BASE_URL}/card/tevau/card/topup`,
    PREFUND_BALANCE: `${BASE_URL}/card/tevau/prefund-balance`,

    //Refund and Dispute

    REFUND_REQUEST: `${BASE_URL}/card/tevau/trade/refund-request`,
    GET_DISPUTES: `${BASE_URL}/card/tevau/trade/refund-request-list`,

    // --- Trade ---
    AUTHORISE: `${BASE_URL}/card/tevau/trade/authorise`,
    TRIGGER_3DS: `${BASE_URL}/card/tevau/trade/3ds`,

    // --- Admin ---
    ADMIN: {
      DETAILS: `${BASE_URL}/card/admin/tevau/details`,
      ADJUST_BALANCE: `${BASE_URL}/card/admin/tevau/adjust-balance`,
      BIND_CARD: `${BASE_URL}/card/admin/tevau/bind-card`,
      SET_CARD_FEE: `${BASE_URL}/card/admin/tevau/set-card-fee`,
      QUERY_CARD_FEE: `${BASE_URL}/card/admin/tevau/query-card-fee`,
    },
  },
  SCRATCH_CARDS: {
  MY_CARDS: `${BASE_URL}/scratch-cards`,
  OPEN:   (id: string) => `${BASE_URL}/scratch-cards/${id}/open`,
  REDEEM: (id: string) => `${BASE_URL}/scratch-cards/${id}/redeem`,
},
// --- Moonpay --------------------------------------

MOONPAY: {
    // Public
    CURRENCIES:        `${BASE_URL}/moonpay/currencies`,
    FIAT_CURRENCIES:   `${BASE_URL}/moonpay/currencies/fiat`,
    CRYPTO_CURRENCIES: `${BASE_URL}/moonpay/currencies/crypto`,
    COUNTRIES:         `${BASE_URL}/moonpay/countries`,

    // Protected (JWT required)
    BUY_QUOTE:   `${BASE_URL}/moonpay/quote/buy`,
    SELL_QUOTE:  `${BASE_URL}/moonpay/quote/sell`,
    BUY:         `${BASE_URL}/moonpay/buy`,
    SELL:        `${BASE_URL}/moonpay/sell`,
    TRANSACTION: (id: string) => `${BASE_URL}/moonpay/transaction/${id}`,
  TRANSACTIONS: `${BASE_URL}/moonpay/transactions`,
  },
};
