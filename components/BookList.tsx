import { Book } from "@/api/nhentai";
import { hsbToHex } from "@/constants/Colors";
import React, { ReactElement, ReactNode, useMemo, useRef } from "react";
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

const bgColor = hsbToHex({ saturation: 76, brightness: 30 });

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
  getScore?: (book: T) => number | undefined; // <--- вот оно!
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
  getScore,
  columnWrapperStyle,
  children,
}: BookListProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const { width, height } = useWindowDimensions();

  const { cols, cardWidth, columnGap, paddingHorizontal } = useMemo(() => {
    const isPortrait = height > width;
    const isTablet = width > 600;

    const base: GridConfig = isTablet
      ? gridConfig?.tabletLandscape ??
        gridConfig?.tabletPortrait ??
        gridConfig?.default ?? { numColumns: 4 }
      : !isPortrait
      ? gridConfig?.phoneLandscape ?? gridConfig?.default ?? { numColumns: 3 }
      : gridConfig?.phonePortrait ?? gridConfig?.default ?? { numColumns: 2 };

    const cols = base.numColumns;
    const paddingHorizontal = base.paddingHorizontal ?? 0;
    const columnGap = base.columnGap ?? 0;
    const minWidth = base.minColumnWidth ?? 120;

    const avail = width - paddingHorizontal;
    const maxCols = Math.max(
      1,
      Math.min(cols, Math.floor((avail + columnGap) / (minWidth + columnGap)))
    );
    const cardWidth = (avail - columnGap * (maxCols - 1)) / maxCols;

    return { cols: maxCols, cardWidth, columnGap, paddingHorizontal };
  }, [width, height, gridConfig]);

  const uniqueData = useMemo(() => {
    const seen = new Set<number>();
    return data.filter((b) => (seen.has(b.id) ? false : seen.add(b.id)));
  }, [data]);

  const isSingleCol = cols === 1;
  const contentScale = isSingleCol ? 0.45 : 0.65;

  const defaultRender: ListRenderItem<T> = ({ item, index }) => {
    const isLastInRow = (index + 1) % cols === 0;
    return (
      <Animated.View
        exiting={FadeOut.duration(300)}
        style={{
          width: cardWidth,
          marginRight: isLastInRow ? 0 : columnGap,
          marginBottom: columnGap,
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
          score={getScore?.(item)} // <--- вот!
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

  return (
    <View style={styles.container}>
      {uniqueData.length === 0 && !loading ? (
        (ListEmptyComponent as ReactElement) ?? <Empty />
      ) : (
        <FlatList
          ref={listRef}
          key={`cols-${cols}`}
          data={uniqueData}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem ?? defaultRender}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{
            paddingHorizontal,
            paddingTop: paddingHorizontal / 2,
          }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loading ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              ListFooterComponent
            )
          }
          ListHeaderComponent={ListHeaderComponent}
          numColumns={cols}
          columnWrapperStyle={
            cols > 1
              ? [{ justifyContent: "center" }, columnWrapperStyle]
              : undefined
          }
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: bgColor },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  loader: { marginVertical: 16 },
});
