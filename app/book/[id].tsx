import { Book, getRandomBook } from "@/api/nhentai";
import { useFilterTags } from "@/context/TagFilterContext";
import { useGridConfig } from "@/hooks/useGridConfig";
import { useTheme } from "@/lib/ThemeContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getMe } from "@/api/nhentaiOnline";
import { useBookData } from "@/hooks/book/useBookData";
import { useColumns } from "@/hooks/book/useColumns";
import { useDownload } from "@/hooks/book/useDownload";
import { useFab } from "@/hooks/book/useFab";
import { useFavorites } from "@/hooks/book/useFavorites";
import { useRelatedComments } from "@/hooks/book/useRelatedComments";
import { useWindowLayout } from "@/hooks/book/useWindowLayout";

import Footer from "@/components/book/Footer";
import Hero from "@/components/book/Hero";
import PageItem, { GAP } from "@/components/book/PageItem";
import { useI18n } from "@/lib/i18n/I18nContext";

export default function BookScreen() {
  const { id, random } = useLocalSearchParams<{
    id: string;
    random?: string;
  }>();
  const [myUserId, setMyUserId] = useState<number | undefined>(undefined);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | undefined>(undefined);
  const [myUsername, setMyUsername] = useState<string | undefined>(undefined);

  const idNum = Number(id);
  const fromRandom = random === "1";

  const router = useRouter();
  const { colors } = useTheme();
  const baseGrid = useGridConfig();

  const { t } = useI18n();

  const { filters, cycle } = useFilterTags();

  const { win, wide, innerPadding } = useWindowLayout();
  const { book, setBook, local, setLocal } = useBookData(idNum);
  const {
    related,
    relLoading,
    refetchRelated,
    allComments,
    visibleCount,
    setVisibleCount,
    cmtLoading,
    refetchComments,
  } = useRelatedComments(book);
  const { favorites, toggleFav, liked, toggleLike } = useFavorites(idNum);
  const { dl, pr, handleDownloadOrDelete, cancel } = useDownload(
    book,
    local,
    setLocal,
    setBook
  );

  const { cols, cycleCols, listRef, setScrollY } = useColumns(wide);

  const {
    fabScale,
    onScroll: onScrollFab,
    scrollTop,
    listRef: fabListRef,
  } = useFab();

  const [listW, setListW] = useState(win.w);
  const [rndLoading, setRndLoading] = useState(false);

  const modeOf = useCallback(
    (t: { type: string; name: string }): "include" | "exclude" | undefined => {
      const m = filters.find(
        (f) => f.type === t.type && f.name === t.name
      )?.mode;
      return m === "include" || m === "exclude" ? m : undefined;
    },
    [filters]
  );

  useEffect(() => {
    if (book?.title?.pretty) {
      router.setParams({ title: book.title.pretty });
    }
  }, [book?.title?.pretty]);

  useEffect(() => {
    let alive = true;
    getMe()
      .then((me) => {
        if (!alive) return;
        setMyUserId(me?.id ?? undefined);
        setMyAvatarUrl(me?.avatar_url ?? undefined);
        setMyUsername(me?.username ?? undefined);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const headerEl = useMemo(() => {
    if (!book) return null;
    return (
      <Hero
        book={book}
        containerW={listW || win.w}
        pad={innerPadding}
        wide={wide}
        cols={cols}
        cycleCols={cycleCols}
        liked={liked}
        toggleLike={toggleLike}
        dl={dl}
        pr={pr}
        local={local}
        handleDownloadOrDelete={handleDownloadOrDelete}
        modeOf={modeOf}
        onTagPress={(name: any) =>
          router.push({
            pathname: "/explore",
            params: { query: name, solo: "1" },
          })
        }
        win={win}
        innerPadding={innerPadding}
        cycle={cycle}
        cancel={cancel}
      />
    );
  }, [
    book,
    listW,
    win,
    innerPadding,
    wide,
    cols,
    liked,
    dl,
    pr,
    local,
    handleDownloadOrDelete,
    modeOf,
    router,
    cycle,
  ]);

  const footerEl = useMemo(() => {
    return (
      <Footer
        galleryId={book?.id ?? idNum}
        related={related}
        relLoading={relLoading}
        refetchRelated={refetchRelated}
        favorites={favorites}
        toggleFav={toggleFav}
        baseGrid={baseGrid}
        allComments={allComments}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
        cmtLoading={cmtLoading}
        innerPadding={innerPadding}
        myUserId={myUserId}
        myAvatarUrl={myAvatarUrl}
        myUsername={myUsername}
        refetchComments={refetchComments}
      />
    );
  }, [
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
    myUserId,
    myAvatarUrl,
    myUsername,
    book?.id,
    idNum,
    refetchComments,
  ]);

  const horizPad = Math.max(0, innerPadding - GAP / 2);

  const renderItem = useCallback(
    ({ item }: { item: Book["pages"][number]; index: number }) => {
      const innerW = (listW || win.w) - 2 * horizPad;
      const itemW = Math.floor((innerW - (cols - 1) * GAP) / cols);

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
    [book?.id, cols, listW, win.w, horizPad, colors.metaText, router]
  );

  const goRandomAgain = useCallback(async () => {
    if (rndLoading) return;
    try {
      setRndLoading(true);
      const b = await getRandomBook();
      router.replace({
        pathname: "/book/[id]",
        params: { id: String(b.id), title: b.title.pretty, random: "1" },
      });
    } finally {
      setRndLoading(false);
    }
  }, [rndLoading, router]);

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

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      onLayout={(e) => setListW(e.nativeEvent.layout.width)}
    >
      <FlatList
        ref={(ref) => {
          (listRef as any).current = ref;
          (fabListRef as any).current = ref;
        }}
        data={book.pages}
        key={cols}
        numColumns={cols}
        keyExtractor={(p) => String(p.page)}
        renderItem={renderItem}
        onScroll={(e) => {
          onScrollFab(e);
          setScrollY(e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
        columnWrapperStyle={cols > 1 ? { alignItems: "flex-start" } : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: horizPad,
        }}
        ListHeaderComponent={headerEl}
        ListFooterComponent={footerEl}
        removeClippedSubviews={false}
        initialNumToRender={cols === 1 ? 10 : 24}
        maxToRenderPerBatch={cols === 1 ? 10 : 24}
        updateCellsBatchingPeriod={50}
        windowSize={11}
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

      {fromRandom && (
        <View style={[styles.tryWrap, { bottom: 40 }]}>
          <View style={styles.tryRounded}>
            <Pressable
              disabled={rndLoading}
              onPress={goRandomAgain}
              android_ripple={{ color: "#ffffff22", borderless: false }}
              style={({ pressed }) => [
                styles.tryBtn,
                { backgroundColor: colors.accent },
                pressed &&
                  (Platform.select({
                    android: { opacity: 0.96, transform: [{ scale: 0.995 }] },
                    ios: { opacity: 0.85 },
                  }) as any),
              ]}
            >
              {rndLoading ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <>
                  <Feather name="shuffle" size={16} color={colors.bg} />
                  <Text style={[styles.tryTxt, { color: colors.bg }]}>
                    {t("book.fromRandomCta")}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const FAB_SIZE = 48;
const styles = StyleSheet.create({
  fab: { position: "absolute", right: 16, bottom: 36 },
  fabBtn: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  tryWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  tryRounded: {
    borderRadius: 12,
    overflow: "hidden",
  },
  tryBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  tryTxt: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
