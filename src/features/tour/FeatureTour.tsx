import React, { useContext, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Text } from "../../i18n/Text";
import { ThemeContext, PURPLE } from "../../theme/constants";
import { styles, darkStyles } from "../../theme/styles";
import type { IconName } from "../../types/models";

type TourTargetKey = "menu" | "add" | "expenses" | "categories" | "dashboard";
type TourTargetRect = { x: number; y: number; width: number; height: number };
type TourTargetRefs = Record<TourTargetKey, React.RefObject<View | null>>;

function FeatureTourConnector({
  target,
  bubble,
  targetKey,
  dark,
}: {
  target: TourTargetRect;
  bubble: TourTargetRect;
  targetKey: TourTargetKey;
  dark: boolean;
}) {
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  const targetIsAbove = target.y + target.height < bubble.y;
  const targetX =
    targetKey === "menu" || targetKey === "expenses"
      ? targetCenterX + 10
      : targetKey === "add" || targetKey === "categories"
        ? targetCenterX - 10
        : targetCenterX;
  const targetY = targetIsAbove
    ? target.y + target.height + 11
    : target.y - 11;
  const bubbleCenterX = bubble.x + bubble.width / 2;
  const calculatedStartX =
    targetKey === "dashboard"
      ? bubbleCenterX + 44
      : bubbleCenterX + (targetX - bubbleCenterX) * 0.34;
  const startX = Math.max(
    bubble.x + 64,
    Math.min(bubble.x + bubble.width - 64, calculatedStartX),
  );
  const direction = targetIsAbove ? -1 : 1;
  const startY = targetIsAbove ? bubble.y - 11 : bubble.y + bubble.height + 11;
  const distance = Math.max(36, Math.abs(targetY - startY));
  const curve = Math.min(92, Math.max(34, distance * 0.34));
  const controlOneX = startX + (targetX - startX) * 0.08;
  const controlTwoX = targetX - (targetX - startX) * 0.14;
  const controlOneY = startY + direction * curve;
  const controlTwoY = targetY - direction * curve;
  const tangentX = targetX - controlTwoX;
  const tangentY = targetY - controlTwoY;
  const tangentLength = Math.max(1, Math.sqrt(tangentX ** 2 + tangentY ** 2));
  const unitX = tangentX / tangentLength;
  const unitY = tangentY / tangentLength;
  const normalX = -unitY;
  const normalY = unitX;
  const headLength = 10;
  const headWidth = 6;
  const headBackX = targetX - unitX * headLength;
  const headBackY = targetY - unitY * headLength;
  const bodyGap = 4;
  const bodyEndX = headBackX - unitX * bodyGap;
  const bodyEndY = headBackY - unitY * bodyGap;
  // Leave a tiny gap before the head so neither wing gets covered by the body.
  const path = `M ${startX} ${startY} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${bodyEndX} ${bodyEndY}`;
  const arrowHead = `M ${headBackX + normalX * headWidth} ${headBackY + normalY * headWidth} L ${targetX} ${targetY} L ${headBackX - normalX * headWidth} ${headBackY - normalY * headWidth}`;
  const color = dark ? "#a8e6bd" : PURPLE;
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      style={styles.featureTourConnector}
    >
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={arrowHead}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FeatureTourModal({
  visible,
  onFinish,
  targetRefs,
}: {
  visible: boolean;
  onFinish: () => void;
  targetRefs: TourTargetRefs;
}) {
  const dark = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const steps = [
    {
      key: "menu" as TourTargetKey,
      icon: "menu-outline" as IconName,
      title: "Menu থেকে Reports ও Settings",
      description:
        "উপরে বাঁ দিকের menu খুললে Reports, Settings এবং অন্য screen পাবেন।",
      bubble: { top: insets.top + 135, left: 20, right: 20 },
    },
    {
      key: "add" as TourTargetKey,
      icon: "add-outline" as IconName,
      title: "খরচ যোগ করুন",
      description: "এই + button-এ tap করে amount, category আর date দিন।",
      bubble: { bottom: insets.bottom + 250, left: 20, right: 20 },
    },
    {
      key: "expenses" as TourTargetKey,
      icon: "receipt-outline" as IconName,
      title: "সব খরচ",
      description: "এখানে date range, edit এবং delete option পাবেন।",
      bubble: { bottom: insets.bottom + 120, left: 20, right: 20 },
    },
    {
      key: "categories" as TourTargetKey,
      icon: "pricetags-outline" as IconName,
      title: "Category ও subcategory",
      description: "Category tab-এ custom category ও subcategory manage করুন।",
      bubble: { bottom: insets.bottom + 120, left: 20, right: 20 },
    },
    {
      key: "dashboard" as TourTargetKey,
      icon: "home-outline" as IconName,
      title: "Dashboard",
      description: "Home-এ monthly total, chart এবং recent expenses দেখুন।",
      bubble: { top: insets.top + 310, left: 20, right: 20 },
    },
  ];
  const current = steps[step];
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);
  const [bubbleRect, setBubbleRect] = useState<TourTargetRect | null>(null);
  const bubbleRef = useRef<View | null>(null);

  useEffect(() => {
    if (!visible) {
      setTargetRect(null);
      setBubbleRect(null);
      return;
    }
    setTargetRect(null);
    setBubbleRect(null);
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const target = targetRefs[current.key]?.current;
      if (!target) {
        if (attempts++ < 12) timer = setTimeout(measure, 70);
        return;
      }
      target.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        if (measuredWidth > 0 && measuredHeight > 0) {
          setTargetRect({
            x,
            y,
            width: measuredWidth,
            height: measuredHeight,
          });
        } else if (attempts++ < 12) {
          timer = setTimeout(measure, 70);
        }
      });
    };
    timer = setTimeout(measure, 70);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [current.key, targetRefs, visible]);

  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);
  const next = () => {
    if (step === steps.length - 1) onFinish();
    else setStep((currentStep) => currentStep + 1);
  };
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onFinish}
      statusBarTranslucent
    >
      <View style={styles.featureTourRoot}>
        {targetRect && bubbleRect && (
          <FeatureTourConnector
            target={targetRect}
            bubble={bubbleRect}
            targetKey={current.key}
            dark={dark}
          />
        )}
        <View
          ref={bubbleRef}
          onLayout={({ nativeEvent }) => {
            const { x, y, width: measuredWidth, height: measuredHeight } =
              nativeEvent.layout;
            setBubbleRect({
              x,
              y,
              width: measuredWidth,
              height: measuredHeight,
            });
          }}
          style={[
            styles.featureTourBubble,
            dark && darkStyles.featureTourBubble,
            current.bubble,
          ]}
        >
          <View style={styles.featureTourHeading}>
            <View
              style={[
                styles.featureTourIcon,
                dark && darkStyles.featureTourIcon,
              ]}
            >
              <Ionicons
                name={current.icon}
                size={21}
                color={dark ? "#a8e6bd" : PURPLE}
              />
            </View>
            <Text
              style={[
                styles.featureTourTitle,
                dark && darkStyles.featureTourTitle,
              ]}
            >
              {current.title}
            </Text>
          </View>
          <Text
            style={[
              styles.featureTourDescription,
              dark && darkStyles.featureTourDescription,
            ]}
          >
            {current.description}
          </Text>
          <View style={styles.featureTourFooter}>
            <View style={styles.featureTourDots}>
              {steps.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.featureTourDot,
                    dark && darkStyles.featureTourDot,
                    index === step && styles.featureTourDotActive,
                    index === step && dark && darkStyles.featureTourDotActive,
                  ]}
                />
              ))}
            </View>
            <Pressable style={styles.featureTourSkip} onPress={onFinish}>
              <Text
                style={[
                  styles.featureTourSkipText,
                  dark && darkStyles.featureTourSkipText,
                ]}
              >
                এড়িয়ে যান
              </Text>
            </Pressable>
            <Pressable
              style={styles.featureTourButton}
              onPress={next}
              android_ripple={{ color: "#ffffff33" }}
            >
              <Text style={styles.featureTourButtonText}>
                {step === steps.length - 1 ? "শেষ করুন" : "পরবর্তী"}
              </Text>
              <Ionicons
                name={step === steps.length - 1 ? "checkmark" : "arrow-forward"}
                size={17}
                color="#fff"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
