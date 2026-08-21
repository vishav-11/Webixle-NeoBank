/**
 * app/(screens)/notifications.tsx
 * ✅ Full theme integration — Ionicons, IconSize, Spacing, Typography, Radius
 */

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CheckCheck, ChevronLeft, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Skeleton } from '@/screens/Notification/Skeleton';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius, IconSize, IconBox,
} from '@/styles/theme';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/queires';
import type {
  Notification,
  NotificationType,
} from '@/services/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────

// interface NotificationMeta {
//   icon:  string;
//   color: string;
//   bg:    string;
//   label: string;
// }

interface NotificationMeta {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getNotificationMeta(
  type: NotificationType,
  colors: any
): NotificationMeta {
  const map: Record<string, NotificationMeta> = {
    // ── New backend types ──
    custom_message: {
      icon: 'chatbubble-ellipses-outline',
      color: colors.blue,
      bg: colors.blueDim,
      label: 'Message',
    },

    announcement: {
      icon: 'megaphone-outline',
      color: colors.purple,
      bg: colors.purpleDim,
      label: 'Announcement',
    },

    alert: {
      icon: 'warning-outline',
      color: colors.orange,
      bg: colors.orangeDim,
      label: 'Alert',
    },

    promotion: {
      icon: 'gift-outline',
      color: colors.green,
      bg: colors.greenDim,
      label: 'Promotion',
    },

    system: {
      icon: 'settings-outline',
      color: colors.blue,
      bg: colors.blueDim,
      label: 'System',
    },

    // ── Legacy types ──
    transaction: {
      icon: 'cash-outline',
      color: colors.green,
      bg: colors.greenDim,
      label: 'Transaction',
    },

    p2p: {
      icon: 'people-outline',
      color: colors.purple,
      bg: colors.purpleDim,
      label: 'P2P',
    },

    credit: {
      icon: 'card-outline',
      color: colors.green,
      bg: colors.greenDim,
      label: 'Credit',
    },

    loan: {
      icon: 'business-outline',
      color: colors.blue,
      bg: colors.blueDim,
      label: 'Loan',
    },

    earn: {
      icon: 'wallet-outline',
      color: colors.green,
      bg: colors.greenDim,
      label: 'Earn',
    },

    swap: {
      icon: 'swap-horizontal-outline',
      color: colors.cyan ?? colors.blue,
      bg: colors.cyanDim ?? colors.blueDim,
      label: 'Swap',
    },

    security: {
      icon: 'shield-checkmark-outline',
      color: colors.red,
      bg: colors.redDim,
      label: 'Security',
    },

    kyc: {
      icon: 'id-card-outline',
      color: colors.orange,
      bg: colors.orangeDim,
      label: 'KYC',
    },
  };

  const key = type?.toLowerCase?.() ?? '';

  return (
    map[key] ?? {
      icon: 'notifications-outline',
      color: colors.text,
      bg: colors.card,
      label: type ?? 'Notification',
    }
  );
}

function getNotificationTitle(notification: Notification): string {
  if (notification.title) return notification.title;

  const titleMap: Record<string, string> = {
    custom_message: 'New Message',
    announcement: 'Announcement',
    alert: 'Alert',
    promotion: 'Special Offer 🎉',
    system: 'System Update',
    transaction: 'Transaction Update',
    p2p: 'P2P Trade',
    credit: 'Credit Update',
    loan: 'Loan Update',
    earn: 'Earn Update',
    swap: 'Swap Update',
    security: 'Security Alert',
    kyc: 'KYC Update',
  };

  const key = notification.type?.toLowerCase?.() ?? '';
  return titleMap[key] ?? 'Notification';
}

function normalizeNotifications(data: any): Notification[] {
  if (!data) return [];
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.data?.notifications)) return data.data.notifications;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  colors: any;
}

