import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, TextStyle } from "react-native";
import { LanguageContext } from "../context/LanguageContext";
import { taka } from "../utils/dates";
import { isLoaded } from "expo-font";

export function AnimatedTotal({
  value,
  style,
  animate = true,
}: {
  value: number;
  style?: TextStyle;
  animate?: boolean;
}) {
  const { language } = useContext(LanguageContext);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.stopAnimation();
    if (!animate) {
      animatedValue.setValue(value);
      setDisplayValue(value);
      return;
    }
    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value: nextValue }) =>
      setDisplayValue(Math.round(nextValue)),
    );
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 780,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => { animatedValue.stopAnimation(); animatedValue.removeListener(listener); };
  }, [animatedValue, value, animate]);

  const family = language === "bn" ? "NotoSansBengali-500" : "DMSans-500";
  return <Animated.Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.total, style, isLoaded(family) ? { fontFamily: family, fontWeight: "normal" } : Platform.OS === "android" && { fontFamily: "sans-serif-medium", fontWeight: "normal" }]}>{taka(displayValue, language)}</Animated.Text>;
}

const styles = StyleSheet.create({
  total: { color: "#181713", fontSize: 32, lineHeight: 45, fontWeight: "600", letterSpacing: -1, marginVertical: 6, fontFamily: "sans-serif" },
});
