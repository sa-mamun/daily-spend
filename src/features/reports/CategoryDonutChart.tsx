import React, { useContext, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import { mintTheme } from "../../theme/mint";
import { taka } from "../../utils/dates";
import type { Expense } from "../../types/models";
import { categoryDonut, donutArc } from "./categoryDonut";

export function CategoryDonutChart({ expenses }: { expenses: Expense[] }) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const palette = mintTheme(dark);
  const model = useMemo(() => categoryDonut(expenses), [expenses]);
  const [selected, setSelected] = useState<string | null>(null);
  const [otherCategory, setOtherCategory] = useState<number | null>(null);
  const active = model.slices.find(slice => slice.key === selected);
  const selectedId = active?.key === "others" ? otherCategory : active?.categoryIds[0];
  const category = model.categories.find(item => item.id === selectedId);
  const subcategories = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number }>();
    for (const expense of expenses) {
      if (expense.categoryId !== selectedId) continue;
      const key = String(expense.subcategoryId ?? "general");
      const current = totals.get(key);
      totals.set(key, { name: expense.subcategoryName || (language === "en" ? "General" : "সাধারণ"),
        amount: (current?.amount ?? 0) + expense.amount });
    }
    return [...totals].sort(([, a], [, b]) => b.amount - a.amount);
  }, [expenses, selectedId, language]);
  const select = (key: string) => { setSelected(selected === key ? null : key); setOtherCategory(null); };
  let angle = 0;
  return <View>
    <View style={s.summary}>
      <View style={s.donut}>
        <Svg width="100%" height="100%" viewBox="0 0 128 128" accessible={false}>
          {model.slices.map(slice => {
            const start = angle;
            angle += slice.amount / model.total * 360;
            return <Path key={slice.key} d={donutArc(start, angle)} fill={slice.color}
              opacity={!active || active.key === slice.key ? 1 : .45} onPress={() => select(slice.key)} />;
          })}
        </Svg>
        <View style={s.center} pointerEvents="none">
          <Text style={[s.spent, { color: palette.muted }]}>{language === "en" ? "SPENT" : "মোট খরচ"}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.55}
            style={[s.total, { color: palette.text }]}>{taka(model.total, language)}</Text>
        </View>
      </View>
      <View style={s.legend}>
        {model.slices.map(slice => {
          const label = slice.key === "others" ? language === "en" ? "Others" : "অন্যান্য" : slice.name;
          const percentage = slice.percentage === 0 ? "<1" : slice.percentage.toLocaleString(language === "en" ? "en-US" : "bn-BD");
          return <Pressable key={slice.key} onPress={() => select(slice.key)}
            accessibilityRole="button" accessibilityState={{ expanded: active?.key === slice.key }}
            accessibilityLabel={`${label}, ${percentage}%, ${taka(slice.amount, language)}`}
            style={({ pressed }) => [s.legendRow, { backgroundColor: active?.key === slice.key ? palette.soft : "transparent", opacity: pressed ? .65 : 1 }]}>
            <View style={[s.dot, { backgroundColor: slice.color }]} />
            <Text numberOfLines={1} style={[s.name, { color: palette.text }]}>{label}</Text>
            <Text style={[s.percent, { color: palette.muted }]}>{percentage}%</Text>
          </Pressable>;
        })}
      </View>
    </View>
    {active && <View style={[s.details, { backgroundColor: palette.soft }]}>
      {active.key === "others" && model.categories.filter(item => active.categoryIds.includes(item.id)).map(item =>
        <Pressable key={item.id} onPress={() => setOtherCategory(otherCategory === item.id ? null : item.id)}
          accessibilityRole="button" accessibilityState={{ expanded: otherCategory === item.id }}
          style={({ pressed }) => [s.otherRow, { opacity: pressed ? .65 : 1 }]}>
          <Text numberOfLines={1} style={[s.detailName, { color: palette.text }]}>{item.name}</Text>
          <Text style={[s.detailAmount, { color: palette.text }]}>{taka(item.amount, language)}</Text>
          <Ionicons name={otherCategory === item.id ? "chevron-up" : "chevron-down"} size={14} color={palette.muted} />
        </Pressable>)}
      {category && <View>
        <View style={s.detailHeader}>
          <Text numberOfLines={1} style={[s.detailTitle, { color: palette.text }]}>{category.name}</Text>
          <Text style={[s.detailAmount, { color: palette.text }]}>{taka(category.amount, language)}</Text>
        </View>
        <Text style={[s.detailCaption, { color: palette.muted }]}>{language === "en" ? "By subcategory" : "সাব-ক্যাটাগরি অনুযায়ী"}</Text>
        {subcategories.map(([key, item]) => <View key={key} style={s.detailRow}>
          <Text numberOfLines={1} style={[s.detailName, { color: palette.text }]}>{item.name}</Text>
          <Text style={[s.detailAmount, { color: palette.text }]}>{taka(item.amount, language)}</Text>
        </View>)}
      </View>}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  donut: { width: "42%", maxWidth: 148, aspectRatio: 1 },
  center: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  spent: { fontSize: 9, lineHeight: 16, letterSpacing: .5 },
  total: { fontSize: 17, lineHeight: 24, fontWeight: "600", width: "100%", textAlign: "center" },
  legend: { flex: 1, minWidth: 0, gap: 2 },
  legendRow: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 5, borderRadius: 7 },
  dot: { width: 7, height: 7, borderRadius: 2 },
  name: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 18 },
  percent: { fontSize: 11, lineHeight: 18, fontWeight: "500" },
  details: { borderRadius: 9, padding: 12, marginTop: 10 },
  detailHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailTitle: { flex: 1, fontSize: 13, lineHeight: 21, fontWeight: "600" },
  detailCaption: { fontSize: 10, lineHeight: 18, marginTop: 2, marginBottom: 7 },
  otherRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  detailName: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 20 },
  detailAmount: { fontSize: 12, lineHeight: 20, fontWeight: "500", flexShrink: 1 },
});
