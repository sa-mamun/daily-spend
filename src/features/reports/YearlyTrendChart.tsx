import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { ThemeContext } from "../../theme/constants";
import { useContext } from "react";

type ChartItem = { label: string; value: number };

function chartAmount(value: number, language: "en" | "bn") {
  const currency = language === "en" ? "Tk " : "৳";
  return value >= 1000
    ? `${currency}${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    : `${currency}${Math.round(value)}`;
}

export function YearlyTrendChart({
  items,
  language,
}: {
  items: ChartItem[];
  language: "en" | "bn";
}) {
  const dark = useContext(ThemeContext);
  const width = Math.max(360, items.length * 54);
  const height = 174;
  const left = 28;
  const right = 28;
  const top = 25;
  const baseline = 130;
  const max = Math.max(...items.map((item) => item.value), 1);
  const step = items.length > 1 ? (width - left - right) / (items.length - 1) : 0;
  const points = items.map((item, index) => ({
    ...item,
    x: left + step * index,
    y: baseline - (item.value / max) * (baseline - top),
  }));
  const path = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
  ).join(" ");
  const gridColor = dark ? "#343c52" : "#e7eaf1";
  const labelColor = dark ? "#b7bbce" : "#62677b";
  const mutedColor = dark ? "#a7acc0" : "#8a8fa3";
  const lineColor = dark ? "#76dda0" : "#087443";
  const surfaceColor = dark ? "#202536" : "#fff";

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <Svg width={width} height={height} accessibilityLabel="Yearly expense trend">
        <Line x1={left} y1={top + 2} x2={width - right} y2={top + 2} stroke={gridColor} strokeWidth={1} />
        <Line x1={left} y1={(top + baseline) / 2} x2={width - right} y2={(top + baseline) / 2} stroke={gridColor} strokeWidth={1} />
        <Line x1={left} y1={baseline} x2={width - right} y2={baseline} stroke={gridColor} strokeWidth={1} />
        <Path d={`${path} L ${width - right} ${baseline} L ${left} ${baseline} Z`} fill={dark ? "#76dda01f" : "#08744316"} />
        <Path d={path} fill="none" stroke={lineColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <React.Fragment key={point.label}>
            <SvgText
              x={point.x}
              y={Math.max(12, point.y - 10)}
              fill={labelColor}
              fontSize={9}
              fontWeight="700"
              textAnchor="middle"
            >
              {point.value ? chartAmount(point.value, language) : "—"}
            </SvgText>
            <Circle cx={point.x} cy={point.y} r={5} fill={surfaceColor} stroke={lineColor} strokeWidth={2.5} />
            <SvgText
              x={point.x}
              y={158}
              fill={mutedColor}
              fontSize={9}
              fontWeight="600"
              textAnchor="middle"
            >
              {point.label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    minWidth: "100%",
    height: 174,
    alignItems: "flex-end",
    paddingTop: 0,
    paddingHorizontal: 0,
  },
});
