import { AntDesign, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Book, Tag } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { useTheme } from "@/lib/ThemeContext";
import { makeCardStyles } from "./BookCard.styles";

const FAV_KEY = "bookFavorites";

const CN_FLAG = require("@/assets/images/flags/CN.png");
const GB_FLAG = require("@/assets/images/flags/GB.png");
const JP_FLAG = require("@/assets/images/flags/JP.png");
const FLAG_MAP: Record<string, any> = {
  chinese: CN_FLAG,
  english: GB_FLAG,
  japanese: JP_FLAG,
};

interface Props {
  book: Book;
  cardWidth?: number;
  isSingleCol?: boolean;
  contentScale?: number;
  isFavorite?: boolean;
  selectedTags?: Tag[];
  onToggleFavorite?: (id: number, next: boolean) => void;
  onPress?: (id: number) => void;
  score?: number;
}

export default function BookCard({
  book,
  cardWidth = 160,
  isSingleCol = false,
  contentScale = 1,
  isFavorite = false,
  selectedTags = [],
  onToggleFavorite,
  onPress,
  score,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () => makeCardStyles(colors, cardWidth, contentScale),
    [colors, cardWidth, contentScale]
  );

  const TAG_COLORS = useMemo<Record<string, string>>(
    () => ({
      language: "#FF7D7F",
      artist: "#FB8DF4",
      character: "#F3E17F",
      parody: "#BCEA83",
      group: "#86F0C6",
      category: "#92EFFF",
      tag: colors.tagText,
    }),
    [colors.tagText]
  );

  const [liked, setLiked] = useState(isFavorite);
  const [showAllTags, setShowAllTags] = useState(false);

  const isNew = new Date(book.uploaded) > new Date(Date.now() - 86_400_000);

  useFocusEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then((j) => {
      const arr: number[] = j ? JSON.parse(j) : [];
      setLiked(arr.includes(book.id));
    });
  });

  const toggleLike = async () => {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const next = !arr.includes(book.id);
    const nextArr = next ? [...arr, book.id] : arr.filter((x) => x !== book.id);
    setLiked(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(nextArr));
    onToggleFavorite?.(book.id, next);
  };

  const maxTags =
    cardWidth < 110 ? 1 : cardWidth < 250 ? 2 : cardWidth < 400 ? 3 : 4;
  const orderedTags = useMemo(() => {
    const uniq = new Map<number, Tag>();
    book.tags.forEach((t) => uniq.set(t.id, t));
    return ["artist", "character", "parody", "group", "category", "tag"]
      .flatMap((t) => [...uniq.values()].filter((v) => v.type === t))
      .slice(0, showAllTags ? book.tags.length : maxTags);
  }, [book.tags, showAllTags, cardWidth]);

  const variants = buildImageFallbacks(book.cover);
  const flagSrc =
    book.languages?.[0]?.name &&
    FLAG_MAP[
      book.languages[0].name.toLowerCase() === "translated" && book.languages[1]
        ? book.languages[1].name.toLowerCase()
        : book.languages[0].name.toLowerCase()
    ];

  const heartSize = Math.max(18, Math.round(cardWidth * 0.12 * contentScale));
  const favsDisplay = book.favorites;

  const hideFavInMeta = Boolean(onToggleFavorite);

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(book.id)}>
      <View
        style={[
          styles.imageWrap,
          isSingleCol && { aspectRatio: 0.7, height: undefined },
        ]}
      >
        <SmartImage
          sources={variants}
          style={[
            styles.cover,
            isSingleCol && { aspectRatio: 0.7, height: undefined },
          ]}
        />

        {flagSrc && (
          <Image source={flagSrc} style={styles.flagImg} resizeMode="contain" />
        )}

        {isNew && <Text style={styles.newBadge}>NEW</Text>}

        {score !== undefined && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{score}%</Text>
          </View>
        )}

        {onToggleFavorite && (
          <View style={styles.favWrap}>
            <Pressable
              style={styles.favBtn}
              hitSlop={6}
              onPress={(e: any) => {
                e?.stopPropagation?.();
                toggleLike();
              }}
            >
              <AntDesign
                name={liked ? "heart" : "hearto"}
                size={heartSize}
                color={liked ? "#ff5a5f" : "#fff"}
              />
            </Pressable>
            <Text style={styles.favCount}>{favsDisplay}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {book.title.pretty}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather
              name="calendar"
              size={styles.metaText.fontSize ?? 12}
              color={colors.metaText}
            />
            <Text style={styles.metaText}>
              {format(new Date(book.uploaded), "d MMM yyyy", { locale: ru })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather
              name="book-open"
              size={styles.metaText.fontSize ?? 12}
              color={colors.metaText}
            />
            <Text style={styles.metaText}>{book.pagesCount}</Text>
          </View>

          {!hideFavInMeta && (
            <View style={styles.metaItem}>
              <Feather
                name="heart"
                size={styles.metaText.fontSize ?? 12}
                color={colors.metaText}
              />
              <Text style={styles.metaText}>{book.favorites}</Text>
            </View>
          )}
        </View>

        <View style={styles.tagsRow}>
          {orderedTags.map((tag) => (
            <Text
              key={tag.id}
              numberOfLines={1}
              style={[
                styles.tag,
                { color: TAG_COLORS[tag.type] ?? TAG_COLORS.tag },
                selectedTags.some((t) => t.id === tag.id) && styles.tagSelected,
              ]}
            >
              {tag.name}
            </Text>
          ))}

          {!showAllTags && book.tags.length > maxTags && (
            <Pressable onPress={() => setShowAllTags(true)}>
              <Text style={[styles.tag, { backgroundColor: "transparent" }]}>
                +{book.tags.length - maxTags}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
