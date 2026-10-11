import type { SQLiteDatabase } from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { today } from "../../utils/dates";
import type { Language } from "../../context/LanguageContext";

export type BudgetAlertPreferences = {
  inAppWarning: boolean;
  notifyAt80: boolean;
  notifyAt100: boolean;
};

export type MonthlyBudget = BudgetAlertPreferences & {
  month: string;
  amount: number;
};

export type MonthlyBudgetSummary = {
  budgetAmount: number;
  spentAmount: number;
};

export type CategorySpend = {
  categoryId: number;
  categoryName: string;
  icon: string;
  total: number;
};

export type CategoryBudget = BudgetAlertPreferences & {
  month: string;
  categoryId: number;
  categoryName: string;
  icon: string;
  amount: number;
  spentAmount: number;
};

export type BudgetCategory = {
  id: number;
  name: string;
  icon: string;
};

export const DEFAULT_BUDGET_ALERT_PREFERENCES: BudgetAlertPreferences = {
  inAppWarning: true,
  notifyAt80: false,
  notifyAt100: false,
};

const BUDGET_NOTIFICATION_CHANNEL = "budget-alerts";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function preferencesFromRow(row: {
  inAppWarning?: number;
  notifyAt80?: number;
  notifyAt100?: number;
}): BudgetAlertPreferences {
  return {
    inAppWarning: Number(row.inAppWarning ?? 1) === 1,
    notifyAt80: Number(row.notifyAt80 ?? 0) === 1,
    notifyAt100: Number(row.notifyAt100 ?? 0) === 1,
  };
}

export async function requestBudgetNotificationPermission() {
  await Notifications.setNotificationChannelAsync(BUDGET_NOTIFICATION_CHANNEL, {
    name: "Budget alerts",
    description: "Alerts when your spending reaches a budget limit.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#087443",
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function loadBudgetCategories(
  db: SQLiteDatabase,
): Promise<BudgetCategory[]> {
  return db.getAllAsync<BudgetCategory>(
    "SELECT id, name, icon FROM categories ORDER BY name COLLATE NOCASE ASC",
  );
}

export async function loadMonthlyBudget(
  db: SQLiteDatabase,
  month: string,
) {
  const row = await db.getFirstAsync<{
    month: string;
    amount: number;
    inAppWarning: number;
    notifyAt80: number;
    notifyAt100: number;
  }>(
    "SELECT month, amount, inAppWarning, notifyAt80, notifyAt100 FROM monthly_budgets WHERE month = ?",
    [month],
  );
  const categories = await db.getAllAsync<CategorySpend>(
    `SELECT c.id AS categoryId, c.name AS categoryName, c.icon,
      COALESCE(SUM(e.amount), 0) AS total
     FROM categories c
     LEFT JOIN expenses e ON e.categoryId = c.id AND e.expenseDate LIKE ?
     GROUP BY c.id, c.name, c.icon
     ORDER BY total DESC, c.name COLLATE NOCASE ASC`,
    [`${month}%`],
  );
  const categoryBudgetRows = await db.getAllAsync<{
    month: string;
    categoryId: number;
    categoryName: string;
    icon: string;
    amount: number;
    spentAmount: number;
    inAppWarning: number;
    notifyAt80: number;
    notifyAt100: number;
  }>(
    `SELECT cb.month, cb.categoryId, c.name AS categoryName, c.icon,
      cb.amount, COALESCE(SUM(e.amount), 0) AS spentAmount,
      cb.inAppWarning, cb.notifyAt80, cb.notifyAt100
     FROM category_budgets cb
     JOIN categories c ON c.id = cb.categoryId
     LEFT JOIN expenses e ON e.categoryId = cb.categoryId AND e.expenseDate LIKE ?
     WHERE cb.month = ?
     GROUP BY cb.month, cb.categoryId, c.name, c.icon, cb.amount,
       cb.inAppWarning, cb.notifyAt80, cb.notifyAt100
     ORDER BY c.name COLLATE NOCASE ASC`,
    [`${month}%`, month],
  );
  return {
    budget: row
      ? {
          month: row.month,
          amount: Number(row.amount),
          ...preferencesFromRow(row),
        }
      : null,
    categories: categories.map((item) => ({ ...item, total: Number(item.total) })),
    categoryBudgets: categoryBudgetRows.map((item) => ({
      ...item,
      amount: Number(item.amount),
      spentAmount: Number(item.spentAmount),
      ...preferencesFromRow(item),
    })),
  };
}

export async function loadMonthlyBudgetSummary(
  db: SQLiteDatabase,
  month: string,
): Promise<MonthlyBudgetSummary | null> {
  const budget = await db.getFirstAsync<{ amount: number }>(
    "SELECT amount FROM monthly_budgets WHERE month = ?",
    [month],
  );
  if (!budget) return null;

  const spending = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expenseDate LIKE ?",
    [`${month}%`],
  );
  return {
    budgetAmount: Number(budget.amount),
    spentAmount: Number(spending?.total || 0),
  };
}

export async function saveMonthlyBudget(
  db: SQLiteDatabase,
  month: string,
  amount: number,
  preferences: BudgetAlertPreferences = DEFAULT_BUDGET_ALERT_PREFERENCES,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO monthly_budgets
      (month, amount, inAppWarning, notifyAt80, notifyAt100) VALUES (?, ?, ?, ?, ?)`,
    [month, amount, Number(preferences.inAppWarning), Number(preferences.notifyAt80), Number(preferences.notifyAt100)],
  );
}

export async function saveCategoryBudget(
  db: SQLiteDatabase,
  month: string,
  categoryId: number,
  amount: number,
  preferences: BudgetAlertPreferences = DEFAULT_BUDGET_ALERT_PREFERENCES,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO category_budgets
      (month, categoryId, amount, inAppWarning, notifyAt80, notifyAt100)
      VALUES (?, ?, ?, ?, ?, ?)`,
    [month, categoryId, amount, Number(preferences.inAppWarning), Number(preferences.notifyAt80), Number(preferences.notifyAt100)],
  );
}

export async function deleteCategoryBudget(
  db: SQLiteDatabase,
  month: string,
  categoryId: number,
) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      "DELETE FROM category_budgets WHERE month = ? AND categoryId = ?",
      [month, categoryId],
    );
    await tx.runAsync(
      "DELETE FROM budget_alerts WHERE month = ? AND budgetType = 'category' AND categoryId = ?",
      [month, categoryId],
    );
  });
}

