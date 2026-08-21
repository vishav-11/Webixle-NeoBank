import { useWindowDimensions, Platform } from 'react-native';
import { Breakpoints } from '@/styles/theme';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  showSidebar: boolean;   // true on web tablet+
  showBottomNav: boolean; // true on mobile/small tablet
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isTablet  = width >= Breakpoints.tablet;
  const isDesktop = width >= Breakpoints.desktop;
  const isMobile  = !isTablet;

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    showSidebar:   isWeb && isTablet,
    showBottomNav: !isWeb || isMobile,
  };
}
