import type { SQLiteDatabase } from "expo-sqlite";
import { MAX_BUDGET_AMOUNT, MAX_EXPENSE_AMOUNT, MAX_NAME_LENGTH, MAX_NOTE_LENGTH } from "../../theme/constants";
import { categoryIconName, categoryIcons } from "../../data/catalog";
import type { ReminderRepeatUnit } from "../../types/models";

const BACKUP_FORMAT = "daily-spend-backup";
const BACKUP_VERSION = 3;
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

type BackupCategory = { id: number; name: string; icon: string };
type BackupSubcategory = { id: number; categoryId: number; name: string };
type BackupExpense = {
  id: number;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  note: string;
  expenseDate: string;
  createdAt: string;
};
type BackupBudget = {
  month: string;
  amount: number;
  inAppWarning: boolean;
  notifyAt80: boolean;
  notifyAt100: boolean;
};
type BackupCategoryBudget = BackupBudget & { categoryId: number };
type BackupBudgetAlert = {
  alertKey: string;
  month: string;
  budgetType: "monthly" | "category";
  categoryId: number | null;
  threshold: 80 | 100;
  sentAt: string;
};
type BackupReminder = {
  id: number;
  name: string;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  note: string;
  repeatUnit: ReminderRepeatUnit;
  weekday: number | null;
  dueDay: number | null;
  dueMonth: number | null;
  reminderHour: number;
  reminderMinute: number;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
};
type BackupReminderOccurrence = {
  reminderId: number;
  occurrenceDate: string;
  status: "skipped" | "added";
  expenseId: number | null;
  actedAt: string;
};

export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: 3;
  createdAt: string;
  appVersion: string;
  categories: BackupCategory[];
  subcategories: BackupSubcategory[];
  expenses: BackupExpense[];
  budgets: BackupBudget[];
  categoryBudgets: BackupCategoryBudget[];
  budgetAlerts: BackupBudgetAlert[];
  reminders: BackupReminder[];
  reminderOccurrences: BackupReminderOccurrence[];
  preferences: { language: "en" | "bn"; theme: "light" | "dark" };
};

