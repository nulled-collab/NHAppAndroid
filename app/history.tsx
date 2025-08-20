import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Book, getFavorites } from "@/api/nhentai";
import BookListHistory, {
  READ_HISTORY_KEY,
  ReadHistoryEntry,
} from "@/components/BookListHistory";
import { useGridConfig } from "@/hooks/useGridConfig";
import { useTheme } from "@/lib/ThemeContext";

/**
 * Экран «История».
 * Грузим READ_HISTORY_KEY, берём самый свежий ts по каждому id,
 * тянем книги пачками (как в избранном), и отдаём в BookListHistory.
 */
export default function HistoryScreen() {
  const { colors } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [histIndex, setHistIndex] = useState<Record<number, ReadHistoryEntry>>(
    {}
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const gridConfig = useGridConfig();

  const loadHistoryIndex = useCallback(async () => {
    const raw = await AsyncStorage.getItem(READ_HISTORY_KEY);
    if (!raw) {
      setIds([]);
      setHistIndex({});
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setIds([]);
      setHistIndex({});
      return;
    }
    const arr = Array.isArray(parsed) ? (parsed as ReadHistoryEntry[]) : [];

    const byId = new Map<number, ReadHistoryEntry>();
    for (const e of arr) {
      if (!e || !Array.isArray(e)) continue;
      const [id, curr, total, ts] = e;
      const prev = byId.get(id);
      if (!prev || (prev[3] || 0) < (ts || 0)) {
        byId.set(id, [id, curr, total, ts]);
      }
    }

    const sortedIds = [...byId.values()]
      .sort((a, b) => (b[3] || 0) - (a[3] || 0))
      .map((e) => e[0]);

    const indexObj: Record<number, ReadHistoryEntry> = {};
    for (const [id, entry] of byId) indexObj[id] = entry;

    setIds(sortedIds);
    setHistIndex(indexObj);
  }, []);

  useEffect(() => {
    loadHistoryIndex();
  }, [loadHistoryIndex]);

  useFocusEffect(
    useCallback(() => {
      loadHistoryIndex();
    }, [loadHistoryIndex])
  );

  const loadBooks = useCallback(
    async (pageNum: number, perPage: number = 200) => {
      if (ids.length === 0) {
        setBooks([]);
        setTotalPages(1);
        return;
      }
      const start = (pageNum - 1) * perPage;
      const pageIds = ids.slice(start, start + perPage);
      if (pageIds.length === 0) return;

      try {
        const { books: fetched, totalPages: tp } = await getFavorites({
          ids: pageIds,
          perPage,
        });

        const ordered = pageIds
          .map((id) => fetched.find((b) => b.id === id))
          .filter((b): b is Book => !!b);

        setBooks((prev) => (pageNum === 1 ? ordered : [...prev, ...ordered]));
        setTotalPages(tp);
        setPage(pageNum);
      } catch (e) {
        console.error("Failed loading history books:", e);
      }
    },
    [ids]
  );

  useEffect(() => {
    loadBooks(1);
  }, [ids, loadBooks]);

  const handleLoadMore = () => {
    if (page < totalPages) {
      loadBooks(page + 1);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistoryIndex();
    await loadBooks(1);
    setRefreshing(false);
  }, [loadHistoryIndex, loadBooks]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bg }]}>
      <BookListHistory
        data={books}
        historyIndex={histIndex}
        loading={ids.length > 0 && books.length === 0}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onPress={(id) =>
          router.push({ pathname: "/book/[id]", params: { id: String(id), title: books.find(b => b.id === id)?.title.pretty } })
        }
        ListEmptyComponent={
          ids.length === 0 ? (
            <Text
              style={{ textAlign: "center", marginTop: 40, color: colors.sub }}
            >
              История пуста
            </Text>
          ) : null
        }
        gridConfig={{ default: gridConfig }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
