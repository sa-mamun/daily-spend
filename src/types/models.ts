import type React from "react";
import type { Ionicons } from "@expo/vector-icons";

export type Category = { id: number; name: string; icon: string };
export type Subcategory = { id: number; categoryId: number; name: string };
export type Expense = {
  id: number;
  amount: number;
  categoryId: number;
  categoryName: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  icon: string;
  note: string;
  expenseDate: string;
};
export type DashboardStats = {
  monthTotal: number;
  previousMonthTotal: number;
  todayTotal: number;
  transactionCount: number;
  topCategory: string;
};
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export type ReminderRepeatUnit = "weekly" | "monthly" | "yearly";
export type ScheduledReminder = {
  id: number;
  name: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  note: string;
  repeatUnit: ReminderRepeatUnit;
  weekday: number | null;
  dueDay: number | null;
  dueMonth: number | null;
  reminderHour: number;
  reminderMinute: number;
  endDate: string | null;
  isActive: boolean;
};
