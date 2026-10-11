import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mintTheme, MINT, MINT_INK, MINT_MODAL_SURFACE } from "../../theme/mint";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import {
  ThemeContext,
  DARK_MODAL_SURFACE,
  MAX_BUDGET_AMOUNT,
  PURPLE,
} from "../../theme/constants";
import { CategoryIcon } from "../../components/CategoryIcon";
import { BudgetActionButton } from "./BudgetActionButton";
import { MonthlyBudgetCard } from "./MonthlyBudgetCard";
import { BudgetEmptyState } from "./BudgetEmptyState";
import { EmptyStateAction } from "../../components/EmptyStateAction";
import { taka } from "../../utils/dates";
import { styles, darkStyles } from "../../theme/styles";
import {
  DEFAULT_BUDGET_ALERT_PREFERENCES,
  checkBudgetNotifications,
  deleteCategoryBudget,
  loadBudgetCategories,
  loadMonthlyBudget,
  requestBudgetNotificationPermission,
  saveCategoryBudget,
  saveMonthlyBudget,
  type BudgetAlertPreferences,
  type BudgetCategory,
  type CategoryBudget,
  type CategorySpend,
  type MonthlyBudget,
} from "./budgetService";

type BudgetType = "monthly" | "category";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(month: string, language: "en" | "bn") {
  const [year, value] = month.split("-").map(Number);
  return new Date(year, value - 1, 1).toLocaleDateString(
    language === "en" ? "en-GB" : "bn-BD",
    { month: "long", year: "numeric" },
  );
}

