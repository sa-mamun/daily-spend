import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../i18n/Text";
import { LanguageContext } from "../context/LanguageContext";
import { ThemeContext, PURPLE } from "../theme/constants";
import { CategoryIcon } from "./CategoryIcon";
import type { Expense, IconName } from "../types/models";
import { dateText, taka } from "../utils/dates";
import { orbitTheme } from "../features/dashboard/orbitTheme";
import { EmptyStateAction } from "./EmptyStateAction";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type EmptyStateConfig = {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function ExpenseRow({
  expense,
  dark,
  surfaceColor,
  appearance,
  isLast,
  onDelete,
  onEdit,
}: {
  expense: Expense;
  dark: boolean;
  surfaceColor?: string;
  appearance?: "orbit";
  isLast?: boolean;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
}) {
  const { language } = useContext(LanguageContext);
  const orbit = appearance === "orbit" ? orbitTheme(dark) : null;
  const translateX = useRef(new Animated.Value(0)).current;
  const editScale = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) =>
        translateX.setValue(Math.max(-70, Math.min(0, gesture.dx))),
      onPanResponderRelease: (_, gesture) =>
        Animated.spring(translateX, {
          toValue: gesture.dx < -35 ? -70 : 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 5,
        }).start(),
    }),
  ).current;

  return (
    <View style={styles.rowClip}>
      <Animated.View style={[styles.deleteSurface, { opacity: translateX.interpolate({ inputRange: [-70, -1, 0], outputRange: [1, 1, 0], extrapolate: "clamp" }) }]}>
        <Pressable
          accessibilityLabel="খরচ মুছুন"
          onPress={() => onDelete(expense.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.row,
          dark && darkStyles.row,
          isLast && styles.rowLast,
          {
            backgroundColor: surfaceColor || (dark ? "#2a2924" : "#fff"),
            transform: [{ translateX }],
          },
        ]}
      >
        <CategoryIcon
          icon={expense.icon}
          size={20}
          color={orbit?.text ?? (dark ? "#edc176" : PURPLE)}
          containerStyle={[styles.categoryIcon, dark && darkStyles.categoryIcon, orbit && { backgroundColor: orbit.soft }]}
        />
        <View style={styles.copy}>
          <Text style={[styles.rowTitle, dark && darkStyles.rowTitle, orbit && { color: orbit.text }]} numberOfLines={1}>
            {expense.note || expense.categoryName}
            {!expense.note && expense.subcategoryName ? ` · ${expense.subcategoryName}` : ""}
          </Text>
          <Text style={[styles.muted, dark && darkStyles.muted, orbit && { color: orbit.muted }]} numberOfLines={2}>
            {expense.note ? `${expense.categoryName}${expense.subcategoryName ? ` · ${expense.subcategoryName}` : ""} · ` : ""}
            {dateText(expense.expenseDate, language)}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.amount, dark && darkStyles.amount, orbit && { color: orbit.text, fontSize: 12, fontWeight: "500" }]}>
          {taka(expense.amount, language)}
        </Text>
        <AnimatedPressable
          style={[styles.editButton, { transform: [{ scale: editScale }] }]}
          accessibilityLabel="খরচ edit করুন"
          onPressIn={() =>
            Animated.spring(editScale, {
              toValue: 0.82,
              useNativeDriver: true,
              speed: 20,
              bounciness: 6,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(editScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 20,
              bounciness: 7,
            }).start()
          }
          onPress={() => onEdit(expense)}
        >
          <Ionicons name="create-outline" size={18} color={orbit?.text ?? (dark ? "#f5f0e6" : "#181713")} />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

export function EmptyState({
  icon = "receipt-outline",
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateConfig & { compact?: boolean }) {
  const dark = useContext(ThemeContext);
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact, dark && darkStyles.emptyState]}>
      <View style={[styles.emptyStateIcon, dark && darkStyles.emptyStateIcon]}>
        <Ionicons name={icon} size={28} color={dark ? "#edc176" : PURPLE} />
      </View>
      <Text style={[styles.emptyStateTitle, dark && darkStyles.emptyStateTitle]}>{title}</Text>
      {message && (
        <Text style={[styles.emptyStateMessage, dark && darkStyles.emptyStateMessage]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <EmptyStateAction label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}

export function ExpenseList({
  expenses,
  surfaceColor,
  appearance,
  showDateHeaders = false,
  onDelete,
  onEdit,
  emptyState,
}: {
  expenses: Expense[];
  surfaceColor?: string;
  appearance?: "orbit";
  showDateHeaders?: boolean;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  emptyState?: EmptyStateConfig;
}) {
  const dark = useContext(ThemeContext);
  const [visibleCount, setVisibleCount] = useState(50);
  const { language } = useContext(LanguageContext);
  useEffect(() => setVisibleCount(50), [expenses]);

  return (
    <View style={styles.list}>
      {expenses.length ? (
        <>
          {expenses.slice(0, visibleCount).map((expense, index, visibleExpenses) => (
            <React.Fragment key={expense.id}>
            {showDateHeaders && (index === 0 || visibleExpenses[index - 1].expenseDate !== expense.expenseDate) ?
              <Text style={[styles.dateHeader, dark && { color: "#b9b2a4" }]}>{dateText(expense.expenseDate, language)}</Text> : null}
            <ExpenseRow
              expense={expense}
              dark={dark}
              surfaceColor={surfaceColor}
              appearance={appearance}
              isLast={index === visibleExpenses.length - 1}
              onDelete={onDelete}
              onEdit={onEdit}
            />
            </React.Fragment>
          ))}
          {visibleCount < expenses.length && (
            <Pressable
              accessibilityRole="button"
              style={[styles.loadMore, dark && darkStyles.loadMore]}
              onPress={() => setVisibleCount((count) => count + 50)}
            >
              <Text style={[styles.loadMoreText, dark && darkStyles.loadMoreText]}>আরও দেখুন</Text>
            </Pressable>
          )}
        </>
      ) : (
        <EmptyState
          title={emptyState?.title || "এখনও কোনো খরচ যোগ করা হয়নি।"}
          message={emptyState?.message}
          icon={emptyState?.icon}
          actionLabel={emptyState?.actionLabel}
          onAction={emptyState?.onAction}
          compact
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 12 },
  dateHeader: { color: "#686358", fontSize: 11, marginTop: 10, marginBottom: 8 },
  rowClip: { position: "relative", overflow: "hidden", borderRadius: 13, marginBottom: 7 },
  deleteSurface: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 70,
    backgroundColor: "#df5f65",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 70,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0,
    borderBottomColor: "#f0f1f5",
    gap: 11,
  },
  rowLast: { borderBottomWidth: 0, borderBottomColor: "transparent" },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f7ead0",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#181713", fontSize: 12, fontWeight: "500" },
  muted: { color: "#706b61", fontSize: 11 },
  amount: { color: "#181713", fontSize: 13, fontWeight: "600" },
  editButton: { width: 31, height: 31, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 18 },
  emptyStateCompact: { paddingVertical: 20 },
  emptyStateIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "#f7ead0", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyStateTitle: { color: "#181713", fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptyStateMessage: { color: "#706b61", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 280 },
  emptyStateAction: { minHeight: 38, borderRadius: 10, backgroundColor: "#dfa43e", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, overflow: "hidden" },
  emptyStateActionText: { color: "#181713", fontSize: 12, fontWeight: "600" },
  loadMore: { alignSelf: "center", borderRadius: 10, backgroundColor: "#f7ead0", paddingVertical: 9, paddingHorizontal: 16, marginTop: 8 },
  loadMoreText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
});

const darkStyles = StyleSheet.create({
  row: { borderBottomColor: "#454035", backgroundColor: "#2a2924" },
  categoryIcon: { backgroundColor: "#48391f" },
  rowTitle: { color: "#f5f0e6" },
  muted: { color: "#b9b2a4" },
  amount: { color: "#f5f0e6" },
  emptyState: {},
  emptyStateIcon: { backgroundColor: "#48391f" },
  emptyStateTitle: { color: "#f5f0e6" },
  emptyStateMessage: { color: "#b9b2a4" },
  emptyStateAction: { backgroundColor: "#dfa43e" },
  loadMore: { backgroundColor: "#48391f" },
  loadMoreText: { color: "#edc176" },
});
