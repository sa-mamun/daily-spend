import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  TextInput,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { mintTheme, MINT, MINT_INK, MINT_MODAL_SURFACE } from "../theme/mint";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext, PURPLE, DARK_MODAL_SURFACE, CARD_RADIUS, CHART_LABEL_SPACING, CHART_NO_BORDER, GLASS_NAV, COMPACT_NAV, COMPACT_NAV_BUTTON, COMPACT_NAV_ICON, COMPACT_NAV_LABEL, MAX_EXPENSE_AMOUNT, MAX_NOTE_LENGTH, MAX_NAME_LENGTH } from "../theme/constants";
import { LanguageContext } from "../context/LanguageContext";
import { Text } from "../i18n/Text";
import { translateText } from "../i18n/translations";
import { defaults, defaultSubcategories, categoryIcons } from "../data/catalog";
import type { Category, Subcategory, Expense, DashboardStats, IconName } from "../types/models";
import { localDateKey, today, taka, dateText, dbDate } from "../utils/dates";
import { styles, darkStyles } from "../theme/styles";
import { CategoryIcon } from "../components/CategoryIcon";
import { BottomNavigation } from "../components/BottomNavigation";
import { AppDatePicker } from "../components/AppDatePicker";
import { Dashboard } from "../features/dashboard/Dashboard";
import { orbitTheme, ORBIT_CHROME } from "../features/dashboard/orbitTheme";
import { ExpenseHistory } from "../features/expenses/ExpenseHistory";
import { CenteredAmountInput } from "../features/expenses/CenteredAmountInput";
import { CategoryScreen } from "../features/categories/CategoryScreen";
import { ReportsScreen } from "../features/reports/ReportsScreen";
import { BackupModal } from "../features/backup/BackupModal";
import { BudgetScreen } from "../features/budget/BudgetScreen";
import { ScheduledScreen } from "../features/scheduled/ScheduledScreen";
import { ReminderReviewModal, type ReminderExpenseDraft } from "../features/scheduled/ReminderReviewModal";
import {
  checkBudgetNotifications,
  loadMonthlyBudgetSummary,
  type MonthlyBudgetSummary,
} from "../features/budget/budgetService";
import {
  loadReminderReview,
  markReminderOccurrence,
  syncScheduledReminderNotifications,
  type ReminderReview,
} from "../features/scheduled/scheduledService";
import { FeatureTourModal } from "../features/tour/FeatureTour";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
type CategoryActionTarget =
  | { type: "category"; item: Category }
  | { type: "subcategory"; item: Subcategory };
type CategoryDeleteTarget = {
  type: "category" | "subcategory";
  id: number;
  name: string;
  expenseCount: number;
  subcategoryCount: number;
  categoryBudgetCount: number;
  reminderCount: number;
};