export type BackupSummary = {
  createdAt: string;
  categoryCount: number;
  subcategoryCount: number;
  expenseCount: number;
  budgetCount: number;
  reminderCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function requireText(value: unknown, maxLength: number) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

export function validateBackup(value: unknown): {
  payload: BackupPayload;
  summary: BackupSummary;
} {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT || ![1, 2, 3].includes(Number(value.version)))
    throw new Error("unsupported-backup");
  if (
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    typeof value.appVersion !== "string" ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.subcategories) ||
    !Array.isArray(value.expenses) ||
    !isRecord(value.preferences)
  )
    throw new Error("invalid-backup");

  const categories = value.categories as unknown[];
  const subcategories = value.subcategories as unknown[];
  const expenses = value.expenses as unknown[];
  const budgets = value.budgets === undefined ? [] : value.budgets;
  if (!Array.isArray(budgets)) throw new Error("invalid-backup");
  const categoryBudgets = value.categoryBudgets === undefined ? [] : value.categoryBudgets;
  const budgetAlerts = value.budgetAlerts === undefined ? [] : value.budgetAlerts;
  const reminders = value.reminders === undefined ? [] : value.reminders;
  const reminderOccurrences = value.reminderOccurrences === undefined ? [] : value.reminderOccurrences;
  if (!Array.isArray(categoryBudgets) || !Array.isArray(budgetAlerts) || !Array.isArray(reminders) || !Array.isArray(reminderOccurrences))
    throw new Error("invalid-backup");
  const budgetMonths = new Set<string>();
  for (const item of budgets) {
    if (
      !isRecord(item) ||
      typeof item.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) ||
      !Number.isFinite(item.amount) ||
      Number(item.amount) <= 0 ||
      Number(item.amount) > MAX_BUDGET_AMOUNT ||
      Math.round(Number(item.amount) * 100) !== Number(item.amount) * 100 ||
      budgetMonths.has(item.month)
    )
      throw new Error("invalid-backup");
    budgetMonths.add(item.month);
    if (
      (item.inAppWarning !== undefined && typeof item.inAppWarning !== "boolean") ||
      (item.notifyAt80 !== undefined && typeof item.notifyAt80 !== "boolean") ||
      (item.notifyAt100 !== undefined && typeof item.notifyAt100 !== "boolean")
    )
      throw new Error("invalid-backup");
  }
  const categoryBudgetKeys = new Set<string>();
  for (const item of categoryBudgets) {
    if (
      !isRecord(item) ||
      typeof item.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) ||
      !isPositiveId(item.categoryId) ||
      !Number.isFinite(item.amount) ||
      Number(item.amount) <= 0 ||
      Number(item.amount) > MAX_BUDGET_AMOUNT ||
      Math.round(Number(item.amount) * 100) !== Number(item.amount) * 100 ||
      typeof item.inAppWarning !== "boolean" ||
      typeof item.notifyAt80 !== "boolean" ||
      typeof item.notifyAt100 !== "boolean"
    )
      throw new Error("invalid-backup");
    const key = `${item.month}:${item.categoryId}`;
    if (categoryBudgetKeys.has(key)) throw new Error("invalid-backup");
    categoryBudgetKeys.add(key);
  }
  const categoryIds = new Set<number>();
  const categoryNames = new Set<string>();
  for (const item of categories) {
    if (
      !isRecord(item) ||
      !isPositiveId(item.id) ||
      !requireText(item.name, MAX_NAME_LENGTH) ||
      typeof item.icon !== "string" ||
      item.icon.length === 0 ||
      item.icon.length > 64
    )
      throw new Error("invalid-backup");
    const name = normalizedName(item.name as string);
    if (categoryIds.has(item.id) || categoryNames.has(name))
      throw new Error("invalid-backup");
    categoryIds.add(item.id);
    categoryNames.add(name);
  }
  for (const item of categoryBudgets as BackupCategoryBudget[])
    if (!categoryIds.has(item.categoryId)) throw new Error("invalid-backup");

  const budgetAlertKeys = new Set<string>();
  for (const item of budgetAlerts) {
    if (
      !isRecord(item) ||
      typeof item.alertKey !== "string" ||
      item.alertKey.length > 100 ||
      typeof item.month !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) ||
      !(item.budgetType === "monthly" || item.budgetType === "category") ||
      !(item.categoryId === null || isPositiveId(item.categoryId)) ||
      (item.budgetType === "monthly" && item.categoryId !== null) ||
      (item.budgetType === "category" && !isPositiveId(item.categoryId)) ||
      (item.categoryId !== null && !categoryIds.has(item.categoryId)) ||
      !(item.threshold === 80 || item.threshold === 100) ||
      typeof item.sentAt !== "string" ||
      Number.isNaN(Date.parse(item.sentAt))
    )
      throw new Error("invalid-backup");
    if (budgetAlertKeys.has(item.alertKey)) throw new Error("invalid-backup");
    budgetAlertKeys.add(item.alertKey);
  }

  const subcategoryIds = new Set<number>();
  const subcategoryNames = new Set<string>();
  for (const item of subcategories) {
    if (
      !isRecord(item) ||
      !isPositiveId(item.id) ||
      !isPositiveId(item.categoryId) ||
      !requireText(item.name, MAX_NAME_LENGTH) ||
      !categoryIds.has(item.categoryId)
    )
      throw new Error("invalid-backup");
    const key = `${item.categoryId}:${normalizedName(item.name as string)}`;
    if (subcategoryIds.has(item.id) || subcategoryNames.has(key))
      throw new Error("invalid-backup");
    subcategoryIds.add(item.id);
    subcategoryNames.add(key);
  }

  const expenseIds = new Set<number>();
  for (const item of expenses) {
    if (
      !isRecord(item) ||
      !isPositiveId(item.id) ||
      !Number.isFinite(item.amount) ||
      Number(item.amount) <= 0 ||
      Number(item.amount) > MAX_EXPENSE_AMOUNT ||
      Math.round(Number(item.amount) * 100) !== Number(item.amount) * 100 ||
      !isPositiveId(item.categoryId) ||
      !categoryIds.has(item.categoryId) ||
      !(item.subcategoryId === null ||
        (isPositiveId(item.subcategoryId) && subcategoryIds.has(item.subcategoryId))) ||
      typeof item.note !== "string" ||
      item.note.length > MAX_NOTE_LENGTH ||
      !isValidDateKey(item.expenseDate) ||
      typeof item.createdAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z)?$/.test(
        item.createdAt,
      )
    )
      throw new Error("invalid-backup");
    if (
      typeof item.subcategoryId === "number" &&
      !(subcategories as BackupSubcategory[]).some(
        (subcategory) =>
          subcategory.id === item.subcategoryId &&
          subcategory.categoryId === item.categoryId,
      )
    )
      throw new Error("invalid-backup");
    if (expenseIds.has(item.id)) throw new Error("invalid-backup");
    expenseIds.add(item.id);
  }

  const reminderIds = new Set<number>();
  for (const item of reminders) {
    if (
      !isRecord(item) ||
      !isPositiveId(item.id) ||
      !requireText(item.name, MAX_NAME_LENGTH) ||
      !Number.isFinite(item.amount) ||
      Number(item.amount) <= 0 ||
      Number(item.amount) > MAX_EXPENSE_AMOUNT ||
      Math.round(Number(item.amount) * 100) !== Number(item.amount) * 100 ||
      !isPositiveId(item.categoryId) ||
      !categoryIds.has(item.categoryId) ||
      !(item.subcategoryId === null || isPositiveId(item.subcategoryId)) ||
      typeof item.note !== "string" ||
      item.note.length > MAX_NOTE_LENGTH ||
      !["weekly", "monthly", "yearly"].includes(String(item.repeatUnit)) ||
      !Number.isInteger(item.reminderHour) || Number(item.reminderHour) < 0 || Number(item.reminderHour) > 23 ||
      !Number.isInteger(item.reminderMinute) || Number(item.reminderMinute) < 0 || Number(item.reminderMinute) > 59 ||
      !(item.endDate === null || isValidDateKey(item.endDate)) ||
      typeof item.isActive !== "boolean" ||
      typeof item.createdAt !== "string" || Number.isNaN(Date.parse(item.createdAt))
    )
      throw new Error("invalid-backup");
    const unit = item.repeatUnit;
    if (
      (unit === "weekly" && (!Number.isInteger(item.weekday) || Number(item.weekday) < 0 || Number(item.weekday) > 6 || item.dueDay !== null || item.dueMonth !== null)) ||
      (unit === "monthly" && (item.weekday !== null || !Number.isInteger(item.dueDay) || Number(item.dueDay) < 1 || Number(item.dueDay) > 31 || item.dueMonth !== null)) ||
      (unit === "yearly" && (item.weekday !== null || !Number.isInteger(item.dueDay) || Number(item.dueDay) < 1 || Number(item.dueDay) > 31 || !Number.isInteger(item.dueMonth) || Number(item.dueMonth) < 1 || Number(item.dueMonth) > 12))
    )
      throw new Error("invalid-backup");
    if (item.subcategoryId !== null && !(subcategories as BackupSubcategory[]).some((subcategory) => subcategory.id === item.subcategoryId && subcategory.categoryId === item.categoryId))
      throw new Error("invalid-backup");
    if (reminderIds.has(item.id)) throw new Error("invalid-backup");
    reminderIds.add(item.id);
  }

  const occurrenceKeys = new Set<string>();
  for (const item of reminderOccurrences) {
    if (
      !isRecord(item) ||
      !isPositiveId(item.reminderId) || !reminderIds.has(item.reminderId) ||
      !isValidDateKey(item.occurrenceDate) ||
      !(item.status === "skipped" || item.status === "added") ||
      !(item.expenseId === null || (isPositiveId(item.expenseId) && expenseIds.has(item.expenseId))) ||
      (item.status === "added" && !isPositiveId(item.expenseId)) ||
      typeof item.actedAt !== "string" || Number.isNaN(Date.parse(item.actedAt))
    )
      throw new Error("invalid-backup");
    const key = `${item.reminderId}:${item.occurrenceDate}`;
    if (occurrenceKeys.has(key)) throw new Error("invalid-backup");
    occurrenceKeys.add(key);
  }

  const preferences = value.preferences;
  if (
    !["en", "bn"].includes(String(preferences.language)) ||
    !["light", "dark"].includes(String(preferences.theme))
  )
    throw new Error("invalid-backup");

  const payload = {
    ...value,
    version: BACKUP_VERSION,
    budgets: (budgets as BackupBudget[]).map((item) => ({
      ...item,
      inAppWarning: item.inAppWarning ?? true,
      notifyAt80: item.notifyAt80 ?? false,
      notifyAt100: item.notifyAt100 ?? false,
    })),
    categoryBudgets,
    budgetAlerts,
    reminders,
    reminderOccurrences,
  } as unknown as BackupPayload;
  return {
    payload,
    summary: {
      createdAt: payload.createdAt,
      categoryCount: categories.length,
      subcategoryCount: subcategories.length,
      expenseCount: expenses.length,
      budgetCount: budgets.length + categoryBudgets.length,
      reminderCount: reminders.length,
    },
  };
}

