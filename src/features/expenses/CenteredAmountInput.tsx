import React, { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "../../i18n/Text";

export function CenteredAmountInput({ placeholder = "0", placeholderTextColor, onFocus, onBlur, ...props }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return <View style={s.container}>
    <TextInput {...props} placeholder="" textAlign="center"
      onFocus={event => { setFocused(true); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }} />
    {!props.value && !focused && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={s.hint}>
      <Text style={[s.zero, { color: placeholderTextColor }]}>{placeholder}</Text>
    </View>}
  </View>;
}

const s = StyleSheet.create({
  container: { width: "100%" },
  hint: { position: "absolute", left: 0, right: 0, top: 0, height: 60, alignItems: "center", justifyContent: "center" },
  zero: { fontSize: 30, fontWeight: "500", lineHeight: 40 },
});
