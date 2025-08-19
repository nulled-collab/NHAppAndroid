import type { Book, GalleryComment } from "@/api/nhentai";
import BookList from "@/components/BookList";
import { useTheme } from "@/lib/ThemeContext";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { timeAgo } from "../../utils/book/timeAgo";

const s = StyleSheet.create({
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 2,
  },
  galleryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  showMoreBtn: {
    marginTop: 6,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  showMoreTxt: { fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
  sectionBookList: {
    marginHorizontal: -16,
  },
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

  const oneRowGrid = useMemo(
    () => ({
      ...baseGrid,
      numColumns: Math.min(5, related.length || 5),
      paddingHorizontal: innerPadding * 1.9,
      columnGap: 12,
      minColumnWidth: 180,
    }),
    [baseGrid, related.length]
  );

  const visibleComments = allComments.slice(0, visibleCount);
  const hasMore = visibleCount < allComments.length;

  return (
    <View>
      <View style={s.sectionHead}>
        <Text
          style={[
            s.galleryLabel,
            {
              paddingHorizontal: innerPadding,
              paddingTop: 12,
              paddingBottom: 12,
              color: colors.metaText,
            },
          ]}
        >
          RELATED
        </Text>
      </View>

      <View style={[s.sectionBookList, { marginHorizontal: -innerPadding }]}>
        <BookList
          data={related}
          loading={relLoading}
          refreshing={false}
          onRefresh={refetchRelated}
          isFavorite={(bid) => favorites.has(bid)}
          onToggleFavorite={toggleFav}
          onPress={(bid) =>
            router.push({ pathname: "/book/[id]", params: { id: String(bid) } })
          }
          gridConfig={{ default: oneRowGrid }}
          horizontal
        />
      </View>

      <View style={s.sectionHead}>
        <Text
          style={[
            s.galleryLabel,
            {
              paddingHorizontal: innerPadding,
              paddingTop: 12,
              paddingBottom: 12,
              color: colors.metaText,
            },
          ]}
        >
          COMMENTS
        </Text>
      </View>

      {cmtLoading ? (
        <View
          style={{
            paddingHorizontal: innerPadding,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View
          style={{ paddingHorizontal: innerPadding, gap: 8, paddingBottom: 16 }}
        >
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: colors.page,
                  }}
                >
                  {!!c.avatar && (
                    <ExpoImage
                      source={{ uri: c.avatar }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.txt,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {c.poster?.username || "user"}
                  </Text>
                  <Text style={{ color: colors.metaText, fontSize: 11 }}>
                    {timeAgo(c.post_date)}
                  </Text>
                </View>
              </View>

              <Text style={{ color: colors.txt, fontSize: 13, lineHeight: 18 }}>
                {c.body}
              </Text>
            </View>
          ))}

          {hasMore && (
            <Pressable
              onPress={() =>
                setVisibleCount((n) => Math.min(n + 20, allComments.length))
              }
              style={[
                s.showMoreBtn,
                { borderColor: colors.accent, backgroundColor: colors.tagBg },
              ]}
              android_ripple={{ color: `${colors.accent}22` }}
            >
              <Text style={[s.showMoreTxt, { color: colors.accent }]}>
                Показать ещё 20
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
