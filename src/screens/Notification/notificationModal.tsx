/**
 * NotificationModal.tsx
 * ✅ Context se directly connected (same source as badge)
 * ✅ Socket real-time updates badge ke saath sync
 * ✅ Expandable notification items - click to see full details
 */

import { CheckCheck, ChevronDown, ChevronUp, Wifi, WifiOff, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';
import type { Notification } from '@/services/notificationService';
import { Skeleton } from './Skeleton';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;
const IS_IOS = Platform.OS === 'ios';
const BOTTOM_SAFE = IS_IOS ? 34 : 0;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function getNotificationMeta(type: string, colors: any) {
  const map: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    transaction: { icon: '💸', color: colors.green, bg: colors.greenDim, label: 'Transaction' },
    system: { icon: '⚙️', color: colors.blue, bg: colors.blueDim, label: 'System' },
    alert: { icon: '⚠️', color: colors.orange, bg: colors.orangeDim, label: 'Alert' },
    p2p: { icon: '🤝', color: colors.purple, bg: colors.purpleDim, label: 'P2P' },
    credit: { icon: '💳', color: colors.green, bg: colors.greenDim, label: 'Credit' },
    loan: { icon: '🏦', color: colors.blue, bg: colors.blueDim, label: 'Loan' },
    earn: { icon: '💰', color: colors.green, bg: colors.greenDim, label: 'Earn' },
    swap: { icon: '🔄', color: colors.cyan || colors.blue, bg: colors.cyanDim || colors.blueDim, label: 'Swap' },
    security: { icon: '🔒', color: colors.red, bg: colors.redDim, label: 'Security' },
    kyc: { icon: '🪪', color: colors.blue, bg: colors.blueDim, label: 'KYC' },
    custom_message: { icon: '💬', color: colors.purple, bg: colors.purpleDim, label: 'Message' },
    announcement: { icon: '📢', color: colors.orange, bg: colors.orangeDim, label: 'Announcement' },
    promotion: { icon: '🎁', color: colors.green, bg: colors.greenDim, label: 'Promotion' },
  };

  return (
    map[type?.toLowerCase()] ?? {
      icon: '🔔',
      color: colors.text,
      bg: colors.card,
      label: type ?? 'Notification',
    }
  );
}

// ─── getId helper ──────────────────────────────────────────────────────────────
const getId = (n: Notification) => n._id ?? n.id ?? '';

// ─── Expandable NotificationItem ──────────────────────────────────────────────

