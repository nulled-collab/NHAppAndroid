// RecommendationsScreen — бесконечная лента с рекомендациями
// -----------------------------------------------------------
import { useFilterTags } from "@/context/TagFilterContext"; // ← NEW
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Book, getRecommendations } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ─────────────────────── тип для элемента списка ──────────────────────── */
type RecBook = Book & { explain: string[] };

/* ───────────────────────────── компонент ──────────────────────────────── */
export default function RecommendationsScreen() {
  /* --------------------------- локальные состояния --------------------- */
  const [books, setBooks] = useState<RecBook[]>([]);
  const [debug, setDebug] = useState<any>(null);
  const [favIds, setFavIds] = useState<number[]>([]);
  const [favorites, setFav] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true); // первый fetch
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
  const [loadingMore, setLoadingMore] = useState(false); // беск. прокрутка
  const { includes, excludes } = useFilterTags();

  /* ------------------------ постраничные флаги ------------------------- */
  const page = useRef(1); // текущая страница
  const totalPages = useRef(1); // получаем из API
  const sentIds = useRef<number[]>([]); // отсылаем в API, чтоб не дублил

  const router = useRouter();

  /* ------------------- читаем лайки из AsyncStorage -------------------- */
  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then((j) => {
      const arr = j ? JSON.parse(j) : [];
      setFavIds(arr);
      setFav(new Set(arr));
    });
  }, []); // ← NEW

  /* ------------------- helper: fetch одну страницу -------------------- */
  const fetchPage = async (pageNo: number) => {
    if (!favIds.length) return { books: [], debug: null, totalPages: 1 };

    const res = await getRecommendations({
      ids: favIds,
      sentIds: sentIds.current,
      page: pageNo,
      perPage: 30,
      includeTags: includes, // ← NEW
      excludeTags: excludes, // ← NEW
    });

    sentIds.current = [...sentIds.current, ...res.books.map((b) => b.id)];
    return { books: res.books, debug: res.debug, totalPages: res.totalPages };
  };

  /* --------------------------- начальная загрузка ---------------------- */
  const initialLoad = useCallback(async () => {
    setLoading(true);
    page.current = 1;
    sentIds.current = [];
    const { books: b, debug: d, totalPages: tp } = await fetchPage(1);
    setBooks(b);
    setDebug(d);
    totalPages.current = tp;
    setLoading(false);
  }, [favIds, includes, excludes]); // ← NEW

  useEffect(() => {
    if (favIds.length) initialLoad();
    else setLoading(false);
  }, [favIds, includes, excludes, initialLoad]); // ← NEW

  /* pull-to-refresh */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialLoad();
    setRefreshing(false);
  }, [initialLoad]);

  /* бесконечная прокрутка */
  const loadMore = async () => {
    if (loadingMore || loading || page.current >= totalPages.current) return;
    setLoadingMore(true);
    const nextPage = page.current + 1;
    const { books: next } = await fetchPage(nextPage);
    setBooks((prev) => [...prev, ...next]);
    page.current = nextPage;
    setLoadingMore(false);
  };

  /* --------------------- переключение лайка ---------------------------- */
  const toggleFav = (id: number, next: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev);
      next ? cp.add(id) : cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      return cp;
    });

  /* -------------------------- early exits ------------------------------ */
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  if (!favIds.length)
    return (
      <Text style={styles.centerNote}>
        Like a few books first — I’ll build recommendations for you!
      </Text>
    );

  /* ------------------------- Debug-панель ------------------------------ */
  const DebugPane = () =>
    debug && (
      <View style={styles.debugBox}>
        {/* раскрывашка */}
        <InfoAccordion debug={debug} books={books} />
      </View>
    );

  /* ---------------------------- renderItem ----------------------------- */
  const renderItem = ({ item }: ListRenderItemInfo<RecBook>) => (
    <BookCard
      book={item}
      isFavorite={favorites.has(item.id)}
      onToggleFavorite={toggleFav}
      onPress={() =>
        router.push({ pathname: "/book/[id]", params: { id: String(item.id) } })
      }
    />
  );

  /* ---------------------------- FlatList ------------------------------- */
  return (
    <FlatList
      data={books}
      keyExtractor={(b) => `${b.id}`}
      renderItem={renderItem}
      ListHeaderComponent={DebugPane}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReachedThreshold={0.4}
      onEndReached={loadMore}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : null
      }
    />
  );
}

