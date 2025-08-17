import type { Book } from "@/api/nhentai";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { useTheme } from "@/lib/ThemeContext";
import { AntDesign, Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { timeAgo } from "../utils/timeAgo";
import Ring from "./Ring";
import TagBlock from "./TagBlock";

// Хедер книги: адаптивно под wide/narrow
const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  readBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 10,
  },
  readTxt: { fontWeight: "800", fontSize: 16, letterSpacing: 0.3 },
  iconBtn: { padding: 8, borderRadius: 12 },
  galleryRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  layoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6 },
  layoutTxt: { fontSize: 12 },
});

export default function Hero({
  book,
  containerW,
  pad,
  wide,
  cols,
  cycleCols,
  liked,
  toggleLike,
  dl,
  pr,
  local,
  handleDownloadOrDelete,
  modeOf,
  onTagPress,
  win,
  innerPadding,
}: {
  book: Book;
  containerW: number;
  pad: number;
  wide: boolean;
  cols: number;
  cycleCols: () => void;
  liked: boolean;
  toggleLike: () => void;
  dl: boolean;
  pr: number;
  local: boolean;
  handleDownloadOrDelete: () => void;
  modeOf: (t: { type: string; name: string }) => string | undefined;
  onTagPress: (name: string) => void;
  win: { w: number; h: number };
  innerPadding: number;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const coverAR =
    book.coverW && book.coverH ? book.coverW / book.coverH : 3 / 4;

  // Убираем дубликаты общих тегов из списка "Tags"
  const dedupTags = useMemo(() => {
    const skip = new Set(
      [
        ...(book.artists ?? []),
        ...(book.characters ?? []),
        ...(book.parodies ?? []),
        ...(book.groups ?? []),
        ...(book.categories ?? []),
        ...(book.languages ?? []),
      ].map((t) => t.name)
    );
    return book.tags.filter((t) => !skip.has(t.name));
  }, [book]);

  if (wide) {
    return (
      <View style={{ paddingHorizontal: 10, paddingTop: 8 }}>
        <View
          style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}
        >
          <View style={{ width: Math.min(360, win.w * 0.35) }}>
            <View
              style={{
                width: "100%",
                aspectRatio: coverAR,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: colors.page,
              }}
            >
              <ExpoImage
                source={buildImageFallbacks(book.cover)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                cachePolicy="disk"
              />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <Pressable
              onLongPress={() => Clipboard.setStringAsync(book.title.pretty)}
            >
              <Text
                style={{
                  color: colors.txt,
                  fontSize: 22,
                  fontWeight: "800",
                  marginBottom: 4,
                }}
              >
                {book.title.pretty}
              </Text>
            </Pressable>
            <Pressable
              onLongPress={() => Clipboard.setStringAsync(book.title.english)}
            >
              <Text style={{ color: colors.metaText, fontSize: 14 }}>
                {book.title.english}
              </Text>
            </Pressable>
            {book.title.japanese !== book.title.english && (
              <Pressable
                onLongPress={() =>
                  Clipboard.setStringAsync(book.title.japanese)
                }
              >
                <Text
                  style={{
                    color: colors.metaText,
                    fontSize: 13,
                    fontStyle: "italic",
                  }}
                >
                  {book.title.japanese}
                </Text>
              </Pressable>
            )}

            {!!book.scanlator && (
              <Text
                style={{ color: colors.metaText, fontSize: 12, marginTop: 4 }}
              >
                Scanlated by {book.scanlator}
              </Text>
            )}

            <View style={styles.metaRow}>
              <Feather name="hash" size={14} color={colors.metaText} />
              <Pressable
                onLongPress={() => Clipboard.setStringAsync(String(book.id))}
              >
                <Text style={{ fontSize: 13, color: colors.metaText }}>
                  {book.id}
                </Text>
              </Pressable>

              <Feather
                name="calendar"
                size={14}
                color={colors.metaText}
                style={{ marginLeft: 12 }}
              />
              <Text style={{ fontSize: 13, color: colors.metaText }}>
                {timeAgo(book.uploaded)}
              </Text>

              <Feather
                name="heart"
                size={14}
                color={colors.metaText}
                style={{ marginLeft: 12 }}
              />
              <Text style={{ fontSize: 13, color: colors.metaText }}>
                {book.favorites}
              </Text>

              <Feather
                name="book-open"
                size={14}
                color={colors.metaText}
                style={{ marginLeft: 12 }}
              />
              <Text style={{ fontSize: 13, color: colors.metaText }}>
                {book.pagesCount}
              </Text>
            </View>

            <View style={[styles.actionRow, { marginTop: 14 }]}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/read",
                    params: { id: String(book.id), page: "1" },
                  })
                }
                style={[styles.readBtn, { backgroundColor: colors.accent }]}
              >
                <Feather name="book-open" size={18} color={colors.bg} />
                <Text style={[styles.readTxt, { color: colors.bg }]}>
                  ЧИТАТЬ
                </Text>
              </Pressable>

              <Pressable
                onPress={handleDownloadOrDelete}
                style={styles.iconBtn}
              >
                {dl ? (
                  <Ring progress={pr} />
                ) : local ? (
                  <Feather name="trash-2" size={20} color={colors.accent} />
                ) : (
                  <Feather name="download" size={20} color={colors.accent} />
                )}
              </Pressable>

              <Pressable onPress={toggleLike} style={styles.iconBtn}>
                <AntDesign
                  name={liked ? "heart" : "hearto"}
                  size={20}
                  color={liked ? "#FF5A5F" : colors.accent}
                />
              </Pressable>
            </View>

            {/* Теговые блоки */}
            <TagBlock
              label="Artists"
              tags={book.artists}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Characters"
              tags={book.characters}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Parodies"
              tags={book.parodies}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Groups"
              tags={book.groups}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Categories"
              tags={book.categories}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Languages"
              tags={book.languages}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />
            <TagBlock
              label="Tags"
              tags={dedupTags}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={onTagPress}
            />

            <View style={[styles.galleryRow, { marginTop: 16 }]}>
              <Text style={[styles.galleryLabel, { color: colors.metaText }]}>
                GALLERY
              </Text>
              <Pressable onPress={cycleCols} style={styles.layoutBtn}>
                <Feather name="layout" size={18} color={colors.metaText} />
                <Text style={[styles.layoutTxt, { color: colors.metaText }]}>
                  {cols}×
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // — narrow layout —
  const contentW = containerW - pad * 2;
  const cardW = contentW * 0.78;

  return (
    <View style={{ paddingHorizontal: pad, position: "relative" }}>
      <View
        style={{
          width: containerW,
          alignSelf: "center",
          aspectRatio: coverAR,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={buildImageFallbacks(book.cover)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
        />
        <LinearGradient
          colors={[`${colors.bg}ff`, `${colors.bg}b8`, `${colors.bg}ff`]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <View
        style={{
          position: "absolute",
          left: (contentW - cardW) / 2,
          top: contentW * 0.1,
          width: cardW,
          height: cardW * 1.35,
          borderRadius: 26,
          overflow: "hidden",
          backgroundColor: colors.page,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.16,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <ExpoImage
          source={buildImageFallbacks(book.cover)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>

      <View
        style={{
          paddingHorizontal: 0,
          marginTop:
            cardW * 1.35 + contentW * 0.1 + 12 - contentW / (coverAR || 0.75),
        }}
      >
        <Pressable
          onLongPress={() => Clipboard.setStringAsync(book.title.pretty)}
        >
          <Text
            style={{
              color: colors.txt,
              fontSize: 20,
              fontWeight: "800",
              marginBottom: 4,
            }}
          >
            {book.title.pretty}
          </Text>
        </Pressable>
        <Pressable
          onLongPress={() => Clipboard.setStringAsync(book.title.english)}
        >
          <Text style={{ color: colors.metaText, fontSize: 14 }}>
            {book.title.english}
          </Text>
        </Pressable>
        {book.title.japanese !== book.title.english && (
          <Pressable
            onLongPress={() => Clipboard.setStringAsync(book.title.japanese)}
          >
            <Text
              style={{
                color: colors.metaText,
                fontSize: 13,
                fontStyle: "italic",
              }}
            >
              {book.title.japanese}
            </Text>
          </Pressable>
        )}

        {!!book.scanlator && (
          <Text style={{ color: colors.metaText, fontSize: 12, marginTop: 4 }}>
            Scanlated by {book.scanlator}
          </Text>
        )}

        <View style={styles.metaRow}>
          <Feather name="hash" size={14} color={colors.metaText} />
          <Pressable
            onLongPress={() => Clipboard.setStringAsync(String(book.id))}
          >
            <Text style={{ fontSize: 13, color: colors.metaText }}>
              {book.id}
            </Text>
          </Pressable>

          <Feather
            name="calendar"
            size={14}
            color={colors.metaText}
            style={{ marginLeft: 12 }}
          />
          <Text style={{ fontSize: 13, color: colors.metaText }}>
            {timeAgo(book.uploaded)}
          </Text>

          <Feather
            name="heart"
            size={14}
            color={colors.metaText}
            style={{ marginLeft: 12 }}
          />
          <Text style={{ fontSize: 13, color: colors.metaText }}>
            {book.favorites}
          </Text>

          <Feather
            name="book-open"
            size={14}
            color={colors.metaText}
            style={{ marginLeft: 12 }}
          />
          <Text style={{ fontSize: 13, color: colors.metaText }}>
            {book.pagesCount}
          </Text>
        </View>

        <View style={[styles.actionRow, { marginTop: 14 }]}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/read",
                params: { id: String(book.id), page: "1" },
              })
            }
            style={[styles.readBtn, { backgroundColor: colors.accent }]}
          >
            <Feather name="book-open" size={18} color={colors.bg} />
            <Text style={[styles.readTxt, { color: colors.bg }]}>ЧИТАТЬ</Text>
          </Pressable>

          <Pressable onPress={handleDownloadOrDelete} style={styles.iconBtn}>
            {dl ? (
              <Ring progress={pr} />
            ) : local ? (
              <Feather name="trash-2" size={20} color={colors.accent} />
            ) : (
              <Feather name="download" size={20} color={colors.accent} />
            )}
          </Pressable>

          <Pressable onPress={toggleLike} style={styles.iconBtn}>
            <AntDesign
              name={liked ? "heart" : "hearto"}
              size={20}
              color={liked ? "#FF5A5F" : colors.accent}
            />
          </Pressable>
        </View>

        <TagBlock
          label="Artists"
          tags={book.artists}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Characters"
          tags={book.characters}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Parodies"
          tags={book.parodies}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Groups"
          tags={book.groups}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Categories"
          tags={book.categories}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Languages"
          tags={book.languages}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />
        <TagBlock
          label="Tags"
          tags={dedupTags}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={onTagPress}
        />

        <View style={[styles.galleryRow, { marginTop: 16 }]}>
          <Text style={[styles.galleryLabel, { color: colors.metaText }]}>
            GALLERY
          </Text>
          <Pressable onPress={cycleCols} style={styles.layoutBtn}>
            <Feather name="layout" size={18} color={colors.metaText} />
            <Text style={[styles.layoutTxt, { color: colors.metaText }]}>
              {cols}×
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
