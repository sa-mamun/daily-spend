import React, { useContext } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import { MINT, mintTheme } from "../../theme/mint";
import { taka } from "../../utils/dates";
import type { MonthlyBudgetSummary } from "./budgetService";

export function DashboardBudgetCard({ summary, onPress }: {
  summary: MonthlyBudgetSummary | null;
  onPress: () => void;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const palette = mintTheme(dark);
  const percentage = summary ? (summary.spentAmount / summary.budgetAmount) * 100 : 0;
  const exceeded = percentage > 100;
  const accent = exceeded ? (dark ? "#ff9da4" : "#b52d39") : percentage >= 80 ? (dark ? "#ffd18a" : "#98640d") : MINT;
  const remaining = summary ? Math.abs(summary.budgetAmount - summary.spentAmount) : 0;
  const status = language === "en"
    ? `${taka(remaining, language)} ${exceeded ? "over budget" : "left"}`
    : `${taka(remaining, language)} ${exceeded ? "বাজেটের বেশি" : "বাকি"}`;
  return (
    <Pressable accessibilityRole="button"
      accessibilityLabel={summary ? `${language === "en" ? "Monthly budget" : "মাসিক বাজেট"}, ${status}` : language === "en" ? "Set a monthly budget. Opens budget setup." : "মাসিক বাজেট সেট করুন। বাজেট সেটআপ খুলবে।"}
      onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginTop: 10, opacity: pressed ? 0.82 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
          <Ionicons name="wallet-outline" size={16} color={palette.accentText} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: summary ? 11 : 13, fontWeight: "600" }}>
              {summary ? language === "en" ? "Monthly budget" : "মাসিক বাজেট" : language === "en" ? "Set a monthly budget" : "মাসিক বাজেট সেট করুন"}
            </Text>
            {!summary ? <Text style={{ color: palette.muted, fontSize: 11, marginTop: 3 }}>{language === "en" ? "Plan this month's spending" : "এই মাসের খরচের সীমা ঠিক করুন"}</Text> : null}
          </View>
        </View>
        {summary ? <Text style={{ color: exceeded ? accent : palette.muted, fontSize: 11, flexShrink: 1 }}>{status}</Text>
          : <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: palette.soft }}><Ionicons name="add" size={20} color={palette.accentText} /></View>}
      </View>
      {summary ? <View style={{ height: 5, borderRadius: 5, overflow: "hidden", backgroundColor: palette.soft, marginTop: 7 }}><View style={{ height: "100%", width: `${Math.min(100, Math.max(0, percentage))}%`, backgroundColor: accent, borderRadius: 5 }} /></View> : null}
    </Pressable>
  );
}
