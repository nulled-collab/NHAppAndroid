import React from "react";
import { View, type ViewProps } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { useTheme } from "@/lib/ThemeContext";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const scheme = useColorScheme() ?? "light";
  const { colors } = useTheme();

  const backgroundColor =
    scheme === "light"
      ? lightColor ?? colors.bg
      : darkColor ?? colors.bg;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
