import React from "react";

export const PURPLE = "#78520e";
// User-approved rule: destructive confirmation modals retain this lighter dark surface.
export const DARK_MODAL_SURFACE = "#24283a";
export const CARD_RADIUS = { borderRadius: 13 } as const;
export const CHART_LABEL_SPACING = { marginBottom: 0 } as const;
export const CHART_NO_BORDER = { borderBottomWidth: 0 } as const;
export const GLASS_NAV = { backgroundColor: "#efebe2" } as const;
export const COMPACT_NAV = { height: 68, paddingTop: 7 } as const;
export const COMPACT_NAV_BUTTON = { height: 54 } as const;
export const COMPACT_NAV_ICON = { fontSize: 19 } as const;
export const COMPACT_NAV_LABEL = { fontSize: 11 } as const;
export const MAX_EXPENSE_AMOUNT = 10_000_000;
export const MAX_BUDGET_AMOUNT = 1_000_000_000;
export const MAX_NOTE_LENGTH = 120;
export const MAX_NAME_LENGTH = 32;

export const ThemeContext = React.createContext(false);
