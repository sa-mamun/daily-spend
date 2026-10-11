import React, { useContext } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../i18n/Text";
import { ThemeContext } from "../theme/constants";
import { mintTheme, MINT } from "../theme/mint";

export function CompactActionButton({ kind, label, compact = false, tone = "soft", accessibilityLabel, onPress }: {
  kind: "add" | "edit" | "delete"; label?: string; compact?: boolean; tone?: "soft" | "solid"; accessibilityLabel: string; onPress: () => void;
}) {
  const dark = useContext(ThemeContext);
  const palette = mintTheme(dark);
  const solid = kind === "add" && tone === "solid";
  const ink = solid ? "#181713" : kind === "edit" ? palette.text : palette.accentText;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    onPress={onPress} style={({ pressed }) => [s.target, compact && s.compact, {
      opacity: pressed && !solid ? .75 : 1, transform: [{ scale: pressed ? .93 : 1 }],
    }]}>
    <View pointerEvents="none" style={[s.surface, label ? s.labeled : s.iconOnly, { backgroundColor: kind === "add" ? solid ? MINT : palette.soft : "transparent" }, solid && s.solid]}>
      <Ionicons name={kind === "edit" ? "create-outline" : kind === "delete" ? "trash-outline" : "add"} size={kind === "add" ? solid ? 16 : 14 : 18} color={kind === "delete" ? dark ? "#ff9da4" : "#b52d39" : ink} />
      {label ? <Text style={[s.label, { color: ink }, solid && s.solidLabel]}>{label}</Text> : null}
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  target: { minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center", flexShrink: 0 },
  compact: { minWidth: 28, width: 28 },
  surface: { height: 30, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  iconOnly: { width: 30 }, labeled: { paddingHorizontal: 10 },
  label: { fontSize: 11, fontWeight: "500" },
  solid: { height: 32, paddingHorizontal: 11 },
  solidLabel: { fontSize: 12 },
});
