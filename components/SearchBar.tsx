import { Book, searchBooks } from "@/api/nhentai";
import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";
import { hsbToHex } from "@/constants/Colors";
import { SortKey, useSort } from "@/context/SortContext";
import { useFilterTags } from "@/context/TagFilterContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const KEY_HISTORY = "searchHistory";
const MAX_HEIGHT = Dimensions.get("window").height * 0.6;

const COLOR_BG = hsbToHex({ saturation: 80, brightness: 60 });
const COLOR_TEXT = hsbToHex({ saturation: 100, brightness: 220 });
const COLOR_ACCENT = hsbToHex({ saturation: 100, brightness: 200 });
const COLOR_SUB = hsbToHex({ saturation: 100, brightness: 100 });

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "popular-week", label: "Hot Week" },
  { key: "popular-today", label: "Hot Today" },
  { key: "popular-month", label: "Hot Month" },
  { key: "date", label: "Newest" },
];

export function SearchBar() {
  const { sort, setSort } = useSort();
  const { includes, excludes } = useFilterTags();
  const incStr = JSON.stringify(includes);
  const excStr = JSON.stringify(excludes);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ query?: string }>();

  const [q, setQ] = useState(params.query ?? "");
  const [focus, setFocus] = useState(false);

  const [history, setHist] = useState<string[]>([]);
  const [suggests, setSug] = useState<Book[]>([]);
  const [loading, setLoad] = useState(false);

  const [showSort, setShow] = useState(false);
  const [tempSort, setTemp] = useState<SortKey>(sort);

  const [kbH, setKbH] = useState(0);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY_HISTORY).then((j) => j && setHist(JSON.parse(j)));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKbH(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKbH(0);
      inputRef.current?.blur();
      setFocus(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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
    }, 400);

    return () => clearTimeout(t);
  }, [q, sort, incStr, excStr]);

  useEffect(() => setTemp(sort), [sort]);

  const filteredHist = history.filter((h) =>
    q.trim() ? h.toLowerCase().includes(q.trim().toLowerCase()) : true
  );

  const showBack = pathname.startsWith("/explore");
  const showDrop = focus && (filteredHist.length > 0 || suggests.length > 0);

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
    router.push({ pathname: "/explore", params: { query } });
  };

  return (
    <>
      <Animated.View
        style={[
          styles.bar,
          { marginTop: insets.top + 8, backgroundColor: COLOR_BG },
        ]}
      >
        {showBack && (
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={18} color={COLOR_TEXT} />
          </Pressable>
        )}

        <Feather
          name="search"
          size={18}
          color={COLOR_TEXT}
          style={{ marginHorizontal: 4 }}
        />

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: COLOR_TEXT }]}
          placeholder="Search"
          placeholderTextColor={COLOR_SUB}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => submit()}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          returnKeyType={Platform.OS === "ios" ? "search" : "done"}
          blurOnSubmit
        />

        {q !== "" && (
          <Pressable
            hitSlop={10}
            onPress={() => setQ("")}
            style={styles.iconBtn}
          >
            <Feather name="x" size={18} color={COLOR_TEXT} />
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            setTemp(sort);
            setShow(true);
          }}
          style={styles.iconBtn}
        >
          <Feather name="sliders" size={18} color={COLOR_ACCENT} />
        </Pressable>
      </Animated.View>

      <Modal visible={showSort} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={[styles.sortModal, { backgroundColor: COLOR_BG }]}>
            {SORT_OPTIONS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={styles.sortRow}
                onPress={() => setTemp(key)}
              >
                <Text
                  style={[
                    styles.sortTxt,
                    {
                      color: key === tempSort ? COLOR_ACCENT : COLOR_TEXT,
                      fontWeight: key === tempSort ? "700" : "400",
                    },
                  ]}
                >
                  {label}
                </Text>
                {key === tempSort && (
                  <Feather name="check" size={16} color={COLOR_ACCENT} />
                )}
              </Pressable>
            ))}

            <View style={styles.sortButtons}>
              <Pressable style={styles.sortBtn} onPress={() => setShow(false)}>
                <Text style={[styles.sortBtnTxt, { color: COLOR_SUB }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={styles.sortBtn}
                onPress={() => {
                  setSort(tempSort);
                  setShow(false);
                }}
              >
                <Text style={[styles.sortBtnTxt, { color: COLOR_ACCENT }]}>
                  OK
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showDrop && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.dropdown,
              {
                marginTop: 8,
                maxHeight: Math.min(
                  MAX_HEIGHT,
                  Dimensions.get("window").height - kbH - 80
                ),
                backgroundColor: COLOR_BG,
                marginBottom: kbH,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {filteredHist.length > 0 && (
                <>
                  <View style={styles.headRow}>
                    <Text style={[styles.headTxt, { color: COLOR_SUB }]}>
                      HISTORY
                    </Text>
                    <Pressable
                      onPress={async () => {
                        setHist([]);
                        await AsyncStorage.removeItem(KEY_HISTORY);
                      }}
                    >
                      <Text style={[styles.headTxt, { color: COLOR_SUB }]}>
                        clear
                      </Text>
                    </Pressable>
                  </View>

                  {filteredHist.map((item) => (
                    <View key={item} style={styles.row}>
                      <Pressable
                        style={styles.rowPress}
                        onPress={() => {
                          setQ(item);
                          submit(item);
                        }}
                      >
                        <Feather
                          name="clock"
                          size={16}
                          color={COLOR_SUB}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={[styles.rowTxt, { color: COLOR_TEXT }]}
                          numberOfLines={1}
                        >
                          {item}
                        </Text>
                      </Pressable>
                      <Pressable
                        hitSlop={10}
                        onPress={async () => {
                          const next = history.filter((h) => h !== item);
                          setHist(next);
                          await AsyncStorage.setItem(
                            KEY_HISTORY,
                            JSON.stringify(next)
                          );
                        }}
                      >
                        <Feather name="x" size={16} color={COLOR_SUB} />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}

              {suggests.length > 0 && (
                <>
                  <Text
                    style={[
                      styles.headTxt,
                      {
                        color: COLOR_SUB,
                        marginTop: filteredHist.length ? 14 : 0,
                      },
                    ]}
                  >
                    RESULTS
                  </Text>

                  {loading && (
                    <ActivityIndicator
                      size="small"
                      color={COLOR_SUB}
                      style={{ marginVertical: 12 }}
                    />
                  )}

                  {!loading &&
                    suggests.map((b) => (
                      <Pressable
                        key={b.id}
                        style={styles.row}
                        onPress={() =>
                          router.push({
                            pathname: "/book/[id]",
                            params: { id: String(b.id) },
                          })
                        }
                      >
                        <SmartImage
                          sources={buildImageFallbacks(b.thumbnail)}
                          style={styles.thumb}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.rowTxt, { color: COLOR_TEXT }]}
                            numberOfLines={1}
                          >
                            {b.title.pretty}
                          </Text>
                          <Text style={[styles.metaTxt, { color: COLOR_SUB }]}>
                            {b.pagesCount} pages
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </>
              )}

              {filteredHist.length === 0 &&
                suggests.length === 0 &&
                !loading && (
                  <Text
                    style={[
                      styles.headTxt,
                      {
                        color: COLOR_SUB,
                        textAlign: "center",
                        marginVertical: 12,
                      },
                    ]}
                  >
                    nothing
                  </Text>
                )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    paddingHorizontal: 8,
    height: 40,
    borderRadius: 12,
  },
  iconBtn: { padding: 6 },
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortModal: {
    width: "70%",
    borderRadius: 10,
    paddingVertical: 12,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sortTxt: { fontSize: 15 },
  sortButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sortBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  sortBtnTxt: { fontSize: 16 },

  dropdown: {
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 18,
  },

  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headTxt: { fontSize: 11, letterSpacing: 0.5 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  rowPress: { flexDirection: "row", alignItems: "center", flex: 1 },
  rowTxt: { fontSize: 14, flex: 1 },
  metaTxt: { fontSize: 12 },
  thumb: { width: 50, height: 70, borderRadius: 4, marginRight: 8 },
});
