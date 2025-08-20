import type { Book, GalleryComment } from "@/api/nhentai";
import BookList from "@/components/BookList";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n/I18nContext";
import { MaterialIcons } from "@expo/vector-icons";
import { format, Locale } from "date-fns";
import { enUS, ja, ru, zhCN } from "date-fns/locale";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { franc } from "franc-min";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
  galleryLabel: { fontSize: 16, fontWeight: "700", letterSpacing: 0.6 },
  showMoreBtn: {
    marginTop: 16,
    alignSelf: "center",
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  showMoreTxt: { fontWeight: "700", fontSize: 14, letterSpacing: 0.3 },
  sectionBookList: { marginHorizontal: -16 },

  translateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  translateText: { fontWeight: "600", fontSize: 12, marginLeft: 6 },

  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timeSeparator: { fontSize: 12, marginHorizontal: 6 },
  loadingContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
});

/** UNIX seconds → number | null (защита от миллисекунд) */
function toUnixSeconds(raw: unknown): number | null {
  let n =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 1e12) n = Math.floor(n / 1000);
  return Math.floor(n);
}

/** ISO-639-3 → MyMemory */
function mapIso3ToMyMemory(iso3: string, text: string): string {
  const m: Record<string, string> = {
    eng: "en",
    rus: "ru",
    zho: "zh-CN",
    cmn: "zh-CN",
    jpn: "ja",
    kor: "ko",
    spa: "es",
    por: "pt",
    fra: "fr",
    deu: "de",
    ita: "it",
    ukr: "uk",
    bel: "be",
    pol: "pl",
    nld: "nl",
    swe: "sv",
    fin: "fi",
    dan: "da",
    nor: "no",
    ces: "cs",
    slk: "sk",
    slv: "sl",
    hrv: "hr",
    srp: "sr",
    bul: "bg",
    ron: "ro",
    hun: "hu",
    tur: "tr",
    vie: "vi",
    tha: "th",
    ara: "ar",
    heb: "he",
    hin: "hi",
    ind: "id",
    fil: "tl",
    tgl: "tl",
    cat: "ca",
    glg: "gl",
    epo: "eo",
  };
  if (m[iso3]) return m[iso3];
  const mostlyAscii =
    text && /[\x00-\x7F]/g.test(text) && !/[^\x00-\x7F]/.test(text);
  return mostlyAscii ? "en" : "en";
}

/** Спиннер */
const LoadingSpinner = ({ color }: { color: string }) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <MaterialIcons name="autorenew" size={16} color={color} />
    </Animated.View>
  );
};

