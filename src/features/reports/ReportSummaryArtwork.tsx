import React, { useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { ThemeContext } from "../../theme/constants";
import { mintTheme } from "../../theme/mint";

// Decorative receipt illustration, not a chart of the selected period's data.
export function ReportSummaryArtwork() {
  const dark = useContext(ThemeContext);
  const palette = mintTheme(dark);
  const motion = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const accessibility = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const appState = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => { mounted = false; accessibility.remove(); appState.remove(); };
  }, []);

  useEffect(() => {
    motion.setValue(0);
    if (reduceMotion || !active) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(motion, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); motion.stopAnimation(); };
  }, [active, motion, reduceMotion]);

  const floatingStyle = {
    transform: [
      { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [2, -4] }) },
      { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "2deg"] }) },
    ],
  };
  const badgeStyle = {
    opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
    transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1.05] }) }],
  };
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
      style={{ width: 76, height: 72, flexShrink: 0 }}>
      <Svg width={76} height={72} viewBox="0 0 76 72" accessible={false}>
        <Circle cx={41} cy={36} r={31} fill={palette.soft} />
        <Circle cx={12} cy={29} r={2} fill="#dfa43e" fillOpacity={0.6} />
        <Circle cx={65} cy={18} r={3} fill="#dfa43e" fillOpacity={0.45} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, floatingStyle]}>
        <Svg width={76} height={72} viewBox="0 0 76 72" accessible={false}>
          <Rect x={20} y={8} width={38} height={53} rx={7} fill={palette.surface} />
          <Path d="M28 17L31 19L34 17L37 19L40 17L43 19L46 17L49 19V51L46 49L43 51L40 49L37 51L34 49L31 51L28 49Z"
            fill="none" stroke={palette.accentText} strokeWidth={1.4} strokeLinejoin="round" />
          <Path d="M34 27H43M34 33H43M34 39H39" fill="none" stroke={palette.accentText} strokeWidth={1.4} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: 49, top: 44, width: 20, height: 20 }, badgeStyle]}>
        <Svg width={20} height={20} viewBox="0 0 20 20" accessible={false}>
          <Circle cx={10} cy={10} r={10} fill="#dfa43e" />
          <Path d="M6 10L9 13L14 7" fill="none" stroke="#181713" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
