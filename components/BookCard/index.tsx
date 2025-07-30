import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Book, Tag } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { hsbToHex } from "@/constants/Colors";
import { makeCardStyles, TAG_COLORS } from "./BookCard.styles";

const CN_FLAG = require("@/assets/images/flags/CN.png");
const GB_FLAG = require("@/assets/images/flags/GB.png");
const JP_FLAG = require("@/assets/images/flags/JP.png");

const FLAG_MAP: Record<string, any> = {
  chinese: CN_FLAG,
  english: GB_FLAG,
  japanese: JP_FLAG,
};

const FAV_KEY = "bookFavorites";

interface Props {
  book: Book;
  cardWidth?: number;
  isSingleCol?: boolean;
  contentScale?: number;
  isFavorite?: boolean;
  selectedTags?: Tag[];
  onToggleFavorite?: (id: number, next: boolean) => void;
  onPress?: (id: number) => void;
  score?: number; // <--- добавлено!
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
  const [liked, setLiked] = useState<boolean>(isFavorite);
  const [showAllTags, setShowAllTags] = useState(false);
  const styles = makeCardStyles(cardWidth, contentScale);

  const isNew = new Date(book.uploaded) > new Date(Date.now() - 86_400_000);

  useFocusEffect(() => {
    AsyncStorage.getItem(FAV_KEY)
      .then((j) => {
        const arr: number[] = j ? JSON.parse(j) : [];
        setLiked(arr.includes(book.id));
      })
      .catch((e) => console.error("Error reading favorites:", e));
  });

  const handleToggleLike = async () => {
    try {
      const raw = await AsyncStorage.getItem(FAV_KEY);
      const arr: number[] = raw ? JSON.parse(raw) : [];

      const nextLiked = !arr.includes(book.id);
      const nextArr = nextLiked
        ? [...arr, book.id]
        : arr.filter((x) => x !== book.id);

      setLiked(nextLiked);
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(nextArr));

      onToggleFavorite?.(book.id, nextLiked);
    } catch (e) {
      console.error("Error toggling favorite:", e);
    }
  };

  const maxTags = (() => {
    if (cardWidth < 110) return 1;
    if (cardWidth < 250) return 2;
    if (cardWidth < 400) return 3;
    return 4;
  })();

  const orderedTags = useMemo(() => {
    const uniq = new Map<number, Tag>();
    book.tags.forEach((t) => uniq.set(t.id, t));
    return ["artist", "character", "parody", "group", "category", "tag"]
      .flatMap((type) => [...uniq.values()].filter((t) => t.type === type))
      .slice(0, showAllTags ? book.tags.length : maxTags);
  }, [book.tags, showAllTags, cardWidth]);

  const totalTags = book.tags.length;
  const variants = buildImageFallbacks(book.cover);

  const flagSrc = book.languages?.[0]?.name
    ? FLAG_MAP[
        book.languages[0].name.toLowerCase() === "translated" &&
        book.languages[1]?.name
          ? book.languages[1].name.toLowerCase()
          : book.languages[0].name.toLowerCase()
      ]
    : undefined;

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
          resizeMode="cover"
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
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              backgroundColor: "#444",
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              zIndex: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {score}%
            </Text>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable style={styles.favBtn} onPress={handleToggleLike}>
            <Feather
              name="heart"
              color={liked ? "#ff4040" : "#fff"}
              style={{ opacity: liked ? 1 : 0.5 }}
              size={undefined}
            />
          </Pressable>
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
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>
              {format(new Date(book.uploaded), "d MMM yyyy", { locale: ru })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather
              name="book-open"
              size={styles.metaText.fontSize ?? 12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>{book.pagesCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather
              name="heart"
              size={styles.metaText.fontSize ?? 12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>{book.favorites}</Text>
          </View>
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
          {!showAllTags && totalTags > 4 && (
            <Pressable onPress={() => setShowAllTags(true)}>
              <Text style={[styles.tag, { backgroundColor: "transparent" }]}>
                +{totalTags - 4}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
