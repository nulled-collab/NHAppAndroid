import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Блок с тегами (мемоизирован)
export const TagBlock = memo(function TagBlock({
  label,
  tags,
  modeOf,
  cycle,
  onTagPress,
}: {
  label: string;
  tags?: { type: string; name: string; count?: number }[];
  modeOf: (t: { type: string; name: string }) => string | undefined;
  cycle: (t: { type: any; name: string }) => void;
  onTagPress: (name: string) => void;
}) {
  const { colors } = useTheme();
  if (!tags?.length) return null;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: colors.title, fontSize: 13, fontWeight: "600", marginBottom: 6 }}>
        {label}:
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tags.map((t) => {
          const mode = modeOf(t);
          const icon =
            mode === "include" ? "check-circle"
            : mode === "exclude" ? "minus-circle"
            : "plus-circle";
          return (
            <Pressable
              key={`${label}:${t.name}`}
              onPress={() => onTagPress(t.name)}
              onLongPress={() => Clipboard.setStringAsync(t.name)}
              style={[
                styles.tagBox,
                { backgroundColor: colors.tagBg, borderColor: "transparent" },
                mode === "include" && { borderWidth: 1, borderColor: colors.incTxt },
                mode === "exclude" && { borderWidth: 1, borderColor: colors.excTxt },
              ]}
            >
              <Text style={[styles.tagTxt, { color: colors.tagText }]}>
                {t.name} {t.count ? `(${t.count})` : ""}
              </Text>
              <Feather
                name={icon as any}
                size={14}
                color={mode === "exclude" ? colors.excTxt : colors.incTxt}
                style={{ marginLeft: 4 }}
                onPress={() => cycle({ type: t.type as any, name: t.name })}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tagBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
  },
  tagTxt: { fontSize: 12, paddingRight: 2 },
});

export default TagBlock;
