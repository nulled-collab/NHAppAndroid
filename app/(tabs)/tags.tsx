import raw from "@/api/nhentai-tags.json";
import { useFilterTags } from "@/context/TagFilterContext";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ---------- типизация JSON ---------- */
interface TagEntry {
  id: string; // в JSON id строкой — пусть так
  type: string;
  name: string;
  count: number;
  url: string;
}
interface TagsDbShape {
  updated: string;
  tags: TagEntry[];
  artists: TagEntry[];
  characters: TagEntry[];
  parodies: TagEntry[];
  groups: TagEntry[];
}
const tagsDb = raw as unknown as TagsDbShape;
type OneTag = TagsDbShape["tags"][number];

/* ---------- экран ---------- */
export default function TagsScreen() {
  const { filters, cycle, clear } = useFilterTags();
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets(); // ← NEW

  /* собираем все коллекции */
  const all: OneTag[] = useMemo(() => {
    const pack = [
      "tags",
      "artists",
      "characters",
      "parodies",
      "groups",
    ] as const;
    return pack.flatMap((k) => (tagsDb as any)[k]);
  }, []);

  /* фильтр + топ */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return all
      .filter((t) => t.name.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
      .slice(0, 400);
  }, [all, search]);

  const getMode = (t: OneTag) =>
    filters.find((x) => x.type === t.type && x.name === t.name)?.mode;

  /* ---------- UI ---------- */
  return (
    <View
      style={{
        flex: 1,
        padding: 12,
        backgroundColor: "#302d45",
        paddingTop: insets.top + 12,
      }}
    >
      <TextInput
        placeholder="Search tag…"
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
        style={st.search}
      />

      <FlatList
        data={filtered}
        extraData={filters} // <— важная строка, триггерит перерисовку
        keyboardShouldPersistTaps="handled"
        keyExtractor={(t) => `${t.type}:${t.id}`}
        renderItem={({ item }) => {
          const mode = getMode(item);
          return (
            <Pressable
              onPress={() => cycle({ type: item.type, name: item.name })}
              style={[
                st.tagRow,
                mode === "include" && { backgroundColor: "#3c5cff55" },
                mode === "exclude" && { backgroundColor: "#ff555533" },
              ]}
            >
              <Text style={st.tagName}>{item.name}</Text>
              <Text style={st.tagMeta}>
                {item.type} · {item.count}
              </Text>
              {mode && (
                <Text
                  style={[
                    st.badge,
                    mode === "include" ? st.badgeInc : st.badgeExc,
                  ]}
                >
                  {mode === "include" ? "✓" : "✕"}
                </Text>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable onPress={clear} style={st.clearBtn}>
            <Text style={st.clearTxt}>Clear filters</Text>
          </Pressable>
        }
      />
    </View>
  );
}

/* ---------- стили ---------- */
const st = StyleSheet.create({
  search: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#403d5e",
    color: "#fff",
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#555",
  },
  tagName: { color: "#fff", fontSize: 14, flex: 1 },
  tagMeta: { color: "#aaa", fontSize: 11, marginRight: 8 },
  badge: {
    width: 20,
    textAlign: "center",
    borderRadius: 4,
    fontSize: 12,
    color: "#fff",
    paddingVertical: 2,
  },
  badgeInc: { backgroundColor: "#3c5cff" },
  badgeExc: { backgroundColor: "#ff5555" },
  clearBtn: {
    marginTop: 16,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#725cff",
  },
  clearTxt: { color: "#fff" },
});
