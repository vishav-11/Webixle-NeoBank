/**
 * components/WebixleWordmark.tsx
 *
 * Image-based "webixle" wordmark using the actual logo asset.
 * Uses RN's tintColor so you can still recolor it for light/dark themes
 * (the PNG only needs to carry shape + alpha, tintColor does the rest).
 */
import React from 'react';
import { Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';

// Adjust this path to wherever you place the asset in your project,
// e.g. assets/images/webixle-logo.png
// Use a relative path so TypeScript can resolve the asset.
// Adjust if your project places assets elsewhere.
const WebixleLogoAsset = require('../../assets/images/webixle-text-logo1.png');

export interface WebixleWordmarkProps {
  color?: string;      // tint color; omit to use the asset's original color
  height?: number;     // rendered height in px, width auto-scales
  style?: StyleProp<ImageStyle>;
}

// Source asset is 1178x243 → aspect ratio ~4.848
const ASPECT_RATIO = 1178 / 243;

export function WebixleWordmark({ color, height = 20, style }: WebixleWordmarkProps) {
  return (
    <Image
      source={WebixleLogoAsset}
      resizeMode="contain"
      style={[
        {
          height,
          width: height * ASPECT_RATIO,
          tintColor: color, // undefined -> keeps original asset color
        },
        style,
      ]}
    />
  );
}

export default WebixleWordmark;