// app/profile/[id]/[slug].tsx
import CommentCard from "@/components/CommentCard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";

import { logout } from "@/api/auth";
import type { Book } from "@/api/nhentai";
import { getBook } from "@/api/nhentai";
import { getUserOverview, type UserOverview } from "@/api/nhentaiOnline";
import BookList from "@/components/BookList";
import { useWindowLayout } from "@/hooks/book/useWindowLayout";
import { useGridConfig } from "@/hooks/useGridConfig";
import { useTheme } from "@/lib/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";

/** «Облегчённый» Book для карточек */
function toLightBook(b: Book): Book {
  return {
    ...b,
    artists: Array.isArray(b.artists) ? b.artists : [],
    categories: Array.isArray(b.categories) ? b.categories : [],
    characters: Array.isArray(b.characters) ? b.characters : [],
    groups: Array.isArray(b.groups) ? b.groups : [],
    languages: Array.isArray(b.languages) ? b.languages : [],
    parodies: Array.isArray(b.parodies) ? b.parodies : [],
    tags: Array.isArray(b.tags) ? b.tags : [],
    pagesCount: Number.isFinite(b.pagesCount) ? b.pagesCount : 0,
    favorites: Number.isFinite(b.favorites) ? b.favorites : 0,
  };
}

/** Декодер HTML-сущностей */
function decodeHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

