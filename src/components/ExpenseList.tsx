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
  isLast,
  onDelete,
  onEdit,
}: {
  expense: Expense;
  dark: boolean;
  surfaceColor?: string;
  isLast?: boolean;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
}) {
  const { language } = useContext(LanguageContext);
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
      <View style={styles.deleteSurface}>
        <Pressable
          accessibilityLabel="খরচ মুছুন"
          onPress={() => onDelete(expense.id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.row,
          dark && darkStyles.row,
          isLast && styles.rowLast,
          {
            backgroundColor: surfaceColor || (dark ? "#202536" : "#fff"),
            transform: [{ translateX }],
          },
        ]}
      >
        <CategoryIcon
          icon={expense.icon}
          size={20}
          color={dark ? "#c3f0d2" : PURPLE}
          containerStyle={[styles.categoryIcon, dark && darkStyles.categoryIcon]}
        />
        <View style={styles.copy}>
          <Text style={[styles.rowTitle, dark && darkStyles.rowTitle]}>
            {expense.categoryName}
            {expense.subcategoryName ? ` · ${expense.subcategoryName}` : ""}
          </Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>
            {dateText(expense.expenseDate, language)}
            {expense.note ? ` · ${expense.note}` : ""}
          </Text>
        </View>
        <Text style={[styles.amount, dark && darkStyles.amount]}>
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
          <Ionicons name="create-outline" size={18} color={dark ? "#a8e6bd" : PURPLE} />
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
        <Ionicons name={icon} size={28} color={dark ? "#a8e6bd" : PURPLE} />
      </View>
      <Text style={[styles.emptyStateTitle, dark && darkStyles.emptyStateTitle]}>{title}</Text>
      {message && (
        <Text style={[styles.emptyStateMessage, dark && darkStyles.emptyStateMessage]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          accessibilityRole="button"
          style={[styles.emptyStateAction, dark && darkStyles.emptyStateAction]}
          onPress={onAction}
          android_ripple={{ color: "#ffffff33" }}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.emptyStateActionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ExpenseList({
  expenses,
  surfaceColor,
  onDelete,
  onEdit,
  emptyState,
}: {
  expenses: Expense[];
  surfaceColor?: string;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  emptyState?: EmptyStateConfig;
}) {
  const dark = useContext(ThemeContext);
  const [visibleCount, setVisibleCount] = useState(50);
  useEffect(() => setVisibleCount(50), [expenses]);

  return (
    <View style={styles.list}>
      {expenses.length ? (
        <>
          {expenses.slice(0, visibleCount).map((expense, index, visibleExpenses) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              dark={dark}
              surfaceColor={surfaceColor}
              isLast={index === visibleExpenses.length - 1}
              onDelete={onDelete}
              onEdit={onEdit}
            />
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
  rowClip: { position: "relative", overflow: "hidden" },
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
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f1f5",
    gap: 11,
  },
  rowLast: { borderBottomWidth: 0, borderBottomColor: "transparent" },
  categoryIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: "#e5f4eb",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#1c2030", fontSize: 14, fontWeight: "600" },
  muted: { color: "#8a8fa3", fontSize: 11 },
  amount: { color: "#1c2030", fontSize: 13, fontWeight: "700" },
  editButton: { width: 31, height: 31, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 18 },
  emptyStateCompact: { paddingVertical: 20 },
  emptyStateIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: "#e5f4eb", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyStateTitle: { color: "#1c2030", fontSize: 15, fontWeight: "800", textAlign: "center" },
  emptyStateMessage: { color: "#8a8fa3", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6, maxWidth: 280 },
  emptyStateAction: { minHeight: 38, borderRadius: 10, backgroundColor: PURPLE, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, overflow: "hidden" },
  emptyStateActionText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  loadMore: { alignSelf: "center", borderRadius: 10, backgroundColor: "#e5f4eb", paddingVertical: 9, paddingHorizontal: 16, marginTop: 8 },
  loadMoreText: { color: PURPLE, fontSize: 12, fontWeight: "700" },
});

const darkStyles = StyleSheet.create({
  row: { borderBottomColor: "#343c52" },
  categoryIcon: { backgroundColor: "#1b5a40" },
  rowTitle: { color: "#f2f3f8" },
  muted: { color: "#a7acc0" },
  amount: { color: "#f2f3f8" },
  emptyState: {},
  emptyStateIcon: { backgroundColor: "#1b5a40" },
  emptyStateTitle: { color: "#f2f3f8" },
  emptyStateMessage: { color: "#a7acc0" },
  emptyStateAction: { backgroundColor: "#2c9d6b" },
  loadMore: { backgroundColor: "#164b35" },
  loadMoreText: { color: "#c3f0d2" },
});
