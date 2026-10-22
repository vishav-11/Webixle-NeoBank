/**
 * DEMO MODE — in-memory mock backend.
 *
 * Plugs into axios as a custom `adapter` (see services/apiClient.ts), so every
 * existing service / hook / screen keeps working unchanged — they just get
 * these responses instead of hitting the real API.
 *
 * Toggle:  EXPO_PUBLIC_DEMO_MODE=true  (default)  |  false → real API.
 * Demo login: any email + any password works.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

// ─── helpers ──────────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const hex = (n: number) => n.toString(16).padStart(24, '0');
const ok = (data: any = {}, message = 'OK', extra: object = {}) => ({
  status: 'success', success: true, message, data, ...extra,
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── static data ──────────────────────────────────────────────────────────────
const USER_ID = hex(1);
const user: any = {
  _id: USER_ID,
  firstName: 'Alex', lastName: 'Morgan',
  email: 'demo@neobank.app',
  role: 'user', avatar: null,
  kycStatus: 'Approved',
  isEmailVerified: true, isMailVerifiedAfterRegister: true,
  twoFactorEnabled: false, twoFactorMethod: 'email',
  referralCode: 'NEO2026',
  profileStatus: 'complete',
  createdAt: ago(120 * DAY), updatedAt: ago(DAY),
  DOB: '1994-05-12', address: '221B Market Street, London',
  mobileCode: '+44', mobileNo: '7700900123',
  dailySwapLimit: 50000, signUpBonus: 25,
  interlaceAccountCreated: true,
  interlaceKycStatus: 'approved',
  interlaceAccountId: 'acc_demo_001',
  interlaceDisplayId: 'NB-100245',
};

const CHAINS = [
  { id: 'ethereum',            name: 'Ethereum',      native_currency: 'ETH', chainId: 1,   image: {} },
  { id: 'binance-smart-chain', name: 'BNB Chain',     native_currency: 'BNB', chainId: 56,  image: {} },
  { id: 'tron',                name: 'Tron',          native_currency: 'TRX', chainId: null, image: {} },
  { id: 'bitcoin',             name: 'Bitcoin',       native_currency: 'BTC', chainId: null, image: {} },
];

const mkAsset = (n: number, chainId: string, symbol: string, name: string, price: number,
  decimals = 18, type = 'token', cg = '') => ({
  _id: hex(100 + n), chainId, assetAddress: type === 'native' ? '' : `0x${hex(500 + n)}`,
  assetType: type, coinGeckoId: cg || name.toLowerCase(), name, symbol, decimals,
  depositEnabled: true, withdrawalEnabled: true,
  withdrawalFee: symbol === 'BTC' ? '0.0002' : symbol === 'USDT' ? '1' : '0.001',
  minWithdrawalAmount: symbol === 'USDT' || symbol === 'USDC' ? '10' : '0.001',
  maxWithdrawalAmount: '1000000', tokenName: name,
  createdAt: ago(200 * DAY), updatedAt: ago(DAY), priceUsd: price,
});

const ASSETS = [
  mkAsset(1, 'ETH',  'ETH',  'Ethereum',  3120.5, 18, 'native', 'ethereum'),
  mkAsset(2, 'ETH',  'USDT', 'Tether',    1.0,    6,  'token',  'tether'),
  mkAsset(3, 'ETH',  'USDC', 'USD Coin',  1.0,    6,  'token',  'usd-coin'),
  mkAsset(4, 'BSC',  'BNB',  'BNB',       612.3,  18, 'native', 'binancecoin'),
  mkAsset(5, 'BSC',  'USDT', 'Tether',    1.0,    18, 'token',  'tether'),
  mkAsset(6, 'TRON', 'TRX',  'Tron',      0.162,  6,  'native', 'tron'),
  mkAsset(7, 'TRON', 'USDT', 'Tether',    1.0,    6,  'token',  'tether'),
  mkAsset(8, 'BTC',  'BTC',  'Bitcoin',   67250,  8,  'native', 'bitcoin'),
];
const assetById = (id: string) => ASSETS.find((a) => a._id === id);

// wallet balances (mutable so send/withdraw/swap feel alive)
const balances: Record<string, number> = {
  [ASSETS[0]._id]: 1.8421,   // ETH
  [ASSETS[1]._id]: 2450.75,  // USDT eth
  [ASSETS[2]._id]: 820.0,    // USDC
  [ASSETS[3]._id]: 4.25,     // BNB
  [ASSETS[4]._id]: 310.4,    // USDT bsc
  [ASSETS[5]._id]: 12500,    // TRX
  [ASSETS[6]._id]: 1500.0,   // USDT tron
  [ASSETS[7]._id]: 0.0734,   // BTC
};
const locked: Record<string, number> = { [ASSETS[1]._id]: 200, [ASSETS[0]._id]: 0.25 };

const walletRows = () => ASSETS.map((a) => {
  const avail = balances[a._id] ?? 0;
  const lock = locked[a._id] ?? 0;
  return {
    _id: hex(900 + Number(a._id.slice(-3))), userId: USER_ID,
    assetId: a._id, asset: a, chainId: a.chainId, symbol: a.symbol, name: a.name,
    availableBalance: String(avail), lockedBalance: String(lock),
    totalBalance: String(avail + lock),
    address: `0x${hex(7000 + Number(a._id.slice(-3)))}`.slice(0, 42),
  };
});

const dashboard = () => {
  let total = 0;
  const rows = ASSETS.map((a) => {
    const avail = balances[a._id] ?? 0;
    const lock = locked[a._id] ?? 0;
    const usd = (avail + lock) * (a.priceUsd ?? 0);
    total += usd;
    return {
      symbol: a.symbol, name: a.name, chainId: a.chainId,
      availableBalance: String(avail), lockedBalance: String(lock),
      totalBalance: String(avail + lock),
      totalLockUsd: (lock * (a.priceUsd ?? 0)).toFixed(2),
      totalAvailableUsd: (avail * (a.priceUsd ?? 0)).toFixed(2),
      usdValue: usd.toFixed(2),
    };
  });
  return { totalUsd: total.toFixed(2), assets: rows };
};

// transactions
const txs: any[] = [
  ['DEPOSIT', 2, 1500, 'COMPLETED', 'Deposit received', 0.4],
  ['INTERNAL_SEND', 1, 120, 'COMPLETED', 'Sent to @sarah', 1],
  ['CREDIT', 2, 75, 'COMPLETED', 'Referral bonus', 2],
  ['WITHDRAW', 7, 300, 'PENDING', 'Withdrawal to external wallet', 3],
  ['DEPOSIT', 1, 0.5, 'COMPLETED', 'Deposit received', 5],
  ['ESCROW_LOCK', 2, 200, 'COMPLETED', 'P2P escrow locked', 6],
  ['DEPOSIT', 8, 0.02, 'COMPLETED', 'Deposit received', 9],
  ['INTERNAL_SEND', 3, 50, 'COMPLETED', 'Sent to @mike', 12],
  ['WITHDRAW', 1, 0.15, 'COMPLETED', 'Withdrawal to external wallet', 15],
  ['DEPOSIT', 4, 1.2, 'COMPLETED', 'Deposit received', 18],
  ['CREDIT', 6, 800, 'COMPLETED', 'Earn reward', 20],
  ['WITHDRAW', 2, 90, 'FAILED', 'Withdrawal failed', 24],
].map(([type, aIdx, amount, status, note, days], i) => {
  const a = ASSETS[(aIdx as number) - 1];
  return {
    _id: hex(3000 + i), userId: USER_ID,
    asset: { _id: a._id, name: a.name, symbol: a.symbol },
    type, status, amount: String(amount),
    balanceBefore: '0', balanceAfter: String(amount), note,
    fee: type === 'WITHDRAW' ? a.withdrawalFee : '0',
    txHash: `0x${hex(8000 + i)}${hex(i).slice(0, 16)}`,
    toAddress: type === 'WITHDRAW' ? `0x${hex(9100 + i)}`.slice(0, 42) : undefined,
    fromAddress: type === 'DEPOSIT' ? `0x${hex(9200 + i)}`.slice(0, 42) : undefined,
    usdValue: ((amount as number) * (a.priceUsd ?? 0)).toFixed(2),
    createdAt: ago((days as number) * DAY), updatedAt: ago((days as number) * DAY),
  };
});

// notifications
const notifications: any[] = [
  ['Welcome to NeoBank 🎉', 'Your demo account is ready. Explore wallets, cards, earn and more.', 'announcement', 0.1],
  ['Deposit confirmed', 'Your deposit of 1,500 USDT has been credited.', 'transaction', 0.5],
  ['Card ending 4242 is active', 'Your virtual card is ready to use anywhere Visa is accepted.', 'system', 1],
  ['New Earn product: USDT Flexible 8% APY', 'Start earning daily rewards on your idle stablecoins.', 'promotion', 2],
  ['Security alert', 'New sign-in from a new device. If this was you, no action needed.', 'alert', 3],
].map(([title, message, type, d], i) => ({
  id: hex(4000 + i), _id: hex(4000 + i), title, message, type,
  read: i > 2, link: null, data: {}, createdAt: ago((d as number) * DAY), updatedAt: ago((d as number) * DAY),
}));

// Interlace cards (Cards3 module)
const cards: any[] = [
  { id: 'card_demo_001', accountId: 'acc_demo_001', cardholderId: 'ch_demo_001', binId: 'bin_1',
    label: 'Everyday Spend', status: 'ACTIVE', cardLastFour: '4242', userName: 'ALEX MORGAN',
    cardMode: 'VIRTUAL_CARD', currency: 'USD', balance: '1284.50', bin: '424242',
    cardReferenceId: 'ref_001', balanceId: 'bal_001', createTime: ago(30 * DAY) },
  { id: 'card_demo_002', accountId: 'acc_demo_001', cardholderId: 'ch_demo_001', binId: 'bin_1',
    label: 'Travel Metal', status: 'ACTIVE', cardLastFour: '9081', userName: 'ALEX MORGAN',
    cardMode: 'PHYSICAL_CARD', currency: 'USD', balance: '520.00', bin: '424242',
    cardReferenceId: 'ref_002', balanceId: 'bal_002', createTime: ago(10 * DAY) },
];

const cardTxns = [
  ['Starbucks', '-6.40', 'Food & Drink', 0.2], ['Amazon', '-48.99', 'Shopping', 0.8],
  ['Uber', '-14.20', 'Transport', 1.2], ['Netflix', '-15.49', 'Subscriptions', 2],
  ['Apple Store', '-129.00', 'Electronics', 3], ['Card top-up', '+500.00', 'Top-up', 4],
  ['Whole Foods', '-72.35', 'Groceries', 5], ['Spotify', '-9.99', 'Subscriptions', 6],
].map(([merchantName, amount, description, d], i) => ({
  id: `ctx_${i}`, accountId: 'acc_demo_001', cardId: i % 3 === 2 ? 'card_demo_002' : 'card_demo_001',
  clientTransactionId: `cl_${i}`, type: String(amount).startsWith('+') ? 'TOPUP' : 'CONSUMPTION',
  status: 'SUCCESS', amount, currency: 'USD', merchantName, description,
  createTime: ago((d as number) * DAY),
}));

// Earn
const earnProducts = [
  { id: hex(5001), symbol: 'USDT', name: 'Tether', apy: 8, type: 'flexible', duration: null, minAmount: 10, balance: 2450.75 },
  { id: hex(5002), symbol: 'USDT', name: 'Tether', apy: 12.5, type: 'fixed', duration: 30, minAmount: 100, balance: 2450.75 },
  { id: hex(5003), symbol: 'ETH', name: 'Ethereum', apy: 4.2, type: 'flexible', duration: null, minAmount: 0.01, balance: 1.8421 },
  { id: hex(5004), symbol: 'ETH', name: 'Ethereum', apy: 6.8, type: 'fixed', duration: 90, minAmount: 0.1, balance: 1.8421 },
  { id: hex(5005), symbol: 'BTC', name: 'Bitcoin', apy: 3.1, type: 'flexible', duration: null, minAmount: 0.001, balance: 0.0734 },
  { id: hex(5006), symbol: 'BNB', name: 'BNB', apy: 5.5, type: 'fixed', duration: 60, minAmount: 0.5, balance: 4.25 },
];
const nestedProduct = (p: any) => ({
  _id: p.id, name: `${p.name} ${p.type === 'fixed' ? p.duration + 'D' : 'Flexible'}`,
  asset: p.symbol, chainId: 'ETH', type: p.type.toUpperCase(), apy: p.apy,
  durationDays: p.duration ?? undefined, minDeposit: String(p.minAmount), maxDeposit: '1000000',
  autoCompound: true, earlyWithdrawPenaltyPercent: 2, status: 'ACTIVE',
  createdAt: ago(90 * DAY), updatedAt: ago(DAY),
});
const earnPositions: any[] = [
  { _id: hex(5101), userId: USER_ID, productId: nestedProduct(earnProducts[0]), asset: 'USDT', chainId: 'ETH',
    amount: '1000', earned: '18.42', liveEarned: '18.47', startAt: ago(84 * DAY), endAt: null,
    lastAccruedAt: ago(0.1 * DAY), status: 'ACTIVE', createdAt: ago(84 * DAY), updatedAt: ago(0.1 * DAY) },
  { _id: hex(5102), userId: USER_ID, productId: nestedProduct(earnProducts[3]), asset: 'ETH', chainId: 'ETH',
    amount: '0.5', earned: '0.0071', liveEarned: '0.0072', startAt: ago(40 * DAY), endAt: ago(-50 * DAY),
    lastAccruedAt: ago(0.1 * DAY), status: 'ACTIVE', createdAt: ago(40 * DAY), updatedAt: ago(0.1 * DAY) },
];

// Credit
const creditCollateral = [
  { _id: hex(6001), asset: { symbol: 'ETH', name: 'Ethereum', chainId: 'ETH' }, amount: '0.8', usdValue: '2496.40', ltv: 70, chainId: 'ETH', status: 'ACTIVE' },
  { _id: hex(6002), asset: { symbol: 'BTC', name: 'Bitcoin', chainId: 'BTC' }, amount: '0.03', usdValue: '2017.50', ltv: 65, chainId: 'BTC', status: 'ACTIVE' },
];
const creditTxns = [
  ['BORROW', 800, 5], ['REPAY', 200, 12], ['INTEREST', 3.4, 14], ['BORROW', 300, 25], ['REPAY', 100, 33],
].map(([type, amount, d], i) => ({ _id: hex(6100 + i), type, amount, createdAt: ago((d as number) * DAY) }));

// Loans
const loanPairs = [
  { _id: hex(7001), pairId: hex(7001), collateral: { id: ASSETS[0]._id, symbol: 'ETH' }, borrow: { id: ASSETS[1]._id, symbol: 'USDT' }, ltv: 70, interest: 9.5 },
  { _id: hex(7002), pairId: hex(7002), collateral: { id: ASSETS[7]._id, symbol: 'BTC' }, borrow: { id: ASSETS[1]._id, symbol: 'USDT' }, ltv: 65, interest: 8.5 },
  { _id: hex(7003), pairId: hex(7003), collateral: { id: ASSETS[3]._id, symbol: 'BNB' }, borrow: { id: ASSETS[4]._id, symbol: 'USDT' }, ltv: 60, interest: 10 },
];
const mkLoan = (i: number, status: string, col: any, bor: any, colAmt: string, colUsd: string, borAmt: string, ltv: number, days: number): any => ({
  _id: hex(7100 + i), userId: USER_ID,
  collateralAsset: { _id: col._id, symbol: col.symbol, name: col.name, chainId: col.chainId },
  borrowAsset: { _id: bor._id, symbol: bor.symbol, name: bor.name, chainId: bor.chainId },
  collateralAmount: colAmt, collateralUsd: colUsd, borrowedAmount: borAmt, borrowedUsd: borAmt,
  interestRate: 9.5, dailyRate: 0.026, ltv, liquidationLtv: 85, marginCallLtv: 78, status,
  totalInterestAccrued: (Number(borAmt) * 0.026 * days / 100).toFixed(2),
  lastInterestUpdate: ago(0.2 * DAY), createdAt: ago(days * DAY), updatedAt: ago(0.2 * DAY),
});
const activeLoans = [
  mkLoan(1, 'ACTIVE', ASSETS[0], ASSETS[1], '1.2', '3744.60', '2000', 53.4, 21),
  mkLoan(2, 'ACTIVE', ASSETS[7], ASSETS[1], '0.04', '2690.00', '1200', 44.6, 8),
];
const doneLoans = [mkLoan(3, 'REPAID', ASSETS[3], ASSETS[4], '5', '3061.50', '1000', 32.7, 70)];

// P2P
const payMethods = [
  { _id: hex(8001), name: 'UPI', code: 'UPI', description: 'Unified Payments Interface', isActive: true, createdAt: ago(300 * DAY), updatedAt: ago(DAY),
    fields: [{ fieldKey: 'upiId', fieldLabel: 'UPI ID', fieldType: 'text', placeholder: 'name@bank', isRequired: true, order: 1 }] },
  { _id: hex(8002), name: 'Bank Transfer', code: 'BANK', description: 'Local bank transfer', isActive: true, createdAt: ago(300 * DAY), updatedAt: ago(DAY),
    fields: [
      { fieldKey: 'accountName', fieldLabel: 'Account Name', fieldType: 'text', placeholder: 'Full name', isRequired: true, order: 1 },
      { fieldKey: 'accountNumber', fieldLabel: 'Account Number', fieldType: 'number', placeholder: '000000000', isRequired: true, order: 2 },
      { fieldKey: 'ifsc', fieldLabel: 'IFSC / Sort code', fieldType: 'text', placeholder: 'ABCD0123456', isRequired: true, order: 3 },
    ] },
  { _id: hex(8003), name: 'PayPal', code: 'PAYPAL', description: 'PayPal', isActive: true, createdAt: ago(300 * DAY), updatedAt: ago(DAY),
    fields: [{ fieldKey: 'email', fieldLabel: 'PayPal Email', fieldType: 'email', placeholder: 'you@email.com', isRequired: true, order: 1 }] },
];
const payAccounts: any[] = [
  { _id: hex(8101), userId: USER_ID, paymentMethodId: payMethods[0], label: 'My UPI', fieldValues: { upiId: 'alex@okbank' }, isDefault: true, createdAt: ago(30 * DAY), updatedAt: ago(30 * DAY) },
  { _id: hex(8102), userId: USER_ID, paymentMethodId: payMethods[1], label: 'Barclays Main', fieldValues: { accountName: 'Alex Morgan', accountNumber: '12345678', ifsc: '20-45-45' }, isDefault: false, createdAt: ago(20 * DAY), updatedAt: ago(20 * DAY) },
];
const pmDetail = (m: any) => ({ accountId: hex(8200), label: m.name, isDefault: false, method: { id: m._id, name: m.name, code: m.code, description: m.description },
  fields: m.fields.map((f: any) => ({ ...f, value: f.fieldKey === 'upiId' ? 'trader@okbank' : 'demo-value' })) });
const mkAd = (i: number, type: string, a: any, price: string, total: string, avail: string, name: string, trust: number, trades: number): any => ({
  _id: hex(8300 + i), userId: { _id: hex(8400 + i) }, type, asset: a._id, chainId: a.chainId, price, currency: 'USD',
  totalAmount: total, availableAmount: avail, minLimit: '10', maxLimit: String(Number(avail) * Number(price)),
  paymentMethods: [pmDetail(payMethods[i % 3])], remarks: 'Fast release, please pay within 15 minutes.', status: 'ACTIVE',
  seller: { id: hex(8400 + i), trustScore: trust, status: 'ACTIVE', totalTrades: trades, completionRate: 96 + (i % 4), completedOrders: trades - 5, positiveFeedbacks: trades - 12, name },
  createdAt: ago(i * DAY), updatedAt: ago(i * DAY / 2),
});
const p2pAds = [
  mkAd(1, 'SELL', ASSETS[1], '1.01', '5000', '3200', 'CryptoKing', 98, 412),
  mkAd(2, 'SELL', ASSETS[1], '1.02', '2500', '2500', 'SwiftTrader', 95, 188),
  mkAd(3, 'BUY', ASSETS[1], '0.99', '4000', '4000', 'BlockBuyer', 97, 301),
  mkAd(4, 'SELL', ASSETS[0], '3135', '10', '6.5', 'EthWhale', 99, 622),
  mkAd(5, 'BUY', ASSETS[7], '66900', '0.5', '0.5', 'BTCMax', 96, 144),
];
const myAds = [{ ...mkAd(9, 'SELL', ASSETS[1], '1.015', '1000', '640', 'You', 100, 22), userId: { _id: USER_ID } }];
const p2pOrders: any[] = [
  { _id: hex(8501), adId: p2pAds[0], sellerId: hex(8401), buyerId: USER_ID, asset: ASSETS[1]._id, chainId: 'ETH',
    amount: '250', fiatAmount: '252.50', price: '1.01', currency: 'USD', status: 'COMPLETED', escrowReleased: true,
    expiresAt: ago(4 * DAY), createdAt: ago(5 * DAY), updatedAt: ago(5 * DAY), completedAt: ago(5 * DAY) },
  { _id: hex(8502), adId: p2pAds[3], sellerId: hex(8404), buyerId: USER_ID, asset: ASSETS[0]._id, chainId: 'ETH',
    amount: '0.2', fiatAmount: '627.00', price: '3135', currency: 'USD', status: 'FIAT_SENT', escrowReleased: false,
    expiresAt: ago(-0.01 * DAY), createdAt: ago(0.05 * DAY), updatedAt: ago(0.02 * DAY), fiatSentAt: ago(0.02 * DAY) },
];

// Support
const faqs = [
  ['How do I deposit crypto?', 'Open Receive, pick a network and asset, then share your deposit address or QR code.', 'Wallet'],
  ['How long do withdrawals take?', 'Most withdrawals complete within 10–30 minutes depending on network congestion.', 'Wallet'],
  ['Are there fees on card spending?', 'Virtual cards have no monthly fee. FX fees may apply for non-USD purchases.', 'Cards'],
  ['How does Earn work?', 'Subscribe to a flexible or fixed product. Rewards accrue daily and can be redeemed anytime (fixed products may carry an early-exit penalty).', 'Earn'],
  ['What is LTV?', 'Loan-to-Value is the ratio between your borrowed amount and the value of your collateral.', 'Loans'],
].map(([question, answer, category], i) => ({ id: hex(9300 + i), question, answer, category, createdAt: ago(60 * DAY) }));
const tickets: any[] = [
  { id: hex(9400), userId: USER_ID, title: 'Card limit question', description: 'Can I raise my daily card limit?', status: 'resolved',
    createdAt: ago(9 * DAY), updatedAt: ago(8 * DAY), adminResponse: 'Yes — limits scale with your tier. We have raised it for you.', adminResponseAt: ago(8 * DAY) },
];

// Scratch cards
const scratchCards: any[] = [
  ['Welcome Bonus', 10, 'pending'], ['Referral Reward', 5, 'pending'], ['Loyalty Treat', 2.5, 'opened'], ['Birthday Gift', 15, 'redeemed'],
].map(([title, reward, status], i) => ({
  _id: hex(9500 + i), scratchCardId: hex(9600 + i), userId: USER_ID, assignedBy: hex(2),
  title, description: 'Scratch to reveal your reward', imageUrl: null, reward, couponCode: `NEO${1000 + i}`,
  link: null, reason: 'Demo reward', triggerRef: null, status,
  openedOn: status !== 'pending' ? ago(DAY) : null, redeemedOn: status === 'redeemed' ? ago(DAY) : null,
  createdAt: ago(5 * DAY), updatedAt: ago(DAY),
}));

// MoonPay
const mpCrypto = ASSETS.map((a, i) => ({
  id: `mp_${i}`, type: 'crypto', name: a.name, code: a.symbol.toLowerCase(), precision: 6, decimals: a.decimals, icon: '',
  minBuyAmount: 20, maxBuyAmount: 20000, minSellAmount: 20, maxSellAmount: 20000, isSellSupported: true,
  supportsLiveMode: true, isSuspended: false, isStableCoin: ['USDT', 'USDC'].includes(a.symbol),
  metadata: { contractAddress: a.assetAddress || null, chainId: null, networkCode: a.chainId.toLowerCase(), coinType: null },
}));
const mpFiat = ['usd', 'eur', 'gbp', 'inr'].map((c, i) => ({
  id: `mpf_${i}`, type: 'fiat', name: c.toUpperCase(), code: c, precision: 2, decimals: 2, icon: '', minBuyAmount: 20, maxBuyAmount: 20000,
  isSellSupported: true, isBuySupported: true, isSuspended: false,
}));
const mpCountries = [['GB', 'GBR', 'United Kingdom'], ['US', 'USA', 'United States'], ['IN', 'IND', 'India'], ['DE', 'DEU', 'Germany'], ['AE', 'ARE', 'UAE']]
  .map(([alpha2, alpha3, name]) => ({ alpha2, alpha3, name, isAllowed: true, isBuyAllowed: true, isSellAllowed: true }));

// ─── mutable state ────────────────────────────────────────────────────────────
let creditActive = true;
let pinSet = true;
let twoFA = false;

// ─── tiny router ──────────────────────────────────────────────────────────────
type Ctx = { method: string; path: string; params: any; body: any; m: RegExpMatchArray | null };
type Handler = (c: Ctx) => any;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, re: RegExp, h: Handler) => routes.push([method, re, h]);

const pageOf = (arr: any[], c: Ctx, key = 'items') => {
  const page = Number(c.params?.page ?? 1), limit = Number(c.params?.limit ?? 20);
  const slice = arr.slice((page - 1) * limit, page * limit);
  return { [key]: slice, total: arr.length, page, limit, totalPages: Math.max(1, Math.ceil(arr.length / limit)) };
};

// ── Auth / profile
on('POST', /\/users\/auth\/login$/, (c) => {
  const email = c.body?.email || user.email;
  return ok({ token: 'demo-token-' + Date.now(), user: { ...user, email } }, 'Login successful');
});
on('POST', /\/users\/auth\/register$/, () => ok({}, 'Registered. OTP sent.'));
on('POST', /\/users\/auth\/send-otp-register$/, () => ok({}, 'OTP sent (demo: use any code)'));
on('POST', /\/users\/auth\/verify-otp-register$/, () => ok({ token: 'demo-token-' + Date.now(), user }, 'Verified'));
on('GET', /\/users\/profile$/, () => ok({ user }));
on('POST', /\/users\/logout(-all)?$/, () => ok({}));
on('POST', /\/users\/(forgot-password|verify-otp|reset-password)$/, () => ok({}, 'Done'));
on('PUT', /\/users\/update\/[^/]+$/, (c) => { Object.assign(user, c.body); return ok({ user }, 'Profile updated'); });
on('POST', /\/notifications\/push-token$/, () => ok({}));
on('DELETE', /\/notifications\/push-token$/, () => ok({}));
on('GET', /\/kyc\/status$/, () => ok({ kycStatus: 'Approved', kycNote: null, kycUrl: null, sessionId: 'sess_demo', tevauKycStatus: 'approved' }));
on('POST', /\/kyc\/initiate$/, () => ok({ url: 'https://example.com/kyc', sessionId: 'sess_demo', user: { kycStatus: 'Approved' } }));

// ── 2FA / PIN
on('POST', /\/users\/2fa\/toggle$/, (c) => { twoFA = !!c.body?.enable; user.twoFactorEnabled = twoFA; return { status: 'success', success: true, otpSent: true, message: '2FA updated' }; });
on('POST', /\/users\/verify-email-2fa$/, () => ({ status: 'success', success: true, message: 'Verified', twoFactorEnabled: true }));
on('POST', /\/users\/2fa\/setup-authenticator$/, () => ({ success: true, secret: 'JBSWY3DPEHPK3PXP', qrCode: '', otpauth: 'otpauth://totp/NeoBank:demo?secret=JBSWY3DPEHPK3PXP' }));
on('POST', /\/users\/2fa\/verify-authenticator$/, () => ({ success: true, message: 'Verified', twoFactorEnabled: true }));
on('GET', /\/users\/get-referred-users-and-earnings$/, () => ok({ totalEarnings: 125, referrals: [
  { name: 'Sarah K.', email: 's***@mail.com', earnings: 50, joinedAt: ago(14 * DAY) },
  { name: 'Mike T.', email: 'm***@mail.com', earnings: 75, joinedAt: ago(30 * DAY) }] }));
on('GET', /\/users\/get\/pin-set$/, () => ok({ isPinSet: pinSet, pinSet, hasPin: pinSet }));
on('POST', /\/users\/(set-pin|change-pin)$/, () => { pinSet = true; return ok({}, 'PIN saved'); });
on('POST', /\/users\/verify-pin$/, () => ok({ verified: true, valid: true }, 'PIN verified'));

// ── Wallet
on('GET', /\/userWallet\/dashboard$/, () => ok(dashboard()));
on('GET', /\/userWallet\/getAllWallets$/, () => ok(walletRows()));
on('GET', /\/userWallet\/getSupportedBlockchain$/, () => ok(CHAINS));
on('GET', /\/asset\/getAssetsByChain$/, (c) => {
  const id = String(c.params?.chainId ?? '').toUpperCase().replace('TRX', 'TRON');
  return ok(ASSETS.filter((a) => a.chainId === id).map((a) => ({ ...a, balance: String(balances[a._id] ?? 0) })));
});
on('GET', /\/asset\/list$/, () => ok(ASSETS));
on('GET', /\/userWallet\/deposit-address$/, (c) => {
  const a = assetById(c.params?.assetId) ?? ASSETS[0];
  const addr = a.chainId === 'BTC' ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    : a.chainId === 'TRON' ? 'TQrY8tryqsYVCYS3MFbtffiPp2ccyn4STm'
    : '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  return ok({ address: addr, depositAddress: addr, memo: '', chainId: a.chainId, assetId: a._id });
});
on('GET', /\/userWallet\/me\/([^/]+)\/([^/]+)$/, (c) => {
  const id = c.m![2];
  return ok({ availableBalance: String(balances[id] ?? 0), lockedBalance: String(locked[id] ?? 0) });
});
on('GET', /\/userWallet\/me$/, (c) => {
  const chain = c.params?.chain ? String(c.params.chain).toUpperCase() : null;
  return ok(walletRows().filter((w) => !chain || w.chainId === chain));
});
on('GET', /\/userWallet\/transactions\/history\/([^/]+)$/, (c) => ok(txs.find((t) => t._id === c.m![1]) ?? txs[0]));
on('GET', /\/userWallet\/transactions\/history$/, (c) => ok(pageOf(txs, c)));
on('GET', /\/userWallet\/transactions\/export$/, () => ok({ url: '' }, 'Export is disabled in demo'));
const spend = (assetId: string, amount: number, type: string, note: string, extra: object = {}) => {
  const a = assetById(assetId) ?? ASSETS[0];
  balances[a._id] = Math.max(0, (balances[a._id] ?? 0) - amount);
  txs.unshift({ _id: hex(3500 + txs.length), userId: USER_ID, asset: { _id: a._id, name: a.name, symbol: a.symbol },
    type, status: type === 'WITHDRAW' ? 'PENDING' : 'COMPLETED', amount: String(amount), note, fee: '0',
    txHash: `0x${hex(9900 + txs.length)}`, usdValue: (amount * (a.priceUsd ?? 0)).toFixed(2),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...extra });
};
on('POST', /\/userWallet\/sendCrypto$/, (c) => { spend(c.body.assetId, Number(c.body.amount), 'INTERNAL_SEND', `Sent to ${c.body.to}`); return ok({ txId: hex(1) }, 'Sent successfully'); });
on('POST', /\/userWallet\/withdraw$/, (c) => { spend(c.body.assetId, Number(c.body.amount), 'WITHDRAW', 'Withdrawal to external wallet', { toAddress: c.body.toAddress }); return ok({ txId: hex(2) }, 'Withdrawal submitted'); });

// ── Swap
const fromRaw = (raw: string, dec: number) => Number(raw) / Math.pow(10, dec);
const toRaw = (v: number, dec: number) => {
  const s = Math.floor(v * 1e6);
  return dec >= 6 ? (BigInt(s) * BigInt(10) ** BigInt(dec - 6)).toString() : String(Math.floor(v * Math.pow(10, dec)));
};
on('POST', /\/swap\/quote$/, (c) => {
  const f = assetById(c.body.fromAssetId) ?? ASSETS[0], t = assetById(c.body.toAssetId) ?? ASSETS[1];
  const out = (fromRaw(c.body.amount, f.decimals) * (f.priceUsd ?? 1)) / (t.priceUsd ?? 1) * 0.997;
  return ok({ dstAmount: toRaw(out, t.decimals), minOut: toRaw(out * 0.99, t.decimals), slippage: 1 });
});
const swaps: any[] = [
  { _id: hex(9700), fromAsset: { symbol: 'ETH', name: 'Ethereum', _id: ASSETS[0]._id }, toAsset: { symbol: 'USDT', name: 'Tether', _id: ASSETS[1]._id },
    fromAmount: '0.25', toAmount: '776.9', status: 'completed', chainId: 'ETH', txHash: `0x${hex(9701)}`, fee: '0.78', createdAt: ago(4 * DAY), updatedAt: ago(4 * DAY) },
  { _id: hex(9702), fromAsset: { symbol: 'USDT', name: 'Tether', _id: ASSETS[1]._id }, toAsset: { symbol: 'BTC', name: 'Bitcoin', _id: ASSETS[7]._id },
    fromAmount: '500', toAmount: '0.00741', status: 'completed', chainId: 'ETH', txHash: `0x${hex(9703)}`, fee: '1.5', createdAt: ago(11 * DAY), updatedAt: ago(11 * DAY) },
];
on('POST', /\/swap\/execute$/, (c) => {
  const f = assetById(c.body.fromAssetId) ?? ASSETS[0], t = assetById(c.body.toAssetId) ?? ASSETS[1];
  const inAmt = fromRaw(c.body.amount, f.decimals);
  const out = (inAmt * (f.priceUsd ?? 1)) / (t.priceUsd ?? 1) * 0.997;
  balances[f._id] = Math.max(0, (balances[f._id] ?? 0) - inAmt);
  balances[t._id] = (balances[t._id] ?? 0) + out;
  const s = { _id: hex(9800 + swaps.length), fromAsset: { symbol: f.symbol, name: f.name, _id: f._id }, toAsset: { symbol: t.symbol, name: t.name, _id: t._id },
    fromAmount: String(inAmt), toAmount: String(out), status: 'completed', chainId: f.chainId, txHash: `0x${hex(9900 + swaps.length)}`, fee: '0', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  swaps.unshift(s);
  return ok(s, 'Swap completed');
});
on('GET', /\/swap\/history$/, (c) => ok(pageOf(swaps, c)));
on('GET', /\/swap\/portfolio$/, () => ok({ totalSwaps: swaps.length, totalVolumeUsd: 1277.25 }));
on('GET', /\/swap\/active$/, () => ok([]));
on('POST', /\/swap\/[^/]+\/cancel$/, () => ok({}, 'Cancelled'));
on('GET', /\/swap\/([^/]+)$/, (c) => ok(swaps.find((s) => s._id === c.m![1]) ?? swaps[0]));

// ── Notifications
on('GET', /\/notifications\/last$/, () => ok({ notification: notifications[0] }));
on('PATCH', /\/notifications\/read-all$/, () => { notifications.forEach((n) => (n.read = true)); return ok({}); });
on('PATCH', /\/notifications\/read\/([^/]+)$/, (c) => { const n = notifications.find((x) => x._id === c.m![1]); if (n) n.read = true; return ok({ notification: n }); });
on('GET', /\/notifications$/, () => ok({ notifications, total: notifications.length, unreadCount: notifications.filter((n) => !n.read).length }));

// ── Support
on('GET', /\/support\/get\/faq$/, () => ({ success: true, data: faqs }));
on('GET', /\/support\/get\/contact\/by-users$/, () => ({ success: true, data: tickets }));
on('POST', /\/support\/create\/contact\/by-user$/, (c) => {
  const t = { id: hex(9450 + tickets.length), userId: USER_ID, title: c.body.title, description: c.body.description, status: 'open', createdAt: new Date().toISOString() };
  tickets.unshift(t); return { success: true, data: t, message: 'Ticket created' };
});

// ── Scratch cards
on('GET', /\/scratch-cards$/, () => ok(scratchCards));
on('PATCH', /\/scratch-cards\/([^/]+)\/open$/, (c) => { const s = scratchCards.find((x) => x._id === c.m![1]); if (s) { s.status = 'opened'; s.openedOn = new Date().toISOString(); } return ok(s); });
on('PATCH', /\/scratch-cards\/([^/]+)\/redeem$/, (c) => { const s = scratchCards.find((x) => x._id === c.m![1]); if (s) { s.status = 'redeemed'; s.redeemedOn = new Date().toISOString(); balances[ASSETS[1]._id] += s.reward; } return ok(s); });

// ── Payment methods
on('GET', /\/payment-methods\/my-accounts$/, () => ok(payAccounts));
on('POST', /\/payment-methods\/my-accounts$/, (c) => {
  const m = payMethods.find((x) => x._id === c.body.paymentMethodId) ?? payMethods[0];
  const a = { _id: hex(8150 + payAccounts.length), userId: USER_ID, paymentMethodId: m, label: c.body.label, fieldValues: c.body.fieldValues, isDefault: !!c.body.isDefault,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  payAccounts.push(a); return ok(a, 'Account added');
});
on('DELETE', /\/payment-methods\/my-accounts\/([^/]+)$/, (c) => { const i = payAccounts.findIndex((x) => x._id === c.m![1]); if (i >= 0) payAccounts.splice(i, 1); return ok({}); });
on('PATCH', /\/payment-methods\/my-accounts\/([^/]+)\/set-default$/, (c) => { payAccounts.forEach((x) => (x.isDefault = x._id === c.m![1])); return ok({}); });
on('GET', /\/payment-methods\/([^/]+)$/, (c) => ok(payMethods.find((x) => x._id === c.m![1]) ?? payMethods[0]));
on('GET', /\/payment-methods$/, () => ok({ methods: payMethods, total: payMethods.length, totalPages: 1, page: 1 }));

// ── Earn
const earnTotals = () => {
  const staked = earnPositions.filter((p) => p.status === 'ACTIVE').reduce((s, p) => s + Number(p.amount) * (ASSETS.find((a) => a.symbol === p.asset)?.priceUsd ?? 1), 0);
  const earned = earnPositions.reduce((s, p) => s + Number(p.earned) * (ASSETS.find((a) => a.symbol === p.asset)?.priceUsd ?? 1), 0);
  return { totalStaked: Number(staked.toFixed(2)), totalEarned: Number(earned.toFixed(2)) };
};
on('GET', /\/earn\/products$/, () => ok(earnProducts));
on('GET', /\/earn\/dashboard$/, () => ok({ ...earnTotals(), positions: earnPositions, rank: 42 }));
on('GET', /\/earn\/portfolio$/, () => ok({ ...earnTotals(), activePositions: earnPositions.length, positions: earnPositions }));
on('GET', /\/earn\/positions$/, () => ok(earnPositions));
on('GET', /\/earn\/position\/([^/]+)$/, (c) => ok(earnPositions.find((p) => p._id === c.m![1]) ?? earnPositions[0]));
on('GET', /\/earn\/leaderboard$/, () => ok(['whale***@mail.com', 'defi***@mail.com', 'stak***@mail.com', 'demo@neobank.app', 'yiel***@mail.com'].map((email, i) => (
  { _id: hex(5200 + i), userId: { _id: hex(5300 + i), email }, totalStaked: String(50000 - i * 7500), totalEarned: String(4200 - i * 700), createdAt: ago(90 * DAY), updatedAt: ago(DAY), rank: i + 1 }))));
on('GET', /\/earn\/rewardHistory$/, (c) => {
  const items = Array.from({ length: 14 }, (_, i) => ({
    _id: hex(5400 + i), type: i === 13 ? 'SUBSCRIBE' : 'DAILY_REWARD',
    asset: { _id: ASSETS[1]._id, chainId: 'ETH', name: 'Tether', symbol: 'USDT' },
    amount: i === 13 ? '1000' : (0.21 + (i % 3) * 0.01).toFixed(2), note: i === 13 ? 'Subscribed to USDT Flexible' : 'Daily reward',
    createdAt: ago(i * DAY), updatedAt: ago(i * DAY) }));
  return ok(pageOf(items, c, 'data'));
});
on('POST', /\/earn\/subscribe$/, (c) => {
  const p = earnProducts.find((x) => x.id === c.body.productId) ?? earnProducts[0];
  earnPositions.unshift({ _id: hex(5150 + earnPositions.length), userId: USER_ID, productId: nestedProduct(p), asset: p.symbol, chainId: 'ETH', amount: c.body.amount, earned: '0',
    startAt: new Date().toISOString(), endAt: p.duration ? ago(-p.duration * DAY) : null, lastAccruedAt: new Date().toISOString(), status: 'ACTIVE',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  return ok({}, 'Subscribed');
});
on('POST', /\/earn\/redeem\/([^/]+)$/, (c) => { const p = earnPositions.find((x) => x._id === c.m![1]); if (p) p.status = 'REDEEMED'; return ok({}, 'Redeemed'); });
on('POST', /\/earn\/preview$/, (c) => {
  const p = earnProducts.find((x) => x.id === c.body.productId) ?? earnProducts[0]; const y = Number(c.body.amount || 0) * p.apy / 100;
  return ok({ dailyEarn: y / 365, monthlyEarn: y / 12, yearlyEarn: y });
});
on('GET', /\/earn\/redeem-preview\/([^/]+)$/, (c) => {
  const p = earnPositions.find((x) => x._id === c.m![1]) ?? earnPositions[0];
  const pr = Number(p.amount), e = Number(p.earned), pen = p.productId.type === 'FIXED' ? pr * 0.02 : 0;
  return ok({ principal: pr, totalEarned: e, penalty: pen, finalReward: pr + e - pen });
});
on('POST', /\/earn\/calculator$/, (c) => {
  const p = earnProducts.find((x) => x.id === c.body.productId) ?? earnProducts[0];
  const amt = Number(c.body.amount || 0), days = Number(c.body.days || 30), yearly = amt * p.apy / 100;
  const total = yearly / 365 * days, pen = c.body.isEarly === 'true' && p.type === 'fixed' ? amt * 0.02 : 0;
  return ok({ apy: p.apy, amount: amt, durationDays: days, dailyEarn: yearly / 365, monthlyEarn: yearly / 12, yearlyEarn: yearly, totalEarn: total, penalty: pen, totalReturn: amt + total - pen });
});

// ── Credit
const creditNumbers = () => {
  const limit = creditCollateral.reduce((s, c) => s + Number(c.usdValue) * c.ltv / 100, 0);
  const used = 1000;
  return { totalLimit: Number(limit.toFixed(2)), usedCredit: used, availableCredit: Number((limit - used).toFixed(2)), interestAccrued: 12.8, interestRate: 5.5, riskScore: 0.22, riskLevel: 'SAFE' };
};
on('GET', /\/credit\/account$/, () => ok(creditNumbers()));
on('GET', /\/credit\/overview$/, () => ok(creditNumbers()));
on('POST', /\/credit\/activate$/, () => { creditActive = true; return ok({}); });
on('GET', /\/credit\/(health|risk)$/, () => ok({ riskScore: 0.22, riskLevel: 'SAFE', liquidationThreshold: 0.8, safeBorrowLimit: creditNumbers().availableCredit, liquidationPrice: 1850, warningMessage: 'Your position is healthy with low risk' }));
on('GET', /\/credit\/supported-assets$/, () => ok([ASSETS[0], ASSETS[7], ASSETS[3], ASSETS[1]].map((a, i) => ({
  creditAssetConfigId: hex(6200 + i), assetId: a._id, symbol: a.symbol, name: a.name, chainId: a.chainId, decimals: a.decimals,
  ltv: [70, 65, 60, 90][i], interestRate: 5.5, liquidationThreshold: 80, user_balance: balances[a._id], user_balance_usd: balances[a._id] * (a.priceUsd ?? 0) }))));
on('GET', /\/credit\/preview-limit$/, (c) => { const a = assetById(c.params?.assetId) ?? ASSETS[0]; const usd = Number(c.params?.amount || 0) * (a.priceUsd ?? 0); return ok({ collateralUsd: usd, newLimit: usd * 0.7, maxBorrow: usd * 0.7, ltv: 70 }); });
on('GET', /\/credit\/listCollateral$/, () => ok(creditCollateral));
on('POST', /\/credit\/collateral$/, (c) => {
  const a = assetById(c.body.assetId) ?? ASSETS[0];
  creditCollateral.push({ _id: hex(6050 + creditCollateral.length), asset: { symbol: a.symbol, name: a.name, chainId: a.chainId }, amount: String(c.body.amount), usdValue: String(c.body.amount * (a.priceUsd ?? 0)), ltv: c.body.ltv ?? 70, chainId: a.chainId, status: 'ACTIVE' });
  return ok({}, 'Collateral added');
});
on('POST', /\/credit\/removeCollateral\/([^/]+)$/, (c) => { const i = creditCollateral.findIndex((x) => x._id === c.m![1]); if (i >= 0) creditCollateral.splice(i, 1); return ok({}); });
on('POST', /\/credit\/borrow$/, (c) => { creditTxns.unshift({ _id: hex(6150 + creditTxns.length), type: 'BORROW', amount: Number(c.body.amount), createdAt: new Date().toISOString() }); return ok({}, 'Borrowed'); });
on('POST', /\/credit\/repay$/, (c) => { creditTxns.unshift({ _id: hex(6150 + creditTxns.length), type: 'REPAY', amount: Number(c.body.amount), createdAt: new Date().toISOString() }); return ok({}, 'Repaid'); });
on('GET', /\/credit\/repay-preview$/, (c) => { const a = Number(c.params?.amount || 0); return ok({ outstanding_balance: 1012.8, principal: 1000, interest: 12.8, new_available: creditNumbers().availableCredit + a, new_risk_level: 'SAFE' }); });
on('GET', /\/credit\/transactions$/, (c) => {
  const t = c.params?.type ? creditTxns.filter((x) => x.type === c.params.type) : creditTxns;
  return { status: 'success', success: true, data: t, total: t.length, totalPages: 1 };
});

// ── Loans
on('GET', /\/loan\/pairs$/, () => ok(loanPairs));
on('POST', /\/loan\/preview$/, (c) => {
  const pair = loanPairs.find((p) => p.pairId === c.body.pairId) ?? loanPairs[0];
  const col = assetById(pair.collateral.id) ?? ASSETS[0]; const usd = Number(c.body.collateralAmount || 0) * (col.priceUsd ?? 0);
  return ok({ collateralUsd: usd, maxBorrow: usd * pair.ltv / 100, ltv: pair.ltv, marginCall: 78, liquidation: 85, interest: pair.interest, dailyInterest: pair.interest / 365 });
});
on('GET', /\/loan\/my$/, () => ok(activeLoans));
on('GET', /\/loan\/completed$/, () => ok(doneLoans));
on('GET', /\/loan\/stats$/, () => ok({ activeLoans: activeLoans.length, totalLoans: activeLoans.length + doneLoans.length, totalBorrowedUsd: 3200, totalCollateralUsd: 6434.6,
  totalInterestAccrued: 21.4, avgInterestRate: 9.5, currentLtv: 49.7, health: 'SAFE', liquidationRisk: false, lastLoanAt: activeLoans[1].createdAt }));
on('GET', /\/loan\/getLoanDetail\/([^/]+)$/, (c) => { const l = [...activeLoans, ...doneLoans].find((x) => x._id === c.m![1]) ?? activeLoans[0]; return ok({ ...l, currentLtv: l.ltv }); });
on('GET', /\/loan\/Transactions\/([^/]+)\/tx$/, (c) => ok(['BORROW', 'REPAY', 'ADD_COLLATERAL'].map((type, i) => ({
  _id: hex(7300 + i), loanId: c.m![1], userId: USER_ID, type, amount: [2000, 250, 0.1][i], note: type.replace('_', ' ').toLowerCase(), createdAt: ago((20 - i * 6) * DAY), updatedAt: ago((20 - i * 6) * DAY) }))));
on('POST', /\/loan\/create$/, (c) => {
  const col = assetById(c.body.collateralAsset) ?? ASSETS[0], bor = assetById(c.body.borrowAsset) ?? ASSETS[1];
  const usd = Number(c.body.collateralAmount) * (col.priceUsd ?? 0); const borrowed = (usd * Number(c.body.ltv) / 100).toFixed(2);
  const l = mkLoan(10 + activeLoans.length, 'ACTIVE', col, bor, c.body.collateralAmount, usd.toFixed(2), borrowed, Number(c.body.ltv), 0);
  activeLoans.unshift(l); balances[bor._id] = (balances[bor._id] ?? 0) + Number(borrowed); return ok(l, 'Loan created');
});
on('POST', /\/loan\/(repay|add-collateral|withdraw-collateral)\/([^/]+)$/, (c) => ok(activeLoans.find((x) => x._id === c.m![2]) ?? activeLoans[0], 'Done'));
on('POST', /\/loan\/close\/([^/]+)$/, (c) => {
  const i = activeLoans.findIndex((x) => x._id === c.m![1]); if (i >= 0) { const [l] = activeLoans.splice(i, 1); l.status = 'CLOSED'; doneLoans.unshift(l); } return ok({}, 'Closed');
});

// ── P2P
on('GET', /\/p2p\/ads\/my$/, () => ok({ page: 1, limit: 10, total: myAds.length, totalData: myAds.length, totalPage: 1, ads: myAds }));
on('GET', /\/p2p\/ads$/, (c) => {
  let ads = p2pAds;
  const t = c.params?.type, sym = c.params?.asset;
  if (t) ads = ads.filter((a) => a.type === t);
  if (sym) ads = ads.filter((a) => assetById(a.asset)?.symbol === sym);
  return ok({ page: 1, limit: 10, total: ads.length, totalData: ads.length, totalPage: 1, ads });
});
on('POST', /\/p2p\/ads$/, (c) => { const a = assetById(c.body.asset) ?? ASSETS[1]; const ad = { ...mkAd(20 + myAds.length, c.body.type, a, c.body.price, c.body.totalAmount, c.body.totalAmount, 'You', 100, 0), userId: { _id: USER_ID } }; myAds.unshift(ad); return ok(ad, 'Ad created'); });
on('PATCH', /\/p2p\/ads\/([^/]+)$/, (c) => { const a = myAds.find((x) => x._id === c.m![1]); if (a) Object.assign(a, c.body); return ok(a); });
on('DELETE', /\/p2p\/ads\/([^/]+)$/, (c) => { const i = myAds.findIndex((x) => x._id === c.m![1]); if (i >= 0) myAds.splice(i, 1); return ok({}); });
on('GET', /\/p2p\/orders\/my$/, () => ok(p2pOrders));
on('GET', /\/p2p\/orders\/([^/]+)$/, (c) => ok({ ...(p2pOrders.find((o) => o._id === c.m![1]) ?? p2pOrders[0]), role: 'BUYER', paymentMethods: [payMethods[0]._id] }));
on('POST', /\/p2p\/orders\/([^/]+)\/(cancel|fiat-sent|release|rate|dispute)$/, (c) => {
  const o = p2pOrders.find((x) => x._id === c.m![1]) ?? p2pOrders[0];
  const map: any = { cancel: 'CANCELLED', 'fiat-sent': 'FIAT_SENT', release: 'COMPLETED', dispute: 'DISPUTED' };
  if (map[c.m![2]]) o.status = map[c.m![2]]; return ok(o, 'Done');
});
on('GET', /\/p2p\/trade-request\/my$/, () => ok([]));
on('POST', /\/p2p\/(trade-request|orders)$/, (c) => {
  const ad = p2pAds.find((a) => a._id === c.body.adId) ?? p2pAds[0];
  const o = { _id: hex(8600 + p2pOrders.length), adId: ad, sellerId: hex(8401), buyerId: USER_ID, asset: ad.asset, chainId: ad.chainId, amount: c.body.amount,
    fiatAmount: (Number(c.body.amount) * Number(ad.price)).toFixed(2), price: ad.price, currency: ad.currency, status: 'ESCROW_LOCKED', escrowReleased: false,
    expiresAt: ago(-0.01 * DAY), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  p2pOrders.unshift(o); return ok(o, 'Order placed');
});

// ── MoonPay
on('GET', /\/moonpay\/currencies\/fiat$/, () => ({ success: true, data: mpFiat }));
on('GET', /\/moonpay\/currencies\/crypto$/, () => ({ success: true, data: mpCrypto }));
on('GET', /\/moonpay\/currencies$/, () => ({ success: true, data: [...mpCrypto, ...mpFiat] }));
on('GET', /\/moonpay\/countries$/, () => ({ success: true, data: mpCountries }));
on('POST', /\/moonpay\/quote\/buy$/, (c) => {
  const a = ASSETS.find((x) => x.symbol.toLowerCase() === String(c.body.currencyCode).toLowerCase()) ?? ASSETS[0]; const amt = Number(c.body.amount || 0);
  const fee = amt * 0.035; return { success: true, data: { baseCurrencyCode: c.body.baseCurrencyCode ?? 'usd', baseCurrencyAmount: amt, currencyCode: c.body.currencyCode,
    quoteCurrencyAmount: (amt - fee - 2) / (a.priceUsd ?? 1), feeAmount: fee, networkFeeAmount: 2, totalAmount: amt } };
});
on('POST', /\/moonpay\/quote\/sell$/, (c) => {
  const a = ASSETS.find((x) => x.symbol.toLowerCase() === String(c.body.currencyCode).toLowerCase()) ?? ASSETS[0]; const amt = Number(c.body.amount || 0);
  return { success: true, data: { baseCurrencyCode: c.body.currencyCode, baseCurrencyAmount: amt, quoteCurrencyCode: c.body.baseCurrencyCode ?? 'usd',
    quoteCurrencyAmount: amt * (a.priceUsd ?? 1) * 0.96, feeAmount: amt * (a.priceUsd ?? 1) * 0.03, networkFeeAmount: 1 } };
});
on('POST', /\/moonpay\/(buy|sell)$/, () => ({ success: true, data: { url: 'https://example.com/demo-checkout', status: 'pending', transactionId: 'mp_demo_001',
  meta: { userEmail: user.email, walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', chain: 'ETH', asset: 'USDT' } } }));
on('GET', /\/moonpay\/transactions$/, () => ({ success: true, data: [] }));
on('GET', /\/moonpay\/transaction\/([^/]+)$/, () => ({ success: true, data: { id: 'mp_demo_001', status: 'completed' } }));

// ── Cards (Interlace — modules/Cards3)
const IL = '/interlaceCard';
on('POST', new RegExp(IL + '/account/create$'), () => ok({ accountId: 'acc_demo_001', interlaceDisplayId: 'NB-100245' }));
on('GET', new RegExp(IL + '/accounts$'), () => ok({ list: [{ id: 'acc_demo_001', displayId: 'NB-100245', status: 'ACTIVE' }], total: 1 }));
on('POST', new RegExp(IL + '/account/submit-kyc$'), () => ok({ status: 'SUBMITTED' }));
on('GET', new RegExp(IL + '/kyc-verification-result$'), () => ok({ kyc: { status: 'PASSED', caseId: 'case_demo', accountId: 'acc_demo_001' } }));
on('POST', new RegExp(IL + '/upload-file$'), () => ok([{ fileId: 'file_demo', fileName: 'demo.jpg', url: '' }]));
on('GET', new RegExp(IL + '/occupation/occupations$'), () => ok({ docs: [
  { code: '1001', title: 'Software Engineer' }, { code: '1002', title: 'Designer' }, { code: '1003', title: 'Business Owner' },
  { code: '1004', title: 'Student' }, { code: '1005', title: 'Consultant' }], totalPages: 1, page: 1 }));
on('GET', new RegExp(IL + '/cards/transactions$'), () => ok({ list: cardTxns, total: cardTxns.length }));
on('GET', new RegExp(IL + '/cards/recommended-bin$'), () => ok({ id: 'bin_1', bin: '424242', type: 'PREPAID', currencies: ['USD'], network: 'VISA', countryRegion: 'US', supportPhysicalCard: true }));
on('GET', new RegExp(IL + '/cards/bins$'), () => ok({ list: [{ id: 'bin_1', bin: '424242', type: 'PREPAID', currencies: ['USD'], network: 'VISA', countryRegion: 'US', supportPhysicalCard: true }] }));
on('GET', new RegExp(IL + '/cards/bins/maintenance$'), () => ok({ list: [] }));
on('GET', new RegExp(IL + '/cards/card-transaction-scenarios$'), () => ok({ list: [
  { code: 'ONLINE', label: 'Online purchases' }, { code: 'ATM', label: 'ATM withdrawals' }, { code: 'POS', label: 'In-store (POS)' }, { code: 'CONTACTLESS', label: 'Contactless' }] }));
on('GET', new RegExp(IL + '/cards/negative-balance$'), () => ok({ list: [] }));
on('GET', new RegExp(IL + '/cards$'), () => ok({ list: cards, total: String(cards.length) }));
on('GET', new RegExp(IL + '/cards/([^/]+)/payment-details$'), () => ok({ pan: '4242424242424242', expMonth: '08', expYear: '2029', cvv: '737' }));
on('GET', new RegExp(IL + '/cards/([^/]+)/summary$'), (c) => ok({ balance: cards.find((x) => x.id === c.m![1])?.balance ?? '0', currency: 'USD', availableToSpend: cards.find((x) => x.id === c.m![1])?.balance ?? '0' }));
on('GET', new RegExp(IL + '/cards/([^/]+)/access-token$'), () => ok({ token: 'demo-token', url: '', expiresIn: 300 }));
on('PUT', new RegExp(IL + '/cards/([^/]+)/pin$'), () => ok({ status: 'ACTIVE' }));
on('POST', new RegExp(IL + '/cards/freeze/([^/]+)$'), (c) => { const k = cards.find((x) => x.id === c.m![1]); if (k) k.status = 'FROZEN'; return ok({ status: 'FROZEN' }); });
on('POST', new RegExp(IL + '/cards/unfreeze/([^/]+)$'), (c) => { const k = cards.find((x) => x.id === c.m![1]); if (k) k.status = 'ACTIVE'; return ok({ status: 'ACTIVE' }); });
on('PUT', new RegExp(IL + '/cards/update$'), (c) => { const k = cards.find((x) => x.id === c.body.cardId); if (k && c.body.label) k.label = c.body.label; return ok(k); });
on('DELETE', new RegExp(IL + '/cards/delete/([^/]+)$'), (c) => { const i = cards.findIndex((x) => x.id === c.m![1]); if (i >= 0) cards.splice(i, 1); return ok({ status: 'INACTIVE' }); });
on('DELETE', new RegExp(IL + '/cards/batch-delete$'), (c) => { (c.body?.cards ?? []).forEach((x: any) => { const i = cards.findIndex((k) => k.id === x.cardId); if (i >= 0) cards.splice(i, 1); }); return ok({}); });
on('POST', new RegExp(IL + '/cards/(prepaid|budget-card)$'), (c) => {
  const k = { id: 'card_demo_' + (100 + cards.length), accountId: 'acc_demo_001', cardholderId: c.body.cardholderId ?? 'ch_demo_001', binId: c.body.binId ?? 'bin_1',
    label: c.body.label ?? 'New Card', status: 'ACTIVE', cardLastFour: String(1000 + Math.floor(Math.random() * 8999)), userName: 'ALEX MORGAN',
    cardMode: c.body.cardMode ?? 'VIRTUAL_CARD', currency: 'USD', balance: '0.00', bin: '424242', createTime: new Date().toISOString() };
  cards.push(k); return ok(k, 'Card created');
});
on('POST', new RegExp(IL + '/cards/([^/]+)/transaction-scenarios$'), () => ok({}));
on('POST', new RegExp(IL + '/cards/transfer-(in|out)$'), () => ok({ status: 'SUCCESS' }));
on('GET', new RegExp(IL + '/budgets$'), () => ok({ list: [{ id: 'bud_1', name: 'Monthly Budget', status: 'ACTIVE', balance: { available: '1500', currency: 'USD' } }] }));
on('POST', new RegExp(IL + '/budget$'), (c) => ok({ id: 'bud_' + Date.now(), name: c.body.name, status: 'ACTIVE', balance: { available: '0', currency: 'USD' } }));
const cardholder = { id: 'ch_demo_001', accountId: 'acc_demo_001', cardBinList: ['bin_1'], status: 'APPROVED', firstName: 'Alex', lastName: 'Morgan', userName: 'ALEX MORGAN', email: user.email, cardholderTier: 'CONSUMER' };
on('GET', new RegExp(IL + '/cardholders$'), () => ok({ list: [cardholder] }));
on('POST', new RegExp(IL + '/cardholders$'), () => ok(cardholder));
on('POST', new RegExp(IL + '/cardholders/kyc/trigger$'), () => ok({}));
on('GET', new RegExp(IL + '/cardholders/([^/]+)$'), () => ok(cardholder));
on('PATCH', new RegExp(IL + '/cardholders/([^/]+)$'), () => ok(cardholder));

// ─── adapter ──────────────────────────────────────────────────────────────────
const parseBody = (data: any) => {
  if (!data) return {};
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return {}; } }
  if (typeof FormData !== 'undefined' && data instanceof FormData) return {};
  return data;
};

export const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  await sleep(150 + Math.random() * 250);
  const method = (config.method ?? 'get').toUpperCase();
  const url = (config.url ?? '').split('?')[0];
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1\/metavault/, '');
  const ctx: Ctx = { method, path, params: config.params ?? {}, body: parseBody(config.data), m: null };

  let payload: any;
  let hit = false;
  for (const [mth, re, h] of routes) {
    if (mth !== method) continue;
    const m = path.match(re);
    if (m) { ctx.m = m; payload = h(ctx); hit = true; break; }
  }
  if (!hit) {
    console.warn(`[demo-mock] unhandled ${method} ${path} → returning empty success`);
    payload = ok(method === 'GET' ? [] : {});
  }

  const res: AxiosResponse = { data: payload, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  return res;
};

/** Offline fallback list for the Markets screen (CoinGecko is rate-limited / blocked). */
export const MOCK_COINS = [
  ['bitcoin', 'btc', 'Bitcoin', 67250, 1320000000000, 1.8], ['ethereum', 'eth', 'Ethereum', 3120.5, 375000000000, 2.4],
  ['tether', 'usdt', 'Tether', 1, 112000000000, 0.01], ['binancecoin', 'bnb', 'BNB', 612.3, 89000000000, -0.6],
  ['solana', 'sol', 'Solana', 168.2, 77000000000, 4.1], ['usd-coin', 'usdc', 'USDC', 1, 34000000000, 0],
  ['ripple', 'xrp', 'XRP', 0.54, 30000000000, -1.2], ['dogecoin', 'doge', 'Dogecoin', 0.162, 23000000000, 3.3],
  ['tron', 'trx', 'TRON', 0.162, 14000000000, 0.9], ['cardano', 'ada', 'Cardano', 0.47, 16800000000, -2.1],
  ['avalanche-2', 'avax', 'Avalanche', 36.4, 14300000000, 2.7], ['chainlink', 'link', 'Chainlink', 14.8, 8700000000, 1.4],
  ['polkadot', 'dot', 'Polkadot', 7.1, 9800000000, -0.8], ['litecoin', 'ltc', 'Litecoin', 84.2, 6300000000, 0.5],
  ['uniswap', 'uni', 'Uniswap', 9.4, 5600000000, 3.8],
].map(([id, symbol, name, current_price, market_cap, price_change_percentage_24h], i) => ({
  id, symbol, name, image: `https://assets.coingecko.com/coins/images/${i + 1}/small/${id}.png`, current_price, market_cap,
  market_cap_rank: i + 1, price_change_percentage_24h, total_volume: Number(market_cap) / 25,
  high_24h: Number(current_price) * 1.03, low_24h: Number(current_price) * 0.97,
}));
