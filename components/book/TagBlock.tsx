import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { memo, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export type TagLite = { type: string; name: string; count?: number };

const keyOf = (t: TagLite, group: string) => `${group}:${t.type}:${t.name}`;

export const TagBlock = memo(function TagBlock({
  label,
  tags,
  modeOf,
  cycle,
  onTagPress,
}: {
  label: string;
  tags?: TagLite[];
  modeOf: (t: TagLite) => "include" | "exclude" | undefined;
  cycle: (t: TagLite) => void;
  onTagPress: (name: string) => void;
}) {
  const { colors } = useTheme();
  if (!tags?.length) return null;

  const incColor = (colors as any).incTxt ?? colors.accent;
  const excColor = (colors as any).excTxt ?? "#FF5A5F";

  const optimistic = useRef(
    new Map<string, "include" | "exclude" | undefined>()
  );
  const timers = useRef(new Map<string, any>());
  const [rev, setRev] = useState(0);

  const getNext = (cur: "include" | "exclude" | undefined) =>
    cur === "include" ? "exclude" : cur === "exclude" ? undefined : "include";

  const setOptimistic = (
    k: string,
    next: "include" | "exclude" | undefined
  ) => {
    optimistic.current.set(k, next);
    setRev((x) => x + 1);
    const prev = timers.current.get(k);
    if (prev) clearTimeout(prev);
    const tid = setTimeout(() => {
      optimistic.current.delete(k);
      timers.current.delete(k);
      setRev((x) => x + 1);
    }, 600);
    timers.current.set(k, tid);
  };

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      optimistic.current.clear();
    };
  }, []);

  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          color: colors.title,
          fontSize: 13,
          fontWeight: "700",
          marginBottom: 6,
          letterSpacing: 0.2,
        }}
      >
        {label}:
      </Text>

      <View style={styles.wrap}>
        {tags.map((t) => {
          const k = keyOf(t, label);
          const real = modeOf(t);
          const optimisticMode = optimistic.current.get(k);
          const mode = optimisticMode !== undefined ? optimisticMode : real;

          const iconName =
            mode === "include"
              ? "check-circle"
              : mode === "exclude"
              ? "minus-circle"
              : "plus-circle";

          const borderColor =
            mode === "include"
              ? incColor
              : mode === "exclude"
              ? excColor
              : "transparent";

          return (
            <View key={k} style={styles.roundWrap}>
              <Pressable
                onPress={() => onTagPress(t.name)}
                onLongPress={() => Clipboard.setStringAsync(t.name)}
                android_ripple={{
                  color: colors.accent + "1A",
                  borderless: false,
                  radius: 999,
                }}
                style={({ pressed }) => [
                  styles.tagBox,
                  {
                    backgroundColor: colors.tagBg,
                    borderColor,
                  },
                  pressed &&
                    Platform.select({
                      ios: { opacity: 0.88, transform: [{ scale: 0.995 }] },
                      android: { opacity: 0.97 },
                    }),
                ]}
              >
                <Text
                  style={[styles.tagTxt, { color: colors.tagText }]}
                  numberOfLines={1}
                >
                  {t.name}
                </Text>

                {!!t.count && (
                  <View
                    style={[styles.badge, { backgroundColor: colors.page }]}
                  >
                    <Text style={[styles.badgeTxt, { color: colors.metaText }]}>
                      {t.count}
                    </Text>
                  </View>
                )}

                <View style={styles.iconWrap}>
                  <Pressable
                    hitSlop={10}
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      const next = getNext(mode);
                      setOptimistic(k, next);
                      cycle(t);
                    }}
                    android_ripple={{
                      color: (mode === "exclude" ? excColor : incColor) + "22",
                      borderless: false,
                      radius: 999,
                    }}
                    style={({ pressed }) => [
                      styles.iconBtn,
                      pressed &&
                        Platform.select({
                          ios: { opacity: 0.85 },
                          android: { opacity: 0.92 },
                        }),
                    ]}
                    accessibilityRole="button"
                  >
                    <Feather
                      name={iconName as any}
                      size={16}
                      color={mode === "exclude" ? excColor : incColor}
                    />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roundWrap: {
    borderRadius: 999,
    overflow: "hidden",
  },
  tagBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 2,
    paddingLeft: 12,
    paddingRight: 2,
    borderWidth: 1,
  },
  tagTxt: {
    fontSize: 12.5,
    fontWeight: "500",
    maxWidth: 220,
  },
  badge: {
    marginLeft: 6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { fontSize: 10, fontWeight: "600" },

  iconWrap: {
    marginLeft: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  iconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default TagBlock;
