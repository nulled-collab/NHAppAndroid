import raw from "@/api/nhentai-tags.json";
import { hsbToHex } from "@/constants/Colors";
import { useFilterTags } from "@/context/TagFilterContext";
import { Feather } from "@expo/vector-icons";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useFocusEffect } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBar, TabView } from "react-native-tab-view";

const COLS = 4;
const GAP = 8;
const CARD_W = (Dimensions.get("window").width - GAP * (COLS + 1)) / COLS;

const BG       = hsbToHex({ saturation: 76, brightness: 18 });
const TXT      = hsbToHex({ saturation: 20, brightness: 240 });
const SUB      = hsbToHex({ saturation: 0,  brightness: 120 });
const INC_BG   = hsbToHex({ saturation: 60, brightness: 34 });
const INC_TXT  = hsbToHex({ saturation: 60, brightness: 200 });
const EXC_BG   = hsbToHex({ saturation: 0,  brightness: 34 });
const EXC_TXT  = hsbToHex({ saturation: 0,  brightness: 220 });

type RouteKey = "applied" | "tags" | "artists" | "characters" | "parodies" | "groups";
interface TabRoute { key: RouteKey; title: string }

interface TagEntry {
  id: string; type: string; name: string; count: number; url: string;
}
interface TagsDb {
  tags: TagEntry[]; artists: TagEntry[]; characters: TagEntry[];
  parodies: TagEntry[]; groups: TagEntry[];
}

const db = raw as TagsDb;
const DATASETS = {
  tags: db.tags,
  artists: db.artists,
  characters: db.characters,
  parodies: db.parodies,
  groups: db.groups,
};

const clrCache = new Map<string, string>();
const bgFor = (name: string) => {
  if (!clrCache.has(name)) clrCache.set(name, hsbToHex({ saturation: 40, brightness: 60 }));
  return clrCache.get(name)!;
};

/* ── Tag card ─────────────────────────── */
interface CardProps { tag: TagEntry; mode?: "include" | "exclude"; onToggle: () => void }
const TagCard = memo<CardProps>(
  ({ tag, mode, onToggle }) => (
    <Pressable
      onPress={onToggle}
      style={[
        styles.card,
        { backgroundColor: bgFor(tag.name) },
        mode === "include" && { backgroundColor: INC_BG },
        mode === "exclude" && { backgroundColor: EXC_BG },
      ]}
    >
      <View style={styles.icon}>
        {mode === "include" && <Feather name="check-circle" size={18} color={INC_TXT} />}
        {mode === "exclude" && <Feather name="minus-circle" size={18} color={EXC_TXT} />}
        {!mode && <Feather name="plus-circle" size={18} color={TXT} />}
      </View>
      <Text
        numberOfLines={2}
        style={[
          styles.cardTxt,
          mode === "include" && { color: INC_TXT },
          mode === "exclude" && { color: EXC_TXT },
        ]}
      >
        {tag.name}
      </Text>
      <Text
        style={[
          styles.countTxt,
          mode === "include" && { color: INC_TXT },
          mode === "exclude" && { color: EXC_TXT },
        ]}
      >
        {tag.count}
      </Text>
    </Pressable>
  ),
  (p, n) => p.tag.id === n.tag.id && p.mode === n.mode
);

/* ── Grid maker ───────────────────────── */
const makeGrid = (
  data: TagEntry[],
  getMode: (name: string) => "include" | "exclude" | undefined,
  toggle: (t: TagEntry) => void
) => {
  const renderItem: ListRenderItem<TagEntry> = ({ item }) => (
    <TagCard tag={item} mode={getMode(item.name)} onToggle={() => toggle(item)} />
  );
  return (
    <FlashList
      data={data}
      keyExtractor={t => t.id}
      numColumns={COLS}
      renderItem={renderItem}
      estimatedItemSize={CARD_W + GAP}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      extraData={getMode}
    />
  );
};

