import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Book, getBook } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { buildPageSources } from "@/components/buildPageSources";

const WIDTH = Dimensions.get("window").width;

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);

  /* --- fetch ---------------------------------------------------------- */
  useEffect(() => {
    getBook(Number(id))
      .then(setBook)
      .catch(() => router.back());
  }, [id]);

  if (!book) return <ActivityIndicator style={{ flex: 1 }} />;

  /* ---------- header (cover + meta) ----------------------------------- */
  const Header = () => (
    <View style={st.headerWrap}>
      <SmartImage
        sources={buildImageFallbacks(book.cover)}
        style={st.cover}
        resizeMode="cover"
      />

      <Text style={st.title}>{book.title.pretty}</Text>

      <View style={st.metaRow}>
        <Feather name="calendar" size={14} color="#8c89b1" />
        <Text style={st.metaTxt}>
          {new Date(book.uploaded).toLocaleDateString()}
        </Text>

        <Feather
          name="book-open"
          size={14}
          color="#8c89b1"
          style={{ marginLeft: 12 }}
        />
        <Text style={st.metaTxt}>{book.pagesCount} pages</Text>
      </View>

      <View style={st.tagsWrap}>
        {book.tags.map((t) => (
          <Text key={t.id} style={st.tag}>
            {t.name}
          </Text>
        ))}
      </View>

      <Text style={st.galleryLabel}>GALLERY</Text>
    </View>
  );

  /* ---------- FlatList (lazy pages) ----------------------------------- */
  return (
    <FlatList
      data={book.pages}
      keyExtractor={(p) => `${p.page}`}
      initialNumToRender={3}
      windowSize={5}
      renderItem={({ item }) => (
        <SmartImage
          sources={buildPageSources(item.url)}
          style={st.pageImg}
          resizeMode="contain"
        />
      )}
      ListHeaderComponent={Header}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* ---------------- styles ---------------------------------------------- */
const st = StyleSheet.create({
  headerWrap: { padding: 16, gap: 12 },
  cover: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: "#20202e",
  },
  title: { color: "#e4e2ff", fontSize: 18, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { color: "#8c89b1", fontSize: 13 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "#453f6b",
    color: "#e4e2ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    borderRadius: 6,
  },
  galleryLabel: {
    marginTop: 16,
    marginBottom: 8,
    color: "#8c89b1",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  pageImg: {
    width: WIDTH,
    height: (WIDTH * 4) / 3,
    backgroundColor: "#20202e",
  },
});
