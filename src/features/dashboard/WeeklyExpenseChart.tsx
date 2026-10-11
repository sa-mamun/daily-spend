import React, { useContext, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import type { Expense } from "../../types/models";
import { localDateKey } from "../../utils/dates";
import { EmptyState } from "../../components/ExpenseList";
import { orbitTheme, ORBIT_CARD_RADIUS } from "./orbitTheme";

export function weeklyExpensePoints(expenses: Expense[], now: Date) {
  const totals = expenses.reduce<Record<string, number>>((result, expense) => {
    result[expense.expenseDate] = (result[expense.expenseDate] || 0) + expense.amount;
    return result;
  }, {});
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay() + index);
    return { date, key: localDateKey(date), value: totals[localDateKey(date)] || 0 };
  });
}

export function monthlyExpensePoints(expenses: Expense[], now: Date) {
  const totals = expenses.reduce<Record<string, number>>((result, expense) => {
    result[expense.expenseDate] = (result[expense.expenseDate] || 0) + expense.amount;
    return result;
  }, {});
  const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
    const key = localDateKey(date);
    return { date, key, value: totals[key] || 0 };
  });
}

export function WeeklyExpenseChart({ expenses, onAddExpense }: { expenses: Expense[]; onAddExpense?: () => void }) {
  const dark = useContext(ThemeContext);
  const palette = orbitTheme(dark);
  const { language } = useContext(LanguageContext);
  const en = language === "en";
  const now = new Date();
  const todayKey = localDateKey(now);
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const points = useMemo(() => range === "weekly" ? weeklyExpensePoints(expenses, now) : monthlyExpensePoints(expenses, now), [expenses, todayKey, range]);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selected = points.find(point => point.key === selectedKey) || points.find(point => point.key === todayKey)!;
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const max = Math.max(...points.map(point => point.value), 1);
  const days = en ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  const number = (value: number) => value.toLocaleString(en ? "en-US" : "bn-BD", { maximumFractionDigits: 2 });
  const money = (value: number) => `${en ? "Tk " : "৳"}${number(value)}`;
  const dayNumber = (date: Date) => number(date.getDate());
  const month = (date: Date) => date.toLocaleDateString(en ? "en-GB" : "bn-BD", { month: "short" });
  const start = points[0].date, end = points[6].date;
  const period = range === "monthly" ? now.toLocaleDateString(en ? "en-GB" : "bn-BD", { month: "short", year: "numeric" }) : start.getMonth() === end.getMonth()
    ? `${dayNumber(start)}–${dayNumber(end)} ${month(end)}`
    : `${dayNumber(start)} ${month(start)}–${dayNumber(end)} ${month(end)}`;

  return <View style={[s.card, { backgroundColor: palette.surface }]}>
    <View style={s.heading}>
      <Text style={[s.title, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85}>{en ? "Expense chart" : "খরচের চিত্র"}</Text>
      <View style={[s.tabs, { backgroundColor: palette.soft }]}>
      {(["weekly", "monthly"] as const).map(value => <Pressable key={value} accessibilityRole="tab"
        hitSlop={{ top: 6, bottom: 6 }}
        accessibilityState={{ selected: range === value }} onPress={() => { setRange(value); setSelectedKey(todayKey); }}
        style={({ pressed }) => [s.tab, { backgroundColor: range === value ? palette.primary : "transparent", opacity: pressed ? .75 : 1 }]}>
        <Text style={[s.tabText, { color: range === value ? palette.primaryText : palette.muted }]}>{value === "weekly" ? en ? "Weekly" : "সাপ্তাহিক" : en ? "Monthly" : "মাসিক"}</Text>
      </Pressable>)}
      </View>
    </View>
    <Text style={[s.period, { color: palette.muted }]}>{period}</Text>
    {total > 0 ? <ScrollView key={range} horizontal scrollEnabled={range === "monthly"} showsHorizontalScrollIndicator={false}
      style={s.chartScroll} contentContainerStyle={[s.chart, range === "weekly" && s.weeklyChart]}>
        {points.map((point, index) => {
          const active = selected.key === point.key;
          const colors: [string, string] = active
            ? [palette.mint, palette.mint]
            : [palette.border, palette.border];
          return <Pressable key={point.key} accessibilityRole="button" accessibilityState={{ selected: active }}
            accessibilityLabel={`${days[point.date.getDay()]}, ${dayNumber(point.date)} ${month(point.date)}, ${money(point.value)}${point.key === todayKey ? en ? ", today" : ", আজ" : ""}`}
            onPress={() => setSelectedKey(point.key)} style={({ pressed }) => [s.day, range === "monthly" && s.monthDay, { opacity: pressed ? .8 : 1 }]}>
            <View style={s.slot}>
              <Text style={[s.amount, { color: active ? palette.text : palette.muted, fontWeight: active ? "500" : "400" }]}
                numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85}>
                {point.value >= 10000 ? `${number(point.value / 1000)}k` : number(point.value)}
              </Text>
              <LinearGradient colors={colors} start={{ x: .5, y: 0 }} end={{ x: .5, y: 1 }}
                style={[s.bar, { height: point.value > 0 ? Math.max(3, point.value / max * 90) : 0 }]} />
            </View>
            <Text style={[s.dayLabel, { color: active ? palette.accent : palette.muted }]} numberOfLines={1}>{range === "weekly" ? days[index] : dayNumber(point.date)}</Text>
            <View style={[s.todayDot, { backgroundColor: point.key === todayKey ? palette.accent : "transparent" }]} />
          </Pressable>;
        })}
    </ScrollView> : <EmptyState icon="bar-chart-outline" title={en ? "No expenses found" : "কোনো খরচ পাওয়া যায়নি"}
      message={range === "weekly" ? en ? "No expenses this week." : "এই সপ্তাহে কোনো খরচ নেই।" : en ? "No expenses this month." : "এই মাসে কোনো খরচ নেই।"}
      actionLabel="প্রথম খরচ যোগ করুন" onAction={onAddExpense} compact />}
  </View>;
}

const s = StyleSheet.create({
  card: { borderRadius: ORBIT_CARD_RADIUS, padding: 15, marginBottom: 12 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "500", flexShrink: 1 },
  period: { fontSize: 11, marginTop: 4 },
  tabs: { flexDirection: "row", flexShrink: 0, padding: 2, borderRadius: 16 },
  tab: { minHeight: 30, paddingHorizontal: 8, justifyContent: "center", borderRadius: 14 },
  tabText: { fontSize: 11, fontWeight: "500" },
  chartScroll: { marginTop: 8 },
  chart: { flexDirection: "row", gap: 4 },
  weeklyChart: { flexGrow: 1 },
  day: { flex: 1, minWidth: 0, alignItems: "center", paddingBottom: 5 },
  monthDay: { flex: 0, width: 44 },
  slot: { height: 116, width: "100%", alignItems: "center", justifyContent: "flex-end" },
  amount: { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  bar: { width: 25, maxWidth: "75%", borderTopLeftRadius: 6, borderTopRightRadius: 6, overflow: "hidden" },
  dayLabel: { fontSize: 11, lineHeight: 16, marginTop: 10 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 6 },
});
