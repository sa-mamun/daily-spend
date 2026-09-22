import React, { useContext } from "react";
import { Text as RNText } from "react-native";
import { LanguageContext } from "../context/LanguageContext";
import { translateText } from "./translations";

export function Text(props: React.ComponentProps<typeof RNText>) {
  const { language } = useContext(LanguageContext);
  return (
    <RNText {...props}>
      {React.Children.map(props.children, (child) =>
        typeof child === "string" ? translateText(child, language) : child,
      )}
    </RNText>
  );
}