const NotificationItem = React.memo(
  ({ notification, onPress, colors }: NotificationItemProps) => {
    const meta = getNotificationMeta(notification.type, colors);
    const title = getNotificationTitle(notification);

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          s.notiItem,
          {
            backgroundColor: notification.read
              ? colors.card
              : colors.cardHover,
            borderColor: notification.read
              ? colors.border
              : colors.greenBorder,
          },
        ]}
      >
        {/* Icon */}
        <View style={[s.notiIcon, { backgroundColor: meta.bg }]}>
          <Text style={s.notiEmoji}>{meta.icon}</Text>
        </View>

        {/* Content */}
        <View style={s.notiContent}>
          <View style={s.notiHeader}>
            <Text
              style={[
                s.notiTitle,
                { color: colors.text },
                !notification.read && s.notiTitleBold,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={[s.notiTime, { color: colors.text3 }]}>
              {timeAgo(notification.createdAt)}
            </Text>
          </View>

          <Text
            style={[s.notiMessage, { color: colors.text2 }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          {/* Badges */}
          <View style={s.notiBadgeWrap}>
            <View style={[s.notiBadge, { backgroundColor: meta.bg }]}>
              <Text style={[s.notiBadgeTxt, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            {notification.link ? (
              <View
                style={[
                  s.notiBadge,
                  { backgroundColor: colors.blueDim ?? colors.card },
                ]}
              >
                <Text style={[s.notiBadgeTxt, { color: colors.blue }]}>
                  🔗 Link
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Unread dot */}
        {!notification.read && (
          <View style={[s.unreadDot, { backgroundColor: colors.green }]} />
        )}
      </TouchableOpacity>
    );
  }
);

NotificationItem.displayName = 'NotificationItem';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <View style={[s.notiItem, { borderColor: 'transparent' }]}>
      <Skeleton width={IconBox.md} height={IconBox.md} borderRadius={Radius.full} />
      <View style={{ flex: 1, gap: Spacing[2] }}>
        <View style={s.skeletonRow}>
          <Skeleton width="60%" height={16} />
          <Skeleton width={60} height={12} />
        </View>
        <Skeleton width="90%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({
  title,
  count,
  colors,
}: {
  title: string;
  count: number;
  colors: any;
}) {
  return (
    <View style={s.sectionLabelRow}>
      <Text style={[s.sectionTitle, { color: colors.text2 }]}>
        {title}
      </Text>
      <View
        style={[
          s.sectionCountBadge,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[s.sectionCountTxt, { color: colors.text2 }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  onRefresh,
  colors,
}: {
  onRefresh: () => void;
  colors: any;
}) {
  return (
    <View style={s.emptyWrap}>
      {/* ✅ Proper Ionicons instead of emoji */}
      <View
        style={[
          s.emptyIcon,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="notifications-off-outline"
          size={IconSize.xl}
          color={colors.text3}
        />
      </View>

      <Text style={[s.emptyTitle, { color: colors.text }]}>
        No notifications yet
      </Text>
      <Text style={[s.emptySub, { color: colors.text2 }]}>
        We'll notify you when something important happens
      </Text>

      <TouchableOpacity
        onPress={onRefresh}
        style={[
          s.retryBtn,
          {
            backgroundColor: colors.primaryDim,
            borderColor: colors.primaryBorder,
          },
        ]}
        activeOpacity={0.7}
      >
        <RefreshCw size={IconSize.xs} color={colors.primary} />
        <Text style={[s.retryTxt, { color: colors.primary }]}>
          Refresh
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useNotifications({ page: 1, limit: 50 });

  const { mutate: markRead } = useMarkNotificationRead();

  const { mutate: markAllRead, isPending: isMarkingAll } =
    useMarkAllNotificationsRead();

  const notifications: Notification[] = useMemo(
    () => normalizeNotifications(data),
    [data]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const grouped = useMemo<{
    today: Notification[];
    earlier: Notification[];
  }>(() => {
    const now = Date.now();
    const today: Notification[] = [];
    const earlier: Notification[] = [];

    notifications.forEach((n) => {
      const age = now - new Date(n.createdAt).getTime();
      if (age < 86_400_000) today.push(n);
      else earlier.push(n);
    });

    return { today, earlier };
  }, [notifications]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleNotificationPress = useCallback(
    (notification: Notification): void => {
      if (!notification.read) {
        markRead(notification._id);
      }
      // TODO: notification.link pe navigate
      // if (notification.link) router.push(notification.link as any);
    },
    [markRead]
  );

  const handleMarkAllRead = useCallback((): void => {
    markAllRead();
  }, [markAllRead]);

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={IconSize.md} color={colors.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
          <View style={s.headerSubRow}>
            <Text style={[s.headerSub, { color: colors.text2 }]}>
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'All caught up ✓'}
            </Text>

            {isFetching && !isLoading && !refreshing && (
              <View
                style={[
                  s.syncBadge,
                  {
                    backgroundColor: colors.blueDim ?? colors.card,
                  },
                ]}
              >
                <RefreshCw size={IconSize.xs} color={colors.blue} />
                <Text style={[s.syncTxt, { color: colors.blue }]}>
                  Syncing
                </Text>
              </View>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={isMarkingAll}
            style={[
              s.markAllBtn,
              {
                backgroundColor: colors.greenDim,
                borderColor: colors.greenBorder,
                opacity: isMarkingAll ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <CheckCheck size={IconSize.sm} color={colors.green} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ── */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={s.skeletonWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </View>

        ) : notifications.length === 0 ? (
          <EmptyState onRefresh={() => refetch()} colors={colors} />

        ) : (
          <>
            {grouped.today.length > 0 && (
              <View style={s.section}>
                <SectionLabel
                  title="Today"
                  count={grouped.today.length}
                  colors={colors}
                />
                {grouped.today.map((n) => (
                  <NotificationItem
                    key={n._id}
                    notification={n}
                    onPress={() => handleNotificationPress(n)}
                    colors={colors}
                  />
                ))}
              </View>
            )}

            {grouped.earlier.length > 0 && (
              <View style={s.section}>
                <SectionLabel
                  title="Earlier"
                  count={grouped.earlier.length}
                  colors={colors}
                />
                {grouped.earlier.map((n) => (
                  <NotificationItem
                    key={n._id}
                    notification={n}
                    onPress={() => handleNotificationPress(n)}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Platform.OS === 'ios' ? 54 : Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  backBtn: { padding: Spacing[1] },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: Typography.xl, fontWeight: '700' },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: 2,
  },
  headerSub: { fontSize: Typography.sm },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[1],
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  syncTxt: { fontSize: Typography.xs, fontWeight: '600' },
  markAllBtn: {
    width: IconBox.xs,
    height: IconBox.xs,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Scroll
  scrollContent: { padding: Spacing[4], paddingBottom: 100 },
  skeletonWrap: { gap: Spacing[3] },

  // Section
  section: { marginBottom: Spacing[6] },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCountBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sectionCountTxt: { fontSize: Typography.xs, fontWeight: '600' },

  // Notification Item
  notiItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing[2],
    position: 'relative',
  },
  notiIcon: {
    width: IconBox.md,
    height: IconBox.md,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notiEmoji: { fontSize: IconSize.md },
  notiContent: { flex: 1, gap: Spacing[1] },
  notiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  notiTitle: { fontSize: Typography.sm, fontWeight: '500', flex: 1 },
  notiTitleBold: { fontWeight: '700' },
  notiTime: { fontSize: Typography.xs },
  notiMessage: { fontSize: Typography.sm, lineHeight: Typography.lineHeightBase },

  notiBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing[1],
    marginTop: Spacing[1],
  },
  notiBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  notiBadgeTxt: {
    fontSize: Typography.xs,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing[3],
    right: Spacing[3],
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing[16],
    paddingHorizontal: Spacing[8],
  },
  emptyIcon: {
    width: IconBox.xl,
    height: IconBox.xl,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  emptyTitle: {
    fontSize: Typography.md,
    fontWeight: '700',
    marginBottom: Spacing[2],
  },
  emptySub: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeightBase,
    marginBottom: Spacing[5],
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing[2],
  },
  retryTxt: { fontSize: Typography.sm, fontWeight: '600' },
});