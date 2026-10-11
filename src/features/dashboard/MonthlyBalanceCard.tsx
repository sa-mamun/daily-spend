import React, { useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { LanguageContext } from "../../context/LanguageContext";
import { ThemeContext } from "../../theme/constants";
import { AnimatedTotal } from "../../components/AnimatedTotal";
import { taka } from "../../utils/dates";
import type { MonthlyBudgetSummary } from "../budget/budgetService";
import { monthlyBalance } from "./monthlyBalance";
import { orbitTheme, ORBIT_CARD_RADIUS } from "./orbitTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 82;
const RING_RADIUS = 37.5;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function MonthlyBalanceCard({ total, trend, previousTotal, summary, onViewBudget, onSetBudget }: {
  total: number; trend: string; previousTotal: number;
  summary: MonthlyBudgetSummary | null; onViewBudget: () => void; onSetBudget: () => void;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const palette = orbitTheme(dark);
  const balance = monthlyBalance(summary);
  const [reduceMotion, setReduceMotion] = useState(true);
  const fill = useRef(new Animated.Value(0)).current;
  const artworkMotion = useRef(new Animated.Value(0)).current;
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setAppActive(state === "active"));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  const progress = balance?.progress ?? 0;
  useEffect(() => {
    fill.stopAnimation();
    if (reduceMotion) { fill.setValue(progress); return; }
    const animation = Animated.timing(fill, {
      toValue: progress, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, progress, reduceMotion]);
  useEffect(() => {
    artworkMotion.setValue(0);
    if (reduceMotion || !appActive) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(artworkMotion, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(artworkMotion, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); artworkMotion.stopAnimation(); };
  }, [appActive, artworkMotion, reduceMotion]);
  const artworkStyle = !reduceMotion && appActive ? {
    transform: [
      { translateY: artworkMotion.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
      { rotate: artworkMotion.interpolate({ inputRange: [0, 1], outputRange: ["-0.7deg", "0.7deg"] }) },
    ],
  } : undefined;
  const statusColor = balance?.exceeded ? palette.danger : (balance?.percentage ?? 0) >= 80 ? palette.warning : palette.accent;
  const budgetAction = balance ? onViewBudget : onSetBudget;
  const actionLabel = balance
    ? language === "en" ? "View and edit monthly budget" : "মাসিক বাজেট দেখুন ও সম্পাদনা করুন"
    : language === "en" ? "Set a monthly budget" : "মাসিক বাজেট সেট করুন";
  const periodDate = new Date();
  const periodLocale = language === "en" ? "en-GB" : "bn-BD";
  const month = periodDate.toLocaleDateString(periodLocale, { month: "long" });
  const year = periodDate.toLocaleDateString(periodLocale, { year: "numeric" });
  return (
    <View style={[s.card, { backgroundColor: palette.surface }]}>
      <View style={s.header}>
        <Text style={[s.heading, { color: palette.text }]}>{language === "en" ? "Monthly balance" : "মাসের হিসাব"}</Text>
        <Text numberOfLines={1} style={[s.caption, { color: palette.muted, flexShrink: 1 }]}>{month} {year}</Text>
      </View>
      <View style={s.metrics}>
        <Pressable onPress={budgetAction} accessibilityRole="button" accessibilityLabel={actionLabel}
          style={({ pressed }) => [s.ringButton, { opacity: pressed ? .7 : 1, transform: [{ scale: pressed ? .96 : 1 }] }]}>
          <View accessibilityRole={balance ? "progressbar" : undefined}
            accessibilityLabel={language === "en" ? "Monthly budget used" : "মাসিক বাজেটের ব্যবহার"}
            accessibilityValue={balance ? { min: 0, max: 100, now: progress, text: Math.round(balance.percentage) + "%" } : undefined}
            style={s.ring}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill} accessible={false}>
              <Circle cx="41" cy="41" r={RING_RADIUS} fill="none" stroke={palette.border} strokeWidth="7" />
              {balance && <AnimatedCircle cx="41" cy="41" r={RING_RADIUS} fill="none"
                stroke={balance.exceeded ? palette.danger : palette.mint} strokeWidth="7"
                strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
                strokeDashoffset={fill.interpolate({ inputRange: [0, 100], outputRange: [CIRCUMFERENCE, 0] })}
                rotation="-90" origin="41, 41" />}
            </Svg>
            {balance ? <>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.55} style={[s.percent, { color: palette.text }]}>{Math.round(balance.percentage)}<Text style={s.percentSign}>%</Text></Text>
              <Text style={[s.caption, { color: palette.muted }]}>{language === "en" ? "used" : "ব্যবহৃত"}</Text>
            </> : <Ionicons name="wallet-outline" size={28} color={palette.success} />}
          </View>
        </Pressable>
        <View style={s.values}>
          <Text style={[s.caption, { color: palette.muted }]}>এই মাসে মোট খরচ</Text>
          <AnimatedTotal value={total} animate={!reduceMotion} style={{ ...s.total, color: palette.text }} />
          {balance ? <View style={s.remaining}>
            <Text style={[s.caption, { color: statusColor }]}>{balance.exceeded
              ? language === "en" ? "Over" : "বেশি"
              : language === "en" ? "Left" : "বাকি"}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75}
              style={[s.remainingValue, { color: statusColor }]}>{taka(balance.remaining, language)}</Text>
          </View> : <Text style={[s.caption, { color: palette.accent }]}>{language === "en" ? "Plan your monthly spending" : "মাসিক খরচের পরিকল্পনা করুন"}</Text>}
        </View>
      </View>
      <View style={s.trend}>
        {previousTotal > 0 ? <Ionicons name={total > previousTotal ? "trending-up-outline" : "trending-down-outline"} size={14} color={palette.success} /> : null}
        <Text style={[s.caption, { flex: 1, color: palette.success }]}>{trend}</Text>
      </View>
      <View style={s.illustration} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        <Animated.View style={[{ width: "100%", height: "100%" }, artworkStyle]}>
          <Image source={require("../../../assets/illustrations/monthly-wallet-coins.png")}
            style={{ width: "100%", height: "100%" }} resizeMode="contain" accessible={false} />
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: ORBIT_CARD_RADIUS, padding: 15 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  periodHeading: { flex: 1, minWidth: 0, gap: 4 },
  heading: { fontSize: 13, fontWeight: "500" },
  periodSubtitle: { flexDirection: "row", alignItems: "center", gap: 5 },
  caption: { fontSize: 11, lineHeight: 16 },
  budgetAction: { minHeight: 44, justifyContent: "center", alignItems: "flex-end", maxWidth: "42%", flexShrink: 1 },
  setup: { flexDirection: "row", alignItems: "center", gap: 3 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 17, marginTop: 18, marginBottom: 14 },
  ringButton: { flexShrink: 0 }, ring: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center", gap: 3 },
  percent: { fontSize: 20, lineHeight: 27, letterSpacing: -.8, fontWeight: "500", maxWidth: 73 },
  percentSign: { fontSize: 13, letterSpacing: 0 },
  values: { flex: 1, minWidth: 0 },
  total: { fontSize: 30, lineHeight: 38, marginTop: 5, marginBottom: 8, letterSpacing: -.8, fontWeight: "500" },
  remaining: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  remainingValue: { fontSize: 13, fontWeight: "500", flexShrink: 1 },
  trend: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4, paddingRight: 112, minHeight: 42 },
  illustration: { position: "absolute", right: 4, bottom: 2, width: 112, height: 84 },
});
