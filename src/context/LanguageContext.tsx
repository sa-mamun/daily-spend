import React from "react";

export type Language = "en" | "bn";

export const LanguageContext = React.createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
}>({ language: "en", setLanguage: () => undefined });
