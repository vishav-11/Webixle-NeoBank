// types/platformAsset.ts

// ── Hamara Platform Asset (walletService se) ───────────────────────────────
export interface PlatformAsset {
  _id:                 string;
  chainId:             string;
  assetAddress:        string;
  assetType:           string;
  coinGeckoId:         string;
  name:                string;
  symbol:              string;
  decimals:            number;
  depositEnabled:      boolean;
  withdrawalEnabled:   boolean;
  withdrawalFee:       string;
  minWithdrawalAmount: string;
  maxWithdrawalAmount: string;
  tokenName:           string;
  createdAt:           string;
  updatedAt:           string;
  // ✅ Optional - live price, baad mein separate price API se aata hai
  priceUsd?:           number;
}

// ── MoonPay Currency (moonpayService se) ──────────────────────────────────
export interface MoonPayCurrency {
  id:                   string;
  type:                 'crypto' | 'fiat';
  name:                 string;
  code:                 string;        // e.g. 'eth', 'btc', 'usdt'
  precision:            number;
  decimals:             number;
  icon:                 string;        // SVG URL
  minBuyAmount:         number | null;
  maxBuyAmount:         number | null;
  minSellAmount:        number | null;
  maxSellAmount:        number | null;
  isSellSupported:      boolean;
  supportsLiveMode:     boolean;
  isSuspended:          boolean;
  isStableCoin:         boolean;
  metadata: {
    contractAddress:    string | null;
    chainId:            string | null;
    networkCode:        string;
    coinType:           string | null;
  };
}

// ── Merged asset - Buy/Sell screen ke liye ────────────────────────────────
// Platform asset + MoonPay currency match karke banaya
export interface BuyableCrypto {
  // Platform se
  platformAssetId:  string;         // Wallet model ki Asset ObjectId
  chainId:          string;         // 'ETH', 'BTC', 'TRON' etc
  symbol:           string;         // 'ETH', 'BTC'
  name:             string;         // 'Ethereum'
  coinGeckoId:      string;

  // MoonPay se
  moonpayCode:      string;         // 'eth', 'btc' (MoonPay ka code)
  moonpayIcon:      string;         // SVG icon URL
  minBuyAmount:     number | null;
  maxBuyAmount:     number | null;
  isSellSupported:  boolean;
  minSellAmount:    number | null;
  maxSellAmount:    number | null;
  isSuspended:      boolean;

  // Live price (optional - baad mein add hoga)
  priceUsd?:        number;
  change24h?:       number;
}