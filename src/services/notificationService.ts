import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

// ✅ Backend ke actual types
export type NotificationType =
  | 'custom_message'
  | 'announcement'
  | 'alert'
  | 'promotion'
  | 'system'
  // Legacy
  | 'transaction'
  | 'p2p'
  | 'credit'
  | 'loan'
  | 'earn'
  | 'swap'
  | 'security'
  | 'kyc'
  | (string & {}); // fallback - unknown types ke liye

export interface Notification {
  id:        any;
  _id:       string;
  title?:    string;          // ✅ optional - backend me nahi hai
  message:   string;
  type:      NotificationType;
  read:      boolean;
  link?:     string | null;   // ✅ backend me link field hai
  data?:     Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  status:  string;
  message: string;
  data?: {
    notifications?: Notification[];
    notification?:  Notification;
    total?:         number;
    unreadCount?:   number;
  };
}

export interface PushTokenPayload {
  token: string;
  platform?: 'ios' | 'android' | 'web' | 'unknown';
  provider?: 'expo' | 'fcm';
  deviceId?: string;
  appVersion?: string;
}

export const notificationService = {
  getAll: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get<NotificationResponse>(ENDPOINTS.NOTIFICATION.GET_ALL, params),

  getLast: () =>
    api.get<NotificationResponse>(ENDPOINTS.NOTIFICATION.GET_LAST),

  markRead: (id: string) =>
    api.patch<NotificationResponse>(ENDPOINTS.NOTIFICATION.MARK_READ(id)),

  markAllRead: () =>
    api.patch<NotificationResponse>(ENDPOINTS.NOTIFICATION.MARK_ALL_READ),
};