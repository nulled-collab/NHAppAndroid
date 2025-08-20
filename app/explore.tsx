import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Book, searchBooks } from "@/api/nhentai";
import BookList from "@/components/BookList";
import PaginationBar from "@/components/PaginationBar";
import { useSort } from "@/context/SortContext";
import { useFilterTags } from "@/context/TagFilterContext";
import { useGridConfig } from "@/hooks/useGridConfig";

const EXPLORE_CACHE = new Map<string, { books: Book[]; totalPages: number }>();

export default function ExploreScreen() {
  const { query: rawQ, solo: rawSolo } = useLocalSearchParams<{
    query?: string | string[];
    solo?: string | string[];
  }>();
  const urlQ = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const solo = Array.isArray(rawSolo) ? rawSolo[0] : rawSolo;

  const [query, setQuery] = useState(urlQ ?? "");
  const { sort } = useSort();
  const { includes, excludes } = useFilterTags();

  const useFilters = solo !== "1";
  const activeIncludes = useFilters ? includes : [];
  const activeExcludes = useFilters ? excludes : [];

  const incStr = JSON.stringify(activeIncludes);
  const excStr = JSON.stringify(activeExcludes);

  const [books, setBooks] = useState<Book[]>([]);
  const [totalPages, setTotal] = useState(1);
  const [currentPage, setPage] = useState(1);
  const [favorites, setFav] = useState<Set<number>>(new Set());
  const [refreshing, setRef] = useState(false);

  const router = useRouter();
  const gridConfig = useGridConfig();

  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then(
      (j) => j && setFav(new Set(JSON.parse(j)))
    );
  }, []);

  const cacheKey = useMemo(
    () =>
      JSON.stringify({
        q: query.trim(),
        sort,
        inc: activeIncludes,
        exc: activeExcludes,
        page: currentPage,
      }),
    [query, sort, incStr, excStr, currentPage]
  );

  const fetchPage = useCallback(
    async (page: number, keyForCache: string) => {
      const q = query.trim();
      if (!q) {
        setBooks([]);
        setTotal(1);
        return;
      }

      const cached = EXPLORE_CACHE.get(keyForCache);
      if (cached) {
        setBooks(cached.books);
        setTotal(cached.totalPages);
        return;
      }

      try {
        const res = await searchBooks({
          query: q,
          sort,
          page,
          includeTags: activeIncludes,
          excludeTags: activeExcludes,
        });
        setBooks(res.books);
        setTotal(res.totalPages);
        EXPLORE_CACHE.set(keyForCache, {
          books: res.books,
          totalPages: res.totalPages,
        });
      } catch (error) {
        console.error("Failed to fetch books:", error);
      }
    },
    [query, sort, incStr, excStr]
  );

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setBooks([]);
      setTotal(1);
      return;
    }
    fetchPage(currentPage, cacheKey);
  }, [cacheKey, currentPage, fetchPage]);

  useEffect(() => {
    setQuery(urlQ ?? "");
  }, [urlQ]);

  useEffect(() => {
    setPage(1);
  }, [query, sort, incStr, excStr]);

  const onRefresh = useCallback(async () => {
    setRef(true);
    try {
      const q = query.trim();
      if (!q) {
        setBooks([]);
        setTotal(1);
        return;
      }
      const res = await searchBooks({
        query: q,
        sort,
        page: currentPage,
        includeTags: activeIncludes,
        excludeTags: activeExcludes,
      });
      setBooks(res.books);
      setTotal(res.totalPages);
      EXPLORE_CACHE.set(cacheKey, {
        books: res.books,
        totalPages: res.totalPages,
      });
    } catch (e) {
      console.error(e);
    }
    setRef(false);
  }, [query, sort, currentPage, cacheKey, incStr, excStr]);

  const toggleFav = useCallback(
    (id: number, next: boolean) => {
      setFav((prev) => {
        const cp = new Set(prev);
        if (next) cp.add(id);
        else cp.delete(id);
        AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
        return cp;
      });

      setBooks((prev) => {
        const patched = prev.map((b) =>
          b.id === id
            ? {
                ...b,
                favorites: Math.max(
                  0,
                  (typeof b.favorites === "number" ? b.favorites : 0) +
                    (next ? 1 : -1)
                ),
              }
            : b
        );
        const cached = EXPLORE_CACHE.get(cacheKey);
        if (cached) {
          EXPLORE_CACHE.set(cacheKey, {
            books: patched,
            totalPages: cached.totalPages,
          });
        }
        return patched;
      });
    },
    [cacheKey]
  );

  return (
    <View style={styles.container}>
      <BookList
        key={`page-${currentPage}`}
        data={books}
        loading={books.length === 0 && currentPage === 1 && !!query}
        refreshing={refreshing}
        onRefresh={onRefresh}
        isFavorite={(id) => favorites.has(id)}
        onToggleFavorite={toggleFav}
        onPress={(id) => {
          const b = books.find((x) => x.id === id);
          router.push({
            pathname: "/book/[id]",
            params: { id: String(id), title: b?.title?.pretty ?? "" },
          });
        }}
        gridConfig={{ default: gridConfig }}
      />
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setPage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
