import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsPanel } from '@/context/SettingsPanelContext';
import { useNotifications } from '@/context/NotificationContext';
import { useProfile } from '@/hooks/queires';
import { HEADER_HEIGHT, Spacing, Typography, Radius } from '@/styles/theme';

interface AppColors {
  bg: string; bgAlt: string; surface: string; card: string;
  border: string; borderSoft: string; text: string; text2: string; text3: string;
  primary: string; primaryDim: string; green: string; greenDim: string;
  red: string; redDim: string; orange: string; blue: string; overlay: string;
}

interface HeaderProps {
  title?: string;
  onNotificationPress?: () => void;
}

// ─── Notification Badge ────────────────────────────────────────────────────
interface NotificationBadgeProps {
  unreadCount: number;
  connected: boolean;
  colors: AppColors; // ✅ Full AppColors object expect karta hai
}

const NotificationBadge = memo(({ unreadCount, connected, colors }: NotificationBadgeProps) => {
  if (unreadCount > 0) {
    return (
      <View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.surface }]}>
        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
      </View>
    );
  }
  if (connected) {
    return (
      <View style={[styles.dot, { backgroundColor: colors.red, borderColor: colors.surface }]} />
    );
  }
  return null;
});
NotificationBadge.displayName = 'NotificationBadge';

// ─── Main Header ────────────────────────────────────────────────────────────
function Header({ title, onNotificationPress }: HeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { openSettings } = useSettingsPanel();
  const { unreadCount, connected } = useNotifications();
  const { data: profile } = useProfile();

  const appColors = colors as unknown as AppColors;

  const { displayName, avatarUrl } = useMemo(() => {
    const name = profile?.firstName ?? profile?.name ?? title ?? 'User';
    const avatar = profile?.avatarUrl ?? profile?.profileImage ?? null;
    return { displayName: name, avatarUrl: avatar };
  }, [profile, title]);

  const handleAvatarPress = useCallback(() => {
    openSettings();
  }, [openSettings]);

  const handleScanPress = useCallback(() => {
    router.push('/scanner');
  }, [router]);

  const handleNotificationPress = useCallback(() => {
    onNotificationPress?.();
  }, [onNotificationPress]);

  return (
    <View style={styles.container}>
      {/* Avatar + Welcome/Name → opens settings panel */}
      <TouchableOpacity
        onPress={handleAvatarPress}
        activeOpacity={0.7}
        style={styles.avatarHit}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        accessibilityHint="Double tap to open settings panel"
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: appColors.primary }]}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.greetWrap}>
        <Text style={[styles.greetLabel, { color: appColors.text2 }]} numberOfLines={1}>
          Welcome
        </Text>
        <Text
          style={[styles.greetName, { color: appColors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Scan & Pay */}
        <TouchableOpacity
          onPress={handleScanPress}
          style={styles.btn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
          accessibilityHint="Double tap to open scanner"
        >
          <Ionicons name="scan-outline" size={22} color={appColors.text} />
        </TouchableOpacity>

        {/* Notifications */}
        {onNotificationPress && (
          <TouchableOpacity
            onPress={handleNotificationPress}
            style={styles.btn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            accessibilityHint="Double tap to open notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={appColors.text} />
            <NotificationBadge
              unreadCount={unreadCount}
              connected={connected}
              colors={appColors}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default memo(Header);

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    backgroundColor: 'transparent',
  },
  avatarHit: {
    padding: 2,
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
  },
  greetWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing[2],
  },
  greetLabel: {
    fontSize: Typography.sm,
    fontWeight: '600',
    lineHeight: 16,
  },
  greetName: {
    fontSize: Typography.md,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexShrink: 0,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 12,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});