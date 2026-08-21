import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertCircle, ArrowRight, CheckCircle, Clock,
  ExternalLink, RefreshCw, Shield, User, XCircle, LogOut,
} from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { kycService, type KycStatusResponse } from '@/services/kycService';
import { Radius, Spacing, Typography } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useProfile } from '@/hooks/queires'; // ✅ FIX: React Query profile hook

const IS_WEB = Platform.OS === 'web';

let WebBrowser: any = null;
if (!IS_WEB) {
  try { WebBrowser = require('expo-web-browser'); } catch {}
}

// ─── Status Config (same as before) ────────────────────────────
const STATUS_CONFIG = {
  NotStarted: {
    icon: Shield,
    title: 'Verify Your Identity',
    subtitle: 'Complete KYC verification to access all features',
    badgeText: 'Not Started',
    showStartBtn: true,
    showRefreshBtn: false,
  },
  Pending: {
    icon: Clock,
    title: 'Verification In Progress',
    subtitle: 'Your documents are being reviewed. This may take 24-48 hours.',
    badgeText: 'Under Review',
    showStartBtn: false,
    showRefreshBtn: true,
  },
  InReview: {
    icon: Clock,
    title: 'Under Review',
    subtitle: 'Our team is carefully reviewing your submitted documents.',
    badgeText: 'In Review',
    showStartBtn: false,
    showRefreshBtn: true,
  },
  Approved: {
    icon: CheckCircle,
    title: 'Identity Verified!',
    subtitle: 'Your KYC has been approved. You now have full access.',
    badgeText: 'Approved ✓',
    showStartBtn: false,
    showRefreshBtn: false,
  },
  Rejected: {
    icon: XCircle,
    title: 'Verification Failed',
    subtitle: 'Your KYC was rejected. Please review and resubmit.',
    badgeText: 'Rejected',
    showStartBtn: true,
    showRefreshBtn: false,
  },
  Resubmit: {
    icon: AlertCircle,
    title: 'Resubmission Required',
    subtitle: 'Additional information is needed. Please resubmit.',
    badgeText: 'Resubmit Required',
    showStartBtn: true,
    showRefreshBtn: false,
  },
} as const;

const KYC_STEPS = [
  { step: '01', title: 'Personal Information', desc: 'Provide your basic details' },
  { step: '02', title: 'Identity Document',    desc: 'Upload passport or national ID' },
  { step: '03', title: 'Liveness Check',       desc: 'Quick selfie verification' },
  { step: '04', title: 'Review & Approval',    desc: 'We verify your documents' },
];

function checkProfile(user: any) {
  const missing: string[] = [];
  const mob = user?.mobileNo;
  const dob = user?.DOB || user?.dateOfBirth;
  if (!mob || mob === 'null' || String(mob).trim() === '') missing.push('Phone Number');
  if (!dob || dob === 'null') missing.push('Date of Birth');
  return { isComplete: missing.length === 0, missing };
}

