/**
 * app/(screens)/help.tsx
 * Help & Support page — Uses React Query hooks
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";

// ✅ Import React Query hooks
import { useFaqs, useCreateSupportTicket } from "@/hooks/queires";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FAQ {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
  category?: string;
}

// ─── Contact Methods ──────────────────────────────────────────────────────────
const CONTACT_METHODS = [
  {
    id: "chat",
    icon: "chatbubble-outline",
    label: "Live chat",
    subtitle: "Chat with our support team",
    badge: "Online now",
    badgeColor: "#00D395",
    action: "chat",
  },
  {
    id: "email",
    icon: "mail-outline",
    label: "Email",
    subtitle: "We reply within 24 hrs",
    badge: "24h reply",
    badgeColor: "#FF4D6A",
    action: "email",
  },
  {
    id: "call",
    icon: "call-outline",
    label: "Call us",
    subtitle: "Mon-Fri, 9am-6pm",
    badge: "Scheduled",
    badgeColor: "#f7931a",
    action: "call",
  },
  {
    id: "social",
    icon: "logo-twitter",
    label: "Social",
    subtitle: "DM us on twitter/X",
    badge: "@Metavault",
    badgeColor: "#9945ff",
    action: "social",
  },
] as const;

// ─── Browse Topics ────────────────────────────────────────────────────────────
const TOPICS = [
  { id: "wallet",   icon: "wallet-outline",           label: "Wallet &\nDeposits",  color: "#627eea" },
  { id: "swap",     icon: "swap-horizontal-outline",  label: "Swap &\nTrading",     color: "#f7931a" },
  { id: "security", icon: "shield-checkmark-outline", label: "Security &\nKYC",     color: "#00D395" },
  { id: "fees",     icon: "receipt-outline",          label: "Fees &\nlimits",      color: "#9945ff" },
  { id: "account",  icon: "settings-outline",         label: "Account\nSettings",   color: "#2775ca" },
  { id: "app",      icon: "phone-portrait-outline",   label: "App &\nDevices",      color: "#ef0027" },
] as const;

// ─── Contact Card ─────────────────────────────────────────────────────────────
const ContactCard = React.memo(function ContactCard({
  method,
  colors,
  onPress,
}: {
  method: typeof CONTACT_METHODS[number];
  colors: any;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View
      style={[
        cc.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={cc.inner}
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()
        }
        onPress={onPress}
      >
        <View style={[cc.iconWrap, { backgroundColor: `${method.badgeColor}20` }]}>
          <Ionicons name={method.icon as any} size={28} color={colors.text} />
        </View>
        <Text style={[cc.label, { color: colors.text }]}>{method.label}</Text>
        <Text style={[cc.subtitle, { color: colors.text2 }]}>{method.subtitle}</Text>
        <View style={[cc.badge, { backgroundColor: method.badgeColor }]}>
          <Text style={cc.badgeTxt}>{method.badge}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const cc = StyleSheet.create({
  card: {
    flex: 1, minWidth: "47%", maxWidth: "48%",
    borderRadius: Radius["2xl"], borderWidth: 1.5, marginBottom: 14,
  },
  inner: {
    alignItems: "center", paddingVertical: 24,
    paddingHorizontal: 12, gap: 8,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  label:    { fontSize: Typography.base, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: Typography.xs, textAlign: "center", lineHeight: 16 },
  badge:    { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full, marginTop: 6 },
  badgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ─── Topic Card ───────────────────────────────────────────────────────────────
const TopicCard = React.memo(function TopicCard({
  topic,
  colors,
  onPress,
}: {
  topic: typeof TOPICS[number];
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[tc.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[tc.iconWrap, { backgroundColor: `${topic.color}20` }]}>
        <Ionicons name={topic.icon as any} size={24} color={topic.color} />
      </View>
      <Text style={[tc.label, { color: colors.text }]}>{topic.label}</Text>
    </TouchableOpacity>
  );
});

const tc = StyleSheet.create({
  card: {
    flex: 1, minWidth: "47%", maxWidth: "48%",
    borderRadius: Radius.xl, borderWidth: 1.5,
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: Typography.sm, fontWeight: "700", lineHeight: 18, flex: 1 },
});

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
const FAQItem = React.memo(function FAQItem({
  faq,
  colors,
  GREEN,
}: {
  faq: FAQ;
  colors: any;
  GREEN: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const faqId = faq._id ?? faq.id ?? faq.question;

  return (
    <TouchableOpacity
      style={[
        fq.card,
        {
          backgroundColor: colors.card,
          borderColor: expanded ? GREEN : colors.border,
        },
      ]}
      onPress={() => setExpanded(prev => !prev)}
      activeOpacity={0.9}
    >
      <View style={fq.header}>
        <Text style={[fq.question, { color: colors.text }]}>{faq.question}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={expanded ? GREEN : colors.text2}
        />
      </View>
      {expanded && (
        <View style={[fq.answerWrap, { borderTopColor: colors.borderSoft }]}>
          <Text style={[fq.answer, { color: colors.text2 }]}>{faq.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const fq = StyleSheet.create({
  card:      { borderRadius: Radius.xl, borderWidth: 1.5, padding: 16, marginBottom: 10 },
  header:    { flexDirection: "row", alignItems: "center", gap: 10 },
  question:  { flex: 1, fontSize: Typography.sm, fontWeight: "700", lineHeight: 20 },
  answerWrap:{ marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  answer:    { fontSize: Typography.sm, lineHeight: 20 },
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const FAQSkeleton = React.memo(function FAQSkeleton({ colors }: { colors: any }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={[
            fq.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              gap: 8,
            },
          ]}
        >
          <View style={[sk.line, { width: '80%', backgroundColor: colors.border }]} />
          <View style={[sk.line, { width: '50%', backgroundColor: colors.border, opacity: 0.5 }]} />
        </View>
      ))}
    </>
  );
});

const sk = StyleSheet.create({
  line: { height: 12, borderRadius: 6 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function HelpSupportScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const GREEN      = colors.primary;

  const [search,        setSearch]        = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // ✅ React Query — FAQs
  const {
    data: faqsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useFaqs();

  // ✅ React Query — Create support ticket
  const createTicketMutation = useCreateSupportTicket();

  // ✅ Normalize FAQ data from any response shape
  const faqs: FAQ[] = React.useMemo(() => {
    if (!faqsData) return [];
    const data = faqsData as any;
    // Handle various response shapes
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.faqs)) return data.faqs;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [faqsData]);

  // ✅ Filter FAQs based on search
  const filteredFaqs = React.useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return faqs.filter(
        f =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    return faqs.slice(0, 5);
  }, [faqs, search]);

  // ── Contact action handler ─────────────────────────────────────────────────
  const handleContactAction = useCallback((action: string) => {
    switch (action) {
      case "chat":
        Alert.alert("Live Chat", "Opening live chat...");
        break;
      case "email":
        Linking.openURL("mailto:support@metavault.com");
        break;
      case "call":
        Linking.openURL("tel:+1234567890");
        break;
      case "social":
        Linking.openURL("https://twitter.com/metavault");
        break;
    }
  }, []);

  // ── Topic handler ──────────────────────────────────────────────────────────
  const handleTopicPress = useCallback((topic: typeof TOPICS[number]) => {
    Alert.alert(
      topic.label.replace('\n', ' '),
      "Browse articles related to this topic?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Search",
          onPress: () => setSearch(topic.label.split('\n')[0]),
        },
      ]
    );
  }, []);

  // ── Refresh ────────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Error state ────────────────────────────────────────────────────────────
  const renderError = () => (
    <View style={s.emptyWrap}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.text3} />
      <Text style={[s.emptyTxt, { color: colors.text2 }]}>
        Failed to load FAQs
      </Text>
      <TouchableOpacity
        onPress={onRefresh}
        style={[s.retryBtn, { backgroundColor: `${GREEN}20`, borderColor: GREEN }]}
      >
        <Ionicons name="refresh" size={14} color={GREEN} />
        <Text style={[s.retryTxt, { color: GREEN }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.canGoBack() ? router.back() : router.push("/")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Help & Support</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={GREEN}
          />
        }
      >

        {/* ── Search Bar ── */}
        <View style={[
          s.searchBar,
          {
            backgroundColor: colors.card,
            borderColor: searchFocused ? GREEN : colors.border,
          },
        ]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? GREEN : colors.text2}
          />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search help articles"
            placeholderTextColor={colors.text3}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.text2} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Contact us ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Contact us</Text>
        <View style={s.contactGrid}>
          {CONTACT_METHODS.map(m => (
            <ContactCard
              key={m.id}
              method={m}
              colors={colors}
              onPress={() => handleContactAction(m.action)}
            />
          ))}
        </View>

        {/* ── System Status ── */}
        <View style={[s.statusCard, { backgroundColor: `${GREEN}15`, borderColor: `${GREEN}40` }]}>
          <Ionicons name="checkmark-circle" size={20} color={GREEN} />
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, { color: colors.text }]}>
              All systems operational
            </Text>
            <Text style={[s.statusSub, { color: colors.text2 }]}>
              No ongoing incidents · Last checked just now
            </Text>
          </View>
        </View>

        {/* ── Browse Topics ── */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Browse topics</Text>
        <View style={s.topicGrid}>
          {TOPICS.map(t => (
            <TopicCard
              key={t.id}
              topic={t}
              colors={colors}
              onPress={() => handleTopicPress(t)}
            />
          ))}
        </View>

        {/* ── FAQs ── */}
        <View style={s.faqHeader}>
          <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            Frequently asked
          </Text>
          {!isLoading && faqs.length > 0 && (
            <View style={[s.faqCount, { backgroundColor: `${GREEN}20` }]}>
              <Text style={[s.faqCountText, { color: GREEN }]}>
                {faqs.length} articles
              </Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          {isLoading ? (
            // ✅ Skeleton loading
            <FAQSkeleton colors={colors} />
          ) : isError ? (
            // ✅ Error state
            renderError()
          ) : filteredFaqs.length === 0 ? (
            // ✅ Empty state
            <View style={s.emptyWrap}>
              <View style={[s.emptyIcon, { backgroundColor: `${GREEN}15` }]}>
                <Ionicons name="help-circle-outline" size={36} color={GREEN} />
              </View>
              <Text style={[s.emptyTxt, { color: colors.text2 }]}>
                {search
                  ? `No results for "${search}"`
                  : "No FAQs available"}
              </Text>
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  style={[s.retryBtn, { backgroundColor: `${GREEN}20`, borderColor: GREEN }]}
                >
                  <Text style={[s.retryTxt, { color: GREEN }]}>Clear search</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // ✅ FAQ list
            filteredFaqs.map(faq => (
              <FAQItem
                key={faq._id ?? faq.id ?? faq.question}
                faq={faq}
                colors={colors}
                GREEN={GREEN}
              />
            ))
          )}
        </View>

        {/* ── Show more FAQs ── */}
        {!isLoading && !isError && !search && faqs.length > 5 && (
          <TouchableOpacity
            style={[s.showMoreBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setSearch(" ")} // trigger full list
            activeOpacity={0.8}
          >
            <Text style={[s.showMoreTxt, { color: colors.text2 }]}>
              View all {faqs.length} articles
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text2} />
          </TouchableOpacity>
        )}

        {/* ── Submit a ticket ── */}
        <View style={[s.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.ticketIcon, { backgroundColor: `${GREEN}20` }]}>
            <Ionicons name="create-outline" size={24} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.ticketTitle, { color: colors.text }]}>
              Still need help?
            </Text>
            <Text style={[s.ticketSub, { color: colors.text2 }]}>
              Submit a support ticket and we'll get back to you
            </Text>
          </View>
          <TouchableOpacity
            style={[s.ticketBtn, { backgroundColor: GREEN }]}
            onPress={() => router.push("/(screens)/support-ticket" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.ticketBtnTxt}>Submit</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={[
        s.ctaWrap,
        {
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
      ]}>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: GREEN }]}
          onPress={() => handleContactAction("chat")}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
          <Text style={s.ctaBtnTxt}>Start live chat</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing[4], paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontSize: Typography.lg, fontWeight: "700",
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
  },

  scroll: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: Radius.full, borderWidth: 1.5,
    paddingHorizontal: 16, height: 50, marginBottom: 24,
  },
  searchInput: { flex: 1, fontSize: Typography.base, padding: 0 },

  sectionTitle:  { fontSize: Typography.xl, fontWeight: "800", marginBottom: 16 },
  contactGrid:   { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },

  statusCard: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, borderRadius: Radius.xl, borderWidth: 1,
    padding: 16, marginBottom: 32,
  },
  statusTitle: { fontSize: Typography.base, fontWeight: "700", marginBottom: 3 },
  statusSub:   { fontSize: Typography.xs, lineHeight: 18 },

  topicGrid: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", marginBottom: 32,
  },

  faqHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 0,
  },
  faqCount: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  faqCountText: { fontSize: 11, fontWeight: "700" },

  emptyWrap: { paddingVertical: 40, alignItems: "center", gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  emptyTxt: { fontSize: Typography.sm },

  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
  },
  retryTxt: { fontSize: Typography.sm, fontWeight: "700" },

  showMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, padding: 14, borderRadius: Radius.xl,
    borderWidth: 1, marginBottom: 24,
  },
  showMoreTxt: { fontSize: Typography.sm, fontWeight: "600" },

  ticketCard: {
    flexDirection: "row", alignItems: "center",
    gap: 12, padding: 16, borderRadius: Radius.xl,
    borderWidth: 1, marginBottom: 24,
  },
  ticketIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  ticketTitle: { fontSize: Typography.sm, fontWeight: "700", marginBottom: 3 },
  ticketSub:   { fontSize: Typography.xs, lineHeight: 16 },
  ticketBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.lg,
  },
  ticketBtnTxt: { color: "#fff", fontSize: Typography.xs, fontWeight: "700" },

  ctaWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing[4], paddingTop: 16, borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: Radius.xl,
  },
  ctaBtnTxt: { color: "#fff", fontSize: Typography.base, fontWeight: "700" },
});