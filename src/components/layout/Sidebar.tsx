// components/Sidebar.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import {
  getSidebarWidth,
  Radius,
  Spacing,
  Typography,
  WEB_DESKTOP_BP,
} from "@/styles/theme";
import { useKycGuard } from "@/hooks/useKycGuard";
import { KycRequiredModal } from "@/components/common/KycRequiredModal";
import { useProfile } from "@/hooks/queires";
import { useAuth } from "@/context/AuthContext";
const logoSource = require("@/assets/images/webixle_logo_horizontal_dark.png");
const logoSourceDark = require("@/assets/images/webixle_icon_white.jpg");

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: string;
  iconActive: string;
  colorKey?: "primary" | "blue" | "orange" | "purple" | "red";
}

interface NavSection {
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

// ─── All Sections ─────────────────────────────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    title: "MAIN",
    items: [
      {
        href: "/",
        label: "Dashboard",
        icon: "home-outline",
        iconActive: "home",
      },
      {
        href: "/P2P",
        label: "P2P Trading",
        icon: "swap-horizontal-outline",
        iconActive: "swap-horizontal",
      },
      {
        href: "/credit",
        label: "Credit",
        icon: "card-outline",
        iconActive: "card",
      },
      {
        href: "/swap",
        label: "Swap",
        icon: "repeat-outline",
        iconActive: "repeat",
      },
      {
        href: "/wallet",
        label: "Wallet",
        icon: "wallet-outline",
        iconActive: "wallet",
      },
    ],
  },
  {
    title: "POPULAR",
    collapsible: true,
    items: [
      {
        href: "/(screens)/send",
        label: "Send",
        icon: "arrow-up-outline",
        iconActive: "arrow-up",
        colorKey: "primary",
      },
      {
        href: "/(screens)/receive",
        label: "Receive",
        icon: "arrow-down-outline",
        iconActive: "arrow-down",
        colorKey: "primary",
      },
      {
        href: "/(screens)/Buy",
        label: "Buy",
        icon: "add-circle-outline",
        iconActive: "add-circle",
        colorKey: "primary",
      },
      {
        href: "/(screens)/Loan",
        label: "Loan",
        icon: "cash-outline",
        iconActive: "cash",
        colorKey: "blue",
      },
      {
        href: "/(screens)/Earn",
        label: "Earn",
        icon: "trending-up-outline",
        iconActive: "trending-up",
      },
    ],
  },
  {
    title: "CARD",
    collapsible: true,
    items: [
      {
        href: "/(app)/Card",
        label: "Apply Card",
        icon: "card-outline",
        iconActive: "card",
        colorKey: "blue",
      },
      {
        href: "/(screens)/budget",
        label: "Budget",
        icon: "bar-chart-outline",
        iconActive: "bar-chart",
        colorKey: "primary",
      },
      {
        href: "/(screens)/activity",
        label: "Activity",
        icon: "receipt-outline",
        iconActive: "receipt",
        colorKey: "orange",
      },
      {
        href: "/(screens)/gift",
        label: "Gift",
        icon: "gift-outline",
        iconActive: "gift",
        colorKey: "purple",
      },
    ],
  },
  {
    title: "TRANSACTIONS",
    collapsible: true,
    items: [
      {
        href: "/(screens)/scanner",
        label: "Scan QR",
        icon: "scan-outline",
        iconActive: "scan",
        colorKey: "blue",
      },
      {
        href: "/(screens)/withdraw",
        label: "Withdraw",
        icon: "arrow-up-circle-outline",
        iconActive: "arrow-up-circle",
        colorKey: "orange",
      },
    ],
  },
  {
    title: "REWARDS & INSIGHTS",
    collapsible: true,
    items: [
      {
        href: "/(screens)/markets",
        label: "Market",
        icon: "stats-chart-outline",
        iconActive: "stats-chart",
        colorKey: "primary",
      },
      {
        href: "/(screens)/vouchers",
        label: "Vouchers",
        icon: "ticket-outline",
        iconActive: "ticket",
        colorKey: "orange",
      },
      {
        href: "/(screens)/portfolio",
        label: "Portfolio",
        icon: "pie-chart-outline",
        iconActive: "pie-chart",
        colorKey: "purple",
      },
    ],
  },
];

