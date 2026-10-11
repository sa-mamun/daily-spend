import React, { useContext } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import { mintTheme, MINT } from "../../theme/mint";
import { taka } from "../../utils/dates";
import { BudgetActionButton } from "./BudgetActionButton";
import { BudgetEmptyState } from "./BudgetEmptyState";

export function MonthlyBudgetCard({ amount, spent, warning, onEdit }: {
  amount: number | null; spent: number; warning: boolean; onEdit: () => void;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const en = language === "en";
  const p = mintTheme(dark);
  const exceeded = amount !== null && spent > amount;
  const status = exceeded ? dark ? "#ff9da4" : "#b52d39" : warning ? dark ? "#ffd18a" : "#98640d" : p.accentText;
  const percentage = amount ? Math.round(spent / amount * 100) : 0;
  return <View style={[s.card, { backgroundColor: p.surface }]}>
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: p.text }]}>{en ? "Monthly budget" : "মাসিক বাজেট"}</Text>
        <Text style={[s.caption, { color: p.muted }]}>{en ? "Your monthly spending limit" : "এই মাসের খরচের সীমা"}</Text>
      </View>
      {amount !== null && <BudgetActionButton kind="edit"
        accessibilityLabel={en ? amount === null ? "Add monthly budget" : "Edit monthly budget" : amount === null ? "মাসিক বাজেট যোগ করুন" : "মাসিক বাজেট এডিট"}
        onPress={onEdit} />}
    </View>
    {amount !== null ? <>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7} style={[s.amount, { color: p.text }]}>{taka(amount, language)}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={en ? "Monthly budget used" : "মাসিক বাজেটের ব্যবহার"}
        accessibilityValue={{ min: 0, max: 100, now: Math.min(100, percentage), text: percentage + "%" }}
        style={[s.track, { backgroundColor: p.soft }]}>
        <View style={{ height: "100%", width: `${Math.min(100, Math.max(0, spent / amount * 100))}%`, backgroundColor: exceeded || warning ? status : MINT, borderRadius: 3 }} />
      </View>
      <View style={s.summary}>
        <View style={s.stat}><Text style={[s.caption, { color: p.muted }]}>{en ? "Spent" : "খরচ"}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, { color: p.text }]}>{taka(spent, language)}</Text></View>
        <View style={[s.stat, { alignItems: "flex-end" }]}><Text style={[s.caption, { color: p.muted }]}>{en ? exceeded ? "Over by" : "Remaining" : exceeded ? "বেশি খরচ" : "বাকি"}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[s.value, { color: status }]}>{taka(Math.abs(amount - spent), language)}</Text></View>
      </View>
      <Text style={[s.caption, { color: p.muted, marginTop: 10 }]}>{percentage}% {en ? "used" : "ব্যবহৃত"}</Text>
    </> : <BudgetEmptyState icon="wallet-outline"
      message={en ? "No monthly budget set yet." : "এখনো মাসিক বাজেট সেট করা হয়নি।"}
      label={en ? "Add budget" : "বাজেট যোগ করুন"}
      accessibilityLabel={en ? "Add monthly budget" : "মাসিক বাজেট যোগ করুন"}
      onAdd={onEdit} />}
  </View>;
}
const s = StyleSheet.create({
  card: { borderRadius: 13, paddingHorizontal: 13, paddingVertical: 14, marginBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "600" },
  amount: { fontSize: 27, fontWeight: "500", letterSpacing: -.6, marginTop: 3 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 15, marginBottom: 12 },
  summary: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  stat: { flex: 1, minWidth: 0 }, caption: { fontSize: 11, lineHeight: 16 },
  value: { fontSize: 13, fontWeight: "500", marginTop: 5 },
  empty: { fontSize: 12, lineHeight: 18, marginTop: 10, marginBottom: 5 },
});
