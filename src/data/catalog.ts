import type { IconName } from "../types/models";

export const defaults: Array<[string, IconName]> = [
  ["খাবার", "restaurant-outline"],
  ["যাতায়াত", "car-outline"],
  ["শপিং", "cart-outline"],
  ["বিল ও ইউটিলিটি", "bulb-outline"],
  ["স্বাস্থ্য", "medical-outline"],
  ["বিনোদন", "game-controller-outline"],
];

export const defaultSubcategories: Record<string, string[]> = {
  খাবার: ["Breakfast", "Lunch", "Dinner", "Snacks", "Tea/Coffee"],
  যাতায়াত: ["Bus", "Rickshaw", "CNG", "Ride Share", "Fuel"],
  শপিং: ["Clothes", "Grocery", "Electronics", "Personal Care"],
  "বিল ও ইউটিলিটি": ["Electricity", "Internet", "Mobile Bill", "Gas"],
  স্বাস্থ্য: ["Medicine", "Doctor", "Test"],
  বিনোদন: ["Movies", "Games", "Travel"],
};

export const categoryIcons: IconName[] = [
  "restaurant-outline",
  "car-outline",
  "cart-outline",
  "bulb-outline",
  "medical-outline",
  "game-controller-outline",
  "book-outline",
  "home-outline",
  "card-outline",
  "gift-outline",
  "paw-outline",
  "sparkles-outline",
];

export const legacyIconMap: Record<string, IconName> = {
  "🍜": "restaurant-outline",
  "🚕": "car-outline",
  "🛍️": "cart-outline",
  "💡": "bulb-outline",
  "💊": "medical-outline",
  "🎮": "game-controller-outline",
  "📚": "book-outline",
  "🏠": "home-outline",
  "💳": "card-outline",
  "🎁": "gift-outline",
  "🐾": "paw-outline",
  "✨": "sparkles-outline",
};

export const categoryIconName = (value: string): IconName =>
  legacyIconMap[value] || (value as IconName);
