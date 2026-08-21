// components/common/FormInput.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

interface FormInputProps extends TextInputProps {
  label?            : string;
  error?            : string;
  icon?             : keyof typeof Ionicons.glyphMap;
  rightIcon?        : keyof typeof Ionicons.glyphMap;
  onRightIconPress? : () => void;
  inputBgColor?     : string; // ← Background color prop
}

export default function FormInput({
  label,
  error,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  onFocus,
  onBlur,
  inputBgColor, // ← destructure
  ...props
}: FormInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.red
    : focused
    ? colors.primary
    : colors.border;

  // ✅ Background color — agar diya to use karo, warna theme ka surface
  const bgColor = inputBgColor || colors.surface;

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text style={[styles.label, { color: colors.text2 }]}>{label}</Text>
      )}

      {/* ✅ backgroundColor yahan set hoga */}
      <View style={[styles.wrap, { borderColor, backgroundColor: bgColor }]}>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={focused ? colors.primary : colors.text3}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          placeholderTextColor={colors.text3}
          autoCapitalize="none"
          selectionColor={colors.primary}
          style={[
            styles.input,
            { 
              color: colors.text,
              paddingLeft: icon ? 0 : Spacing[3],
            },
            Platform.OS === 'web' && ({ outline: 'none' } as any),
            style,
          ]}
          onFocus={(e) => { setFocused(true);  onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); onBlur?.(e);  }}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons
              name={rightIcon}
              size={16}
              color={focused ? colors.primary : colors.text3}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: Typography.sm, fontWeight: '500' },
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    borderWidth:       1.5,
    borderRadius:      Radius.lg,
    paddingHorizontal: Spacing[3],
  },
  input: {
    flex:            1,
    fontSize:        Typography.base,
    paddingVertical: 12,
    fontFamily:      'System',
  },
  leftIcon:  { marginRight: 8 },
  rightIcon: { padding: 4 },
  error:     { fontSize: Typography.xs },
});