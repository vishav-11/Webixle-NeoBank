/**
 * components/WebixleBrand.tsx
 * 
 * Icon + "webixle" wordmark - matches the card UI in screenshot
 * White rounded icon chip + bold rounded "webixle" text
 */
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { WebixleWordmark } from './WebixleWordmark';

const doubleCardIcon = require("../../assets/images/smallCradCard.png");

export interface WebixleBrandProps {
  color: string;
  size?: number;
  withChip?: boolean;
  chipColor?: string;
}

export function WebixleBrand({
  color,
  size = 20,
  withChip = false,
}: WebixleBrandProps) {

  // ✅ Icon size - wordmark height se match karo
  const iconSize = size * 2.2;

  // ✅ Chip size - icon ke around proper padding
  const chipSize = iconSize + 12;

  const icon = (
    <Image
      source={doubleCardIcon}
      style={{
        width: iconSize,
        height: iconSize,
        resizeMode: 'contain',
      }}
    />
  );

  return (
    <View style={styles.row}>
      {withChip ? (
        <View
          style={[
            styles.chip,
            {
              width: chipSize,
              height: chipSize,
              borderRadius: chipSize / 4,
            },
          ]}
        >
          {icon}
        </View>
      ) : (
        icon
      )}

      <WebixleWordmark color={color} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',  // ✅ vertically center dono ko
    gap: 2,                // ✅ icon aur wordmark ke beech gap
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WebixleBrand;