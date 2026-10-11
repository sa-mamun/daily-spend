// Cream Balance semantic tokens. Legacy export names keep feature imports stable.
export const MINT = "#dfa43e";
export const MINT_INK = "#181713";
export const MINT_MODAL_SURFACE = "#353229";
export const MINT_HERO_LIGHT = ["#ffffff", "#ffffff"] as const;
export const MINT_HERO_DARK = ["#2a2924", "#2a2924"] as const;
export function mintTheme(dark: boolean) {
  return {
    background: dark ? "#1b1b18" : "#efebe2",
    surface: dark ? "#2a2924" : "#ffffff",
    chrome: dark ? "#1b1b18" : "#efebe2",
    text: dark ? "#f5f0e6" : "#181713",
    muted: dark ? "#b9b2a4" : "#686358",
    border: dark ? "#454035" : "#e8e4db",
    soft: dark ? "#48391f" : "#f7ead0",
    accentText: dark ? "#edc176" : "#78520e",
    heroText: dark ? "#f5f0e6" : "#181713",
    primary: dark ? "#f4eedf" : "#181713",
    primaryText: dark ? "#1b1b18" : "#ffffff",
    success: dark ? "#91c5a7" : "#257850",
  };
}
