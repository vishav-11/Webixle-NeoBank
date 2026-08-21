/**
 * components/AppShell/hooks/useNotificationState.ts
 * ✅ Notification modal state management
 */
import { useState, useCallback } from 'react';

interface NotificationState {
  showNotifications: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;
}

export function useNotificationState(): NotificationState {
  const [showNotifications, setShowNotifications] = useState(false);

  const openNotifications = useCallback(() => {
    setShowNotifications(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const toggleNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  return {
    showNotifications,
    openNotifications,
    closeNotifications,
    toggleNotifications,
  };
}