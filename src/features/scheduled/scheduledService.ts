import type { SQLiteDatabase } from "expo-sqlite";
import * as Notifications from "expo-notifications";
import type { Language } from "../../context/LanguageContext";
import type { ReminderRepeatUnit, ScheduledReminder } from "../../types/models";
import { localDateKey } from "../../utils/dates";
import { nextReminderDates, type ReminderRule } from "./recurrence";

const REMINDER_CHANNEL = "scheduled-reminders";
const MAX_PENDING_REMINDERS = 50;
const OCCURRENCES_PER_REMINDER = 12;
let reminderSyncQueue: Promise<number> = Promise.resolve(0);

type ReminderRow = Omit<ScheduledReminder, "isActive"> & { isActive: number };

export type ReminderDraft = {
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
};

export type ReminderReview = {
  reminderId: number;
  occurrenceDate: string;
  name: string;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  note: string;
};

const selectReminder = `SELECT r.id, r.name, r.amount, r.categoryId,
  c.name AS categoryName, c.icon AS categoryIcon, r.subcategoryId,
  s.name AS subcategoryName, r.note, r.repeatUnit, r.weekday, r.dueDay,
  r.dueMonth, r.reminderHour, r.reminderMinute, r.endDate, r.isActive
  FROM scheduled_reminders r
  JOIN categories c ON c.id = r.categoryId
  LEFT JOIN subcategories s ON s.id = r.subcategoryId`;

function reminderRule(reminder: ScheduledReminder): ReminderRule {
  return {
    repeatUnit: reminder.repeatUnit,
    weekday: reminder.weekday,
    dueDay: reminder.dueDay,
    dueMonth: reminder.dueMonth,
    reminderHour: reminder.reminderHour,
    reminderMinute: reminder.reminderMinute,
    endDate: reminder.endDate,
  };
}

export async function loadScheduledReminders(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ReminderRow>(
    `${selectReminder} ORDER BY r.isActive DESC, r.name COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ ...row, isActive: Number(row.isActive) === 1 }));
}

export async function loadReminderReview(
  db: SQLiteDatabase,
  reminderId: number,
  occurrenceDate: string,
): Promise<ReminderReview | null> {
  const row = await db.getFirstAsync<ReminderReview & { status: string | null }>(
    `SELECT r.id AS reminderId, ? AS occurrenceDate, r.name, r.amount,
      r.categoryId, r.subcategoryId, r.note, o.status
     FROM scheduled_reminders r
     LEFT JOIN reminder_occurrences o
      ON o.reminderId = r.id AND o.occurrenceDate = ?
     WHERE r.id = ?`,
    [occurrenceDate, occurrenceDate, reminderId],
  );
  if (!row || row.status) return null;
  const { status: _status, ...review } = row;
  return review;
}

export async function saveScheduledReminder(
  db: SQLiteDatabase,
  draft: ReminderDraft,
  id?: number,
) {
  if (id) {
    await db.runAsync(
      `UPDATE scheduled_reminders SET name = ?, amount = ?, categoryId = ?,
        subcategoryId = ?, note = ?, repeatUnit = ?, weekday = ?, dueDay = ?,
        dueMonth = ?, reminderHour = ?, reminderMinute = ?, endDate = ? WHERE id = ?`,
      [
        draft.name,
        draft.amount,
        draft.categoryId,
        draft.subcategoryId,
        draft.note,
        draft.repeatUnit,
        draft.weekday,
        draft.dueDay,
        draft.dueMonth,
        draft.reminderHour,
        draft.reminderMinute,
        draft.endDate,
        id,
      ],
    );
    return id;
  }
  const result = await db.runAsync(
    `INSERT INTO scheduled_reminders
      (name, amount, categoryId, subcategoryId, note, repeatUnit, weekday,
       dueDay, dueMonth, reminderHour, reminderMinute, endDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      draft.name,
      draft.amount,
      draft.categoryId,
      draft.subcategoryId,
      draft.note,
      draft.repeatUnit,
      draft.weekday,
      draft.dueDay,
      draft.dueMonth,
      draft.reminderHour,
      draft.reminderMinute,
      draft.endDate,
    ],
  );
  return result.lastInsertRowId;
}

