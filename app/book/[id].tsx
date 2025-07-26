import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg"; // ◀─ свой индикатор

import { Book, getBook, loadBookFromLocal } from "@/api/nhentai";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { hsbToHex } from "@/constants/Colors";
import { useFilterTags } from "@/context/TagFilterContext";

/* ---------- static ---------- */
const { width: W } = Dimensions.get("window");
const HEADER_H = 48 + (StatusBar.currentHeight ?? 0);
const GAP = 8;
const FAB_SIZE = 44;
const COLS_KEY = "galleryColumns";
const FAVORITES = "bookFavorites";

const bg = hsbToHex({ saturation: 76, brightness: 25 });
const text = hsbToHex({ saturation: 20, brightness: 240 });
const meta = hsbToHex({ saturation: 40, brightness: 160 });
const accent = hsbToHex({ saturation: 76, brightness: 200 });
const tagBg = hsbToHex({ saturation: 60, brightness: 60 });
const tagColor = accent;
const excColor = hsbToHex({ saturation: 0, brightness: 220 });

/* ---------- helpers ---------- */
const timeAgo = (d: string | number) => {
  const t = typeof d === "string" ? Date.parse(d) : d * 1000;
  const s = Math.floor((Date.now() - t) / 1000);
  const tbl: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [u, n] of tbl)
    if (s >= n) {
      const v = Math.floor(s / n);
      return `${v} ${u}${v > 1 ? "s" : ""} ago`;
    }
  return "just now";
};
const sanitize = (s: string) => s.replace(/[^a-z0-9_\-]+/gi, "_");

/* ---------- маленький SVG-кружок ---------- */
const Ring = ({
  progress,
  size = 22,
  stroke = 3,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - progress);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={accent}
        strokeOpacity={0.3}
        strokeWidth={stroke}
        fill="none"
      />
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={accent}
        strokeWidth={stroke}
        strokeDasharray={`${c}`}
        strokeDashoffset={off}
        strokeLinecap="round"
        fill="none"
        rotation={-90}
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
};