type BudgetThreshold = {
  alertKey: string;
  budgetType: "monthly" | "category";
  categoryId: number | null;
  threshold: 80 | 100;
  budgetAmount: number;
  spentAmount: number;
  categoryName?: string;
};

export async function checkBudgetNotifications(
  db: SQLiteDatabase,
  language: Language,
) {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const month = today().slice(0, 7);
    const monthly = await db.getFirstAsync<{
      amount: number;
      notifyAt80: number;
      notifyAt100: number;
    }>(
      "SELECT amount, notifyAt80, notifyAt100 FROM monthly_budgets WHERE month = ?",
      [month],
    );
    const monthlySpend = await db.getFirstAsync<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expenseDate LIKE ?",
      [`${month}%`],
    );
    const categoryBudgets = await db.getAllAsync<{
      categoryId: number;
      categoryName: string;
      amount: number;
      spentAmount: number;
      notifyAt80: number;
      notifyAt100: number;
    }>(
      `SELECT cb.categoryId, c.name AS categoryName, cb.amount,
        COALESCE(SUM(e.amount), 0) AS spentAmount, cb.notifyAt80, cb.notifyAt100
       FROM category_budgets cb
       JOIN categories c ON c.id = cb.categoryId
       LEFT JOIN expenses e ON e.categoryId = cb.categoryId AND e.expenseDate LIKE ?
       WHERE cb.month = ?
       GROUP BY cb.categoryId, c.name, cb.amount, cb.notifyAt80, cb.notifyAt100`,
      [`${month}%`, month],
    );

    const candidates: BudgetThreshold[] = [];
    const addCandidates = (
      type: "monthly" | "category",
      categoryId: number | null,
      budgetAmount: number,
      spentAmount: number,
      notifyAt80: number,
      notifyAt100: number,
      categoryName?: string,
    ) => {
      for (const threshold of [80, 100] as const) {
        const enabled = threshold === 80 ? notifyAt80 : notifyAt100;
        if (!enabled || spentAmount < budgetAmount * (threshold / 100)) continue;
        const alertKey = type === "monthly"
          ? `monthly:${month}:${threshold}`
          : `category:${month}:${categoryId}:${threshold}`;
        candidates.push({ alertKey, budgetType: type, categoryId, threshold, budgetAmount, spentAmount, categoryName });
      }
    };
    if (monthly)
      addCandidates(
        "monthly",
        null,
        Number(monthly.amount),
        Number(monthlySpend?.total || 0),
        Number(monthly.notifyAt80),
        Number(monthly.notifyAt100),
      );
    for (const budget of categoryBudgets)
      addCandidates(
        "category",
        Number(budget.categoryId),
        Number(budget.amount),
        Number(budget.spentAmount),
        Number(budget.notifyAt80),
        Number(budget.notifyAt100),
        budget.categoryName,
      );

    for (const candidate of candidates) {
      const reserved = await db.runAsync(
        `INSERT OR IGNORE INTO budget_alerts
          (alertKey, month, budgetType, categoryId, threshold)
          VALUES (?, ?, ?, ?, ?)`,
        [candidate.alertKey, month, candidate.budgetType, candidate.categoryId, candidate.threshold],
      );
      if (reserved.changes === 0) continue;
      const subject = candidate.budgetType === "monthly"
        ? (language === "en" ? "Monthly budget" : "মাসিক বাজেট")
        : candidate.categoryName || (language === "en" ? "Category budget" : "ক্যাটাগরি বাজেট");
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: language === "en" ? "Budget alert" : "বাজেট সতর্কতা",
            body: language === "en"
              ? `${subject}: ${candidate.threshold}% of the budget used (${Math.round(candidate.spentAmount)} / ${Math.round(candidate.budgetAmount)}).`
              : `${subject}: বাজেটের ${candidate.threshold}% খরচ হয়েছে (${Math.round(candidate.spentAmount)} / ${Math.round(candidate.budgetAmount)} টাকা)।`,
            data: { screen: "budget", month, categoryId: candidate.categoryId, threshold: candidate.threshold },
          },
          trigger: { channelId: BUDGET_NOTIFICATION_CHANNEL },
        });
      } catch (error) {
        await db.runAsync("DELETE FROM budget_alerts WHERE alertKey = ?", [candidate.alertKey]);
        throw error;
      }
    }
  } catch (error) {
    console.error("Failed to evaluate budget alerts:", error);
  }
}
