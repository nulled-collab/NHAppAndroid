import { useFilterTags } from "@/context/TagFilterContext";
import { useGridConfig } from "@/hooks/useGridConfig";
import { useTheme } from "@/lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Book } from "@/api/nhentai";
import { useBookData } from "../book/hooks/useBookData";
import { useColumns } from "../book/hooks/useColumns";
import { useDownload } from "../book/hooks/useDownload";
import { useFab } from "../book/hooks/useFab";
import { useFavorites } from "../book/hooks/useFavorites";
import { useRelatedComments } from "../book/hooks/useRelatedComments";
import { useWindowLayout } from "../book/hooks/useWindowLayout";

import Footer from "../book/components/Footer";
import Hero from "../book/components/Hero";
import PageItem, { GAP } from "../book/components/PageItem";

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNum = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const baseGrid = useGridConfig();

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

  const modeOf = useCallback(
    (t: { type: string; name: string }): "include" | "exclude" | undefined => {
      const m = filters.find(
        (f) => f.type === t.type && f.name === t.name
      )?.mode;
      return m === "include" || m === "exclude" ? m : undefined;
    },
    [filters]
  );

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
        onTagPress={(name) =>
          router.push({ pathname: "/explore", params: { query: name } })
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
});
