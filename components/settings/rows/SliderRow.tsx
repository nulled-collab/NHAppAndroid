import { useTheme } from "@/lib/ThemeContext";
import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange?: (v: number) => void;
  onCommit: (v: number) => void;
}

export default function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.sub }]}>
        {label}: {Math.round(value)}
      </Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        minimumTrackTintColor={colors.accent}
        thumbTintColor={colors.accent}
        onValueChange={onChange}
        onSlidingComplete={onCommit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: { fontSize: 14 },
  slider: { marginTop: 6 },
});
