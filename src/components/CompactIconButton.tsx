import React, { useContext, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { IconName } from "../types/models";
import { PURPLE, ThemeContext } from "../theme/constants";
import { MINT, MINT_INK } from "../theme/mint";

type CompactIconButtonProps = {
  accessibilityLabel: string;
  icon?: IconName;
  onPress: () => void;
};

export function CompactIconButton({
  accessibilityLabel,
  icon = "add",
  onPress,
}: CompactIconButtonProps) {
  const dark = useContext(ThemeContext);
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);
  const animatePress = (active: boolean) => {
    setPressed(active);
    Animated.spring(scale, {
      toValue: active ? 0.93 : 1,
      speed: 26,
      bounciness: active ? 0 : 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        transform: [
          { scale },
          {
            translateY: scale.interpolate({
              inputRange: [0.93, 1],
              outputRange: [1, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={3}
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          borderWidth: 0,
          backgroundColor: pressed
            ? "#3bac8a"
            : MINT,
          alignItems: "center",
          justifyContent: "center",
          elevation: pressed ? 0 : 3,
          shadowColor: dark ? "#000" : PURPLE,
          shadowOffset: { width: 0, height: pressed ? 0 : 3 },
          shadowOpacity: 0.13,
          shadowRadius: 3,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "#ffffff18",
          }}
        />
        <Ionicons name={icon} size={20} color={MINT_INK} />
      </Pressable>
    </Animated.View>
  );
}
