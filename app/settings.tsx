// app/settings.tsx
import { searchBooks, type Book } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import {
  GridConfigMap,
  GridProfile,
  defaultGridConfigMap,
  getGridConfigMap,
  resetGridConfigMap,
  setGridConfigMap,
  subscribeGridConfig,
} from "@/config/gridConfig";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import { setStatusBarHidden } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const STORAGE_KEY_HUE = "themeHue";
const FS_KEY = "ui_fullscreen";
const RH_KEY = "reader_hide_hints";

const PROFILES: { key: GridProfile; title: string }[] = [
  { key: "phonePortrait", title: "Телефон · Портрет" },
  { key: "phoneLandscape", title: "Телефон · Альбом" },
  { key: "tabletPortrait", title: "Планшет · Портрет" },
  { key: "tabletLandscape", title: "Планшет · Альбом" },
];

function systemProfileForDims(w: number, h: number): GridProfile {
  const isLandscape = w > h;
  const isTablet = Math.min(w, h) >= 600;
  if (isTablet && isLandscape) return "tabletLandscape";
  if (isTablet && !isLandscape) return "tabletPortrait";
  if (!isTablet && isLandscape) return "phoneLandscape";
  return "phonePortrait";
}

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

export default function SettingsScreen() {
  const router = useRouter();
  const { hue, setHue, colors } = useTheme();
  const { width, height } = useWindowDimensions();

  const [localHue, setLocalHue] = useState(hue);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [hideHints, setHideHints] = useState<boolean>(false);

  const [gridMap, setGridMapState] =
    useState<GridConfigMap>(defaultGridConfigMap);
  const sysProfile = systemProfileForDims(width, height);
  const [activeProfile, setActiveProfile] = useState<GridProfile>(sysProfile);

  const [previewBooks, setPreviewBooks] = useState<Book[]>([]);

  useEffect(() => {
    setActiveProfile(sysProfile);
  }, [sysProfile]);

  useEffect(() => {
    setLocalHue(hue);
  }, [hue]);

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem(STORAGE_KEY_HUE);
      const deg = Number(v);
      if (!Number.isNaN(deg)) setHue(deg);
      const fs = await AsyncStorage.getItem(FS_KEY);
      setFullscreen(fs === "1");
      const hh = await AsyncStorage.getItem(RH_KEY);
      setHideHints(hh === "1");
      const m = await getGridConfigMap();
      setGridMapState(m);
    })();
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

  const onSlide = (deg: number) => setLocalHue(deg);

  const onComplete = (deg: number) => {
    setHue(deg);
    AsyncStorage.setItem(STORAGE_KEY_HUE, String(deg));
  };

  const toggleFullscreen = async (value: boolean) => {
    setFullscreen(value);
    await AsyncStorage.setItem(FS_KEY, value ? "1" : "0");
    try {
      (globalThis as any).__setFullscreen?.(value);
    } catch {}
    try {
      setStatusBarHidden(value, "fade");
    } catch {}
    if (Platform.OS === "android") {
      try {
        if (value) {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setButtonStyleAsync("light");
        } else {
          await NavigationBar.setVisibilityAsync("visible");
          await NavigationBar.setButtonStyleAsync("light");
        }
      } catch (e) {
        console.warn("[settings] expo-navigation-bar failed:", e);
      }
    }
  };

  const toggleHideHints = async (value: boolean) => {
    setHideHints(value);
    await AsyncStorage.setItem(RH_KEY, value ? "1" : "0");
    try {
      (globalThis as any).__setReaderHideHints?.(value);
    } catch {}
  };

  const profCfg = gridMap[activeProfile];
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

  const chipBg = (k: GridProfile) =>
    activeProfile === k ? colors.incBg : colors.tagBg;
  const chipFg = (k: GridProfile) =>
    activeProfile === k ? colors.incTxt : colors.tagText;
  const chipBr = (k: GridProfile) =>
    activeProfile === k ? colors.incTxt : "transparent";

  const labelStyle = useMemo<StyleProp<TextStyle>>(
    () => [styles.label, { color: colors.sub }],
    [colors.sub]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: 7,
            backgroundColor: colors.searchBg,
            borderColor: colors.page,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          android_ripple={{ color: "#ffffff22", borderless: false }}
        >
          <Feather name="arrow-left" size={20} color={colors.searchTxt} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.searchTxt }]}>
          Настройки
        </Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={[styles.page, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingTop: 7, paddingBottom: 24 }}
        contentInsetAdjustmentBehavior="never"
      >
        <Text style={[styles.sectionTitle, { color: colors.txt }]}>
          Оформление
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.tagBg, borderColor: colors.page },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.txt }]}>
              Тема приложения
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.sub }]}>
              Оттенок: {Math.round(localHue)}°
            </Text>
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={360}
              step={1}
              value={localHue}
              minimumTrackTintColor={colors.accent}
              thumbTintColor={colors.accent}
              onValueChange={onSlide}
              onSlidingComplete={onComplete}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.txt }]}>Экран</Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.tagBg, borderColor: colors.page },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.txt }]}>
                Полноэкранный режим
              </Text>
              <Text style={[styles.desc, { color: colors.sub }]}>
                Скрывать статус-бар и нижнюю системную панель. Контент — от края
                до края.
              </Text>
            </View>
            <Switch
              value={fullscreen}
              onValueChange={toggleFullscreen}
              thumbColor={fullscreen ? colors.accent : undefined}
              trackColor={{ true: colors.accent, false: colors.page }}
            />
          </View>
          <View
            style={[
              styles.noteBox,
              { borderColor: colors.page, backgroundColor: colors.bg },
            ]}
          >
            <Text style={[styles.note, { color: colors.sub }]}>
              На Android панели можно вызвать жестом снизу даже в fullscreen.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.txt }]}>Чтение</Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.tagBg, borderColor: colors.page },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.cardTitle, { color: colors.txt }]}>
                Скрывать подсказки
              </Text>
              <Text style={[styles.desc, { color: colors.sub }]}>
                Прятать обучающие подсказки, оверлеи и подсветки жестов в режиме
                чтения.
              </Text>
            </View>
            <Switch
              value={hideHints}
              onValueChange={toggleHideHints}
              thumbColor={hideHints ? colors.accent : undefined}
              trackColor={{ true: colors.accent, false: colors.page }}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.txt }]}>
          Сетка каталога
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.tagBg, borderColor: colors.page },
          ]}
        >
          <View style={styles.rowWrap}>
            {PROFILES.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setActiveProfile(p.key)}
                style={[
                  styles.profileChip,
                  {
                    backgroundColor: chipBg(p.key),
                    borderColor: chipBr(p.key),
                  },
                ]}
                android_ripple={{
                  color: colors.accent + "22",
                  borderless: false,
                }}
              >
                <Text
                  style={{
                    color: chipFg(p.key),
                    fontWeight: "700",
                    fontSize: 12,
                  }}
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

          <View style={styles.ctrlRow}>
            <Text style={labelStyle}>Колонок: {profCfg.numColumns}</Text>
            <Slider
              style={styles.ctrlSlider}
              minimumValue={1}
              maximumValue={8}
              step={1}
              value={profCfg.numColumns}
              minimumTrackTintColor={colors.accent}
              thumbTintColor={colors.accent}
              onSlidingComplete={setNum}
            />
          </View>

          <View style={styles.ctrlRow}>
            <Text style={labelStyle}>
              Отступы по бокам: {profCfg.paddingHorizontal}
            </Text>
            <Slider
              style={styles.ctrlSlider}
              minimumValue={0}
              maximumValue={32}
              step={1}
              value={profCfg.paddingHorizontal}
              minimumTrackTintColor={colors.accent}
              thumbTintColor={colors.accent}
              onSlidingComplete={setPad}
            />
          </View>

          <View style={styles.ctrlRow}>
            <Text style={labelStyle}>
              Интервал между колонками: {profCfg.columnGap}
            </Text>
            <Slider
              style={styles.ctrlSlider}
              minimumValue={0}
              maximumValue={24}
              step={1}
              value={profCfg.columnGap}
              minimumTrackTintColor={colors.accent}
              thumbTintColor={colors.accent}
              onSlidingComplete={setGap}
            />
          </View>

          <View style={styles.rowBetween}>
            <Pressable
              onPress={resetProfile}
              style={[styles.resetBtn, { backgroundColor: colors.page }]}
              android_ripple={{
                color: colors.accent + "22",
                borderless: false,
              }}
            >
              <Feather name="rotate-ccw" size={16} color={colors.searchTxt} />
              <Text style={[styles.resetTxt, { color: colors.searchTxt }]}>
                Сбросить профиль
              </Text>
            </Pressable>

            <Pressable
              onPress={resetAll}
              style={[styles.resetBtn, { backgroundColor: colors.accent }]}
              android_ripple={{ color: "#ffffff22", borderless: false }}
            >
              <Feather name="trash-2" size={16} color={colors.bg} />
              <Text style={[styles.resetTxt, { color: colors.bg }]}>
                Сбросить всё
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.caption, { color: colors.txt }]}>
          v{Constants.expoConfig?.version}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "700", marginLeft: 6 },
  iconBtn: { padding: 8, borderRadius: 10, overflow: "hidden" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.6,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: { marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  label: { fontSize: 14 },
  sliderWrap: { marginTop: 8 },
  desc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  noteBox: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  note: { fontSize: 11 },
  caption: { textAlign: "center", opacity: 0.5, marginVertical: 24 },
  profileChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctrlRow: {
    marginTop: 8,
  },
  ctrlSlider: {
    marginTop: 6,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
  },
  resetTxt: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
