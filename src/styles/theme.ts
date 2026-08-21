// src/styles/theme.ts
// ============================================================
// 🎨 RATIBU NEO-BANK THEME — AUTO-RESPONSIVE
// All constants are responsive by default
// No manual rs/vs/ms calls needed in components
// ============================================================

import { Dimensions, PixelRatio,Platform } from 'react-native';

const { width } = Dimensions.get('window');
// ============================================================
// 📱 SCREEN DIMENSIONS
// ============================================================
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Base design reference (mid-range phone)
const BASE_W = 393;
const BASE_H = 852;

const scaleW = SCREEN_W / BASE_W;
const scaleH = SCREEN_H / BASE_H;

// ============================================================
// 📐 SCALE FUNCTIONS (internal — components ko manually call nahi karna)
// ============================================================

/** Horizontal scale */
const rs = (size: number): number =>
  Math.round(size * scaleW);

/** Vertical scale */
const vs = (size: number): number =>
  Math.round(size * scaleH);

/** Moderate scale — zyada bada nahi hoga */
const ms = (size: number, factor: number = 0.5): number =>
  Math.round(size + (rs(size) - size) * factor);

/** Font scale — 1.3x cap */
const fs = (size: number): number => {
  const scaled = size * scaleW;
  const capped = Math.min(scaled, size * 1.3);
  return Math.round(PixelRatio.roundToNearestPixel(capped));
};

// ============================================================
// 📱 SCREEN INFO
// ============================================================
export const Screen = {
  width:    SCREEN_W,
  height:   SCREEN_H,
  isSmall:  SCREEN_W < 380,
  isMedium: SCREEN_W >= 380 && SCREEN_W < 420,
  isLarge:  SCREEN_W >= 420,
  isTablet: SCREEN_W >= 768,
} as const;

export const DarkColors = {
  accent: '#2AA9E0',
  accentDim: 'rgba(42,169,224,0.15)',
  accentBorder: 'rgba(42,169,224,0.30)',
  accentGlow: 'rgba(42,169,224,0.35)',

  bgGradient: ['#100224', '#160530', '#100224'] as string[],
  bgGradientPos: [0, 0.38, 1] as number[],

  bg: '#100224',
  bgAlt: '#150C28',

  surface: '#180F2C',
  card: '#1D1236',
  cardAlt: '#150C28',
  cardHover: '#21133D',

  border: '#302255',
  borderSoft: '#241843',
  hover: '#2A1B4A',

  text: '#FFFFFF',
  text2: '#A99BC7',
  text3: '#7C6D9D',

  green: '#22C58B',
  greenBright: '#2ECC71',
  greenDim: 'rgba(34,197,139,0.14)',
  greenBorder: 'rgba(34,197,139,0.28)',
  greenGlow: 'rgba(34,197,139,0.30)',

  red: '#FF5570',
  redBright: '#E74C3C',
  redDim: 'rgba(255,85,112,0.14)',
  redBorder: 'rgba(255,85,112,0.30)',

  orange: '#FFB23F',
  orangeDim: 'rgba(255,178,63,0.14)',
  orangeBorder: 'rgba(255,178,63,0.30)',

  blue: '#5B8CFF',
  blueDim: 'rgba(91,140,255,0.14)',

  purple: '#9B7BFF',
  purpleDim: 'rgba(155,123,255,0.16)',

  overlay: 'rgba(0,0,0,0.72)',

  tabBar: '#150C28',
  tabBarBorder: '#302255',

  // Brand — matched to the Webixle logo mark (#9A75FF)
  primary: '#9A75FF',
  primaryBright: '#B69DFF',

  primaryDim: 'rgba(154,117,255,0.18)',
  primaryBorder: 'rgba(154,117,255,0.35)',
  primaryGlow: 'rgba(154,117,255,0.45)',

  primaryGradient: ['#9A75FF', '#6238D6'] as string[],
  cardGradient: ['#9A75FF', '#6238D6'] as string[],

  cardOverlay1: 'rgba(255,255,255,0.08)',
  cardOverlay2: 'rgba(255,255,255,0.05)',

  cardTextOnGradient: '#FFFFFF',
  cardTextOnGradientDim: 'rgba(255,255,255,0.72)',

  cardStatusBg: '#FFFFFF',
  cardStatusText: '#6238D6',

  iconTileBg: '#281B49',

  pendingColor: '#FFB23F',
};