/* ── Main screen ──────────────────────── */
export default function TagsScreen() {
  const { filters, cycle, clear } = useFilterTags();
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => setSearch(""), []));

  /* fast lookup for modes */
  const filterMap = useMemo(() => {
    const m = new Map<string, "include" | "exclude">();
    filters.forEach(f => m.set(f.name, f.mode));
    return m;
  }, [filters]);
  const getMode = useCallback((name: string) => filterMap.get(name), [filterMap]);

  /* lookup for counts (по имени) */
  const countMap = useMemo(() => {
    const m = new Map<string, number>();
    Object.values(DATASETS).forEach(arr => arr.forEach(t => m.set(t.name, t.count)));
    return m;
  }, []);

  /* filtered & sorted lists */
  const filteredLists = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const match   = (t: TagEntry) => !needle || t.name.toLowerCase().includes(needle);
    const byCount = (a: TagEntry, b: TagEntry) => b.count - a.count;
    const slice   = (arr: TagEntry[]) => [...(needle ? arr.filter(match) : arr)].sort(byCount);

    return {
      applied: filters
        .map(f => ({
          id: `${f.type}:${f.name}`,
          type: f.type,
          name: f.name,
          count: countMap.get(f.name) ?? 0,
          url: "",
        }))
        .sort(byCount),
      tags:        slice(DATASETS.tags),
      artists:     slice(DATASETS.artists),
      characters:  slice(DATASETS.characters),
      parodies:    slice(DATASETS.parodies),
      groups:      slice(DATASETS.groups),
    };
  }, [filters, search, countMap]);

  const toggle = useCallback((tag: TagEntry) => cycle(tag), [cycle]);

  const renderScene = useCallback(
    ({ route }: { route: TabRoute }) => {
      switch (route.key) {
        case "applied":     return makeGrid(filteredLists.applied,    getMode, toggle);
        case "tags":        return makeGrid(filteredLists.tags,       getMode, toggle);
        case "artists":     return makeGrid(filteredLists.artists,    getMode, toggle);
        case "characters":  return makeGrid(filteredLists.characters, getMode, toggle);
        case "parodies":    return makeGrid(filteredLists.parodies,   getMode, toggle);
        case "groups":      return makeGrid(filteredLists.groups,     getMode, toggle);
        default:            return null;
      }
    },
    [filteredLists, getMode, toggle]
  );

  const routes = useMemo<TabRoute[]>(
    () => [
      { key: "applied", title: "ВЫБРАННЫЕ" },
      { key: "tags",    title: "ТЕГИ" },
      { key: "artists", title: "ХУДОЖНИКИ" },
      { key: "characters", title: "ПЕРСОНАЖИ" },
      { key: "parodies", title: "ПАРОДИИ" },
      { key: "groups",  title: "ГРУППЫ" },
    ],
    []
  );

  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      <TextInput
        placeholder="Search tag…"
        placeholderTextColor={SUB}
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      <TabView<TabRoute>
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        lazy
        initialLayout={{ width: Dimensions.get("window").width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            style={{ backgroundColor: BG }}
            indicatorStyle={{ backgroundColor: INC_TXT }}
            scrollEnabled
            activeColor={INC_TXT}
            inactiveColor={TXT}
            tabStyle={{ width: "auto" }}
          />
        )}
      />
      <Pressable onPress={clear} style={styles.clearBtn}>
        <Text style={styles.clearTxt}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

/* ── styles ───────────────────────────── */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },

  search: {
    margin: GAP,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: hsbToHex({ saturation: 0, brightness: 40 }),
    color: TXT,
    fontSize: 14,
  },

  card: {
    width: CARD_W,
    height: CARD_W,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 8,
    margin: GAP / 2,
  },
  cardTxt:   { color: TXT, fontSize: 12, fontWeight: "600" },
  countTxt:  { color: TXT, fontSize: 11, opacity: 0.8 },
  icon:      { position: "absolute", top: 6, left: 6 },

  clearBtn: {
    position: "absolute",
    right: 16,
    bottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: hsbToHex({ saturation: 76, brightness: 50 }),
    elevation: 4,
  },
  clearTxt: {
    color: hsbToHex({ saturation: 0, brightness: 240 }),
    fontWeight: "600",
  },
});
