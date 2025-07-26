import { Book, searchBooks } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import PaginationBar from "@/components/PaginationBar";
import { SearchBar } from "@/components/SearchBar";
import { Colors } from "@/constants/Colors";
import { useSort } from "@/context/SortContext";
import { useFilterTags } from "@/context/TagFilterContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const { query: urlQ } = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(urlQ ?? "");

  const { sort } = useSort();
  const { includes, excludes } = useFilterTags();
  const incStr = JSON.stringify(includes);
  const excStr = JSON.stringify(excludes);

  const [books, setBooks] = useState<Book[]>([]);
  const [totalPages, setTotal] = useState(1);
  const [page, setPage] = useState(1);

  const [favorites, setFav] = useState<Set<number>>(new Set());

  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const listRef = useRef<FlatList>(null);
  const cs = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then(
      (f) => f && setFav(new Set(JSON.parse(f)))
    );
  }, []);

  const toggleFav = (id: number, like: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev);
      like ? cp.add(id) : cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      return cp;
    });

  const fetchBooks = useCallback(
    async (p: number) => {
      if (!query.trim()) return;
      setPending(true);
      try {
        const res = await searchBooks({
          query: query.trim(),
          sort,
          page: p,
          perPage: 40,
          includeTags: includes,
          excludeTags: excludes,
        });
        setBooks(res.books);
        setTotal(res.totalPages);
        setPage(p);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      } finally {
        setPending(false);
      }
    },
    [query, sort, incStr, excStr]
  );

  useEffect(() => {
    query.trim() ? fetchBooks(1) : (setBooks([]), setTotal(1));
  }, [fetchBooks, query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooks(page);
    setRefreshing(false);
  }, [page, fetchBooks]);

  if (pending && page === 1) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View
      style={{ flex: 1, backgroundColor: Colors[cs ?? "light"].background.hex }}
    >
      <SearchBar />

      <FlatList
        ref={listRef}
        data={books}
        keyExtractor={(b) => `${b.id}`}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFav}
            onPress={() =>
              router.push({
                pathname: "/book/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        )}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 55 + insets.bottom }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            {query ? "Ничего не найдено" : "Начните вводить запрос для поиска…"}
          </Text>
        }
      />

      <PaginationBar
        currentPage={page}
        totalPages={totalPages}
        onChange={(p) => fetchBooks(p)}
      />

      {pending && page !== 1 && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