export const LightColors = {
  accent: '#2AA9E0',
  accentDim: 'rgba(42,169,224,0.10)',
  accentBorder: 'rgba(42,169,224,0.22)',
  accentGlow: 'rgba(42,169,224,0.18)',

  bgGradient: ['#FFFFFF', '#FBFAFF', '#F6F3FF'] as string[],
  bgGradientPos: [0, 0.38, 1] as number[],

  bg: '#FFFFFF',
  bgAlt: '#F8F6FD',

  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F8F6FD',
  cardHover: '#F3EEFF',

  border: '#E7DFFC',
  borderSoft: '#F2ECFF',
  hover: '#F3EEFF',

  text: '#1A1330',
  text2: '#70638D',
  text3: '#A095BC',

  green: '#22C58B',
  greenBright: '#2ECC71',
  greenDim: 'rgba(34,197,139,0.10)',
  greenBorder: 'rgba(34,197,139,0.22)',
  greenGlow: 'rgba(34,197,139,0.18)',

  red: '#FF5570',
  redBright: '#E74C3C',
  redDim: 'rgba(255,85,112,0.10)',
  redBorder: 'rgba(255,85,112,0.22)',

  orange: '#FFB23F',
  orangeDim: 'rgba(255,178,63,0.10)',
  orangeBorder: 'rgba(255,178,63,0.22)',

  blue: '#5B8CFF',
  blueDim: 'rgba(91,140,255,0.10)',

  purple: '#9B7BFF',
  purpleDim: 'rgba(155,123,255,0.10)',

  overlay: 'rgba(20,10,40,0.35)',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E7DFFC',

  // Primary Brand — matched to the Webixle logo mark (#9A75FF)
  primary: '#9A75FF',
  primaryBright: '#6C3CE0',

  primaryDim: 'rgba(154,117,255,0.10)',
  primaryBorder: 'rgba(154,117,255,0.22)',
  primaryGlow: 'rgba(154,117,255,0.18)',

  primaryGradient: ['#9A75FF', '#6238D6'] as string[],

  // Dashboard Cards
  cardGradient: ['#9A75FF', '#6238D6'] as string[],
  cardOverlay1: 'rgba(255,255,255,0.14)',
  cardOverlay2: 'rgba(255,255,255,0.10)',

  cardTextOnGradient: '#FFFFFF',
  cardTextOnGradientDim: 'rgba(255,255,255,0.75)',

  cardStatusBg: '#FFFFFF',
  cardStatusText: '#6238D6',

  iconTileBg: '#F3EEFF',

  pendingColor: '#FFB23F',
};


export type ColorScheme = typeof DarkColors | typeof LightColors;

// ============================================================
// 🌈 GRADIENTS
// ============================================================
export const PrimaryGradients = {
  dark:  ['#6238D6', '#9A75FF'] as [string, string],
  light: ['#6238D6', '#9A75FF'] as [string, string],
} as const;

export const HeroGradients = {
  dark:  ['#2A1660', '#1C0F4A', '#120A30'] as [string, string, string],
  light: ['#5B34E0', '#7B4DFF', '#3D1FB8'] as [string, string, string],
} as const;

export const SidebarGradients = {
  dark:  ['#160B2E', '#0D0620'] as [string, string],
  light: ['#F3EEFF', '#FBFAFF'] as [string, string],
} as const;

export const SuccessGradients = {
  dark:  ['#27AE60', '#2ECC71'] as [string, string],
  light: ['#1E8449', '#27AE60'] as [string, string],
} as const;

export const AccentGradients = {
  dark:  ['#2AA9E0', '#3DBDFF'] as [string, string],
  light: ['#1E8FC0', '#2AA9E0'] as [string, string],
} as const;

// ============================================================
// 📐 TYPOGRAPHY — ✅ AUTO-RESPONSIVE
// ============================================================
export const Typography = {
  // ✅ Sizes — fs() already applied
  xs:    fs(11),
  sm:    fs(13),
  base:  fs(15),
  md:    fs(17),
  lg:    fs(20),
  xl:    fs(24),
  '2xl': fs(28),
  '3xl': fs(34),
  '4xl': fs(42),

  // Weights
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,

  // Line heights — ✅ vs() applied
  lineHeightSm:   vs(18),
  lineHeightBase: vs(22),
  lineHeightMd:   vs(26),
  lineHeightLg:   vs(30),

  // Letter spacing
  trackingTight:  -0.5,
  trackingNormal:  0,
  trackingWide:    0.5,
  trackingWider:   1.0,
} as const;

// ============================================================
// 📏 SPACING — ✅ AUTO-RESPONSIVE
// ============================================================
export const Spacing = {
  1:  ms(4,  0.3),
  2:  ms(8,  0.3),
  3:  ms(12, 0.3),
  4:  ms(16, 0.3),
  5:  ms(20, 0.3),
  6:  ms(24, 0.3),
  7:  ms(28, 0.3),
  8:  ms(32, 0.3),
  10: ms(40, 0.3),
  12: ms(48, 0.3),
  16: ms(64, 0.3),
} as const;

// ============================================================
// 🔘 RADIUS — ✅ AUTO-RESPONSIVE
// ============================================================
export const Radius = {
  xs:    ms(4,  0.2),
  sm:    ms(6,  0.2),
  md:    ms(10, 0.2),
  lg:    ms(14, 0.2),
  xl:    ms(18, 0.2),
  '2xl': ms(22, 0.2),
  '3xl': ms(28, 0.2),
  full:  999,
} as const;

