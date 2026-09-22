import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext, CARD_RADIUS, PURPLE } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { Expense } from "../../types/models";
import { taka } from "../../utils/dates";
import { AnimatedTotal } from "../../components/AnimatedTotal";
import { CategoryIcon } from "../../components/CategoryIcon";
import { EmptyState } from "../../components/ExpenseList";
import { YearlyTrendChart } from "./YearlyTrendChart";

function chartAmount(value: number, language: "en" | "bn") {
  const currency = language === "en" ? "Tk " : "৳";
  return value >= 1000
    ? `${currency}${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : `${currency}${Math.round(value)}`;
}

export function ReportsScreen({ expenses }: { expenses: Expense[] }) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const reportEntrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reportEntrance.setValue(0);
    Animated.timing(reportEntrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [period, reportEntrance, selectedDate]);
  const reportCardStyle = {
    opacity: reportEntrance,
    transform: [
      {
        translateY: reportEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };
  const reportAmbientMotion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(reportAmbientMotion, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(reportAmbientMotion, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reportAmbientMotion]);
  const reportGlowOneFloat = reportAmbientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });
  const reportGlowTwoScale = reportAmbientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const reportGlowThreeFloat = reportAmbientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 7],
  });
  const reportGlowFourScale = reportAmbientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 0.9],
  });
  const locale = language === "en" ? "en-US" : "bn-BD";
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const yearKey = String(year);
  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth();

  const periodExpenses = useMemo(
    () =>
      expenses.filter((expense) =>
        period === "month"
          ? expense.expenseDate.startsWith(monthKey)
          : expense.expenseDate.startsWith(yearKey),
      ),
    [expenses, monthKey, period, yearKey],
  );
  const expenseTotalsByDate = useMemo(
    () =>
      expenses.reduce<Record<string, number>>((totals, expense) => {
        totals[expense.expenseDate] =
          (totals[expense.expenseDate] || 0) + expense.amount;
        return totals;
      }, {}),
    [expenses],
  );
  const expenseTotalsByMonth = useMemo(
    () =>
      expenses.reduce<Record<string, number>>((totals, expense) => {
        const key = expense.expenseDate.slice(0, 7);
        totals[key] = (totals[key] || 0) + expense.amount;
        return totals;
      }, {}),
    [expenses],
  );
  const expenseTotalsByYear = useMemo(
    () =>
      expenses.reduce<Record<string, number>>((totals, expense) => {
        const key = expense.expenseDate.slice(0, 4);
        totals[key] = (totals[key] || 0) + expense.amount;
        return totals;
      }, {}),
    [expenses],
  );
  const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const previousDate = new Date(year, month, 1);
  if (period === "month") previousDate.setMonth(previousDate.getMonth() - 1);
  else previousDate.setFullYear(previousDate.getFullYear() - 1);
  const previousKey =
    period === "month"
      ? `${previousDate.getFullYear()}-${String(
          previousDate.getMonth() + 1,
        ).padStart(2, "0")}`
      : String(previousDate.getFullYear());
  const previousTotal =
    period === "month"
      ? expenseTotalsByMonth[previousKey] || 0
      : expenseTotalsByYear[previousKey] || 0;
  const periodDays =
    period === "month"
      ? isCurrentMonth
        ? new Date().getDate()
        : new Date(year, month + 1, 0).getDate()
      : 12;
  const average = periodDays ? total / periodDays : 0;
  const chartItems = useMemo(() => {
    if (period === "year") {
      return Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, "0")}`;
        return {
          label: new Date(year, index, 1).toLocaleDateString(locale, {
            month: "short",
          }),
          value: expenseTotalsByMonth[key] || 0,
        };
      });
    }
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const key = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
      return {
        label: String(index + 1),
        value: expenseTotalsByDate[key] || 0,
      };
    });
  }, [expenseTotalsByDate, expenseTotalsByMonth, locale, month, monthKey, period, year]);
  const chartMax = Math.max(...chartItems.map((item) => item.value), 1);
  const categoryTotals = Object.entries(
    periodExpenses.reduce<Record<string, { amount: number; icon: string }>>(
      (summary, expense) => {
        const current = summary[expense.categoryName] || {
          amount: 0,
          icon: expense.icon,
        };
        summary[expense.categoryName] = {
          amount: current.amount + expense.amount,
          icon: current.icon,
        };
        return summary;
      },
      {},
    ),
  )
    .sort(([, first], [, second]) => second.amount - first.amount)
    .slice(0, 5);
  const change = previousTotal
    ? Math.round(Math.abs(((total - previousTotal) / previousTotal) * 100))
    : 0;
  const periodLabel =
    period === "month"
      ? selectedDate.toLocaleDateString(locale, {
          month: "long",
          year: "numeric",
        })
      : selectedDate.toLocaleDateString(locale, { year: "numeric" });

  const shiftPeriod = (direction: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(1);
      if (period === "month") next.setMonth(next.getMonth() + direction);
      else next.setFullYear(next.getFullYear() + direction);
      return next;
    });
  };

  return (
    <>
      <View style={[styles.pageIntro, { marginBottom: 12 }]}>
        <View>
          <Text style={[styles.sectionTitle, dark && darkStyles.cardTitle]}>
            রিপোর্ট
          </Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>
            {period === "month"
              ? "মাস অনুযায়ী খরচ দেখুন"
              : "বছর অনুযায়ী খরচ দেখুন"}
          </Text>
        </View>
      </View>

      <View style={[styles.reportToggle, dark && darkStyles.reportToggle]}>
        {([
          ["month", "মাসিক"],
          ["year", "বার্ষিক"],
        ] as const).map(([key, label]) => (
          <Pressable
            key={key}
            style={[
              styles.reportToggleOption,
              period === key && styles.reportToggleOptionActive,
              period === key && dark && darkStyles.reportToggleOptionActive,
            ]}
            onPress={() => setPeriod(key)}
          >
            <Text
              style={[
                styles.reportToggleText,
                dark && darkStyles.reportToggleText,
                period === key && styles.reportToggleTextActive,
                period === key && dark && darkStyles.reportToggleTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.reportPeriod, dark && darkStyles.reportPeriod]}>
        <Pressable
          accessibilityLabel="পূর্ববর্তী সময়"
          onPress={() => shiftPeriod(-1)}
          style={styles.reportArrowButton}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={dark ? "#a8e6bd" : PURPLE}
          />
        </Pressable>
        <Text style={[styles.reportPeriodText, dark && darkStyles.reportPeriodText]}>
          {periodLabel}
        </Text>
        <Pressable
          accessibilityLabel="পরবর্তী সময়"
          onPress={() => shiftPeriod(1)}
          style={styles.reportArrowButton}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={dark ? "#a8e6bd" : PURPLE}
          />
        </Pressable>
      </View>

      <Animated.View style={reportCardStyle}>
        <LinearGradient
          colors={dark ? ["#155e41", "#20845a"] : ["#087443", "#22a865"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.reportHero, CARD_RADIUS]}
        >
          <Animated.View
            style={[
              styles.reportHeroOrb,
              { transform: [{ translateY: reportGlowOneFloat }] },
            ]}
          />
          <Animated.View
            style={[
              styles.reportHeroBubbleTwo,
              { transform: [{ scale: reportGlowTwoScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.reportHeroBubbleThree,
              { transform: [{ translateY: reportGlowThreeFloat }] },
            ]}
          />
          <Animated.View
            style={[
              styles.reportHeroBubbleFour,
              { transform: [{ scale: reportGlowFourScale }] },
            ]}
          />
          <Text style={styles.reportHeroHint}>এই সময়ে মোট খরচ</Text>
          <AnimatedTotal value={total} style={styles.reportHeroTotal} />
          <Text style={styles.reportHeroTrend}>
            {previousTotal
              ? `${change}% ${total > previousTotal ? "বেশি" : "কম"} · ${
                  period === "month"
                    ? "আগের মাসের তুলনায়"
                    : "আগের বছরের তুলনায়"
                }`
              : "আগের সময়ের তুলনায় —"}
          </Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.reportMetrics, reportCardStyle]}>
        <View style={[styles.reportMetric, dark && darkStyles.reportMetric]}>
          <Text style={[styles.muted, dark && darkStyles.muted]}>
            {period === "month" ? "প্রতিদিন গড়" : "প্রতি মাসে গড়"}
          </Text>
          <Text style={[styles.reportMetricValue, dark && darkStyles.reportMetricValue]}>
            {taka(average, language)}
          </Text>
        </View>
        <View style={[styles.reportMetric, dark && darkStyles.reportMetric]}>
          <Text style={[styles.muted, dark && darkStyles.muted]}>লেনদেন</Text>
          <Text style={[styles.reportMetricValue, dark && darkStyles.reportMetricValue]}>
            {periodExpenses.length} টি
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.card, CARD_RADIUS, dark && darkStyles.card, reportCardStyle]}
      >
        <View style={[styles.cardHead, styles.reportCardHead]}>
          <View>
            <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>
              খরচের প্রবণতা
            </Text>
            <Text style={[styles.muted, dark && darkStyles.muted]}>
              {period === "month" ? "মাসিক" : "বার্ষিক"}
            </Text>
          </View>
          <Ionicons
            name="bar-chart-outline"
            size={20}
            color={dark ? "#a8e6bd" : PURPLE}
          />
        </View>
        {total ? period === "year" ? (
          <YearlyTrendChart items={chartItems} language={language} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reportChartContent}
          >
            {chartItems.map((item, index) => (
              <View
                style={styles.reportBarGroup}
                key={`${item.label}-${index}`}
              >
                <Text style={[styles.reportChartValue, dark && darkStyles.reportChartValue]}>
                  {item.value ? chartAmount(item.value, language) : "—"}
                </Text>
                <View
                  style={[
                    styles.reportBar,
                    dark && darkStyles.reportBar,
                    {
                      height: Math.max(5, (item.value / chartMax) * 128),
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.reportBarLabel,
                    dark && darkStyles.reportBarLabel,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            icon="bar-chart-outline"
            title="কোনো খরচ পাওয়া যায়নি"
            message="এই সময়ে কোনো খরচ নেই।"
            compact
          />
        )}
      </Animated.View>

      <Animated.View
        style={[styles.card, CARD_RADIUS, dark && darkStyles.card, reportCardStyle]}
      >
        <View style={[styles.cardHead, styles.reportCardHead]}>
          <View>
            <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>
              ক্যাটাগরি অনুযায়ী
            </Text>
            <Text style={[styles.muted, dark && darkStyles.muted]}>
              {periodExpenses.length ? "সর্বোচ্চ খরচের বিভাগ" : "এই সময়ে কোনো খরচ নেই।"}
            </Text>
          </View>
          <Ionicons
            name="pie-chart-outline"
            size={20}
            color={dark ? "#a8e6bd" : PURPLE}
          />
        </View>
        {categoryTotals.length ? (
          categoryTotals.map(([name, summary], index) => {
            const percentage = total ? (summary.amount / total) * 100 : 0;
            const subcategoryTotals = Object.entries(
              periodExpenses
                .filter((expense) => expense.categoryName === name)
                .reduce<Record<string, number>>((subcategories, expense) => {
                  const subcategory = expense.subcategoryName || "সাধারণ";
                  subcategories[subcategory] =
                    (subcategories[subcategory] || 0) + expense.amount;
                  return subcategories;
                }, {}),
            ).sort(([, first], [, second]) => second - first);
            const isExpanded = expandedCategory === name;
            return (
              <View key={name}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${name} ${
                    isExpanded ? "collapse" : "expand"
                  }`}
                  style={[
                    styles.reportCategoryRow,
                    isExpanded && styles.reportCategoryRowActive,
                    isExpanded && dark && darkStyles.reportCategoryRowActive,
                  ]}
                  onPress={() =>
                    setExpandedCategory(isExpanded ? null : name)
                  }
                >
                  <CategoryIcon
                    icon={summary.icon}
                    size={17}
                    color={dark ? "#c3f0d2" : PURPLE}
                    containerStyle={[
                      styles.reportCategoryIcon,
                      dark && darkStyles.reportCategoryIcon,
                    ]}
                  />
                  <View style={styles.reportCategoryInfo}>
                    <View style={styles.reportCategoryHeader}>
                      <Text
                        style={[styles.rowTitle, dark && darkStyles.rowTitle]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text style={[styles.amount, dark && darkStyles.amount]}>
                        {taka(summary.amount, language)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.reportProgressTrack,
                        dark && darkStyles.reportProgressTrack,
                      ]}
                    >
                      <View
                        style={[
                          styles.reportProgressFill,
                          { width: `${Math.max(3, percentage)}%` },
                          {
                            backgroundColor: [
                              "#087443",
                              "#22a865",
                              "#5b8def",
                              "#e2a93b",
                              "#df5f65",
                            ][index % 5],
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={17}
                    color={dark ? "#a7acc0" : "#8a8fa3"}
                  />
                </Pressable>
                {isExpanded && (
                  <View
                    style={[
                      styles.subBreakdown,
                      dark && darkStyles.subBreakdown,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subBreakdownTitle,
                        dark && darkStyles.subBreakdownTitle,
                      ]}
                    >
                      সাব-ক্যাটাগরি অনুযায়ী
                    </Text>
                    {subcategoryTotals.length ? (
                      subcategoryTotals.map(([subcategory, amount]) => (
                        <View style={styles.subBreakdownRow} key={subcategory}>
                          <Text
                            style={[
                              styles.subBreakdownName,
                              dark && darkStyles.subBreakdownName,
                            ]}
                            numberOfLines={1}
                          >
                            {subcategory}
                          </Text>
                          <Text
                            style={[
                              styles.subBreakdownAmount,
                              dark && darkStyles.subBreakdownAmount,
                            ]}
                          >
                            {taka(amount, language)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text
                        style={[styles.muted, dark && darkStyles.muted]}
                      >
                        সাব-ক্যাটাগরি নেই
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState
            icon="pie-chart-outline"
            title="কোনো খরচ পাওয়া যায়নি"
            message="এই সময়ে কোনো খরচ নেই।"
            compact
          />
        )}
      </Animated.View>
    </>
  );
}
