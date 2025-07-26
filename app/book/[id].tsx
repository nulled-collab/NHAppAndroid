/* app/book/[id].tsx
   – цвета теперь прописаны через design-helper hsbToHex()
   – тап по обложке / кнопке «Читать здесь» → /read?id=…&page=1
   – тап по любой странице → /read?id=…&page=N
   – сетка 1-2-3, header-fade, FAB ↑, теги +/− — как раньше
*/

import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";

import { Book, getBook } from "@/api/nhentai";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { buildPageSources } from "@/components/buildPageSources";
import { hsbToHex } from "@/constants/Colors";
import { useFilterTags } from "@/context/TagFilterContext";

/* ---------- layout const ---------- */
const { width: W } = Dimensions.get("window");
const HEADER_H = 48 + StatusBar.currentHeight!;
const GAP = 8;
const COLS_KEY = "galleryColumns";
const FAVORITES = "bookFavorites";
const FAB_SIZE = 44;

/* ---------- design palette (HSB-helper) ---------- */
const bg = hsbToHex({ saturation: 76, brightness: 25 });
const text = hsbToHex({ saturation: 20, brightness: 240 });
const meta = hsbToHex({ saturation: 40, brightness: 160 });
const accent = hsbToHex({ saturation: 76, brightness: 200 });
const tagBg = hsbToHex({ saturation: 60, brightness: 60 });
const tagColor = accent; // тот же акцент в тексте тега

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { filters, cycle } = useFilterTags();

  /* refs / anim */
  const listRef = useRef<FlatList<any>>(null);
  const scrollY = useRef(0);
  const headerY = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(0)).current;

  /* state */
  const [book, setBook] = useState<Book | null>(null);
  const [cols, setCols] = useState(1);
  const [liked, setLiked] = useState(false);

  /* ---------- load book ---------- */
  useEffect(() => {
    getBook(Number(id))
      .then(setBook)
      .catch(() => router.back());
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
      setLiked(arr.includes(Number(id)));
    });
  }, [id]);

  const toggleLike = async () => {
    const j = await AsyncStorage.getItem(FAVORITES);
    const arr: number[] = j ? JSON.parse(j) : [];
    const next = arr.includes(Number(id))
      ? arr.filter((x) => x !== Number(id))
      : [...arr, Number(id)];
    setLiked(!arr.includes(Number(id)));
    await AsyncStorage.setItem(FAVORITES, JSON.stringify(next));
  };

  /* ---------- utils ---------- */
  const copy = (t: string) => {
    Clipboard.setStringAsync(t);
    ToastAndroid.show("Скопировано", ToastAndroid.SHORT);
  };
  const goRead = (page = 1) =>
    router.push({ pathname: "/read", params: { id, page: String(page) } });

  const modeOf = (t: { type: string; name: string }) =>
    filters.find((x) => x.type === t.type && x.name === t.name)?.mode;

  if (!book) return <ActivityIndicator style={{ flex: 1 }} color={accent} />;

  /* ---------- dedup tags ---------- */
  const dedupTags = (() => {
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
  })();

  /* ---------- TagBlock ---------- */
  const TagBlock = memo(
    ({
      label,
      tags,
    }: {
      label: string;
      tags?: { type: string; name: string }[];
    }) =>
      tags?.length ? (
        <View style={st.tagBlock}>
          <Text style={st.tagBlockTitle}>{label}:</Text>
          <View style={st.tagsWrap}>
            {tags.map((t) => {
              const sel = modeOf(t) === "include";
              return (
                <View
                  key={`${label}:${t.name}`}
                  style={[st.tagBox, sel && st.tagBoxActive]}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/explore",
                        params: { query: t.name },
                      })
                    }
                    onLongPress={() => copy(t.name)}
                  >
                    <Text style={st.tagTxt}>{t.name}</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    style={{ paddingLeft: 4 }}
                    onPress={() => cycle({ type: t.type as any, name: t.name })}
                  >
                    <Feather
                      name={sel ? "minus-circle" : "plus-circle"}
                      size={14}
                      color={sel ? tagColor : meta}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null
  );

  /* ---------- animations ---------- */
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

  /* ---------- JSX ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Floating header */}
      <Animated.View
        style={[st.topBar, { transform: [{ translateY: headerY }] }]}
      >
        <Pressable onPress={() => router.back()} style={st.hit}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text numberOfLines={1} style={st.barTitle}>
          {book.title.pretty}
        </Text>
        <Pressable onPress={toggleLike} style={st.hit}>
          <AntDesign
            name={liked ? "heart" : "hearto"}
            size={22}
            color={liked ? "#FF5A5F" : "#fff"}
          />
        </Pressable>
      </Animated.View>

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
            {/* Cover */}
            <Pressable onPress={() => goRead(1)}>
              <ExpoImage
                source={buildImageFallbacks(book.cover)}
                style={{
                  width: W,
                  aspectRatio: book.pages[0].width / book.pages[0].height,
                }}
                contentFit="cover"
                cachePolicy="disk"
              />
            </Pressable>

            {/* Info */}
            <View style={st.innerWrap}>
              <Text style={st.title}>{book.title.pretty}</Text>
              <Text style={st.subtitle}>{book.title.english}</Text>
              {book.title.japanese !== book.title.english && (
                <Text style={st.subtitleJP}>{book.title.japanese}</Text>
              )}

              {!!book.scanlator && (
                <Text style={st.scanlator}>Scanlated by {book.scanlator}</Text>
              )}

              <View style={st.metaRow}>
                <Feather name="calendar" size={14} color={meta} />
                <Text style={st.metaTxt}>
                  {new Date(book.uploaded).toLocaleDateString()}
                </Text>
                <Feather
                  name="book-open"
                  size={14}
                  color={meta}
                  style={{ marginLeft: 12 }}
                />
                <Text style={st.metaTxt}>{book.pagesCount} pages</Text>
              </View>

              <Pressable onPress={() => goRead(1)} style={st.readBtn}>
                <Text style={st.readTxt}>ЧИТАТЬ ЗДЕСЬ</Text>
              </Pressable>

              {/* Tag blocks */}
              <TagBlock label="Artists" tags={book.artists} />
              <TagBlock label="Characters" tags={book.characters} />
              <TagBlock label="Parodies" tags={book.parodies} />
              <TagBlock label="Groups" tags={book.groups} />
              <TagBlock label="Categories" tags={book.categories} />
              <TagBlock label="Languages" tags={book.languages} />
              <TagBlock label="Tags" tags={dedupTags} />
            </View>

            {/* Gallery row */}
            <View style={st.galleryRow}>
              <Text style={st.galleryLabel}>GALLERY</Text>
              <Pressable onPress={cycleCols} style={st.layoutBtn}>
                <Feather name="layout" size={18} color={meta} />
                <Text style={st.layoutTxt}>{cols}×</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const itemW = (W - GAP * (cols - 1)) / cols;
          return (
            <Pressable
              onPress={() => goRead(item.page)}
              style={{ width: itemW, marginBottom: GAP }}
            >
              <ExpoImage
                source={buildPageSources(item.url)}
                style={
                  cols === 1
                    ? { width: itemW, aspectRatio: item.width / item.height }
                    : { width: itemW, height: itemW }
                }
                contentFit={cols === 1 ? "contain" : "cover"}
                cachePolicy="disk"
              />
              <Text style={st.pageNum}>{item.page}</Text>
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Animated.View
        style={[
          st.fab,
          { transform: [{ scale: fabScale }], opacity: fabScale },
        ]}
        pointerEvents={Platform.OS === "android" ? "box-none" : "auto"}
      >
        <Pressable onPress={scrollTop} style={st.fabBtn}>
          <Ionicons name="arrow-up" size={24} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ---------- styles ---------- */
const st = StyleSheet.create({
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
  barTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "600" },

  /* info */
  innerWrap: { paddingHorizontal: 16, paddingTop: 12 },
  title: { color: text, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: meta, fontSize: 14 },
  subtitleJP: { color: meta, fontSize: 13, fontStyle: "italic" },
  scanlator: { color: meta, fontSize: 12, marginTop: 4 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  metaTxt: { color: meta, fontSize: 13 },

  readBtn: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    marginTop: 14,
    backgroundColor: accent,
    borderRadius: 80,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  readTxt: { color: "rgba(0, 0, 0, 0.75)000ff", fontWeight: "600", fontSize: 18 },

  /* tags */
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
  tagBoxActive: { borderColor: accent, borderWidth: 1 },
  tagTxt: {
    color: tagColor,
    fontSize: 11,
    paddingVertical: 4,
    paddingRight: 2,
  },

  /* gallery header */
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

  /* FAB */
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