// ============================================================
// 🎯 ICON SIZES — ✅ AUTO-RESPONSIVE
// ============================================================
export const IconSize = {
  xs:    ms(14, 0.4),
  sm:    ms(18, 0.4),
  md:    ms(22, 0.4),
  lg:    ms(26, 0.4),
  xl:    ms(30, 0.4),
  '2xl': ms(36, 0.4),
} as const;

// ============================================================
// 📦 ICON BOX SIZES — ✅ AUTO-RESPONSIVE
// ============================================================
export const IconBox = {
  xs:    ms(36, 0.3),
  sm:    ms(42, 0.3),
  md:    ms(48, 0.3),
  lg:    ms(52, 0.3),
  xl:    ms(60, 0.3),
  '2xl': ms(72, 0.3),
} as const;

// ============================================================
// 🌑 SHADOWS
// ============================================================
export const Shadows = {
  light: {
    sm: {
      shadowColor:   '#6238D6',
      shadowOffset:  { width: 0, height: vs(2) },
      shadowOpacity: 0.08,
      shadowRadius:  ms(4, 0.3),
      elevation:     2,
    },
    md: {
      shadowColor:   '#6238D6',
      shadowOffset:  { width: 0, height: vs(4) },
      shadowOpacity: 0.12,
      shadowRadius:  ms(8, 0.3),
      elevation:     4,
    },
    lg: {
      shadowColor:   '#6238D6',
      shadowOffset:  { width: 0, height: vs(8) },
      shadowOpacity: 0.16,
      shadowRadius:  ms(16, 0.3),
      elevation:     8,
    },
    glow: {
      shadowColor:   '#9A75FF',
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.30,
      shadowRadius:  ms(12, 0.3),
      elevation:     6,
    },
  },
  dark: {
    sm: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: vs(2) },
      shadowOpacity: 0.40,
      shadowRadius:  ms(4, 0.3),
      elevation:     2,
    },
    md: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: vs(4) },
      shadowOpacity: 0.50,
      shadowRadius:  ms(8, 0.3),
      elevation:     4,
    },
    lg: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: vs(8) },
      shadowOpacity: 0.60,
      shadowRadius:  ms(16, 0.3),
      elevation:     8,
    },
    glow: {
      shadowColor:   '#9A75FF',
      shadowOffset:  { width: 0, height: 0 },
      shadowOpacity: 0.50,
      shadowRadius:  ms(16, 0.3),
      elevation:     8,
    },
  },
} as const;

// ============================================================
// 📱 LAYOUT CONSTANTS
// ============================================================
export const SIDEBAR_WIDTH  = 240;
export const HEADER_HEIGHT  = vs(60);
export const IS_WEB = Platform.OS === 'web';
export const WEB_TABLET_BP  = 768;
export const WEB_DESKTOP_BP = 1024;

export const IS_MOBILE_WEB = IS_WEB && width < WEB_TABLET_BP;
export const IS_DESKTOP_WEB = IS_WEB && width >= WEB_TABLET_BP;

// ✅ Web desktop pe bottom tab nahi hota — sidebar hota hai
export const BOTTOM_TAB_H = IS_DESKTOP_WEB ? 0 : vs(68);


// ============================================================
// 🔧 HELPER FUNCTIONS
// ============================================================

export const getSidebarWidth = (screenWidth: number): number => {
  // Fix: Laptop/Desktop ke liye fixed pixel width (ms hata diya hai)
  if (screenWidth >= WEB_DESKTOP_BP) return 260; // Desktop ke liye (aap isko 240 ya 280 bhi kar sakte ho)
  if (screenWidth >= WEB_TABLET_BP)  return 220; // Tablet ke liye
  return 240; // Default / Mobile ke liye
};

export const getPrimaryGradient = (isDark: boolean): [string, string] =>
  isDark ? PrimaryGradients.dark : PrimaryGradients.light;

export const getHeroGradient = (isDark: boolean): [string, string, string] =>
  isDark ? HeroGradients.dark : HeroGradients.light;

export const getSidebarGradient = (isDark: boolean): [string, string] =>
  isDark ? SidebarGradients.dark : SidebarGradients.light;

export const getSuccessGradient = (isDark: boolean): [string, string] =>
  isDark ? SuccessGradients.dark : SuccessGradients.light;

export const getAccentGradient = (isDark: boolean): [string, string] =>
  isDark ? AccentGradients.dark : AccentGradients.light;

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};

export const getColors = (isDark: boolean): ColorScheme =>
  isDark ? DarkColors : LightColors;

export const getShadow = (
  isDark: boolean,
  size: 'sm' | 'md' | 'lg' | 'glow' = 'md',
) => (isDark ? Shadows.dark[size] : Shadows.light[size]);

// ============================================================
// 🎯 TYPE HELPERS
// ============================================================
export type SpacingKey = keyof typeof Spacing;
export type RadiusKey  = keyof typeof Radius;
export type TypographySize =
  | 'xs' | 'sm' | 'base' | 'md' | 'lg'
  | 'xl' | '2xl' | '3xl' | '4xl';
export type ShadowSize = 'sm' | 'md' | 'lg' | 'glow';