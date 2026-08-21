/**
 * NotificationToast.tsx
 * Complete rewrite — debug version
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Platform, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { socketService } from '@/services/socketService';

const IS_IOS     = Platform.OS === 'ios';
const IS_ANDROID = Platform.OS === 'android';
const TOP_OFFSET = IS_IOS ? 60 : IS_ANDROID ? 48 : 20;

interface ToastItem {
  id:      string;
  title:   string;
  message: string;
  type:    string;
}

function getEmoji(type: string): string {
  const map: Record<string, string> = {
    transaction:    '💸',
    system:         '⚙️',
    alert:          '⚠️',
    p2p:            '🤝',
    credit:         '💳',
    loan:           '🏦',
    earn:           '💰',
    swap:           '🔄',
    security:       '🔒',
    kyc:            '🪪',
    // ✅ New backend types
    custom_message: '💬',
    announcement:   '📢',
    promotion:      '🎁',
  };
  return map[type?.toLowerCase()] || '🔔';
}


// ✅ DEV test toast HATA DO ya comment karo — production mein noise create karta hai
// useEffect(() => {
//   if (__DEV__) { ... }
// }, []);

// ─── Single Toast ──────────────────────────────────────────────────────────────
function ToastCard({
  item, colors, onDismiss,
}: {
  item: ToastItem;
  colors: any;
  onDismiss: (id: string) => void;
}) {
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:         0,
        damping:         20,
        stiffness:       250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => handleDismiss(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue:         -150,
        duration:        250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         0,
        duration:        250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(item.id));
  }, [item.id, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.surface,
          borderColor:     colors.greenBorder,
          opacity,
          transform:       [{ translateY }],
        },
      ]}
    >
      {/* Left green accent */}
      <View style={[styles.accent, { backgroundColor: colors.green }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.greenDim }]}>
        <Text style={styles.emoji}>{getEmoji(item.type)}</Text>
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.toastTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.toastMsg, { color: colors.text2 }]} numberOfLines={2}>
          {item.message}
        </Text>
      </View>

      {/* Close */}
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={[styles.closeText, { color: colors.text3 }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function NotificationToast() {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: ToastItem) => {
    setToasts(prev => {
      // Deduplicate by id
      if (prev.some(t => t.id === toast.id)) return prev;
      return [toast, ...prev].slice(0, 3);
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

 useEffect(() => {
 const unsub1 = socketService.on('new_notification' as any, (data: any) => {

  const n = data?.notification ?? data;
  if (!n) return;

  addToast({
    id: n._id || n.id || Date.now().toString(),
    title: n.title || 'New Notification',
    message: n.message || '',
    type: n.type || 'system',
  });
});

  const unsub2 = socketService.on('notification', (data: any) => {
    const n = data?.notification ?? data;
    if (!n || (!n._id && !n.id)) return;

    addToast({
      id:      n._id || n.id || Date.now().toString(),
      title:   n.title || n.message?.slice(0, 45) || 'New Notification',
      message: n.title ? (n.message || '') : '',
      type:    n.type || 'system',
    });
  });

  return () => {
    unsub1();
    unsub2();
  };
}, [addToast]);



  // ✅ Always render container — helps debug visibility
  return (
    <View
      style={styles.container}
      pointerEvents="box-none"
    >
      {toasts.map(item => (
        <ToastCard
          key={item.id}
          item={item}
          colors={colors}
          onDismiss={removeToast}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top:      TOP_OFFSET,
    left:     12,
    right:    12,
    zIndex:   99999,
    gap:      10,
    // ✅ Pointer events allow touches to pass through when empty
  },

  toast: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   16,
    borderWidth:    1.5,
    overflow:       'hidden',
    minHeight:      68,
    paddingRight:   12,
    ...Platform.select({
      ios: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius:  16,
      },
      android: { elevation: 20 },
    }),
  },

  accent: {
    width:     4,
    alignSelf: 'stretch',
  },

  iconWrap: {
    width:            44,
    height:           44,
    borderRadius:     22,
    alignItems:       'center',
    justifyContent:   'center',
    marginHorizontal: 10,
    flexShrink:       0,
  },
  emoji: { fontSize: 20 },

  textWrap: {
    flex:            1,
    paddingVertical: 12,
    gap:             4,
    paddingRight:    8,
  },
  toastTitle: {
    fontSize:   14,
    fontWeight: '700',
  },
  toastMsg: {
    fontSize:   12,
    lineHeight: 17,
  },

  closeBtn: {
    padding:    6,
    flexShrink: 0,
  },
  closeText: {
    fontSize:   16,
    fontWeight: '600',
  },
});