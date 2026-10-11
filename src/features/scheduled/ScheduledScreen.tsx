import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, Switch, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { DARK_MODAL_SURFACE, PURPLE, ThemeContext } from "../../theme/constants";
import { MINT_MODAL_SURFACE } from "../../theme/mint";
import { styles, darkStyles } from "../../theme/styles";
import { CategoryIcon } from "../../components/CategoryIcon";
import { CompactActionButton } from "../../components/CompactActionButton";
import { EmptyStateAction } from "../../components/EmptyStateAction";
import { taka } from "../../utils/dates";
import type { Category, ScheduledReminder, Subcategory } from "../../types/models";
import { nextDateForReminder } from "./scheduledService";
import {
  deleteScheduledReminder,
  hasScheduledReminderPermission,
  loadScheduledReminders,
  requestScheduledReminderPermission,
  saveScheduledReminder,
  setReminderActive,
  syncScheduledReminderNotifications,
  type ReminderDraft,
} from "./scheduledService";
import { ReminderEditorModal } from "./ReminderEditorModal";

function dateTimeLabel(date: Date, language: "en" | "bn") {
  return date.toLocaleString(language === "en" ? "en-GB" : "bn-BD", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function scheduleLabel(item: ScheduledReminder, language: "en" | "bn") {
  if (item.repeatUnit === "weekly") {
    const days = language === "en" ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    return language === "en" ? `Weekly · ${days[item.weekday || 0]}` : `সাপ্তাহিক · ${days[item.weekday || 0]}`;
  }
  if (item.repeatUnit === "monthly")
    return language === "en" ? `Monthly · day ${item.dueDay} (month-end if shorter)` : `মাসিক · ${item.dueDay} তারিখ (দিন না থাকলে মাসের শেষ দিন)`;
  const month = new Date(2020, (item.dueMonth || 1) - 1, 1).toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", { month: "long" });
  return language === "en" ? `Yearly · ${month} ${item.dueDay}` : `বার্ষিক · ${month} ${item.dueDay} তারিখ`;
}

export function ScheduledScreen({
  categories,
  subcategories,
  refreshKey,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  refreshKey: number;
}) {
  const db = useSQLiteContext();
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ScheduledReminder | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const [permissionPromptVisible, setPermissionPromptVisible] = useState(false);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ReminderDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledReminder | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const palette = useMemo(() => ({
    surface: dark ? "#2a2924" : "#fff",
    secondary: dark ? "#36332c" : "#efebe2",
    text: dark ? "#f5f0e6" : "#181713",
    muted: dark ? "#b9b2a4" : "#706b61",
    border: dark ? "#454035" : "#e8e4db",
    green: dark ? "#edc176" : PURPLE,
    greenSurface: dark ? "#48391f" : "#f7ead0",
    warning: dark ? "#ffd18a" : "#98640d",
    danger: dark ? "#ff9da4" : "#b52d39",
  }), [dark]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setReminders(await loadScheduledReminders(db));
      setPermissionGranted(await hasScheduledReminderPermission());
      const asked = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = ?",
        ["scheduledReminderPermissionAsked"],
      );
      setPermissionAsked(asked?.value === "1");
      setError("");
    } catch (e) {
      console.error("Failed to load scheduled reminders:", e);
      setError(language === "en" ? "Could not load reminders." : "রিমাইন্ডার লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, [db, language]);

  useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  const persistDraft = async (draft: ReminderDraft): Promise<boolean> => {
    try {
      await saveScheduledReminder(db, draft, editingReminder?.id);
      try {
        await syncScheduledReminderNotifications(db, language);
      } catch (notificationError) {
        console.error("Reminder saved, but notification scheduling failed:", notificationError);
        setError(language === "en" ? "Saved, but notifications could not be scheduled. Check notification access." : "সেভ হয়েছে, তবে notification schedule করা যায়নি। Notification permission দেখুন।");
      }
      setEditorVisible(false);
      setEditingReminder(null);
      setPendingDraft(null);
      await refresh();
      return true;
    } catch (e) {
      console.error("Failed to save scheduled reminder:", e);
      setError(language === "en" ? "Reminder could not be saved. Please try again." : "রিমাইন্ডার সেভ হয়নি। আবার চেষ্টা করুন।");
      return false;
    }
  };

  const beginSave = async (draft: ReminderDraft): Promise<boolean> => {
    setError("");
    if (!permissionGranted && !permissionAsked) {
      setPendingDraft(draft);
      setPermissionPromptVisible(true);
      return true;
    }
    return persistDraft(draft);
  };

  const askPermission = async (saveWithoutPermission: boolean) => {
    setPermissionPromptVisible(false);
    await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", ["scheduledReminderPermissionAsked", "1"]);
    setPermissionAsked(true);
    if (!saveWithoutPermission) {
      try {
        const granted = await requestScheduledReminderPermission();
        setPermissionGranted(granted);
      } catch (e) {
        console.error("Could not request reminder permission:", e);
        setPermissionGranted(false);
      }
    }
    if (pendingDraft) await persistDraft(pendingDraft);
  };

  const enableNotifications = async () => {
    try {
      const granted = await requestScheduledReminderPermission();
      setPermissionGranted(granted);
      await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", ["scheduledReminderPermissionAsked", "1"]);
      setPermissionAsked(true);
      if (granted) await syncScheduledReminderNotifications(db, language);
      else await Linking.openSettings();
    } catch (e) {
      console.error("Could not enable reminder notifications:", e);
      await Linking.openSettings();
    }
  };

  const openNew = () => {
    if (!categories.length) {
      setError(language === "en" ? "Add a category first, then create a reminder." : "রিমাইন্ডার তৈরির আগে একটি category যোগ করুন।");
      return;
    }
    setEditingReminder(null);
    setEditorVisible(true);
  };

  const toggleActive = async (item: ScheduledReminder) => {
    setBusyId(item.id);
    try {
      await setReminderActive(db, item.id, !item.isActive);
      await syncScheduledReminderNotifications(db, language);
      await refresh();
    } catch (e) {
      console.error("Could not update reminder status:", e);
      setError(language === "en" ? "Reminder could not be updated." : "রিমাইন্ডার আপডেট করা যায়নি।");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteScheduledReminder(db, deleteTarget.id);
      await syncScheduledReminderNotifications(db, language);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      console.error("Could not delete reminder:", e);
      setError(language === "en" ? "Reminder could not be deleted." : "রিমাইন্ডার মুছে ফেলা যায়নি।");
      setDeleteTarget(null);
    }
  };

  return (
    <View style={{ paddingBottom: 104 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{language === "en" ? "Scheduled" : "নির্ধারিত"}</Text>
          <Text style={{ color: palette.muted, fontSize: 13, marginTop: 3 }}>{language === "en" ? "Recurring bills and expense reminders" : "নিয়মিত বিল ও খরচের রিমাইন্ডার"}</Text>
        </View>
        <CompactActionButton
          accessibilityLabel={language === "en" ? "Add reminder" : "রিমাইন্ডার যোগ করুন"}
          kind="add" tone="solid" label={language === "en" ? "Add" : "যোগ"}
          onPress={openNew}
        />
      </View>

      {!permissionGranted && reminders.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, backgroundColor: palette.secondary, borderWidth: 1, borderColor: palette.border, marginTop: 14 }}>
          <Ionicons name="notifications-off-outline" size={19} color={palette.warning} />
          <Text style={{ flex: 1, color: palette.muted, fontSize: 12 }}>{language === "en" ? "Reminders are saved, but notifications are off." : "রিমাইন্ডার সেভ আছে, তবে notification বন্ধ।"}</Text>
          <Pressable onPress={enableNotifications}><Text style={{ color: palette.green, fontWeight: "600", fontSize: 12 }}>{language === "en" ? "Enable" : "চালু"}</Text></Pressable>
        </View>
      ) : null}
      {error ? <Text style={[styles.inputErrorText, dark && darkStyles.inputErrorText, { marginTop: 12 }]}>{error}</Text> : null}

      {loading ? null : reminders.length === 0 ? (
        <View style={{ alignItems: "center", paddingHorizontal: 26, paddingVertical: 34, borderRadius: 22, backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1, marginTop: 18 }}>
          <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: dark ? "#48391f" : "#f7ead0", alignItems: "center", justifyContent: "center" }}><Ionicons name="calendar-outline" size={27} color={palette.green} /></View>
          <Text style={{ color: palette.text, fontWeight: "600", fontSize: 17, marginTop: 15 }}>{language === "en" ? "Nothing scheduled yet" : "এখনো কোনো রিমাইন্ডার নেই"}</Text>
          <Text style={{ color: palette.muted, fontSize: 13, textAlign: "center", lineHeight: 19, marginTop: 7 }}>{language === "en" ? "Add a recurring bill or expense. We’ll remind you, then you decide whether to record it." : "নিয়মিত বিল বা খরচ যোগ করুন। আমরা মনে করিয়ে দেব—খরচ হিসেবে যোগ করবেন কি না, সিদ্ধান্ত আপনার।"}</Text>
          <EmptyStateAction label={language === "en" ? "Add reminder" : "রিমাইন্ডার যোগ করুন"} onPress={openNew} />
        </View>
      ) : (
        <View style={{ gap: 11, marginTop: 17 }}>
          {reminders.map((item) => {
            const next = item.isActive ? nextDateForReminder(item) : null;
            return (
              <View key={item.id} style={{ padding: 15, borderRadius: 13, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, opacity: item.isActive ? 1 : 0.72 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: dark ? "#48391f" : "#f7ead0" }}><CategoryIcon icon={item.categoryIcon} size={21} color={palette.green} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: palette.text, fontWeight: "600", fontSize: 15 }}>{item.name}</Text>
                      <Text style={{ color: palette.text, fontWeight: "600", fontSize: 15 }}>{taka(item.amount, language)}</Text>
                    </View>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>{item.categoryName}{item.subcategoryName ? ` · ${item.subcategoryName}` : ""}</Text>
                    <Text style={{ color: palette.green, fontWeight: "600", fontSize: 12, marginTop: 8 }}>{scheduleLabel(item, language)}</Text>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>{item.isActive ? (next ? `${language === "en" ? "Next" : "পরবর্তী"} · ${dateTimeLabel(next, language)}` : (language === "en" ? "No upcoming date" : "পরবর্তী তারিখ নেই")) : (language === "en" ? "Paused" : "বিরতিতে")}</Text>
                    {item.endDate ? <Text style={{ color: palette.muted, fontSize: 11, marginTop: 3 }}>{language === "en" ? "Until" : "শেষ"} · {new Date(`${item.endDate}T00:00:00`).toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", { day: "numeric", month: "short", year: "numeric" })}</Text> : null}
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: palette.border, marginTop: 13, marginBottom: 10 }} />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Switch value={item.isActive} onValueChange={() => void toggleActive(item)} disabled={busyId === item.id} trackColor={{ false: dark ? "#454035" : "#d9deea", true: "#dfa43e" }} thumbColor="#fff" /><Text style={{ color: palette.muted, fontSize: 12 }}>{item.isActive ? (language === "en" ? "Active" : "চালু") : (language === "en" ? "Paused" : "বিরতিতে")}</Text></View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Edit reminder" : "রিমাইন্ডার এডিট"} onPress={() => { setEditingReminder(item); setEditorVisible(true); }} style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}><Ionicons name="create-outline" size={18} color={palette.text} /></Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Delete reminder" : "রিমাইন্ডার মুছুন"} onPress={() => setDeleteTarget(item)} style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "transparent" }}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <ReminderEditorModal visible={editorVisible} categories={categories} subcategories={subcategories} editingReminder={editingReminder} onClose={() => { setEditorVisible(false); setEditingReminder(null); }} onSave={beginSave} />

      <Modal transparent visible={permissionPromptVisible} animationType="fade" onRequestClose={() => void askPermission(true)}>
        <View style={[styles.modalBg, dark && darkStyles.modalBg, { justifyContent: "center" }]}>
          <View style={{ width: "88%", alignSelf: "center", padding: 22, borderRadius: 22, backgroundColor: dark ? MINT_MODAL_SURFACE : palette.surface, borderWidth: 1, borderColor: palette.border }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: dark ? "#48391f" : "#f7ead0", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><Ionicons name="notifications-outline" size={23} color={palette.green} /></View>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "600" }}>{language === "en" ? "Allow reminder notifications?" : "রিমাইন্ডার notification চালু করবেন?"}</Text>
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{language === "en" ? "We’ll notify you at the time you chose. A reminder never adds an expense automatically; you’ll review it first." : "আপনার বেছে নেওয়া সময়ে মনে করিয়ে দেব। রিমাইন্ডার নিজে থেকে expense যোগ করবে না—আগে আপনি review করবেন।"}</Text>
            <Pressable onPress={() => void askPermission(false)} style={[styles.primary, dark && darkStyles.primary, { marginTop: 20 }]}><Text style={[styles.primaryText, dark && darkStyles.primaryText]}>{language === "en" ? "Allow notifications" : "Notification অনুমতি দিন"}</Text></Pressable>
            <Pressable onPress={() => void askPermission(true)} style={{ minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 4 }}><Text style={{ color: palette.muted, fontWeight: "600" }}>{language === "en" ? "Save without notifications" : "Notification ছাড়াই সেভ করুন"}</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={!!deleteTarget} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={[styles.modalBg, dark && darkStyles.modalBg, { justifyContent: "center" }]}>
          <View style={{ width: "88%", alignSelf: "center", padding: 22, borderRadius: 22, backgroundColor: dark ? DARK_MODAL_SURFACE : palette.surface, borderWidth: 1, borderColor: palette.border }}>
            <Text style={{ color: palette.text, fontWeight: "600", fontSize: 18 }}>{language === "en" ? "Delete reminder?" : "রিমাইন্ডার মুছবেন?"}</Text>
            <Text style={{ color: palette.muted, marginTop: 8, lineHeight: 20 }}>{language === "en" ? `${deleteTarget?.name || "This reminder"} and its future notifications will be removed. Existing expenses stay unchanged.` : `${deleteTarget?.name || "এই রিমাইন্ডার"} এবং এর ভবিষ্যৎ notification মুছে যাবে। আগের expense অপরিবর্তিত থাকবে।`}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <Pressable onPress={() => setDeleteTarget(null)} style={{ flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.secondary }}><Text style={{ color: palette.text, fontWeight: "600" }}>{language === "en" ? "Cancel" : "বাতিল"}</Text></Pressable>
              <Pressable onPress={() => void confirmDelete()} style={{ flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.danger }}><Text style={{ color: "#fff", fontWeight: "600" }}>{language === "en" ? "Delete" : "মুছুন"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
