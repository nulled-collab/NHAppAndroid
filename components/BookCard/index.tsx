import { useI18n } from "@/lib/i18n/I18nContext";
import { AntDesign, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { enUS, ja, ru, zhCN } from "date-fns/locale";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Book, Tag } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { useFilterTags } from "@/context/TagFilterContext";
import { useTheme } from "@/lib/ThemeContext";
import { makeCardStyles } from "./BookCard.styles";

const FAV_KEY = "bookFavorites";
const READ_HISTORY_KEY = "readHistory";
type ReadHistoryEntry = [number, number, number, number];

const CN_FLAG = require("@/assets/images/flags/CN.png");
const GB_FLAG = require("@/assets/images/flags/GB.png");
const JP_FLAG = require("@/assets/images/flags/JP.png");
const FLAG_MAP: Record<string, any> = {
  chinese: CN_FLAG,
  english: GB_FLAG,
  japanese: JP_FLAG,
};

export interface BookCardProps {
  book: Book;
  cardWidth?: number;
  isSingleCol?: boolean;
  contentScale?: number;
  isFavorite?: boolean;
  selectedTags?: Tag[]; // совместимость
  onToggleFavorite?: (id: number, next: boolean) => void;
  onPress?: (id: number) => void;
  score?: number;
  background?: string;
  vertical?: boolean | "true" | "false";
  showProgressOnCard?: boolean;
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
  background,
  showProgressOnCard = true,
}: BookCardProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(
    () => makeCardStyles(colors, cardWidth, contentScale),
    [colors, cardWidth, contentScale]
  );

  const { t, resolved } = useI18n();
  const dateLocale =
    resolved === "ru"
      ? ru
      : resolved === "zh"
      ? zhCN
      : resolved === "ja"
      ? ja
      : enUS;

  const coverAR = 0.68;

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

  const incColor = (colors as any).incTxt ?? colors.accent;
  const excColor = (colors as any).excTxt ?? "#FF5A5F";

  const [liked, setLiked] = useState(isFavorite);
  const [showAllTags, setShowAllTags] = useState(false);
  const [rh, setRh] = useState<{
    current: number;
    total: number;
    ts: number;
  } | null>(null);

  const isNew = new Date(book.uploaded) > new Date(Date.now() - 86_400_000);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      AsyncStorage.getItem(FAV_KEY).then((j) => {
        if (!alive) return;
        const arr: number[] = j ? JSON.parse(j) : [];
        setLiked(arr.includes(book.id));
      });

      AsyncStorage.getItem(READ_HISTORY_KEY)
        .then((raw) => {
          if (!alive) return;
          if (!raw) return setRh(null);
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return setRh(null);
          }
          if (!Array.isArray(parsed)) return setRh(null);
          const found = (parsed as ReadHistoryEntry[]).find(
            (e) => e?.[0] === book.id
          );
          if (!found) return setRh(null);
          const [, current, total, ts] = found;
          const t = Math.max(1, Number(total) || book.pagesCount || 1);
          const c = Math.min(Math.max(0, Number(current) || 0), t - 1);
          const ti = Number(ts) || Math.floor(Date.now() / 1000);
          setRh({ current: c, total: t, ts: ti });
        })
        .catch(() => setRh(null));

      return () => {
        alive = false;
      };
    }, [book.id, book.pagesCount])
  );

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

  // Подсветка активных тегов
  const { filters } = useFilterTags();
  const modeOf = useCallback(
    (t: { type: string; name: string }): "include" | "exclude" | undefined => {
      const m = filters.find(
        (f) => f.type === t.type && f.name === t.name
      )?.mode;
      return m === "include" || m === "exclude" ? m : undefined;
    },
    [filters]
  );

  // Все теги в фиксированном порядке
  const orderedTags = useMemo(() => {
    const uniq = new Map<number, Tag>();
    book.tags.forEach((t) => uniq.set(t.id, t));
    return [
      "artist",
      "character",
      "parody",
      "group",
      "category",
      "tag",
    ].flatMap((tp) => [...uniq.values()].filter((v) => v.type === tp));
  }, [book.tags]);

  const visibleTags = useMemo(
    () => (showAllTags ? orderedTags : orderedTags.slice(0, maxTags)),
    [orderedTags, showAllTags, maxTags]
  );

  const capFirstTwo = !showAllTags && visibleTags.length >= 2;

  // === пер-теговый максимум ширины в СВЁРНУТОМ виде ===
  const collapsedMaxFor = useCallback(
    (index: number, len: number) => {
      // базовые доли строки; чуть уменьшаем, чтобы осталось место под отступы и +N
      if (len <= 1) return Math.max(90, Math.round(cardWidth * 0.88));
      if (len === 2) return Math.max(90, Math.round(cardWidth * 0.44));
      // 3+ тегов: первым двум даём побольше, остальным поменьше
      if (index < 2) return Math.max(90, Math.round(cardWidth * 0.4));
      return Math.max(70, Math.round(cardWidth * 0.28));
    },
    [cardWidth]
  );

  const variants = buildImageFallbacks(book.cover);
  const flagSrc =
    book.languages?.[0]?.name &&
    FLAG_MAP[
      book.languages[0].name.toLowerCase() === "translated" && book.languages[1]
        ? book.languages[1].name.toLowerCase()
        : book.languages[0].name.toLowerCase()
    ];

  const heartSize = Math.max(16, Math.round(cardWidth * 0.12 * contentScale));
  const favsDisplay = book.favorites;

  const progress = useMemo(() => {
    if (!rh) return null;
    const done = rh.current >= rh.total - 1;
    const ratio = Math.max(0, Math.min(1, (rh.current + 1) / rh.total));
    return {
      done,
      ratio,
      currentDisp: rh.current + 1,
      total: rh.total,
      ts: rh.ts,
    };
  }, [rh]);

  return (
    <Pressable
      style={[
        styles.card,
        background ? { backgroundColor: background } : undefined,
        isSingleCol && { alignSelf: "stretch" },
      ]}
      onPress={() => onPress?.(book.id)}
    >
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
            isSingleCol && { aspectRatio: coverAR, height: undefined },
          ]}
        />
        <LinearGradient
          colors={["#00000000", `${colors.bg}40`, `${colors.bg}99`]}
          style={styles.coverGradient}
          pointerEvents="none"
        />
        {isNew && <Text style={styles.newBadge}>{t("book.new")}</Text>}
        {flagSrc && (
          <View style={styles.langBadge}>
            <Image source={flagSrc} style={styles.langImg} resizeMode="cover" />
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
        {showProgressOnCard && progress && !progress.done && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              backgroundColor: "#00000055",
            }}
          >
            <View
              style={{
                width: `${Math.round(progress.ratio * 100)}%`,
                height: "100%",
                backgroundColor: colors.accent,
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {book.title.pretty}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather
              name="calendar"
              size={styles.metaIcon.fontSize as number}
              color={styles.metaIcon.color as string}
            />
            <Text style={styles.metaText}>
              {format(new Date(book.uploaded), "d MMM yyyy", {
                locale: dateLocale,
              })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather
              name="book-open"
              size={styles.metaIcon.fontSize as number}
              color={styles.metaIcon.color as string}
            />
            <Text style={styles.metaText}>{book.pagesCount}</Text>
          </View>
          {!onToggleFavorite && (
            <View style={styles.metaItem}>
              <Feather
                name="heart"
                size={styles.metaIcon.fontSize as number}
                color={styles.metaIcon.color as string}
              />
              <Text style={styles.metaText}>{book.favorites}</Text>
            </View>
          )}
        </View>

        {/* Теги: короткие «обнимают», длинные — «…», +N; при раскрытии видно всё */}
        {visibleTags.length > 0 && (
          <View style={styles.tagsRow}>
            <View
              style={[styles.tagsWrap, showAllTags && styles.tagsWrapExpanded]}
            >
              {visibleTags.map((tag, i) => {
                const mode = modeOf({ type: tag.type, name: tag.name });
                const borderColor =
                  mode === "include"
                    ? incColor
                    : mode === "exclude"
                    ? excColor
                    : "transparent";
                const maxPx = !showAllTags
                  ? collapsedMaxFor(i, visibleTags.length)
                  : undefined;

                return (
                  <>
                    {typeof score === "number" && i == 0 && (
                      <View
                        key={i}
                        style={[
                          styles.ribbon,
                          score >= 80
                            ? styles.ribbonBorderGood
                            : score >= 60
                            ? styles.ribbonBorderOk
                            : styles.ribbonBorderWarn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ribbonText,
                            score >= 80
                              ? styles.ribbonGood
                              : score >= 60
                              ? styles.ribbonOk
                              : styles.ribbonWarn,
                          ]}
                        >
                          {score}%
                        </Text>
                      </View>
                    )}
                    <Pressable
                      key={tag.id}
                      onPress={(e: any) => {
                        e?.stopPropagation?.();
                        router.push({
                          pathname: "/explore",
                          params: {
                            query: tag.name,
                            solo: "1",
                            id: String(book.id),
                            title: book.title.pretty,
                          },
                        });
                      }}
                      onLongPress={() => Clipboard.setStringAsync(tag.name)}
                    >
                      <View
                        style={[
                          styles.tagPill,
                          showAllTags
                            ? [styles.tagExpanded, styles.tapPillOpen]
                            : styles.tagOneLine,
                          !showAllTags && { maxWidth: maxPx },
                          !showAllTags &&
                            capFirstTwo &&
                            i < 2 &&
                            styles.tagCap50,
                          { borderWidth: 1, borderColor },
                          selectedTags.some((t) => t.id === tag.id) &&
                            styles.tagSelected,
                        ]}
                      >
                        <Text
                          numberOfLines={showAllTags ? undefined : 1}
                          ellipsizeMode={showAllTags ? undefined : "tail"}
                          style={[
                            styles.tagText,
                            { color: TAG_COLORS[tag.type] ?? TAG_COLORS.tag },
                          ]}
                        >
                          {tag.name}
                        </Text>
                      </View>
                    </Pressable>
                  </>
                );
              })}
            </View>

            {!showAllTags && book.tags.length > maxTags && (
              <Pressable
                style={styles.plusWrap}
                onPress={(e: any) => {
                  e?.stopPropagation?.();
                  setShowAllTags(true);
                }}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tagPlus, { color: TAG_COLORS.tag }]}
                >
                  +{book.tags.length - maxTags}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
