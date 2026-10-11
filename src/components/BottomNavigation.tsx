import React, { memo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../i18n/Text";
import { orbitTheme, ORBIT_CHROME } from "../features/dashboard/orbitTheme";
import Svg, { Path } from "react-native-svg";

const tabs = [
  { key: "dashboard", icon: "home-outline", label: "হোম" },
  { key: "expenses", icon: "receipt-outline", label: "সব খরচ" },
  { key: "reports", icon: "bar-chart-outline", label: "রিপোর্ট" },
  { key: "categories", icon: "pricetags-outline", label: "ক্যাটাগরি" },
] as const;
type Tab = typeof tabs[number]["key"];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export const BottomNavigation = memo(function BottomNavigation({ screen, dark, onNavigate, onAddExpense, addRef, expensesRef, categoriesRef }: {
  screen: string; dark: boolean; onNavigate: (screen: Tab) => void; onAddExpense: () => void;
  addRef: React.RefObject<View | null>; expensesRef: React.RefObject<View | null>; categoriesRef: React.RefObject<View | null>;
}) {
  const palette = orbitTheme(dark);
  const [width, setWidth] = useState(0);
  const middle = width / 2;
  // A circular cradle follows the button, with short rounded shoulders.
  // Its centre matches the button's centre relative to the SVG (21.5 - 14).
  const outline = `M 0 18 Q 0 0 18 0 H ${middle - 44} C ${middle - 35.16} 0 ${middle - 28} 3.36 ${middle - 28} 7.5 A 28 28 0 0 0 ${middle + 28} 7.5 C ${middle + 28} 3.36 ${middle + 35.16} 0 ${middle + 44} 0 H ${width - 18} Q ${width} 0 ${width} 18 V ${ORBIT_CHROME.navHeight} H 0 Z`;
  const scale = useRef(new Animated.Value(1)).current;
  const feedback = (pressed: boolean) => Animated.spring(scale, { toValue: pressed ? .9 : 1, speed: 25, bounciness: 5, useNativeDriver: true }).start();
  const tab = (item: typeof tabs[number]) => <Pressable key={item.key}
    ref={item.key === "expenses" ? expensesRef : item.key === "categories" ? categoriesRef : undefined}
    accessibilityRole="tab" accessibilityState={{ selected: screen === item.key }}
    onPress={() => onNavigate(item.key)}
    style={({ pressed }) => [s.tab, { opacity: pressed ? .55 : 1 }]}>
    <View pointerEvents="none" style={s.iconSlot}>
      <Ionicons name={item.icon} size={20} style={s.icon} color={screen === item.key ? palette.text : palette.muted} />
    </View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.85} style={[s.label, { color: screen === item.key ? palette.text : palette.muted, fontWeight: screen === item.key ? "600" : "400" }]}>{item.label}</Text>
  </Pressable>;
  return <View style={s.bar} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
    {width > 0 && <Svg pointerEvents="none" width={width} height={ORBIT_CHROME.navHeight} style={{ position: "absolute", left: 0, top: 14 }}>
      <Path d={outline} fill={palette.surface} />
    </Svg>}
    {tabs.slice(0, 2).map(tab)}
    <View style={s.center}>
      <AnimatedPressable ref={addRef} accessibilityRole="button" accessibilityLabel="খরচ যোগ করুন"
        onPress={onAddExpense} onPressIn={() => feedback(true)} onPressOut={() => feedback(false)}
        style={[s.add, { backgroundColor: palette.mint, transform: [{ scale }] }]}>
        <Ionicons name="add" size={24} color="#181713" />
      </AnimatedPressable>
    </View>
    {tabs.slice(2).map(tab)}
  </View>;
});
const s = StyleSheet.create({
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, height: ORBIT_CHROME.navHeight + 14, flexDirection: "row", alignItems: "flex-end" },
  tab: { width: "20%", minWidth: 0, height: ORBIT_CHROME.navHeight, justifyContent: "center", alignItems: "center", gap: 5, paddingHorizontal: 2 },
  iconSlot: { width: 28, height: 24, alignItems: "center", justifyContent: "center" },
  icon: { width: "100%", textAlign: "center", includeFontPadding: false },
  label: { width: "100%", textAlign: "center", fontSize: 10, lineHeight: 18, includeFontPadding: false },
  center: { width: "20%", height: ORBIT_CHROME.navHeight + 14, alignItems: "center", justifyContent: "flex-start" },
  add: { position: "absolute", top: 0, width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 3, shadowColor: "#DFA43E", shadowOpacity: .25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
});
