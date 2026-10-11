import type { MonthlyBudgetSummary } from "../budget/budgetService";

export function monthlyBalance(summary: MonthlyBudgetSummary | null) {
  if (!summary || summary.budgetAmount <= 0) return null;
  const remaining = summary.budgetAmount - summary.spentAmount;
  const percentage = Math.max(0, (summary.spentAmount / summary.budgetAmount) * 100);
  return { remaining: Math.abs(remaining), exceeded: remaining < 0,
    percentage, progress: Math.min(100, percentage), amount: summary.budgetAmount };
}

export function splitBalancePalette(dark: boolean) {
  return {
    gradient: dark ? ["#2a2924", "#2a2924"] as const : ["#ffffff", "#ffffff"] as const,
    text: dark ? "#effff7" : "#10382a",
    muted: dark ? "#eff9f1" : "#1e4235",
    track: dark ? "#4b8c70" : "#a5e6ce",
    fill: dark ? "#9af0ce" : "#18593f",
    warning: dark ? "#fff8e8" : "#603b08",
    danger: dark ? "#fff5f6" : "#7a1727",
    bubble: dark ? "#effff709" : "#10382a09",
  };
}
