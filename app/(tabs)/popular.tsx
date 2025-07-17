import { Book, searchBooks } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import { useFilterTags } from "@/context/TagFilterContext"; // ← NEW
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PopularScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [favorites, setFav] = useState<Set<number>>(new Set());
  const [loading, setL] = useState(true);
  const [refresh, setRef] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets(); // ← NEW

  const { includes, excludes } = useFilterTags(); // ← NEW

  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then(
      (j) => j && setFav(new Set(JSON.parse(j)))
    );
  }, []);

  const toggleFav = (id: number, next: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev);
      next ? cp.add(id) : cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      return cp;
    });

  const load = async () => {
    setL(true);
    const { books } = await searchBooks({
      contentType: "popular",
      sort: "popular",
      perPage: 40,
      includeTags: includes, // ← NEW
      excludeTags: excludes, // ← NEW
    });
    setBooks(books);
    setL(false);
  };

  useEffect(() => {
    load();
  }, [includes, excludes]); // ← NEW

  const onRefresh = useCallback(async () => {
    setRef(true);
    await load();
    setRef(false);
  }, [includes, excludes]); // ← NEW

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <FlatList
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
      refreshControl={
        <RefreshControl refreshing={refresh} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingBottom: 24, paddingTop: insets.top + 64 }}
    />
  );
}
