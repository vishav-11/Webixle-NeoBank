/**
 * components/AppShell/index.tsx
 * ✅ Lazy loading + performance optimizations
 */
import React, { lazy, Suspense, memo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { SettingsPanelProvider } from '@/context/SettingsPanelContext';

// ✅ Eager imports (critical path)
import Header from './Header';
import BottomNav from './BottomNav';

// ✅ Lazy imports (non-critical)
const Sidebar = lazy(() => import('./Sidebar'));
const SettingsPanel = lazy(() => import('@/screens/Settings/SettingsPanel'));
const NotificationModal = lazy(() => import('@/screens/Notification/notificationModal'));
const NotificationToast = lazy(() => import('@/screens/Notification/notificationToast'));

// ✅ Custom hooks
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useNotificationState } from '@/hooks/useNotificationState';

// ─── Shell Inner Component ────────────────────────────────────────────────────
const ShellInner = memo(function ShellInner({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { showSidebar, showBottomNav } = useResponsiveLayout();
  const { showNotifications, openNotifications, closeNotifications } =
    useNotificationState();

  // ── Shell root wrapper ────────────────────────────────────────────────────
  const Shell = Platform.OS === 'web' ? View : SafeAreaView;
  const shellProps =
    Platform.OS === 'web'
      ? { style: [s.root, { backgroundColor: colors.bg }] }
      : {
          style: [s.root, { backgroundColor: colors.bg }],
          edges: ['top', 'left', 'right'] as const,
        };

  return (
    <Shell {...shellProps}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
        translucent={Platform.OS === 'android'}
      />

      {/* Background gradient */}
      <LinearGradient
        colors={colors.bgGradient as [string, string, ...string[]]}
        locations={colors.bgGradientPos as [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        pointerEvents="none"
      />

      {/* Main layout */}
      <View style={s.shell}>
        {/* ✅ Lazy load Sidebar only on web/tablet */}
        {showSidebar && (
          <Suspense fallback={<View style={{ width: 280 }} />}>
            <Sidebar onToggleTheme={toggleTheme} />
          </Suspense>
        )}

        <View style={s.main}>
          {/* Header (always eager loaded) */}
          <Header
            title={title}
            // onToggleTheme={toggleTheme}
            // showThemeToggle={!showSidebar}
            onNotificationPress={openNotifications}
          />

          {/* Content */}
          <View style={s.content}>{children}</View>
        </View>
      </View>

      {/* Bottom Nav */}
      {showBottomNav && <BottomNav />}

      {/* ✅ Lazy load Settings Panel (only when opened) */}
      <Suspense fallback={null}>
        <SettingsPanel />
      </Suspense>

      {/* ✅ Lazy load Notification Modal (only when opened) */}
      {showNotifications && (
        <Suspense fallback={null}>
          <NotificationModal isOpen={showNotifications} onClose={closeNotifications} />
        </Suspense>
      )}

      {/* ✅ Lazy load Toast (always render but lazy load) */}
      <Suspense fallback={null}>
        <NotificationToast />
      </Suspense>
    </Shell>
  );
});

// ─── Public Export ─────────────────────────────────────────────────────────────
export default function AppShell({
  children,
  title = 'Webixle',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <SettingsPanelProvider>
      <ShellInner title={title}>{children}</ShellInner>
    </SettingsPanelProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, flexDirection: 'column' },
  content: { flex: 1 },
});