import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { Book, searchBooks } from "@/api/nhentai";
import { useDrawer } from "@/components/DrawerContext";
import { useOverlayPortal } from "@/components/OverlayPortal";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { SortKey, useSort } from "@/context/SortContext";
import { useFilterTags } from "@/context/TagFilterContext";
import { useTheme } from "@/lib/ThemeContext";

const KEY_HISTORY = "searchHistory";
const BAR_HEIGHT = 52;

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "popular-week", label: "Hot Week" },
  { key: "popular-today", label: "Hot Today" },
  { key: "popular-month", label: "Hot Month" },
  { key: "date", label: "Newest" },
];

export function SearchBar() {
  const { colors } = useTheme();
  const { openDrawer } = useDrawer();
  const { sort, setSort } = useSort();
  const { includes, excludes } = useFilterTags();
  const portal = useOverlayPortal();

  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ query?: string | string[] }>();

  const [q, setQ] = useState(
    typeof params.query === "string" ? params.query : ""
  );
  const [focused, setFocused] = useState(false);
  const [kbH, setKbH] = useState(0);
  const [history, setHist] = useState<string[]>([]);
  const [suggests, setSug] = useState<Book[]>([]);
  const [loading, setLoad] = useState(false);

  const [tempSort, setTmp] = useState<SortKey>(sort);
  const [sortOpen, setSortOpen] = useState(false);

  const barRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const [barBottomY, setBarBottomY] = useState(0);

  const isPhone = (() => {
    const { width, height } = Dimensions.get("window");
    return Math.min(width, height) < 600;
  })();

  useEffect(() => {
    AsyncStorage.getItem(KEY_HISTORY).then((j) => j && setHist(JSON.parse(j)));
  }, []);

  const measureBar = () => {
    barRef.current?.measureInWindow((_x, y, _w, h) =>
      setBarBottomY(Math.round(y + h))
    );
  };
  useEffect(() => {
    measureBar();
    const sub = Dimensions.addEventListener("change", measureBar);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKbH(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const incStr = JSON.stringify(includes);
  const excStr = JSON.stringify(excludes);
  useEffect(() => {
    if (!q.trim()) {
      setSug([]);
      return;
    }
    setLoad(true);
    const t = setTimeout(async () => {
      try {
        const { books } = await searchBooks({
          query: q,
          perPage: 6,
          sort,
          includeTags: includes,
          excludeTags: excludes,
        });
        setSug(books);
      } finally {
        setLoad(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, sort, incStr, excStr]);

  useEffect(() => setTmp(sort), [sort]);

  const saveHist = async (text: string) => {
    const next = [text, ...history.filter((h) => h !== text)].slice(0, 10);
    setHist(next);
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(next));
  };
  const submit = async (text = q) => {
    const query = text.trim();
    if (!query) return;
    await saveHist(query);
    Keyboard.dismiss();
    hideDropdown();
    router.push({ pathname: "/explore", params: { query } });
  };

  const trimmed = q.trim();
  const filteredHistory = useMemo(
    () =>
      trimmed
        ? history.filter((h) => h.toLowerCase().includes(trimmed.toLowerCase()))
        : history,
    [history, trimmed]
  );
  const showHistory = filteredHistory.length > 0;
  const showResults = trimmed.length > 0 && (loading || suggests.length > 0);
  const shouldShowPanel = showHistory || showResults;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sortOpen) {
        closeSort();
        return true;
      }
      if (focused) {
        hideDropdown();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [focused, sortOpen]);

  const BG = colors.searchBg;
  const TXT = colors.searchTxt;
  const SUB = colors.sub;
  const ACCENT = colors.accent;

  const TOP_GAP = isPhone ? 42 : 36;
  const top = Math.max(BAR_HEIGHT + TOP_GAP, barBottomY + TOP_GAP);
  const bottom = Math.max(8, kbH + 8);

  const renderDropdown = () => (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={hideDropdown}
      pointerEvents="auto"
    >
      <Pressable
        onPress={() => {}}
        style={[
          styles.dropdown,
          styles.rounded,
          {
            backgroundColor: BG,
            borderColor: colors.page,
            top,
            left: 8,
            right: 8,
            bottom,
          },
        ]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.dropdownContent}
        >
          {showHistory && (
            <>
              <View style={styles.headRow}>
                <Text style={[styles.headTxt, { color: SUB }]}>HISTORY</Text>
                <Pressable
                  style={[styles.pillBtn, styles.rounded]}
                  android_ripple={{ color: ACCENT + "22", borderless: false }}
                  onPress={async () => {
                    setHist([]);
                    await AsyncStorage.removeItem(KEY_HISTORY);
                  }}
                >
                  <Text style={[styles.pillBtnTxt, { color: SUB }]}>clear</Text>
                </Pressable>
              </View>

              {filteredHistory.map((item) => (
                <View key={item} style={styles.row}>
                  <Pressable
                    style={[styles.rowPress, styles.rounded]}
                    android_ripple={{ color: ACCENT + "22", borderless: false }}
                    onPress={() => {
                      setQ(item);
                      submit(item);
                    }}
                  >
                    <Feather
                      name="clock"
                      size={16}
                      color={SUB}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[styles.rowTxt, { color: TXT }]}
                      numberOfLines={1}
                    >
                      {item}
                    </Text>
                  </Pressable>
                  <Pressable
                    hitSlop={10}
                    style={[styles.iconBtnSmall, styles.rounded]}
                    android_ripple={{ color: ACCENT + "22", borderless: false }}
                    onPress={async () => {
                      const next = history.filter((h) => h !== item);
                      setHist(next);
                      await AsyncStorage.setItem(
                        KEY_HISTORY,
                        JSON.stringify(next)
                      );
                    }}
                  >
                    <Feather name="x" size={16} color={SUB} />
                  </Pressable>
                </View>
              ))}
            </>
          )}

          {trimmed.length > 0 && (
            <>
              <Text
                style={[
                  styles.headTxt,
                  { color: SUB, marginTop: showHistory ? 14 : 2 },
                ]}
              >
                RESULTS
              </Text>

              {loading && (
                <ActivityIndicator
                  size="small"
                  color={SUB}
                  style={{ marginVertical: 12 }}
                />
              )}

              {!loading &&
                suggests.map((b) => (
                  <Pressable
                    key={b.id}
                    style={[styles.row, styles.rounded]}
                    android_ripple={{ color: ACCENT + "22", borderless: false }}
                    onPress={() => {
                      hideDropdown();
                      router.push({
                        pathname: "/book/[id]",
                        params: { id: String(b.id) },
                      });
                    }}
                  >
                    <SmartImage
                      sources={buildImageFallbacks(b.thumbnail)}
                      style={styles.thumb}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.rowTxt, { color: TXT }]}
                        numberOfLines={1}
                      >
                        {b.title.pretty}
                      </Text>
                      <Text style={[styles.metaTxt, { color: SUB }]}>
                        {b.pagesCount} pages
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </>
          )}
        </ScrollView>
      </Pressable>
    </Pressable>
  );

  const showDropdown = () => {
    portal.show(renderDropdown());
  };

  const hideDropdown = () => {
    setFocused(false);
    portal.hide();
    inputRef.current?.blur();
    Keyboard.dismiss();
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
          <Pressable
            onPress={closeSort}
            style={[styles.iconBtnSmall, styles.rounded]}
            android_ripple={{ color: colors.accent + "22", borderless: false }}
          >
            <Feather name="x" size={18} color={colors.sub} />
          </Pressable>
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

  const openSort = () => {
    hideDropdown();
    setTmp(sort);
    setSortOpen(true);
  };

  const closeSort = () => {
    setSortOpen(false);
    portal.hide();
  };

  useEffect(() => {
    if (sortOpen) {
      portal.show(renderSortSheet());
    }
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
    if (focused && shouldShowPanel) {
      measureBar();
      showDropdown();
    } else if (!sortOpen) {
      portal.hide();
    }
  }, [
    focused,
    shouldShowPanel,
    kbH,
    filteredHistory,
    suggests,
    q,
    loading,
    top,
    bottom,
    sortOpen,
  ]);

  const showBack = pathname && pathname !== "/" && pathname !== "/index";

  return (
    <>
      <Animated.View
        ref={barRef as any}
        onLayout={measureBar}
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
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, styles.rounded]}
            android_ripple={{ color: colors.accent + "33", borderless: false }}
          >
            <Feather name="arrow-left" size={20} color={colors.searchTxt} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              hideDropdown();
              openDrawer();
            }}
            style={[styles.iconBtn, styles.rounded]}
            android_ripple={{ color: colors.accent + "33", borderless: false }}
          >
            <Feather name="menu" size={22} color={colors.searchTxt} />
          </Pressable>
        )}

        <View
          style={[
            styles.inputWrap,
            styles.rounded,
            { backgroundColor: colors.page, borderColor: colors.page },
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={colors.sub}
            style={{ marginHorizontal: 6 }}
          />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.searchTxt }]}
            placeholder="Search…"
            placeholderTextColor={colors.sub}
            value={q}
            onChangeText={setQ}
            onFocus={() => setFocused(true)}
            onSubmitEditing={() => submit()}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {q !== "" && (
            <Pressable
              hitSlop={10}
              onPress={() => setQ("")}
              style={[styles.iconBtnSmall, styles.rounded]}
              android_ripple={{
                color: colors.accent + "22",
                borderless: false,
              }}
            >
              <Feather name="x" size={16} color={colors.sub} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={openSort}
          style={[styles.iconBtn, styles.rounded]}
          android_ripple={{ color: colors.accent + "33", borderless: false }}
        >
          <Feather name="filter" size={18} color={colors.accent} />
        </Pressable>
        <Pressable
          onPress={() => {
            hideDropdown();
            router.push("/tags");
          }}
          style={[styles.iconBtn, styles.rounded]}
          android_ripple={{ color: colors.accent + "33", borderless: false }}
        >
          <Feather name="tag" size={18} color={colors.accent} />
        </Pressable>
      </Animated.View>
    </>
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
  iconBtn: { padding: 8 },
  iconBtnSmall: { padding: 6 },
  inputWrap: {
    flex: 1,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    marginHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  dropdown: {
    position: "absolute",
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 10,
  },
  dropdownContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headTxt: { fontSize: 11, letterSpacing: 0.5, fontWeight: "700" },
  pillBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  pillBtnTxt: { fontSize: 11, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  rowPress: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  rowTxt: { fontSize: 14, flex: 1 },
  metaTxt: { fontSize: 12 },
  thumb: { width: 50, height: 70, borderRadius: 8, marginRight: 10 },
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
