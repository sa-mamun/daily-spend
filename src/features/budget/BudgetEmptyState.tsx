import React, { useContext } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import { ThemeContext } from "../../theme/constants";
import { mintTheme } from "../../theme/mint";
import { EmptyStateAction } from "../../components/EmptyStateAction";

export function BudgetEmptyState({ icon, message, label, accessibilityLabel, onAdd }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  message: string; label: string; accessibilityLabel: string; onAdd: () => void;
}) {
  const palette = mintTheme(useContext(ThemeContext));
  return <View style={{ alignItems: "center", paddingVertical: 19 }}>
    <Ionicons name={icon} size={25} color={palette.muted} />
    <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 7, textAlign: "center" }}>{message}</Text>
    <EmptyStateAction label={label} accessibilityLabel={accessibilityLabel} onPress={onAdd} />
  </View>;
}
