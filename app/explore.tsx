import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Book, searchBooks } from "@/api/nhentai";
import BookCard from "@/components/BookCard";

const KEY_SORT = "searchSortPref";
const SORT_OPTIONS = [
  { key: "popular",       label: "Popular" },
  { key: "popular-week",  label: "Hot Week" },
  { key: "popular-today", label: "Hot Today" },
  { key: "popular-month", label: "Hot Month" },
  { key: "date",          label: "Newest" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export default function ExploreScreen() {
  /* ─── state ─────────────────────────────────────────────────────────── */
  const { query: urlQ }              = useLocalSearchParams<{ query?: string }>();
  const [query,  setQuery]           = useState(urlQ ?? "");
  const [sort,   setSort]            = useState<SortKey>("popular");
  const [books,  setBooks]           = useState<Book[]>([]);
  const [loading,     setLoading]    = useState(false);
  const [refreshing,  setRefreshing] = useState(false);
  const [favorites,   setFav]        = useState<Set<number>>(new Set());

  const router = useRouter();

  /* ─── load pref & fav once ──────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem(KEY_SORT);
      s && setSort(s as SortKey);
      const f = await AsyncStorage.getItem("bookFavorites");
      f && setFav(new Set(JSON.parse(f)));
    })();
  }, []);

  /* ─── предотвращаем дублирующие вызовы поиска ───────────────────────── */
  const lastSearch = useRef<{ q: string; s: SortKey }>({ q: "", s: "popular" });

  const runSearch = useCallback(
    async (q: string, s: SortKey) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      // если параметры не изменились — выходим
      if (trimmed === lastSearch.current.q && s === lastSearch.current.s) return;

      lastSearch.current = { q: trimmed, s };
      setLoading(true);

      try {
        const { books } = await searchBooks({ query: trimmed, sort: s, perPage: 40 });
        setBooks(books);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ─── реагируем на URL-query и sort только если изменились ──────────── */
  useFocusEffect(
    useCallback(() => {
      if (urlQ) {
        setQuery(urlQ);
        runSearch(urlQ, sort);
      }
    }, [urlQ, sort, runSearch]),
  );

  /* ─── смена сортировки ─────────────────────────────────────────────── */
  const changeSort = async (k: SortKey) => {
    if (k === sort) return;
    setSort(k);
    await AsyncStorage.setItem(KEY_SORT, k);
    runSearch(query, k);
  };

  /* ─── pull-to-refresh ──────────────────────────────────────────────── */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await runSearch(query, sort);
    setRefreshing(false);
  }, [query, sort, runSearch]);

  /* ─── toggle fav ───────────────────────────────────────────────────── */
  const toggleFav = (id: number, next: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev);
      next ? cp.add(id) : cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      return cp;
    });

  /* ─── UI ───────────────────────────────────────────────────────────── */
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      {/* <SearchBar /> */}

      {/* сортировка */}
      <View style={st.sortRow}>
        {SORT_OPTIONS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => changeSort(key)}
            style={[st.sortBtn, sort === key && st.sortBtnActive]}
          >
            <Text style={st.sortTxt}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* результаты */}
      <FlatList
        data={books}
        keyExtractor={(b) => `${b.id}`}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFav}
            onPress={() =>
              router.push({ pathname: "/book/[id]", params: { id: String(item.id) } })
            }
          />
        )}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            {query ? "Nothing found" : "Start typing to search…"}
          </Text>
        }
      />
    </>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────── */
const st = StyleSheet.create({
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#36334d",
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#444",
  },
  sortBtnActive: { backgroundColor: "#6f66ff" },
  sortTxt: { color: "#fff", fontSize: 12 },
});
