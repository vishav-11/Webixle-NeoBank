// app/(app)/_layout.tsx
import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/context/AuthContext';

const TITLES: Record<string, string> = {
  '/':          'Dashboard',
  '/(app)':     'Dashboard',
  '/(app)/':    'Dashboard',
  '/markets':   'Markets',
  '/portfolio': 'Portfolio',
  '/activity':  'Activity',
  '/settings':  'Settings',
  '/credit':    'Credit',
  '/p2p':       'P2P Trading',
  '/earn':      'Earn',
  '/loans':     'Crypto Loans',
  '/swap':      'Swap',
  '/hub':       'Hub',
};

function AppLayoutInner() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, isLoading } = useAuth();
  const title      = TITLES[pathname] ?? 'MetaVault';

  // ✅ Auth guard - logged out hone pe login pe bhejo
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/(auth)/login' as any);
    }
  }, [user, isLoading]);

  // ✅ Loading ya no user pe kuch render mat karo
  if (isLoading || !user) return null;

  return (
    <AppShell title={title}>
      <Stack
        screenOptions={{
          headerShown:    false,
          animation:      'none',
          // ✅ App screens pe back disable (auth pe nahi jayega)
          gestureEnabled: false,
          contentStyle:   { backgroundColor: 'transparent' },
        }}
      />
    </AppShell>
  );
}

export default function AppLayout() {
  return <AppLayoutInner />;
}