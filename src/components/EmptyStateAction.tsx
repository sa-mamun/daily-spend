import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../i18n/Text";
import { MINT, MINT_INK } from "../theme/mint";

// Compact visual button, with a larger touch target in every empty card.
export function EmptyStateAction({ label, accessibilityLabel = label, onPress }: {
  label: string; accessibilityLabel?: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    onPress={onPress} style={({ pressed }) => [s.target, { transform: [{ scale: pressed ? .95 : 1 }], opacity: pressed ? .85 : 1 }]}>
    <View pointerEvents="none" style={s.surface}>
      <Ionicons name="add" size={16} color={MINT_INK} />
      <Text style={s.label}>{label}</Text>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  target: { minHeight: 44, minWidth: 44, maxWidth: "100%", alignSelf: "center", justifyContent: "center", marginTop: 8 },
  surface: { minHeight: 32, borderRadius: 9, backgroundColor: MINT, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  label: { color: MINT_INK, fontSize: 12, lineHeight: 20, fontWeight: "500", flexShrink: 1, textAlign: "center" },
});