// ─── Color resolver ───────────────────────────────────────────────────────────
type ColorKey = "primary" | "blue" | "orange" | "purple" | "red";

function resolveIconColor(colors: any, key?: ColorKey): string {
  if (!key) return colors.primary;
  const map: Record<ColorKey, string> = {
    primary: colors.primary,
    blue: colors.blue,
    orange: colors.orange,
    purple: colors.purple,
    red: colors.red,
  };
  return map[key];
}

// ─── Single Nav Row ───────────────────────────────────────────────────────────
function NavRow({
  item,
  active,
  colors,
  isCompact,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  colors: any;
  isCompact: boolean;
  onPress: () => void;
}) {
  const navPadH = isCompact ? Spacing[2] : Spacing[3];
  const labelSize = isCompact ? 11 : Typography.sm;
  const iconSize = isCompact ? 15 : 17;
  const iconColor = active
    ? colors.primary
    : resolveIconColor(colors, item.colorKey);
  const iconName = (active ? item.iconActive : item.icon) as any;

  if (active) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <LinearGradient
          colors={[colors.primaryDim, "rgba(0,211,149,0.03)"]}
          style={[
            styles.navItem,
            { borderColor: colors.primaryBorder, paddingHorizontal: navPadH },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          <Ionicons name={iconName} size={iconSize} color={colors.primary} />
          <Text
            style={[
              styles.navLabel,
              { color: colors.primary, fontWeight: "600", fontSize: labelSize },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={colors.primary}
            style={styles.chevron}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.navItem,
          { borderColor: "transparent", paddingHorizontal: navPadH },
        ]}
      >
        <View style={styles.indicator} />
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
        <Text
          style={[
            styles.navLabel,
            { color: colors.text2, fontSize: labelSize },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────
function SectionBlock({
  section,
  colors,
  isCompact,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  colors: any;
  isCompact: boolean;
  pathname: string;
  onNavigate: (href: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <View style={styles.sectionBlock}>
      {/* Section Header */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => section.collapsible && setCollapsed((p) => !p)}
        activeOpacity={section.collapsible ? 0.6 : 1}
      >
        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>
          {section.title}
        </Text>
        {section.collapsible && (
          <Ionicons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={10}
            color={colors.text3}
          />
        )}
      </TouchableOpacity>

      {/* Items */}
      {!collapsed &&
        section.items.map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActive(item.href)}
            colors={colors}
            isCompact={isCompact}
            onPress={() => onNavigate(item.href)}
          />
        ))}
    </View>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar({
  onToggleTheme,
}: {
  onToggleTheme: () => void;
}) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const pathname = usePathname();
  const { width: screenWidth } = useWindowDimensions();

  //  const { isKycApproved }   = useKycGuard(); // ✅ add karo

  // const [kycModal, setKycModal] = useState(false); // ✅ add karo

  const sidebarWidth = getSidebarWidth(screenWidth);
  const isCompact = screenWidth < WEB_DESKTOP_BP;
  const FREE_ROUTES = ["/", "/(screens)/markets"];

  const {
    data: profileData,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useProfile();

  const profile = profileData ?? (user as any);

  const handleNavigate = (href: string) => {
    // ✅ Free routes — direct navigate
    if (FREE_ROUTES.includes(href)) {
      router.push(href as any);
      return;
    }
    // ✅ KYC required
    // if (!isKycApproved) {
    //   setKycModal(true);
    //   return;
    // }
    router.push(href as any);
  };
  return (
    <>
      <View
        style={[
          styles.container,
          { width: sidebarWidth, borderRightColor: colors.border },
        ]}
      >
        {/* Gradient BG */}
        <LinearGradient
          colors={isDark ? ["#1C1030", "#0C0716"] : ["#FFFFFF", "#F7F5FF"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Logo */}
        <View
          style={[styles.logoSection, { borderBottomColor: colors.border }]}
        >
          <Image
            source={isDark ? logoSourceDark : logoSource}
            style={[styles.logoImg, { width: sidebarWidth - Spacing[4] * 2 }]}
            resizeMode="contain"
          />
        </View>

        {/* Nav */}
        <ScrollView
          style={[
            styles.nav,
            { paddingHorizontal: isCompact ? Spacing[2] : Spacing[3] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {NAV_SECTIONS.map((section) => (
            <SectionBlock
              key={section.title}
              section={section}
              colors={colors}
              isCompact={isCompact}
              pathname={pathname}
              onNavigate={handleNavigate}
            />
          ))}

          {/* Support link */}
          <TouchableOpacity
            style={[
              styles.navItem,
              {
                borderColor: colors.border,
                paddingHorizontal: isCompact ? Spacing[2] : Spacing[3],
                marginTop: Spacing[2],
                borderWidth: 1,
              },
            ]}
            onPress={() => router.push("/(screens)/support" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.indicator} />
            <Ionicons
              name="help-circle-outline"
              size={isCompact ? 15 : 17}
              color={colors.primary}
            />
            <Text
              style={[
                styles.navLabel,
                {
                  color: colors.text2,
                  fontSize: isCompact ? 11 : Typography.sm,
                },
              ]}
            >
              Support
            </Text>
          </TouchableOpacity>

          <View style={{ height: Spacing[6] }} />
        </ScrollView>

        {/* Bottom User + Theme */}
        <View
          style={[
            styles.bottom,
            {
              borderTopColor: colors.border,
              padding: isCompact ? Spacing[3] : Spacing[4],
            },
          ]}
        >
          <View style={styles.userRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.primaryDim,
                  borderColor: colors.primaryBorder,
                  borderWidth: 1,
                  width: isCompact ? 28 : 34,
                  height: isCompact ? 28 : 34,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                U
              </Text>
            </View>

            {!isCompact && (
              <View>
                <Text style={[styles.userAddr, { color: colors.text }]}>
                  {user?.firstName}
                </Text>
                <Text style={[styles.userAddr, { color: colors.text }]}>
                  {typeof profile?.email === "string" ? profile.email : ""}
                </Text>
                <View style={styles.connRow}>
                  <View
                    style={[styles.dot, { backgroundColor: colors.primary }]}
                  />
                  <Text style={[styles.connText, { color: colors.primary }]}>
                    Connected
                  </Text>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={onToggleTheme}
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: isCompact ? 26 : 30,
                height: isCompact ? 26 : 30,
              },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={isCompact ? 13 : 15}
              color={colors.text2}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* <KycRequiredModal
        visible={kycModal}
        onClose={() => setKycModal(false)}
        onGoKyc={() => {
          setKycModal(false);
          router.push('/(app)/kyc' as any);
        }}
        colors={colors}
        isDark={isDark}
      /> */}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    height: "100%",
    borderRightWidth: 1,
    overflow: "hidden",
  },

  /* Logo */
  logoSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  logoImg: {
    height: 56,
  },

  /* Nav */
  nav: {
    flex: 1,
    paddingTop: Spacing[3],
  },

  /* Section */
  sectionBlock: {
    marginBottom: Spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: Spacing[2],
    paddingRight: Spacing[1],
    marginBottom: Spacing[1],
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  /* Nav Row */
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 2,
  },
  indicator: {
    width: 3,
    height: 16,
    borderRadius: 2,
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    fontWeight: "500",
  },
  chevron: {
    flexShrink: 0,
    marginLeft: "auto" as any,
  },

  /* Bottom */
  bottom: {
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    overflow: "hidden",
  },
  avatar: {
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: Typography.xs,
    fontWeight: "700",
  },
  userAddr: {
    fontSize: Typography.xs,
    fontWeight: "600",
  },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  connText: {
    fontSize: 10,
    fontWeight: "500",
  },
  themeBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
