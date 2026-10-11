import type { SQLiteDatabase } from "expo-sqlite";
import type { Category } from "../types/models";
import { defaultSubcategories, defaults, legacyIconMap } from "./catalog";

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT NOT NULL); CREATE TABLE IF NOT EXISTS subcategories (id INTEGER PRIMARY KEY AUTOINCREMENT, categoryId INTEGER NOT NULL, name TEXT NOT NULL, UNIQUE(categoryId, name), FOREIGN KEY(categoryId) REFERENCES categories(id)); CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, categoryId INTEGER NOT NULL, subcategoryId INTEGER, note TEXT DEFAULT '', expenseDate TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(categoryId) REFERENCES categories(id), FOREIGN KEY(subcategoryId) REFERENCES subcategories(id)); CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS monthly_budgets (month TEXT PRIMARY KEY NOT NULL, amount REAL NOT NULL CHECK(amount > 0), inAppWarning INTEGER NOT NULL DEFAULT 1, notifyAt80 INTEGER NOT NULL DEFAULT 0, notifyAt100 INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS category_budgets (month TEXT NOT NULL, categoryId INTEGER NOT NULL, amount REAL NOT NULL CHECK(amount > 0), inAppWarning INTEGER NOT NULL DEFAULT 1, notifyAt80 INTEGER NOT NULL DEFAULT 0, notifyAt100 INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (month, categoryId), FOREIGN KEY(categoryId) REFERENCES categories(id)); CREATE TABLE IF NOT EXISTS budget_alerts (alertKey TEXT PRIMARY KEY NOT NULL, month TEXT NOT NULL, budgetType TEXT NOT NULL, categoryId INTEGER, threshold INTEGER NOT NULL, sentAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS scheduled_reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, amount REAL NOT NULL CHECK(amount > 0), categoryId INTEGER NOT NULL, subcategoryId INTEGER, note TEXT NOT NULL DEFAULT '', repeatUnit TEXT NOT NULL CHECK(repeatUnit IN ('weekly', 'monthly', 'yearly')), weekday INTEGER, dueDay INTEGER, dueMonth INTEGER, reminderHour INTEGER NOT NULL DEFAULT 9, reminderMinute INTEGER NOT NULL DEFAULT 0, endDate TEXT, isActive INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE, FOREIGN KEY(subcategoryId) REFERENCES subcategories(id) ON DELETE SET NULL); CREATE TABLE IF NOT EXISTS reminder_occurrences (reminderId INTEGER NOT NULL, occurrenceDate TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('skipped', 'added')), expenseId INTEGER, actedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (reminderId, occurrenceDate), FOREIGN KEY(reminderId) REFERENCES scheduled_reminders(id) ON DELETE CASCADE, FOREIGN KEY(expenseId) REFERENCES expenses(id) ON DELETE SET NULL);`,
  );
  for (const column of [
    "inAppWarning INTEGER NOT NULL DEFAULT 1",
    "notifyAt80 INTEGER NOT NULL DEFAULT 0",
    "notifyAt100 INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      await db.execAsync(`ALTER TABLE monthly_budgets ADD COLUMN ${column};`);
    } catch {
      /* Existing database already has this budget preference column. */
    }
  }
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const [legacyIcon, currentIcon] of Object.entries(legacyIconMap))
      await tx.runAsync("UPDATE categories SET icon = ? WHERE icon = ?", [
        currentIcon,
        legacyIcon,
      ]);
  });
  try {
    await db.execAsync("ALTER TABLE expenses ADD COLUMN subcategoryId INTEGER;");
  } catch {
    /* Existing database already has the column. */
  }
  await db.execAsync(
    "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expenseDate); CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(categoryId); CREATE INDEX IF NOT EXISTS idx_expenses_subcategory ON expenses(subcategoryId);",
  );
  const count = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM categories",
  );
  if (!count?.count)
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const [name, icon] of defaults)
        await tx.runAsync("INSERT INTO categories (name, icon) VALUES (?, ?)", [
          name,
          icon,
        ]);
    });
  const seededCategories = await db.getAllAsync<Category>(
    "SELECT * FROM categories ORDER BY id",
  );
  const subCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM subcategories",
  );
  if (!subCount?.count)
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const category of seededCategories)
        for (const name of defaultSubcategories[category.name] || ["General"])
          await tx.runAsync(
            "INSERT OR IGNORE INTO subcategories (categoryId, name) VALUES (?, ?)",
            [category.id, name],
          );
    });
}
