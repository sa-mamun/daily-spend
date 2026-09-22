import React, { useContext, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { PURPLE, ThemeContext } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { Expense } from "../../types/models";
import { dbDate, dateText } from "../../utils/dates";
import { AppDatePicker } from "../../components/AppDatePicker";
import { EmptyState, ExpenseList } from "../../components/ExpenseList";

export function ExpenseHistory({
  expenses,
  dark,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  onDelete,
  onEdit,
  onAddExpense,
}: {
  expenses: Expense[];
  dark: boolean;
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  onClearDates: () => void;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  onAddExpense?: () => void;
}) {
  const { language } = useContext(LanguageContext);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(
    null,
  );
  const selectDate = (date: Date) => {
    if (pickerTarget === "start") onStartDateChange(date);
    if (pickerTarget === "end") onEndDateChange(date);
  };
  const pickerValue =
    pickerTarget === "start" ? startDate || new Date() : endDate || new Date();
  return (
    <>
      <View style={[styles.pageIntro, { marginBottom: 12 }]}>
        <View>
          <Text style={[styles.sectionTitle, dark && darkStyles.cardTitle]}>
            সব খরচ
          </Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>
            তারিখ অনুযায়ী expense দেখুন
          </Text>
        </View>
      </View>
      <View style={[styles.card, dark && darkStyles.card, { padding: 12 }]}>
        <Text
          style={[styles.label, dark && darkStyles.label, { marginTop: 0 }]}
        >
          Date range
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <Pressable
            style={{
              flex: 1,
              minHeight: 42,
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: dark ? "#414965" : "#eceef5",
              borderRadius: 10,
              paddingHorizontal: 10,
              backgroundColor: dark ? "#20533f" : "#f7f8fc",
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => setPickerTarget("start")}
          >
            <Text
              style={{
                color: startDate
                  ? dark
                    ? "#f2f3f8"
                    : "#1c2030"
                  : dark
                    ? "#a7acc0"
                    : "#8a8fa3",
                fontSize: 12,
              }}
            >
              {startDate ? dateText(dbDate(startDate), language) : "শুরু তারিখ"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={dark ? "#a8e6bd" : PURPLE}
            />
          </Pressable>
          <Text style={[styles.muted, dark && darkStyles.muted]}>—</Text>
          <Pressable
            style={{
              flex: 1,
              minHeight: 42,
              justifyContent: "space-between",
              borderWidth: 1,
              borderColor: dark ? "#414965" : "#eceef5",
              borderRadius: 10,
              paddingHorizontal: 10,
              backgroundColor: dark ? "#2b3042" : "#f7f8fc",
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={() => setPickerTarget("end")}
          >
            <Text
              style={{
                color: endDate
                  ? dark
                    ? "#f2f3f8"
                    : "#1c2030"
                  : dark
                    ? "#a7acc0"
                    : "#8a8fa3",
                fontSize: 12,
              }}
            >
              {endDate ? dateText(dbDate(endDate), language) : "শেষ তারিখ"}
            </Text>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={dark ? "#b9b1ff" : PURPLE}
            />
          </Pressable>
          {(startDate || endDate) && (
            <Pressable
              accessibilityLabel="তারিখের filter পরিষ্কার করুন"
              onPress={onClearDates}
              style={{
                width: 30,
                height: 30,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close-circle" size={20} color="#df5f65" />
            </Pressable>
          )}
        </View>
      </View>
      {pickerTarget && (
        <AppDatePicker
          value={pickerValue}
          onSelect={selectDate}
          onClose={() => setPickerTarget(null)}
          onConfirm={() => {
            selectDate(pickerValue);
            setPickerTarget(null);
          }}
        />
      )}
      <View
        style={[
          styles.card,
          dark && darkStyles.card,
          { borderBottomWidth: 0 },
        ]}
      >
        {expenses.length ? (
          <ExpenseList
            expenses={expenses}
            surfaceColor={dark ? "#202536" : "#fff"}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : (
          <EmptyState
            icon="calendar-outline"
            title={startDate || endDate ? "কোনো খরচ পাওয়া যায়নি" : "এখনও কোনো খরচ নেই"}
            message={
              startDate || endDate
                ? "এই date range-এ কোনো খরচ নেই।"
                : "প্রথম expense যোগ করলে এখানে দেখা যাবে।"
            }
            actionLabel={
              startDate || endDate ? "ফিল্টার পরিষ্কার করুন" : "প্রথম খরচ যোগ করুন"
            }
            onAction={startDate || endDate ? onClearDates : onAddExpense}
          />
        )}
      </View>
    </>
  );
}
