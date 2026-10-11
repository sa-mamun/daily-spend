import React, { useContext, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppDatePicker } from "../../components/AppDatePicker";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { MAX_EXPENSE_AMOUNT, MAX_NOTE_LENGTH, PURPLE, ThemeContext } from "../../theme/constants";
import { MINT_MODAL_SURFACE } from "../../theme/mint";
import { styles, darkStyles } from "../../theme/styles";
import type { Category, Subcategory } from "../../types/models";
import { localDateKey, taka } from "../../utils/dates";
import type { ReminderReview } from "./scheduledService";

export type ReminderExpenseDraft = {
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  note: string;
  expenseDate: string;
};

export function ReminderReviewModal({
  reminder,
  categories,
  subcategories,
  saving,
  onClose,
  onAddExpense,
  onSkip,
}: {
  reminder: ReminderReview | null;
  categories: Category[];
  subcategories: Subcategory[];
  saving: boolean;
  onClose: () => void;
  onAddExpense: (draft: ReminderExpenseDraft) => void;
  onSkip: () => void;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [error, setError] = useState("");
  const palette = useMemo(() => ({
    surface: dark ? MINT_MODAL_SURFACE : "#fff",
    secondary: dark ? "#18271f" : "#efebe2",
    text: dark ? "#f5f0e6" : "#181713",
    muted: dark ? "#b9b2a4" : "#706b61",
    border: dark ? "#454035" : "#e8e4db",
    green: dark ? "#edc176" : PURPLE,
    selected: dark ? "#48391f" : "#f7ead0",
  }), [dark]);

  React.useEffect(() => {
    if (!reminder) return;
    setAmount(String(reminder.amount));
    setCategoryId(reminder.categoryId);
    setSubcategoryId(reminder.subcategoryId);
    setNote(reminder.note || "");
    setDate(new Date(`${reminder.occurrenceDate}T00:00:00`));
    setDatePickerOpen(false);
    setError("");
  }, [reminder]);

  const selectedSubcategories = subcategories.filter((item) => item.categoryId === categoryId);
  const submit = () => {
    const value = Number(amount.trim());
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || !Number.isFinite(value) || value <= 0 || value > MAX_EXPENSE_AMOUNT) {
      setError(language === "en" ? "Enter a valid amount greater than zero." : "শূন্যের বেশি সঠিক amount লিখুন।");
      return;
    }
    if (!categoryId || note.length > MAX_NOTE_LENGTH) {
      setError(language === "en" ? "Choose a category and keep the note within 120 characters." : "একটি category বেছে নিন এবং নোট ১২০ অক্ষরের মধ্যে রাখুন।");
      return;
    }
    setError("");
    onAddExpense({ amount: value, categoryId, subcategoryId, note: note.trim(), expenseDate: localDateKey(date) });
  };

  return (
    <>
      <Modal transparent visible={!!reminder} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalBg, dark && darkStyles.modalBg]}>
          <View style={[styles.modal, dark && darkStyles.modal, { maxHeight: "92%", paddingBottom: Math.max(26, insets.bottom + 14), backgroundColor: palette.surface }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Close review" : "Review বন্ধ করুন"} style={styles.close} onPress={onClose}><Text style={[styles.closeText, dark && darkStyles.closeText]}>×</Text></Pressable>
            <Text style={[styles.eyebrow, dark && darkStyles.eyebrow]}>{language === "en" ? "REMINDER REVIEW" : "রিমাইন্ডার যাচাই"}</Text>
            <Text style={[styles.modalTitle, dark && darkStyles.modalTitle]}>{reminder?.name || (language === "en" ? "Review reminder" : "রিমাইন্ডার দেখুন")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 14, backgroundColor: dark ? "#48391f" : "#f7ead0", marginBottom: 14 }}>
              <Ionicons name="information-circle-outline" size={19} color={palette.green} />
              <Text style={{ color: palette.text, flex: 1, fontSize: 12, lineHeight: 17 }}>{language === "en" ? "This is only a reminder. Nothing is recorded until you add the expense." : "এটি শুধু রিমাইন্ডার। আপনি যোগ না করা পর্যন্ত কোনো expense record হবে না।"}</Text>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 9 }}>
              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Amount" : "পরিমাণ"}</Text>
              <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={language === "en" ? "Tk 0" : "৳ ০"} placeholderTextColor={dark ? "#b9b2a4" : "#706b61"} style={[styles.input, dark && darkStyles.input]} />
              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Category" : "ক্যাটাগরি"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                {categories.map((category) => <Pressable key={category.id} onPress={() => { setCategoryId(category.id); setSubcategoryId(null); }} style={[styles.chip, dark && darkStyles.chip, categoryId === category.id && { backgroundColor: palette.selected, borderColor: palette.green }]}><View style={styles.chipContent}><CategoryIcon icon={category.icon} size={16} color={palette.green} /><Text style={dark ? darkStyles.chipText : undefined}>{category.name}</Text></View></Pressable>)}
              </ScrollView>
              {selectedSubcategories.length ? <>
                <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Subcategory" : "সাব-ক্যাটাগরি"}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  <Pressable onPress={() => setSubcategoryId(null)} style={[styles.chip, dark && darkStyles.chip, subcategoryId === null && { backgroundColor: palette.selected, borderColor: palette.green }]}><Text style={{ color: palette.text, fontSize: 12 }}>{language === "en" ? "None" : "নেই"}</Text></Pressable>
                  {selectedSubcategories.map((subcategory) => <Pressable key={subcategory.id} onPress={() => setSubcategoryId(subcategory.id)} style={[styles.chip, dark && darkStyles.chip, subcategoryId === subcategory.id && { backgroundColor: palette.selected, borderColor: palette.green }]}><Text style={dark ? darkStyles.chipText : undefined}>{subcategory.name}</Text></Pressable>)}
                </ScrollView>
              </> : null}
              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Expense date" : "খরচের তারিখ"}</Text>
              <Pressable onPress={() => setDatePickerOpen(true)} style={[styles.dateButton, dark && darkStyles.dateButton]}><Text style={[styles.dateButtonText, dark && darkStyles.dateButtonText]}>{date.toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", { day: "numeric", month: "long", year: "numeric" })}</Text><Ionicons name="calendar-outline" size={18} color={palette.green} /></Pressable>
              <Text style={[styles.label, dark && darkStyles.label]}>{language === "en" ? "Note · optional" : "নোট · ঐচ্ছিক"}</Text>
              <TextInput value={note} onChangeText={setNote} maxLength={MAX_NOTE_LENGTH} placeholder={language === "en" ? "Add a note" : "নোট লিখুন"} placeholderTextColor={dark ? "#b9b2a4" : "#706b61"} style={[styles.input, dark && darkStyles.input]} />
              {error ? <Text style={[styles.inputErrorText, dark && darkStyles.inputErrorText]}>{error}</Text> : null}
            </ScrollView>
            <Pressable onPress={submit} disabled={saving} style={[styles.primary, dark && darkStyles.primary, saving && styles.primaryDisabled, { marginTop: 8 }]}>{saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.primaryText, dark && darkStyles.primaryText]}>{language === "en" ? `Add expense · ${taka(Number(amount) || 0, language)}` : `খরচ যোগ করুন · ${taka(Number(amount) || 0, language)}`}</Text>}</Pressable>
            <Pressable onPress={onSkip} disabled={saving} style={{ minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 3 }}><Text style={{ color: palette.muted, fontWeight: "600" }}>{language === "en" ? "Skip this time" : "এবার বাদ দিন"}</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {datePickerOpen ? <AppDatePicker value={date} onSelect={setDate} onClose={() => setDatePickerOpen(false)} /> : null}
    </>
  );
}
