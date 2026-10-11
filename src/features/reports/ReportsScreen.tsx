import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mintTheme } from "../../theme/mint";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext, CARD_RADIUS, PURPLE } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { Expense } from "../../types/models";
import { ReportOverview } from "./ReportOverview";
import { CategoryDonutChart } from "./CategoryDonutChart";
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
        label: (index + 1).toLocaleString(locale),
        value: expenseTotalsByDate[key] || 0,
      };
    });
  }, [expenseTotalsByDate, expenseTotalsByMonth, locale, month, monthKey, period, year]);
  const chartMax = Math.max(...chartItems.map((item) => item.value), 1);
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
      <ReportOverview
        period={period}
        periodLabel={periodLabel}
        total={total}
        previousTotal={previousTotal}
        change={change}
        average={average}
        count={periodExpenses.length}
        onPeriodChange={setPeriod}
        onShift={shiftPeriod}
        animatedStyle={reportCardStyle}
      />

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
            color={dark ? "#edc176" : PURPLE}
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
                      height: Math.max(5, (item.value / chartMax) * 100),
                      backgroundColor: item.value === chartMax ? "#dfa43e" : mintTheme(dark).border,
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
            color={dark ? "#edc176" : PURPLE}
          />
        </View>
        {total > 0 ? (
          <CategoryDonutChart key={periodLabel} expenses={periodExpenses} />
        ) : (
          <EmptyState icon="pie-chart-outline" title="কোনো খরচ পাওয়া যায়নি"
            message="এই সময়ে কোনো খরচ নেই।" compact />
        )}
      </Animated.View>
    </>
  );
}
