import React, { useContext, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDatePicker } from "../../components/AppDatePicker";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { MAX_EXPENSE_AMOUNT, MAX_NAME_LENGTH, MAX_NOTE_LENGTH, PURPLE, ThemeContext } from "../../theme/constants";
import { MINT_MODAL_SURFACE } from "../../theme/mint";
import { styles, darkStyles } from "../../theme/styles";
import type { Category, ReminderRepeatUnit, ScheduledReminder, Subcategory } from "../../types/models";
import type { ReminderDraft } from "./scheduledService";
import { localDateKey } from "../../utils/dates";

const weekdays = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
const englishWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clampDay(value: string) {
  const parsed = Number(value.replace(/\D/g, ""));
  return parsed ? Math.max(1, Math.min(31, parsed)) : 1;
}

export function ReminderEditorModal({
  visible,
  categories,
  subcategories,
  editingReminder,
  onClose,
  onSave,
}: {
  visible: boolean;
  categories: Category[];
  subcategories: Subcategory[];
  editingReminder: ScheduledReminder | null;
  onClose: () => void;
  onSave: (draft: ReminderDraft) => Promise<boolean>;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => ({
    surface: dark ? MINT_MODAL_SURFACE : "#ffffff",
    secondary: dark ? "#36332c" : "#efebe2",
    text: dark ? "#f5f0e6" : "#181713",
    muted: dark ? "#b9b2a4" : "#706b61",
    border: dark ? "#454035" : "#e8e4db",
    green: dark ? "#edc176" : PURPLE,
    selected: dark ? "#48391f" : "#f7ead0",
    danger: dark ? "#ff9da4" : "#b52d39",
  }), [dark]);

  const [name, setName] = useState(editingReminder?.name || "");
  const [amount, setAmount] = useState(editingReminder ? String(editingReminder.amount) : "");
  const [categoryId, setCategoryId] = useState(editingReminder?.categoryId || categories[0]?.id || 0);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(editingReminder?.subcategoryId || null);
  const [note, setNote] = useState(editingReminder?.note || "");
  const [repeatUnit, setRepeatUnit] = useState<ReminderRepeatUnit>(editingReminder?.repeatUnit || "monthly");
  const [weekday, setWeekday] = useState(editingReminder?.weekday ?? new Date().getDay());
  const [scheduleDate, setScheduleDate] = useState(() => {
    if (editingReminder?.dueMonth && editingReminder.dueDay)
      return new Date(new Date().getFullYear(), editingReminder.dueMonth - 1, Math.min(editingReminder.dueDay, new Date(new Date().getFullYear(), editingReminder.dueMonth, 0).getDate()));
    return new Date();
  });
  const [dueDayText, setDueDayText] = useState(String(editingReminder?.dueDay || new Date().getDate()));
  const [hour, setHour] = useState(editingReminder?.reminderHour ?? 9);
  const [minute, setMinute] = useState(editingReminder?.reminderMinute ?? 0);
  const [endDate, setEndDate] = useState<Date | null>(editingReminder?.endDate ? new Date(`${editingReminder.endDate}T00:00:00`) : null);
  const [datePicker, setDatePicker] = useState<"yearly" | "end" | null>(null);
  const [timePicker, setTimePicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setName(editingReminder?.name || "");
    setAmount(editingReminder ? String(editingReminder.amount) : "");
    setCategoryId(editingReminder?.categoryId || categories[0]?.id || 0);
    setSubcategoryId(editingReminder?.subcategoryId || null);
    setNote(editingReminder?.note || "");
    setRepeatUnit(editingReminder?.repeatUnit || "monthly");
    setWeekday(editingReminder?.weekday ?? new Date().getDay());
    const baseDate = editingReminder?.dueMonth && editingReminder.dueDay
      ? new Date(new Date().getFullYear(), editingReminder.dueMonth - 1, Math.min(editingReminder.dueDay, new Date(new Date().getFullYear(), editingReminder.dueMonth, 0).getDate()))
      : new Date();
    setScheduleDate(baseDate);
    setDueDayText(String(editingReminder?.dueDay || new Date().getDate()));
    setHour(editingReminder?.reminderHour ?? 9);
    setMinute(editingReminder?.reminderMinute ?? 0);
    setEndDate(editingReminder?.endDate ? new Date(`${editingReminder.endDate}T00:00:00`) : null);
    setError("");
    setDatePicker(null);
  }, [visible, editingReminder, categories]);

  const filteredSubcategories = subcategories.filter((item) => item.categoryId === categoryId);
  const timeText = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const showDate = (date: Date) => date.toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", { day: "numeric", month: "long", year: "numeric" });
  const changeCategory = (id: number) => {
    setCategoryId(id);
    setSubcategoryId(null);
  };

  const submit = async () => {
    const cleanName = name.trim();
    const cleanAmount = amount.trim();
    if (!cleanName || cleanName.length > MAX_NAME_LENGTH) {
      setError(language === "en" ? "Enter a reminder name (up to 32 characters)." : "রিমাইন্ডারের নাম দিন (সর্বোচ্চ ৩২ অক্ষর)।");
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(cleanAmount) || !Number.isFinite(Number(cleanAmount)) || Number(cleanAmount) <= 0 || Number(cleanAmount) > MAX_EXPENSE_AMOUNT) {
      setError(language === "en" ? "Enter a valid amount greater than zero." : "শূন্যের বেশি সঠিক amount লিখুন।");
      return;
    }
    if (!categoryId) {
      setError(language === "en" ? "Choose a category." : "একটি category বেছে নিন।");
      return;
    }
    if (note.length > MAX_NOTE_LENGTH) {
      setError(language === "en" ? "Note can be up to 120 characters." : "নোট সর্বোচ্চ ১২০ অক্ষরের হতে পারবে।");
      return;
    }
    const endDateKey = endDate ? localDateKey(endDate) : null;
    if (endDateKey && endDateKey < localDateKey(new Date())) {
      setError(language === "en" ? "End date must be today or later." : "শেষ তারিখ আজ বা তার পরের দিন হতে হবে।");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const saved = await onSave({
        name: cleanName,
        amount: Number(cleanAmount),
        categoryId,
        subcategoryId,
        note: note.trim(),
        repeatUnit,
        weekday: repeatUnit === "weekly" ? weekday : null,
        dueDay: repeatUnit === "monthly" ? clampDay(dueDayText) : repeatUnit === "yearly" ? scheduleDate.getDate() : null,
        dueMonth: repeatUnit === "yearly" ? scheduleDate.getMonth() + 1 : null,
        reminderHour: hour,
        reminderMinute: minute,
        endDate: endDateKey,
      });
      if (!saved) setError(language === "en" ? "Could not save. Please try again." : "সেভ হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  const step = (field: "hour" | "minute", direction: number) => {
    if (field === "hour") setHour((current) => (current + direction + 24) % 24);
    else setMinute((current) => (current + direction * 5 + 60) % 60);
  };

  return (
    <>
      <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBg, dark && darkStyles.modalBg]}>
          <View style={[styles.modal, dark && darkStyles.modal, { maxHeight: "92%", paddingBottom: Math.max(24, insets.bottom + 12), backgroundColor: palette.surface }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Close" : "বন্ধ করুন"} style={styles.close} onPress={onClose}>
              <Text style={[styles.closeText, dark && darkStyles.closeText]}>×</Text>
            </Pressable>
            <Text style={[styles.eyebrow, dark && darkStyles.eyebrow]}>{language === "en" ? "RECURRING REMINDER" : "নিয়মিত রিমাইন্ডার"}</Text>
            <Text style={[styles.modalTitle, dark && darkStyles.modalTitle]}>{editingReminder ? (language === "en" ? "Edit reminder" : "রিমাইন্ডার এডিট") : (language === "en" ? "New reminder" : "নতুন রিমাইন্ডার")}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 92 }}>
              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Name" : "নাম"}</Text>
              <TextInput value={name} onChangeText={setName} maxLength={MAX_NAME_LENGTH} placeholder={language === "en" ? "e.g. Home internet" : "যেমন: বাসার ইন্টারনেট"} placeholderTextColor={dark ? "#b9b2a4" : "#706b61"} style={[styles.input, dark && darkStyles.input]} />

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Amount" : "পরিমাণ"}</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={language === "en" ? "Tk 0" : "৳ ০"} placeholderTextColor={dark ? "#b9b2a4" : "#706b61"} style={[styles.input, dark && darkStyles.input]} />

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Category" : "ক্যাটাগরি"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {categories.map((category) => (
                  <Pressable key={category.id} onPress={() => changeCategory(category.id)} style={[styles.chip, dark && darkStyles.chip, categoryId === category.id && { backgroundColor: palette.selected, borderColor: palette.green }]}>
                    <View style={styles.chipContent}><CategoryIcon icon={category.icon} size={16} color={palette.green} /><Text style={[{ color: "#181713" }, dark && darkStyles.chipText]}>{category.name}</Text></View>
                  </Pressable>
                ))}
              </ScrollView>
              {filteredSubcategories.length > 0 ? (
                <>
                  <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Subcategory · optional" : "সাব-ক্যাটাগরি · ঐচ্ছিক"}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {filteredSubcategories.map((subcategory) => (
                      <Pressable key={subcategory.id} onPress={() => setSubcategoryId(subcategoryId === subcategory.id ? null : subcategory.id)} style={[styles.chip, dark && darkStyles.chip, subcategoryId === subcategory.id && { backgroundColor: palette.selected, borderColor: palette.green }]}>
                        <Text style={[{ color: "#181713" }, dark && darkStyles.chipText]}>{subcategory.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Repeat" : "পুনরাবৃত্তি"}</Text>
              <View style={{ flexDirection: "row", backgroundColor: palette.secondary, borderRadius: 14, padding: 4 }}>
                {(["weekly", "monthly", "yearly"] as const).map((unit) => {
                  const label = language === "en" ? unit[0].toUpperCase() + unit.slice(1) : ({ weekly: "সাপ্তাহিক", monthly: "মাসিক", yearly: "বার্ষিক" }[unit]);
                  return <Pressable key={unit} onPress={() => setRepeatUnit(unit)} style={{ flex: 1, minHeight: 42, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: repeatUnit === unit ? "#181713" : "transparent" }}><Text style={{ fontWeight: "600", color: repeatUnit === unit ? "#fff" : palette.muted, fontSize: 13 }}>{label}</Text></Pressable>;
                })}
              </View>

              {repeatUnit === "weekly" ? (
                <>
                  <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Every" : "বার"}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
                    {(language === "en" ? englishWeekdays : weekdays).map((label, index) => <Pressable key={label} onPress={() => setWeekday(index)} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: weekday === index ? "#181713" : palette.secondary }}><Text style={{ color: weekday === index ? "#fff" : palette.text, fontSize: 11, fontWeight: "600" }}>{label}</Text></Pressable>)}
                  </View>
                </>
              ) : null}
              {repeatUnit === "monthly" ? (
                <>
                  <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Due day" : "মাসের তারিখ"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <TextInput value={dueDayText} onChangeText={(value) => setDueDayText(value.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" style={[styles.input, dark && darkStyles.input, { flex: 1, marginBottom: 0 }]} />
                    <Text style={{ color: palette.muted, flex: 2, fontSize: 12 }}>{language === "en" ? "If a month is shorter, it runs on that month’s last day." : "মাসে দিনটি না থাকলে ওই মাসের শেষ দিনে রিমাইন্ডার হবে।"}</Text>
                  </View>
                </>
              ) : null}
              {repeatUnit === "yearly" ? (
                <>
                  <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Every year on" : "প্রতি বছরের তারিখ"}</Text>
                  <Pressable onPress={() => setDatePicker("yearly")} style={[styles.dateButton, dark && darkStyles.dateButton]}><Text style={[styles.dateButtonText, dark && darkStyles.dateButtonText]}>{showDate(scheduleDate)}</Text><Ionicons name="calendar-outline" size={18} color={palette.green} /></Pressable>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 5 }}>{language === "en" ? "For dates such as February 29, use the month’s last day when needed." : "ফেব্রুয়ারি ২৯-এর মতো দিনে, প্রয়োজনে মাসের শেষ দিনে রিমাইন্ডার হবে।"}</Text>
                </>
              ) : null}

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Reminder time" : "রিমাইন্ডারের সময়"}</Text>
              <Pressable onPress={() => setTimePicker(true)} style={[styles.dateButton, dark && darkStyles.dateButton]}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="time-outline" size={18} color={palette.green} /><Text style={[styles.dateButtonText, dark && darkStyles.dateButtonText]}>{timeText}</Text></View><Text style={{ color: palette.muted, fontSize: 12 }}>{language === "en" ? "Change" : "বদলান"}</Text></Pressable>

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Note · optional" : "নোট · ঐচ্ছিক"}</Text>
              <TextInput value={note} onChangeText={setNote} maxLength={MAX_NOTE_LENGTH} placeholder={language === "en" ? "Add a short note" : "ছোট নোট লিখুন"} placeholderTextColor={dark ? "#b9b2a4" : "#706b61"} style={[styles.input, dark && darkStyles.input]} />

              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "End date · optional" : "শেষ তারিখ · ঐচ্ছিক"}</Text>
              {endDate ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Pressable onPress={() => setDatePicker("end")} style={[styles.dateButton, dark && darkStyles.dateButton, { flex: 1 }]}><Text style={[styles.dateButtonText, dark && darkStyles.dateButtonText]}>{showDate(endDate)}</Text><Ionicons name="calendar-outline" size={18} color={palette.green} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Remove end date" : "শেষ তারিখ সরান"} onPress={() => setEndDate(null)} style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.secondary }}><Ionicons name="close" size={19} color={palette.muted} /></Pressable></View> : <Pressable onPress={() => setDatePicker("end")} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7 }}><Ionicons name="add-circle-outline" size={19} color={palette.green} /><Text style={{ color: palette.green, fontWeight: "600" }}>{language === "en" ? "Add end date" : "শেষ তারিখ যোগ করুন"}</Text></Pressable>}
              {error ? <Text style={[styles.inputErrorText, dark && darkStyles.inputErrorText, { marginTop: 8 }]}>{error}</Text> : null}
            </ScrollView>
            <Pressable disabled={saving} onPress={submit} style={[styles.primary, dark && darkStyles.primary, saving && styles.primaryDisabled, { marginTop: 8 }]}><Text style={[styles.primaryText, dark && darkStyles.primaryText]}>{editingReminder ? (language === "en" ? "Save changes" : "পরিবর্তন সেভ করুন") : (language === "en" ? "Save reminder" : "রিমাইন্ডার সেভ করুন")}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {datePicker ? <AppDatePicker value={datePicker === "end" ? endDate || new Date() : scheduleDate} onSelect={(date) => datePicker === "end" ? setEndDate(date) : setScheduleDate(date)} onClose={() => setDatePicker(null)} /> : null}
      <Modal transparent visible={timePicker} animationType="fade" onRequestClose={() => setTimePicker(false)}>
        <View style={[styles.modalBg, dark && darkStyles.modalBg, { justifyContent: "center" }]}>
          <View style={{ width: "88%", alignSelf: "center", padding: 22, borderRadius: 22, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "600", textAlign: "center" }}>{language === "en" ? "Reminder time" : "রিমাইন্ডারের সময়"}</Text>
            <Text style={{ color: palette.muted, fontSize: 12, textAlign: "center", marginTop: 5 }}>{language === "en" ? "24-hour time" : "২৪ ঘণ্টার সময়"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 22 }}>
              {(["hour", "minute"] as const).map((field) => <View key={field} style={{ alignItems: "center", gap: 7 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? `Increase ${field}` : `${field} বাড়ান`} onPress={() => step(field, 1)} style={{ width: 54, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.secondary }}><Ionicons name="chevron-up" size={20} color={palette.green} /></Pressable>
                <Text style={{ minWidth: 66, textAlign: "center", color: palette.text, fontSize: 34, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{String(field === "hour" ? hour : minute).padStart(2, "0")}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? `Decrease ${field}` : `${field} কমান`} onPress={() => step(field, -1)} style={{ width: 54, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.secondary }}><Ionicons name="chevron-down" size={20} color={palette.green} /></Pressable>
                <Text style={{ color: palette.muted, fontSize: 11 }}>{language === "en" ? field : field === "hour" ? "ঘণ্টা" : "মিনিট"}</Text>
              </View>)}
              <Text style={{ color: palette.muted, fontSize: 30, fontWeight: "600", marginBottom: 22 }}>:</Text>
            </View>
            <Pressable onPress={() => setTimePicker(false)} style={[styles.primary, dark && darkStyles.primary, { marginTop: 20 }]}><Text style={[styles.primaryText, dark && darkStyles.primaryText]}>{language === "en" ? "Done" : "ঠিক আছে"}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
