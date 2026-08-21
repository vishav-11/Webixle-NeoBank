// components/NotificationBadge.tsx

import { Bell } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/context/NotificationContext';

interface Props {
  onPress: () => void;
  size?: number;
  color?: string;
  showConnected?: boolean;
}

export default function NotificationBadge({
  onPress,
  size = 24,
  color,
  showConnected = false,
}: Props) {
  const { colors } = useTheme();
  const { unreadCount, connected } = useNotifications();  // ✅ Watch lastUpdate

  const iconColor = color || colors.text;

  useEffect(() => {
  }, [unreadCount]);

  return (
    <TouchableOpacity onPress={onPress} style={s.container} activeOpacity={0.7}>
      <View style={s.iconWrap}>
        <Bell size={size} color={iconColor} strokeWidth={2} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <View
            style={[
              s.badge,
              {
                backgroundColor: colors.red,
                borderColor: colors.surface || colors.bg,
              },
            ]}
          >
            <Text style={s.badgeTxt}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}

        {/* Connection dot */}
        {showConnected && connected && unreadCount === 0 && (
          <View
            style={[
              s.dot,
              {
                backgroundColor: colors.green,
                borderColor: colors.surface || colors.bg,
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { position: 'relative', padding: 4 },
  iconWrap:  { position: 'relative' },

  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  badgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 12,
  },

  dot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});