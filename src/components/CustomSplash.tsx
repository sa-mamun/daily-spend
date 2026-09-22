import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet } from "react-native";

export function CustomSplash({ onFinish }: { onFinish: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const finishTimer = setTimeout(onFinish, 2000);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 280,
      delay: 1720,
      useNativeDriver: true,
    }).start();
    return () => clearTimeout(finishTimer);
  }, [onFinish, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity }]}>
      <Image
        source={require("../../assets/splash-icon.png")}
        style={styles.image}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    backgroundColor: "#f7f8fc",
  },
  image: { width: "100%", height: "100%" },
});
