import { Book } from "@/api/nhentai";
import { useTheme } from "@/lib/ThemeContext";
import React, {
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";
import BookCard from "./BookCard";

export interface GridConfig {
  numColumns: number;
  minColumnWidth?: number;
  paddingHorizontal?: number;
  columnGap?: number;
}

export interface BookListProps<T extends Book = Book> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onEndReached?: () => void;
  ListEmptyComponent?: ReactNode;
  ListFooterComponent?: ReactElement | null;
  ListHeaderComponent?: ReactElement | null;
  isFavorite?: (id: number) => boolean;
  onToggleFavorite?: (id: number, next: boolean) => void;
  onPress?: (id: number) => void;
  renderItem?: ListRenderItem<T>;
  gridConfig?: {
    phonePortrait?: GridConfig;
    phoneLandscape?: GridConfig;
    tabletPortrait?: GridConfig;
    tabletLandscape?: GridConfig;
    default?: GridConfig;
  };
  horizontal?: boolean;

  /** Авто-высота контейнера (актуально для horizontal) */
  autoRowHeight?: boolean;

  getScore?: (book: T) => number | undefined;
  columnWrapperStyle?: any;
  children?: ReactNode;
}

export default function BookList<T extends Book = Book>({
  data,
  loading,
  refreshing,
  onRefresh,
  onEndReached,
  ListEmptyComponent,
  ListFooterComponent,
  ListHeaderComponent,
  isFavorite,
  onToggleFavorite,
  onPress,
  renderItem,
  gridConfig,
  horizontal = false,
  autoRowHeight = false,
  getScore,
  columnWrapperStyle,
  children,
}: BookListProps<T>) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const { width, height } = useWindowDimensions();

  const base = useMemo<GridConfig>(() => {
    const isPortrait = height > width;
    const isTablet = width > 600;

    return isTablet
      ? gridConfig?.tabletLandscape ??
          gridConfig?.tabletPortrait ??
          gridConfig?.default ?? { numColumns: 4 }
      : !isPortrait
      ? gridConfig?.phoneLandscape ?? gridConfig?.default ?? { numColumns: 3 }
      : gridConfig?.phonePortrait ?? gridConfig?.default ?? { numColumns: 2 };
  }, [width, height, gridConfig]);

  const { cols, cardWidth, columnGap, paddingHorizontal } = useMemo(() => {
    const padH = base.paddingHorizontal ?? 0;
    const gap = base.columnGap ?? 0;
    const minW = base.minColumnWidth ?? 120;
    const avail = width - padH * 2;

    if (horizontal) {
      const visibleCols = Math.max(1, base.numColumns);
      let w = (avail - gap * (visibleCols - 1)) / visibleCols;
      w = Math.max(minW, w);
      return { cols: 1, cardWidth: w, columnGap: gap, paddingHorizontal: padH };
    }

    const maxCols = Math.max(
      1,
      Math.min(base.numColumns, Math.floor((avail + gap) / (minW + gap)))
    );
    const cardW = (avail - gap * (maxCols - 1)) / maxCols;

    return {
      cols: maxCols,
      cardWidth: cardW,
      columnGap: gap,
      paddingHorizontal: padH,
    };
  }, [width, base, horizontal]);

  // ---- авто-высота для горизонтальной ленты ----
  const [rowH, setRowH] = useState<number | null>(null);

  // Сбросить замер при изменениях (ориентация, ширина, паддинги, состав данных)
  useEffect(() => {
    if (horizontal && autoRowHeight) setRowH(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontal, autoRowHeight, cardWidth, columnGap, paddingHorizontal, data.length]);

  const uniqueData = useMemo(() => {
    const seen = new Set<number>();
    return data.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
  }, [data]);

  const isSingleCol = !horizontal && cols === 1;
  const contentScale = isSingleCol ? 0.45 : 0.65;

  const defaultRender: ListRenderItem<T> = ({ item, index }) => {
    const isLastInRow = !horizontal && (index + 1) % cols === 0;

    return (
      <Animated.View
        exiting={FadeOut.duration(300)}
        style={{
          width: cardWidth,
          marginRight: horizontal ? columnGap : isLastInRow ? 0 : columnGap,
          marginBottom: horizontal ? 0 : columnGap,
          ...(isSingleCol && { alignSelf: "center" }),
        }}
      >
        <BookCard
          book={item}
          cardWidth={cardWidth}
          isSingleCol={isSingleCol}
          contentScale={contentScale}
          isFavorite={isFavorite?.(item.id) ?? false}
          onToggleFavorite={onToggleFavorite}
          onPress={() => onPress?.(item.id)}
          score={getScore?.(item)}
        />
      </Animated.View>
    );
  };

  const Empty = () => (
    <View style={styles.empty}>
      <Animated.Text entering={FadeOut.duration(400)} style={styles.emptyText}>
        Ничего не найдено ¯\_(ツ)_/¯
      </Animated.Text>
    </View>
  );

  const listKey = horizontal ? `row-${Math.round(cardWidth)}` : `cols-${cols}`;

  const getItemLayout = horizontal
    ? (_: any, index: number) => ({
        length: cardWidth + columnGap,
        offset: (cardWidth + columnGap) * index,
        index,
      })
    : undefined;

  // Паддинги контента для горизонтальной ленты (они участвуют в общей высоте)
  const topPad = horizontal ? paddingHorizontal : paddingHorizontal / 2;
  const bottomPad = horizontal ? paddingHorizontal : 0;

  return (
    <View
      style={[
        horizontal ? styles.rowContainer : styles.container,
        { backgroundColor: colors.page },
        horizontal && autoRowHeight ? { height: rowH ?? 1 } : undefined, // 1px до замера
      ]}
    >
      {/* Невидимый измеритель с ТЕМИ ЖЕ паддингами, что и у FlatList */}
      {horizontal && autoRowHeight && !rowH && uniqueData.length > 0 && (
        <View
          style={{
            position: "absolute",
            opacity: 0,
            pointerEvents: "none",
            left: 0,
            right: 0,
            paddingHorizontal,
            paddingTop: topPad,
            paddingBottom: bottomPad,
          }}
          onLayout={(e) => setRowH(Math.ceil(e.nativeEvent.layout.height))}
        >
          <View style={{ width: cardWidth, alignSelf: "flex-start" }}>
            <BookCard
              book={uniqueData[0]}
              cardWidth={cardWidth}
              isSingleCol={false}
              contentScale={0.65}
              isFavorite={isFavorite?.(uniqueData[0].id) ?? false}
              onToggleFavorite={onToggleFavorite}
              onPress={() => onPress?.(uniqueData[0].id)}
              score={getScore?.(uniqueData[0])}
            />
          </View>
        </View>
      )}

      {uniqueData.length === 0 && !loading ? (
        (ListEmptyComponent as ReactElement) ?? <Empty />
      ) : (
        <FlatList
          ref={listRef}
          key={listKey}
          horizontal={horizontal}
          showsHorizontalScrollIndicator={false}
          decelerationRate={horizontal ? "fast" : undefined}
          snapToAlignment={horizontal ? "start" : undefined}
          data={uniqueData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem ?? defaultRender}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{
            paddingHorizontal,
            paddingTop: topPad,
            paddingBottom: bottomPad || undefined,
          }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loading ? <ActivityIndicator style={styles.loader} /> : ListFooterComponent
          }
          ListHeaderComponent={ListHeaderComponent}
          numColumns={horizontal ? undefined : cols}
          columnWrapperStyle={
            !horizontal && cols > 1 ? [{ justifyContent: "center" }, columnWrapperStyle] : undefined
          }
          getItemLayout={getItemLayout}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rowContainer: { flexGrow: 0 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  loader: { marginVertical: 16 },
});
