import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, TextStyle } from "react-native";
import { LanguageContext } from "../context/LanguageContext";
import { taka } from "../utils/dates";

export function AnimatedTotal({
  value,
  style,
}: {
  value: number;
  style?: TextStyle;
}) {
  const { language } = useContext(LanguageContext);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.stopAnimation();
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
    return () => animatedValue.removeListener(listener);
  }, [animatedValue, value]);

  return <Animated.Text style={[styles.total, style]}>{taka(displayValue, language)}</Animated.Text>;
}

const styles = StyleSheet.create({
  total: { color: "#fff", fontSize: 34, fontWeight: "800", marginVertical: 2 },
});
