import React, { useContext, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext, CARD_RADIUS, CHART_LABEL_SPACING, CHART_NO_BORDER } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { Expense } from "../../types/models";
import { localDateKey, taka } from "../../utils/dates";
import { AnimatedTotal } from "../../components/AnimatedTotal";
import { Stat } from "../../components/Stat";
import { EmptyState, ExpenseList } from "../../components/ExpenseList";

function chartAmount(value: number, language: "en" | "bn") {
  const currency = language === "en" ? "Tk " : "৳";
  return value >= 1000
    ? `${currency}${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : `${currency}${Math.round(value)}`;
}

export function Dashboard({
  expenses,
  monthTotal,
  previousMonthTotal,
  todayTotal,
  transactionCount,
  top,
  onDelete,
  onEdit,
  onAddExpense,
  tourTargetRef,
}: {
  expenses: Expense[];
  monthTotal: number;
  previousMonthTotal: number;
  todayTotal: number;
  transactionCount: number;
  top: string;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  onAddExpense?: () => void;
  tourTargetRef?: React.RefObject<View | null>;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const shine = useRef(new Animated.Value(0)).current;
  const ambientMotion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    shine.setValue(0);
    Animated.timing(shine, {
      toValue: 1,
      duration: 980,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [monthTotal, shine]);
  const shineTranslateX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-130, 430],
  });
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientMotion, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ambientMotion, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [ambientMotion]);
  const glowOneFloat = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });
  const glowTwoScale = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const glowThreeFloat = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 7],
  });
  const glowFourScale = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1.08, 0.9],
  });
  const glowFiveFloat = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [5, -5],
  });
  const dailyTotals = useMemo(
    () =>
      expenses.reduce<Record<string, number>>((totals, expense) => {
        totals[expense.expenseDate] =
          (totals[expense.expenseDate] || 0) + expense.amount;
        return totals;
      }, {}),
    [expenses],
  );
  const monthTrend = useMemo(() => {
    if (!previousMonthTotal && !monthTotal)
      return language === "en"
        ? "Compared with last month —"
        : "গত মাসের তুলনায় —";
    if (!previousMonthTotal)
      return language === "en"
        ? "No spending last month"
        : "গত মাসে কোনো খরচ ছিল না";
    const percentage = Math.round(
      (Math.abs(monthTotal - previousMonthTotal) / previousMonthTotal) * 100,
    );
    if (!percentage)
      return language === "en" ? "Same as last month" : "গত মাসের সমান";
    if (monthTotal > previousMonthTotal)
      return language === "en"
        ? `${percentage}% higher than last month`
        : `গত মাসের তুলনায় ${percentage}% বেশি`;
    return language === "en"
      ? `${percentage}% lower than last month`
      : `গত মাসের তুলনায় ${percentage}% কম`;
  }, [language, monthTotal, previousMonthTotal]);
  const points = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + i);
    const key = localDateKey(d);
    return {
      label: d.toLocaleDateString(language === "en" ? "en-GB" : "bn-BD", {
        weekday: "short",
      }),
      value: dailyTotals[key] || 0,
    };
  });
  const hasWeeklyExpenses = points.some((point) => point.value > 0);
  const max = Math.max(...points.map((p) => p.value), 1000);
  return (
    <>
      <View ref={tourTargetRef} collapsable={false}>
        <LinearGradient
          colors={["#087443", "#22a865"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, CARD_RADIUS]}
        >
          <Animated.View
            style={[
              styles.glowOne,
              { transform: [{ translateY: glowOneFloat }] },
            ]}
          />
          <Animated.View
            style={[styles.glowTwo, { transform: [{ scale: glowTwoScale }] }]}
          />
          <Animated.View
            style={[
              styles.glowThree,
              { transform: [{ translateY: glowThreeFloat }] },
            ]}
          />
          <Animated.View
            style={[styles.glowFour, { transform: [{ scale: glowFourScale }] }]}
          />
          <Animated.View
            style={[
              styles.glowFive,
              { transform: [{ translateY: glowFiveFloat }] },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heroShine,
              {
                transform: [{ translateX: shineTranslateX }, { rotate: "18deg" }],
              },
            ]}
          />
          <View>
            <Text style={styles.heroHint}>এই মাসে মোট খরচ</Text>
            <AnimatedTotal value={monthTotal} />
            <Text style={styles.heroTrend}>{monthTrend}</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.stats}>
        <Stat
          icon="wallet-outline"
          label="আজকের খরচ"
          value={taka(todayTotal, language)}
        />
        <Stat
          compact
          icon="receipt-outline"
          label="লেনদেন"
          value={`${transactionCount} টি`}
        />
        <Stat icon="trophy-outline" label="সর্বোচ্চ ক্যাটাগরি" value={top} />
      </View>
      <View style={[styles.card, CARD_RADIUS, dark && darkStyles.card]}>
        <View style={styles.cardHead}>
          <View>
            <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>
              খরচের চিত্র
            </Text>
            <Text style={[styles.muted, dark && darkStyles.muted]}>
              এই সপ্তাহের হিসাব
            </Text>
          </View>
          <Text style={[styles.period, dark && darkStyles.period]}>
            সাপ্তাহিক
          </Text>
        </View>
        {hasWeeklyExpenses ? (
          <View style={[styles.chart, CHART_NO_BORDER, dark && darkStyles.chart]}>
            {points.map((p, i) => (
              <View style={styles.barGroup} key={`${p.label}-${i}`}>
                <View style={styles.barValueWrap}>
                  <Text
                    style={[styles.chartValue, dark && darkStyles.chartValue]}
                  >
                    {p.value ? chartAmount(p.value, language) : "—"}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      dark && darkStyles.bar,
                      i === new Date().getDay() &&
                        (dark ? darkStyles.barActive : styles.barActive),
                      { height: Math.max(4, (p.value / max) * 130) },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    CHART_LABEL_SPACING,
                    dark && darkStyles.barLabel,
                  ]}
                >
                  {p.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.chart,
              styles.chartEmpty,
              CHART_NO_BORDER,
              dark && darkStyles.chart,
            ]}
          >
            <EmptyState
              icon="bar-chart-outline"
              title="কোনো খরচ পাওয়া যায়নি"
              message="এই সপ্তাহে কোনো খরচ নেই।"
              actionLabel="প্রথম খরচ যোগ করুন"
              onAction={onAddExpense}
              compact
            />
          </View>
        )}
      </View>
      <View style={[styles.card, CARD_RADIUS, dark && darkStyles.recentCard]}>
        <Text style={[styles.cardTitle, dark && darkStyles.cardTitle]}>
          সাম্প্রতিক খরচ
        </Text>
        <Text style={[styles.muted, dark && darkStyles.muted]}>
          আপনার সর্বশেষ লেনদেন
        </Text>
        <ExpenseList
          expenses={expenses.slice(0, 5)}
          surfaceColor={dark ? "#1b2030" : "#fff"}
          onDelete={onDelete}
          onEdit={onEdit}
          emptyState={{
            icon: "receipt-outline",
            title: "এখনও কোনো খরচ নেই",
            message: "প্রথম expense যোগ করলে এখানে দেখা যাবে।",
            actionLabel: "প্রথম খরচ যোগ করুন",
            onAction: onAddExpense,
          }}
        />
      </View>
    </>
  );
}
