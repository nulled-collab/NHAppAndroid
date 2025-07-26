import { Book, Tag } from "@/api/nhentai";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import React, { useMemo, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { styles, TAG_COLORS } from "./BookCard.styles";

import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import SmartImage from "@/components/SmartImage";
import { hsbToHex } from "@/constants/Colors";

const flagEmoji = (lang: string) =>
  ({ english: "🇬🇧", chinese: "🇨🇳", japanese: "🇯🇵" }[lang.toLowerCase()] ??
  "🏳️");

interface Props {
  book: Book;
  isFavorite?: boolean;
  selectedTags?: Tag[];
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
  const { width } = useWindowDimensions();
  const coverW = Math.min(width - 32, 340);
  const [showAllTags, setShowAllTags] = useState(false);

  const isNew = new Date(book.uploaded) > new Date(Date.now() - 86_400_000);

  /* ---------- теги: упорядочить, делить на первые N и остальные ---------- */
  const orderedTags = useMemo(() => {
    const uniq = new Map<number, Tag>();
    book.tags.forEach((t) => uniq.set(t.id, t));
    return [
      "language",
      "artist",
      "character",
      "parody",
      "group",
      "category",
      "tag",
    ].flatMap((type) => [...uniq.values()].filter((t) => t.type === type));
  }, [book.tags]);

  const firstTags = orderedTags.slice(0, 4);
  const totalTags = orderedTags.length;
  const displayTags = showAllTags ? orderedTags : firstTags;

  const variants = buildImageFallbacks(book.cover);

  const isTagSelected = (tag: Tag) =>
    selectedTags.some((t) => t.id === tag.id && t.name === tag.name);

  return (
    <Pressable
      style={[styles.card, { width: coverW }]}
      onPress={() => onPress?.(book.id)}
    >
      {/* ───────── Cover ───────── */}
      <View style={styles.imageWrap}>
        <SmartImage
          sources={variants}
          resizeMode="cover"
          style={[styles.cover, { width: coverW, height: (coverW * 4) / 3 }]}
        />

        {!!book.languages?.length && (
          <Text style={styles.langFlag}>
            {flagEmoji(book.languages[0].name)}
          </Text>
        )}

        {isNew && <Text style={styles.newBadge}>NEW</Text>}

        <Pressable
          style={styles.favBtn}
          onPress={() => onToggleFavorite?.(book.id, !isFavorite)}
        >
          <Feather
            name={isFavorite ? "heart" : "heart"}
            size={18}
            color={isFavorite ? "#ff4040" : "#fff"}
            style={{ opacity: isFavorite ? 1 : 0.5 }}
          />
        </Pressable>
      </View>

      {/* ───────── Body ───────── */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {book.title.pretty}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={hsbToHex({ saturation: 40, brightness: 180 })} />
            <Text style={styles.metaText}>
              {format(new Date(book.uploaded), "d MMM yyyy", { locale: ru })}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Feather name="book-open" size={12} color={hsbToHex({ saturation: 40, brightness: 180 })} />
            <Text style={styles.metaText}>{book.pagesCount}</Text>
          </View>

          <View style={styles.metaItem}>
            <Feather name="eye" size={12} color={hsbToHex({ saturation: 40, brightness: 180 })} />
            <Text style={styles.metaText}>{book.media}</Text>
          </View>

          <View style={styles.metaItem}>
            <Feather name="heart" size={12} color={hsbToHex({ saturation: 40, brightness: 180 })} />
            <Text style={styles.metaText}>{book.favorites}</Text>
          </View>
        </View>

        {/* теги */}
        <View style={styles.tagsRow}>
          {displayTags.map((tag) => (
            <Text
              key={tag.id}
              style={[
                styles.tag,
                { color: TAG_COLORS[tag.type] ?? TAG_COLORS.tag },
                isTagSelected(tag) && styles.tagSelected,
              ]}
              numberOfLines={1}
            >
              {tag.name}
            </Text>
          ))}

          {totalTags > firstTags.length && !showAllTags && (
            <Pressable onPress={() => setShowAllTags(true)}>
              <Text style={[styles.tag, { backgroundColor: "transparent" }]}>
                +{totalTags - firstTags.length}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
