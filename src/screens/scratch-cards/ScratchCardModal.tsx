import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Typography, Spacing } from '@/styles/theme';
import type { AssignedScratchCard } from '@/services/scratchCardService';
import { useOpenScratchCard, useRedeemScratchCard } from '@/hooks/queires/useScratchCards';
import ScratchCanvas from './ScratchCanvas';

const { height: SH, width: SW } = Dimensions.get('window');

interface Props {
  card: AssignedScratchCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ScratchCardModal({ card, isOpen, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim  = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const successAnim  = useRef(new Animated.Value(0)).current;
  const bounceAnim   = useRef(new Animated.Value(0.8)).current;

  const [visible, setVisible]       = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const openMutation   = useOpenScratchCard();
  const redeemMutation = useRedeemScratchCard();

  if (!card) return null;

  const isPending  = card.status === 'pending';
  const isOpened   = card.status === 'opened';
  const isRedeemed = card.status === 'redeemed';

  // ── Open/Close animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setShowSuccess(false);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 28,
            stiffness: 220,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SH,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  // ── Success animation ─────────────────────────────────────────────────────
  const triggerSuccess = () => {
    setShowSuccess(true);
    Animated.parallel([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ── Scratched callback ────────────────────────────────────────────────────
  const handleScratched = async () => {
    if (!isPending) return;
    try {
      await openMutation.mutateAsync(card._id);
      triggerSuccess();
    } catch {
      Alert.alert('Error', 'Could not reveal card. Please try again.');
    }
  };

  // ── Redeem ────────────────────────────────────────────────────────────────
  const handleRedeem = async () => {
    try {
      await redeemMutation.mutateAsync(card._id);
      Alert.alert(
        '🎉 Redeemed!',
        card.couponCode
          ? `Coupon: ${card.couponCode}\nReward: ₹${card.reward}`
          : `₹${card.reward} reward redeemed!`,
        [{ text: 'Close', onPress: onClose }]
      );
    } catch {
      Alert.alert('Error', 'Redeem failed. Please try again.');
    }
  };

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const isLoading = openMutation.isPending || redeemMutation.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={m.fullScreen}>
        {/* Backdrop */}
        <Animated.View
          style={[m.backdrop, { opacity: backdropOpacity }]}
          pointerEvents="none"
        />
        <TouchableOpacity
          style={m.backdropTap}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            m.sheet,
            {
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={m.handle} />

          {/* Close */}
          <TouchableOpacity style={m.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* ── Content ── */}
          <View style={m.content}>

            {/* Header */}
            <Text style={m.headerTitle}>
              {isRedeemed ? '✅ Redeemed' : isPending ? '🎟️ Scratch Card' : '🎁 Your Reward'}
            </Text>
            <Text style={m.headerSub}>
              {isRedeemed
                ? 'This card has been redeemed'
                : isPending
                ? 'Scratch to reveal your reward!'
                : 'Claim your reward below'}
            </Text>

            {/* ── Scratch Canvas (pending) ── */}
            {(isPending || (isOpened && !showSuccess)) && (
              <View style={m.canvasWrap}>
                <ScratchCanvas
                  reward={card.reward}
                  couponCode={card.couponCode}
                  title={card.title}
                  onScratched={handleScratched}
                  colors={{
                    green: '#22C58B',
                    card: '#1D1236',
                    border: '#2D2050',
                    text: '#FFFFFF',
                    text2: '#A99BC7',
                    text3: '#6C5E8C',
                  }}
                  alreadyOpened={isOpened}
                />
              </View>
            )}

            {/* ── Already Opened / Success reveal ── */}
            {(isOpened || showSuccess) && (
              <Animated.View
                style={[
                  m.revealBox,
                  {
                    opacity: showSuccess ? successAnim : 1,
                    transform: [
                      {
                        scale: showSuccess ? bounceAnim : 1,
                      },
                    ],
                  },
                ]}
              >
                <Text style={m.revealEmoji}>🎁</Text>
                <Text style={m.revealAmount}>₹{card.reward}</Text>
                {card.couponCode && (
                  <View style={m.couponBox}>
                    <Text style={m.couponLabel}>Coupon Code</Text>
                    <Text style={m.couponValue}>{card.couponCode}</Text>
                  </View>
                )}
                <Text style={m.congrats}>
                  🎉 Congratulations!
                </Text>
              </Animated.View>
            )}

            {/* ── Redeemed state ── */}
            {isRedeemed && (
              <View style={m.redeemedBox}>
                <Text style={m.redeemedEmoji}>✅</Text>
                <Text style={m.redeemedTitle}>₹{card.reward}</Text>
                {card.couponCode && (
                  <Text style={m.redeemedCoupon}>{card.couponCode}</Text>
                )}
                <Text style={m.redeemedSub}>
                  Redeemed on{' '}
                  {card.redeemedOn
                    ? new Date(card.redeemedOn).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'}
                </Text>
              </View>
            )}

            {/* ── Card Info ── */}
            <View style={m.infoBox}>
              <Text style={m.infoTitle} numberOfLines={1}>
                {card.title}
              </Text>
              {card.description && (
                <Text style={m.infoDesc} numberOfLines={2}>
                  {card.description}
                </Text>
              )}
            </View>

            {/* ── Action Button ── */}
            {isOpened && !isRedeemed && (
              <TouchableOpacity
                style={[m.redeemBtn, isLoading && { opacity: 0.6 }]}
                onPress={handleRedeem}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <Ionicons name="ribbon-outline" size={18} color="#fff" />
                <Text style={m.redeemBtnTxt}>
                  {isLoading ? 'Redeeming...' : 'Redeem Now'}
                </Text>
              </TouchableOpacity>
            )}

            {isRedeemed && (
              <TouchableOpacity
                style={m.closeActionBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={m.closeActionTxt}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  fullScreen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '35%',
  },

  sheet: {
    backgroundColor: '#16121F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#2D2050',
    borderBottomWidth: 0,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 30 },
    }),
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2D2050',
    alignSelf: 'center',
    marginBottom: 8,
  },

  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2D2050',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    gap: 20,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: Typography.sm,
    color: '#A99BC7',
    textAlign: 'center',
    marginTop: -12,
  },

  // Canvas
  canvasWrap: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#22C58B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  // Reveal box
  revealBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,211,149,0.06)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0,211,149,0.25)',
    width: '100%',
  },
  revealEmoji: { fontSize: 52 },
  revealAmount: {
    fontSize: 52,
    fontWeight: '900',
    color: '#22C58B',
    letterSpacing: -1,
  },
  couponBox: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,211,149,0.10)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,211,149,0.22)',
  },
  couponLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6C5E8C',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  couponValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22C58B',
    letterSpacing: 3,
  },
  congrats: {
    fontSize: Typography.base,
    color: '#A99BC7',
    fontWeight: '600',
  },

  // Redeemed
  redeemedBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    width: '100%',
  },
  redeemedEmoji: { fontSize: 44 },
  redeemedTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#9B7BFF',
  },
  redeemedCoupon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9B7BFF',
    letterSpacing: 2,
  },
  redeemedSub: {
    fontSize: Typography.xs,
    color: '#6C5E8C',
  },

  // Info box
  infoBox: {
    width: '100%',
    backgroundColor: '#1D1236',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2050',
    padding: Spacing[4],
    gap: 4,
  },
  infoTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoDesc: {
    fontSize: Typography.xs,
    color: '#A99BC7',
    lineHeight: 18,
  },

  // Redeem button
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#22C58B',
  },
  redeemBtnTxt: {
    fontSize: Typography.base,
    fontWeight: '800',
    color: '#fff',
  },

  closeActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1D1236',
    borderWidth: 1,
    borderColor: '#2D2050',
    alignItems: 'center',
  },
  closeActionTxt: {
    fontSize: Typography.base,
    fontWeight: '600',
    color: '#A99BC7',
  },
});