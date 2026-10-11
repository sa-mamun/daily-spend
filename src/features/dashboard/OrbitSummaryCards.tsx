import React, { useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "../../theme/constants";
import { LanguageContext } from "../../context/LanguageContext";
import { Text } from "../../i18n/Text";
import { taka } from "../../utils/dates";
import { orbitTheme, ORBIT_CARD_RADIUS } from "./orbitTheme";

export function OrbitSummaryCards({ todayTotal, budgetAmount, onBudget }: {
  todayTotal: number; budgetAmount: number | null; onBudget: () => void;
}) {
  const palette = orbitTheme(useContext(ThemeContext));
  const { language } = useContext(LanguageContext);
  const en = language === "en";
  return <View style={s.row}>
    <View style={[s.card, { backgroundColor: palette.surface }]}>
      <Text style={[s.label, { color: palette.muted }]}>{en ? "Today’s expense" : "আজকের খরচ"}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, { color: palette.text }]}>{taka(todayTotal, language)}</Text>
    </View>
    <Pressable accessibilityRole="button" onPress={onBudget} style={({ pressed }) => [s.card, { backgroundColor: palette.surface, opacity: pressed ? .7 : 1 }]}>
      <View style={s.header}>
        <Text style={[s.label, { color: palette.muted, flex: 1 }]}>{en ? "Monthly budget" : "মাসিক বাজেট"}</Text>
        <Ionicons name={budgetAmount === null ? "add" : "create-outline"} size={16} color={palette.text} />
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, { color: palette.text }]}>{budgetAmount === null ? en ? "Set budget" : "বাজেট সেট করুন" : taka(budgetAmount, language)}</Text>
    </Pressable>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginVertical: 12 },
  card: { flex: 1, borderRadius: ORBIT_CARD_RADIUS, padding: 13, gap: 8, minWidth: 0 },
  header: { flexDirection: "row", gap: 6, alignItems: "center" },
  label: { fontSize: 11, lineHeight: 16 }, value: { fontSize: 19, lineHeight: 25, fontWeight: "500" },
});
