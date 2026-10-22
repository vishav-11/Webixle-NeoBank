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
  accent: '#14B8A6',
  accentDim: 'rgba(20,184,166,0.15)',
  accentBorder: 'rgba(20,184,166,0.30)',
  accentGlow: 'rgba(20,184,166,0.35)',

  bgGradient: ['#0F172A', '#1E293B', '#0F172A'] as string[],
  bgGradientPos: [0, 0.38, 1] as number[],

  bg: '#0F172A',
  bgAlt: '#1E293B',

  surface: '#1E293B',
  card: '#334155',
  cardAlt: '#1E293B',
  cardHover: '#475569',

  border: '#475569',
  borderSoft: '#334155',
  hover: '#475569',

  text: '#F8FAFC',
  text2: '#CBD5E1',
  text3: '#94A3B8',

  green: '#10B981',
  greenBright: '#34D399',
  greenDim: 'rgba(16,185,129,0.14)',
  greenBorder: 'rgba(16,185,129,0.28)',
  greenGlow: 'rgba(16,185,129,0.30)',

  red: '#EF4444',
  redBright: '#F87171',
  redDim: 'rgba(239,68,68,0.14)',
  redBorder: 'rgba(239,68,68,0.30)',

  orange: '#F59E0B',
  orangeDim: 'rgba(245,158,11,0.14)',
  orangeBorder: 'rgba(245,158,11,0.30)',

  blue: '#3B82F6',
  blueDim: 'rgba(59,130,246,0.14)',

  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.16)',

  overlay: 'rgba(0,0,0,0.72)',

  tabBar: '#1E293B',
  tabBarBorder: '#475569',

  // Brand — Modern Indigo
  primary: '#6366F1',
  primaryBright: '#818CF8',

  primaryDim: 'rgba(99,102,241,0.18)',
  primaryBorder: 'rgba(99,102,241,0.35)',
  primaryGlow: 'rgba(99,102,241,0.45)',

  primaryGradient: ['#6366F1', '#4F46E5'] as string[],
  cardGradient: ['#6366F1', '#4F46E5'] as string[],

  cardOverlay1: 'rgba(255,255,255,0.08)',
  cardOverlay2: 'rgba(255,255,255,0.05)',

  cardTextOnGradient: '#FFFFFF',
  cardTextOnGradientDim: 'rgba(255,255,255,0.72)',

  cardStatusBg: '#FFFFFF',
  cardStatusText: '#4F46E5',

  iconTileBg: '#334155',

  pendingColor: '#F59E0B',
};

export const LightColors = {
  accent: '#14B8A6',
  accentDim: 'rgba(20,184,166,0.10)',
  accentBorder: 'rgba(20,184,166,0.22)',
  accentGlow: 'rgba(20,184,166,0.18)',

  bgGradient: ['#FFFFFF', '#F8FAFC', '#F1F5F9'] as string[],
  bgGradientPos: [0, 0.38, 1] as number[],

  bg: '#FFFFFF',
  bgAlt: '#F8FAFC',

  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  cardHover: '#F1F5F9',

  border: '#E2E8F0',
  borderSoft: '#F1F5F9',
  hover: '#F1F5F9',

  text: '#0F172A',
  text2: '#475569',
  text3: '#94A3B8',

  green: '#10B981',
  greenBright: '#059669',
  greenDim: 'rgba(16,185,129,0.10)',
  greenBorder: 'rgba(16,185,129,0.22)',
  greenGlow: 'rgba(16,185,129,0.18)',

  red: '#EF4444',
  redBright: '#DC2626',
  redDim: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.22)',

  orange: '#F59E0B',
  orangeDim: 'rgba(245,158,11,0.10)',
  orangeBorder: 'rgba(245,158,11,0.22)',

  blue: '#3B82F6',
  blueDim: 'rgba(59,130,246,0.10)',

  purple: '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.10)',

  overlay: 'rgba(15,23,42,0.35)',

  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',

  // Primary Brand — Modern Indigo
  primary: '#6366F1',
  primaryBright: '#4F46E5',

  primaryDim: 'rgba(99,102,241,0.10)',
  primaryBorder: 'rgba(99,102,241,0.22)',
  primaryGlow: 'rgba(99,102,241,0.18)',

  primaryGradient: ['#6366F1', '#4F46E5'] as string[],

  // Dashboard Cards
  cardGradient: ['#6366F1', '#4F46E5'] as string[],
  cardOverlay1: 'rgba(255,255,255,0.14)',
  cardOverlay2: 'rgba(255,255,255,0.10)',

  cardTextOnGradient: '#FFFFFF',
  cardTextOnGradientDim: 'rgba(255,255,255,0.75)',

  cardStatusBg: '#FFFFFF',
  cardStatusText: '#4F46E5',

  iconTileBg: '#EEF2FF',

  pendingColor: '#F59E0B',
};


export type ColorScheme = typeof DarkColors | typeof LightColors;

// ============================================================
// 🌈 GRADIENTS
// ============================================================
export const PrimaryGradients = {
  dark:  ['#4F46E5', '#6366F1'] as [string, string],
  light: ['#4F46E5', '#6366F1'] as [string, string],
} as const;

export const HeroGradients = {
  dark:  ['#1E293B', '#334155', '#0F172A'] as [string, string, string],
  light: ['#4F46E5', '#6366F1', '#3730A3'] as [string, string, string],
} as const;

export const SidebarGradients = {
  dark:  ['#1E293B', '#0F172A'] as [string, string],
  light: ['#EEF2FF', '#F8FAFC'] as [string, string],
} as const;

export const SuccessGradients = {
  dark:  ['#059669', '#10B981'] as [string, string],
  light: ['#047857', '#059669'] as [string, string],
} as const;

export const AccentGradients = {
  dark:  ['#14B8A6', '#2DD4BF'] as [string, string],
  light: ['#0D9488', '#14B8A6'] as [string, string],
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
      shadowColor:   '#4F46E5',
      shadowOffset:  { width: 0, height: vs(2) },
      shadowOpacity: 0.08,
      shadowRadius:  ms(4, 0.3),
      elevation:     2,
    },
    md: {
      shadowColor:   '#4F46E5',
      shadowOffset:  { width: 0, height: vs(4) },
      shadowOpacity: 0.12,
      shadowRadius:  ms(8, 0.3),
      elevation:     4,
    },
    lg: {
      shadowColor:   '#4F46E5',
      shadowOffset:  { width: 0, height: vs(8) },
      shadowOpacity: 0.16,
      shadowRadius:  ms(16, 0.3),
      elevation:     8,
    },
    glow: {
      shadowColor:   '#6366F1',
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
      shadowColor:   '#6366F1',
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