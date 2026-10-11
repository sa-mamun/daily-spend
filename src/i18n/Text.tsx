import React, { useContext } from "react";
import { Platform, StyleSheet, Text as RNText } from "react-native";
import { LanguageContext } from "../context/LanguageContext";
import { translateText } from "./translations";
import { isLoaded } from "expo-font";

export function Text(props: React.ComponentProps<typeof RNText>) {
  const { language } = useContext(LanguageContext);
  const weight = StyleSheet.flatten(props.style)?.fontWeight;
  const medium = weight === "500" || weight === "600" || Number(weight) >= 600;
  // Android's system sans-serif has regular/medium named families. Resolve
  // medium explicitly so a 600 weight cannot silently render as regular.
  const family = `${language === "bn" ? "NotoSansBengali" : "DMSans"}-${Number(weight) >= 600 ? 600 : medium ? 500 : 400}`;
  const nativeFont = isLoaded(family) ? { fontFamily: family, fontWeight: "normal" as const } : Platform.OS === "android"
    ? { fontFamily: medium ? "sans-serif-medium" : "sans-serif", fontWeight: "normal" as const }
    : {};
  return (
    <RNText {...props} style={[props.style, nativeFont]}>
      {React.Children.map(props.children, (child) =>
        typeof child === "string" ? translateText(child, language) : child,
      )}
    </RNText>
  );
}