const NotificationItem = React.memo(
  ({
    notification,
    onPress,
    colors,
    isExpanded,
  }: {
    notification: Notification;
    onPress: () => void;
    colors: any;
    isExpanded: boolean;
  }) => {
    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: isExpanded ? 1 : 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnim, {
          toValue: isExpanded ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, [isExpanded]);

    const meta = getNotificationMeta(notification.type, colors);

    const displayTitle =
      notification.title ||
      (notification.message?.slice(0, 45) ?? '') +
      (notification.message?.length > 45 ? '…' : '') ||
      'Notification';

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    return (
      <View
        style={[
          s.notiItem,
          {
            backgroundColor: notification.read ? colors.card : colors.cardHover,
            borderColor: isExpanded
              ? colors.green
              : notification.read
                ? colors.border
                : colors.greenBorder,
            borderWidth: isExpanded ? 2 : 1.5,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={s.notiTouchable}
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
                  !notification.read && { fontWeight: '700' },
                ]}
                numberOfLines={isExpanded ? undefined : 1}
              >
                {displayTitle}
              </Text>
              <View style={s.notiHeaderRight}>
                <Text style={[s.notiTime, { color: colors.text3 }]}>
                  {timeAgo(notification.createdAt)}
                </Text>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <ChevronDown size={16} color={colors.text3} />
                </Animated.View>
              </View>
            </View>

            {/* Message preview when collapsed */}
            {!isExpanded && notification.title && (
              <Text style={[s.notiMessage, { color: colors.text2 }]} numberOfLines={2}>
                {notification.message}
              </Text>
            )}

            {/* Type badge */}
            <View style={s.notiBadgeWrap}>
              <View style={[s.notiBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.notiBadgeTxt, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Unread dot */}
          {!notification.read && (
            <View style={[s.unreadDot, { backgroundColor: colors.green }]} />
          )}
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <Animated.View
            style={[
              s.expandedContent,
              {
                opacity: heightAnim,
                maxHeight: heightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1000],
                }),
              },
            ]}
          >
            {/* Divider */}
            <View style={[s.divider, { backgroundColor: colors.border }]} />

            {/* Full Message */}
            <View style={[s.messageBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.messageLabel, { color: colors.text3 }]}>
                Message
              </Text>
              <Text style={[s.fullMessage, { color: colors.text }]}>
                {notification.message || 'No additional details available.'}
              </Text>
            </View>

            {/* Timestamp */}
            <View style={s.timestampRow}>
              <Text style={[s.timestampLabel, { color: colors.text3 }]}>
                Received
              </Text>
              <Text style={[s.timestampValue, { color: colors.text2 }]}>
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
            </View>

            {/* Additional Data */}
            {notification.data && Object.keys(notification.data).length > 0 && (
              <View style={[s.dataBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.dataLabel, { color: colors.text3 }]}>
                  Additional Details
                </Text>
                {Object.entries(notification.data).map(([key, value]) => (
                  <View key={key} style={s.dataRow}>
                    <Text style={[s.dataKey, { color: colors.text3 }]}>
                      {key}:
                    </Text>
                    <Text style={[s.dataValue, { color: colors.text }]}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  }
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <View style={s.notiItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width={60} height={12} />
        </View>
        <Skeleton width="90%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function NotificationModal({ isOpen, onClose }: Props) {
  const { colors } = useTheme();

  const {
    notifications,
    unreadCount,
    loading,
    connected,
    fetchAll,
    markRead,
    markAllRead,
  } = useNotifications();

  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Animation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 30,
            stiffness: 250,
            mass: 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setExpandedId(null); // Reset expanded on close
      });
    }
  }, [isOpen]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const handleNotificationPress = useCallback(
    async (notification: Notification) => {
      const notiId = getId(notification);

      // Toggle expand/collapse
      if (expandedId === notiId) {
        setExpandedId(null);
      } else {
        setExpandedId(notiId);

        // Mark as read if unread
        if (!notification.read) {
          await markRead(notiId);
        }
      }
    },
    [markRead, expandedId]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllRead();
    } finally {
      setMarkingAll(false);
    }
  }, [markAllRead, unreadCount, markingAll]);

  // ── Group by Today / Earlier ───────────────────────────────────────────────
  const grouped = useMemo(() => {
    const today: Notification[] = [];
    const earlier: Notification[] = [];
    const now = Date.now();

    notifications.forEach((n) => {
      const age = now - new Date(n.createdAt).getTime();
      if (age < 86_400_000) today.push(n);
      else earlier.push(n);
    });

    return { today, earlier };
  }, [notifications]);

  // ── Early return ───────────────────────────────────────────────────────────
  if (!visible && !isOpen) return null;

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const isInitialLoading = loading && notifications.length === 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.fullScreen}>
        {/* Backdrop */}
        <Animated.View
          style={[s.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={s.backdropTap}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            s.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              height: MODAL_HEIGHT,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[s.header, { borderBottomColor: colors.borderSoft }]}>
            <View style={{ flex: 1 }}>


              <Text style={[s.headerTitle, { color: colors.text }]}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.text}
                  Style={{ marginRight: 6, verticalAlign: 'middle' }}
                />
                Notifications
              </Text>
              <View style={s.headerSubRow}>
                <Text style={[s.headerSub, { color: colors.text2 }]}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </Text>

                {/* Live / Offline badge */}
                <View
                  style={[
                    s.connectionBadge,
                    { backgroundColor: connected ? colors.greenDim : colors.redDim },
                  ]}
                >
                  {connected
                    ? <Wifi size={11} color={colors.green} />
                    : <WifiOff size={11} color={colors.red} />
                  }
                  <Text
                    style={[
                      s.connectionTxt,
                      { color: connected ? colors.green : colors.red },
                    ]}
                  >
                    {connected ? 'Live' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.headerRight}>
              {/* Mark all read */}
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  style={[
                    s.markAllBtn,
                    {
                      backgroundColor: markingAll ? colors.cardHover : colors.greenDim,
                      borderColor: colors.greenBorder,
                      opacity: markingAll ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.7}
                  disabled={markingAll}
                >
                  <CheckCheck size={14} color={colors.green} />
                </TouchableOpacity>
              )}

              {/* Close */}
              <TouchableOpacity
                onPress={onClose}
                style={[s.closeBtn, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: BOTTOM_SAFE + 24 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.green}
                colors={[colors.green]}
              />
            }
          >
            {/* Loading skeleton */}
            {isInitialLoading ? (
              <View style={{ gap: 12 }}>
                {[1, 2, 3, 4, 5].map((i) => <NotificationSkeleton key={i} />)}
              </View>

              /* Empty state */
            ) : notifications.length === 0 ? (
              <View style={s.emptyWrap}>
                <View
                  style={[
                    s.emptyIcon,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={s.emptyEmoji}>🔕</Text>
                </View>
                <Text style={[s.emptyTitle, { color: colors.text }]}>
                  No notifications yet
                </Text>
                <Text style={[s.emptySub, { color: colors.text2 }]}>
                  We'll notify you when something important happens
                </Text>
              </View>

              /* List */
            ) : (
              <>
                {grouped.today.length > 0 && (
                  <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.text2 }]}>
                      Today
                    </Text>
                    {grouped.today.map((n) => (
                      <NotificationItem
                        key={getId(n)}
                        notification={n}
                        onPress={() => handleNotificationPress(n)}
                        colors={colors}
                        isExpanded={expandedId === getId(n)}
                      />
                    ))}
                  </View>
                )}

                {grouped.earlier.length > 0 && (
                  <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: colors.text2 }]}>
                      Earlier
                    </Text>
                    {grouped.earlier.map((n) => (
                      <NotificationItem
                        key={getId(n)}
                        notification={n}
                        onPress={() => handleNotificationPress(n)}
                        colors={colors}
                        isExpanded={expandedId === getId(n)}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fullScreen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  backdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT - MODAL_HEIGHT,
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 24 },
    }),
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSub: { fontSize: 13 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  connectionTxt: { fontSize: 10, fontWeight: '600' },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  notiItem: {
    borderRadius: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  notiTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  notiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notiEmoji: { fontSize: 22 },
  notiContent: { flex: 1, gap: 6 },
  notiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notiHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notiTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
  notiTime: { fontSize: 11 },
  notiMessage: { fontSize: 13, lineHeight: 18 },
  notiBadgeWrap: { flexDirection: 'row', marginTop: 2 },
  notiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notiBadgeTxt: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Expanded content styles
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  messageBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fullMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timestampLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestampValue: {
    fontSize: 12,
  },
  dataBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  dataLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dataKey: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dataValue: {
    fontSize: 12,
    flex: 1,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});