/* ─────────────────────── Debug-accordion (выдрано) ────────────────────── */
function InfoAccordion({ debug, books }: { debug: any; books: RecBook[] }) {
  const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets(); // ← NEW

  /* перевод псевдо-HTML разметки в plain-текст */
  const fmt = (s: string) =>
    s
      .replace(/<b>(.*?)<\/b>/g, "**$1**")
      .replace(/<i>(.*?)<\/i>/g, "_$1_")
      .replace(/<\/?[^>]+>/g, "");

  return (
    <>
      <Pressable onPress={() => setOpen((p) => !p)}>
        <Text style={styles.debugToggle}>
          {open
            ? "Скрыть «Как это работает» ▲"
            : "Показать «Как это работает» ▼"}
        </Text>
      </Pressable>

      {open && (
        <ScrollView
          style={{ maxHeight: 420, paddingTop: insets.top + 64 }}
          nestedScrollEnabled={Platform.OS !== "web"}
        >
          {/* чипы */}
          <View style={styles.chipRow}>
            {debug.topTags.map((t: string) => (
              <Text key={t} style={styles.chip}>
                {t}
              </Text>
            ))}
          </View>

          {/* инфо-сводка */}
          <Text style={styles.h2}>Алгоритм</Text>
          <Text style={styles.h3}>Топ-персонажи:</Text>
          <Text style={styles.txt}>{debug.topChars.join(", ") || "—"}</Text>

          <Text style={styles.h3}>Топ-артисты:</Text>
          <Text style={styles.txt}>{debug.topArts.join(", ") || "—"}</Text>

          <Text style={styles.h3}>Топ-теги:</Text>
          <Text style={styles.txt}>{debug.topTags.join(", ") || "—"}</Text>

          {/* запросы */}
          <Text style={[styles.h3, { marginTop: 12 }]}>
            Запросы к API ({[...debug.favQueries, ...debug.tagQueries].length})
          </Text>
          {[...debug.favQueries, ...debug.tagQueries].map((q: string) => (
            <Text key={q} style={styles.bullet}>
              • {q}
            </Text>
          ))}

          {/* частоты */}
          <Text style={[styles.h3, { marginTop: 12 }]}>Частотность тегов</Text>
          <Text style={styles.pre}>{JSON.stringify(debug.freq, null, 2)}</Text>

          {/* explain первых книг */}
          <Text style={[styles.h3, { marginTop: 12 }]}>Пояснения для книг</Text>
          {books.slice(0, 4).map((b) => (
            <View key={b.id} style={{ marginTop: 8 }}>
              <Text style={styles.bookTitle}>{b.title.pretty}</Text>
              {b.explain.map((ln, i) => (
                <Text key={i} style={styles.bullet}>
                  • {fmt(ln)}
                </Text>
              ))}
            </View>
          ))}

          <Pressable
            style={{ marginTop: 10, marginBottom: 4 }}
            onPress={() => setOpen(false)}
          >
            <Text style={[styles.txt, { opacity: 0.6 }]}>▼ свернуть</Text>
          </Pressable>
        </ScrollView>
      )}
    </>
  );
}

/* ───────────────────────────── стили ──────────────────────────────────── */
const styles = StyleSheet.create({
  centerNote: { textAlign: "center", marginTop: 40, color: "#888" },

  debugBox: {
    padding: 12,
    backgroundColor: "#2f2c46",
    marginBottom: 12,
    borderRadius: 8,
    marginHorizontal: 12,
  },
  debugToggle: { color: "#9b94d1", fontSize: 12 },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -3,
  },
  chip: {
    backgroundColor: "#453f6b",
    color: "#e4e2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    marginHorizontal: 3,
    marginBottom: 6,
  },

  h2: { color: "#9b94d1", marginTop: 12, marginBottom: 4, fontSize: 13 },
  h3: { color: "#9b94d1", marginTop: 8, fontSize: 12 },
  txt: { color: "#e4e2ff", fontSize: 12 },
  bullet: { color: "#e4e2ff", fontSize: 12, lineHeight: 16 },

  pre: {
    backgroundColor: "#1e1b32",
    color: "#e4e2ff",
    padding: 8,
    borderRadius: 6,
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "Courier",
    }),
    marginTop: 4,
  },
  bookTitle: {
    color: "#e4e2ff",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 2,
  },
});
