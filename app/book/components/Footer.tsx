import type { Book, GalleryComment } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import { useTheme } from "@/lib/ThemeContext";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { timeAgo } from "../utils/timeAgo";

const s = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 2 },
  galleryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  scrollContent: { gap: 12, padding: 4 },
  showMoreBtn: { marginTop: 6, alignSelf: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  showMoreTxt: { fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
});

export default function Footer({
  related,
  relLoading,
  refetchRelated,
  favorites,
  toggleFav,
  baseGrid,
  allComments,
  visibleCount,
  setVisibleCount,
  cmtLoading,
  innerPadding,
}: {
  related: Book[];
  relLoading: boolean;
  refetchRelated: () => Promise<void>;
  favorites: Set<number>;
  toggleFav: (bid: number, next: boolean) => void;
  baseGrid: any;
  allComments: GalleryComment[];
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  cmtLoading: boolean;
  innerPadding: number;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  // Можно будет вернуть грид позже
  const oneRowGrid = useMemo(
    () => ({ ...baseGrid, numColumns: Math.min(5, related.length || 5) }),
    [baseGrid, related.length]
  );

  const visibleComments = allComments.slice(0, visibleCount);
  const hasMore = visibleCount < allComments.length;

  return (
    <View>
      <View style={s.sectionHead}>
        <Text style={[s.galleryLabel, { paddingHorizontal: innerPadding, paddingTop: 12, paddingBottom: 12, color: colors.metaText }]}>
          RELATED
        </Text>
      </View>

      <ScrollView contentContainerStyle={[s.scrollContent, { paddingHorizontal: innerPadding, width: "100%" }]}>
        {related.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            vertical="false"
            cardWidth={160}
            background={colors.related}
            isFavorite={favorites.has(b.id)}
            onToggleFavorite={toggleFav}
            onPress={(id) => router.push({ pathname: "/book/[id]", params: { id: String(id) } })}
          />
        ))}
      </ScrollView>

      <View style={s.sectionHead}>
        <Text style={[s.galleryLabel, { paddingHorizontal: innerPadding, paddingTop: 12, paddingBottom: 12, color: colors.metaText }]}>
          COMMENTS
        </Text>
      </View>

      {cmtLoading ? (
        <View style={{ paddingHorizontal: innerPadding, paddingVertical: 16, alignItems: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: innerPadding, gap: 8, paddingBottom: 16 }}>
          {visibleComments.map((c) => (
            <View
              key={c.id}
              style={{
                borderRadius: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.page,
                backgroundColor: colors.related,
                padding: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", backgroundColor: colors.page }}>
                  {!!c.avatar && (
                    <ExpoImage source={{ uri: c.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.txt, fontWeight: "700", fontSize: 13 }}>
                    {c.poster?.username || "user"}
                  </Text>
                  <Text style={{ color: colors.metaText, fontSize: 11 }}>{timeAgo(c.post_date)}</Text>
                </View>
              </View>

              <Text style={{ color: colors.txt, fontSize: 13, lineHeight: 18 }}>{c.body}</Text>
            </View>
          ))}

          {hasMore && (
            <Pressable
              onPress={() => setVisibleCount((n) => Math.min(n + 20, allComments.length))}
              style={[s.showMoreBtn, { borderColor: colors.accent, backgroundColor: colors.tagBg }]}
              android_ripple={{ color: `${colors.accent}22` }}
            >
              <Text style={[s.showMoreTxt, { color: colors.accent }]}>Показать ещё 20</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
