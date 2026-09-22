import type { Language } from "../context/LanguageContext";

export const localDateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

export const today = () => localDateKey(new Date());

export const taka = (n: number, language: Language) =>
  `${language === "en" ? "Tk " : "৳"}${Number(n || 0).toLocaleString("en-IN")}`;

export const dateText = (value: string, language: Language) =>
  new Date(`${value}T00:00:00`).toLocaleDateString(
    language === "en" ? "en-GB" : "bn-BD",
    { day: "numeric", month: "short", year: "numeric" },
  );

export const dbDate = (value: Date) => localDateKey(value);
