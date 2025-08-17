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
  const { filters } = useFilterTags();

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
  const { dl, pr, handleDownloadOrDelete } = useDownload(
    book,
    local,
    setLocal,
    setBook
  );

  // Колонки и FlatList
  const { cols, cycleCols, listRef, setScrollY } = useColumns(wide);

  // FAB-поведение
  const {
    fabScale,
    onScroll: onScrollFab,
    scrollTop,
    listRef: fabListRef,
  } = useFab();

  // Ширина контейнера для вычислений layout
  const [listW, setListW] = useState(win.w);

  // Определение режима фильтра по тегу
  const modeOf = useCallback(
    (t: { type: string; name: string }) =>
      filters.find((f) => f.type === t.type && f.name === t.name)?.mode,
    [filters]
  );

  // Заголовок (Hero)
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
  ]);

  // Футер (Related + Comments)
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

  const horizPad = Math.max(0, innerPadding - GAP / 2); // компенсируем половинку gap у крайних колонок

  const renderItem = useCallback(
    ({ item, index }: { item: Book["pages"][number]; index: number }) => {
      // внутренняя ширина с учётом скорректированных паддингов
      const innerW = (listW || win.w) - 2 * horizPad;

      // вычитаем суммарные зазоры между колонками
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

  // getItemLayout для многостолбцового режима
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
        // без gap, только выравнивание
        columnWrapperStyle={cols > 1 ? { alignItems: "flex-start" } : undefined}
        showsVerticalScrollIndicator={false}
        // ВАЖНО: добавили горизонтальные паддинги — это и есть «поля» слева/справа
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
        getItemLayout={undefined}
      />

      {/* FAB "вверх" */}
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

import { Pressable } from "react-native";

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
