// app/(auth)/onboarding.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Circle,
  Rect,
  Path,
  G,
  Defs,
  RadialGradient,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

// ─── Slide Data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    tag: 'WELCOME',
    title: 'What Is Webixle?',
    subtitle:
      'Webixle is your all-in-one crypto wallet. Buy, sell, send and receive digital assets with ease and confidence.',
    primaryColor: '#7B4DFF',
    secondaryColor: '#A67CFF',
    bgFrom: '#7B4DFF',
    bgTo: '#5B2FD6',
  },
  {
    id: 1,
    tag: 'SECURITY',
    title: 'Secure Payment',
    subtitle:
      'Your funds are protected with military-grade encryption, biometric authentication and multi-layer security.',
    primaryColor: '#7B4DFF',
    secondaryColor: '#A67CFF',
    bgFrom: '#6C3AE8',
    bgTo: '#4B2AD1',
  },
  {
    id: 2,
    tag: 'UTILITY',
    title: 'Pay Bills Easily',
    subtitle:
      'Pay all your bills instantly — electricity, internet, mobile recharge and more from one single app.',
    primaryColor: '#7B4DFF',
    secondaryColor: '#A67CFF',
    bgFrom: '#5B2FD6',
    bgTo: '#3B1BB8',
  },
];

// ─── Feature Bullets ─────────────────────────────────────────────────────────
const SLIDE_FEATURES = [
  ['Multi-Chain Wallet', 'DeFi Ready', 'NFT Support'],
  ['Face ID & PIN', 'End-to-End Encrypted', '2FA Protected'],
  ['100+ Billers', 'Instant Confirm', 'Auto Pay'],
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // ── Animations ──────────────────────────────────────────────────────────────
  const cardFade = useRef(new Animated.Value(1)).current;
  const cardSlideX = useRef(new Animated.Value(0)).current;

  const illustrationFade = useRef(new Animated.Value(1)).current;
  const illustrationScale = useRef(new Animated.Value(1)).current;
  const illustrationY = useRef(new Animated.Value(0)).current;

  // Floating animation for illustration
  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(illustrationY, {
          toValue: -12,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(illustrationY, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [step]);

  // ── Swipe handler ───────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swipe left = next
          handleNextWithDirection('left');
        } else if (gestureState.dx > 50) {
          // Swipe right = prev
          handleNextWithDirection('right');
        }
      },
    })
  ).current;

  // ── Navigation helpers ───────────────────────────────────────────────────────
  const markDone = async () => {
    try {
      await AsyncStorage.setItem('onboarding_complete', 'true');
    } catch (e) { }
  };

  const handleNextWithDirection = (direction: 'left' | 'right') => {
    if (isAnimating) return;

    const currentStep = step;
    if (direction === 'left' && currentStep >= SLIDES.length - 1) return;
    if (direction === 'right' && currentStep <= 0) return;

    const nextStep =
      direction === 'left' ? currentStep + 1 : currentStep - 1;
    const exitX = direction === 'left' ? -width : width;
    const enterX = direction === 'left' ? width : -width;

    setIsAnimating(true);

    // Slide out current
    Animated.parallel([
      Animated.timing(cardSlideX, {
        toValue: exitX,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(cardFade, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(illustrationFade, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(illustrationScale, {
        toValue: 0.85,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      cardSlideX.setValue(enterX);
      cardFade.setValue(0);
      illustrationFade.setValue(0);
      illustrationScale.setValue(0.85);

      // Slide in new
      Animated.parallel([
        Animated.spring(cardSlideX, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(illustrationScale, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(illustrationFade, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      handleNextWithDirection('left');
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    await markDone();
    router.replace('/(auth)/login' as any);
  };

  const handleRegister = async () => {
    await markDone();
    router.replace('/(auth)/register' as any);
  };

  const handleSkip = async () => {
    await markDone();
    router.replace('/(auth)/login' as any);
  };

  const handleDotPress = (targetStep: number) => {
    if (targetStep === step || isAnimating) return;
    handleNextWithDirection(targetStep > step ? 'left' : 'right');
  };

  // ── Layout calculations ──────────────────────────────────────────────────────
  const isWeb = Platform.OS === 'web';
  const isSmall = height < 700;
  const cardWidth = isWeb ? Math.min(width, 420) : width;
  const illustrationSize = isSmall
    ? Math.min(width * 0.55, 200)
    : Math.min(width * 0.68, 270);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Full background gradient ─────────────────────────────────────── */}
      <LinearGradient
        colors={[slide.bgFrom, slide.bgTo]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* ── Background decoration circles ────────────────────────────────── */}
      <View
        style={[
          styles.bgCircle1,
          { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 },
        ]}
      />
      <View
        style={[
          styles.bgCircle2,
          { width: width * 0.5, height: width * 0.5, borderRadius: width * 0.25 },
        ]}
      />

      <SafeAreaView style={[styles.safeArea, isWeb && { alignItems: 'center' }]}>
        <View
          style={[styles.container, isWeb && { width: cardWidth }]}
          {...panResponder.panHandlers}
        >
          {/* ── Top Bar ─────────────────────────────────────────────────────── */}
          <View style={styles.topBar}>
            <View style={styles.logoMark}>
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={styles.logoInner}
              >
                <Text style={styles.logoText}>₱</Text>
              </LinearGradient>
            </View>

            {!isLast && (
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Illustration Area ────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.illustrationArea,
              {
                opacity: illustrationFade,
                transform: [{ scale: illustrationScale }, { translateY: illustrationY }],
              },
            ]}
          >
            <IllustrationView step={step} size={illustrationSize} />
          </Animated.View>

          {/* ── White Card Bottom ────────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardFade,
                transform: [{ translateX: cardSlideX }],
              },
            ]}
          >
            {/* Step indicator dots — top of card */}
            <View style={styles.dotsRow}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleDotPress(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Animated.View
                    style={[
                      styles.dot,
                      i === step
                        ? [styles.dotActive, { backgroundColor: slide.primaryColor, width: 24 }]
                        : styles.dotInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Tag */}
            <View style={[styles.tagPill, { backgroundColor: slide.primaryColor + '18' }]}>
              <View style={[styles.tagDot, { backgroundColor: slide.primaryColor }]} />
              <Text style={[styles.tagText, { color: slide.primaryColor }]}>{slide.tag}</Text>
            </View>

            {/* Heading */}
            <Text style={styles.heading}>{slide.title}</Text>

            {/* Description */}
            <Text style={styles.desc}>{slide.subtitle}</Text>

            {/* Feature bullets */}
            <View style={styles.featuresWrap}>
              {SLIDE_FEATURES[step].map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <View style={[styles.featureCheck, { backgroundColor: slide.primaryColor }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.85}
              style={styles.btnWrap}
            >
              <LinearGradient
                colors={[slide.bgFrom, slide.bgTo]}
                style={styles.btn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Continue'}</Text>
                <View style={styles.btnArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={slide.primaryColor}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            {/* Register link - always visible at bottom */}
            {/* <View style={styles.signinRow}>
              <Text style={styles.signinText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={[styles.signinLink, { color: slide.primaryColor }]}>Sign Up</Text>
              </TouchableOpacity>
            </View> */}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────
function IllustrationView({ step, size }: { step: number; size: number }) {
  if (step === 0) return <WalletIllustration size={size} />;
  if (step === 1) return <SecurityIllustration size={size} />;
  return <PayBillsIllustration size={size} />;
}

function WalletIllustration({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 280 280">
      <Defs>
        <SvgLinearGradient id="phoneGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="1" stopColor="#f0ebff" stopOpacity="1" />
        </SvgLinearGradient>
        <SvgLinearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9B6BFF" />
          <Stop offset="1" stopColor="#6A35E8" />
        </SvgLinearGradient>
        <SvgLinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7B4DFF" />
          <Stop offset="1" stopColor="#4B2AD1" />
        </SvgLinearGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A67CFF" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#7B4DFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx="140" cy="140" r="110" fill="url(#glow)" />
      <Rect x="75" y="30" width="130" height="220" rx="22" fill="url(#phoneGrad)" />
      <Rect x="83" y="50" width="114" height="185" rx="14" fill="#F8F5FF" />
      <Rect x="110" y="35" width="60" height="8" rx="4" fill="#D8CCFF" />
      <Rect x="83" y="50" width="114" height="38" rx="14" fill="url(#purpleGrad)" />
      <Rect x="95" y="58" width="60" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <Rect x="95" y="68" width="80" height="12" rx="3" fill="rgba(255,255,255,0.9)" />
      <Rect x="90" y="96" width="100" height="58" rx="10" fill="url(#cardGrad)" />
      <Rect x="98" y="104" width="45" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />
      <Rect x="98" y="114" width="65" height="9" rx="3" fill="rgba(255,255,255,0.9)" />
      <Circle cx="167" cy="122" r="8" fill="rgba(255,255,255,0.2)" />
      <Circle cx="175" cy="122" r="8" fill="rgba(255,255,255,0.15)" />

      {[100, 130, 160, 190].map((x, i) => (
        <G key={i}>
          <Circle cx={x} cy="168" r="12" fill="rgba(123,77,255,0.12)" />
          <Circle cx={x} cy="168" r="8" fill="#7B4DFF" opacity="0.7" />
        </G>
      ))}

      <Rect x="90" y="188" width="35" height="35" rx="8" fill="rgba(123,77,255,0.1)" />
      <Rect x="132" y="192" width="50" height="5" rx="2.5" fill="#C4B5FD" />
      <Rect x="132" y="202" width="35" height="4" rx="2" fill="#DDD6FE" />
      <Rect x="172" y="192" width="18" height="5" rx="2.5" fill="#7B4DFF" />

      <Circle cx="228" cy="80" r="26" fill="#F7931A" opacity="0.95" />
      <Circle cx="228" cy="80" r="20" fill="rgba(255,255,255,0.15)" />
      <Path
        d="M224 70 C229 70 232 71.5 232 74.5 C232 76.5 231 77.5 229.5 78 C231.5 78.5 233 80 233 82.5 C233 86 229.5 88 224 88 L222 88 L222 70 Z M224.5 77 C226.5 77 228 76.2 228 74.5 C228 72.8 226.5 72 224.5 72 L224 72 L224 77 Z M224.5 86 C226.8 86 228.5 85 228.5 83 C228.5 81 226.8 80 224.5 80 L224 80 L224 86 Z"
        fill="white"
      />

      <Circle cx="48" cy="100" r="22" fill="#627EEA" opacity="0.95" />
      <Circle cx="48" cy="100" r="16" fill="rgba(255,255,255,0.15)" />
      <Path d="M48 86 L41 100 L48 104 L55 100 Z" fill="white" opacity="0.9" />
      <Path d="M48 106 L41 101.5 L48 114 L55 101.5 Z" fill="white" opacity="0.7" />

      <Path
        d="M235 150 L237 155 L242 157 L237 159 L235 164 L233 159 L228 157 L233 155 Z"
        fill="rgba(255,255,255,0.8)"
      />
      <Path
        d="M50 55 L51.5 59 L55.5 60.5 L51.5 62 L50 66 L48.5 62 L44.5 60.5 L48.5 59 Z"
        fill="rgba(255,255,255,0.8)"
      />
      <Circle cx="220" cy="200" r="4" fill="rgba(255,255,255,0.5)" />
      <Circle cx="55" cy="185" r="3" fill="rgba(255,255,255,0.5)" />
    </Svg>
  );
}

function SecurityIllustration({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 280 280">
      <Defs>
        <SvgLinearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9B6BFF" />
          <Stop offset="1" stopColor="#5B2FD6" />
        </SvgLinearGradient>
        <SvgLinearGradient id="phoneG2" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#ede9ff" />
        </SvgLinearGradient>
        <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A67CFF" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#7B4DFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx="140" cy="140" r="115" fill="url(#glow2)" />
      <Rect x="85" y="35" width="110" height="210" rx="20" fill="url(#phoneG2)" />
      <Rect x="93" y="53" width="94" height="176" rx="12" fill="#F3EEFF" />
      <Rect x="110" y="40" width="60" height="7" rx="3.5" fill="#C4B5FD" />
      <Rect x="93" y="53" width="94" height="45" rx="12" fill="url(#shieldGrad)" />

      <Path
        d="M140 62 C140 62 128 66 128 74 C128 83 133 90 140 93 C147 90 152 83 152 74 C152 66 140 62 140 62 Z"
        fill="rgba(255,255,255,0.9)"
      />
      <Path
        d="M136 77 L139 80 L145 72"
        stroke="#7B4DFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {[120, 135, 150, 165].map((cx, i) => (
        <Circle
          key={i}
          cx={cx}
          cy={127}
          r={5}
          fill={i < 2 ? '#7B4DFF' : 'transparent'}
          stroke="#7B4DFF"
          strokeWidth="1.5"
        />
      ))}

      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <G key={`${row}-${col}`}>
            <Rect
              x={100 + col * 26}
              y={142 + row * 26}
              width="20"
              height="20"
              rx="5"
              fill="rgba(123,77,255,0.1)"
            />
            <Rect
              x={100 + col * 26}
              y={142 + row * 26}
              width="20"
              height="20"
              rx="5"
              stroke="rgba(123,77,255,0.2)"
              strokeWidth="1"
              fill="none"
            />
          </G>
        ))
      )}

      <Circle
        cx="70"
        cy="80"
        r="28"
        fill="rgba(123,77,255,0.08)"
        stroke="rgba(123,77,255,0.2)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <Circle cx="70" cy="75" r="14" fill="rgba(123,77,255,0.12)" />
      <Circle cx="65" cy="73" r="3" fill="#7B4DFF" opacity="0.7" />
      <Circle cx="75" cy="73" r="3" fill="#7B4DFF" opacity="0.7" />
      <Path
        d="M65 80 Q70 84 75 80"
        stroke="#7B4DFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />

      <Circle cx="210" cy="90" r="24" fill="#22C55E" />
      <Circle cx="210" cy="90" r="18" fill="rgba(255,255,255,0.2)" />
      <Path
        d="M201 90 L207 96 L219 82"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <Path
        d="M220 170 L222 176 L228 178 L222 180 L220 186 L218 180 L212 178 L218 176 Z"
        fill="rgba(255,255,255,0.7)"
      />
      <Circle cx="52" cy="185" r="4" fill="rgba(255,255,255,0.5)" />
      <Circle cx="230" cy="145" r="3" fill="rgba(255,255,255,0.5)" />
    </Svg>
  );
}

function PayBillsIllustration({ size }: { size: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 280 280">
      <Defs>
        <SvgLinearGradient id="billGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9B6BFF" />
          <Stop offset="1" stopColor="#5B2FD6" />
        </SvgLinearGradient>
        <SvgLinearGradient id="phoneG3" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#ede9ff" />
        </SvgLinearGradient>
        <RadialGradient id="glow3" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#A67CFF" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#7B4DFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx="140" cy="140" r="115" fill="url(#glow3)" />
      <Rect x="80" y="30" width="120" height="220" rx="22" fill="url(#phoneG3)" />
      <Rect x="89" y="50" width="102" height="183" rx="14" fill="#F3EEFF" />
      <Rect x="108" y="36" width="64" height="8" rx="4" fill="#C4B5FD" />
      <Rect x="89" y="50" width="102" height="40" rx="14" fill="url(#billGrad)" />
      <Rect x="100" y="60" width="50" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <Rect x="100" y="71" width="35" height="10" rx="3" fill="rgba(255,255,255,0.9)" />

      {[0, 1, 2, 3].map((i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        return (
          <G key={i}>
            <Rect
              x={96 + col * 52}
              y={100 + row * 48}
              width="40"
              height="36"
              rx="10"
              fill="rgba(123,77,255,0.1)"
            />
            <Rect
              x={96 + col * 52}
              y={100 + row * 48}
              width="40"
              height="36"
              rx="10"
              stroke="rgba(123,77,255,0.2)"
              strokeWidth="1"
              fill="none"
            />
          </G>
        );
      })}

      {[0, 1, 2].map((i) => (
        <G key={i}>
          <Circle cx="102" cy={205 + i * 18} r="8" fill="rgba(123,77,255,0.15)" />
          <Rect x="116" y={201 + i * 18} width="38" height="4" rx="2" fill="#C4B5FD" />
          <Rect x="116" y={208 + i * 18} width="26" height="3" rx="1.5" fill="#DDD6FE" />
          <Rect
            x="162"
            y={202 + i * 18}
            width="22"
            height="5"
            rx="2.5"
            fill={i === 0 ? '#22C55E' : '#7B4DFF'}
          />
        </G>
      ))}

      <G>
        <Rect x="195" y="60" width="68" height="34" rx="12" fill="white" opacity="0.95" />
        <Rect
          x="195"
          y="60"
          width="68"
          height="34"
          rx="12"
          stroke="rgba(123,77,255,0.15)"
          strokeWidth="1"
          fill="none"
        />
        <Circle cx="210" cy="77" r="9" fill="#22C55E" />
        <Path
          d="M206 77 L209 80 L214 73"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Rect x="223" y="70" width="30" height="5" rx="2.5" fill="#C4B5FD" />
        <Rect x="223" y="79" width="22" height="4" rx="2" fill="#DDD6FE" />
      </G>

      <G>
        <Rect x="15" y="120" width="60" height="30" rx="10" fill="white" opacity="0.95" />
        <Rect
          x="15"
          y="120"
          width="60"
          height="30"
          rx="10"
          stroke="rgba(123,77,255,0.15)"
          strokeWidth="1"
          fill="none"
        />
        <Circle cx="29" cy="135" r="8" fill="#F7931A" />
        <Rect x="41" y="129" width="26" height="5" rx="2.5" fill="#C4B5FD" />
        <Rect x="41" y="138" width="18" height="4" rx="2" fill="#DDD6FE" />
      </G>

      <Path
        d="M225 185 L227 191 L233 193 L227 195 L225 201 L223 195 L217 193 L223 191 Z"
        fill="rgba(255,255,255,0.75)"
      />
      <Circle cx="45" cy="85" r="4" fill="rgba(255,255,255,0.5)" />
      <Circle cx="238" cy="140" r="3" fill="rgba(255,255,255,0.5)" />
    </Svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#7B4DFF',
  },

  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  bgCircle2: {
    position: 'absolute',
    bottom: 200,
    left: -60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    alignItems: 'center',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 8,
  },

  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },

  logoInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  skipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    alignSelf: 'center',
  },

  dot: {
    height: 7,
    borderRadius: 10,
  },

  dotActive: {
    width: 24,
    height: 7,
    borderRadius: 10,
  },

  dotInactive: {
    width: 7,
    height: 7,
    borderRadius: 10,
    backgroundColor: '#E2D9FF',
  },

  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    gap: 5,
  },

  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1033',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 8,
  },

  desc: {
    fontSize: 14,
    color: '#7B6FA0',
    lineHeight: 22,
    marginBottom: 16,
  },

  featuresWrap: {
    gap: 8,
    marginBottom: 22,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkMark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  featureText: {
    fontSize: 13,
    color: '#4A3F6A',
    fontWeight: '500',
  },

  btnWrap: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7B4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },

  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  btnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnArrowText: {
    fontSize: 14,
    fontWeight: '800',
  },

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: 4,
  },

  signinText: {
    fontSize: 13,
    color: '#9B8EC0',
  },

  signinLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});