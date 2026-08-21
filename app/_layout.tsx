// app/_layout.tsx
import React, { useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { setupNotificationHandler } from '@/utils/pushNotifications';
import Toast from 'react-native-toast-message';
import { useDeepLink } from '@/hooks/useDeepLink';
import UpdateModal from '@/components/UpdateModal';


// ✅ Native splash ko rok lo
SplashScreen.preventAutoHideAsync();

// ✅ WebBrowser warm up karo - MoonPay ke liye
WebBrowser.warmUpAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: 2, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 1 },
  },
});

// ─── Deep Link Handler Component ───────────────────────────────────────────────
// ✅ Alag component mein rakha taaki router context mile
function DeepLinkHandler() {
  useDeepLink();
  return null;
}

// ─── App Providers ─────────────────────────────────────────────────────────────
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}

// ─── Root Navigator ────────────────────────────────────────────────────────────
function RootNavigator() {
  const { colors } = useTheme();

  useEffect(() => {
    setupNotificationHandler();
    SplashScreen.hideAsync();

    // ✅ Cleanup WebBrowser on unmount
    return () => {
      WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ✅ Deep link handler - Stack ke andar hai taaki router context mile */}
      <DeepLinkHandler />

      <Stack
        screenOptions={{
          headerShown:  false,
          animation:    'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="(screens)"
          options={{
            headerShown: false,
            animation:   'slide_from_right',
          }}
        />
        {/* ✅ Conversion Success Screen */}
        <Stack.Screen
          name="conversion/success"
          options={{
            headerShown:  false,
            animation:    'slide_from_bottom',
            presentation: 'modal',
          }}
        />
      </Stack>
       <UpdateModal />
    </View>
  );
}

// ─── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <AppProviders>
                <RootNavigator />
              </AppProviders>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
        <Toast />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}