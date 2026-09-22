import React, { useContext } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Text } from "../i18n/Text";
import { LanguageContext } from "../context/LanguageContext";
import { ThemeContext, CARD_RADIUS, PURPLE } from "../theme/constants";
import type { IconName } from "../types/models";

export function Stat({
  compact = false,
  icon,
  label,
  value,
}: {
  compact?: boolean;
  icon: IconName;
  label: string;
  value: string;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const compactEnglish = compact && language === "en";
  return (
    <View style={[styles.stat, CARD_RADIUS, dark && darkStyles.stat]}>
      <View style={[styles.statIcon, dark && darkStyles.statIcon]}>
        <Ionicons name={icon} size={18} color={dark ? "#f2f3f8" : PURPLE} />
      </View>
      <View style={styles.statCopy}>
        <Text
          style={[
            styles.muted,
            compactEnglish && styles.statCompactLabel,
            dark && darkStyles.muted,
          ]}
          numberOfLines={compactEnglish ? 1 : 2}
          adjustsFontSizeToFit={compactEnglish}
          minimumFontScale={0.78}
        >
          {label}
        </Text>
        <Text style={[styles.statValue, dark && darkStyles.statValue]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: "#eceef5",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#e5f4eb",
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: { flex: 1, minWidth: 0 },
  muted: { color: "#8a8fa3", fontSize: 11 },
  statCompactLabel: { fontSize: 10 },
  statValue: { color: "#1c2030", fontSize: 12, fontWeight: "700", marginTop: 2 },
});

const darkStyles = StyleSheet.create({
  stat: { backgroundColor: "#202536", borderColor: "#343c52" },
  statIcon: { backgroundColor: "#1b5a40" },
  muted: { color: "#a7acc0" },
  statValue: { color: "#f2f3f8" },
});
