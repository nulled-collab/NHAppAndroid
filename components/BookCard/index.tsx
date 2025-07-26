import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useFocusEffect } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { Book, Tag } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { hsbToHex } from "@/constants/Colors";
import { styles, TAG_COLORS } from "./BookCard.styles";

/* PNG-флаги (положите файлы в assets/images/flags) */
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
  /** первоначальное значение от родителя, чтобы не ждать чтения из storage */
  isFavorite?: boolean;
  selectedTags?: Tag[];
  /**
   * Родитель, если хочет, может отслеживать изменения.
   * Но для самой карточки этот проп не обязателен.
   */
  onToggleFavorite?: (id: number, next: boolean) => void;
  onPress?: (id: number) => void;
}

export default function BookCard({
  book,
  isFavorite = false,
  selectedTags = [],
  onToggleFavorite,
  onPress,
}: Props) {
  /** размеры карточки адаптируем к ширине экрана */
  const { width } = useWindowDimensions();
  const coverW = Math.min(width - 32, 340);

  /** локальный лайк — сразу реагирует на изменения */
  const [liked, setLiked] = useState<boolean>(isFavorite);

  /** разворачивать/сворачивать теги */
  const [showAllTags, setShowAllTags] = useState(false);

  /** «NEW» — если аплоад в последние 24 ч */
  const isNew = new Date(book.uploaded) > new Date(Date.now() - 86_400_000);

  /* -----------  фокус экрана → перечитать избранное  ------------ */
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(FAV_KEY)
        .then((j) => {
          const arr: number[] = j ? JSON.parse(j) : [];
          setLiked(arr.includes(book.id));
        })
        .catch(() => {});
    }, [book.id])
  );

  /* -----------  переключатель лайка  ------------ */
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
    } catch {
      /* silent */
    }
  };

  /* -----------  теги в нужном порядке  ------------ */
  const orderedTags = useMemo(() => {
    const uniq = new Map<number, Tag>();
    book.tags.forEach((t) => uniq.set(t.id, t));
    return (
      [
        "language",
        "artist",
        "character",
        "parody",
        "group",
        "category",
        "tag",
      ]
        .flatMap((type) => [...uniq.values()].filter((t) => t.type === type))
        // показываем только первые 4, если не раскрыто
        .slice(0, showAllTags ? undefined : 4)
    );
  }, [book.tags, showAllTags]);

  const totalTags = book.tags.length;
  const variants = buildImageFallbacks(book.cover);

  /* флаг по первому языку (если найден PNG) */
  const flagSrc =
    book.languages?.[0]?.name &&
    FLAG_MAP[book.languages[0].name.toLowerCase()];

  /* -----------  UI  ------------ */
  return (
    <Pressable
      style={[styles.card, { width: coverW }]}
      onPress={() => onPress?.(book.id)}
    >
      {/* ---------- обложка ---------- */}
      <View style={styles.imageWrap}>
        <SmartImage
          sources={variants}
          resizeMode="cover"
          style={[styles.cover, { width: coverW, height: (coverW * 4) / 3 }]}
        />

        {flagSrc && (
          <Image
            source={flagSrc}
            style={styles.flagImg}
            resizeMode="contain"
          />
        )}

        {isNew && <Text style={styles.newBadge}>NEW</Text>}

        {onToggleFavorite && (
          <Pressable style={styles.favBtn} onPress={handleToggleLike}>
            <Feather
              name="heart"
              size={18}
              color={liked ? "#ff4040" : "#fff"}
              style={{ opacity: liked ? 1 : 0.5 }}
            />
          </Pressable>
        )}
      </View>

      {/* ---------- подпись + мета ---------- */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {book.title.pretty}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather
              name="calendar"
              size={12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>
              {format(new Date(book.uploaded), "d MMM yyyy", { locale: ru })}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Feather
              name="book-open"
              size={12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>{book.pagesCount}</Text>
          </View>

          <View style={styles.metaItem}>
            <Feather
              name="eye"
              size={12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>{book.media}</Text>
          </View>

          <View style={styles.metaItem}>
            <Feather
              name="heart"
              size={12}
              color={hsbToHex({ saturation: 40, brightness: 180 })}
            />
            <Text style={styles.metaText}>{book.favorites}</Text>
          </View>
        </View>

        {/* ---------- теги ---------- */}
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
