import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Typography } from '@/styles/theme';
import type { AssignedScratchCard } from '@/services/scratchCardService';
import ScratchCardModal from './ScratchCardModal';

interface Props {
  card: AssignedScratchCard;
  colors: any;
}

function getStatusConfig(status: string, GREEN: string) {
  const map: Record<
    string,
    { label: string; color: string; gradient: [string, string]; icon: string }
  > = {
    pending: {
      label: 'Tap to Scratch',
      color: '#FFB23F',
      gradient: ['#2A1F12', '#1A140B'],
      icon: 'sparkles',
    },
    opened: {
      label: 'Claim Now',
      color: GREEN,
      gradient: ['#0F2A22', '#0A1A16'],
      icon: 'gift',
    },
    redeemed: {
      label: 'Redeemed',
      color: '#9B7BFF',
      gradient: ['#1E1A2E', '#15121F'],
      icon: 'checkmark-circle',
    },
  };
  return map[status] ?? map.pending;
}

export default function ScratchCardItem({ card, colors }: Props) {
  const GREEN = colors.green;
  const [modalOpen, setModalOpen] = React.useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cfg = getStatusConfig(card.status, GREEN);
  const isPending = card.status === 'pending';
  const isRedeemed = card.status === 'redeemed';

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();

  return (
    <>
      <Animated.View style={[st.wrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalOpen(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <LinearGradient
            colors={cfg.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[st.card, { borderColor: `${cfg.color}33` }]}
          >
            {/* glow blob top-right */}
            <View style={[st.glow, { backgroundColor: `${cfg.color}1F` }]} />

            {/* ── Top row: icon + status pill ── */}
            <View style={st.topRow}>
              <View style={[st.iconCircle, { backgroundColor: `${cfg.color}1A`, borderColor: `${cfg.color}33` }]}>
                <Text style={st.iconEmoji}>🎟️</Text>
              </View>
              <View style={[st.pill, { backgroundColor: `${cfg.color}22` }]}>
                <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
              </View>
            </View>

            {/* ── Title ── */}
            <Text style={st.title} numberOfLines={2}>
              {card.title}
            </Text>

            {/* ── Reward ── */}
            <View style={st.rewardRow}>
              <Text style={st.currency}>₹</Text>
              <Text style={[st.rewardValue, { color: cfg.color }]}>{card.reward}</Text>
            </View>

            {/* ── Perforation divider ── */}
            <View style={st.dividerRow}>
              <View style={[st.notch, { backgroundColor: colors.background ?? '#0A1216' }]} />
              <View style={st.dashedLine} />
              <View style={[st.notch, { backgroundColor: colors.background ?? '#0A1216' }]} />
            </View>

            {/* ── Bottom CTA ── */}
            <View style={st.ctaRow}>
              <Text style={[st.ctaTxt, { color: cfg.color }]}>{cfg.label}</Text>
              {!isRedeemed && (
                <Ionicons name="arrow-forward" size={13} color={cfg.color} />
              )}
            </View>

            {/* Shimmer hint stripe for pending */}
            {isPending && (
              <View style={st.shimmerDots} pointerEvents="none">
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[st.dot, { backgroundColor: cfg.color, opacity: 0.35 + i * 0.2 }]} />
                ))}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScratchCardModal card={card} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

const st = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '48%',
    marginBottom: 14,
  },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    top: -30,
    right: -30,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconEmoji: { fontSize: 20 },
  pill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: '700',
    lineHeight: 18,
    color: '#FFFFFF',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  currency: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 3,
  },
  rewardValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -16,
  },
  notch: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  shimmerDots: {
    position: 'absolute',
    top: 16,
    right: 48,
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});