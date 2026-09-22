import React, { useContext } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext, PURPLE } from "../theme/constants";
import { categoryIconName } from "../data/catalog";

export function CategoryIcon({
  icon,
  size = 20,
  color,
  containerStyle,
}: {
  icon: string;
  size?: number;
  color?: string;
  containerStyle?: React.ComponentProps<typeof View>["style"];
}) {
  const dark = useContext(ThemeContext);
  return (
    <View style={containerStyle}>
      <Ionicons
        name={categoryIconName(icon)}
        size={size}
        color={color || (dark ? "#c3f0d2" : PURPLE)}
      />
    </View>
  );
}