/* ---------- component ---------- */
export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { filters, cycle } = useFilterTags();

  /* refs / anim */
  const listRef = useRef<FlatList>(null);
  const scrollY = useRef(0);
  const headerY = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  /* state */
  const [book, setBook] = useState<Book | null>(null);
  const [cols, setCols] = useState(1);
  const [liked, setLiked] = useState(false);
  const [dl, setDL] = useState(false);
  const [pr, setPr] = useState(0); // 0-1
  const [local, setLocal] = useState(false);

  /* ---------- load book (online / offline) ---------- */
  useEffect(() => {
    (async () => {
      const bLocal = await loadBookFromLocal(+id);
      if (bLocal) {
        setBook(bLocal);
        setLocal(true);
        return;
      }
      try {
        setBook(await getBook(+id));
      } catch {
        ToastAndroid.show("Unable to load", ToastAndroid.LONG);
        router.back();
      }
    })();
  }, [id]);

  /* ---------- grid columns ---------- */
  useEffect(() => {
    AsyncStorage.getItem(COLS_KEY).then((s) =>
      setCols(Math.min(Math.max(parseInt(s ?? "1") || 1, 1), 3))
    );
  }, []);
  const cycleCols = () => {
    const keep = scrollY.current;
    setCols((c) => {
      const n = c === 3 ? 1 : c + 1;
      AsyncStorage.setItem(COLS_KEY, String(n));
      return n;
    });
    setTimeout(
      () => listRef.current?.scrollToOffset({ offset: keep, animated: false }),
      0
    );
  };

  /* ---------- favorites ---------- */
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES).then((j) => {
      const arr: number[] = j ? JSON.parse(j) : [];
      setLiked(arr.includes(+id));
    });
  }, [id]);
  const toggleLike = async () => {
    const j = await AsyncStorage.getItem(FAVORITES);
    const arr: number[] = j ? JSON.parse(j) : [];
    const next = arr.includes(+id)
      ? arr.filter((x) => x !== +id)
      : [...arr, +id];
    setLiked(!arr.includes(+id));
    await AsyncStorage.setItem(FAVORITES, JSON.stringify(next));
  };

  /* ---------- download / delete ---------- */
  const handleDownloadOrDelete = async () => {
    if (!book || dl) return;

    const lang = book.languages?.[0]?.name ?? "Unknown";
    const title = sanitize(book.title.pretty);
    const dir = `${FileSystem.documentDirectory}NHAppAndroid/${
      book.id
    }_${title}/${sanitize(lang)}/`;

    setDL(true);
    setPr(0);

    try {
      /* ----- delete ----- */
      if (local) {
        // Ищем фактический путь, где лежит метадата
        const nhDir = `${FileSystem.documentDirectory}NHAppAndroid/`;
        const titles = await FileSystem.readDirectoryAsync(nhDir);

        for (const title of titles) {
          const titleDir = `${nhDir}${title}/`;
          const langs = await FileSystem.readDirectoryAsync(titleDir);

          for (const lang of langs) {
            const langDir = `${titleDir}${lang}/`;
            const metaUri = `${langDir}metadata.json`;

            const info = await FileSystem.getInfoAsync(metaUri);
            if (!info.exists) continue;

            try {
              const raw = await FileSystem.readAsStringAsync(metaUri);
              const meta = JSON.parse(raw);
              if (meta.id !== book.id) continue;

              // 🗑 Удаляем всю папку книги (включая все языки)
              await FileSystem.deleteAsync(titleDir, { idempotent: true });

              ToastAndroid.show("Deleted", ToastAndroid.SHORT);
              setLocal(false);
              setBook(null);
              router.back();
              return;
            } catch (e) {
              console.warn("Failed to parse metadata for deletion:", e);
              continue;
            }
          }
        }

        ToastAndroid.show("Book not found locally", ToastAndroid.SHORT);
        return;
      }

      /* ----- download (по очереди) ----- */
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      for (let i = 0; i < book.pages.length; i++) {
        const p = book.pages[i];
        const num = (i + 1).toString().padStart(3, "0");
        const ext = p.url.split(".").pop()!.split("?")[0];
        const uri = `${dir}Image${num}.${ext}`;

        if (!(await FileSystem.getInfoAsync(uri)).exists)
          await FileSystem.downloadAsync(p.url, uri);

        /* обновляем объект страницы и прогресс */
        book.pages[i] = { ...p, url: uri, urlThumb: uri };
        setPr((i + 1) / book.pages.length);
      }

      /* сохраняем метадату */
      await FileSystem.writeAsStringAsync(
        `${dir}metadata.json`,
        JSON.stringify(book),
        { encoding: "utf8" }
      );
      ToastAndroid.show("Saved", ToastAndroid.SHORT);
      setLocal(true);
    } catch (e) {
      console.error(e);
      ToastAndroid.show("Error", ToastAndroid.LONG);
    } finally {
      setDL(false);
      setPr(0);
    }
  };

  /* ---------- tag helpers ---------- */
  const modeOf = useCallback(
    (t: { type: string; name: string }) =>
      filters.find((f) => f.type === t.type && f.name === t.name)?.mode,
    [filters]
  );
  const dedupTags = useMemo(() => {
    if (!book) return [];
    const skip = new Set(
      [
        ...(book.artists ?? []),
        ...(book.characters ?? []),
        ...(book.parodies ?? []),
        ...(book.groups ?? []),
        ...(book.categories ?? []),
        ...(book.languages ?? []),
      ].map((t) => t.name)
    );
    return book.tags.filter((t) => !skip.has(t.name));
  }, [book]);

  /* ---------- TagBlock ---------- */
  const TagBlock = memo(
    ({
      label,
      tags,
    }: {
      label: string;
      tags?: { type: string; name: string; count?: number }[];
    }) =>
      tags?.length ? (
        <View style={styles.tagBlock}>
          <Text style={styles.tagBlockTitle}>{label}:</Text>
          <View style={styles.tagsWrap}>
            {tags.map((t) => {
              const mode = modeOf(t);
              const icon =
                mode === "include"
                  ? "check-circle"
                  : mode === "exclude"
                  ? "minus-circle"
                  : "plus-circle";
              return (
                <Pressable
                  key={`${label}:${t.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/explore",
                      params: { query: t.name },
                    })
                  }
                  onLongPress={() => Clipboard.setStringAsync(t.name)}
                  style={[
                    styles.tagBox,
                    mode === "include" && styles.tagBoxInc,
                    mode === "exclude" && styles.tagBoxExc,
                  ]}
                >
                  <Text style={styles.tagTxt}>
                    {t.name} {t.count ? `(${t.count})` : ""}
                  </Text>
                  <Feather
                    name={icon as any}
                    size={14}
                    color={mode === "exclude" ? excColor : accent}
                    style={{ marginLeft: 4 }}
                    onPress={() => cycle({ type: t.type as any, name: t.name })}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null
  );

  /* ---------- show / hide header & fab ---------- */
  const animateHeader = (show: boolean) =>
    Animated.timing(headerY, {
      toValue: show ? 0 : -HEADER_H,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  const animateFab = (show: boolean) =>
    Animated.timing(fabScale, {
      toValue: show ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - scrollY.current;
    scrollY.current = y;
    if (dy > 10 && y > HEADER_H * 2) animateHeader(false), animateFab(true);
    if (dy < -10) animateHeader(true), animateFab(y > HEADER_H);
    if (y < HEADER_H) animateFab(false);
  };
  const scrollTop = () =>
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

  /* ---------- loading ---------- */
  if (!book)
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: "center" }}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );

  /* ---------- UI ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* top-bar */}
      <Animated.View
        style={[styles.topBar, { transform: [{ translateY: headerY }] }]}
      >
        <Pressable onPress={() => router.back()} style={styles.hit}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Pressable
          onLongPress={() => Clipboard.setStringAsync(String(book.id))}
          style={{ flex: 1 }}
        >
          <Text numberOfLines={1} style={styles.barTitle}>
            {book.title.pretty}
          </Text>
        </Pressable>
      </Animated.View>

      {/* gallery list */}
      <FlatList
        ref={listRef}
        data={book.pages}
        key={cols}
        numColumns={cols}
        onScroll={onScroll}
        scrollEventThrottle={16}
        columnWrapperStyle={cols > 1 && { gap: GAP }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        ListHeaderComponent={
          <View style={{ marginTop: HEADER_H }}>
            {/* cover */}
            <Pressable
              onPress={() =>
                router.push({ pathname: "/read", params: { id, page: "1" } })
              }
            >
              <ExpoImage
                source={buildImageFallbacks(book.cover)}
                style={{ width: W, aspectRatio: book.coverW / book.coverH }}
                contentFit="cover"
                cachePolicy="disk"
              />
            </Pressable>

            {/* info + actions */}
            <View style={styles.innerWrap}>
              <Pressable
                onLongPress={() => Clipboard.setStringAsync(book.title.pretty)}
              >
                <Text style={styles.title}>{book.title.pretty}</Text>
              </Pressable>
              <Pressable
                onLongPress={() => Clipboard.setStringAsync(book.title.english)}
              >
                <Text style={styles.subtitle}>{book.title.english}</Text>
              </Pressable>
              {book.title.japanese !== book.title.english && (
                <Pressable
                  onLongPress={() =>
                    Clipboard.setStringAsync(book.title.japanese)
                  }
                >
                  <Text style={styles.subtitleJP}>{book.title.japanese}</Text>
                </Pressable>
              )}

              {!!book.scanlator && (
                <Text style={styles.scanlator}>
                  Scanlated by {book.scanlator}
                </Text>
              )}

              {/* meta */}
              <View style={styles.metaRow}>
                <Feather name="hash" size={14} color={meta} />
                <Pressable
                  onLongPress={() => Clipboard.setStringAsync(String(book.id))}
                >
                  <Text style={styles.metaTxt}>{book.id}</Text>
                </Pressable>

                <Feather
                  name="calendar"
                  size={14}
                  color={meta}
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.metaTxt}>{timeAgo(book.uploaded)}</Text>

                <Feather
                  name="heart"
                  size={14}
                  color={meta}
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.metaTxt}>{book.favorites}</Text>
              </View>

              {/* buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/read",
                      params: { id, page: "1" },
                    })
                  }
                  style={styles.readBtn}
                >
                  <Feather name="book-open" size={18} color="#000" />
                  <Text style={styles.readTxt}>ЧИТАТЬ</Text>
                </Pressable>

                <Pressable
                  onPress={handleDownloadOrDelete}
                  style={styles.iconBtn}
                >
                  {dl ? (
                    <Ring progress={pr} />
                  ) : local ? (
                    <Feather name="trash-2" size={20} color={accent} />
                  ) : (
                    <Feather name="download" size={20} color={accent} />
                  )}
                </Pressable>

                <Pressable onPress={toggleLike} style={styles.iconBtn}>
                  <AntDesign
                    name={liked ? "heart" : "hearto"}
                    size={20}
                    color={liked ? "#FF5A5F" : accent}
                  />
                </Pressable>
              </View>

              {/* tags */}
              <TagBlock label="Artists" tags={book.artists} />
              <TagBlock label="Characters" tags={book.characters} />
              <TagBlock label="Parodies" tags={book.parodies} />
              <TagBlock label="Groups" tags={book.groups} />
              <TagBlock label="Categories" tags={book.categories} />
              <TagBlock label="Languages" tags={book.languages} />
              <TagBlock label="Tags" tags={dedupTags} />
            </View>

            {/* gallery header */}
            <View style={styles.galleryRow}>
              <Text style={styles.galleryLabel}>GALLERY</Text>
              <Pressable onPress={cycleCols} style={styles.layoutBtn}>
                <Feather name="layout" size={18} color={meta} />
                <Text style={styles.layoutTxt}>{cols}×</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const itemW = (W - GAP * (cols - 1)) / cols;
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/read",
                  params: { id, page: String(item.page) },
                })
              }
              style={{ width: itemW, marginBottom: GAP }}
            >
              <ExpoImage
                source={{ uri: item.url }}
                style={
                  cols === 1
                    ? { width: itemW, aspectRatio: item.width / item.height }
                    : { width: itemW, height: itemW }
                }
                contentFit={cols === 1 ? "contain" : "cover"}
                cachePolicy="disk"
              />
              <Text style={styles.pageNum}>{item.page}</Text>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Animated.View
        style={[
          styles.fab,
          { transform: [{ scale: fabScale }], opacity: fabScale },
        ]}
      >
        <Pressable onPress={scrollTop} style={styles.fabBtn}>
          <Ionicons name="arrow-up" size={24} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ---------- styles (unchanged except мелочь) ---------- */
const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_H,
    paddingTop: StatusBar.currentHeight,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: hsbToHex({ saturation: 76, brightness: 18 }),
    zIndex: 10,
  },
  hit: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  barTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },

  innerWrap: { paddingHorizontal: 16, paddingTop: 12 },
  title: { color: text, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: meta, fontSize: 14 },
  subtitleJP: { color: meta, fontSize: 13, fontStyle: "italic" },
  scanlator: { color: meta, fontSize: 12, marginTop: 4 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  metaTxt: { color: meta, fontSize: 13 },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },
  readBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: accent,
    borderRadius: 80,
    paddingVertical: 8,
  },
  readTxt: { color: "#000", fontWeight: "700", fontSize: 16 },
  iconBtn: { padding: 6, borderRadius: 8 },

  tagBlock: { marginTop: 10 },
  tagBlockTitle: {
    color: text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tagBg,
    borderRadius: 6,
    paddingLeft: 6,
    paddingRight: 4,
  },
  tagBoxInc: { borderWidth: 1, borderColor: accent },
  tagBoxExc: { borderWidth: 1, borderColor: excColor },
  tagTxt: {
    color: tagColor,
    fontSize: 11,
    paddingVertical: 4,
    paddingRight: 2,
  },

  galleryRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryLabel: { color: meta, fontSize: 12 },
  layoutBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 4 },
  layoutTxt: { color: meta, fontSize: 12 },

  pageNum: { color: meta, fontSize: 12, textAlign: "center", marginTop: 4 },

  fab: { position: "absolute", right: 16, bottom: 36 },
  fabBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