export async function setReminderActive(
  db: SQLiteDatabase,
  reminderId: number,
  active: boolean,
) {
  await db.runAsync("UPDATE scheduled_reminders SET isActive = ? WHERE id = ?", [
    Number(active),
    reminderId,
  ]);
}

export async function deleteScheduledReminder(
  db: SQLiteDatabase,
  reminderId: number,
) {
  await db.runAsync("DELETE FROM scheduled_reminders WHERE id = ?", [reminderId]);
}

export async function markReminderOccurrence(
  db: SQLiteDatabase,
  reminderId: number,
  occurrenceDate: string,
  status: "skipped" | "added",
  expenseId: number | null = null,
) {
  await db.runAsync(
    `INSERT OR REPLACE INTO reminder_occurrences
      (reminderId, occurrenceDate, status, expenseId, actedAt)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [reminderId, occurrenceDate, status, expenseId],
  );
}

export async function requestScheduledReminderPermission() {
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: "Scheduled reminders",
    description: "Reminders for recurring bills and expenses.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#087443",
  });
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function hasScheduledReminderPermission() {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

export async function cancelScheduledReminderNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => item.content.data?.kind === "scheduled-reminder")
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

async function performScheduledReminderNotificationSync(
  db: SQLiteDatabase,
  language: Language,
) {
  await cancelScheduledReminderNotifications();
  if (!(await hasScheduledReminderPermission())) return 0;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: "Scheduled reminders",
    description: "Reminders for recurring bills and expenses.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: "#087443",
  });

  const reminders = (await loadScheduledReminders(db)).filter((item) => item.isActive);
  const candidates: { reminder: ScheduledReminder; date: Date }[] = [];
  for (const reminder of reminders) {
    for (const date of nextReminderDates(
      reminderRule(reminder),
      new Date(),
      OCCURRENCES_PER_REMINDER,
    )) {
      candidates.push({ reminder, date });
    }
  }
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  let scheduledCount = 0;
  for (const candidate of candidates.slice(0, MAX_PENDING_REMINDERS)) {
    const occurrenceDate = localDateKey(candidate.date);
    const acted = await db.getFirstAsync<{ status: string }>(
      "SELECT status FROM reminder_occurrences WHERE reminderId = ? AND occurrenceDate = ?",
      [candidate.reminder.id, occurrenceDate],
    );
    if (acted) continue;
    const title = language === "en" ? "Scheduled reminder" : "নির্ধারিত রিমাইন্ডার";
    const category = candidate.reminder.categoryName;
    const date = candidate.date.toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", {
      day: "numeric",
      month: "short",
    });
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: language === "en"
          ? `${candidate.reminder.name} · ${category} · Tk ${candidate.reminder.amount.toLocaleString("en-IN")} · ${date}`
          : `${candidate.reminder.name} · ${category} · ৳${candidate.reminder.amount.toLocaleString("bn-BD")} · ${date}`,
        data: {
          kind: "scheduled-reminder",
          reminderId: candidate.reminder.id,
          occurrenceDate,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: candidate.date,
        channelId: REMINDER_CHANNEL,
      },
    });
    scheduledCount++;
  }
  return scheduledCount;
}

export function syncScheduledReminderNotifications(
  db: SQLiteDatabase,
  language: Language,
) {
  const sync = () => performScheduledReminderNotificationSync(db, language);
  const next = reminderSyncQueue.then(sync, sync);
  reminderSyncQueue = next.catch(() => 0);
  return next;
}

export function nextDateForReminder(reminder: ScheduledReminder, from = new Date()) {
  return nextReminderDates(reminderRule(reminder), from, 1)[0] || null;
}
