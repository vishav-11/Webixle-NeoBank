import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 48;
const CARD_H = 170;
const SCRATCH_THRESHOLD = 320; // total swipe distance (px) before auto-reveal

interface Props {
  reward: number;
  couponCode?: string | null;
  title: string;
  onScratched: () => void;
  colors: any;
  alreadyOpened?: boolean;
}

export default function ScratchCanvas({
  reward,
  couponCode,
  title,
  onScratched,
  colors,
  alreadyOpened = false,
}: Props) {
  const [revealed, setRevealed] = useState(alreadyOpened);
  const [progress, setProgress] = useState(alreadyOpened ? 1 : 0);

  const overlayOpacity = useRef(new Animated.Value(alreadyOpened ? 0 : 1)).current;
  const overlayScale = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const rewardScale = useRef(new Animated.Value(alreadyOpened ? 1 : 0.7)).current;

  const distanceRef = useRef(0);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // shimmer loop on the unscratched overlay
  React.useEffect(() => {
    if (revealed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [revealed]);

  const triggerReveal = useCallback(() => {
    if (revealed) return;
    setRevealed(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayScale, {
        toValue: 1.08,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(rewardScale, {
        toValue: 1,
        damping: 9,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start(() => onScratched());
  }, [revealed, onScratched]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !revealed,
      onMoveShouldSetPanResponder: () => !revealed,

      onPanResponderGrant: (e) => {
        lastPoint.current = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
        };
      },

      onPanResponderMove: (e) => {
        if (!lastPoint.current) return;
        const { locationX, locationY } = e.nativeEvent;
        const dx = locationX - lastPoint.current.x;
        const dy = locationY - lastPoint.current.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        distanceRef.current += d;
        lastPoint.current = { x: locationX, y: locationY };

        const p = Math.min(distanceRef.current / SCRATCH_THRESHOLD, 1);
        setProgress(p);

        // overlay subtly fades as you scratch, real reveal happens at threshold
        overlayOpacity.setValue(1 - p * 0.35);

        if (p >= 1) triggerReveal();
      },

      onPanResponderRelease: () => {
        lastPoint.current = null;
      },
    })
  ).current;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_W, CARD_W],
  });

  return (
    <View style={[sc.container, { width: CARD_W, height: CARD_H }]}>
      {/* ── Reward Layer (bottom, always rendered) ── */}
      <LinearGradient
        colors={[`${colors.green}26`, `${colors.green}0D`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[sc.rewardLayer, { borderColor: `${colors.green}40` }]}
      >
        <Animated.View
          style={{
            alignItems: 'center',
            gap: 8,
            transform: [{ scale: rewardScale }],
          }}
        >
          <View style={[sc.rewardBadge, { backgroundColor: `${colors.green}22` }]}>
            <Text style={sc.rewardEmoji}>🎁</Text>
          </View>
          <Text style={[sc.rewardAmount, { color: colors.green }]}>₹{reward}</Text>
          {couponCode && (
            <View
              style={[
                sc.couponChip,
                { borderColor: `${colors.green}55`, backgroundColor: `${colors.green}14` },
              ]}
            >
              <Ionicons name="pricetag-outline" size={12} color={colors.green} />
              <Text style={[sc.couponTxt, { color: colors.green }]}>{couponCode}</Text>
            </View>
          )}
          <Text style={[sc.rewardLabel, { color: colors.text2 }]}>Congratulations! 🎉</Text>
        </Animated.View>
      </LinearGradient>

      {/* ── Scratch Overlay ── */}
      {!revealed && (
        <Animated.View
          style={[
            sc.scratchLayer,
            {
              opacity: overlayOpacity,
              transform: [{ scale: overlayScale }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={['#1C2B33', '#1D1236', '#13242C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* moving shimmer sweep */}
          <Animated.View
            style={[
              sc.shimmerSweep,
              { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>

          <View style={sc.overlayContent} pointerEvents="none">
            <View style={[sc.iconRing, { borderColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name="hand-left-outline" size={22} color="#fff" />
            </View>
            <Text style={sc.scratchTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={sc.scratchHint}>Swipe anywhere to reveal ✨</Text>
          </View>

          {/* progress dots */}
          <View style={sc.progressDotsWrap} pointerEvents="none">
            <View style={sc.progressTrack}>
              <View
                style={[
                  sc.progressFill,
                  { width: `${progress * 100}%`, backgroundColor: colors.green },
                ]}
              />
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },

  // Reward layer
  rewardLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1.5,
  },
  rewardBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardEmoji: { fontSize: 28 },
  rewardAmount: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  couponTxt: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Scratch overlay
  scratchLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  shimmerSweep: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    width: 70,
  },
  overlayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scratchTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scratchHint: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  progressDotsWrap: {
    position: 'absolute',
    bottom: 14,
    left: 24,
    right: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});