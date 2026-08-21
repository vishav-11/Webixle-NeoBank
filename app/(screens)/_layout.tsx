// app/(screens)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        animation:    'slide_from_right',
        // ✅ transparent hata diya — KYC screen ka apna background hai
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      {/* ✅ KYC screen — fade animation, no back swipe */}
      {/* <Stack.Screen
        name="kyc"
        options={{
          animation:      'fade',
          gestureEnabled: false,
          contentStyle:   { backgroundColor: 'transparent' },
        }}
      /> */}
    </Stack>
  );
}