const AVATAR_SIZE = 128;

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id, slug } = useLocalSearchParams<{ id: string; slug?: string }>();
  const { innerPadding } = useWindowLayout();

  const [busy, setBusy] = React.useState(true);
  const [ov, setOv] = React.useState<UserOverview | null>(null);
  const [recent, setRecent] = React.useState<Book[]>([]);
  const [favorites, setFavorites] = React.useState<Set<number>>(new Set());
  const [loggingOut, setLoggingOut] = React.useState(false);

  // минимальная палитра под Material-like без рамок
  const ui = React.useMemo(() => {
    const text = (colors as any).txt ?? colors.title ?? "#eee";
    const sub = (colors as any).metaText ?? colors.sub ?? "#9aa0a6";
    return {
      bg: colors.bg,
      text,
      sub,
      title: colors.title ?? text,
      accent: colors.accent,
      tagBg: (colors as any).tagBg ?? "#ffffff1a",
      tagText: (colors as any).tagText ?? text,
      onAccent: "#fff",
      divider: "#ffffff1a",
    };
  }, [colors]);

  React.useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then((j) => {
      const list = j ? (JSON.parse(j) as number[]) : [];
      setFavorites(new Set(list));
    });
  }, []);

  const toggleFav = React.useCallback((bid: number, next: boolean) => {
    setFavorites((prev) => {
      const copy = new Set(prev);
      next ? copy.add(bid) : copy.delete(bid);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...copy])).catch(
        () => {}
      );
      return copy;
    });
  }, []);

  // загрузка профиля
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setBusy(true);
      const overview = await getUserOverview(Number(id), slug).catch(
        () => null
      );
      if (!mounted) return;
      setOv(overview);

      const ids = (overview?.recentFavoriteIds || []).slice(0, 5);
      const books = (
        await Promise.all(ids.map((g) => getBook(g).catch(() => null)))
      ).filter(Boolean) as Book[];
      setRecent(books.map(toLightBook));

      setBusy(false);
    })();
    return () => void (mounted = false);
  }, [id, slug]);

  const baseGrid = useGridConfig();
  const oneRowGrid = React.useMemo(
    () => ({
      ...baseGrid,
      numColumns: Math.min(5, recent.length || 5),
      minColumnWidth: 160,
      columnGap: 14,
      paddingHorizontal: innerPadding * 1.6,
    }),
    [baseGrid, recent.length, innerPadding]
  );

  const TagChip = ({ label }: { label: string }) => (
    <View style={styles.tag}>
      <Text style={[styles.tagTxt, { color: ui.tagText }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const favoriteTagsTextRaw = ov?.favoriteTagsText
    ? decodeHtml(ov.favoriteTagsText)
    : "";
  const favoriteTags: string[] =
    (ov?.favoriteTags && ov.favoriteTags.length
      ? ov.favoriteTags
      : favoriteTagsTextRaw
          .split(",")
          .map((s) => decodeHtml(s).trim())
          .filter(Boolean)) || [];

  const aboutText = ov?.about ? decodeHtml(ov.about).trim() : "";

  const showTags = favoriteTags.length > 0;
  const showAbout = aboutText.length > 0;

  // ВАЖНО: exit через logout из api/auth.ts (с защитой от дабл-тапа и индикатором)
  const handleLogout = React.useCallback(async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await logout(); // строго используем общий logout из api/auth.ts
      if (Platform.OS === "android") {
        ToastAndroid.show("Вы вышли из аккаунта", ToastAndroid.SHORT);
      }
      // при желании можно редиректить:
      // router.replace("/");
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut]);

  return (
    <View style={{ flex: 1, backgroundColor: ui.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ======== Шапка профиля без рамок, в стиле Google Material ======== */}
        <View style={{ paddingHorizontal: innerPadding, paddingTop: 20 }}>
          <View style={styles.headerRow}>
            {/* Аватар большой слева */}
            <View style={styles.avatarWrap}>
              {busy ? (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: "#ffffff1a",
                      borderRadius: AVATAR_SIZE / 2,
                    },
                  ]}
                />
              ) : ov?.me?.avatar_url ? (
                <Image
                  source={{ uri: ov.me.avatar_url }}
                  style={[styles.avatar, { borderRadius: AVATAR_SIZE / 2 }]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: "#ffffff1a",
                      borderRadius: AVATAR_SIZE / 2,
                    },
                  ]}
                />
              )}
            </View>

            {/* Информация справа */}
            <View style={styles.infoCol}>
              <Text
                numberOfLines={1}
                style={[styles.displayName, { color: ui.title }]}
              >
                {ov?.me?.username || (busy ? " " : "user")}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.subline, { color: ui.sub }]}
              >
                {[
                  ov?.me?.slug ? `@${ov.me.slug}` : null,
                  Number.isFinite(ov?.me?.id as number)
                    ? `ID: ${ov?.me?.id}`
                    : null,
                  ov?.joinedText || null,
                ]
                  .filter(Boolean)
                  .join("   •   ")}
              </Text>

              {!!ov?.me?.profile_url && (
                <Text
                  numberOfLines={1}
                  style={[styles.link, { color: ui.sub }]}
                >
                  {ov.me.profile_url}
                </Text>
              )}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={handleLogout}
                  android_ripple={{ color: "#ffffff22", borderless: true }}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: ui.accent,
                      opacity: loggingOut ? 0.7 : 1,
                    },
                  ]}
                  disabled={loggingOut}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color={ui.onAccent} />
                  ) : (
                    <MaterialIcons
                      name="logout"
                      size={18}
                      color={ui.onAccent}
                    />
                  )}
                  <Text style={[styles.primaryBtnTxt, { color: ui.onAccent }]}>
                    {loggingOut ? "Выход…" : "Выйти"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* небольшая разделительная линия (тонкая, без рамок) */}
        <View
          style={[
            styles.divider,
            { backgroundColor: ui.divider, marginTop: 18 },
          ]}
        />

        {/* FAVORITE TAGS */}
        {showTags && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: ui.title,
                  paddingHorizontal: innerPadding,
                  marginTop: 16,
                },
              ]}
            >
              Favorite tags
            </Text>
            <View
              style={{
                paddingHorizontal: innerPadding,
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {favoriteTags.slice(0, 24).map((t) => (
                <TagChip key={t} label={t} />
              ))}
            </View>
          </>
        )}

        {/* ABOUT */}
        {showAbout && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: ui.title,
                  paddingHorizontal: innerPadding,
                  marginTop: showTags ? 16 : 16,
                },
              ]}
            >
              About
            </Text>
            <View style={{ marginHorizontal: innerPadding, marginTop: 6 }}>
              <Text style={{ color: ui.text, lineHeight: 20 }}>
                {aboutText}
              </Text>
            </View>
          </>
        )}

        {/* разделитель */}
        <View
          style={[
            styles.divider,
            { backgroundColor: ui.divider, marginTop: 18 },
          ]}
        />

        {/* FAVORITES */}
        <Text
          style={[
            styles.sectionTitle,
            { color: ui.title, paddingHorizontal: innerPadding, marginTop: 16 },
          ]}
        >
          Favorites
        </Text>
        <View style={{ marginHorizontal: -innerPadding, marginTop: 6 }}>
          {busy && recent.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : recent.length === 0 ? (
            <Text
              style={{
                color: ui.sub,
                paddingHorizontal: innerPadding,
                paddingVertical: 12,
              }}
            >
              Нет избранных книг
            </Text>
          ) : (
            <BookList
              data={recent}
              loading={busy && recent.length === 0}
              refreshing={false}
              onRefresh={async () => {}}
              isFavorite={(bid) => favorites.has(bid)}
              onToggleFavorite={toggleFav}
              onPress={(bid) =>
                router.push({
                  pathname: "/book/[id]",
                  params: {
                    id: String(bid),
                    title: recent.find((b) => b.id === bid)?.title.pretty,
                  },
                })
              }
              gridConfig={{ default: oneRowGrid }}
              horizontal
              autoRowHeight
            />
          )}
        </View>

        {/* разделитель */}
        <View
          style={[
            styles.divider,
            { backgroundColor: ui.divider, marginTop: 18 },
          ]}
        />

        {/* COMMENTS */}
        <Text
          style={[
            styles.sectionTitle,
            { color: ui.title, paddingHorizontal: innerPadding, marginTop: 16 },
          ]}
        >
          Comments
        </Text>
        <View
          style={{
            paddingHorizontal: innerPadding,
            gap: 12,
            marginVertical: 16,
          }}
        >
          {(ov?.recentComments || []).slice(0, 5).map((c) => (
            <CommentCard
              key={c.id}
              id={c.id}
              body={c.body}
              post_date={c.post_date}
              poster={
                ov?.me
                  ? {
                      id: ov.me.id,
                      username: ov.me.username,
                      slug: ov.me.slug,
                      avatar_url: ov.me.avatar_url,
                    }
                  : undefined
              }
              avatar={c.avatar_url || ov?.me?.avatar_url}
              highlight={false}
              onPress={() =>
                router.push({
                  pathname: "/book/[id]",
                  params: { id: String(c.gallery_id) },
                })
              }
            />
          ))}

          {(ov?.recentComments?.length || 0) === 0 && !busy && (
            <Text style={{ color: ui.sub, paddingVertical: 12 }}>
              Комментариев пока нет
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrap: { paddingVertical: 4 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  infoCol: { flex: 1, minHeight: AVATAR_SIZE - 8, justifyContent: "center" },
  displayName: { fontWeight: "900", fontSize: 26, letterSpacing: 0.2 },
  subline: { marginTop: 4, fontSize: 13, letterSpacing: 0.2 },
  link: { marginTop: 6, fontSize: 12, opacity: 0.95 },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },

  primaryBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnTxt: { fontWeight: "800", letterSpacing: 0.3 },

  // sections
  sectionTitle: { fontWeight: "700", fontSize: 18 },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
    opacity: 0.8,
  },

  // tag
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
    backgroundColor: "#ffffff1a",
  },
  tagTxt: { fontWeight: "700", fontSize: 12 },
});
