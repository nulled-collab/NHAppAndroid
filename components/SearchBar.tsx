import { Book, searchBooks } from "@/api/nhentai";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SmartImage from "@/components/SmartImage";
import { buildImageFallbacks } from "@/components/buildImageFallbacks";

const KEY_HISTORY = "searchHistory";
const MAX_HEIGHT = Dimensions.get("window").height * 0.6; // 60 % высоты экрана

export default function SearchBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [isFocused, setFocused] = useState(false);
  const [history, setHist] = useState<string[]>([]);
  const [suggests, setSug] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  /* ─── load history once ─────────────────────────────────────────────── */
  useEffect(() => {
    AsyncStorage.getItem(KEY_HISTORY).then((j) => j && setHist(JSON.parse(j)));
  }, []);

  /* ─── blur on keyboard hide / Android Back ──────────────────────────── */
  useEffect(() => {
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      inputRef.current?.isFocused() && inputRef.current.blur();
    });
    const backSub =
      Platform.OS === "android"
        ? BackHandler.addEventListener("hardwareBackPress", () => {
            if (inputRef.current?.isFocused()) {
              inputRef.current.blur();
              Keyboard.dismiss();
              return true;
            }
            return false;
          })
        : { remove() {} };

    return () => {
      hideSub.remove();
      backSub.remove();
    };
  }, []);

  /* ─── live suggestions (debounce 500 ms, limit 6) ───────────────────── */
  useEffect(() => {
    if (!q.trim()) {
      setSug([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { books } = await searchBooks({
          query: q,
          perPage: 6,
          sort: "date",
        });
        setSug(books);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [q]);

  /* ─── helpers ───────────────────────────────────────────────────────── */
  const saveHistory = async (query: string) => {
    const next = [query, ...history.filter((h) => h !== query)].slice(0, 10);
    setHist(next);
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(next));
  };

  const doSearch = async (text = q) => {
    const query = text.trim();
    if (!query) return;
    await saveHistory(query);
    Keyboard.dismiss();
    router.push({
      pathname: "/explore",
      params: { query },
    });
  };

  const deleteChip = async (t: string) => {
    const next = history.filter((h) => h !== t);
    setHist(next);
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(next));
  };

  const clearHistory = async () => {
    setHist([]);
    await AsyncStorage.removeItem(KEY_HISTORY);
  };

  const chips =
    q.trim() === ""
      ? history
      : history.filter((h) => h.toLowerCase().includes(q.trim().toLowerCase()));

  const showDrop = isFocused && (chips.length > 0 || q.trim() !== "");

  /* ─── UI ────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* input */}
      <View style={[styles.wrap, { paddingTop: insets.top + 4 }]}>
        <Feather name="search" size={18} color="#999" />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search…"
          placeholderTextColor="#777"
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => doSearch()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType={Platform.OS === "ios" ? "search" : "done"}
          blurOnSubmit
        />
      </View>

      {/* dropdown */}
      {showDrop && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={insets.top + 48}
        >
          <View
            style={[
              styles.dropdown,
              { maxHeight: MAX_HEIGHT, marginBottom: insets.bottom },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* HISTORY */}
              {history.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>HISTORY</Text>
                    <Pressable onPress={clearHistory}>
                      <Text style={styles.clearTxt}>clear</Text>
                    </Pressable>
                  </View>

                  {chips.map((item) => (
                    <View key={item} style={styles.row}>
                      <Pressable
                        style={styles.rowPress}
                        onPress={() => {
                          setQ(item);
                          doSearch(item);
                        }}
                      >
                        <Feather
                          name="clock"
                          size={16}
                          color="#8c89b1"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.rowText} numberOfLines={1}>
                          {item}
                        </Text>
                      </Pressable>
                      <Pressable hitSlop={10} onPress={() => deleteChip(item)}>
                        <Feather name="x" size={16} color="#8c89b1" />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}

              {/* RESULTS */}
              {q.trim() !== "" && (
                <>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { marginTop: history.length ? 14 : 0 },
                    ]}
                  >
                    RESULTS
                  </Text>

                  {loading && (
                    <ActivityIndicator
                      size="small"
                      color="#8c89b1"
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
                          resizeMode="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowText} numberOfLines={1}>
                            {b.title.pretty}
                          </Text>
                          <Text style={styles.metaTxt}>
                            {b.pagesCount} pages
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

/* styles */
const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#36334d",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#555",
  },
  dropdown: {
    width: "100%",
    backgroundColor: "#2f2c46",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#8c89b1",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  clearTxt: { color: "#8c89b1", fontSize: 11 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  rowPress: { flexDirection: "row", alignItems: "center", flex: 1 },
  rowText: { color: "#e4e2ff", fontSize: 14, flex: 1 },
  metaTxt: { color: "#8c89b1", fontSize: 12 },
  thumb: { width: 50, height: 70, borderRadius: 4, marginRight: 8 },
});
