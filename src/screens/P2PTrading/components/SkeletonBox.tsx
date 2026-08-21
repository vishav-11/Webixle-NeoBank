import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface SkeletonBoxProps {
  w?: number | string;
  h: number;
  r?: number;
  style?: any;
}

export default function SkeletonBox({ w, h, r = 8, style }: SkeletonBoxProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        {
          width: w ?? '100%',
          height: h,
          borderRadius: r,
          backgroundColor: '#334155',
          opacity,
        },
        style,
      ]}
    />
  );
}