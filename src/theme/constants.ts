import React from "react";

export const PURPLE = "#087443";
// Design rule: every dark-mode modal surface uses this shared lighter dark color.
export const DARK_MODAL_SURFACE = "#24283a";
export const CARD_RADIUS = { borderRadius: 16 } as const;
export const CHART_LABEL_SPACING = { marginBottom: 0 } as const;
export const CHART_NO_BORDER = { borderBottomWidth: 0 } as const;
export const GLASS_NAV = { backgroundColor: "rgba(255,255,255,0.72)" } as const;
export const COMPACT_NAV = { height: 62, paddingTop: 4 } as const;
export const COMPACT_NAV_BUTTON = { height: 54 } as const;
export const COMPACT_NAV_ICON = { fontSize: 19 } as const;
export const COMPACT_NAV_LABEL = { fontSize: 10 } as const;
export const MAX_EXPENSE_AMOUNT = 10_000_000;
export const MAX_NOTE_LENGTH = 120;
export const MAX_NAME_LENGTH = 32;

export const ThemeContext = React.createContext(false);