function CommentItem({
  c,
  colors,
  dateLocale,
  resolved,
  t,
}: {
  c: GalleryComment;
  colors: any;
  dateLocale: Locale;
  resolved: "en" | "ru" | "zhCN" | "ja";
  t: (key: string, vars?: any) => string;
}) {
  const ui = {
    text: colors.txt,
    metaText: colors.txt,
    cardBg: colors.related,
    border: colors.page,
    avatarBg: colors.page,
    accent: colors.accent,
    pillBg: colors.tagBg,
    pillDisabledBg: colors.page,
    pillText: colors.accent,
  };

  const [translated, setTranslated] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);

  const target = resolved === "zhCN" ? "zh-CN" : resolved;
  const detected3 = franc(c.body || "", { minLength: 3 });
  const src = mapIso3ToMyMemory(detected3, c.body || "");
  const needsTranslation =
    !!c.body && src.toLowerCase() !== (target as string).toLowerCase();

  async function translateText(text: string) {
    const chunk = (str: string, max = 450) => {
      const parts: string[] = [];
      let s = str;
      while (s.length > max) {
        let cut = s.lastIndexOf(" ", max);
        if (cut === -1) cut = max;
        parts.push(s.slice(0, cut));
        s = s.slice(cut).trimStart();
      }
      if (s) parts.push(s);
      return parts;
    };
    try {
      setLoading(true);
      const pieces = chunk(text);
      const out: string[] = [];
      for (const p of pieces) {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          p
        )}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(target)}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const tt = data?.responseData?.translatedText;
        out.push(typeof tt === "string" && tt.length ? tt : p);
        await new Promise((r) => setTimeout(r, 300));
      }
      setTranslated(out.join(" "));
      setShowOriginal(false);
    } catch {
      setTranslated(null);
    } finally {
      setLoading(false);
    }
  }

  const tsSec = toUnixSeconds(c.post_date);
  const absPart =
    tsSec != null
      ? format(new Date(tsSec * 1000), "d MMM yyyy, HH:mm", {
          locale: dateLocale,
        })
      : "";
  const relPart = tsSec == null ? timeAgo(c.post_date, resolved) : "";

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: ui.border,
        backgroundColor: ui.cardBg,
        padding: 14,
      }}
    >
      <View style={s.commentHeader}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flex: 1,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: ui.avatarBg,
              borderWidth: 1,
              borderColor: ui.border,
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
                color: ui.text,
                fontWeight: "700",
                fontSize: 14,
                marginBottom: 2,
              }}
            >
              {c.poster?.username || t("anonymous")}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {!!absPart && (
                <Text
                  style={{
                    color: ui.metaText,
                    opacity: 0.64,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {absPart}
                </Text>
              )}
              {!!absPart && !!relPart && (
                <Text
                  style={[
                    s.timeSeparator,
                    { color: ui.metaText, opacity: 0.64 },
                  ]}
                >
                  •
                </Text>
              )}
              {!!relPart && (
                <Text
                  style={{
                    color: ui.metaText,
                    opacity: 0.64,
                    fontSize: 12,
                    fontWeight: "500",
                  }}
                >
                  {relPart}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <Text
        style={{
          color: ui.text,
          fontSize: 14,
          lineHeight: 20,
          marginBottom: needsTranslation || translated ? 8 : 0,
        }}
      >
        {translated && !showOriginal ? translated : c.body}
      </Text>

      {(needsTranslation || translated) && (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: ui.border,
            paddingTop: 8,
            marginTop: 4,
            gap: 8,
          }}
        >
          {needsTranslation && !translated && (
            <Pressable
              disabled={loading}
              onPress={() => translateText(c.body)}
              style={[
                s.translateButton,
                {
                  backgroundColor: loading ? ui.pillDisabledBg : ui.pillBg,
                  opacity: loading ? 0.8 : 1,
                },
              ]}
              android_ripple={{ color: `${ui.accent}22` }}
            >
              {loading ? (
                <View style={s.loadingContainer}>
                  <LoadingSpinner color={ui.pillText} />
                  <Text style={[s.translateText, { color: ui.pillText }]}>
                    {t("translating")}
                  </Text>
                </View>
              ) : (
                <>
                  <MaterialIcons
                    name="translate"
                    size={16}
                    color={ui.pillText}
                  />
                  <Text style={[s.translateText, { color: ui.pillText }]}>
                    {t("translate")}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {translated && (
            <Pressable
              onPress={() => setShowOriginal((v) => !v)}
              style={[s.translateButton, { backgroundColor: ui.pillBg }]}
              android_ripple={{ color: `${ui.accent}22` }}
            >
              <MaterialIcons
                name={showOriginal ? "translate" : "description"}
                size={16}
                color={ui.pillText}
              />
              <Text style={[s.translateText, { color: ui.pillText }]}>
                {showOriginal ? t("showTranslated") : t("showOriginal")}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

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
  const { t, resolved } = useI18n();
  const router = useRouter();

  const dateLocale: Locale =
    resolved === "ru"
      ? ru
      : resolved === "zhCN"
      ? zhCN
      : resolved === "ja"
      ? ja
      : enUS;

  const ui = { text: colors.txt, accent: colors.accent };

  const oneRowGrid = useMemo(
    () => ({
      ...baseGrid,
      numColumns: Math.min(5, related.length || 5),
      paddingHorizontal: innerPadding * 1.9,
      columnGap: 12,
      minColumnWidth: 180,
    }),
    [baseGrid, related.length, innerPadding]
  );

  const visibleComments = allComments.slice(0, visibleCount);
  const hasMore = visibleCount < allComments.length;

  return (
    <View style={{ paddingTop: 24 }}>
      <View style={s.sectionHead}>
        <Text
          style={[
            s.galleryLabel,
            {
              paddingHorizontal: innerPadding,
              paddingBottom: 16,
              color: ui.text,
            },
          ]}
        >
          {t("related")}
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
            router.push({
              pathname: "/book/[id]",
              params: {
                id: String(bid),
                title: related.find((b) => b.id === bid)?.title.pretty,
              },
            })
          }
          gridConfig={{ default: oneRowGrid }}
          horizontal
        />
      </View>

      <View style={[s.sectionHead, { marginTop: 32 }]}>
        <Text
          style={[
            s.galleryLabel,
            {
              paddingHorizontal: innerPadding,
              paddingBottom: 16,
              color: ui.text,
            },
          ]}
        >
          {t("comments")} ({allComments.length})
        </Text>
      </View>

      {cmtLoading ? (
        <View
          style={{
            paddingHorizontal: innerPadding,
            paddingVertical: 32,
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={ui.accent} />
        </View>
      ) : (
        <View
          style={{ paddingHorizontal: innerPadding, gap: 8, paddingBottom: 24 }}
        >
          {visibleComments.map((c) => (
            <CommentItem
              key={c.id ?? `${c.post_date}-${c.poster?.username ?? "u"}`}
              c={c}
              colors={colors}
              dateLocale={dateLocale}
              resolved={resolved as "en" | "ru" | "zhCN" | "ja"}
              t={t}
            />
          ))}

          {hasMore && (
            <Pressable
              onPress={() =>
                setVisibleCount((n) => Math.min(n + 20, allComments.length))
              }
              style={[
                s.showMoreBtn,
                { borderColor: ui.accent, backgroundColor: "transparent" },
              ]}
              android_ripple={{
                color: `${ui.accent}22`,
                borderless: false,
                radius: 18,
              }}
            >
              <Text style={[s.showMoreTxt, { color: ui.accent }]}>
                {t("showMore", {
                  count: Math.min(20, allComments.length - visibleCount),
                })}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
