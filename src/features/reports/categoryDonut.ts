import type { Expense } from "../../types/models";

export const CATEGORY_COLORS = ["#dfa43e", "#d46b59", "#48a6a0", "#6c9c79", "#a59e90"];
export type CategorySlice = { key: string; name: string; amount: number; categoryIds: number[]; color: string; percentage: number };

export function categoryDonut(expenses: Expense[]) {
  const totals = new Map<number, { name: string; amount: number }>();
  for (const expense of expenses) {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) continue;
    const current = totals.get(expense.categoryId);
    totals.set(expense.categoryId, { name: expense.categoryName, amount: (current?.amount ?? 0) + expense.amount });
  }
  const categories = [...totals].map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.amount - a.amount || a.id - b.id);
  const total = categories.reduce((sum, category) => sum + category.amount, 0);
  const visible = categories.length > 5 ? categories.slice(0, 4) : categories;
  const slices: CategorySlice[] = visible.map((category, index) => ({
    key: String(category.id), name: category.name, amount: category.amount,
    categoryIds: [category.id], color: CATEGORY_COLORS[index], percentage: 0,
  }));
  if (categories.length > 5) {
    const rest = categories.slice(4);
    slices.push({ key: "others", name: "Others", amount: rest.reduce((sum, category) => sum + category.amount, 0),
      categoryIds: rest.map(category => category.id), color: CATEGORY_COLORS[4], percentage: 0 });
  }
  // Largest-remainder rounding keeps the displayed legend total at exactly 100%.
  const fractions = slices.map(slice => total ? slice.amount / total * 100 : 0);
  slices.forEach((slice, index) => { slice.percentage = Math.floor(fractions[index]); });
  const remainder = total ? 100 - slices.reduce((sum, slice) => sum + slice.percentage, 0) : 0;
  const order = fractions.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < remainder; index++) slices[order[index].index].percentage++;
  return { total, categories, slices };
}

export function donutArc(start: number, end: number) {
  const point = (radius: number, angle: number) => {
    const radians = (angle - 90) * Math.PI / 180;
    return `${64 + radius * Math.cos(radians)},${64 + radius * Math.sin(radians)}`;
  };
  if (end - start >= 359.9999) {
    return "M64,2 A62,62 0 1 1 64,126 A62,62 0 1 1 64,2 M64,17 A47,47 0 1 0 64,111 A47,47 0 1 0 64,17 Z";
  }
  const large = end - start > 180 ? 1 : 0;
  return `M${point(62, start)} A62,62 0 ${large} 1 ${point(62, end)} L${point(47, end)} A47,47 0 ${large} 0 ${point(47, start)} Z`;
}
