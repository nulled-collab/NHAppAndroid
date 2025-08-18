import { useTheme } from "@/lib/ThemeContext";
import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

interface Props {
  title: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function SwitchRow({
  title,
  description,
  value,
  onChange,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.rowBetween}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.cardTitle, { color: colors.txt }]}>{title}</Text>
        {description ? (
          <Text style={[styles.desc, { color: colors.sub }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? colors.accent : undefined}
        trackColor={{ true: colors.accent, false: colors.page }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  desc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
});
