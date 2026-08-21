// utils/pushNotifications.ts
import { Platform } from 'react-native';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;
let Application: any = null;

try { Constants = require('expo-constants').default; } catch {}

const isExpoGo = Constants?.appOwnership === 'expo';

if (Platform.OS !== 'web' && !isExpoGo) {
  try { Notifications = require('expo-notifications'); } catch {}
  try { Device = require('expo-device'); } catch {}
  try { Application = require('expo-application'); } catch {}
}

export function setupNotificationHandler() {
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldShowAlert:  true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
      }),
    });
  } catch (e) {
    console.warn('[Push] setNotificationHandler failed:', e);
  }
}

export async function getDeviceIdAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      if (Application && typeof Application.getAndroidId === 'function') {
        return Application.getAndroidId() ?? null;
      }
      return null;
    }
    if (Platform.OS === 'ios') {
      if (Application && typeof Application.getIosIdForVendorAsync === 'function') {
        return await Application.getIosIdForVendorAsync();
      }
      return null;
    }
    return null;
  } catch (e) {
    console.warn('[Push] getDeviceIdAsync error:', e);
    return null;
  }
}

export function getAppVersion(): string | null {
  try {
    if (Application && 'nativeApplicationVersion' in Application) {
      return Application.nativeApplicationVersion ?? null;
    }
    return null;
  } catch (e) {
    console.warn('[Push] getAppVersion error:', e);
    return null;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Notifications) return null;

  try {
    if (Device && !Device.isDevice) {
      console.warn('[Push] Physical device required');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Permission not granted:', finalStatus);
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'Default',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#00C896',
        sound:            'default',
        enableVibrate:    true,
        showBadge:        true,
      });
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.warn('[Push] Project ID missing — set extra.eas.projectId in app.json');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;

  } catch (e: any) {
    console.warn('[Push] registerForPushNotifications error:', e?.message ?? e);
    return null;
  }
}

export async function scheduleLocalNotification({
  title,
  body,
  data,
}: {
  title: string;
  body:  string;
  data?: any;
}) {
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data:  data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Push] scheduleLocalNotification error:', e);
  }
}