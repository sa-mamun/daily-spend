import type { SQLiteDatabase } from "expo-sqlite";
import type { Category } from "../types/models";
import { defaultSubcategories, defaults, legacyIconMap } from "./catalog";

export async function initDb(db: SQLiteDatabase) {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, icon TEXT NOT NULL); CREATE TABLE IF NOT EXISTS subcategories (id INTEGER PRIMARY KEY AUTOINCREMENT, categoryId INTEGER NOT NULL, name TEXT NOT NULL, UNIQUE(categoryId, name), FOREIGN KEY(categoryId) REFERENCES categories(id)); CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL NOT NULL, categoryId INTEGER NOT NULL, subcategoryId INTEGER, note TEXT DEFAULT '', expenseDate TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(categoryId) REFERENCES categories(id), FOREIGN KEY(subcategoryId) REFERENCES subcategories(id)); CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
  );
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