function FadeInView({
  children, delay = 0, style,
}: { children: React.ReactNode; delay?: number; style?: any }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

export default function KycScreen() {
  const { colors, isDark } = useTheme();
  const { user, logout, refresh: refreshProfile } = useAuth();
  const router = useRouter();
  const { scrollPaddingBottom, insets } = useLayout();

  // ✅ FIX: React Query se fresh profile data lo
  // Profile screen pe update hone ke baad yeh automatically updated milega
  const { data: profileData } = useProfile();

  // ✅ FIX: React Query data ko priority do, fallback AuthContext user
  const freshUser = profileData ?? user;

  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [kycUrl, setKycUrl] = useState<string | null>(
    (user as any)?.kycUrl ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();
  }, []);

  const fetchKycStatus = useCallback(async () => {
    try {
      const data = await kycService.getStatus();
      setKycData(data);
      if (data?.kycUrl) setKycUrl(data.kycUrl);
      return data;
    } catch (err: any) {
      console.warn('[KYC] Status fetch failed:', err?.message);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchKycStatus().finally(() => setInitialLoading(false));
  }, [fetchKycStatus]);

  const kycStatus = (
    kycData?.kycStatus ??
    (freshUser as any)?.kycStatus ??
    'NotStarted'
  ) as keyof typeof STATUS_CONFIG;

  const kycNote  = kycData?.kycNote ?? (freshUser as any)?.kycNote ?? null;
  const config   = STATUS_CONFIG[kycStatus] ?? STATUS_CONFIG.NotStarted;
  const IconComp = config.icon;

  // ✅ FIX: freshUser use karo — React Query se updated data milega
  const profileCheck = useMemo(
    () => checkProfile(freshUser),
    [(freshUser as any)?.mobileNo, (freshUser as any)?.DOB],
  );

  const showProfileWarning =
    !profileCheck.isComplete &&
    ['NotStarted', 'Rejected', 'Resubmit'].includes(kycStatus);

  const openUrl = useCallback(async (url: string) => {
    if (IS_WEB) { window.open(url, '_blank'); return; }
    if (WebBrowser) {
      await WebBrowser.openBrowserAsync(url);
    } else {
      await Linking.openURL(url);
    }
  }, []);

  const handleStartKyc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await kycService.initiate();
      if (res.data?.url) {
        setKycUrl(res.data.url);
        setKycData(prev => ({ ...prev, kycStatus: 'Pending' } as KycStatusResponse));
        await openUrl(res.data.url);
        setTimeout(() => fetchKycStatus(), 2000);
      } else {
        throw new Error('No KYC URL received');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start KYC');
    } finally {
      setLoading(false);
    }
  }, [openUrl, fetchKycStatus]);

  const handleContinue = useCallback(async () => {
    if (!kycUrl) { await handleStartKyc(); return; }
    await openUrl(kycUrl);
  }, [kycUrl, handleStartKyc, openUrl]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchKycStatus();
      await refreshProfile(); // ✅ AuthContext bhi refresh
    } catch {
      setError('Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchKycStatus, refreshProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  }, [logout]);

  useEffect(() => {
    if (kycData?.kycStatus === 'Approved') {
      refreshProfile().catch(() => {});
    }
  }, [kycData?.kycStatus, refreshProfile]);

  // ── Dynamic styles (same as previous fix) ────────────────────
  const dyn = useMemo(() => ({
    header: {
      backgroundColor:   colors.surface,
      borderBottomColor: colors.border,
    },
    card: {
      backgroundColor: colors.card,
      borderColor:     colors.border,
    },
    iconGradient: (() => {
      switch (kycStatus) {
        case 'Approved':
          return isDark
            ? [colors.green, '#1A9E6F'] as [string, string]
            : [colors.green, '#0D9660'] as [string, string];
        case 'Pending':
        case 'InReview':
          return isDark
            ? [colors.orange, '#E09520'] as [string, string]
            : [colors.orange, '#C07A08'] as [string, string];
        case 'Rejected':
        case 'Resubmit':
          return isDark
            ? [colors.red, '#D94060'] as [string, string]
            : [colors.red, '#C0304A'] as [string, string];
        default:
          return isDark
            ? [colors.primary, colors.accent] as [string, string]
            : [colors.primary, colors.accent] as [string, string];
      }
    })(),
    badge: (status: string) => {
      const map: Record<string, { bg: string; text: string }> = {
        NotStarted: { bg: colors.cardHover, text: colors.text3 },
        Pending:    { bg: colors.orangeDim,  text: colors.orange },
        InReview:   { bg: colors.orangeDim,  text: colors.orange },
        Approved:   { bg: colors.greenDim,   text: colors.green },
        Rejected:   { bg: colors.redDim,     text: colors.red },
        Resubmit:   { bg: colors.redDim,     text: colors.red },
      };
      return map[status] ?? map.NotStarted;
    },
    title:       colors.text,
    subtitle:    colors.text2,
    stepBorder:  colors.border,
    stepLine:    colors.borderSoft,
    stepNum:     colors.text3,
    refreshBg:   colors.cardHover,
    refreshText: colors.text2,
    errorBg:     colors.redDim,
    errorBorder: colors.redBorder ?? colors.redDim,
    secondaryBg: colors.greenDim,
    warningBg:     colors.orangeDim,
    warningBorder: colors.orangeBorder ?? colors.orangeDim,
    warningText:   colors.orange,
    warningIcon:   colors.orange,
  }), [colors, isDark, kycStatus]);

  // ─── Loading screen ─────────────────────────────────────────
  if (initialLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <LinearGradient
          colors={colors.bgGradient as [string, string]}
          locations={colors.bgGradientPos as any}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={[
          styles.headerWrap, dyn.header,
          { paddingTop: insets.top, borderBottomWidth: 1 },
        ]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Shield size={20} color={colors.green} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                KYC Verification
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text2 }]}>
            Fetching verification status...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Main render ────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={colors.bgGradient as [string, string]}
        locations={colors.bgGradientPos as any}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        pointerEvents="none"
      />

      <Animated.View
        style={[
          styles.headerWrap, dyn.header,
          { paddingTop: insets.top, borderBottomWidth: 1, opacity: headerOpacity },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Shield size={20} color={colors.green} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              KYC Verification
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={colors.text2} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {showProfileWarning ? (
          <>
            <FadeInView delay={0} style={[
              styles.card, dyn.card,
              {
                borderWidth: 1.5,
                borderColor: dyn.warningBorder,
                alignItems: 'center',
                gap: 14,
              },
            ]}>
              <View style={[
                styles.profileIconWrap,
                { backgroundColor: dyn.warningBg },
              ]}>
                <User size={32} color={dyn.warningIcon} />
              </View>

              <Text style={[styles.cardTitle, {
                color: dyn.warningText, fontSize: 20,
              }]}>
                Complete Your Profile First
              </Text>

              <Text style={[styles.cardSubtitle, { color: dyn.subtitle, textAlign: 'center' }]}>
                Before starting KYC, please complete your profile with the
                missing information below:
              </Text>

              <View style={[styles.missingBox, {
                backgroundColor: dyn.warningBg,
              }]}>
                {profileCheck.missing.map((field) => (
                  <View key={field} style={styles.missingRow}>
                    <AlertCircle size={15} color={dyn.warningIcon} />
                    <Text style={[styles.missingText, {
                      color: dyn.warningText,
                    }]}>
                      {field} is missing
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.fullWidthBtn}
                onPress={() => router.push('/(screens)/profile' as any)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.orange, isDark ? '#E09520' : '#C07A08']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <User size={16} color="#FFFFFF" />
                  <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                    Complete Profile
                  </Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </FadeInView>

            <FadeInView delay={150} style={[styles.card, dyn.card, { gap: 10 }]}>
              <Text style={[styles.sectionTitle, { color: dyn.title }]}>
                Why is this required?
              </Text>
              {[
                'KYC requires your complete personal details',
                'Phone number needed for verification alerts',
                'Date of birth required to confirm your identity',
                'Complete profile ensures faster KYC approval',
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={[styles.dot, { backgroundColor: colors.green }]} />
                  <Text style={[styles.infoText, { color: dyn.subtitle }]}>{item}</Text>
                </View>
              ))}
            </FadeInView>
          </>
        ) : (
          <>
            <FadeInView delay={0} style={[
              styles.card, dyn.card, { alignItems: 'center', gap: 14 },
            ]}>
              <LinearGradient
                colors={dyn.iconGradient}
                style={styles.statusIconWrap}
              >
                <IconComp size={36} color="#FFFFFF" />
              </LinearGradient>

              {(() => {
                const b = dyn.badge(kycStatus);
                return (
                  <View style={[styles.badge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.badgeText, { color: b.text }]}>
                      {config.badgeText}
                    </Text>
                  </View>
                );
              })()}

              <Text style={[styles.cardTitle, { color: dyn.title }]}>
                {config.title}
              </Text>
              <Text style={[styles.cardSubtitle, {
                color: dyn.subtitle, textAlign: 'center',
              }]}>
                {config.subtitle}
              </Text>

              {kycNote && ['Rejected', 'Resubmit'].includes(kycStatus) && (
                <View style={[styles.alertBox, {
                  backgroundColor: dyn.errorBg,
                  borderColor:     dyn.errorBorder,
                }]}>
                  <AlertCircle size={16} color={colors.red} />
                  <Text style={[styles.alertText, { color: colors.red }]}>
                    {kycNote}
                  </Text>
                </View>
              )}

              {error && (
                <View style={[styles.alertBox, {
                  backgroundColor: dyn.errorBg,
                  borderColor:     dyn.errorBorder,
                }]}>
                  <AlertCircle size={16} color={colors.red} />
                  <Text style={[styles.alertText, { color: colors.red }]}>
                    {error}
                  </Text>
                </View>
              )}

              {config.showStartBtn && (
                <TouchableOpacity
                  style={styles.fullWidthBtn}
                  onPress={handleStartKyc}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={loading
                      ? [colors.cardHover, colors.cardHover]
                      : colors.primaryGradient as [string, string]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <ExternalLink size={18} color="#FFFFFF" />
                        <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                          {kycStatus === 'NotStarted'
                            ? 'Start KYC Verification'
                            : 'Resubmit Documents'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!config.showStartBtn && kycStatus === 'Pending' && kycUrl && (
                <TouchableOpacity
                  style={[
                    styles.fullWidthBtn,
                    styles.secondaryBtnBase,
                    { borderColor: colors.green, backgroundColor: dyn.secondaryBg },
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={16} color={colors.green} />
                  <Text style={[styles.secondaryBtnText, { color: colors.green }]}>
                    Continue Verification
                  </Text>
                </TouchableOpacity>
              )}

              {config.showRefreshBtn && (
                <TouchableOpacity
                  style={[styles.refreshBtn, { backgroundColor: dyn.refreshBg }]}
                  onPress={handleRefresh}
                  disabled={refreshing}
                  activeOpacity={0.7}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color={dyn.refreshText} />
                  ) : (
                    <>
                      <RefreshCw size={16} color={dyn.refreshText} />
                      <Text style={[styles.refreshText, { color: dyn.refreshText }]}>
                        Check Status
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {kycStatus === 'Approved' && (
                <TouchableOpacity
                  style={styles.fullWidthBtn}
                  onPress={() => router.replace('/(app)/' as any)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={colors.primaryGradient as [string, string]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.primaryBtnGradient}
                  >
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
                      Go to Dashboard
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </FadeInView>

            {['NotStarted', 'Pending'].includes(kycStatus) && (
              <FadeInView delay={150} style={[styles.card, dyn.card]}>
                <Text style={[styles.sectionTitle, { color: dyn.title }]}>
                  Verification Steps
                </Text>
                {KYC_STEPS.map((step, index) => {
                  const isDone   = kycStatus === 'Pending' && index === 0;
                  const isActive = kycStatus === 'NotStarted' && index === 0;
                  return (
                    <View key={step.step} style={styles.stepRow}>
                      {index < KYC_STEPS.length - 1 && (
                        <View style={[styles.stepLine, { backgroundColor: dyn.stepLine }]} />
                      )}
                      <View style={[
                        styles.stepBadge,
                        {
                          backgroundColor: isDone
                            ? colors.green
                            : isActive ? colors.greenDim : colors.cardHover,
                          borderColor: isDone
                            ? colors.green
                            : isActive ? colors.green : dyn.stepBorder,
                        },
                      ]}>
                        {isDone ? (
                          <CheckCircle size={16} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.stepNum, {
                            color: isActive ? colors.green : dyn.stepNum,
                          }]}>
                            {step.step}
                          </Text>
                        )}
                      </View>
                      <View style={styles.stepInfo}>
                        <Text style={[styles.stepTitle, {
                          color: isDone ? colors.green : dyn.title,
                        }]}>
                          {step.title}
                        </Text>
                        <Text style={[styles.stepDesc, { color: dyn.subtitle }]}>
                          {step.desc}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </FadeInView>
            )}

            <FadeInView delay={300} style={[styles.card, dyn.card, { gap: 10 }]}>
              <Text style={[styles.sectionTitle, { color: dyn.title }]}>Why KYC?</Text>
              {[
                'Comply with financial regulations',
                'Protect your account from fraud',
                'Enable higher transaction limits',
                'Access all platform features',
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={[styles.dot, { backgroundColor: colors.green }]} />
                  <Text style={[styles.infoText, { color: dyn.subtitle }]}>{item}</Text>
                </View>
              ))}
            </FadeInView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles (same as before) ──────────────────────────────────
const styles = StyleSheet.create({
  screen:  { flex: 1 },
  headerWrap: {
    borderBottomWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as any,
    }),
  },
  headerContent: {
    height: 56, paddingHorizontal: Spacing[4],
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700' },
  logoutBtn:   { padding: Spacing[2] },
  scroll:      { padding: Spacing[4], gap: Spacing[4] },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[3] },
  loadingText: { fontSize: Typography.sm },
  card: {
    borderRadius: Radius.xl, padding: Spacing[6], borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' } as any,
    }),
  },
  statusIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[2],
  },
  badge:     { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] - 2, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.xs + 1, fontWeight: '700' },
  cardTitle:    { fontSize: Typography.xl + 2, fontWeight: '700', textAlign: 'center' },
  cardSubtitle: { fontSize: Typography.sm, lineHeight: 22 },
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2],
    borderRadius: Radius.md, padding: Spacing[3], width: '100%', borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: Typography.xs + 1, lineHeight: 20 },
  fullWidthBtn: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', marginTop: Spacing[2] },
  secondaryBtnBase: {
    borderRadius: Radius.lg, borderWidth: 1.5, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: Spacing[2], paddingVertical: 14,
  },
  primaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[2], paddingVertical: 15 },
  primaryBtnText:     { fontSize: Typography.sm + 1, fontWeight: '700', letterSpacing: 0.5 },
  secondaryBtnText:   { fontSize: Typography.sm, fontWeight: '600' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: Radius.md, marginTop: Spacing[1],
  },
  refreshText: { fontSize: Typography.sm, fontWeight: '600' },
  profileIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[1],
  },
  missingBox:  { width: '100%', borderRadius: Radius.md, padding: Spacing[4], gap: Spacing[3] },
  missingRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  missingText: { fontSize: Typography.sm, fontWeight: '600' },
  sectionTitle: { fontSize: Typography.base + 1, fontWeight: '700', marginBottom: Spacing[2] },
  stepRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[4], position: 'relative', paddingBottom: Spacing[5] },
  stepLine:     { position: 'absolute', left: 17, top: 36, bottom: 0, width: 2 },
  stepBadge: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0,
  },
  stepNum:   { fontSize: Typography.xs + 1, fontWeight: '700' },
  stepInfo:  { flex: 1, paddingTop: Spacing[2] - 2 },
  stepTitle: { fontSize: Typography.sm + 1, fontWeight: '600' },
  stepDesc:  { fontSize: Typography.xs + 1, marginTop: 2, lineHeight: 18 },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  dot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  infoText: { fontSize: Typography.sm, flex: 1, lineHeight: 20 },
});