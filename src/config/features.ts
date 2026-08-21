// ─── Central Feature Flag Config ─────────────────────────────
// Sirf yahan se control karo — .env se toggle hoga

export const FEATURES = {
  p2p: process.env.EXPO_PUBLIC_P2P_ENABLED === 'true',
  earn: process.env.EXPO_PUBLIC_EARN_ENABLED === 'true',
  loan: process.env.EXPO_PUBLIC_LOAN_ENABLED === 'true',
  creditCard: 'true',
  buy: process.env.EXPO_PUBLIC_BUY_ENABLED === 'true',
} as const;

// ─── Page Config — icon, title, description, features list ───
export type PageKey = keyof typeof FEATURES;

export interface FeatureItem {
  icon: string;
  name: string;
  desc: string;
  color: string; // for icon bg tint
}

export interface PageConfig {
  icon: string;       // main icon emoji
  title: string;      // "P2P Trading"
  accent: string;     // highlighted word "Soon"
  description: string;
  features: FeatureItem[];
  accentColor?: string; // optional custom color key — default green
}

export const PAGE_CONFIGS: Record<PageKey, PageConfig> = {
  p2p: {
    icon: '🤝',
    title: 'P2P Trading is',
    accent: 'Coming Soon',
    description:
      'Trade directly with other users — no intermediary, full control. Set your own rates and trade on your terms.',
    features: [
      { icon: '💱', name: 'Direct Trading',    desc: 'Peer to peer without middleman',    color: 'green'  },
      { icon: '🛡️', name: 'Escrow Protection', desc: 'Funds secured during trade',        color: 'blue'   },
      { icon: '⭐', name: 'Reputation System', desc: 'Trade with trusted verified users', color: 'orange' },
    ],
  },

  earn: {
    icon: '⚡',
    title: 'Earn is',
    accent: 'Coming Soon',
    description:
      'Earn rewards, stake tokens, and grow your portfolio — all in one place. Passive income made simple.',
    features: [
      { icon: '🌾', name: 'Yield Farming',   desc: 'Earn passive income on your assets', color: 'green'  },
      { icon: '🔒', name: 'Staking',          desc: 'Stake tokens and earn rewards',      color: 'blue'   },
      { icon: '💎', name: 'Liquidity Pools',  desc: 'Provide liquidity, earn fees',       color: 'purple' },
    ],
  },

  loan: {
    icon: '🏦',
    title: 'Crypto Loans are',
    accent: 'Coming Soon',
    description:
      'Borrow against your crypto without selling it. Get instant liquidity while keeping your assets.',
    features: [
      { icon: '⚡', name: 'Instant Loans',       desc: 'Get funds in minutes',                color: 'green'  },
      { icon: '📊', name: 'Flexible LTV',         desc: 'Up to 80% loan-to-value ratio',       color: 'blue'   },
      { icon: '🔄', name: 'Auto Repayment',        desc: 'Set and forget repayment schedules',  color: 'purple' },
    ],
  },

  creditCard: {
    icon: '💳',
    title: 'Crypto Card is',
    accent: 'Coming Soon',
    description:
      'Spend your crypto anywhere in the world. Real-time conversion, zero foreign fees, cashback rewards.',
    features: [
      { icon: '🌍', name: 'Global Acceptance', desc: 'Use anywhere Visa is accepted',      color: 'green'  },
      { icon: '💰', name: 'Cashback Rewards',  desc: 'Earn crypto on every purchase',      color: 'orange' },
      { icon: '⚡', name: 'Instant Convert',   desc: 'Crypto to fiat in real-time',        color: 'blue'   },
    ],
  },
    buy: {
    icon: '🛒',
    title: 'Buy Crypto is',
    accent: 'Coming Soon',
    description:
      'Buy crypto instantly with your preferred payment method. Bank transfer, UPI, cards — all supported with best rates.',
    features: [
      { icon: '💳', name: 'Multiple Payment Options', desc: 'UPI, Cards, Bank Transfer & more',  color: 'blue'   },
      { icon: '⚡', name: 'Instant Purchase',         desc: 'Get crypto in your wallet instantly', color: 'green'  },
      { icon: '💰', name: 'Best Rates',               desc: 'Competitive prices, zero hidden fees', color: 'orange' },
    ],
  },
};