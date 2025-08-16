import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg";

import {
  Book,
  GalleryComment,
  getBook,
  getComments,
  getRelatedBooks,
  loadBookFromLocal,
} from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { useFilterTags } from "@/context/TagFilterContext";
import { useGridConfig } from "@/hooks/useGridConfig";
import { useTheme } from "@/lib/ThemeContext";

/* ===========================
   utils
   =========================== */

const { width: INIT_W, height: INIT_H } = Dimensions.get("window");
const GAP = 10;
const FAB_SIZE = 48;
const COLS_KEY = "galleryColumns";
const FAVORITES = "bookFavorites";

// форматирование времени "N units ago"
const timeAgo = (d: string | number) => {
  const t = typeof d === "string" ? Date.parse(d) : d * 1000;
  const s = Math.floor((Date.now() - t) / 1000);
  const tbl: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [u, n] of tbl) {
    if (s >= n) {
      const v = Math.floor(s / n);
      return `${v} ${u}${v > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
};

const sanitize = (s: string) => s.replace(/[^a-z0-9_\-]+/gi, "_");

// лёгкий хук-троттлер, чтобы не спамить setState
const useThrottle = <T extends any[]>(fn: (...args: T) => void, ms: number) => {
  const last = useRef(0);
  return useCallback(
    (...args: T) => {
      const now = Date.now();
      if (now - last.current >= ms) {
        last.current = now;
        fn(...args);
      }
    },
    [fn, ms]
  );
};

/* ===========================
   small UI atoms
   =========================== */

const Ring = ({
  progress,
  size = 22,
  stroke = 3,
}: {
  progress: number;
  size?: number;
  stroke?: number;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - progress);
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.accent}
        strokeOpacity={0.3}
        strokeWidth={stroke}
        fill="none"
      />
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.accent}
        strokeWidth={stroke}
        strokeDasharray={`${c}`}
        strokeDashoffset={off}
        strokeLinecap="round"
        fill="none"
        rotation={-90}
        origin={`${size / 2},${size / 2}`}
      />
    </Svg>
  );
};

// Одна плитка страницы галереи. Мемоизирована, чтобы не перерисовываться зря.
const PageItem = memo(
  function PageItem({
    page,
    itemW,
    cols,
    metaColor,
    onPress,
  }: {
    page: { page: number; url: string; width: number; height: number };
    itemW: number;
    cols: number;
    metaColor: string;
    onPress: () => void;
  }) {
    return (
      <Pressable onPress={onPress} style={{ width: itemW, marginBottom: GAP }}>
        <ExpoImage
          source={{ uri: page.url }}
          style={
            cols === 1
              ? {
                  width: itemW,
                  aspectRatio: page.width / page.height,
                  borderRadius: 10,
                }
              : { width: itemW, height: itemW, borderRadius: 10 }
          }
          contentFit={cols === 1 ? "contain" : "cover"}
          cachePolicy="disk"
        />
        <Text
          style={{
            color: metaColor,
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {page.page}
        </Text>
      </Pressable>
    );
  },
  (a, b) =>
    a.page.url === b.page.url &&
    a.page.page === b.page.page &&
    a.itemW === b.itemW &&
    a.cols === b.cols &&
    a.metaColor === b.metaColor
);

// Блок с тегами — мемо, чтобы не прыгал
const TagBlock = memo(function TagBlock({
  label,
  tags,
  modeOf,
  cycle,
  onTagPress,
}: {
  label: string;
  tags?: { type: string; name: string; count?: number }[];
  modeOf: (t: { type: string; name: string }) => string | undefined;
  cycle: (t: { type: any; name: string }) => void;
  onTagPress: (name: string) => void;
}) {
  const { colors } = useTheme();
  if (!tags?.length) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text
        style={{
          color: colors.title,
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 6,
        }}
      >
        {label}:
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {tags.map((t) => {
          const mode = modeOf(t);
          const icon =
            mode === "include"
              ? "check-circle"
              : mode === "exclude"
              ? "minus-circle"
              : "plus-circle";
          return (
            <Pressable
              key={`${label}:${t.name}`}
              onPress={() => onTagPress(t.name)}
              onLongPress={() => Clipboard.setStringAsync(t.name)}
              style={[
                styles.tagBox,
                { backgroundColor: colors.tagBg, borderColor: "transparent" },
                mode === "include" && {
                  borderWidth: 1,
                  borderColor: colors.incTxt,
                },
                mode === "exclude" && {
                  borderWidth: 1,
                  borderColor: colors.excTxt,
                },
              ]}
            >
              <Text style={[styles.tagTxt, { color: colors.tagText }]}>
                {t.name} {t.count ? `(${t.count})` : ""}
              </Text>
              <Feather
                name={icon as any}
                size={14}
                color={mode === "exclude" ? colors.excTxt : colors.incTxt}
                style={{ marginLeft: 4 }}
                onPress={() => cycle({ type: t.type as any, name: t.name })}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

/* ===========================
   Hero (header) — мемо
   =========================== */

const Hero = memo(function Hero({
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
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
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
                <Text style={[styles.metaTxt, { color: colors.metaText }]}>
                  {book.id}
                </Text>
              </Pressable>

              <Feather
                name="calendar"
                size={14}
                color={colors.metaText}
                style={{ marginLeft: 12 }}
              />
              <Text style={[styles.metaTxt, { color: colors.metaText }]}>
                {timeAgo(book.uploaded)}
              </Text>

              <Feather
                name="heart"
                size={14}
                color={colors.metaText}
                style={{ marginLeft: 12 }}
              />
              <Text style={[styles.metaTxt, { color: colors.metaText }]}>
                {book.favorites}
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

            <TagBlock
              label="Artists"
              tags={book.artists}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Characters"
              tags={book.characters}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Parodies"
              tags={book.parodies}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Groups"
              tags={book.groups}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Categories"
              tags={book.categories}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Languages"
              tags={book.languages}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
            <TagBlock
              label="Tags"
              tags={dedupTags}
              modeOf={modeOf}
              cycle={() => {}}
              onTagPress={(name) =>
                router.push({ pathname: "/explore", params: { query: name } })
              }
            />
          </View>
        </View>

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
    );
  }

  // narrow layout
  const contentW = containerW - pad * 2;
  const cardW = contentW * 0.78;

  return (
    <View style={{ paddingHorizontal: pad, position: "relative" }}>
      <View
        style={{
          width: contentW,
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
            <Text style={[styles.metaTxt, { color: colors.metaText }]}>
              {book.id}
            </Text>
          </Pressable>

          <Feather
            name="calendar"
            size={14}
            color={colors.metaText}
            style={{ marginLeft: 12 }}
          />
          <Text style={[styles.metaTxt, { color: colors.metaText }]}>
            {timeAgo(book.uploaded)}
          </Text>

          <Feather
            name="heart"
            size={14}
            color={colors.metaText}
            style={{ marginLeft: 12 }}
          />
          <Text style={[styles.metaTxt, { color: colors.metaText }]}>
            {book.favorites}
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
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Characters"
          tags={book.characters}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Parodies"
          tags={book.parodies}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Groups"
          tags={book.groups}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Categories"
          tags={book.categories}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Languages"
          tags={book.languages}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
        />
        <TagBlock
          label="Tags"
          tags={dedupTags}
          modeOf={modeOf}
          cycle={() => {}}
          onTagPress={(name) =>
            router.push({ pathname: "/explore", params: { query: name } })
          }
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
});

/* ===========================
   Footer — мемо
   =========================== */

const Footer = memo(function Footer({
  related,
  relLoading,
  refetchRelated,
  favorites,
  toggleFav,
  router,
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
  router: ReturnType<typeof useRouter>;
  baseGrid: ReturnType<typeof useGridConfig>;
  allComments: GalleryComment[];
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  cmtLoading: boolean;
  innerPadding: number;
}) {
  const { colors } = useTheme();

  // оставил useMemo — пригодится, если вернёшься к гриду
  const oneRowGrid = useMemo(
    () => ({
      ...baseGrid,
      numColumns: Math.min(5, related.length || 5),
    }),
    [baseGrid, related.length]
  );

  const visibleComments = allComments.slice(0, visibleCount);
  const hasMore = visibleCount < allComments.length;

  return (
    <View>
      <View style={styles.sectionHead}>
        <Text
          style={[
            styles.galleryLabel,
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: innerPadding, width: "100%" },
        ]}
      >
        {related.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            vertical="false" // ← включает новый «лист-тайл»
            cardWidth={160} // ← регулирует высоту строки (примерно 132–160)
            background={colors.related}
            isFavorite={favorites.has(b.id)}
            onToggleFavorite={toggleFav}
            onPress={(id) =>
              router.push({
                pathname: "/book/[id]",
                params: { id: String(id) },
              })
            }
          />
        ))}
      </ScrollView>

      <View style={styles.sectionHead}>
        <Text
          style={[
            styles.galleryLabel,
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
          style={[
            {
              paddingHorizontal: innerPadding,
              paddingVertical: 16,
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <View
          style={[
            {
              paddingHorizontal: innerPadding,
              gap: 8,
              paddingBottom: 16,
            },
          ]}
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
                styles.showMoreBtn,
                { borderColor: colors.accent, backgroundColor: colors.tagBg },
              ]}
              android_ripple={{ color: `${colors.accent}22` }}
            >
              <Text style={[styles.showMoreTxt, { color: colors.accent }]}>
                Показать ещё 20
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

/* ===========================
   Main screen
   =========================== */

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const baseGrid = useGridConfig();
  const { filters, cycle } = useFilterTags();

  const [win, setWin] = useState({ w: INIT_W, h: INIT_H });
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) =>
      setWin({ w: window.width, h: window.height })
    );
    return () => sub.remove();
  }, []);
  const shortest = Math.min(win.w, win.h);
  const isTablet = shortest >= 600;
  const isLandscape = win.w > win.h;
  const wide = isTablet || (isLandscape && win.w >= 800);
  const innerPadding = wide ? 16 : 12;

  const listRef = useRef<FlatList>(null);
  const scrollY = useRef(0);
  const fabScale = useRef(new Animated.Value(0)).current;
  const fabVisibleRef = useRef(false);

  const [book, setBook] = useState<Book | null>(null);
  const [cols, setCols] = useState(1);
  const [liked, setLiked] = useState(false);
  const [dl, setDL] = useState(false);
  const [pr, setPr] = useState(0);
  const [local, setLocal] = useState(false);
  const [listW, setListW] = useState(win.w);

  const [related, setRelated] = useState<Book[]>([]);
  const [relLoading, setRelLoading] = useState(false);

  const [allComments, setAllComments] = useState<GalleryComment[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [cmtLoading, setCmtLoading] = useState(false);

  const [favorites, setFav] = useState<Set<number>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES).then(
      (j) => j && setFav(new Set(JSON.parse(j)))
    );
  }, []);
  const toggleFav = useCallback((bid: number, next: boolean) => {
    setFav((prev) => {
      const cp = new Set(prev);
      next ? cp.add(bid) : cp.delete(bid);
      AsyncStorage.setItem(FAVORITES, JSON.stringify([...cp]));
      return cp;
    });
  }, []);

  // загрузка книги (локальной или с API)
  useEffect(() => {
    (async () => {
      const bLocal = await loadBookFromLocal(+id);
      if (bLocal) {
        setBook(bLocal);
        setLocal(true);
        return;
      }
      try {
        setBook(await getBook(+id));
      } catch {
        if (Platform.OS === "android")
          ToastAndroid.show("Unable to load", ToastAndroid.LONG);
        router.back();
      }
    })();
  }, [id]);

  // отложенная подгрузка heavy-частей после первого кадра
  const refetchRelated = useCallback(async () => {
    if (!book) return;
    try {
      setRelLoading(true);
      const r = await getRelatedBooks(book.id);
      setRelated(r.books.slice(0, 5));
    } catch {
      setRelated([]);
    } finally {
      setRelLoading(false);
    }
  }, [book?.id]);

  const refetchComments = useCallback(async () => {
    if (!book) return;
    try {
      setCmtLoading(true);
      const cs = await getComments(book.id);
      setAllComments(cs);
      setVisibleCount(20);
    } catch {
      setAllComments([]);
      setVisibleCount(0);
    } finally {
      setCmtLoading(false);
    }
  }, [book?.id]);

  useEffect(() => {
    if (!book) return;
    const task = InteractionManager.runAfterInteractions(() => {
      refetchRelated();
      refetchComments();
    });
    return () => task.cancel();
  }, [book?.id, refetchRelated, refetchComments]);

  // колонки
  useEffect(() => {
    AsyncStorage.getItem(COLS_KEY).then((s) => {
      const saved = Math.min(Math.max(parseInt(s ?? "0") || 0, 1), 4);
      if (saved) setCols(saved);
      else setCols(wide ? 3 : 1);
    });
  }, [wide]);

  const cycleCols = () => {
    const keep = scrollY.current;
    setCols((c) => {
      const max = wide ? 4 : 3;
      const n = c >= max ? 1 : c + 1;
      AsyncStorage.setItem(COLS_KEY, String(n));
      return n;
    });
    setTimeout(
      () => listRef.current?.scrollToOffset({ offset: keep, animated: false }),
      0
    );
  };

  // лайки
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES).then((j) => {
      const arr: number[] = j ? JSON.parse(j) : [];
      setLiked(arr.includes(+id));
    });
  }, [id]);

  const toggleLike = async () => {
    const j = await AsyncStorage.getItem(FAVORITES);
    const arr: number[] = j ? JSON.parse(j) : [];
    const next = arr.includes(+id)
      ? arr.filter((x) => x !== +id)
      : [...arr, +id];
    setLiked(!arr.includes(+id));
    await AsyncStorage.setItem(FAVORITES, JSON.stringify(next));
  };

  // прогресс — троттлим, чтобы не ронять FPS
  const setPrThrottled = useThrottle((v: number) => setPr(v), 120);

  // загрузка/удаление локалки — ИММУТАБЕЛЬНО
  const handleDownloadOrDelete = useCallback(async () => {
    if (!book || dl) return;

    const lang = book.languages?.[0]?.name ?? "Unknown";
    const title = sanitize(book.title.pretty);
    const dir = `${FileSystem.documentDirectory}NHAppAndroid/${
      book.id
    }_${title}/${sanitize(lang)}/`;

    setDL(true);
    setPr(0);

    try {
      if (local) {
        const nhDir = `${FileSystem.documentDirectory}NHAppAndroid/`;
        const titles = await FileSystem.readDirectoryAsync(nhDir);

        for (const t of titles) {
          const titleDir = `${nhDir}${t}/`;
          const langs = await FileSystem.readDirectoryAsync(titleDir);
          for (const l of langs) {
            const langDir = `${titleDir}${l}/`;
            const metaUri = `${langDir}metadata.json`;
            const info = await FileSystem.getInfoAsync(metaUri);
            if (!info.exists) continue;

            try {
              const raw = await FileSystem.readAsStringAsync(metaUri);
              const meta = JSON.parse(raw);
              if (meta.id !== book.id) continue;

              await FileSystem.deleteAsync(titleDir, { idempotent: true });
              if (Platform.OS === "android")
                ToastAndroid.show("Deleted", ToastAndroid.SHORT);
              setLocal(false);
              setBook(null);
              router.back();
              return;
            } catch {}
          }
        }
        if (Platform.OS === "android")
          ToastAndroid.show("Book not found locally", ToastAndroid.SHORT);
        return;
      }

      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const total = book.pages.length;
      const pagesCopy = [...book.pages];

      for (let i = 0; i < total; i++) {
        const p = pagesCopy[i];
        const num = (i + 1).toString().padStart(3, "0");
        const ext = p.url.split(".").pop()!.split("?")[0];
        const uri = `${dir}Image${num}.${ext}`;

        const exists = (await FileSystem.getInfoAsync(uri)).exists;
        if (!exists) await FileSystem.downloadAsync(p.url, uri);

        pagesCopy[i] = { ...p, url: uri, urlThumb: uri };

        if ((i & 3) === 3) setPrThrottled((i + 1) / total);
      }

      await FileSystem.writeAsStringAsync(
        `${dir}metadata.json`,
        JSON.stringify({ ...book, pages: pagesCopy }),
        { encoding: "utf8" }
      );

      setBook((prev) => (prev ? { ...prev, pages: pagesCopy } : prev));
      setPr(1);
      if (Platform.OS === "android")
        ToastAndroid.show("Saved", ToastAndroid.SHORT);
      setLocal(true);
    } catch (e) {
      console.error(e);
      if (Platform.OS === "android")
        ToastAndroid.show("Error", ToastAndroid.LONG);
    } finally {
      setDL(false);
      setTimeout(() => setPr(0), 150);
    }
  }, [book, dl, local, router, setPrThrottled]);

  // фильтры — быстрое определение режима
  const modeOf = useCallback(
    (t: { type: string; name: string }) =>
      filters.find((f) => f.type === t.type && f.name === t.name)?.mode,
    [filters]
  );

  // анимация FAB
  const animateFab = useCallback(
    (show: boolean) => {
      if (fabVisibleRef.current === show) return;
      fabVisibleRef.current = show;
      Animated.timing(fabScale, {
        toValue: show ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [fabScale]
  );

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - scrollY.current;
    scrollY.current = y;
    if (dy > 10 && y > 160) animateFab(true);
    if (dy < -10 && y < 160) animateFab(false);
  };

  const scrollTop = () =>
    listRef.current?.scrollToOffset({ offset: 0, animated: true });

  // header/footer как элементы (мемо)
  const headerEl = useMemo(() => {
    if (!book) return null;
    return (
      <Hero
        book={book}
        containerW={listW || win.w}
        pad={innerPadding}
        wide={isTablet || (isLandscape && win.w >= 800)}
        cols={cols}
        cycleCols={cycleCols}
        liked={liked}
        toggleLike={toggleLike}
        dl={dl}
        pr={pr}
        local={local}
        handleDownloadOrDelete={handleDownloadOrDelete}
        modeOf={modeOf}
        onTagPress={(name) =>
          router.push({ pathname: "/explore", params: { query: name } })
        }
        win={win}
        innerPadding={innerPadding}
      />
    );
  }, [
    book,
    listW,
    win,
    innerPadding,
    isTablet,
    isLandscape,
    cols,
    liked,
    dl,
    pr,
    local,
    handleDownloadOrDelete,
    modeOf,
    router,
  ]);

  const footerEl = useMemo(() => {
    return (
      <Footer
        related={related}
        relLoading={relLoading}
        refetchRelated={refetchRelated}
        favorites={favorites}
        toggleFav={toggleFav}
        router={router}
        baseGrid={baseGrid}
        allComments={allComments}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
        cmtLoading={cmtLoading}
        innerPadding={innerPadding}
      />
    );
  }, [
    related,
    relLoading,
    refetchRelated,
    favorites,
    toggleFav,
    router,
    baseGrid,
    allComments,
    visibleCount,
    setVisibleCount,
    cmtLoading,
    innerPadding,
  ]);

  // ВАЖНО: все хуки — выше любого раннего return!
  // стабильный renderItem — объявляем ДО проверки !book
  const renderItem = useCallback(
    ({ item }: { item: Book["pages"][number] }) => {
      const availableW = listW || win.w;
      const gapsTotal = GAP * (cols - 1);
      const itemW = Math.floor((availableW - gapsTotal) / cols);
      const onPress = () =>
        router.push({
          pathname: "/read",
          params: { id: String(book?.id), page: String(item.page) },
        });
      return (
        <PageItem
          page={item}
          itemW={itemW}
          cols={cols}
          metaColor={colors.metaText}
          onPress={onPress}
        />
      );
    },
    [book?.id, cols, listW, win.w, colors.metaText, router]
  );

  if (!book) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const getItemLayout =
    cols > 1
      ? (_: any, index: number) => {
          const availableW = listW || win.w;
          const gapsTotal = GAP * (cols - 1);
          const itemW = Math.floor((availableW - gapsTotal) / cols);
          const row = Math.floor(index / cols);
          const rowH = itemW + GAP;
          return { length: rowH, offset: row * rowH, index };
        }
      : undefined;

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      onLayout={(e) => setListW(e.nativeEvent.layout.width)}
    >
      <FlatList
        ref={listRef}
        data={book.pages}
        key={cols}
        numColumns={cols}
        keyExtractor={(p) => String(p.page)}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        columnWrapperStyle={
          cols > 1
            ? {
                gap: GAP,
                alignItems: "flex-start",
                justifyContent: "flex-start",
              }
            : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={headerEl}
        ListFooterComponent={footerEl}
        removeClippedSubviews
        initialNumToRender={cols === 1 ? 6 : 12}
        maxToRenderPerBatch={cols === 1 ? 6 : 16}
        updateCellsBatchingPeriod={16}
        windowSize={7}
        getItemLayout={getItemLayout as any}
      />

      <Animated.View
        style={[
          styles.fab,
          { transform: [{ scale: fabScale }], opacity: fabScale },
        ]}
      >
        <Pressable
          onPress={scrollTop}
          style={[styles.fabBtn, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="arrow-up" size={24} color={colors.bg} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ===========================
   styles
   =========================== */

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  metaTxt: { fontSize: 13 },

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

  tagBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 4,
  },
  tagTxt: { fontSize: 12, paddingRight: 2 },

  galleryRow: {
    paddingHorizontal: 0,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  layoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6 },
  layoutTxt: { fontSize: 12 },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 2,
  },

  scrollContent: {
    gap: 12,
    padding: 4,
  },

  showMoreBtn: {
    marginTop: 6,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  showMoreTxt: { fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },

  fab: { position: "absolute", right: 16, bottom: 36 },
  fabBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
