import { MINT, mintTheme } from "../../theme/mint";

// Budget Orbit / Balanced: approved dashboard mockup, 12px card corners.
export const ORBIT_CARD_RADIUS = 13;
export const ORBIT_CHROME = {
  headerHeight: 60,
  contentGap: 10,
  navHeight: 68,
  navButtonHeight: 52,
  navPadding: 8,
} as const;
export function orbitTheme(dark: boolean) {
  return {
    ...mintTheme(dark),
    accent: mintTheme(dark).accentText,
    mint: MINT,
    warning: dark ? "#f1ce8e" : "#825609",
    danger: dark ? "#ffb4bb" : "#a52c43",
  };
}
