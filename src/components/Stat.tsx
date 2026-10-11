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
      <View style={styles.statHead}>
        <View style={[styles.statIcon, dark && darkStyles.statIcon]}>
          <Ionicons name={icon} size={17} color={dark ? "#edc176" : PURPLE} />
        </View>
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
      </View>
      <Text style={[styles.statValue, dark && darkStyles.statValue]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: "#e8e4db",
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 31 },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#f7ead0",
    alignItems: "center",
    justifyContent: "center",
  },
  statCopy: { flex: 1, minWidth: 0 },
  muted: { color: "#706b61", fontSize: 11, flex: 1, minWidth: 0 },
  statCompactLabel: { fontSize: 11 },
  statValue: { color: "#181713", fontSize: 14, fontWeight: "600", marginTop: 5 },
});

const darkStyles = StyleSheet.create({
  stat: { backgroundColor: "#2a2924", borderColor: "#454035" },
  statIcon: { backgroundColor: "#48391f" },
  muted: { color: "#b9b2a4" },
  statValue: { color: "#f5f0e6" },
});