export async function createBackupPayload(
  db: SQLiteDatabase,
  appVersion: string,
): Promise<BackupPayload> {
  let payload!: BackupPayload;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const categories = await tx.getAllAsync<BackupCategory>(
      "SELECT id, name, icon FROM categories ORDER BY id",
    );
    const subcategories = await tx.getAllAsync<BackupSubcategory>(
      "SELECT id, categoryId, name FROM subcategories ORDER BY categoryId, id",
    );
    const expenses = await tx.getAllAsync<BackupExpense>(
      "SELECT id, amount, categoryId, subcategoryId, COALESCE(note, '') AS note, expenseDate, createdAt FROM expenses ORDER BY id",
    );
    const budgetRows = await tx.getAllAsync<Omit<BackupBudget, "inAppWarning" | "notifyAt80" | "notifyAt100"> & { inAppWarning: number; notifyAt80: number; notifyAt100: number }>(
      "SELECT month, amount, inAppWarning, notifyAt80, notifyAt100 FROM monthly_budgets ORDER BY month",
    );
    const categoryBudgetRows = await tx.getAllAsync<Omit<BackupCategoryBudget, "inAppWarning" | "notifyAt80" | "notifyAt100"> & { inAppWarning: number; notifyAt80: number; notifyAt100: number }>(
      "SELECT month, categoryId, amount, inAppWarning, notifyAt80, notifyAt100 FROM category_budgets ORDER BY month, categoryId",
    );
    const budgetAlerts = await tx.getAllAsync<BackupBudgetAlert>(
      "SELECT alertKey, month, budgetType, categoryId, threshold, sentAt FROM budget_alerts ORDER BY sentAt",
    );
    const reminderRows = await tx.getAllAsync<Omit<BackupReminder, "isActive"> & { isActive: number }>(
      `SELECT id, name, amount, categoryId, subcategoryId, note, repeatUnit,
        weekday, dueDay, dueMonth, reminderHour, reminderMinute, endDate,
        isActive, createdAt FROM scheduled_reminders ORDER BY id`,
    );
    const reminders: BackupReminder[] = reminderRows.map((item) => ({
      ...item,
      id: Number(item.id),
      amount: Number(item.amount),
      categoryId: Number(item.categoryId),
      subcategoryId: item.subcategoryId === null ? null : Number(item.subcategoryId),
      weekday: item.weekday === null ? null : Number(item.weekday),
      dueDay: item.dueDay === null ? null : Number(item.dueDay),
      dueMonth: item.dueMonth === null ? null : Number(item.dueMonth),
      reminderHour: Number(item.reminderHour),
      reminderMinute: Number(item.reminderMinute),
      isActive: Number(item.isActive) === 1,
    }));
    const reminderOccurrences = await tx.getAllAsync<BackupReminderOccurrence>(
      `SELECT reminderId, occurrenceDate, status, expenseId, actedAt
       FROM reminder_occurrences ORDER BY reminderId, occurrenceDate`,
    );
    const settings = await tx.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM app_settings WHERE key IN ('language', 'theme')",
    );
    const language = settings.find((item) => item.key === "language")?.value;
    const theme = settings.find((item) => item.key === "theme")?.value;
    const budgets: BackupBudget[] = budgetRows.map((item) => ({
      month: item.month,
      amount: Number(item.amount),
      inAppWarning: Number(item.inAppWarning) === 1,
      notifyAt80: Number(item.notifyAt80) === 1,
      notifyAt100: Number(item.notifyAt100) === 1,
    }));
    const categoryBudgets: BackupCategoryBudget[] = categoryBudgetRows.map((item) => ({
      month: item.month,
      categoryId: Number(item.categoryId),
      amount: Number(item.amount),
      inAppWarning: Number(item.inAppWarning) === 1,
      notifyAt80: Number(item.notifyAt80) === 1,
      notifyAt100: Number(item.notifyAt100) === 1,
    }));
    payload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion,
      categories,
      subcategories,
      expenses,
      budgets,
      categoryBudgets,
      budgetAlerts,
      reminders,
      reminderOccurrences,
      preferences: {
        language: language === "bn" ? "bn" : "en",
        theme: theme === "dark" ? "dark" : "light",
      },
    };
  });
  return payload;
}

