import { Feather } from "@expo/vector-icons";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { useDrawer } from "@/components/DrawerContext";
import { useOverlayPortal } from "@/components/OverlayPortal";
import { SortKey, useSort } from "@/context/SortContext";
import { useTheme } from "@/lib/ThemeContext";

const BAR_HEIGHT = 52;
const BTN_SIDE = 40;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "popular-week", label: "Hot Week" },
  { key: "popular-today", label: "Hot Today" },
  { key: "popular-month", label: "Hot Month" },
  { key: "date", label: "Newest" },
];

function hasSeg(pathname: string | null | undefined, seg: string) {
  const p = pathname ?? "";
  return new RegExp(`(^|/)${seg}(\\/|$)`).test(p);
}

function getTitle(
  pathname: string | null | undefined,
  q: string,
  bookTitle?: string,
  bookId?: string
) {
  const p = pathname ?? "";
  const has = (seg: string) => new RegExp(`(^|/)${seg}(\\/|$)`).test(p);

  if (p === "/" || has("index")) return "Главная";
  if (has("explore")) return q ? `Поиск: ${q}` : "Поиск";
  if (has("favorites")) return "Избранное";
  if (has("downloaded")) return "Загрузки";
  if (has("recommendations")) return "Рекомендации";
  if (has("history")) return "История";
  if (has("settings")) return "Настройки";
  if (has("book")) return `#${bookId} - ${bookTitle}`;
  if (has("search")) return q ? `Поиск: ${q}` : "Поиск";
  if (has("tags")) return "Теги";
  return "NH App";
}

