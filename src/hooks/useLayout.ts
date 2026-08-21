// hooks/useLayout.ts — ek jagah se sab manage karo

import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_TAB_H, WEB_TABLET_BP, WEB_DESKTOP_BP } from '@/styles/theme';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isWeb        = Platform.OS === 'web';
  const isTabletWeb  = isWeb && width >= WEB_TABLET_BP;
  const isDesktopWeb = isWeb && width >= WEB_DESKTOP_BP;
  const isMobile     = !isWeb;
  const isMobileWeb  = isWeb && width < WEB_TABLET_BP;

  // Web pe sidebar hai — bottom tab nahi
  const hasBottomTab = isMobile || isMobileWeb;
  
  const scrollPaddingBottom = hasBottomTab
    ? BOTTOM_TAB_H + insets.bottom + 34
    : 34;

  const contentMaxWidth = isDesktopWeb ? 720 : isTabletWeb ? 600 : undefined;

  return {
    isWeb,
    isTabletWeb,
    isDesktopWeb,
    isMobile,
    isMobileWeb,
    hasBottomTab,
    scrollPaddingBottom,
    contentMaxWidth,
    windowWidth: width,
    windowHeight: height,
    insets,
  };
}