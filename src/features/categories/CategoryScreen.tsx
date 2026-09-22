import React, { useContext, useMemo, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext, PURPLE } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { Category, Expense, Subcategory } from "../../types/models";
import { taka } from "../../utils/dates";
import { CategoryIcon } from "../../components/CategoryIcon";
import { EmptyState } from "../../components/ExpenseList";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CategoryScreen({
  categories,
  subcategories,
  expenses,
  onAdd,
  onOpenSubcategories,
  onCategoryLongPress,
}: {
  categories: Category[];
  subcategories: Subcategory[];
  expenses: Expense[];
  onAdd: () => void;
  onOpenSubcategories: (id: number) => void;
  onCategoryLongPress: (category: Category) => void;
}) {
  const categoryPageScale = useRef(new Animated.Value(1)).current;
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const categoryTotals = useMemo(
    () =>
      expenses.reduce<Record<number, number>>((totals, expense) => {
        totals[expense.categoryId] =
          (totals[expense.categoryId] || 0) + expense.amount;
        return totals;
      }, {}),
    [expenses],
  );
  return (
    <>
      <View style={styles.pageIntro}>
        <View>
          <Text style={[styles.sectionTitle, dark && darkStyles.cardTitle]}>
            খরচের ধরন
          </Text>
          <Text style={[styles.muted, dark && darkStyles.muted]}>
            Category-তে tap করে subcategory manage করুন
          </Text>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="নতুন category যোগ করুন"
          style={[
            styles.smallPrimary,
            {
              width: 38,
              height: 38,
              borderRadius: 19,
              padding: 0,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: categoryPageScale }],
            },
          ]}
          onPressIn={() =>
            Animated.spring(categoryPageScale, {
              toValue: 0.9,
              useNativeDriver: true,
              speed: 20,
              bounciness: 6,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(categoryPageScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 20,
              bounciness: 6,
            }).start()
          }
          onPress={onAdd}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              lineHeight: 24,
              fontWeight: "500",
            }}
          >
            ＋
          </Text>
        </AnimatedPressable>
      </View>
      {categories.length ? (
        <View style={styles.categoryGrid}>
          {categories.map((c) => {
            const items = subcategories.filter((s) => s.categoryId === c.id);
            return (
              <Pressable
                style={[styles.categoryCard, dark && darkStyles.categoryCard]}
              key={c.id}
              onPress={() => onOpenSubcategories(c.id)}
              onLongPress={() => onCategoryLongPress(c)}
              delayLongPress={350}
            >
                <CategoryIcon
                  icon={c.icon}
                  size={20}
                  color={dark ? "#c3f0d2" : PURPLE}
                  containerStyle={[styles.categoryIcon, dark && darkStyles.categoryIcon]}
                />
                <View style={styles.categoryInfo}>
                  <Text
                    style={[styles.rowTitle, dark && darkStyles.rowTitle]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {c.name}
                  </Text>
                  <Text style={styles.muted}>
                    {taka(
                      categoryTotals[c.id] || 0,
                      language,
                    )}{" "}
                    · {items.length} subcategory
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={[styles.card, dark && darkStyles.card]}>
          <EmptyState
            icon="pricetags-outline"
            title="কোনো category নেই"
            message="প্রথম category যোগ করে শুরু করুন।"
            actionLabel="ক্যাটাগরি যোগ করুন"
            onAction={onAdd}
          />
        </View>
      )}
    </>
  );
}
