/**
 * components/AppShell/hooks/useResponsiveLayout.ts
 * ✅ Responsive layout detection
 */
import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { WEB_TABLET_BP } from '@/styles/theme';

interface ResponsiveLayout {
  showSidebar: boolean;
  showBottomNav: boolean;
  isWeb: boolean;
  isTablet: boolean;
  isMobile: boolean;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const [layout, setLayout] = useState<ResponsiveLayout>({
    showSidebar: false,
    showBottomNav: true,
    isWeb,
    isTablet: false,
    isMobile: true,
  });

  useEffect(() => {
    const isTablet = width >= WEB_TABLET_BP;
    const showSidebar = isWeb && isTablet;
    const showBottomNav = !showSidebar;

    setLayout({
      showSidebar,
      showBottomNav,
      isWeb,
      isTablet,
      isMobile: !isTablet,
    });
  }, [width, isWeb]);

  return layout;
}