import { Book, BookPage } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import * as FileSystem from "expo-file-system";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DownloadedScreen() {
  const [downloadedBooks, setDownloadedBooks] = useState<Book[]>([]);
  const [pending, setPending] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchDownloadedBooks = useCallback(async () => {
    setPending(true);
    try {
      const nhDir = `${FileSystem.documentDirectory}NHAppAndroid/`;
      const exists = (await FileSystem.getInfoAsync(nhDir)).exists;
      if (!exists) {
        setDownloadedBooks([]);
        return;
      }

      const titles = await FileSystem.readDirectoryAsync(nhDir);
      const books: Book[] = [];

      for (const title of titles) {
        const titleDir = `${nhDir}${title}/`;
        const idMatch = title.match(/^(\d+)_/);
        const titleId = idMatch ? Number(idMatch[1]) : null;

        const langs = await FileSystem.readDirectoryAsync(titleDir);
        for (const lang of langs) {
          const langDir = `${titleDir}${lang}/`;
          const metaUri = `${langDir}metadata.json`;
          if ((await FileSystem.getInfoAsync(metaUri)).exists) {
            const raw = await FileSystem.readAsStringAsync(metaUri);
            const book: Book = JSON.parse(raw);

            // Опционально проверим, совпадает ли id (если он был в названии папки)
            if (titleId && book.id !== titleId) continue;

            const files = await FileSystem.readDirectoryAsync(langDir);
            const pages = files
              .filter((f) => f.startsWith("Image"))
              .map(
                (img, i): BookPage => ({
                  url: `${langDir}${img}`,
                  urlThumb: `${langDir}${img}`,
                  width: book.pages[i]?.width || 100,
                  height: book.pages[i]?.height || 100,
                  page: i + 1,
                })
              );
            books.push({
              ...book,
              cover: pages[0]?.url || book.cover,
              thumbnail: pages[0]?.urlThumb || book.thumbnail,
              pages,
            });
          }
        }
      }

      books.sort((a, b) => b.id - a.id);

      setDownloadedBooks(books);
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      console.error(e);
      setDownloadedBooks([]);
    } finally {
      setPending(false);
    }
  }, []);

  // Подгружаем при фокусе экрана
  useFocusEffect(
    useCallback(() => {
      fetchDownloadedBooks();
    }, [fetchDownloadedBooks])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDownloadedBooks();
    setRefreshing(false);
  }, [fetchDownloadedBooks]);

  if (pending) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={downloadedBooks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            isFavorite={false}
            onToggleFavorite={undefined}
            onPress={(id) =>
              router.push({
                pathname: "/book/[id]",
                params: { id: String(id) },
              })
            }
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 55 + insets.bottom }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No downloaded books found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
  },
});