export function getBackupMaxBytes() {
  return MAX_BACKUP_BYTES;
}

export async function restoreBackup(
  db: SQLiteDatabase,
  payload: BackupPayload,
) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(
      "DELETE FROM reminder_occurrences; DELETE FROM scheduled_reminders; DELETE FROM expenses; DELETE FROM budget_alerts; DELETE FROM category_budgets; DELETE FROM subcategories; DELETE FROM categories; DELETE FROM monthly_budgets;",
    );
    for (const category of payload.categories)
      await tx.runAsync(
        "INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)",
        [
          category.id,
          category.name.trim(),
          categoryIcons.includes(categoryIconName(category.icon))
            ? categoryIconName(category.icon)
            : "sparkles-outline",
        ],
      );
    for (const subcategory of payload.subcategories)
      await tx.runAsync(
        "INSERT INTO subcategories (id, categoryId, name) VALUES (?, ?, ?)",
        [subcategory.id, subcategory.categoryId, subcategory.name.trim()],
      );
    for (const expense of payload.expenses)
      await tx.runAsync(
        "INSERT INTO expenses (id, amount, categoryId, subcategoryId, note, expenseDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          expense.id,
          expense.amount,
          expense.categoryId,
          expense.subcategoryId,
          expense.note,
          expense.expenseDate,
          expense.createdAt,
        ],
      );
    for (const reminder of payload.reminders || [])
      await tx.runAsync(
        `INSERT INTO scheduled_reminders
          (id, name, amount, categoryId, subcategoryId, note, repeatUnit, weekday,
           dueDay, dueMonth, reminderHour, reminderMinute, endDate, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [reminder.id, reminder.name, reminder.amount, reminder.categoryId,
          reminder.subcategoryId, reminder.note, reminder.repeatUnit, reminder.weekday,
          reminder.dueDay, reminder.dueMonth, reminder.reminderHour, reminder.reminderMinute,
          reminder.endDate, Number(reminder.isActive), reminder.createdAt],
      );
    for (const occurrence of payload.reminderOccurrences || [])
      await tx.runAsync(
        `INSERT INTO reminder_occurrences
          (reminderId, occurrenceDate, status, expenseId, actedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [occurrence.reminderId, occurrence.occurrenceDate, occurrence.status,
          occurrence.expenseId, occurrence.actedAt],
      );
    for (const budget of payload.budgets || [])
      await tx.runAsync(
        `INSERT INTO monthly_budgets
          (month, amount, inAppWarning, notifyAt80, notifyAt100) VALUES (?, ?, ?, ?, ?)`,
        [budget.month, budget.amount, Number(budget.inAppWarning), Number(budget.notifyAt80), Number(budget.notifyAt100)],
      );
    for (const budget of payload.categoryBudgets || [])
      await tx.runAsync(
        `INSERT INTO category_budgets
          (month, categoryId, amount, inAppWarning, notifyAt80, notifyAt100)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [budget.month, budget.categoryId, budget.amount, Number(budget.inAppWarning), Number(budget.notifyAt80), Number(budget.notifyAt100)],
      );
    for (const alert of payload.budgetAlerts || [])
      await tx.runAsync(
        `INSERT INTO budget_alerts
          (alertKey, month, budgetType, categoryId, threshold, sentAt)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [alert.alertKey, alert.month, alert.budgetType, alert.categoryId, alert.threshold, alert.sentAt],
      );
    await tx.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('language', ?)",
      [payload.preferences.language],
    );
    await tx.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('theme', ?)",
      [payload.preferences.theme],
    );
  });
}

export function validateBackupText(text: string) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error("backup-too-large");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("invalid-backup");
  }
  return validateBackup(value);
}