/** Круглая иконка-кнопка без «квадратов» при удержании */
function IconBtn({
  onPress,
  onLongPress,
  children,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.iconBtnRound,
        pressed && { backgroundColor: colors.accent + "22" },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SearchBar() {
  const { colors } = useTheme();
  const { openDrawer } = useDrawer();
  const { sort, setSort } = useSort();
  const portal = useOverlayPortal();

  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{
    query?: string | string[];
    id?: string | string[];
    title?: string | string[];
  }>();

  const q = typeof params.query === "string" ? params.query : "";

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const bookId = typeof rawId === "string" ? rawId : undefined;

  const rawTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const bookTitle = typeof rawTitle === "string" ? rawTitle : undefined;

  const [sortOpen, setSortOpen] = useState(false);
  const [tempSort, setTmp] = useState<SortKey>(sort);
  const [backOpen, setBackOpen] = useState(false);

  useEffect(() => setTmp(sort), [sort]);

  const title = useMemo(
    () => getTitle(pathname, q, bookTitle, bookId),
    [pathname, q, bookTitle, bookId]
  );
  const showBack = pathname && pathname !== "/" && pathname !== "/index";

  const hideRight = hasSeg(pathname, "settings") || hasSeg(pathname, "tags") || hasSeg(pathname, "book");

  const closeSort = () => {
    setSortOpen(false);
    portal.hide();
  };

  const renderSortSheet = () => (
    <View style={styles.sheetBackdrop} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={closeSort} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.searchBg, borderColor: colors.page },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.searchTxt }]}>
            Sort by
          </Text>
          <IconBtn onPress={closeSort}>
            <Feather name="x" size={18} color={colors.sub} />
          </IconBtn>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={{ paddingVertical: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {SORT_OPTIONS.map(({ key, label }) => (
            <Pressable
              key={key}
              style={[styles.sortRow, styles.rounded]}
              onPress={() => setTmp(key)}
              android_ripple={{
                color: colors.accent + "22",
                borderless: false,
              }}
            >
              <Text
                style={[
                  styles.sortTxt,
                  {
                    color: key === tempSort ? colors.accent : colors.searchTxt,
                    fontWeight: key === tempSort ? "700" : "500",
                  },
                ]}
              >
                {label}
              </Text>
              {key === tempSort && (
                <Feather name="check" size={16} color={colors.accent} />
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sheetFooter}>
          <Pressable
            style={[
              styles.footerBtn,
              styles.rounded,
              { backgroundColor: colors.accent },
            ]}
            android_ripple={{ color: "#ffffff22", borderless: false }}
            onPress={() => {
              setSort(tempSort);
              closeSort();
            }}
          >
            <Text style={[styles.footerBtnTxt, { color: colors.bg }]}>OK</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  function backOne() {
    portal.hide();
    setBackOpen(false);
    router.back();
  }
  function backTwo() {
    portal.hide();
    setBackOpen(false);
    router.back();
    setTimeout(() => router.back(), 0);
  }
  function backHome() {
    portal.hide();
    setBackOpen(false);
    router.replace("/");
  }

  const renderBackSheet = () => (
    <View style={styles.sheetBackdrop} pointerEvents="auto">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          setBackOpen(false);
          portal.hide();
        }}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.searchBg, borderColor: colors.page },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.searchTxt }]}>
            Назад
          </Text>
          <IconBtn
            onPress={() => {
              setBackOpen(false);
              portal.hide();
            }}
          >
            <Feather name="x" size={18} color={colors.sub} />
          </IconBtn>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={{ paddingVertical: 4 }}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={[styles.sortRow, styles.rounded]}
            onPress={backOne}
            android_ripple={{ color: colors.accent + "22", borderless: false }}
          >
            <Text style={[styles.sortTxt, { color: colors.searchTxt }]}>
              Назад на 1
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sortRow, styles.rounded]}
            onPress={backTwo}
            android_ripple={{ color: colors.accent + "22", borderless: false }}
          >
            <Text style={[styles.sortTxt, { color: colors.searchTxt }]}>
              Назад на 2
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sortRow, styles.rounded]}
            onPress={backHome}
            android_ripple={{ color: colors.accent + "22", borderless: false }}
          >
            <Text style={[styles.sortTxt, { color: colors.searchTxt }]}>
              На главную
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );

  useEffect(() => {
    if (sortOpen) portal.show(renderSortSheet());
  }, [
    sortOpen,
    tempSort,
    colors.searchBg,
    colors.page,
    colors.searchTxt,
    colors.accent,
    colors.sub,
  ]);
  useEffect(() => {
    if (backOpen) portal.show(renderBackSheet());
  }, [
    backOpen,
    colors.searchBg,
    colors.page,
    colors.searchTxt,
    colors.accent,
    colors.sub,
  ]);

  const openSort = () => {
    setTmp(sort);
    setSortOpen(true);
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: colors.searchBg,
          height: BAR_HEIGHT,
          borderBottomColor: colors.page,
        },
      ]}
    >
      {showBack ? (
        <IconBtn
          onPress={() => router.back()}
          onLongPress={() => setBackOpen(true)}
        >
          <Feather name="arrow-left" size={20} color={colors.searchTxt} />
        </IconBtn>
      ) : (
        <IconBtn onPress={openDrawer}>
          <Feather name="menu" size={22} color={colors.searchTxt} />
        </IconBtn>
      )}

      <Text
        numberOfLines={1}
        style={[styles.title, { color: colors.searchTxt }]}
      >
        {title}
      </Text>

      {!hideRight && (
        <View style={styles.rightGroup}>
          <IconBtn
            onPress={() =>
              router.push({
                pathname: "/search",
                params: q ? { query: q } : {},
              })
            }
          >
            <Feather name="search" size={18} color={colors.searchTxt} />
          </IconBtn>
          <IconBtn onPress={openSort}>
            <Feather name="filter" size={18} color={colors.accent} />
          </IconBtn>
          <IconBtn onPress={() => router.push("/tags")}>
            <Feather name="tag" size={18} color={colors.accent} />
          </IconBtn>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rounded: { borderRadius: 12, overflow: "hidden" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    elevation: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  title: {
    marginLeft: 8,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlignVertical: "center",
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 6,
  },
  iconBtn: { padding: 8 },
  iconBtnRound: {
    width: BTN_SIDE,
    height: BTN_SIDE,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 60,
    elevation: 12,
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
    maxHeight: 560,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  sheetScroll: { paddingHorizontal: 8 },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 2,
  },
  sortTxt: { fontSize: 15 },
  sheetFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  footerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 104,
    alignItems: "center",
  },
  footerBtnTxt: { fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
});

export default SearchBar;
