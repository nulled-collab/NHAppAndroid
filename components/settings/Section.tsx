import { useTheme } from "@/lib/ThemeContext";
import React from "react";
import { StyleSheet, Text } from "react-native";

export default function Section({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: colors.txt }]}>{title}</Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.6,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
});