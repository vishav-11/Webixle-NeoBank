// app/(auth)/_layout.tsx
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={colors.bgGradient as any}
        locations={colors.bgGradientPos as any}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        pointerEvents="none"
      />
      <Stack
        screenOptions={{
          headerShown:  false,
          // ✅ gesture back bilkul disable - back press pe auth screens nahi aayenge
          gestureEnabled: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="splash"
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            gestureEnabled: false, // ✅ back nahi
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            gestureEnabled: false, // ✅ login se back nahi
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            gestureEnabled: true,  // ✅ register se login pe wapas ja sakte
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="otp"
          options={{
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="otp-success"
          options={{
            gestureEnabled: false, // ✅ success se back nahi
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </View>
  );
}