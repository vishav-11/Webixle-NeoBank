import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from "@/styles/theme";

export const TABS = [
  { key: "dashboard", label: "Dashboard", icon: "grid-outline"        },
  { key: "add",       label: "Add",       icon: "add-circle-outline"  },
  { key: "repay",     label: "Repay",     icon: "cash-outline"        },
  { key: "history",   label: "History",   icon: "time-outline"        },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

interface Props {
  activeTab: TabKey;
  onTabPress: (key: TabKey) => void;
}

const LoanTabBar: React.FC<Props> = ({ activeTab, onTabPress }) => {
  const { colors } = useTheme();

  return (
    <View style={[t.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              t.tabBtn,
              active
                ? { backgroundColor: colors.accentDim, borderColor: colors.accentBorder }
                : { backgroundColor: colors.surface,   borderColor: colors.border       },
            ]}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={tab.icon as any}
              size={IconSize.xs}
              color={active ? colors.accent : colors.text3}
            />
            <Text style={[t.tabTxt, { color: active ? colors.accent : colors.text2 }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default LoanTabBar;

const t = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  tabTxt: {
    fontSize: Typography.xs,
    fontWeight: "600",
  },
});