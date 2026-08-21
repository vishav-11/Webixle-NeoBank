import { Platform, Alert } from 'react-native';

export const GREEN = '#22C58B';
export const RED   = '#FF5570';
export const IS_WEB = Platform.OS === 'web';

/** Removes native focus ring / shadow on web inputs */
export const webReset =
  Platform.OS === 'web'
    ? ({
        outlineWidth: 0,
        outlineStyle: 'none',
        boxShadow: 'none',
        WebkitAppearance: 'none',
      } as any)
    : {};

/** Consistent cross-platform alert */
export const showAlert = (
  title: string,
  msg?: string,
  btns?: any[],
) => {
  if (Platform.OS === 'web') {
    if (btns && btns.length > 1) {
      const ok = window.confirm(`${title}${msg ? '\n\n' + msg : ''}`);
      (
        ok
          ? btns.find((b: any) => b.style !== 'cancel')
          : btns.find((b: any) => b.style === 'cancel')
      )?.onPress?.();
    } else {
      window.alert(`${title}${msg ? '\n\n' + msg : ''}`);
      btns?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, msg, btns);
  }
};

/** Format ISO date string to readable label */
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Per-symbol gradient pairs */
const COIN_COLORS: Record<string, [string, string]> = {
  BTC:   ['#F7931A', '#E8830A'],
  ETH:   ['#627EEA', '#4A6DD8'],
  TRX:   ['#FF5570', '#E83050'],
  BNB:   ['#FFB23F', '#E09510'],
  USDT:  ['#26A17B', '#1A8A66'],
  USDC:  ['#2775CA', '#1A60B5'],
  SOL:   ['#9945FF', '#7B35E0'],
  MATIC: ['#8247E5', '#6535CC'],
};

export const coinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#334155', '#1E293B'];

export const ORDER_STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  ESCROW_LOCKED: { color: '#627EEA', bg: 'rgba(98,126,234,0.12)',  label: 'Awaiting Escrow' },
  PENDING:       { color: '#FFB23F', bg: 'rgba(245,166,35,0.12)',  label: 'Pending Payment' },
  FIAT_SENT:     { color: '#627EEA', bg: 'rgba(98,126,234,0.12)',  label: 'Payment Sent' },
  COMPLETED:     { color: GREEN,     bg: 'rgba(0,211,149,0.12)',   label: 'Completed' },
  CANCELLED:     { color: '#64748B', bg: 'rgba(100,116,139,0.12)', label: 'Cancelled' },
  DISPUTED:      { color: RED,       bg: 'rgba(255,77,106,0.12)',  label: 'Disputed' },
};

export const STATUS_COLOR: Record<string, string> =
  Object.fromEntries(Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.color]));

export const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'USDT'];
export const CURRENCY_FILTERS = ['All Currencies', ...CURRENCIES.filter(c => c !== 'USDT')];
export const AD_TYPES = ['Buy & Sell', 'BUY', 'SELL'] as const;