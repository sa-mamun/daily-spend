import React, { useContext } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import { mintTheme } from "../../theme/mint";
import { AnimatedTotal } from "../../components/AnimatedTotal";
import { taka } from "../../utils/dates";
import { ReportSummaryArtwork } from "./ReportSummaryArtwork";

type Props = {
  period: "month" | "year";
  periodLabel: string;
  total: number;
  previousTotal: number;
  change: number;
  average: number;
  count: number;
  onPeriodChange: (period: "month" | "year") => void;
  onShift: (direction: number) => void;
  animatedStyle: React.ComponentProps<typeof Animated.View>["style"];
};

export function ReportOverview(props: Props) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const palette = mintTheme(dark);
  const bn = language === "bn";
  const yearly = props.period === "year";
  const trend = !props.previousTotal
    ? bn ? "আগের সময়ের তুলনায় —" : "Compared with previous period —"
    : bn
      ? `${props.change.toLocaleString("bn-BD")}% ${props.total > props.previousTotal ? "বেশি" : "কম"} · ${yearly ? "আগের বছরের তুলনায়" : "আগের মাসের তুলনায়"}`
      : `${props.change}% ${props.total > props.previousTotal ? "more" : "less"} than last ${yearly ? "year" : "month"}`;
  const trendColor = props.previousTotal && props.total <= props.previousTotal
    ? palette.success : palette.muted;
  return (
    <>
      <View style={s.heading}>
        <Text style={[s.title, { color: palette.text }]}>রিপোর্ট</Text>
        <View style={[s.toggle, { backgroundColor: palette.surface }]}>
          {([ ["month", "মাসিক"], ["year", "বার্ষিক"] ] as const).map(([key, label]) => (
            <Pressable key={key} accessibilityRole="button"
              hitSlop={{ top: 7, bottom: 7 }}
              accessibilityState={{ selected: props.period === key }}
              onPress={() => props.onPeriodChange(key)}
              style={({ pressed }) => [s.option, {
                backgroundColor: props.period === key ? palette.primary : "transparent",
                opacity: pressed ? 0.7 : 1,
              }]}>
              <Text style={[s.optionText, { color: props.period === key ? palette.primaryText : palette.muted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Animated.View style={[s.summary, { backgroundColor: palette.surface }, props.animatedStyle]}>
        <View style={s.period}>
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? "পূর্ববর্তী সময়" : "Previous period"}
            onPress={() => props.onShift(-1)} style={({ pressed }) => [s.arrow, { opacity: pressed ? 0.5 : 1 }]}>
            <Ionicons name="chevron-back" size={18} color={palette.text} />
          </Pressable>
          <Text style={[s.periodText, { color: palette.text }]} numberOfLines={1}>{props.periodLabel}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={bn ? "পরবর্তী সময়" : "Next period"}
            onPress={() => props.onShift(1)} style={({ pressed }) => [s.arrow, { opacity: pressed ? 0.5 : 1 }]}>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
        </View>
        <View style={s.main}>
          <View style={s.amountRow}>
            <View style={s.amount}>
              <Text style={[s.label, { color: palette.muted }]}>{bn ? "মোট খরচ" : "Total spent"}</Text>
              <AnimatedTotal value={props.total} style={{ color: palette.text, fontSize: 35, lineHeight: 46, marginVertical: 3, fontWeight: "500" }} />
            </View>
            <ReportSummaryArtwork />
          </View>
          <View style={s.trend}>
            {props.previousTotal > 0 && <Ionicons name={props.total > props.previousTotal ? "trending-up" : "trending-down"} size={14} color={trendColor} />}
            <Text style={[s.label, { color: trendColor, flexShrink: 1 }]}>{trend}</Text>
          </View>
        </View>
        <View style={[s.stats, { borderTopColor: palette.border }]}>
          <View style={s.stat}>
            <Text style={[s.label, { color: palette.muted }]}>{yearly ? "প্রতি মাসে গড়" : "প্রতিদিন গড়"}</Text>
            <Text style={[s.statValue, { color: palette.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {taka(Math.round(props.average * 100) / 100, language)}
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={[s.label, { color: palette.muted }]}>লেনদেন</Text>
            <Text style={[s.statValue, { color: palette.text }]}>{props.count.toLocaleString(bn ? "bn-BD" : "en-US")}</Text>
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, minHeight: 38 },
  title: { fontSize: 20, fontWeight: "500", flexShrink: 1 },
  toggle: { flexDirection: "row", padding: 3, borderRadius: 9 },
  option: { height: 28, paddingHorizontal: 9, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  optionText: { fontSize: 11, fontWeight: "500" },
  summary: { borderRadius: 13, paddingHorizontal: 15, paddingTop: 4, paddingBottom: 13, marginBottom: 12 },
  period: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  arrow: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  periodText: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "500" },
  main: { paddingTop: 5, paddingBottom: 12 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 3 },
  amount: { flex: 1, minWidth: 0 },
  label: { fontSize: 11 },
  trend: { flexDirection: "row", alignItems: "center", gap: 5 },
  stats: { flexDirection: "row", gap: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  stat: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 },
  statValue: { fontSize: 13, fontWeight: "500", maxWidth: "100%" },
});
