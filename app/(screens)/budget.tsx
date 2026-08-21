/**
 * app/(screens)/budget.tsx
 * Budget page — matches Budget.pdf + Budget-1.pdf design
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";

const { height: SCREEN_H } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
interface BudgetItem {
  id: string;
  category: string;
  icon: string;
  spent: number;
  limit: number;
  threshold: number;
  color: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Shopping",      icon: "bag-outline",           color: "#2775ca" },
  { label: "Dining",        icon: "restaurant-outline",    color: "#f7931a" },
  { label: "Travel",        icon: "airplane-outline",      color: "#9945ff" },
  { label: "Entertainment", icon: "film-outline",          color: "#ef0027" },
  { label: "Health",        icon: "heart-outline",         color: "#00D395" },
  { label: "Groceries",     icon: "cart-outline",          color: "#627eea" },
];

const THRESHOLDS = [50, 75, 80, 90, 95];

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INITIAL_BUDGETS: BudgetItem[] = [
  {
    id: "1",
    category: "Dining",
    icon: "restaurant-outline",
    spent: 350,
    limit: 500,
    threshold: 80,
    color: "#f7931a",
  },
  {
    id: "2",
    category: "Shopping",
    icon: "bag-outline",
    spent: 120,
    limit: 300,
    threshold: 80,
    color: "#2775ca",
  },
];

// ─── Animated Progress Bar ────────────────────────────────────────────────────
function ProgressBar({
  spent,
  limit,
  threshold,
  primary,
}: {
  spent: number;
  limit: number;
  threshold: number;
  primary: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = Math.min(spent / limit, 1);
  const over = pct * 100 >= threshold;
  const barColor = over ? "#FF4D6A" : primary;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width, backgroundColor: barColor }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginVertical: 12,
  },
  fill: { height: "100%", borderRadius: 3 },
});

// ─── Budget Card ──────────────────────────────────────────────────────────────
function BudgetCard({
  item,
  colors,
  primary,
  onDelete,
}: {
  item: BudgetItem;
  colors: any;
  primary: string;
  onDelete: (id: string) => void;
}) {
  const pct      = Math.min(item.spent / item.limit, 1);
  const left     = item.limit - item.spent;
  const over     = pct * 100 >= item.threshold;
  const statusColor = over ? "#FF4D6A" : primary;
  const statusLabel = over ? "Near limit" : "On track";

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn  = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[bc.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Top row */}
        <View style={bc.topRow}>
          <View style={bc.leftCol}>
            <View style={bc.nameRow}>
              <View style={[bc.iconDot, { backgroundColor: `${item.color}25` }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={[bc.name, { color: colors.text }]}>{item.category}</Text>
            </View>
            <Text style={[bc.amtTxt, { color: colors.text2 }]}>
              ${item.spent}/${item.limit}
            </Text>
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={bc.deleteBtn}
            onPress={() => {
              Alert.alert(
                "Delete Budget",
                `Remove ${item.category} budget?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(item.id),
                  },
                ]
              );
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={20} color="#c0392b" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <ProgressBar
          spent={item.spent}
          limit={item.limit}
          threshold={item.threshold}
          primary={primary}
        />

        {/* Bottom row */}
        <View style={bc.bottomRow}>
          <Text style={[bc.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={[bc.leftTxt, { color: statusColor }]}>
            ${left} left
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const bc = StyleSheet.create({
  card: {
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: 14,
  },
  topRow:    { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  leftCol:   { flex: 1 },
  nameRow:   { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  iconDot:   { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name:      { fontSize: Typography.xl, fontWeight: "800" },
  amtTxt:    { fontSize: Typography.sm, marginLeft: 42 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: Radius.lg,
    backgroundColor: "rgba(192,57,43,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusTxt: { fontSize: Typography.sm, fontWeight: "700" },
  leftTxt:   { fontSize: Typography.sm, fontWeight: "700" },
});

// ─── Total Budget Card ────────────────────────────────────────────────────────
function TotalBudgetCard({
  budgets,
  colors,
  primary,
}: {
  budgets: BudgetItem[];
  colors: any;
  primary: string;
}) {
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const pct        = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(pct / 100, 1),
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const barColor = pct > 85 ? "#FF4D6A" : primary;

  return (
    <View style={[tb.card, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "40" }]}>
      {/* Header */}
      <View style={tb.row}>
        <View>
          <Text style={[tb.title, { color: colors.text }]}>Total Budget</Text>
          <Text style={[tb.sub, { color: colors.text2 }]}>This month</Text>
        </View>
        <View style={tb.rightCol}>
          <Text style={[tb.amount, { color: colors.text }]}>
            ${totalSpent.toLocaleString()}
          </Text>
          <Text style={[tb.limitTxt, { color: colors.text2 }]}>
            Of ${totalLimit.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={tb.track}>
        <Animated.View
          style={[tb.fill, { width, backgroundColor: barColor }]}
        />
      </View>

      {/* Percentage */}
      <Text style={[tb.pctTxt, { color: barColor }]}>
        {pct.toFixed(1)}% used
      </Text>
    </View>
  );
}

const tb = StyleSheet.create({
  card: {
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: Spacing[5],
    marginBottom: 20,
  },
  row:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rightCol: { alignItems: "flex-end" },
  title:    { fontSize: Typography.xl, fontWeight: "800" },
  sub:      { fontSize: Typography.sm, marginTop: 3 },
  amount:   { fontSize: 28, fontWeight: "800" },
  limitTxt: { fontSize: Typography.sm, marginTop: 2 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 8,
  },
  fill:   { height: "100%", borderRadius: 3 },
  pctTxt: { fontSize: Typography.sm, fontWeight: "700", textAlign: "right" },
});

// ─── Create Budget Bottom Sheet ───────────────────────────────────────────────
function CreateBudgetSheet({
  visible,
  colors,
  primary,
  insets,
  onClose,
  onCreate,
}: {
  visible: boolean;
  colors: any;
  primary: string;
  insets: any;
  onClose: () => void;
  onCreate: (item: Omit<BudgetItem, "id">) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  const [selCategory,  setSelCategory]  = useState(CATEGORIES[0]);
  const [limit,        setLimit]        = useState("1000");
  const [selThreshold, setSelThreshold] = useState(80);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 60, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 1, duration: 300, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H, duration: 280, useNativeDriver: true,
        }),
        Animated.timing(bgAnim, {
          toValue: 0, duration: 280, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleCreate = useCallback(() => {
    const lim = parseFloat(limit);
    if (!lim || lim <= 0) {
      Alert.alert("Invalid Limit", "Please enter a valid monthly limit.");
      return;
    }
    onCreate({
      category:  selCategory.label,
      icon:      selCategory.icon,
      spent:     0,
      limit:     lim,
      threshold: selThreshold,
      color:     selCategory.color,
    });
    // Reset
    setSelCategory(CATEGORIES[0]);
    setLimit("1000");
    setSelThreshold(80);
    onClose();
  }, [limit, selCategory, selThreshold, onCreate, onClose]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View
        style={[
          cbs.backdrop,
          { opacity: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
        ]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={cbs.kavWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            cbs.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 24,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[cbs.handle, { backgroundColor: colors.border }]} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={[cbs.title, { color: colors.text }]}>Create Budget</Text>

            {/* Category */}
            <Text style={[cbs.sectionLabel, { color: colors.text }]}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={cbs.catRow}
            >
              {CATEGORIES.map((cat) => {
                const active = selCategory.label === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[
                      cbs.catChip,
                      {
                        backgroundColor: active ? cat.color : "transparent",
                        borderColor: active ? cat.color : colors.border,
                      },
                    ]}
                    onPress={() => setSelCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={active ? "#fff" : colors.text2}
                    />
                    <Text
                      style={[
                        cbs.catChipTxt,
                        { color: active ? "#fff" : colors.text2 },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Monthly Limit */}
            <Text style={[cbs.sectionLabel, { color: colors.text }]}>
              Monthly Limit ($)
            </Text>
            <View
              style={[
                cbs.inputWrap,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[cbs.inputPrefix, { color: colors.text2 }]}>$</Text>
              <TextInput
                style={[cbs.input, { color: colors.text }]}
                value={limit}
                onChangeText={(t) => {
                  if (/^\d*\.?\d*$/.test(t)) setLimit(t);
                }}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={colors.text3}
              />
            </View>

            {/* Alert Threshold */}
            <Text style={[cbs.sectionLabel, { color: colors.text }]}>
              Alert Threshold ({selThreshold}%)
            </Text>
            <View style={cbs.threshRow}>
              {THRESHOLDS.map((t) => {
                const active = selThreshold === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      cbs.threshChip,
                      {
                        backgroundColor: active
                          ? primary
                          : colors.surface,
                        borderColor: active ? primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelThreshold(t)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        cbs.threshTxt,
                        { color: active ? "#fff" : colors.text2 },
                      ]}
                    >
                      {t}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Preview */}
            {parseFloat(limit) > 0 && (
              <View
                style={[
                  cbs.preview,
                  {
                    backgroundColor: `${selCategory.color}12`,
                    borderColor: `${selCategory.color}30`,
                  },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={selCategory.color}
                />
                <Text style={[cbs.previewTxt, { color: colors.text2 }]}>
                  Alert when spending reaches{" "}
                  <Text style={{ color: selCategory.color, fontWeight: "700" }}>
                    ${((parseFloat(limit) * selThreshold) / 100).toFixed(0)}
                  </Text>{" "}
                  ({selThreshold}% of ${parseFloat(limit).toLocaleString()})
                </Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[cbs.createBtn, { backgroundColor: primary }]}
              onPress={handleCreate}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={cbs.createBtnTxt}>Create Budget</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const cbs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  kavWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: Spacing[5],
    paddingTop: 12,
    maxHeight: SCREEN_H * 0.92,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 20,
  },
  title: {
    fontSize: 26, fontWeight: "800", marginBottom: 24,
  },
  sectionLabel: {
    fontSize: Typography.base, fontWeight: "700",
    marginBottom: 14, marginTop: 4,
  },
  catRow: { gap: 10, paddingBottom: 4, paddingRight: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  catChipTxt: { fontSize: Typography.sm, fontWeight: "700" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: Radius.xl, borderWidth: 1,
    paddingHorizontal: 16, height: 58,
    marginBottom: 22,
  },
  inputPrefix: { fontSize: 22, fontWeight: "700", marginRight: 6 },
  input: { flex: 1, fontSize: 22, fontWeight: "700" },
  threshRow: {
    flexDirection: "row", gap: 8,
    flexWrap: "wrap", marginBottom: 20,
  },
  threshChip: {
    flex: 1, minWidth: 56,
    paddingVertical: 14,
    borderRadius: Radius.lg, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  threshTxt: { fontSize: Typography.sm, fontWeight: "700" },
  preview: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, padding: 14, borderRadius: Radius.xl,
    borderWidth: 1, marginBottom: 20,
  },
  previewTxt: { flex: 1, fontSize: Typography.sm, lineHeight: 20 },
  createBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    paddingVertical: 18, borderRadius: Radius.xl,
    marginTop: 4,
  },
  createBtnTxt: { color: "#fff", fontSize: Typography.base, fontWeight: "800" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function BudgetScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const primary      = colors.primary;

  const [budgets,     setBudgets]     = useState<BudgetItem[]>(INITIAL_BUDGETS);
  const [showCreate,  setShowCreate]  = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleCreate = useCallback((item: Omit<BudgetItem, "id">) => {
    const newItem: BudgetItem = {
      ...item,
      id: `budget_${Date.now()}`,
    };
    setBudgets((prev) => [...prev, newItem]);
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────
  const isEmpty = budgets.length === 0;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/")
          }
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>Budget</Text>

        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: `${primary}20` }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={primary} />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: 40 + insets.bottom },
        ]}
      >
        {/* Total Budget Card */}
        {!isEmpty && (
          <TotalBudgetCard
            budgets={budgets}
            colors={colors}
            primary={primary}
          />
        )}

        {/* Budget Items */}
        {budgets.map((item) => (
          <BudgetCard
            key={item.id}
            item={item}
            colors={colors}
            primary={primary}
            onDelete={handleDelete}
          />
        ))}

        {/* Empty State */}
        {isEmpty && (
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: `${primary}15` }]}>
              <Ionicons name="wallet-outline" size={48} color={primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>
              No Budgets Yet
            </Text>
            <Text style={[s.emptySub, { color: colors.text2 }]}>
              Create your first budget to start tracking your spending
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: primary }]}
              onPress={() => setShowCreate(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.emptyBtnTxt}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Create Budget Sheet ── */}
      {showCreate && (
        <CreateBudgetSheet
          visible={showCreate}
          colors={colors}
          primary={primary}
          insets={insets}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 38, height: 38,
    borderRadius: Radius.lg,
    alignItems: "center", justifyContent: "center",
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: "center",
    justifyContent: "center",
    paddingTop: 80, gap: 16,
  },
  emptyIcon: {
    width: 100, height: 100,
    borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  emptySub: {
    fontSize: Typography.sm,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: Radius.xl, marginTop: 8,
  },
  emptyBtnTxt: { color: "#fff", fontSize: Typography.base, fontWeight: "700" },
});