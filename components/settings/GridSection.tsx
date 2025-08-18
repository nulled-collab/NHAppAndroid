import { searchBooks, type Book } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    GridProfile,
    defaultGridConfigMap,
    getGridConfigMap,
    resetGridConfigMap,
    setGridConfigMap,
    subscribeGridConfig,
} from "@/config/gridConfig";

function GridPreview({
  config,
  books,
  bg,
  line,
}: {
  config: { numColumns: number; paddingHorizontal: number; columnGap: number };
  books: Book[];
  bg: string;
  line: string;
}) {
  const [w, setW] = useState(0);
  const cols = Math.max(1, config.numColumns);
  const gap = Math.max(0, config.columnGap);
  const pad = Math.max(0, config.paddingHorizontal);
  const inner = Math.max(0, w - pad * 2);
  const itemW = cols > 0 ? (inner - gap * (cols - 1)) / cols : inner;
  const itemH = Math.round(itemW * 1.4);
  const row = books.slice(0, cols);
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: line,
        borderRadius: 12,
        paddingHorizontal: pad,
        paddingVertical: 10,
        backgroundColor: bg,
        marginTop: 8,
      }}
    >
      <View style={{ flexDirection: "row" }}>
        {row.map((b, i) => {
          const last = i === cols - 1;
          return (
            <View
              key={b.id}
              style={{ width: itemW, marginRight: last ? 0 : gap }}
            >
              <SmartImage
                sources={buildImageFallbacks(b.thumbnail)}
                style={{ width: itemW, height: itemH, borderRadius: 8 }}
              />
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, marginTop: 6, color: "#999" }}
              >
                {b.title.pretty}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const PROFILES: { key: GridProfile; title: string }[] = [
  { key: "phonePortrait", title: "Телефон · Портрет" },
  { key: "phoneLandscape", title: "Телефон · Альбом" },
  { key: "tabletPortrait", title: "Планшет · Портрет" },
  { key: "tabletLandscape", title: "Планшет · Альбом" },
];

export default function GridSection({
  activeProfile,
  setActiveProfile,
}: {
  activeProfile: GridProfile;
  setActiveProfile: (p: GridProfile) => void;
}) {
  const { colors } = useTheme();
  const [gridMap, setGridMapState] = useState(defaultGridConfigMap);
  const profCfg = gridMap[activeProfile];
  const [previewBooks, setPreviewBooks] = useState<Book[]>([]);

  useEffect(() => {
    (async () => setGridMapState(await getGridConfigMap()))();
    const unsub = subscribeGridConfig(setGridMapState);
    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await searchBooks({
          sort: "popular",
          page: 1,
          perPage: 24,
        });
        if (mounted) setPreviewBooks(res.books);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setNum = async (v: number) => {
    const next = Math.max(1, Math.min(8, Math.round(v)));
    await setGridConfigMap({
      [activeProfile]: { ...profCfg, numColumns: next },
    } as any);
  };
  const setPad = async (v: number) => {
    const next = Math.max(0, Math.min(32, Math.round(v)));
    await setGridConfigMap({
      [activeProfile]: { ...profCfg, paddingHorizontal: next },
    } as any);
  };
  const setGap = async (v: number) => {
    const next = Math.max(0, Math.min(24, Math.round(v)));
    await setGridConfigMap({
      [activeProfile]: { ...profCfg, columnGap: next },
    } as any);
  };
  const resetProfile = async () => {
    const def = defaultGridConfigMap[activeProfile];
    await setGridConfigMap({ [activeProfile]: def } as any);
  };
  const resetAll = async () => {
    await resetGridConfigMap();
  };

  const labelStyle = useMemo(
    () => [{ fontSize: 14, color: colors.sub }],
    [colors.sub]
  );

  const chipBg = (k: GridProfile) =>
    activeProfile === k ? colors.incBg : colors.tagBg;
  const chipFg = (k: GridProfile) =>
    activeProfile === k ? colors.incTxt : colors.tagText;
  const chipBr = (k: GridProfile) =>
    activeProfile === k ? colors.incTxt : "transparent";

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {PROFILES.map((p) => (
          <Pressable
            key={p.key}
            onPress={() => setActiveProfile(p.key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              backgroundColor: chipBg(p.key),
              borderColor: chipBr(p.key),
            }}
            android_ripple={{ color: colors.accent + "22", borderless: false }}
          >
            <Text
              style={{ color: chipFg(p.key), fontWeight: "700", fontSize: 12 }}
            >
              {p.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <GridPreview
        config={profCfg}
        books={previewBooks}
        bg={colors.bg}
        line={colors.page}
      />

      <View style={{ marginTop: 8 }}>
        <Text style={labelStyle as any}>Колонок: {profCfg.numColumns}</Text>
        <Slider
          minimumValue={1}
          maximumValue={8}
          step={1}
          value={profCfg.numColumns}
          minimumTrackTintColor={colors.accent}
          thumbTintColor={colors.accent}
          onSlidingComplete={setNum}
        />

        <Text style={labelStyle as any}>
          Отступы по бокам: {profCfg.paddingHorizontal}
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={32}
          step={1}
          value={profCfg.paddingHorizontal}
          minimumTrackTintColor={colors.accent}
          thumbTintColor={colors.accent}
          onSlidingComplete={setPad}
        />

        <Text style={labelStyle as any}>
          Интервал между колонками: {profCfg.columnGap}
        </Text>
        <Slider
          minimumValue={0}
          maximumValue={24}
          step={1}
          value={profCfg.columnGap}
          minimumTrackTintColor={colors.accent}
          thumbTintColor={colors.accent}
          onSlidingComplete={setGap}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 12,
        }}
      >
        <Pressable
          onPress={resetProfile}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            flex: 1,
            backgroundColor: colors.page,
          }}
          android_ripple={{ color: colors.accent + "22", borderless: false }}
        >
          <Feather name="rotate-ccw" size={16} color={colors.searchTxt} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 0.2,
              textAlign: "center",
              color: colors.searchTxt,
            }}
          >
            Сбросить профиль
          </Text>
        </Pressable>

        <Pressable
          onPress={resetAll}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
            flex: 1,
            backgroundColor: colors.accent,
          }}
          android_ripple={{ color: "#ffffff22", borderless: false }}
        >
          <Feather name="trash-2" size={16} color={colors.bg} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 0.2,
              textAlign: "center",
              color: colors.bg,
            }}
          >
            Сбросить всё
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