export function BudgetScreen({
  refreshKey,
  onAddExpense,
  onBudgetSaved,
  openEditorRequested,
  onEditorRequestHandled,
}: {
  refreshKey: number;
  onAddExpense: () => void;
  onBudgetSaved: () => Promise<void>;
  openEditorRequested: boolean;
  onEditorRequestHandled: () => void;
}) {
  const db = useSQLiteContext();
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonthKey);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [categories, setCategories] = useState<CategorySpend[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [budgetType, setBudgetType] = useState<BudgetType>("monthly");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingCategoryBudget, setEditingCategoryBudget] =
    useState<CategoryBudget | null>(null);
  const [amountText, setAmountText] = useState("");
  const [amountError, setAmountError] = useState("");
  const [preferences, setPreferences] = useState<BudgetAlertPreferences>(
    DEFAULT_BUDGET_ALERT_PREFERENCES,
  );
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryBudget | null>(null);
  const [notificationError, setNotificationError] = useState("");
  const [pageError, setPageError] = useState("");

  const palette = useMemo(
    () => ({
      surface: mintTheme(dark).surface,
      heroText: mintTheme(dark).heroText,
      secondary: dark ? "#36332c" : "#efebe2",
      text: dark ? "#f5f0e6" : "#181713",
      muted: dark ? "#b9b2a4" : "#706b61",
      border: dark ? "#454035" : "#e8e4db",
      green: dark ? "#edc176" : PURPLE,
      greenStrong: PURPLE,
      greenSurface: dark ? "#48391f" : "#f7ead0",
      warning: dark ? "#ffd18a" : "#98640d",
      warningSurface: dark ? "#3c3028" : "#fff4df",
      danger: dark ? "#ff9da4" : "#b52d39",
      dangerSurface: dark ? "#452a34" : "#fff0f1",
    }),
    [dark],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadMonthlyBudget(db, month);
      const allCategories = await loadBudgetCategories(db);
      setBudget(data.budget);
      setCategories(data.categories);
      setCategoryBudgets(data.categoryBudgets);
      setBudgetCategories(allCategories);
    } catch (error) {
      console.error("Failed to load budgets:", error);
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  const monthSpend = categories.reduce((sum, category) => sum + category.total, 0);
  const percentage = budget ? Math.round((monthSpend / budget.amount) * 100) : 0;
  const overBudget = Boolean(budget && monthSpend > budget.amount);
  const warning = Boolean(budget && budget.inAppWarning && percentage >= 80);
  const actualMonth = currentMonthKey();
  const title = monthTitle(month, language);
  const remaining = (budget?.amount || 0) - monthSpend;
  const displayedCategories = categories.filter((item) => item.total > 0);
  const topCategory = Math.max(...displayedCategories.map((item) => item.total), 1);

  const openEditor = (
    type: BudgetType = "monthly",
    categoryBudget: CategoryBudget | null = null,
  ) => {
    setBudgetType(type);
    setEditingCategoryBudget(categoryBudget);
    setSelectedCategoryId(
      categoryBudget?.categoryId ?? budgetCategories[0]?.id ?? null,
    );
    setAmountText(
      categoryBudget
        ? String(categoryBudget.amount)
        : type === "monthly" && budget
          ? String(budget.amount)
          : "",
    );
    setPreferences(
      categoryBudget || (type === "monthly" ? budget : null)
        ? {
            inAppWarning: (categoryBudget || budget)!.inAppWarning,
            notifyAt80: (categoryBudget || budget)!.notifyAt80,
            notifyAt100: (categoryBudget || budget)!.notifyAt100,
          }
        : DEFAULT_BUDGET_ALERT_PREFERENCES,
    );
    setAmountError("");
    setEditorVisible(true);
  };

  useEffect(() => {
    if (!openEditorRequested) return;
    openEditor("monthly");
    onEditorRequestHandled();
  }, [openEditorRequested]);

  const toggleNotificationPreference = async (
    key: "notifyAt80" | "notifyAt100",
    enabled: boolean,
  ) => {
    if (enabled) {
      try {
        const granted = await requestBudgetNotificationPermission();
        if (!granted) {
          setNotificationError(
            language === "en"
              ? "Allow notifications in device settings to receive alerts. In-app warnings will still work."
              : "Alert পেতে device settings থেকে notification অনুমতি দিন। App-এর ভেতরের সতর্কতা চালু থাকবে।",
          );
          return;
        }
        setNotificationError("");
      } catch (error) {
        console.error("Could not request budget notification permission:", error);
        setNotificationError(
          language === "en"
            ? "Could not enable notifications. In-app warnings will still work."
            : "Notification চালু করা যায়নি। App-এর ভেতরের সতর্কতা চালু থাকবে।",
        );
        return;
      }
    }
    setPreferences((current) => ({ ...current, [key]: enabled }));
  };

  const saveBudget = async () => {
    const raw = amountText.trim();
    const value = Number(raw);
    if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value) || value <= 0) {
      setAmountError("সঠিক budget amount লিখুন।");
      return;
    }
    if (value > MAX_BUDGET_AMOUNT) {
      setAmountError("Budget সর্বোচ্চ ১০০ কোটি টাকা হতে পারবে।");
      return;
    }
    if (budgetType === "category" && selectedCategoryId === null) {
      setAmountError("একটি category নির্বাচন করুন।");
      return;
    }
    setSaving(true);
    setAmountError("");
    setPageError("");
    try {
      if (budgetType === "monthly") {
        await saveMonthlyBudget(db, month, value, preferences);
      } else {
        await saveCategoryBudget(db, month, selectedCategoryId!, value, preferences);
      }
      setEditorVisible(false);
      await refresh();
      await onBudgetSaved();
      if (month === actualMonth) await checkBudgetNotifications(db, language);
    } catch (error) {
      console.error("Failed to save budget:", error);
      setAmountError("Budget save হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategoryBudget = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategoryBudget(db, month, deleteTarget.categoryId);
      setDeleteTarget(null);
      await refresh();
      await onBudgetSaved();
    } catch (error) {
      console.error("Failed to remove category budget:", error);
      setDeleteTarget(null);
      setPageError(language === "en" ? "Could not remove budget. Try again." : "বাজেট মুছতে পারিনি। আবার চেষ্টা করুন।");
    }
  };

  const switchStyle = {
    trackColor: { false: dark ? "#454035" : "#e8e4db", true: "#dfa43e" },
    thumbColor: dark ? "#f5f0e6" : "#ffffff",
    ios_backgroundColor: dark ? "#454035" : "#dfe3eb",
  } as const;

  return (
    <View>
      <View style={styles.pageIntro}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.sectionTitle, dark && darkStyles.cardTitle]}>বাজেট</Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>খরচের সীমা ঠিক করুন</Text>
        </View>
      </View>

      <View
        style={{
          minHeight: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 13,
          paddingHorizontal: 6,
          marginBottom: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "en" ? "Previous month" : "আগের মাস"}
          onPress={() => setMonth((value) => shiftMonth(value, -1))}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={20} color={palette.green} />
        </Pressable>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ color: palette.text, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
            {title}
          </Text>
          {month === actualMonth && (
            <Text style={{ color: palette.muted, fontSize: 10, marginTop: 1 }}>চলতি মাস</Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "en" ? "Next month" : "পরের মাস"}
          onPress={() => setMonth((value) => shiftMonth(value, 1))}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.green} />
        </Pressable>
      </View>

      {pageError ? (
        <View style={{ padding: 11, borderRadius: 10, backgroundColor: palette.dangerSurface, marginBottom: 11 }}>
          <Text style={{ color: palette.danger, fontSize: 12 }}>{pageError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={[styles.card, dark && darkStyles.card, { padding: 28, alignItems: "center" }]}>
          <ActivityIndicator color={palette.green} />
        </View>
      ) : (
        <MonthlyBudgetCard amount={budget?.amount ?? null} spent={monthSpend} warning={warning}
          onEdit={() => openEditor("monthly")} />
      )}

      {warning && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: overBudget ? palette.dangerSurface : palette.warningSurface }}>
          <Ionicons name={overBudget ? "alert-circle" : "warning-outline"} size={20} color={overBudget ? palette.danger : palette.warning} />
          <Text style={{ flex: 1, color: overBudget ? palette.danger : palette.warning, fontSize: 12, lineHeight: 18, fontWeight: "600" }}>
            {overBudget
              ? (language === "en" ? "You are over this month's budget." : "এই মাসের বাজেট অতিক্রম হয়েছে।")
              : (language === "en" ? "You have used at least 80% of this month's budget." : "এই মাসের বাজেটের অন্তত ৮০% খরচ হয়েছে।")}
          </Text>
        </View>
      )}

      <View style={[styles.card, dark && darkStyles.card]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>ক্যাটাগরি বাজেট</Text>
            <Text style={[styles.muted, dark && darkStyles.muted]}>নির্দিষ্ট খরচের সীমা</Text>
          </View>
          {categoryBudgets.length > 0 && <BudgetActionButton kind="add" tone="solid" label={language === "en" ? "Add" : "যোগ"}
            accessibilityLabel={language === "en" ? "Add category budget" : "ক্যাটাগরি বাজেট যোগ করুন"}
            onPress={() => openEditor("category")}
          />}
        </View>
        {categoryBudgets.length ? categoryBudgets.map((item) => {
          const ratio = item.spentAmount / item.amount;
          const itemWarning = item.inAppWarning && ratio >= 0.8;
          const itemOver = ratio > 1;
          const itemReached = ratio === 1;
          const tint = itemOver ? palette.danger : itemWarning ? palette.warning : palette.green;
          return (
            <View key={`${item.month}:${item.categoryId}`} style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 13, marginBottom: 8, borderRadius: 13, backgroundColor: palette.surface }}>
              <CategoryIcon icon={item.icon} size={17} color={palette.green} containerStyle={{ width: 35, height: 35, borderRadius: 11, backgroundColor: palette.greenSurface, alignItems: "center", justifyContent: "center" }} />
              <Pressable accessibilityRole="button" accessibilityLabel={`${language === "en" ? "Edit budget for" : "বাজেট এডিট করুন"} ${item.categoryName}`} onPress={() => openEditor("category", item)} style={{ flex: 1, minWidth: 0 }}>
                <View style={{ gap: 3 }}>
                  <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600" }} numberOfLines={1}>{item.categoryName}</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85} style={{ color: tint, fontSize: 11, fontWeight: "600" }}>{taka(item.spentAmount, language)} / {taka(item.amount, language)}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 5, backgroundColor: palette.secondary, marginTop: 7, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%`, height: "100%", borderRadius: 5, backgroundColor: itemOver ? palette.danger : MINT }} />
                </View>
                <Text style={{ color: tint, fontSize: 10, marginTop: 4 }}>
                  {itemOver
                    ? `${language === "en" ? "Over by" : "বেশি"} ${taka(item.spentAmount - item.amount, language)}`
                    : itemReached
                      ? (language === "en" ? "100% used · limit reached" : "১০০% ব্যবহৃত · সীমায় পৌঁছেছে")
                    : itemWarning
                      ? `${Math.round(ratio * 100)}% ${language === "en" ? "used · nearing limit" : "ব্যবহৃত · সীমার কাছাকাছি"}`
                      : `${language === "en" ? "Remaining" : "বাকি"} ${taka(item.amount - item.spentAmount, language)}`}
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 0, marginRight: -6 }}>
              <BudgetActionButton kind="edit" compact
                accessibilityLabel={`${language === "en" ? "Edit budget for" : "বাজেট এডিট করুন"} ${item.categoryName}`}
                onPress={() => openEditor("category", item)} />
              <BudgetActionButton kind="delete" compact
                accessibilityLabel={`${language === "en" ? "Remove" : "মুছুন"} ${item.categoryName} ${language === "en" ? "budget" : "বাজেট"}`}
                onPress={() => setDeleteTarget(item)} />
              </View>
            </View>
          );
        }) : (
          <BudgetEmptyState icon="pricetag-outline"
            message={language === "en" ? "No category budgets yet." : "এখনো কোনো ক্যাটাগরি বাজেট নেই।"}
            label={language === "en" ? "Add budget" : "বাজেট যোগ করুন"}
            accessibilityLabel={language === "en" ? "Add category budget" : "ক্যাটাগরি বাজেট যোগ করুন"}
            onAdd={() => openEditor("category")} />
        )}
      </View>

      <View style={[styles.card, dark && darkStyles.card, { marginBottom: 16 }]}>
        <View style={{ marginBottom: 9 }}>
          <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>ক্যাটাগরি অনুযায়ী খরচ</Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>এই মাসের খরচের ভাগ</Text>
        </View>
        {displayedCategories.length ? (
          displayedCategories.map((item, index) => (
            <View key={item.categoryId} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: index === displayedCategories.length - 1 ? 0 : 1, borderBottomColor: palette.border }}>
              <CategoryIcon icon={item.icon} size={17} color={palette.green} containerStyle={{ width: 34, height: 34, borderRadius: 11, backgroundColor: palette.greenSurface, alignItems: "center", justifyContent: "center" }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
                  <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600", flex: 1 }} numberOfLines={1}>{item.categoryName}</Text>
                  <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600" }}>{taka(item.total, language)}</Text>
                </View>
                <View style={{ height: 5, borderRadius: 4, backgroundColor: palette.secondary, marginTop: 7, overflow: "hidden" }}>
                  <View style={{ width: `${Math.max(3, (item.total / topCategory) * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: MINT }} />
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 19 }}>
            <Ionicons name="receipt-outline" size={25} color={palette.muted} />
            <Text style={{ color: palette.muted, fontSize: 12, marginTop: 7 }}>এই মাসে এখনো কোনো খরচ নেই।</Text>
            <EmptyStateAction label={language === "en" ? "Add expense" : "খরচ যোগ করুন"} onPress={onAddExpense} />
          </View>
        )}
      </View>

      <Modal
        transparent
        visible={editorVisible}
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => !saving && setEditorVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalBg, dark && darkStyles.modalBg]}
        >
            <View style={{ maxHeight: "90%", backgroundColor: dark ? MINT_MODAL_SURFACE : "#efebe2", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: dark ? 1 : 0, borderColor: palette.border, paddingTop: 12, paddingBottom: Math.max(35, insets.bottom + 20) }}>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: palette.text, fontSize: 20, lineHeight: 25, fontWeight: "600" }}>
                      {budgetType === "monthly" ? (budget ? "বাজেট এডিট করুন" : "মাসিক বাজেট সেট করুন") : editingCategoryBudget ? "ক্যাটাগরি বাজেট এডিট" : "ক্যাটাগরি বাজেট যোগ"}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 12, marginTop: 3 }}>{title}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={language === "en" ? "Close budget editor" : "বাজেট এডিটর বন্ধ করুন"} onPress={() => !saving && setEditorVisible(false)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", marginTop: -6, marginRight: -8 }}>
                    <Ionicons name="close" size={24} color={palette.muted} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: "row", backgroundColor: palette.secondary, padding: 4, borderRadius: 11, marginBottom: 12 }}>
                  {(["monthly", "category"] as const).map((type) => {
                    const selected = budgetType === type;
                    return (
                      <Pressable key={type} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
                        setBudgetType(type);
                        setEditingCategoryBudget(null);
                        setAmountText(type === "monthly" && budget ? String(budget.amount) : "");
                        setPreferences(type === "monthly" && budget ? { inAppWarning: budget.inAppWarning, notifyAt80: budget.notifyAt80, notifyAt100: budget.notifyAt100 } : DEFAULT_BUDGET_ALERT_PREFERENCES);
                        setAmountError("");
                      }} style={{ flex: 1, minHeight: 38, borderRadius: 8, backgroundColor: selected ? "#181713" : "transparent", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: selected ? "#fff" : palette.muted, fontSize: 11, fontWeight: "600" }}>{type === "monthly" ? "মাসিক মোট" : "ক্যাটাগরি"}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {budgetType === "category" && (
                  <View style={{ marginBottom: 11 }}>
                    <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600", marginBottom: 7 }}>ক্যাটাগরি নির্বাচন</Text>
                    {budgetCategories.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 8 }}>
                        {budgetCategories.map((item) => {
                          const selected = selectedCategoryId === item.id;
                          return (
                            <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setSelectedCategoryId(item.id)} style={{ minHeight: 38, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: selected ? palette.greenSurface : palette.surface, borderWidth: 1, borderColor: selected ? palette.green : palette.border }}>
                              <CategoryIcon icon={item.icon} size={14} color={selected ? palette.green : palette.muted} />
                              <Text style={{ color: selected ? palette.green : palette.text, fontSize: 11, fontWeight: "600" }} numberOfLines={1}>{item.name}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={{ color: palette.muted, fontSize: 11 }}>আগে একটি category তৈরি করুন।</Text>
                    )}
                  </View>
                )}

                <Text style={{ color: palette.text, fontSize: 12, fontWeight: "600", marginBottom: 6 }}>বাজেটের পরিমাণ</Text>
                <View style={{ minHeight: 48, borderWidth: 1, borderColor: amountError ? (dark ? "#ff777d" : "#ed5d66") : palette.border, borderRadius: 11, backgroundColor: palette.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 13 }}>
                  <Text style={{ color: palette.muted, fontSize: 15, fontWeight: "600", marginRight: 7 }}>{language === "en" ? "Tk" : "৳"}</Text>
                  <TextInput accessibilityLabel={language === "en" ? "Budget amount" : "বাজেটের পরিমাণ"} value={amountText} onChangeText={setAmountText} keyboardType="decimal-pad" placeholder={language === "en" ? "e.g. 8000" : "যেমন: ৮০০০"} placeholderTextColor={palette.muted} editable={!saving} style={{ flex: 1, color: palette.text, fontSize: 16, paddingVertical: 8 }} />
                </View>
                {amountError ? <Text style={{ color: dark ? "#ff8a8f" : "#a52f38", fontSize: 11, marginTop: 5 }}>{amountError}</Text> : null}

                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: palette.border }}>
                  <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: palette.border }}>
                    <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 12, fontWeight: "600" }}>অ্যাপের ভেতরের সতর্কতা</Text><Text style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>৮০% ও budget ছাড়ালে দেখাবে</Text></View>
                    <Switch {...switchStyle} value={preferences.inAppWarning} onValueChange={(value) => setPreferences((current) => ({ ...current, inAppWarning: value }))} disabled={saving} />
                  </View>
                  <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, borderBottomColor: palette.border }}>
                    <Text style={{ flex: 1, color: palette.text, fontSize: 12, fontWeight: "600" }}>৮০% হলে notification</Text>
                    <Switch {...switchStyle} value={preferences.notifyAt80} onValueChange={(value) => toggleNotificationPreference("notifyAt80", value)} disabled={saving} />
                  </View>
                  <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text style={{ flex: 1, color: palette.text, fontSize: 12, fontWeight: "600" }}>১০০% হলে notification</Text>
                    <Switch {...switchStyle} value={preferences.notifyAt100} onValueChange={(value) => toggleNotificationPreference("notifyAt100", value)} disabled={saving} />
                  </View>
                </View>
                {notificationError ? (
                  <Text style={{ color: palette.warning, fontSize: 10, lineHeight: 15, marginTop: 7 }}>
                    {notificationError}
                  </Text>
                ) : null}
              </ScrollView>
              <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                <Pressable accessibilityRole="button" onPress={saveBudget} disabled={saving} style={({ pressed }) => ({ minHeight: 48, backgroundColor: mintTheme(dark).primary, borderRadius: 22, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", opacity: pressed || saving ? 0.78 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}>
                  {saving ? <ActivityIndicator size="small" color={mintTheme(dark).primaryText} /> : <Ionicons name="checkmark" size={18} color={mintTheme(dark).primaryText} />}
                  <Text style={{ color: mintTheme(dark).primaryText, fontSize: 14, fontWeight: "600" }}>{saving ? "সেভ হচ্ছে…" : "বাজেট সেভ করুন"}</Text>
                </Pressable>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={deleteTarget !== null} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 22, backgroundColor: dark ? "#10121acc" : "#20223588" }}>
          <View style={{ backgroundColor: dark ? DARK_MODAL_SURFACE : "#fff", borderWidth: 1, borderColor: palette.border, borderRadius: 18, padding: 20 }}>
            <Text style={{ color: palette.text, fontSize: 18, fontWeight: "600" }}>ক্যাটাগরি বাজেট মুছে ফেলবেন?</Text>
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
              {deleteTarget ? `“${deleteTarget.categoryName}” ${title}-এর বাজেট মুছে যাবে। Expense data মুছবে না।` : ""}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 }}>
              <Pressable onPress={() => setDeleteTarget(null)} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 12 }}><Text style={{ color: palette.muted, fontWeight: "600" }}>বাতিল</Text></Pressable>
              <Pressable onPress={confirmDeleteCategoryBudget} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 14, borderRadius: 10, backgroundColor: palette.dangerSurface }}><Text style={{ color: palette.danger, fontWeight: "600" }}>বাজেট মুছুন</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
