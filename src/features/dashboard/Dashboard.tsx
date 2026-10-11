import React, { useContext, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import type { Expense } from "../../types/models";
import { ExpenseList } from "../../components/ExpenseList";
import { WeeklyExpenseChart } from "./WeeklyExpenseChart";
import { MonthlyBalanceCard } from "./MonthlyBalanceCard";
import { OrbitSummaryCards } from "./OrbitSummaryCards";
import { orbitTheme, ORBIT_CARD_RADIUS } from "./orbitTheme";
import type { MonthlyBudgetSummary } from "../budget/budgetService";

export function Dashboard({
  expenses, monthTotal, previousMonthTotal, todayTotal, transactionCount, top, budgetSummary,
  onViewBudget, onSetBudget, onDelete, onEdit, onAddExpense, tourTargetRef,
}: {
  expenses: Expense[]; monthTotal: number; previousMonthTotal: number; todayTotal: number;
  transactionCount: number; top: string; budgetSummary: MonthlyBudgetSummary | null;
  onViewBudget: () => void; onSetBudget: () => void;
  onDelete: (id: number) => void; onEdit: (expense: Expense) => void; onAddExpense?: () => void;
  tourTargetRef?: React.RefObject<View | null>;
}) {
  const palette = orbitTheme(useContext(ThemeContext));
  const { language } = useContext(LanguageContext);
  const monthTrend = useMemo(() => {
    if (!previousMonthTotal && !monthTotal) return language === "en" ? "Compared with last month —" : "গত মাসের তুলনায় —";
    if (!previousMonthTotal) return language === "en" ? "No spending last month" : "গত মাসে কোনো খরচ ছিল না";
    const percentage = Math.round((Math.abs(monthTotal - previousMonthTotal) / previousMonthTotal) * 100);
    if (!percentage) return language === "en" ? "Same as last month" : "গত মাসের সমান";
    if (monthTotal > previousMonthTotal) return language === "en" ? percentage + "% higher than last month" : "গত মাসের তুলনায় " + percentage + "% বেশি";
    return language === "en" ? percentage + "% lower than last month" : "গত মাসের তুলনায় " + percentage + "% কম";
  }, [language, monthTotal, previousMonthTotal]);
  return <>
    <View ref={tourTargetRef} collapsable={false}>
      <MonthlyBalanceCard total={monthTotal} trend={monthTrend} previousTotal={previousMonthTotal}
        summary={budgetSummary} onViewBudget={onViewBudget} onSetBudget={onSetBudget} />
    </View>
    <OrbitSummaryCards todayTotal={todayTotal} budgetAmount={budgetSummary?.budgetAmount ?? null} onBudget={budgetSummary ? onViewBudget : onSetBudget} />
    <WeeklyExpenseChart expenses={expenses} onAddExpense={onAddExpense} />
    <View style={{ marginBottom: 12 }}>
      <View style={s.cardHead}>
        <Text style={[s.cardTitle, { color: palette.text }]}>সাম্প্রতিক খরচ</Text>
        <Text style={[s.caption, { color: palette.muted }]}>{language === "en" ? "Latest" : "সর্বশেষ"}</Text>
      </View>
      <ExpenseList expenses={expenses.slice(0, 5)} appearance="orbit" surfaceColor={palette.surface}
        onDelete={onDelete} onEdit={onEdit}
        emptyState={{ icon: "receipt-outline", title: "এখনও কোনো খরচ নেই",
          message: "প্রথম expense যোগ করলে এখানে দেখা যাবে।", actionLabel: "প্রথম খরচ যোগ করুন", onAction: onAddExpense }} />
    </View>
  </>;
}

const s = StyleSheet.create({
  caption: { fontSize: 11, lineHeight: 16 },
  card: { borderRadius: ORBIT_CARD_RADIUS, padding: 15, marginBottom: 12 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "500", flexShrink: 1 },
});