export function ExpenseApp({ splashVisible }: { splashVisible: boolean }) {
  const insets = useSafeAreaInsets();
  const modalBottomPadding = Math.max(35, insets.bottom + 20);
  const db = useSQLiteContext();
  const menuTourRef = useRef<View | null>(null);
  const addTourRef = useRef<View | null>(null);
  const expensesNavTourRef = useRef<View | null>(null);
  const categoryNavTourRef = useRef<View | null>(null);
  const dashboardTourRef = useRef<View | null>(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const subcategoryScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const categoryAddScale = useRef(new Animated.Value(1)).current;
  const subcategoryAddScale = useRef(new Animated.Value(1)).current;
  const pageTransition = useRef(new Animated.Value(0)).current;
  const screenMounted = useRef(false);
  const [screen, setScreen] = useState<
    "dashboard" | "expenses" | "categories" | "reports" | "budget" | "scheduled"
  >("dashboard");
  const [dataRevision, setDataRevision] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const [featureTourPending, setFeatureTourPending] = useState(false);
  const { language, setLanguage } = useContext(LanguageContext);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    monthTotal: 0,
    previousMonthTotal: 0,
    todayTotal: 0,
    transactionCount: 0,
    topCategory: "—",
  });
  const [dashboardBudget, setDashboardBudget] =
    useState<MonthlyBudgetSummary | null>(null);
  const [reminderReview, setReminderReview] = useState<ReminderReview | null>(null);
  const [savingReminderExpense, setSavingReminderExpense] = useState(false);
  const handledReminderResponse = useRef<string | null>(null);
  const [openBudgetEditorRequested, setOpenBudgetEditorRequested] =
    useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const defaultRangeStart = new Date();
  defaultRangeStart.setHours(0, 0, 0, 0);
  defaultRangeStart.setDate(defaultRangeStart.getDate() - 6);
  const defaultRangeEnd = new Date();
  defaultRangeEnd.setHours(0, 0, 0, 0);
  const [expenseModal, setExpenseModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [subcategoryModal, setSubcategoryModal] = useState(false);
  const [categoryAction, setCategoryAction] =
    useState<CategoryActionTarget | null>(null);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] =
    useState<CategoryDeleteTarget | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [backupModal, setBackupModal] = useState(false);
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [expenseStartDate, setExpenseStartDate] = useState<Date | null>(
    defaultRangeStart,
  );
  const [expenseEndDate, setExpenseEndDate] = useState<Date | null>(
    defaultRangeEnd,
  );
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [subcategoryError, setSubcategoryError] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const savingExpenseRef = useRef(false);
  const savingCategoryRef = useRef(false);
  const savingSubcategoryRef = useRef(false);
  const [selected, setSelected] = useState(1);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(
    null,
  );
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("sparkles-outline");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [subcategoryParent, setSubcategoryParent] = useState(1);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] =
    useState<Subcategory | null>(null);
  const loadDashboardStats = async () => {
    const currentMonth = today().slice(0, 7);
    const previousMonthDate = new Date();
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(
      previousMonthDate.getMonth() + 1,
    ).padStart(2, "0")}`;
    const [monthRow, previousMonthRow, todayRow, countRow, topRow] = await Promise.all([
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expenseDate LIKE ?",
        [`${currentMonth}%`],
      ),
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expenseDate LIKE ?",
        [`${previousMonth}%`],
      ),
      db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expenseDate = ?",
        [today()],
      ),
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM expenses",
      ),
      db.getFirstAsync<{ name: string }>(
        "SELECT c.name FROM expenses e JOIN categories c ON c.id = e.categoryId WHERE e.expenseDate LIKE ? GROUP BY e.categoryId ORDER BY SUM(e.amount) DESC LIMIT 1",
        [`${currentMonth}%`],
      ),
    ]);
    setDashboardStats({
      monthTotal: Number(monthRow?.total || 0),
      previousMonthTotal: Number(previousMonthRow?.total || 0),
      todayTotal: Number(todayRow?.total || 0),
      transactionCount: Number(countRow?.count || 0),
      topCategory: topRow?.name || "—",
    });
  };
  const refreshDashboardBudget = async () => {
    try {
      setDashboardBudget(
        await loadMonthlyBudgetSummary(db, today().slice(0, 7)),
      );
    } catch (error) {
      console.error("Failed to load dashboard budget:", error);
    }
  };
  const load = async () => {
    try {
      setCategories(
        await db.getAllAsync<Category>("SELECT * FROM categories ORDER BY id"),
      );
      setSubcategories(
        await db.getAllAsync<Subcategory>(
          "SELECT * FROM subcategories ORDER BY categoryId, id",
        ),
      );
      setExpenses(
        await db.getAllAsync<Expense>(
          "SELECT e.*, c.name as categoryName, s.name as subcategoryName, c.icon FROM expenses e JOIN categories c ON c.id = e.categoryId LEFT JOIN subcategories s ON s.id = e.subcategoryId ORDER BY e.expenseDate DESC, e.id DESC",
        ),
      );
      await loadDashboardStats();
      await refreshDashboardBudget();
      await checkBudgetNotifications(db, language);
      setDataRevision((revision) => revision + 1);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    }
  };
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        // Read the app settings after the initial data load so SQLite never
        // receives overlapping startup reads on a fresh database.
        await load();
        const settings = await db.getAllAsync<{ key: string; value: string }>(
          "SELECT key, value FROM app_settings WHERE key IN (?, ?, ?)",
          ["language", "theme", "hasSeenFeatureTour"],
        );
        if (!active) return;
        const languageSetting = settings.find(
          (item) => item.key === "language",
        );
        const themeSetting = settings.find((item) => item.key === "theme");
        const featureTourSetting = settings.find(
          (item) => item.key === "hasSeenFeatureTour",
        );
        if (languageSetting?.value === "bn") setLanguage("bn");
        if (themeSetting?.value === "dark") setDarkMode(true);
        if (featureTourSetting?.value !== "1") setFeatureTourPending(true);
        await syncScheduledReminderNotifications(
          db,
          languageSetting?.value === "bn" ? "bn" : "en",
        );
      } catch (error) {
        console.error("Failed to load app settings:", error);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const openReminderReviewFromResponse = async (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data;
      if (data?.kind !== "scheduled-reminder") return;
      const reminderId = Number(data.reminderId);
      const occurrenceDate = String(data.occurrenceDate || "");
      if (!Number.isSafeInteger(reminderId) || !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return;
      const responseKey = `${reminderId}:${occurrenceDate}`;
      if (handledReminderResponse.current === responseKey) return;
      handledReminderResponse.current = responseKey;
      const review = await loadReminderReview(db, reminderId, occurrenceDate).catch((error) => {
        console.error("Could not load reminder review:", error);
        return null;
      });
      if (!review) return;
      setMenuOpen(false);
      setScreen("scheduled");
      setReminderReview(review);
    };

    const listener = Notifications.addNotificationResponseReceivedListener((response) => {
      void openReminderReviewFromResponse(response);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then(openReminderReviewFromResponse)
      .catch((error) => console.error("Could not read initial reminder notification:", error));
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void syncScheduledReminderNotifications(db, language).catch((error) =>
          console.error("Could not refresh scheduled reminders:", error),
        );
    });
    return () => {
      listener.remove();
      appStateSubscription.remove();
    };
  }, [db, language]);
  useEffect(() => {
    if (!featureTourPending) return;
    const timer = setTimeout(
      () => setShowFeatureTour(true),
      splashVisible ? 2050 : 350,
    );
    return () => clearTimeout(timer);
  }, [featureTourPending, splashVisible]);
  const changeLanguage = async (next: "en" | "bn") => {
    setLanguage(next);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        ["language", next],
      );
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };
  const toggleDarkMode = async () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        ["theme", next ? "dark" : "light"],
      );
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };
  const finishFeatureTour = async () => {
    setShowFeatureTour(false);
    setFeatureTourPending(false);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        ["hasSeenFeatureTour", "1"],
      );
    } catch (error) {
      console.error("Failed to save feature tour state:", error);
    }
  };
  useEffect(() => {
    if (!screenMounted.current) {
      screenMounted.current = true;
      return;
    }
    pageTransition.setValue(18);
    Animated.spring(pageTransition, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 5,
    }).start();
  }, [screen]);
  const filteredExpenses = expenses.filter(
    (e) =>
      (!expenseStartDate || e.expenseDate >= dbDate(expenseStartDate)) &&
      (!expenseEndDate || e.expenseDate <= dbDate(expenseEndDate)),
  );
  const monthTotal = dashboardStats.monthTotal;
  const previousMonthTotal = dashboardStats.previousMonthTotal;
  const todayTotal = dashboardStats.todayTotal;
  const top = dashboardStats.topCategory;
  const validateAmount = (raw: string) => {
    const value = raw.trim();
    if (!value) return "পরিমাণ দিন";
    if (!/^\d+(\.\d+)?$/.test(value))
      return "টাকার পরিমাণ সঠিকভাবে লিখুন।";
    const decimalPart = value.split(".")[1];
    if (decimalPart && decimalPart.length > 2)
      return "সর্বোচ্চ ২ ঘর দশমিক ব্যবহার করুন।";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue))
      return "টাকার পরিমাণ সঠিকভাবে লিখুন।";
    if (numericValue <= 0) return "পরিমাণ অবশ্যই ০-এর বেশি হতে হবে।";
    if (numericValue > MAX_EXPENSE_AMOUNT)
      return "সর্বোচ্চ ১ কোটি টাকা পর্যন্ত amount দেওয়া যাবে।";
    return "";
  };
  const validateExpenseFields = () => {
    const nextAmountError = validateAmount(amount);
    const nextNoteError = note.length > MAX_NOTE_LENGTH
      ? "নোট সর্বোচ্চ ১২০ অক্ষরের হতে পারবে।"
      : "";
    setAmountError(nextAmountError);
    setNoteError(nextNoteError);
    return !nextAmountError && !nextNoteError;
  };
  const addExpense = async () => {
    if (savingExpenseRef.current || savingExpense || !validateExpenseFields())
      return;
    const value = Number(amount.trim());
    const isEditing = editingExpense !== null;
    savingExpenseRef.current = true;
    setSavingExpense(true);
    try {
      if (editingExpense)
        await db.runAsync(
          "UPDATE expenses SET amount = ?, categoryId = ?, subcategoryId = ?, note = ?, expenseDate = ? WHERE id = ?",
          [
            value,
            selected,
            selectedSubcategory,
            note.trim(),
            dbDate(expenseDate),
            editingExpense.id,
          ],
        );
      else
        await db.runAsync(
          "INSERT INTO expenses (amount, categoryId, subcategoryId, note, expenseDate) VALUES (?, ?, ?, ?, ?)",
          [
            value,
            selected,
            selectedSubcategory,
            note.trim(),
            dbDate(expenseDate),
          ],
        );
      setAmount("");
      setNote("");
      setAmountError("");
      setNoteError("");
      if (isEditing) {
        setExpenseDate(new Date());
        setExpenseModal(false);
      }
      setEditingExpense(null);
      await load();
    } catch (error) {
      console.error("Failed to save expense:", error);
      Alert.alert("সংরক্ষণ হয়নি", "আবার চেষ্টা করুন।");
    } finally {
      savingExpenseRef.current = false;
      setSavingExpense(false);
    }
  };
  const addReminderExpense = async (draft: ReminderExpenseDraft) => {
    if (!reminderReview || savingReminderExpense) return;
    setSavingReminderExpense(true);
    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        const existing = await tx.getFirstAsync<{ status: string }>(
          "SELECT status FROM reminder_occurrences WHERE reminderId = ? AND occurrenceDate = ?",
          [reminderReview.reminderId, reminderReview.occurrenceDate],
        );
        if (existing) throw new Error("reminder-occurrence-already-handled");
        const result = await tx.runAsync(
          "INSERT INTO expenses (amount, categoryId, subcategoryId, note, expenseDate) VALUES (?, ?, ?, ?, ?)",
          [draft.amount, draft.categoryId, draft.subcategoryId, draft.note, draft.expenseDate],
        );
        await tx.runAsync(
          `INSERT INTO reminder_occurrences
            (reminderId, occurrenceDate, status, expenseId, actedAt)
           VALUES (?, ?, 'added', ?, CURRENT_TIMESTAMP)`,
          [reminderReview.reminderId, reminderReview.occurrenceDate, result.lastInsertRowId],
        );
      });
      setReminderReview(null);
      await load();
      await syncScheduledReminderNotifications(db, language);
    } catch (error) {
      console.error("Failed to save reminder expense:", error);
      Alert.alert(
        language === "en" ? "Expense not saved" : "খরচ সেভ হয়নি",
        language === "en" ? "Please try again." : "আবার চেষ্টা করুন।",
      );
    } finally {
      setSavingReminderExpense(false);
    }
  };
  const skipReminderOccurrence = async () => {
    if (!reminderReview) return;
    try {
      await markReminderOccurrence(
        db,
        reminderReview.reminderId,
        reminderReview.occurrenceDate,
        "skipped",
      );
      setReminderReview(null);
      await syncScheduledReminderNotifications(db, language);
    } catch (error) {
      console.error("Could not skip reminder occurrence:", error);
    }
  };
  const closeReminderReview = () => {
    setReminderReview(null);
    handledReminderResponse.current = null;
    void Notifications.clearLastNotificationResponseAsync();
  };
  const addCategory = async () => {
    if (savingCategoryRef.current || savingCategory) return;
    const name = newCategory.trim();
    const savedName =
      editingCategory &&
      translateText(editingCategory.name, language).trim() === name
        ? editingCategory.name
        : name;
    if (!name) {
      setCategoryError("ক্যাটাগরির নাম দিন।");
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      setCategoryError("ক্যাটাগরির নাম সর্বোচ্চ ৩২ অক্ষরের হতে পারবে।");
      return;
    }
    if (
      categories.some(
        (category) =>
          category.id !== editingCategory?.id &&
          category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setCategoryError("এই নামে একটি ক্যাটাগরি আগে থেকেই আছে।");
      return;
    }
    setCategoryError("");
    savingCategoryRef.current = true;
    setSavingCategory(true);
    try {
      if (editingCategory) {
        await db.runAsync(
          "UPDATE categories SET name = ?, icon = ? WHERE id = ?",
          [savedName, newCategoryIcon, editingCategory.id],
        );
      } else {
        const result = await db.runAsync(
          "INSERT INTO categories (name, icon) VALUES (?, ?)",
          [name, newCategoryIcon],
        );
        await db.runAsync(
          "INSERT INTO subcategories (categoryId, name) VALUES (?, ?)",
          [result.lastInsertRowId, "General"],
        );
      }
      setNewCategory("");
      setNewCategoryIcon("sparkles-outline");
      setEditingCategory(null);
      setCategoryModal(false);
      await load();
    } catch {
      setCategoryError("এই নামে একটি ক্যাটাগরি আগে থেকেই আছে।");
    } finally {
      savingCategoryRef.current = false;
      setSavingCategory(false);
    }
  };
  const addSubcategory = async () => {
    if (savingSubcategoryRef.current || savingSubcategory) return;
    const name = newSubcategory.trim();
    const savedName =
      editingSubcategory &&
      translateText(editingSubcategory.name, language).trim() === name
        ? editingSubcategory.name
        : name;
    if (!name) {
      setSubcategoryError("সাব-ক্যাটাগরির নাম দিন।");
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      setSubcategoryError(
        "সাব-ক্যাটাগরির নাম সর্বোচ্চ ৩২ অক্ষরের হতে পারবে।",
      );
      return;
    }
    if (
      subcategories.some(
        (subcategory) =>
          subcategory.id !== editingSubcategory?.id &&
          subcategory.categoryId === subcategoryParent &&
          subcategory.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setSubcategoryError(
        "এই category-তে এই নামে subcategory আগে থেকেই আছে।",
      );
      return;
    }
    setSubcategoryError("");
    savingSubcategoryRef.current = true;
    setSavingSubcategory(true);
    try {
      if (editingSubcategory) {
        await db.runAsync(
          "UPDATE subcategories SET name = ? WHERE id = ?",
          [savedName, editingSubcategory.id],
        );
      } else {
        const result = await db.runAsync(
          "INSERT INTO subcategories (categoryId, name) VALUES (?, ?)",
          [subcategoryParent, name],
        );
        if (subcategoryParent === selected)
          setSelectedSubcategory(result.lastInsertRowId);
      }
      setNewSubcategory("");
      setEditingSubcategory(null);
      setSubcategoryModal(false);
      await load();
    } catch {
      setSubcategoryError(
        "এই category-তে এই নামে subcategory আগে থেকেই আছে।",
      );
    } finally {
      savingSubcategoryRef.current = false;
      setSavingSubcategory(false);
    }
  };
  const deleteExpense = (id: number) => setDeleteConfirm(id);
  const performDeleteExpense = async () => {
    if (deleteConfirm === null) return;
    try {
      await db.runAsync("DELETE FROM expenses WHERE id = ?", [deleteConfirm]);
      setDeleteConfirm(null);
      await load();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      setDeleteConfirm(null);
      Alert.alert("মুছে ফেলা যায়নি", "আবার চেষ্টা করুন।");
    }
  };
  const openExpense = () => {
    setEditingExpense(null);
    setAmount("");
    setNote("");
    setAmountError("");
    setNoteError("");
    setExpenseDate(new Date());
    if (categories.length) {
      setSelected(categories[0].id);
      setSelectedSubcategory(
        subcategories.find((s) => s.categoryId === categories[0].id)?.id ||
          null,
      );
    }
    setExpenseModal(true);
  };
  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(String(expense.amount));
    setNote(expense.note || "");
    setAmountError("");
    setNoteError("");
    setSelected(expense.categoryId);
    setSelectedSubcategory(expense.subcategoryId);
    setExpenseDate(new Date(`${expense.expenseDate}T00:00:00`));
    setExpenseModal(true);
  };
  const openCategoryModal = () => {
    setEditingCategory(null);
    setNewCategory("");
    setNewCategoryIcon("sparkles-outline");
    setCategoryError("");
    setCategoryModal(true);
  };
  const openSubcategoryModal = (categoryId: number) => {
    setSubcategoryParent(categoryId);
    setEditingSubcategory(null);
    setNewSubcategory("");
    setSubcategoryError("");
    setSubcategoryModal(true);
  };
  const openEditCategory = (category: Category) => {
    setCategoryAction(null);
    setEditingCategory(category);
    setNewCategory(translateText(category.name, language));
    setNewCategoryIcon(category.icon);
    setCategoryError("");
    setCategoryModal(true);
  };
  const openEditSubcategory = (subcategory: Subcategory) => {
    setCategoryAction(null);
    setSubcategoryParent(subcategory.categoryId);
    setEditingSubcategory(subcategory);
    setNewSubcategory(translateText(subcategory.name, language));
    setSubcategoryError("");
    setSubcategoryModal(true);
  };
  const requestCategoryDelete = async (target: CategoryActionTarget) => {
    try {
      let expenseCount = 0;
      let subcategoryCount = 0;
      let categoryBudgetCount = 0;
      let reminderCount = 0;
      if (target.type === "category") {
        const expenseRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM expenses WHERE categoryId = ?",
          [target.item.id],
        );
        const subcategoryRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM subcategories WHERE categoryId = ?",
          [target.item.id],
        );
        expenseCount = Number(expenseRow?.count || 0);
        subcategoryCount = Number(subcategoryRow?.count || 0);
        const budgetRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM category_budgets WHERE categoryId = ?",
          [target.item.id],
        );
        categoryBudgetCount = Number(budgetRow?.count || 0);
        const reminderRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM scheduled_reminders WHERE categoryId = ?",
          [target.item.id],
        );
        reminderCount = Number(reminderRow?.count || 0);
      } else {
        const expenseRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM expenses WHERE subcategoryId = ?",
          [target.item.id],
        );
        expenseCount = Number(expenseRow?.count || 0);
        const reminderRow = await db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM scheduled_reminders WHERE subcategoryId = ?",
          [target.item.id],
        );
        reminderCount = Number(reminderRow?.count || 0);
      }
      setCategoryAction(null);
      setCategoryDeleteConfirm({
        type: target.type,
        id: target.item.id,
        name: target.item.name,
        expenseCount,
        subcategoryCount,
        categoryBudgetCount,
        reminderCount,
      });
    } catch (error) {
      console.error("Failed to inspect category before delete:", error);
      setCategoryAction(null);
      Alert.alert("মুছে ফেলা যায়নি", "আবার চেষ্টা করুন।");
    }
  };
  const performDeleteCategory = async () => {
    if (!categoryDeleteConfirm) return;
    const target = categoryDeleteConfirm;
    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(
          "DELETE FROM expenses WHERE " +
            (target.type === "category" ? "categoryId" : "subcategoryId") +
            " = ?",
          [target.id],
        );
        if (target.type === "category") {
          await tx.runAsync(
            "DELETE FROM reminder_occurrences WHERE reminderId IN (SELECT id FROM scheduled_reminders WHERE categoryId = ?)",
            [target.id],
          );
          await tx.runAsync("DELETE FROM scheduled_reminders WHERE categoryId = ?", [target.id]);
          await tx.runAsync("DELETE FROM budget_alerts WHERE categoryId = ?", [
            target.id,
          ]);
          await tx.runAsync("DELETE FROM category_budgets WHERE categoryId = ?", [
            target.id,
          ]);
          await tx.runAsync("DELETE FROM subcategories WHERE categoryId = ?", [
            target.id,
          ]);
          await tx.runAsync("DELETE FROM categories WHERE id = ?", [target.id]);
        } else {
          await tx.runAsync("UPDATE scheduled_reminders SET subcategoryId = NULL WHERE subcategoryId = ?", [target.id]);
          await tx.runAsync("DELETE FROM subcategories WHERE id = ?", [target.id]);
        }
      });
      if (target.type === "category") {
        setSubcategoryModal(false);
        if (selected === target.id) {
          const fallback = categories.find((category) => category.id !== target.id);
          setSelected(fallback?.id || 0);
          setSelectedSubcategory(null);
        }
      } else if (selectedSubcategory === target.id) {
        setSelectedSubcategory(null);
      }
      setCategoryDeleteConfirm(null);
      await load();
      await syncScheduledReminderNotifications(db, language);
    } catch (error) {
      console.error("Failed to delete category or subcategory:", error);
      setCategoryDeleteConfirm(null);
      Alert.alert("মুছে ফেলা যায়নি", "আবার চেষ্টা করুন।");
    }
  };
  const clearAllData = () => setClearDataConfirm(true);
  const performClearAllData = async () => {
    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync("DELETE FROM expenses");
        await tx.runAsync("DELETE FROM budget_alerts");
        await tx.runAsync("DELETE FROM category_budgets");
        await tx.runAsync("DELETE FROM monthly_budgets");
        await tx.runAsync("DELETE FROM reminder_occurrences");
        await tx.runAsync("DELETE FROM scheduled_reminders");
        await tx.runAsync("DELETE FROM subcategories");
        await tx.runAsync("DELETE FROM categories");
        await tx.runAsync(
          "DELETE FROM app_settings WHERE key IN ('demoDataSeeded', 'scheduledReminderPermissionAsked')",
        );
        for (const [name, icon] of defaults) {
          const result = await tx.runAsync(
            "INSERT INTO categories (name, icon) VALUES (?, ?)",
            [name, icon],
          );
          for (const subcategory of defaultSubcategories[name] || ["General"])
            await tx.runAsync(
              "INSERT INTO subcategories (categoryId, name) VALUES (?, ?)",
              [result.lastInsertRowId, subcategory],
            );
        }
      });
      setAmount("");
      setNote("");
      setSelected(1);
      setSelectedSubcategory(null);
      setNewCategory("");
      setNewSubcategory("");
      setClearDataConfirm(false);
      setSettingsModal(false);
      await load();
      await syncScheduledReminderNotifications(db, language);
    } catch (error) {
      console.error("Failed to clear data:", error);
      Alert.alert("ডেটা মুছতে পারিনি", "আবার চেষ্টা করুন।");
    }
  };
  const seedDemoData = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      const demoSetting = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = ?",
        ["demoDataSeeded"],
      );
      // Version the screenshot dataset so an older sparse dataset can be upgraded
      // without forcing the developer to reinstall the app.
      if (demoSetting?.value === "2") {
        Alert.alert("Demo data আগে থেকেই আছে");
        return;
      }
      const demoCategories = await db.getAllAsync<Category>(
        "SELECT * FROM categories ORDER BY id",
      );
      const demoSubcategories = await db.getAllAsync<Subcategory>(
        "SELECT * FROM subcategories ORDER BY categoryId, id",
      );
      if (!demoCategories.length) return;
      const now = new Date();
      const currentDay = now.getDate();
      const demoDateKeys = new Set<string>();
      const addDemoDate = (year: number, month: number, day: number) => {
        const date = new Date(year, month, day);
        if (date <= now) demoDateKeys.add(dbDate(date));
      };

      // Keep the older months lightweight, but make August complete for
      // calendar/chart screenshots.
      const sparseDays = [2, 6, 10, 14, 18, 24, 28];
      for (let monthOffset = 5; monthOffset >= 1; monthOffset -= 1) {
        const year = now.getFullYear();
        const month = now.getMonth() - monthOffset;
        const lastDay = new Date(year, month + 1, 0).getDate();
        sparseDays
          .filter((day) => day <= lastDay)
          .forEach((day) => addDemoDate(year, month, day));
      }

      const augustYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      const augustLastDay = new Date(augustYear, 8, 0).getDate();
      for (let day = 1; day <= augustLastDay; day += 1)
        addDemoDate(augustYear, 7, day);

      // Current month: every date from the 1st up to today.
      for (let day = 1; day <= currentDay; day += 1)
        addDemoDate(now.getFullYear(), now.getMonth(), day);

      const existingDates = new Set(
        (
          await db.getAllAsync<{ expenseDate: string }>(
            "SELECT expenseDate FROM expenses",
          )
        ).map((expense) => expense.expenseDate),
      );
      const demoDates = Array.from(demoDateKeys).sort();
      let entryIndex = 0;
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (const expenseDate of demoDates) {
          if (existingDates.has(expenseDate)) continue;
          const category = demoCategories[entryIndex % demoCategories.length];
          const categorySubcategories = demoSubcategories.filter(
            (subcategory) => subcategory.categoryId === category.id,
          );
          const subcategory =
            categorySubcategories[entryIndex % categorySubcategories.length];
          const amount = 180 + ((entryIndex * 211) % 1200);
          await tx.runAsync(
            "INSERT INTO expenses (amount, categoryId, subcategoryId, note, expenseDate) VALUES (?, ?, ?, ?, ?)",
            [amount, category.id, subcategory?.id || null, "", expenseDate],
          );
          entryIndex += 1;
        }
        await tx.runAsync(
          "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
          ["demoDataSeeded", "2"],
        );
      });
      await load();
      setSettingsModal(false);
    } catch (error) {
      console.error("Failed to seed demo data:", error);
      Alert.alert("Demo data যোগ করা যায়নি", "আবার চেষ্টা করুন।");
    } finally {
      setDemoLoading(false);
    }
  };
  const categoryDeleteMessage = (() => {
    if (!categoryDeleteConfirm) return "";
    const { expenseCount, subcategoryCount, categoryBudgetCount, reminderCount, type } =
      categoryDeleteConfirm;
    if (language === "en") {
      if (type === "subcategory") {
        const effects = [
          expenseCount ? `${expenseCount} expense${expenseCount === 1 ? "" : "s"} will be deleted` : "",
          reminderCount ? `${reminderCount} reminder${reminderCount === 1 ? "" : "s"} will keep running without this subcategory` : "",
        ].filter(Boolean);
        return effects.length
          ? `${effects.join("; ")}. This cannot be undone.`
          : "This subcategory has no expenses or reminders. Do you still want to delete it?";
      }
      const items = [
        expenseCount ? `${expenseCount} expense${expenseCount === 1 ? "" : "s"}` : "",
        subcategoryCount ? `${subcategoryCount} subcategor${subcategoryCount === 1 ? "y" : "ies"}` : "",
        categoryBudgetCount ? `${categoryBudgetCount} saved category budget${categoryBudgetCount === 1 ? "" : "s"}` : "",
        reminderCount ? `${reminderCount} scheduled reminder${reminderCount === 1 ? "" : "s"}` : "",
      ].filter(Boolean);
      return items.length
        ? `This will also delete ${items.join(", ")} under this category. This cannot be undone.`
        : "This category has no expenses, subcategories, budgets or reminders. Do you still want to delete it?";
    }
    if (type === "subcategory") {
      const effects = [
        expenseCount ? `${expenseCount}টি expense মুছে যাবে` : "",
        reminderCount ? `${reminderCount}টি reminder চলবে, তবে subcategory থাকবে না` : "",
      ].filter(Boolean);
      return effects.length
        ? `${effects.join("; ")}। এই কাজটি undo করা যাবে না।`
        : "এই subcategory-এর অধীনে কোনো expense বা reminder নেই। তবুও কি মুছে ফেলবেন?";
    }
    const items = [
      expenseCount ? `${expenseCount}টি expense` : "",
      subcategoryCount ? `${subcategoryCount}টি subcategory` : "",
      categoryBudgetCount ? `${categoryBudgetCount}টি category budget` : "",
      reminderCount ? `${reminderCount}টি scheduled reminder` : "",
    ].filter(Boolean);
    return items.length
      ? `এই category-এর ${items.join(", ")} মুছে যাবে। এই কাজটি undo করা যাবে না।`
      : "এই category-এর অধীনে কোনো expense, subcategory, budget বা reminder নেই। তবুও কি মুছে ফেলবেন?";
  })();
  const dashboardPalette = orbitTheme(darkMode);
  return (
    <ThemeContext.Provider value={darkMode}>
      <NativeStatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
      />
      <SafeAreaView
        edges={["left", "right", "bottom"]}
        style={[styles.safe, { backgroundColor: dashboardPalette.surface }]}
      >
        <View style={[styles.container, { backgroundColor: dashboardPalette.background }]}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              height: insets.top + ORBIT_CHROME.headerHeight,
              paddingTop: insets.top,
              backgroundColor: dashboardPalette.background,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              overflow: "hidden",
            }}
          >
            <View
              style={[
                styles.topBar,
                darkMode && darkStyles.topBar,
                { backgroundColor: "transparent", height: ORBIT_CHROME.headerHeight, marginBottom: 0 },
              ]}
            >
              <Pressable
                ref={menuTourRef}
                style={[
                  styles.topBarButton,
                  darkMode && darkStyles.topBarButton,
                  { borderWidth: 0, backgroundColor: dashboardPalette.surface, width: 35, height: 35, borderRadius: 18 },
                ]}
                onPress={() => setMenuOpen(true)}
              >
                <Ionicons
                  name="menu-outline"
                  size={22}
                  color={mintTheme(darkMode).accentText}
                />
              </Pressable>
              <View style={[styles.topBarTitle, { alignItems: "flex-start", paddingLeft: 12 }]}>
                <Text style={[styles.appName, { color: dashboardPalette.text, fontSize: 18, fontWeight: "500" }]}>
                  Daily Spend
                </Text>
              </View>
              <Pressable
                style={[
                  styles.topBarButton,
                  darkMode && darkStyles.topBarButton,
                  { borderWidth: 0, backgroundColor: dashboardPalette.surface, width: 35, height: 35, borderRadius: 18 },
                ]}
                onPress={toggleDarkMode}
              >
                <Ionicons
                  name={darkMode ? "sunny-outline" : "moon-outline"}
                  size={20}
                  color={mintTheme(darkMode).accentText}
                />
              </Pressable>
            </View>
          </View>
          <AnimatedScrollView
            style={{ transform: [{ translateX: pageTransition }] }}
            contentContainerStyle={[
              styles.content,
              { paddingTop: insets.top + ORBIT_CHROME.headerHeight + ORBIT_CHROME.contentGap },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {screen === "dashboard" && (
              <Dashboard
                expenses={expenses}
                monthTotal={monthTotal}
                previousMonthTotal={previousMonthTotal}
                todayTotal={todayTotal}
                transactionCount={dashboardStats.transactionCount}
                top={top}
                budgetSummary={dashboardBudget}
                onViewBudget={() => setScreen("budget")}
                onSetBudget={() => {
                  setOpenBudgetEditorRequested(true);
                  setScreen("budget");
                }}
                onDelete={deleteExpense}
                onEdit={openEditExpense}
                onAddExpense={openExpense}
                tourTargetRef={dashboardTourRef}
              />
            )}
            {screen === "expenses" && (
              <ExpenseHistory
                expenses={filteredExpenses}
                dark={darkMode}
                startDate={expenseStartDate}
                endDate={expenseEndDate}
                onStartDateChange={(date) => {
                  setExpenseStartDate(date);
                  if (expenseEndDate && date > expenseEndDate)
                    setExpenseEndDate(date);
                }}
                onEndDateChange={(date) => {
                  setExpenseEndDate(date);
                  if (expenseStartDate && date < expenseStartDate)
                    setExpenseStartDate(date);
                }}
                onClearDates={() => {
                  setExpenseStartDate(null);
                  setExpenseEndDate(null);
                }}
                onDelete={deleteExpense}
                onEdit={openEditExpense}
                onAddExpense={openExpense}
              />
            )}
            {screen === "categories" && (
              <CategoryScreen
                categories={categories}
                subcategories={subcategories}
                expenses={expenses}
                onAdd={openCategoryModal}
                onOpenSubcategories={openSubcategoryModal}
                onCategoryLongPress={(category) =>
                  setCategoryAction({ type: "category", item: category })
                }
              />
            )}
            {screen === "reports" && <ReportsScreen expenses={expenses} />}
            {screen === "budget" && (
              <BudgetScreen
                refreshKey={dataRevision}
                onAddExpense={openExpense}
                onBudgetSaved={refreshDashboardBudget}
                openEditorRequested={openBudgetEditorRequested}
                onEditorRequestHandled={() =>
                  setOpenBudgetEditorRequested(false)
                }
              />
            )}
            {screen === "scheduled" && (
              <ScheduledScreen
                categories={categories}
                subcategories={subcategories}
                refreshKey={dataRevision}
              />
            )}
          </AnimatedScrollView>
          <BottomNavigation screen={screen} dark={darkMode} onNavigate={setScreen}
            expensesRef={expensesNavTourRef} categoriesRef={categoryNavTourRef}
            onAddExpense={openExpense} addRef={addTourRef} />
          <Modal transparent visible={expenseModal} animationType="slide">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={[styles.modalBg, darkMode && darkStyles.modalBg]}
            >
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
                style={[
                  styles.modal,
                  darkMode && darkStyles.modal,
                  { paddingTop: 10, paddingBottom: modalBottomPadding, maxHeight: "90%", flexGrow: 0 },
                ]}
              >
                <View style={{ width: 35, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: dashboardPalette.border, marginBottom: 4 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={[styles.modalTitle, darkMode && darkStyles.modalTitle, { flex: 1, marginTop: 0, marginBottom: 0 }]}>
                    {editingExpense ? "খরচ edit করুন" : "আজকের খরচ যোগ করুন"}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={language === "en" ? "Close" : "বন্ধ করুন"}
                    hitSlop={4}
                    style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: -8 }}
                    onPress={() => setExpenseModal(false)}
                  >
                    <Ionicons name="close" size={24} color={dashboardPalette.muted} />
                  </Pressable>
                </View>
                <Text style={[styles.label, darkMode && darkStyles.label, { textAlign: "center", fontSize: 11, marginTop: 0, marginBottom: 0 }]}>
                  টাকার পরিমাণ
                </Text>
                <CenteredAmountInput
                  style={[
                    styles.input,
                    darkMode && darkStyles.input,
                    { backgroundColor: "transparent", borderWidth: 0, textAlign: "center", fontSize: 30, height: 60, paddingVertical: 0, marginBottom: 4, fontFamily: "DMSans-500", fontWeight: "normal", includeFontPadding: false },
                    amountError && styles.inputError,
                    amountError && darkMode && darkStyles.inputError,
                  ]}
                  value={amount}
                  onChangeText={(value) => {
                    setAmount(value);
                    if (amountError) setAmountError("");
                  }}
                  placeholder="0"
                  accessibilityLabel={language === "en" ? "Amount" : "টাকার পরিমাণ"}
                  placeholderTextColor={darkMode ? "#b9b2a4" : "#706b61"}
                  keyboardType="numeric"
                  autoFocus
                />
                {amountError ? (
                  <Text style={[styles.inputErrorText, darkMode && darkStyles.inputErrorText]}>
                    {amountError}
                  </Text>
                ) : null}
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  ক্যাটাগরি
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chips}
                >
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setSelected(c.id);
                        setSelectedSubcategory(
                          subcategories.find((s) => s.categoryId === c.id)
                            ?.id || null,
                        );
                      }}
                      style={[
                        styles.chip,
                        darkMode && darkStyles.chip,
                        selected === c.id &&
                          (darkMode
                            ? darkStyles.chipActive
                            : styles.chipActive),
                      ]}
                    >
                      <View style={styles.chipContent}>
                        <CategoryIcon
                          icon={c.icon}
                          size={16}
                          color={selected === c.id ? "#fff" : dashboardPalette.text}
                        />
                        <Text
                          style={{ color: selected === c.id ? "#fff" : dashboardPalette.text, fontSize: 12 }}
                        >
                          {c.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  সাব-ক্যাটাগরি
                </Text>
                <View
                  style={[
                    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={[styles.chips, { flex: 1 }]}
                    contentContainerStyle={styles.subcategorySurfaceContent}
                  >
                  {subcategories
                    .filter((s) => s.categoryId === selected)
                    .map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => setSelectedSubcategory(s.id)}
                        onLongPress={() =>
                          setCategoryAction({ type: "subcategory", item: s })
                        }
                        delayLongPress={350}
                        style={[
                          styles.chip,
                          darkMode && darkStyles.chip,
                          selectedSubcategory === s.id &&
                            (darkMode
                              ? darkStyles.chipActive
                              : styles.chipActive),
                        ]}
                      >
                        <Text
                          style={{ color: selectedSubcategory === s.id ? "#fff" : dashboardPalette.text, fontSize: 12 }}
                        >
                          {s.name}
                        </Text>
                      </Pressable>
                    ))}
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="নতুন subcategory যোগ করুন"
                    onPressIn={() =>
                      Animated.spring(subcategoryScale, {
                        toValue: 0.84,
                        useNativeDriver: true,
                        speed: 20,
                        bounciness: 6,
                      }).start()
                    }
                    onPressOut={() =>
                      Animated.spring(subcategoryScale, {
                        toValue: 1,
                        useNativeDriver: true,
                        speed: 20,
                        bounciness: 6,
                      }).start()
                    }
                    onPress={() => {
                      openSubcategoryModal(selected);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: MINT,
                      marginLeft: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "center",
                      transform: [{ scale: subcategoryScale }],
                    }}
                  >
                    <Ionicons name="add" size={20} color={MINT_INK} />
                  </AnimatedPressable>
                  </ScrollView>
                </View>
                <View style={{ backgroundColor: dashboardPalette.surface, borderRadius: 13, paddingHorizontal: 12, marginTop: 12 }}>
<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={[styles.label, darkMode && darkStyles.label, { width: 48, fontSize: 12 }]}>তারিখ</Text>
                <Pressable
                  style={[styles.dateButton, darkMode && darkStyles.dateButton, { flex: 1, backgroundColor: "transparent", paddingHorizontal: 0 }]}
                  onPress={() => setDatePickerOpen(true)}
                >
                  <Text
                    style={[
                      styles.dateButtonText,
                      darkMode && darkStyles.dateButtonText,
                    ]}
                  >
                    {expenseDate.toLocaleDateString(
                      language === "en" ? "en-GB" : "bn-BD",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={darkMode ? "#edc176" : PURPLE}
                  />
                </Pressable>
                </View>
                {datePickerOpen && (
                  <AppDatePicker
                    value={expenseDate}
                    onSelect={(date) => setExpenseDate(date)}
                    onClose={() => setDatePickerOpen(false)}
                  />
                )}
<View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: dashboardPalette.border }}>
                <Text style={[styles.label, darkMode && darkStyles.label, { width: 48, fontSize: 12 }]}>
                  নোট

                </Text>
                <TextInput
                  style={[
                    styles.input,
                    darkMode && darkStyles.input,
                    { flex: 1, backgroundColor: "transparent", paddingHorizontal: 0, fontSize: 12 },
                    noteError && styles.inputError,
                    noteError && darkMode && darkStyles.inputError,
                  ]}
                  value={note}
                  onChangeText={(value) => {
                    setNote(value);
                    if (noteError) setNoteError("");
                  }}
                  maxLength={MAX_NOTE_LENGTH}
                  placeholder={
                    language === "en"
                      ? "e.g. lunch at the office"
                      : "যেমন: অফিসে দুপুরের খাবার"
                  }
                  placeholderTextColor={darkMode ? "#b9b2a4" : "#706b61"}
                />
                </View>
                {noteError ? (
                  <Text style={[styles.inputErrorText, darkMode && darkStyles.inputErrorText]}>
                    {noteError}
                  </Text>
                ) : null}
                </View>
                <AnimatedPressable
                  style={[
                    styles.primary, darkMode && darkStyles.primary,
                    savingExpense && styles.primaryDisabled,
                    { transform: [{ scale: saveScale }] },
                  ]}
                  disabled={savingExpense}
                  onPressIn={() =>
                    Animated.spring(saveScale, {
                      toValue: 0.96,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(saveScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPress={addExpense}
                >
                  {savingExpense ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.primaryText, darkMode && darkStyles.primaryText]}>
                      {editingExpense ? "পরিবর্তন সেভ করুন" : "খরচ সেভ করুন"}
                    </Text>
                  )}
                </AnimatedPressable>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
          <Modal transparent visible={categoryModal} animationType="slide">
            <View style={[styles.modalBg, darkMode && darkStyles.modalBg]}>
              <View
                style={[
                  styles.modal,
                  darkMode && darkStyles.modal,
                  { paddingBottom: modalBottomPadding },
                ]}
              >
                <Pressable
                  style={styles.close}
                  onPress={() => setCategoryModal(false)}
                >
                  <Text
                    style={[styles.closeText, darkMode && darkStyles.closeText]}
                  >
                    ×
                  </Text>
                </Pressable>
                <Text style={[styles.eyebrow, darkMode && darkStyles.eyebrow]}>
                  নিজের মতো সাজান
                </Text>
                <Text
                  style={[styles.modalTitle, darkMode && darkStyles.modalTitle]}
                >
                  {editingCategory ? "ক্যাটাগরি এডিট করুন" : "নতুন ক্যাটাগরি"}
                </Text>
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  ক্যাটাগরির নাম
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    darkMode && darkStyles.input,
                    categoryError && styles.inputError,
                    categoryError && darkMode && darkStyles.inputError,
                  ]}
                  value={newCategory}
                  onChangeText={(value) => {
                    setNewCategory(value);
                    if (categoryError) setCategoryError("");
                  }}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={
                    language === "en" ? "e.g. Education" : "যেমন: শিক্ষা"
                  }
                  placeholderTextColor={darkMode ? "#b9b2a4" : "#706b61"}
                  autoFocus
                />
                {categoryError ? (
                  <Text style={[styles.inputErrorText, darkMode && darkStyles.inputErrorText]}>
                    {categoryError}
                  </Text>
                ) : null}
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  একটি icon বেছে নিন
                </Text>
                <View style={styles.iconGrid}>
                  {categoryIcons.map((icon) => (
                    <Pressable
                      key={icon}
                      onPress={() => setNewCategoryIcon(icon)}
                      style={[
                        styles.iconChoice,
                        darkMode && {
                          backgroundColor: MINT_MODAL_SURFACE,
                          borderColor: "#454035",
                        },
                        newCategoryIcon === icon &&
                          (darkMode
                            ? {
                                backgroundColor: "#48391f",
                                borderColor: "#dfa43e",
                              }
                            : styles.iconChoiceActive),
                      ]}
                    >
                      <CategoryIcon
                        icon={icon}
                        size={22}
                        color={darkMode ? "#edc176" : PURPLE}
                      />
                    </Pressable>
                  ))}
                </View>
                <AnimatedPressable
                  style={[
                    styles.primary, darkMode && darkStyles.primary,
                    savingCategory && styles.primaryDisabled,
                    { transform: [{ scale: categoryAddScale }] },
                  ]}
                  disabled={savingCategory}
                  onPressIn={() =>
                    Animated.spring(categoryAddScale, {
                      toValue: 0.96,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(categoryAddScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPress={addCategory}
                >
                  {savingCategory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.primaryText, darkMode && darkStyles.primaryText]}>
                      {editingCategory ? "পরিবর্তন সেভ করুন" : "ক্যাটাগরি যোগ করুন"}
                    </Text>
                  )}
                </AnimatedPressable>
              </View>
            </View>
          </Modal>
          <Modal transparent visible={subcategoryModal} animationType="slide">
            <View style={[styles.modalBg, darkMode && darkStyles.modalBg]}>
              <View
                style={[
                  styles.modal,
                  darkMode && darkStyles.modal,
                  { paddingBottom: modalBottomPadding },
                ]}
              >
                <Pressable
                  style={styles.close}
                  onPress={() => setSubcategoryModal(false)}
                >
                  <Text
                    style={[styles.closeText, darkMode && darkStyles.closeText]}
                  >
                    ×
                  </Text>
                </Pressable>
                <View style={styles.modalCategoryHeading}>
                  <CategoryIcon
                    icon={
                      categories.find((c) => c.id === subcategoryParent)
                        ?.icon || "sparkles-outline"
                    }
                    size={18}
                    color={darkMode ? "#edc176" : PURPLE}
                  />
                  <Text
                    style={[styles.eyebrow, darkMode && darkStyles.eyebrow]}
                  >
                    {categories.find((c) => c.id === subcategoryParent)?.name}
                  </Text>
                </View>
                <Text
                  style={[styles.modalTitle, darkMode && darkStyles.modalTitle]}
                >
                  {editingSubcategory
                    ? "Subcategory edit করুন"
                    : "Subcategory manage করুন"}
                </Text>
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  Existing subcategory
                </Text>
                <Text style={[styles.muted, darkMode && darkStyles.muted]}>
                  Tag-এ long press করে edit বা delete করুন
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {subcategories
                    .filter((s) => s.categoryId === subcategoryParent)
                    .map((s) => (
                      <Pressable
                        key={s.id}
                        style={{
                          backgroundColor: darkMode ? "#454035" : "#f7ead0",
                          borderRadius: 18,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                        onLongPress={() =>
                          setCategoryAction({ type: "subcategory", item: s })
                        }
                        delayLongPress={350}
                      >
                        <Text
                          style={{
                            color: darkMode ? "#f5f0e6" : PURPLE,
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                        >
                          {s.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>
                <Text style={[styles.label, darkMode && darkStyles.label]}>
                  {editingSubcategory ? "Subcategory-এর নাম" : "নতুন subcategory"}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    darkMode && darkStyles.input,
                    subcategoryError && styles.inputError,
                    subcategoryError && darkMode && darkStyles.inputError,
                  ]}
                  value={newSubcategory}
                  onChangeText={(value) => {
                    setNewSubcategory(value);
                    if (subcategoryError) setSubcategoryError("");
                  }}
                  maxLength={MAX_NAME_LENGTH}
                  placeholder={
                    language === "en" ? "e.g. Breakfast" : "যেমন: Breakfast"
                  }
                  placeholderTextColor={darkMode ? "#b9b2a4" : "#706b61"}
                  autoFocus
                />
                {subcategoryError ? (
                  <Text style={[styles.inputErrorText, darkMode && darkStyles.inputErrorText]}>
                    {subcategoryError}
                  </Text>
                ) : null}
                <AnimatedPressable
                  style={[
                    styles.primary, darkMode && darkStyles.primary,
                    savingSubcategory && styles.primaryDisabled,
                    { transform: [{ scale: subcategoryAddScale }] },
                  ]}
                  disabled={savingSubcategory}
                  onPressIn={() =>
                    Animated.spring(subcategoryAddScale, {
                      toValue: 0.96,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(subcategoryAddScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      speed: 20,
                      bounciness: 6,
                    }).start()
                  }
                  onPress={addSubcategory}
                >
                  {savingSubcategory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.primaryText, darkMode && darkStyles.primaryText]}>
                      {editingSubcategory ? "পরিবর্তন সেভ করুন" : "＋ যোগ করুন"}
                    </Text>
                  )}
                </AnimatedPressable>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={categoryAction !== null}
            animationType="fade"
            onRequestClose={() => setCategoryAction(null)}
          >
            <View style={[styles.modalBg, darkMode && darkStyles.modalBg]}>
              <View
                style={[
                  styles.modal,
                  darkMode && darkStyles.modal,
                  { paddingBottom: Math.max(28, insets.bottom + 20) },
                ]}
              >
                <Pressable
                  style={styles.close}
                  onPress={() => setCategoryAction(null)}
                >
                  <Text
                    style={[styles.closeText, darkMode && darkStyles.closeText]}
                  >
                    ×
                  </Text>
                </Pressable>
                <Text style={[styles.eyebrow, darkMode && darkStyles.eyebrow]}>
                  {categoryAction?.type === "category"
                    ? "ক্যাটাগরি"
                    : "সাব-ক্যাটাগরি"}
                </Text>
                <Text
                  style={[styles.modalTitle, darkMode && darkStyles.modalTitle]}
                  numberOfLines={2}
                >
                  {categoryAction?.item.name}
                </Text>
                <Pressable
                  style={{
                    backgroundColor: darkMode ? "#454035" : "#efebe2",
                    borderRadius: 13,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                  onPress={() => {
                    const action = categoryAction;
                    if (!action) return;
                    if (action.type === "category") openEditCategory(action.item);
                    else openEditSubcategory(action.item);
                  }}
                >
                  <Ionicons
                    name="create-outline"
                    size={21}
                    color={darkMode ? "#edc176" : PURPLE}
                  />
                  <Text style={[styles.rowTitle, darkMode && darkStyles.rowTitle]}>
                    এডিট করুন
                  </Text>
                </Pressable>
                <Pressable
                  style={{
                    marginTop: 10,
                    backgroundColor: darkMode ? "#38242a" : "#fff3f3",
                    borderColor: "#df5f65",
                    borderWidth: 1,
                    borderRadius: 13,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                  onPress={() => {
                    const action = categoryAction;
                    if (action) requestCategoryDelete(action);
                  }}
                >
                  <Ionicons name="trash-outline" size={21} color="#df5f65" />
                  <Text style={{ color: "#df5f65", fontSize: 14, fontWeight: "600" }}>
                    মুছে ফেলুন
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={settingsModal}
            animationType="slide"
            onRequestClose={() => setSettingsModal(false)}
          >
            <View style={[styles.modalBg, darkMode && darkStyles.modalBg]}>
              <View
                style={[
                  styles.modal,
                  darkMode && darkStyles.modal,
                  darkMode && {
                    backgroundColor: MINT_MODAL_SURFACE,
                    borderWidth: 1,
                    borderColor: "#454035",
                  },
                  { paddingBottom: modalBottomPadding },
                ]}
              >
                <Pressable
                  style={styles.close}
                  onPress={() => setSettingsModal(false)}
                >
                  <Text
                    style={[styles.closeText, darkMode && darkStyles.closeText]}
                  >
                    ×
                  </Text>
                </Pressable>
                <Text style={[styles.eyebrow, darkMode && darkStyles.eyebrow]}>
                  অ্যাপ সেটিংস
                </Text>
                <Text
                  style={[styles.modalTitle, darkMode && darkStyles.modalTitle]}
                >
                  {language === "en" ? "Settings" : "সেটিংস"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 14,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <Ionicons
                      name="color-palette-outline"
                      size={20}
                      color={darkMode ? "#edc176" : PURPLE}
                    />
                    <View>
                    <Text
                      style={[styles.rowTitle, darkMode && darkStyles.rowTitle]}
                    >
                      {language === "en" ? "Appearance" : "থিম"}
                    </Text>
                    <Text style={[styles.muted, darkMode && darkStyles.muted]}>
                      {language === "en" ? "Light or dark mode" : "লাইট বা ডার্ক মোড"}
                    </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[
                      styles.themeToggle,
                      darkMode && darkStyles.themeToggle,
                    ]}
                    onPress={toggleDarkMode}
                  >
                    <Text
                      style={[
                        styles.themeToggleText,
                        darkMode && darkStyles.themeToggleText,
                      ]}
                    >
                      {darkMode ? "☀ Dark" : "☾ Light"}
                    </Text>
                  </Pressable>
                </View>
                <View style={styles.settingsRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <Ionicons
                      name="language-outline"
                      size={20}
                      color={darkMode ? "#edc176" : PURPLE}
                    />
                    <View>
                    <Text
                      style={[styles.rowTitle, darkMode && darkStyles.rowTitle]}
                    >
                      {language === "en" ? "Language" : "ভাষা"}
                    </Text>
                    <Text style={[styles.muted, darkMode && darkStyles.muted]}>
                      {language === "en" ? "Choose app language" : "অ্যাপের ভাষা বেছে নিন"}
                    </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.languageToggle,
                      darkMode && darkStyles.languageToggle,
                    ]}
                  >
                    <Pressable
                      style={[
                        styles.languageOption,
                        darkMode && darkStyles.languageOption,
                        language === "en" &&
                          (darkMode
                            ? darkStyles.languageOptionActive
                            : styles.languageOptionActive),
                      ]}
                      onPress={() => changeLanguage("en")}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          darkMode && darkStyles.languageOptionText,
                          language === "en" &&
                            (darkMode
                              ? darkStyles.languageOptionActiveText
                              : styles.languageOptionActiveText),
                        ]}
                      >
                        EN
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.languageOption,
                        darkMode && darkStyles.languageOption,
                        language === "bn" &&
                          (darkMode
                            ? darkStyles.languageOptionActive
                            : styles.languageOptionActive),
                      ]}
                      onPress={() => changeLanguage("bn")}
                    >
                      <Text
                        style={[
                          styles.languageOptionText,
                          darkMode && darkStyles.languageOptionText,
                          language === "bn" &&
                            (darkMode
                              ? darkStyles.languageOptionActiveText
                              : styles.languageOptionActiveText),
                        ]}
                      >
                        বাংলা
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.settingsRow,
                    { opacity: pressed ? 0.72 : 1 },
                  ]}
                  onPress={() => {
                    setSettingsModal(false);
                    setBackupModal(true);
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <Ionicons
                      name="cloud-download-outline"
                      size={20}
                      color={darkMode ? "#edc176" : PURPLE}
                    />
                    <View>
                      <Text style={[styles.rowTitle, darkMode && darkStyles.rowTitle]}>
                        ডেটা ব্যাকআপ
                      </Text>
                      <Text style={[styles.muted, darkMode && darkStyles.muted]}>
                        আপনার তথ্য export বা restore করুন
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={darkMode ? "#b9b2a4" : "#706b61"}
                  />
                </Pressable>
                {__DEV__ && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="স্ক্রিনশটের জন্য demo data"
                    disabled={demoLoading}
                    style={[
                      styles.demoDataRow,
                      darkMode && darkStyles.demoDataRow,
                      demoLoading && styles.primaryDisabled,
                    ]}
                    onPress={seedDemoData}
                  >
                    <View style={styles.demoDataCopy}>
                      <Text
                        style={[styles.rowTitle, darkMode && darkStyles.rowTitle]}
                      >
                        স্ক্রিনশটের জন্য demo data
                      </Text>
                      <Text style={[styles.muted, darkMode && darkStyles.muted]}>
                        কয়েক মাসের sample expense যোগ করুন
                      </Text>
                    </View>
                    {demoLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={darkMode ? "#edc176" : PURPLE}
                      />
                    ) : (
                      <Ionicons
                        name="flask-outline"
                        size={20}
                        color={darkMode ? "#edc176" : PURPLE}
                      />
                    )}
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="সব ডেটা মুছুন"
                  style={{
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: "#df5f65",
                    borderRadius: 11,
                    padding: 13,
                    alignItems: "center",
                  }}
                  onPress={clearAllData}
                >
                  <Text
                    style={{
                      color: "#df5f65",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    সব ডেটা মুছুন
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={deleteConfirm !== null}
            animationType="fade"
            onRequestClose={() => setDeleteConfirm(null)}
          >
            <View
              style={[
                styles.modalBg,
                darkMode && darkStyles.modalBg,
                { justifyContent: "center", padding: 22 },
              ]}
            >
              <View
                style={[
                  styles.confirmModal,
                  darkMode && darkStyles.confirmModal,
                ]}
              >
                <Text
                  style={[
                    styles.confirmTitle,
                    darkMode && darkStyles.confirmTitle,
                  ]}
                >
                  খরচ মুছে ফেলবেন?
                </Text>
                <Text
                  style={[
                    styles.confirmMessage,
                    darkMode && darkStyles.confirmMessage,
                  ]}
                >
                  এই expense record আর ফিরে পাওয়া যাবে না।
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={[
                      styles.confirmCancel,
                      darkMode && darkStyles.confirmCancel,
                    ]}
                    onPress={() => setDeleteConfirm(null)}
                  >
                    <Text
                      style={[
                        styles.confirmCancelText,
                        darkMode && darkStyles.confirmCancelText,
                      ]}
                    >
                      বাতিল
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDelete}
                    onPress={performDeleteExpense}
                  >
                    <Text style={styles.confirmDeleteText}>মুছে ফেলুন</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={categoryDeleteConfirm !== null}
            animationType="fade"
            onRequestClose={() => setCategoryDeleteConfirm(null)}
          >
            <View
              style={[
                styles.modalBg,
                darkMode && darkStyles.modalBg,
                { justifyContent: "center", padding: 22 },
              ]}
            >
              <View
                style={[
                  styles.confirmModal,
                  darkMode && darkStyles.confirmModal,
                ]}
              >
                <Text
                  style={[
                    styles.confirmTitle,
                    darkMode && darkStyles.confirmTitle,
                  ]}
                >
                  {categoryDeleteConfirm?.type === "category"
                    ? "ক্যাটাগরি মুছে ফেলবেন?"
                    : "সাব-ক্যাটাগরি মুছে ফেলবেন?"}
                </Text>
                <Text
                  style={[
                    styles.confirmMessage,
                    darkMode && darkStyles.confirmMessage,
                  ]}
                >
                  {categoryDeleteConfirm
                    ? `“${categoryDeleteConfirm.name}”\n${categoryDeleteMessage}`
                    : ""}
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={[
                      styles.confirmCancel,
                      darkMode && darkStyles.confirmCancel,
                    ]}
                    onPress={() => setCategoryDeleteConfirm(null)}
                  >
                    <Text
                      style={[
                        styles.confirmCancelText,
                        darkMode && darkStyles.confirmCancelText,
                      ]}
                    >
                      বাতিল
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDelete}
                    onPress={performDeleteCategory}
                  >
                    <Text style={styles.confirmDeleteText}>মুছে ফেলুন</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={clearDataConfirm}
            animationType="fade"
            onRequestClose={() => setClearDataConfirm(false)}
          >
            <View
              style={[
                styles.modalBg,
                darkMode && darkStyles.modalBg,
                { justifyContent: "center", padding: 22 },
              ]}
            >
              <View
                style={[
                  styles.confirmModal,
                  darkMode && darkStyles.confirmModal,
                ]}
              >
                <Text
                  style={[
                    styles.confirmTitle,
                    darkMode && darkStyles.confirmTitle,
                  ]}
                >
                  সব ডেটা মুছে ফেলবেন?
                </Text>
                <Text
                  style={[
                    styles.confirmMessage,
                    darkMode && darkStyles.confirmMessage,
                  ]}
                >
                  সব expense, custom category, subcategory ও monthly budget
                  মুছে যাবে। এই কাজটি undo করা যাবে না।
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={[
                      styles.confirmCancel,
                      darkMode && darkStyles.confirmCancel,
                    ]}
                    onPress={() => setClearDataConfirm(false)}
                  >
                    <Text
                      style={[
                        styles.confirmCancelText,
                        darkMode && darkStyles.confirmCancelText,
                      ]}
                    >
                      বাতিল
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmDelete}
                    onPress={performClearAllData}
                  >
                    <Text style={styles.confirmDeleteText}>সব মুছুন</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
          <Modal
            transparent
            visible={menuOpen}
            animationType="fade"
            onRequestClose={() => setMenuOpen(false)}
          >
            <View style={styles.drawerBackdrop}>
              <Pressable
                style={styles.drawerOutside}
                onPress={() => setMenuOpen(false)}
              />
              <View style={[styles.drawer, darkMode && darkStyles.drawer]}>
                <Text
                  style={[
                    styles.drawerBrand,
                    darkMode && darkStyles.drawerBrand,
                  ]}
                >
                  {language === "en" ? "Tk Daily Spend" : "৳ Daily Spend"}
                </Text>
                <Text
                  style={[styles.drawerHint, darkMode && darkStyles.drawerHint]}
                >
                  আপনার দৈনিক হিসাব
                </Text>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "dashboard" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("dashboard");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="home-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    হোম
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "expenses" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("expenses");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    সব খরচ
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "categories" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("categories");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="pricetags-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    ক্যাটাগরি
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "reports" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("reports");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="bar-chart-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    রিপোর্ট
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "budget" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("budget");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    বাজেট
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.drawerItem,
                    darkMode && darkStyles.drawerItem,
                    screen === "scheduled" &&
                      (darkMode
                        ? darkStyles.drawerItemActive
                        : styles.drawerItemActive),
                  ]}
                  onPress={() => {
                    setScreen("scheduled");
                    setMenuOpen(false);
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    নির্ধারিত
                  </Text>
                </Pressable>
                <View
                  style={[
                    styles.drawerDivider,
                    darkMode && darkStyles.drawerDivider,
                  ]}
                />
                <Pressable
                  style={[styles.drawerItem, darkMode && darkStyles.drawerItem]}
                  onPress={() => {
                    setMenuOpen(false);
                    setSettingsModal(true);
                  }}
                >
                  <Ionicons
                    name="settings-outline"
                    size={20}
                    color={darkMode ? "#edc176" : PURPLE}
                    style={[styles.drawerItemIcon, darkMode && darkStyles.drawerItemIcon]}
                  />
                  <Text
                    style={[
                      styles.drawerItemText,
                      darkMode && darkStyles.drawerItemText,
                    ]}
                  >
                    {language === "en" ? "Settings" : "সেটিংস"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Modal>
          <ReminderReviewModal
            reminder={reminderReview}
            categories={categories}
            subcategories={subcategories}
            saving={savingReminderExpense}
            onClose={closeReminderReview}
            onAddExpense={(draft) => void addReminderExpense(draft)}
            onSkip={() => void skipReminderOccurrence()}
          />
          <BackupModal
            visible={backupModal}
            dark={darkMode}
            language={language}
            onClose={() => setBackupModal(false)}
            onRestored={async () => {
              await load();
              const restoredSettings = await db.getAllAsync<{
                key: string;
                value: string;
              }>("SELECT key, value FROM app_settings WHERE key IN (?, ?)", [
                "language",
                "theme",
              ]);
              if (restoredSettings.some((item) => item.key === "language" && item.value === "bn"))
                setLanguage("bn");
              else setLanguage("en");
              setDarkMode(
                restoredSettings.some(
                  (item) => item.key === "theme" && item.value === "dark",
                ),
              );
              await syncScheduledReminderNotifications(
                db,
                restoredSettings.some(
                  (item) => item.key === "language" && item.value === "bn",
                )
                  ? "bn"
                  : "en",
              );
            }}
          />
          <FeatureTourModal
            visible={showFeatureTour}
            onFinish={finishFeatureTour}
            targetRefs={{
              menu: menuTourRef,
              add: addTourRef,
              expenses: expensesNavTourRef,
              categories: categoryNavTourRef,
              dashboard: dashboardTourRef,
            }}
          />
        </View>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}
