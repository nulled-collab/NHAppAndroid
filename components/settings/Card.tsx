import { useTheme } from "@/lib/ThemeContext";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.tagBg, borderColor: colors.page },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
