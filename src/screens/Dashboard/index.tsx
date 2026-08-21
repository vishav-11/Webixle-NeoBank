/**
 * app/(app)/dashboard.tsx
 *
 * - WebixleCard: live data from profile + useCards()
 * - Profile fields: interlaceAccountCreated, interlaceKycStatus
 * - Cards API sirf tab hit hoti hai jab KYC approved ho
 * - Tap card → /(app)/cards
 * - Zero mock data, zero hardcoded colors
 * - Performance: React.memo, useCallback, conditional fetch
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Feather,
  Ionicons,
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import {
  Radius,
  Spacing,
  Typography,
  BOTTOM_TAB_H,
  WEB_TABLET_BP,
} from "@/styles/theme";
import {
  useWalletDashboard,
  useTransactionHistory,
  useProfile,
  type Transaction as ApiTransaction,
} from "@/hooks/queires";
import { WebixleBrand } from "@/components/common/WebixleBrand";
import {
  WEBIXLE_SIGNATURE_GRADIENT,
  WEBIXLE_GRADIENT_ANGLE,
  WEBIXLE_FACE_COLORS,
} from "@/components/common/webixleCardTheme";
import { useCards } from "@/modules/Cards3/hooks";
import type { CardInfo } from "@/modules/Cards3/types";

const isWeb = Platform.OS === "web";

// ─────────────────────────────────────────────
// Quick Actions config
// ─────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: "feather:plus", label: "Top Up", href: "/(screens)/Buy" },
  { icon: "feather:send", label: "Send", href: "/send" },
  {
    icon: "ionicons:cash-outline",
    label: "Withdraw",
    href: "/(screens)/withdraw",
  },
  {
    icon: "ionicons:wallet-outline",
    label: "Accounts",
    href: "/(screens)/Accounts",
  },
  { icon: "AntDesign:swap", label: "Swap", href: "/(app)/swap" },
  { icon: "mci:qrcode", label: "Payments", href: "/payments?tab=pay" },
  { icon: "feather:users", label: "P2P", href: "/(screens)/P2P" },
  { icon: "feather:more-horizontal", label: "More", href: "/hub" },
] as const;

// ─────────────────────────────────────────────
// AppIcon — unified icon renderer
// ─────────────────────────────────────────────
function AppIcon({
  name,
  size = 22,
  color,
}: {
  name: string;
  size?: number;
  color: string;
}) {
  if (name.startsWith("ionicons:"))
    return (
      <Ionicons
        name={name.replace("ionicons:", "") as any}
        size={size}
        color={color}
      />
    );
  if (name.startsWith("mci:"))
    return (
      <MaterialCommunityIcons
        name={name.replace("mci:", "") as any}
        size={size}
        color={color}
      />
    );
  if (name.startsWith("AntDesign:"))
    return (
      <AntDesign
        name={name.replace("AntDesign:", "") as any}
        size={size}
        color={color}
      />
    );
  return (
    <Feather
      name={name.replace("feather:", "") as any}
      size={size}
      color={color}
    />
  );
}

// ─────────────────────────────────────────────
// Card data helpers
// ─────────────────────────────────────────────

function extractLast4(card: CardInfo): string {
  if ((card as any).last4) return (card as any).last4;
  if (card.maskedNumber) {
    const cleaned = card.maskedNumber.replace(/[\s*•]/g, "");
    if (cleaned.length >= 4) return cleaned.slice(-4);
  }
  return "••••";
}

function extractNetwork(card: CardInfo): string {
  return (card as any).network ?? "VISA";
}

function extractTier(card: CardInfo): string {
  return (card as any).tierLabel ?? card.typeLabel ?? "Webixle Card";
}

function extractHolderName(card: CardInfo, profileName?: string): string {
  const cn = (card as any).holderName ?? "";
  if (cn.trim()) return cn.trim();
  if (profileName?.trim()) return profileName.trim().split(" ")[0];
  return "Cardholder";
}

function extractStatus(card: CardInfo): string {
  const s = (card.status ?? "").toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "FROZEN") return "Frozen";
  if (s === "PENDING") return "Pending";
  return s || "Active";
}

// ─────────────────────────────────────────────
// Pill helper — smart message based on state
// ─────────────────────────────────────────────
interface PillInfo {
  label: string;
  bg: string;
  textColor: string;
}

function getPillInfo({
  card,
  cardStatus,
  kycStatus,
  accountCreated,
  mainKycApproved,
}: {
  card: CardInfo | null;
  cardStatus: string | null;
  kycStatus: string;
  accountCreated: boolean;
  mainKycApproved: boolean;
}): PillInfo | null {
  // ── Live card ───────────────────────────────
  if (card && cardStatus) {
    const s = cardStatus.toUpperCase();
    if (s === "FROZEN")
      return {
        label: "Frozen ❄️",
        bg: "rgba(100,160,255,0.9)",
        textColor: "#fff",
      };
    if (s === "PENDING")
      return {
        label: "Pending",
        bg: "rgba(255,200,100,0.9)",
        textColor: "#7a4f00",
      };
    // ACTIVE or anything else
    return {
      label: "Active",
      bg: "rgba(255,255,255,0.9)",
      textColor: "#7C2FC9",
    };
  }

  // ── No card — guide user through flow ──────
  if (!mainKycApproved) {
    return {
      label: "Verify ID →",
      bg: "rgba(255,255,255,0.9)",
      textColor: "#7C2FC9",
    };
  }

  if (!accountCreated) {
    return {
      label: "Setup →",
      bg: "rgba(255,255,255,0.9)",
      textColor: "#7C2FC9",
    };
  }

  const kyc = kycStatus.toLowerCase();

  if (kyc === "not_started" || kyc === "") {
    return {
      label: "Get Card →",
      bg: "rgba(255,255,255,0.9)",
      textColor: "#7C2FC9",
    };
  }
  if (["submitted", "pending", "in_progress"].includes(kyc)) {
    return {
      label: "KYC Pending",
      bg: "rgba(255,200,100,0.9)",
      textColor: "#7a4f00",
    };
  }
  if (["rejected", "failed", "canceled"].includes(kyc)) {
    return {
      label: "KYC Failed",
      bg: "rgba(255,100,100,0.9)",
      textColor: "#fff",
    };
  }
  if (["approved", "passed"].includes(kyc)) {
    // KYC done but no card yet
    return {
      label: "Add Card →",
      bg: "rgba(255,255,255,0.9)",
      textColor: "#7C2FC9",
    };
  }

  return {
    label: "Get Card →",
    bg: "rgba(255,255,255,0.9)",
    textColor: "#7C2FC9",
  };
}

// ─────────────────────────────────────────────
// WebixleCard component
// ─────────────────────────────────────────────
interface WebixleCardProps {
  card: CardInfo | null;
  profileName?: string;
  loading?: boolean;
  onPress: () => void;
  kycStatus?: string;
  accountCreated?: boolean;
  mainKycApproved?: boolean;
}

const WebixleCard = React.memo(function WebixleCard({
  card,
  profileName,
  loading = false,
  onPress,
  kycStatus = "not_started",
  accountCreated = false,
  mainKycApproved = false,
}: WebixleCardProps) {
  const face = WEBIXLE_FACE_COLORS.signature;

  const last4 = card ? extractLast4(card) : "••••";
  const network = card ? extractNetwork(card) : "VISA";
  const tier = card ? extractTier(card) : "Webixle Black";
  const holderName = card
    ? extractHolderName(card, profileName)
    : profileName?.split(" ")[0] ?? "You";
  const cardStatus = card ? extractStatus(card) : null;

  const pillInfo = getPillInfo({
    card,
    cardStatus,
    kycStatus,
    accountCreated,
    mainKycApproved,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={styles.cardTouchable}
    >
      <LinearGradient
        colors={WEBIXLE_SIGNATURE_GRADIENT}
        start={WEBIXLE_GRADIENT_ANGLE.start}
        end={WEBIXLE_GRADIENT_ANGLE.end}
        style={styles.card}
      >
        {/* Decorative circles */}
        <View style={styles.cardCircle1} />
        <View style={styles.cardCircle2} />

        {/* Top row — logo + NFC */}
        <View style={styles.cardTopRow}>
          <WebixleBrand color={face.text} size={24} />
          <Ionicons
            name="wifi"
            size={18}
            color={face.text2}
            style={{ marginLeft: "auto", transform: [{ rotate: "90deg" }] }}
          />
        </View>

        {/* Card number row */}
        {loading ? (
          <View style={styles.cardNumberRow}>
            <ActivityIndicator color={face.text2} size="small" />
          </View>
        ) : (
          <View style={styles.cardNumberRow}>
            <Text style={[styles.cardDots, { color: face.text2 }]}>••••</Text>
            <Text style={[styles.cardDots, { color: face.text2 }]}>••••</Text>
            <Text style={[styles.cardDots, { color: face.text2 }]}>••••</Text>
            <Text style={[styles.cardNumberText, { color: face.text }]}>
              {last4}
            </Text>
          </View>
        )}

        {/* Bottom row — tier/name + network/status */}
        <View style={styles.cardBottomRow}>
          <View>
            <Text style={[styles.cardTierLabel, { color: face.text2 }]}>
              {tier}
            </Text>
            <Text style={[styles.cardHolderName, { color: face.text }]}>
              {holderName}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Text style={[styles.cardNetwork, { color: face.text }]}>
              {network}
            </Text>
            {pillInfo && (
              <View
                style={[styles.cardStatusPill, { backgroundColor: pillInfo.bg }]}
              >
                <Text
                  style={[styles.cardStatusText, { color: pillInfo.textColor }]}
                >
                  {pillInfo.label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────
// CardsSection — profile-gated, minimal API calls
// ─────────────────────────────────────────────
const CardsSection = React.memo(function CardsSection() {
  const { colors } = useTheme();
  const router = useRouter();

  // Profile already cached — no extra network call
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const prof = profileData as any;

  // ── Derived profile values ──────────────────
  const profileName: string =
    [prof?.firstName, prof?.lastName].filter(Boolean).join(" ") ||
    prof?.name ||
    prof?.username ||
    "";

  const mainKycApproved: boolean = prof?.kycStatus === "Approved";

  const interlaceAccountCreated: boolean =
    prof?.interlaceAccountCreated ?? false;

  const interlaceKycStatus: string = (
    prof?.interlaceKycStatus ?? "not_started"
  ).toLowerCase();

  // ── Conditional cards fetch ─────────────────
  // Only when: platform KYC ✓ + account created ✓ + interlace KYC approved ✓
  const shouldFetchCards =
    !profileLoading &&
    !!prof &&
    mainKycApproved &&
    interlaceAccountCreated &&
    (interlaceKycStatus === "approved" || interlaceKycStatus === "passed");

  const { data: cardsData, isLoading: cardsLoading } =
    useCards(shouldFetchCards);

  const cards: CardInfo[] = shouldFetchCards
    ? (cardsData?.items ?? [])
    : [];

  // Prefer ACTIVE card, else first
  const activeCard =
    cards.find((c) => (c.status ?? "").toUpperCase() === "ACTIVE") ??
    cards[0] ??
    null;

  const handleCardPress = useCallback(() => {
    router.push("/(app)/Card" as any);
  }, [router]);

  // ── Loading skeleton ────────────────────────
  if (profileLoading) {
    return (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Cards
          </Text>
        </View>
        <View
          style={[
            styles.card,
            styles.cardSkeleton,
            { backgroundColor: colors.card },
          ]}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Cards
        </Text>
        {cards.length > 0 && (
          <TouchableOpacity onPress={handleCardPress} hitSlop={8}>
            <Text style={[styles.seeAll, { color: colors.blue }]}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card */}
      <WebixleCard
        card={activeCard}
        profileName={profileName}
        loading={shouldFetchCards && cardsLoading}
        onPress={handleCardPress}
        kycStatus={interlaceKycStatus}
        accountCreated={interlaceAccountCreated}
        mainKycApproved={mainKycApproved}
      />

      {/* Multiple cards hint */}
      {cards.length > 1 && (
        <Text style={[styles.multiCardHint, { color: colors.text2 }]}>
          +{cards.length - 1} more card{cards.length - 1 > 1 ? "s" : ""} · Tap
          to manage
        </Text>
      )}
    </View>
  );
});

// ─────────────────────────────────────────────
// Transaction helpers
// ─────────────────────────────────────────────
const ASSET_ICON: Record<string, string> = {
  DEPOSIT: "add",
  CREDIT: "add",
  WITHDRAW: "arrow-up",
  WITHDRAW_COMPLETE: "arrow-up",
  INTERNAL_SEND: "paper-plane",
  ESCROW_LOCK: "lock-closed",
  ESCROW_RELEASE: "lock-open",
  ESCROW_REFUND: "return-down-back",
  ESCROW_UNLOCK: "lock-open",
  SWAP: "swap-horizontal",
  DEFAULT: "card",
};

function getTxTitle(apiTx: ApiTransaction): string {
  const t = apiTx.type?.toUpperCase();
  const symbol =
    typeof apiTx.asset === "string"
      ? apiTx.asset
      : ((apiTx.asset as any)?.symbol ?? "USD");
  switch (t) {
    case "DEPOSIT":
      return apiTx.refType === "P2P"
        ? `P2P Buy ${symbol}`
        : "Top-Up Successful";
    case "CREDIT":
      return `Credited ${symbol}`;
    case "WITHDRAW":
    case "WITHDRAW_COMPLETE":
      return `Sent ${symbol}`;
    case "INTERNAL_SEND":
      return `Sent ${symbol}`;
    case "SWAP":
      return `Swapped ${symbol}`;
    default:
      return `${t} ${symbol}`;
  }
}

function getAmountSign(type: string): "+" | "-" {
  const t = type?.toUpperCase();
  return ["DEPOSIT", "CREDIT", "ESCROW_REFUND", "ESCROW_UNLOCK"].includes(t)
    ? "+"
    : "-";
}

function formatDashDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} • ${hh}:${min}`;
}

// ─────────────────────────────────────────────
// TxPreviewRow
// ─────────────────────────────────────────────
const TxPreviewRow = React.memo(function TxPreviewRow({
  tx,
  colors,
}: {
  tx: ApiTransaction;
  colors: any;
}) {
  const sign = getAmountSign(tx.type);
  const iconName = ASSET_ICON[tx.type?.toUpperCase()] ?? ASSET_ICON.DEFAULT;
  const amount = parseFloat(String(tx.amount)) || 0;
  const symbol =
    typeof tx.asset === "string"
      ? tx.asset
      : ((tx.asset as any)?.symbol ?? "USD");
  const isPending = (tx.status ?? "COMPLETED").toUpperCase() === "PENDING";
  const amtColor = isPending
    ? colors.pendingColor
    : sign === "+"
      ? colors.green
      : colors.text;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconWrap, { backgroundColor: colors.iconTileBg }]}>
        <Ionicons name={iconName as any} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txTitle, { color: colors.text }]}>
          {getTxTitle(tx)}
        </Text>
        <Text style={[styles.txMeta, { color: colors.text2 }]}>
          {formatDashDate(tx.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.txAmount, { color: amtColor }]}>
          {sign}
          {amount.toFixed(2)} {symbol}
        </Text>
        <Text style={[styles.txStatus, { color: colors.text2 }]}>
          {isPending ? "Processing" : "Closed"}
        </Text>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────
// ActionButton
// ─────────────────────────────────────────────
const ActionButton = React.memo(function ActionButton({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ width: "100%" }}
    >
      <View style={[styles.actionBox, { backgroundColor: colors.cardHover }]}>
        <AppIcon name={icon} size={24} color={colors.text} />
        <Text
          style={[styles.actionLabel, { color: colors.text2 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────
// Main Dashboard Screen
// ─────────────────────────────────────────────
export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const showSidebar = isWeb && width >= WEB_TABLET_BP;

  const [balanceVisible, setBalanceVisible] = useState(true);

  const { data: dashboardData, isLoading: dashboardLoading } =
    useWalletDashboard();
  const { data: txData, isLoading: txLoading } = useTransactionHistory(1, 3);

  const balance = dashboardData?.totalUsd
    ? parseFloat(dashboardData.totalUsd)
    : 0;
  const [intPart, decPart] = balance.toFixed(2).split(".");

  const bottomPad = showSidebar
    ? Spacing[6]
    : BOTTOM_TAB_H + Math.max(insets.bottom, 8) + 16;

  const toggleBalance = useCallback(() => setBalanceVisible((v) => !v), []);

  // Stable per-action handlers
  const actionHandlers = React.useMemo(
    () =>
      QUICK_ACTIONS.reduce(
        (acc, { href, label }) => {
          acc[label] = () => router.push(href as any);
          return acc;
        },
        {} as Record<string, () => void>
      ),
    [router]
  );

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Balance ── */}
      <View style={styles.balanceWrap}>
        <View style={styles.balanceLabelRow}>
          <Text style={[styles.balanceLabel, { color: colors.text2 }]}>
            Total Balance
          </Text>
          <TouchableOpacity onPress={toggleBalance} hitSlop={8}>
            <Ionicons
              name={balanceVisible ? "eye-outline" : "eye-off-outline"}
              size={17}
              color={colors.text2}
            />
          </TouchableOpacity>
        </View>

        {dashboardLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <Text style={styles.balanceAmount}>
            <Text
              style={{ color: colors.text2, fontSize: 24, fontWeight: "700" }}
            >
              $
            </Text>
            <Text
              style={{ color: colors.text, fontSize: 36, fontWeight: "800" }}
            >
              {balanceVisible ? intPart : "••"}
            </Text>
            <Text
              style={{ color: colors.text2, fontSize: 24, fontWeight: "700" }}
            >
              {balanceVisible ? `.${decPart}` : ""}
            </Text>
          </Text>
        )}
      </View>

      {/* ── Quick Actions ── */}
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map(({ icon, label }) => (
          <View key={label} style={styles.actionSlot}>
            <ActionButton
              icon={icon}
              label={label}
              colors={colors}
              onPress={actionHandlers[label]}
            />
          </View>
        ))}
      </View>

      {/* ── Cards — live, profile-gated ── */}
      <CardsSection />

      {/* ── Transactions ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Transactions
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/activity" as any)}
          hitSlop={8}
        >
          <Text style={[styles.seeAll, { color: colors.blue }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {txLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
      ) : (
        <View style={{ gap: 12 }}>
          {(txData?.items ?? []).map((tx: ApiTransaction) => (
            <View
              key={tx._id}
              style={[
                styles.txCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TxPreviewRow tx={tx} colors={colors} />
            </View>
          ))}

          {(!txData?.items || txData.items.length === 0) && (
            <Text
              style={{
                color: colors.text2,
                fontSize: Typography.sm,
                textAlign: "center",
                paddingVertical: 20,
              }}
            >
              No transactions yet
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[5],
  },

  // ── Balance ──
  balanceWrap: {
    alignItems: "center",
    paddingVertical: Spacing[4],
    gap: 6,
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceLabel: { fontSize: Typography.md, fontWeight: "600" },
  balanceAmount: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 10,
  },

  // ── Quick Actions grid ──
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing[3],
  },
  actionSlot: { width: "23%" },
  actionBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    borderRadius: Radius.lg,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
    minHeight: 72,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: Typography.lg, fontWeight: "800" },
  seeAll: { fontSize: Typography.sm, fontWeight: "600" },

  // ── Card ──
  cardTouchable: {
    borderRadius: Radius["2xl"],
  },
  card: {
    borderRadius: Radius["2xl"],
    padding: Spacing[5],
    minHeight: 190,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardSkeleton: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardCircle1: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardCircle2: {
    position: "absolute",
    left: -30,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -8,
  },
  cardNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: Spacing[4],
    minHeight: 28,
  },
  cardDots: { fontSize: 18, fontWeight: "700", letterSpacing: 2 },
  cardNumberText: { fontSize: 20, fontWeight: "700", letterSpacing: 1 },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardTierLabel: { fontSize: 12, marginBottom: 2 },
  cardHolderName: { fontSize: 15, fontWeight: "700" },
  cardNetwork: { fontSize: 16, fontWeight: "800", fontStyle: "italic" },
  cardStatusPill: {
    borderRadius: Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cardStatusText: { fontSize: 11, fontWeight: "700" },

  multiCardHint: {
    fontSize: Typography.xs,
    textAlign: "center",
    marginTop: Spacing[2],
    fontWeight: "500",
  },

  // ── Transactions ──
  txCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing[4],
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
    paddingVertical: Spacing[4],
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontSize: Typography.sm, fontWeight: "700" },
  txMeta: { fontSize: 11, marginTop: 3 },
  txAmount: { fontSize: Typography.sm, fontWeight: "800" },
  txStatus: { fontSize: 11, marginTop: 3 },
});