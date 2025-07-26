import { hsbToHex } from "@/constants/Colors";
import { useFilterTags } from "@/context/TagFilterContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CandidateBook, getRecommendations } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RecBook = CandidateBook & { explain: string[]; score: number };

export default function RecommendationsScreen() {
  const [books, setBooks] = useState<RecBook[]>([]);
  const [favIds, setFavIds] = useState<number[]>([]);
  const [favorites, setFav] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { includes, excludes } = useFilterTags();

  const page = useRef(1);
  const totalPages = useRef(1);
  const sentIds = useRef<number[]>([]);
  const randomSeed = useRef(Date.now());

  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then((j) => {
      const arr = j ? JSON.parse(j) : [];
      setFavIds(arr);
      setFav(new Set(arr));
    });
  }, []);

  const fetchPage = async (pageNo: number, seed: number) => {
    if (!favIds.length) return { books: [], totalPages: 1 };

    const res = await getRecommendations({
      ids: favIds,
      sentIds: sentIds.current,
      page: pageNo,
      perPage: 50,
      includeTags: includes,
      excludeTags: excludes,
      randomSeed: seed,
    });

    sentIds.current = [...sentIds.current, ...res.books.map((b) => b.id)];
    return { books: res.books, totalPages: res.totalPages };
  };

  const initialLoad = useCallback(async () => {
    setLoading(true);
    page.current = 1;
    sentIds.current = [];
    randomSeed.current = Date.now();
    const { books: b, totalPages: tp } = await fetchPage(1, randomSeed.current);
    setBooks(b);
    totalPages.current = tp;
    setLoading(false);
  }, [favIds, includes, excludes]);

  useEffect(() => {
    if (favIds.length) initialLoad();
    else setLoading(false);
  }, [favIds, includes, excludes, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    sentIds.current = [];
    randomSeed.current = Date.now();
    await initialLoad();
    setRefreshing(false);
  }, [initialLoad]);

  const loadMore = async () => {
    if (loadingMore || loading || page.current >= totalPages.current) return;
    setLoadingMore(true);
    const nextPage = page.current + 1;
    const { books: next } = await fetchPage(nextPage, randomSeed.current);
    setBooks((prev) => [...prev, ...next]);
    page.current = nextPage;
    setLoadingMore(false);
  };

  const toggleFav = (id: number, next: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev);
      next ? cp.add(id) : cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      setFavIds([...cp]);
      return cp;
    });

  const maxScore = useMemo(
    () => Math.max(...books.map((b) => b.score ?? 0), 1),
    [books]
  );

  if (loading)
    return <ActivityIndicator style={{ flex: 1, marginTop: insets.top }} />;

  if (!favIds.length)
    return (
      <Text style={styles.centerNote}>
        Like a few books first — I’ll build recommendations for you!
      </Text>
    );

  const renderItem = ({ item }: ListRenderItemInfo<RecBook>) => {
    const percent = Math.round((item.score / maxScore) * 100);

    return (
      <View style={styles.cardWrapper}>
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

        <Text style={styles.scoreBadge}>{percent}%</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={books}
      keyExtractor={(b) => `${b.id}`}
      renderItem={renderItem}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 24,
      }}
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
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
    />
  );
}

const styles = StyleSheet.create({
  centerNote: {
    textAlign: "center",
    marginTop: 40,
    color: hsbToHex({ saturation: 0, brightness: 60 }),
    fontSize: 16,
    paddingHorizontal: 20,
  },
  cardWrapper: {
    display: "flex",
    position: "relative",
    alignItems: "center",
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  scoreBadge: {
    position: "absolute",
    top: 6,
    alignSelf: "center", // ключ к горизонтальному центру
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    backgroundColor: hsbToHex({ saturation: 55, brightness: 40 }),
    color: hsbToHex({ saturation: 0, brightness: 98 }),
    overflow: "hidden",
  },
});
