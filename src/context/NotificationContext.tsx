/**
 * NotificationContext.tsx
 * ✅ Push token backend ko bhejta hai
 * ✅ Socket events properly listen karta hai
 */
import React, {
  createContext, useCallback, useContext,
  useEffect, useRef, useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { socketService } from '@/services/socketService';
import {
  notificationService,
  type Notification,
} from '@/services/notificationService';
import { useAuth } from './AuthContext';
import { registerForPushNotifications } from '@/utils/pushNotifications';
import { api } from '@/services/apiClient';
import { ENDPOINTS } from '@/services/endpoints';

// ─── Device info (optional) ────────────────────────────────────────────────
let Device: any = null;
try { Device = require('expo-device'); } catch {}

// ─── Push notifications (lazy load) ────────────────────────────────────────
let Notifications: any = null;

const tryLoadNotifications = () => {
  if (Platform.OS === 'web') return;
  try {
    const mod = require('expo-notifications');
    if (mod && typeof mod.scheduleNotificationAsync === 'function') {
      Notifications = mod;
    }
  } catch {}
};

(() => {
  if (Platform.OS === 'ios') {
    tryLoadNotifications();
    return;
  }
  if (Platform.OS === 'android') {
    try {
      const Constants = require('expo-constants').default;
      const isExpoGo  = Constants?.appOwnership === 'expo';
      if (!isExpoGo) tryLoadNotifications();
    } catch {}
  }
})();

// ─── Helpers ───────────────────────────────────────────────────────────────
const countUnread = (list: Notification[]) =>
  list.filter((n) => !n.read).length;

const getId = (n: Notification) => n._id ?? n.id ?? '';

const dedupeInsert = (prev: Notification[], incoming: Notification): Notification[] => {
  const id = getId(incoming);
  if (!id) return prev;
  if (prev.some((n) => getId(n) === id)) return prev;
  return [incoming, ...prev];
};

// ─── Types ─────────────────────────────────────────────────────────────────
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount:   number;
  loading:       boolean;
  connected:     boolean;
  fetchAll:      (reset?: boolean) => Promise<void>;
  markRead:      (id: string) => Promise<void>;
  markAllRead:   () => Promise<void>;
  refresh:       () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [connected,     setConnected]     = useState(false);

  const appState      = useRef(AppState.currentState);
  const pushTokenSent = useRef(false);

  // ── Sync unread count ──────────────────────────────────────────────────
  useEffect(() => {
    setUnreadCount(countUnread(notifications));
  }, [notifications]);

  // ── Push Token Registration ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      pushTokenSent.current = false;
      return;
    }

    const setupPush = async () => {
      if (pushTokenSent.current) return;
      if (Device && !Device.isDevice) return;

      try {
        const token = await registerForPushNotifications();
        if (!token) return;

        await api.post(ENDPOINTS.NOTIFICATION.REGISTER_PUSH_TOKEN, {
          token,
          platform: Platform.OS,
          provider: 'expo',
        });

        pushTokenSent.current = true;
      } catch (error: any) {
        console.warn('[Push] Token save failed:', error?.response?.data || error?.message);
      }
    };

    setupPush();
  }, [isAuthenticated]);

  // ── Logout pe token remove ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated && pushTokenSent.current) {
      const removePushToken = async () => {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            await api.delete(ENDPOINTS.AUTH.REMOVE_PUSH_TOKEN, { token });
          }
        } catch (error) {
          console.warn('[Push] Token removal failed:', error);
        }
        pushTokenSent.current = false;
      };
      removePushToken();
    }
  }, [isAuthenticated]);

  // ── Fetch all ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (_reset = false) => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationService.getAll({ limit: 50 });
      if (res.status === 'success') {
        const list = res.data?.notifications ?? (res.data as any) ?? [];
        setNotifications(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.warn('[NotificationContext] fetchAll error:', e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ── Mark single read ───────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (getId(n) === id ? { ...n, read: true } : n)),
    );
    try {
      await notificationService.markRead(id);
    } catch {
      await fetchAll();
    }
  }, [fetchAll]);

  // ── Mark all read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      await fetchAll();
    }
  }, [fetchAll]);

  // ── Local push notification ────────────────────────────────────────────
  const sendLocalNotification = useCallback(async (data: Notification) => {
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title   || 'New Notification',
          body:  data.message || '',
          data:  data.data    || {},
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('[NotificationContext] Local push failed:', e);
    }
  }, []);

  // ── Socket setup ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      setConnected(false);
      return;
    }

    socketService.connect();

    const unsubs = [
      socketService.on('connect',    () => setConnected(true)),
      socketService.on('disconnect', () => setConnected(false)),

      socketService.on('notification:new', (data: any) => {
        const notification = data?.notification ?? data;
        if (!notification || !getId(notification)) return;
        setNotifications((prev) => dedupeInsert(prev, notification));
        sendLocalNotification(notification);
      }),

      socketService.on('notification', (data: any) => {
        const notification: Notification = data?.notification ?? data;
        if (!notification || !getId(notification)) return;
        setNotifications((prev) => dedupeInsert(prev, notification));
      }),

      socketService.on('notification:read', (data: { id: string }) => {
        if (!data?.id) return;
        setNotifications((prev) =>
          prev.map((n) => (getId(n) === data.id ? { ...n, read: true } : n)),
        );
      }),

      socketService.on('notification:all-read', () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }),
    ];

    fetchAll();

    return () => unsubs.forEach((unsub) => unsub());
  }, [isAuthenticated, fetchAll, sendLocalNotification]);

  // ── AppState – refresh on foreground ───────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active' &&
        isAuthenticated
      ) {
        fetchAll();
        if (!socketService.isConnected) socketService.connect();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isAuthenticated, fetchAll]);

  // ───────────────────────────────────────────────────────────────────────
  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      connected,
      fetchAll,
      markRead,
      markAllRead,
      refresh: fetchAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}