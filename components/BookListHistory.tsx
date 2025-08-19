import { Book } from "@/api/nhentai";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import React, { ReactElement, ReactNode, useMemo, useRef } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    SectionListData,
    SectionListRenderItem,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { useTheme } from "@/lib/ThemeContext";
import BookCard from "./BookCard";

export type ReadHistoryEntry = [number, number, number, number];
export const READ_HISTORY_KEY = "readHistory";

export interface GridConfig {
  numColumns: number;
  minColumnWidth?: number;
  paddingHorizontal?: number;
  columnGap?: number;
}

export interface BookListHistoryProps<T extends Book = Book> {
  data: T[];
  historyIndex: Record<number, ReadHistoryEntry>;

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

  gridConfig?: {
    phonePortrait?: GridConfig;
    phoneLandscape?: GridConfig;
    tabletPortrait?: GridConfig;
    tabletLandscape?: GridConfig;
    default?: GridConfig;
  };

  getScore?: (book: T) => number | undefined;
  children?: ReactNode;
}

/** В одном ряду — несколько BookCard */
type RowItem<T extends Book> = {
  book: T;
  ts: number;
  timeHHmm: string;
};

type SectionRow<T extends Book> = RowItem<T>[];

type SectionShape<T extends Book> = {
  title: string;
  key: string;
  data: SectionRow<T>[];
};

export default function BookListHistory<T extends Book = Book>({
  data,
  historyIndex,
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
  gridConfig,
  getScore,
  children,
}: BookListHistoryProps<T>) {
  const { colors } = useTheme();
  const listRef = useRef<SectionList<SectionRow<T>>>(null);
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

  const layout = useMemo(() => {
    const padH = base.paddingHorizontal ?? 0;
    const gap = base.columnGap ?? 0;
    const minW = base.minColumnWidth ?? 120;
    const avail = width - padH * 2;

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
  }, [width, base]);

  const { cols, cardWidth, columnGap, paddingHorizontal } = layout;
  const isSingleCol = cols === 1;
  const contentScale = isSingleCol ? 0.45 : 0.65;

  const sections = useMemo<SectionShape<T>[]>(() => {
    const enriched = data
      .map((b) => {
        const entry = historyIndex[b.id];
        if (!entry) return null;
        const ts = Number(entry[3]) || 0;
        if (!ts) return null;
        const d = new Date(ts * 1000);
        return {
          book: b,
          ts,
          dateKey: format(d, "yyyy-MM-dd"),
          dateTitle: format(d, "d MMM yyyy", { locale: ru }),
          timeHHmm: format(d, "HH:mm"),
        };
      })
      .filter(Boolean) as {
      book: T;
      ts: number;
      dateKey: string;
      dateTitle: string;
      timeHHmm: string;
    }[];

    enriched.sort((a, b) => b.ts - a.ts);

    const byDate = new Map<string, { title: string; items: RowItem<T>[] }>();
    for (const it of enriched) {
      if (!byDate.has(it.dateKey)) {
        byDate.set(it.dateKey, { title: it.dateTitle, items: [] });
      }
      byDate.get(it.dateKey)!.items.push({
        book: it.book,
        ts: it.ts,
        timeHHmm: it.timeHHmm,
      });
    }

    const result: SectionShape<T>[] = [];
    for (const [key, { title, items }] of byDate) {
      const rows: SectionRow<T>[] = [];
      for (let i = 0; i < items.length; i += cols) {
        rows.push(items.slice(i, i + cols));
      }
      result.push({ title, key, data: rows });
    }

    result.sort((a, b) => (a.key > b.key ? -1 : a.key < b.key ? 1 : 0));
    return result;
  }, [data, historyIndex, cols]);

  const renderRow: SectionListRenderItem<SectionRow<T>> = ({ item: row }) => {
    return (
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          paddingHorizontal,
          marginBottom: columnGap,
          justifyContent: "center",
        }}
      >
        {row.map((cell) => {
          const fav = isFavorite?.(cell.book.id) ?? false;

          const entry = historyIndex[cell.book.id];
          const cur = entry ? Number(entry[1]) || 0 : 0;
          const total = entry ? Math.max(1, Number(entry[2]) || 1) : 1;
          const curDisp = Math.min(cur + 1, total);
          const done = entry ? cur >= total - 1 : false;

          return (
            <Animated.View
              key={`${cell.book.id}-${cell.ts}`}
              exiting={FadeOut.duration(200)}
              style={{
                width: cardWidth,
                alignItems: "stretch",
                marginHorizontal: columnGap / 2,
              }}
            >
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: colors.sub }]}>
                  {cell.timeHHmm}
                </Text>
                {entry && (
                  <View
                    style={[
                      styles.progressPill,
                      { backgroundColor: done ? colors.accent : colors.tagBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.progressPillText,
                        { color: done ? colors.bg : colors.metaText },
                      ]}
                    >
                      {done ? "✔ прочитано" : `${curDisp}/${total}`}
                    </Text>
                  </View>
                )}
              </View>

              <BookCard
                book={cell.book}
                cardWidth={cardWidth}
                isSingleCol={isSingleCol}
                contentScale={contentScale}
                isFavorite={fav}
                onToggleFavorite={onToggleFavorite}
                onPress={() => onPress?.(cell.book.id)}
                score={getScore?.(cell.book)}
                showProgressOnCard={false}
              />
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<SectionRow<T>>;
  }) => {
    const s = section as unknown as SectionShape<T>;
    return (
      <View style={[styles.sectionHeaderWrap, { paddingHorizontal }]}>
        <View style={[styles.sectionHeader, { backgroundColor: colors.tagBg }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.metaText }]}>
            {s.title}
          </Text>
        </View>
      </View>
    );
  };

  const Empty = () => (
    <View style={styles.empty}>
      <Animated.Text entering={FadeOut.duration(400)} style={styles.emptyText}>
        История пуста ¯\_(ツ)_/¯
      </Animated.Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.page }]}>
      {sections.length === 0 && !loading ? (
        (ListEmptyComponent as ReactElement) ?? <Empty />
      ) : (
        <SectionList
          ref={listRef}
          stickySectionHeadersEnabled={false}
          sections={sections}
          keyExtractor={(row, index) => {
            const first = Array.isArray(row) && row[0];
            return first
              ? `r-${first.book.id}-${first.ts}-${index}`
              : `row-${index}`;
          }}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
          contentContainerStyle={{ paddingTop: paddingHorizontal / 2 }}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#888", fontSize: 16 },
  loader: { marginVertical: 16 },

  sectionHeaderWrap: { paddingTop: 8, paddingBottom: 6 },
  sectionHeader: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sectionHeaderText: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  timeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  timeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginRight: 8,
  },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressPillText: { fontWeight: "800", fontSize: 11 },
});
