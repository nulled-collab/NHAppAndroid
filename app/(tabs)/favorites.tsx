import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";

import { Book, getFavorites } from "@/api/nhentai";
import BookCard from "@/components/BookCard";

type SortKey = "relevance" | "popular";

export default function FavoritesScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

  /* --- загружаем id избранного из storage -------------------------------- */
  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then((j) => {
      const list = j ? (JSON.parse(j) as number[]) : [];
      setIds(list);
    });
  }, []);

  /* --- запрос книг ------------------------------------------------------- */
  const load = async () => {
    if (ids.length === 0) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { books } = await getFavorites({ ids, sort, perPage: 100 });
    setBooks(books);
    setLoading(false);
  };
  useEffect(() => {
    if (ids.length) load();
  }, [ids, sort]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [ids, sort]);

  /* --- UI --------------------------------------------------------------- */
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <>
      {/* сортировка */}
      <View style={{ flexDirection: "row", gap: 12, padding: 12 }}>
        {(["relevance", "popular"] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setSort(k)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: sort === k ? "#6f66ff" : "#444",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              {k === "relevance" ? "Recent" : "Popular"}
            </Text>
          </Pressable>
        ))}
      </View>

      {books.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
          No favorites yet
        </Text>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => `${b.id}`}
          renderItem={({ item }) => (
            <BookCard
              book={item}
              isFavorite={true}
              onToggleFavorite={() => {}} // c этого экрана не удаляем
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refresh} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </>
  );
}
