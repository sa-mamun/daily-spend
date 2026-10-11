import type { ReminderRepeatUnit } from "../../types/models";
import { localDateKey } from "../../utils/dates";

export type ReminderRule = {
  repeatUnit: ReminderRepeatUnit;
  weekday: number | null;
  dueDay: number | null;
  dueMonth: number | null;
  reminderHour: number;
  reminderMinute: number;
  endDate: string | null;
};

function reminderDate(year: number, month: number, day: number, rule: ReminderRule) {
  return new Date(year, month, day, rule.reminderHour, rule.reminderMinute, 0, 0);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function nextReminderDates(
  rule: ReminderRule,
  from = new Date(),
  count = 1,
): Date[] {
  const results: Date[] = [];
  const after = from.getTime();
  const endDate = rule.endDate;
  const add = (candidate: Date) => {
    if (candidate.getTime() <= after) return;
    const dateKey = localDateKey(candidate);
    if (endDate && dateKey > endDate) return;
    results.push(candidate);
  };

  if (rule.repeatUnit === "weekly") {
    const weekday = rule.weekday ?? from.getDay();
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let scanned = 0; results.length < count && scanned < 7 * (count + 2); scanned++) {
      if (cursor.getDay() === weekday)
        add(reminderDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), rule));
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rule.repeatUnit === "monthly") {
    const dueDay = Math.max(1, Math.min(31, rule.dueDay ?? from.getDate()));
    for (let offset = 0; results.length < count && offset < count + 2; offset++) {
      const month = from.getMonth() + offset;
      const year = from.getFullYear() + Math.floor(month / 12);
      const monthIndex = ((month % 12) + 12) % 12;
      const day = Math.min(dueDay, lastDayOfMonth(year, monthIndex));
      add(reminderDate(year, monthIndex, day, rule));
    }
  } else {
    const dueMonth = Math.max(1, Math.min(12, rule.dueMonth ?? from.getMonth() + 1)) - 1;
    const dueDay = Math.max(1, Math.min(31, rule.dueDay ?? from.getDate()));
    for (let offset = 0; results.length < count && offset < count + 2; offset++) {
      const year = from.getFullYear() + offset;
      const day = Math.min(dueDay, lastDayOfMonth(year, dueMonth));
      add(reminderDate(year, dueMonth, day, rule));
    }
  }
  return results;
}

export function repeatRuleFromDate(
  repeatUnit: ReminderRepeatUnit,
  date: Date,
  reminderHour: number,
  reminderMinute: number,
  endDate: string | null,
): ReminderRule {
  return {
    repeatUnit,
    weekday: repeatUnit === "weekly" ? date.getDay() : null,
    dueDay: repeatUnit === "weekly" ? null : date.getDate(),
    dueMonth: repeatUnit === "yearly" ? date.getMonth() + 1 : null,
    reminderHour,
    reminderMinute,
    endDate,
  };
}

