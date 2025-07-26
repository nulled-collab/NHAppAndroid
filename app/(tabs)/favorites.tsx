import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Book, getFavorites } from "@/api/nhentai";
import BookCard from "@/components/BookCard";

export default function FavoritesScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  const loadFavorites = useCallback(() => {
    AsyncStorage.getItem("bookFavorites").then((j) => {
      const list = j ? (JSON.parse(j) as number[]) : [];
      setIds(list);
      setFavorites(new Set(list));
    });
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  const toggleFavorite = (id: number, next: boolean) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (next) {
        newFavorites.add(id);
        const newIds = [...newFavorites];
        setIds(newIds);
        AsyncStorage.setItem("bookFavorites", JSON.stringify(newIds));
      } else {
        newFavorites.delete(id);
        // Update books state to remove the book without reloading
        setBooks((prevBooks) =>
          prevBooks.filter((book) => book.id !== id)
        );
      }
      return newFavorites;
    });
  };

  const load = async () => {
    if (ids.length === 0) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { books } = await getFavorites({ ids, perPage: 100 });
      // Map books in the order of ids (reversed to show newest first)
      const orderedBooks = [...ids]
        .reverse()
        .map((id) => books.find((book) => book.id === id))
        .filter((book): book is Book => book !== undefined);
      setBooks(orderedBooks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ids.length) load();
  }, [ids]);

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await load();
    setRefresh(false);
  }, [ids]);

  if (loading && !refresh) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {books.length === 0 ? (
        <Text style={styles.emptyText}>No favorites yet</Text>
      ) : (
        <FlatList
          ref={listRef}
          data={books}
          keyExtractor={(b) => `${b.id}`}
          renderItem={({ item }) => (
            <Animated.View
              exiting={FadeOut.duration(300)}
              style={styles.bookCardContainer}
            >
              <BookCard
                book={item}
                isFavorite={favorites.has(item.id)}
                onToggleFavorite={toggleFavorite}
                onPress={() =>
                  router.push({
                    pathname: "/book/[id]",
                    params: { id: String(item.id) },
                  })
                }
              />
            </Animated.View>
          )}
          refreshControl={
            <RefreshControl refreshing={refresh} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingBottom: 55 + insets.bottom,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  bookCardContainer: {
    width: "100%",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#888",
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
});