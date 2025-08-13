import raw from "@/api/nhentai-tags.json";
import ru from "@/api/RuTags.json";
import { useFilterTags } from "@/context/TagFilterContext";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type TagKind = "tags" | "artists" | "characters" | "parodies" | "groups";
export interface TagEntry {
  id: string;
  type: TagKind;
  name: string;
  count: number;
  url: string;
}
interface TagsDb {
  tags: TagEntry[];
  artists: TagEntry[];
  characters: TagEntry[];
  parodies: TagEntry[];
  groups: TagEntry[];
}
const db = raw as TagsDb;

const RU_MAP = ru as Record<string, string>;
const sanitize = (s: string) => s.replace(/[^a-z]/gi, "").toUpperCase();
const rusOf = (name: string) => RU_MAP[sanitize(name)] ?? name;

const keyOf = (t: { type: string; name: string }) => `${t.type}:${t.name}`;

const PRE_SORTED: Record<TagKind, TagEntry[]> = {
  tags: [...db.tags].sort((a, b) => b.count - a.count),
  artists: [...db.artists].sort((a, b) => b.count - a.count),
  characters: [...db.characters].sort((a, b) => b.count - a.count),
  parodies: [...db.parodies].sort((a, b) => b.count - a.count),
  groups: [...db.groups].sort((a, b) => b.count - a.count),
};

const useResponsive = () => {
  const win = useWindowDimensions();
  const scr = Dimensions.get("screen");
  const shortestScreen = Math.min(scr.width, scr.height);
  const isTablet = scr.width >= 900 || shortestScreen >= 600;
  const gridCols = Math.max(1, Math.min(5, Math.floor((isTablet ? win.width - 320 : win.width) / 260)));
  return { width: win.width, height: win.height, isTablet, gridCols: gridCols || 1 };
};

type Lens = "all" | TagKind;
const LENSES: { key: Lens; title: string }[] = [
  { key: "all", title: "ВСЕ" },
  { key: "tags", title: "ТЕГИ" },
  { key: "artists", title: "ХУДОЖНИКИ" },
  { key: "characters", title: "ПЕРСОНАЖИ" },
  { key: "parodies", title: "ПАРОДИИ" },
  { key: "groups", title: "ГРУППЫ" },
];

interface ChipProps {
  tag: TagEntry;
  mode?: "include" | "exclude";
  onToggle: () => void;
}

const TagChip = memo<ChipProps>(
  ({ tag, mode, onToggle }) => {
    const { colors } = useTheme();
    const bg = mode === "include" ? colors.incBg : mode === "exclude" ? colors.excBg : colors.tagBg;
    const fg = mode === "include" ? colors.incTxt : mode === "exclude" ? colors.excTxt : colors.tagText;
    return (
      <Pressable onPress={onToggle} style={[styles.chip, { backgroundColor: bg }]}>
        <View style={styles.chipIcon}>
          {mode === "include" && <Feather name="check" size={16} color={fg} />}
          {mode === "exclude" && <Feather name="minus" size={16} color={fg} />}
          {!mode && <Feather name="plus" size={16} color={fg} />}
        </View>
        <View style={styles.chipTextWrap}>
          <Text numberOfLines={1} style={[styles.chipTitle, { color: fg }]}>{tag.name}</Text>
          <Text numberOfLines={1} style={[styles.chipSub, { color: fg }]}>{rusOf(tag.name)}</Text>
        </View>
        <Text style={[styles.chipCount, { color: fg }]}>{tag.count}</Text>
      </Pressable>
    );
  },
  (p, n) => p.tag.id === n.tag.id && p.mode === n.mode
);

function SelectedPanel({
  visible,
  onClose,
  isTablet,
}: {
  visible: boolean;
  onClose: () => void;
  isTablet: boolean;
}) {
  const { colors } = useTheme();
  const { filters, cycle, clear } = useFilterTags();
  const included = filters.filter((f) => f.mode === "include");
  const excluded = filters.filter((f) => f.mode === "exclude");

  const Section = ({ title, data }: { title: string; data: typeof filters }) => (
    <View style={styles.selSection}>
      <Text style={[styles.selTitle, { color: colors.title }]}>{title}</Text>
      {data.length === 0 ? (
        <Text style={[styles.selEmpty, { color: colors.sub }]}>пусто</Text>
      ) : (
        data.map((f) => (
          <View key={keyOf(f)} style={[styles.selRow, { borderColor: colors.page }]}>
            <Text numberOfLines={1} style={[styles.selText, { color: colors.txt }]}>
              {f.name} · {rusOf(f.name)}
            </Text>
            <Pressable onPress={() => cycle(f)} style={styles.selBtn}>
              <Feather name="x" size={16} color={colors.sub} />
            </Pressable>
          </View>
        ))
      )}
    </View>
  );

  if (isTablet) {
    return (
      <View style={[styles.sidebar, { backgroundColor: colors.menuBg }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: colors.menuTxt }]}>Выбранные</Text>
          <Pressable onPress={clear} style={[styles.sidebarClear, { backgroundColor: colors.accent }]}>
            <Text style={[styles.sidebarClearTxt, { color: colors.bg }]}>Сбросить</Text>
          </Pressable>
        </View>
        <View style={styles.sidebarScroll}>
          <Section title="Включены" data={included} />
          <Section title="Исключены" data={excluded} />
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.page }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.txt }]}>Выбранные</Text>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <Feather name="chevron-down" size={20} color={colors.sub} />
            </Pressable>
          </View>
          <View style={styles.sheetBody}>
            <Section title="Включены" data={included} />
            <Section title="Исключены" data={excluded} />
          </View>
          <View style={styles.sheetFooter}>
            <Pressable onPress={clear} style={[styles.sheetClear, { backgroundColor: colors.accent }]}>
              <Text style={[styles.sheetClearTxt, { color: colors.bg }]}>Сбросить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TagsScreen() {
  const { colors } = useTheme();
  const { filters, cycle, clear, filtersReady } = useFilterTags();
  const { width, isTablet, gridCols } = useResponsive();

  const [lens, setLens] = useState<Lens>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<"popular" | "az">("popular");
  const [showSelected, setShowSelected] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const commitSearch = useCallback(() => {
    const v = draft.trim();
    setSearch(v);
  }, [draft]);

  const filterMap = useMemo(() => {
    const m = new Map<string, "include" | "exclude">();
    filters.forEach((f) => m.set(keyOf(f), f.mode));
    return m;
  }, [filters]);
  const getMode = useCallback((t: TagEntry) => filterMap.get(keyOf(t)), [filterMap]);

  const data = useMemo(() => {
    if (!filtersReady) return [] as TagEntry[];
    const base: TagEntry[] =
      lens === "all"
        ? [
            ...PRE_SORTED.tags,
            ...PRE_SORTED.artists,
            ...PRE_SORTED.characters,
            ...PRE_SORTED.parodies,
            ...PRE_SORTED.groups,
          ]
        : PRE_SORTED[lens];
    const needle = search.toLowerCase();
    const match = (t: TagEntry) => {
      if (!needle) return true;
      const en = t.name.toLowerCase();
      const ru = rusOf(t.name).toLowerCase();
      return en.includes(needle) || ru.includes(needle);
    };
    const filtered = base.filter(match);
    if (sort === "az") return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return [...filtered].sort((a, b) => b.count - a.count);
  }, [lens, search, sort, filtersReady]);

  const onToggleTag = useCallback((t: TagEntry) => cycle(t), [cycle]);

  const renderItem: ListRenderItem<TagEntry> = ({ item }) => (
    <TagChip tag={item} mode={getMode(item)} onToggle={() => onToggleTag(item)} />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.body}>
        {isTablet && <SelectedPanel visible={false} onClose={() => {}} isTablet />}
        <View style={[styles.gridWrap, { width: isTablet ? width - 320 : width }]}>
          <View style={styles.header}>
            <View style={[styles.searchBox, { backgroundColor: colors.searchBg }]}>
              <Feather name="search" size={16} color={colors.searchTxt} />
              <TextInput
                ref={inputRef}
                placeholder="Найти тег (EN/RU)…"
                placeholderTextColor={colors.sub}
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={() => {
                  commitSearch();
                  inputRef.current?.blur();
                }}
                onBlur={commitSearch}
                style={[styles.searchInput, { color: colors.txt }]}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                blurOnSubmit
              />
              {draft.length > 0 && (
                <Pressable
                  onPress={() => {
                    setDraft("");
                    setSearch("");
                  }}
                  style={styles.clearSearchBtn}
                >
                  <Feather name="x" size={16} color={colors.sub} />
                </Pressable>
              )}
            </View>

            <View style={styles.lensesRow}>
              {LENSES.map((l) => {
                const active = lens === l.key;
                return (
                  <Pressable
                    key={l.key}
                    onPress={() => setLens(l.key)}
                    style={[
                      styles.lensChip,
                      {
                        backgroundColor: active ? colors.incBg : colors.tagBg,
                        borderColor: active ? colors.incTxt : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lensChipTxt,
                        { color: active ? colors.incTxt : colors.tagText },
                      ]}
                    >
                      {l.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.sortBar, { backgroundColor: colors.menuBg }]}>
              <Pressable
                onPress={() => setSort("popular")}
                style={[styles.sortBtn, sort === "popular" && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.sortBtnTxt, { color: sort === "popular" ? colors.bg : colors.menuTxt }]}>
                  Популярные
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSort("az")}
                style={[styles.sortBtn, sort === "az" && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.sortBtnTxt, { color: sort === "az" ? colors.bg : colors.menuTxt }]}>
                  A–Z
                </Text>
              </Pressable>
              {!isTablet && (
                <Pressable onPress={() => setShowSelected(true)} style={[styles.selectedBtn, { borderColor: colors.accent }]}>
                  <Feather name="list" size={16} color={colors.accent} />
                  <Text style={[styles.selectedBtnTxt, { color: colors.accent }]}>
                    Выбранные ({filters.length})
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {filtersReady && (
            <FlashList
              data={data}
              keyExtractor={(t) => t.id}
              numColumns={gridCols}
              renderItem={renderItem}
              estimatedItemSize={72}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
              extraData={getMode}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>

      {!isTablet && (
        <SelectedPanel visible={showSelected} onClose={() => setShowSelected(false)} isTablet={false} />
      )}

      <Pressable onPress={clear} style={[styles.fabClear, { backgroundColor: colors.accent }]}>
        <Feather name="refresh-ccw" size={18} color={colors.bg} />
        <Text style={[styles.fabClearTxt, { color: colors.bg }]}>Сбросить</Text>
      </Pressable>
    </View>
  );
}

const GAP = 8;

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 320,
    borderRightWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sidebarTitle: { fontSize: 16, fontWeight: "700" },
  sidebarClear: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sidebarClearTxt: { fontSize: 12, fontWeight: "700" },
  sidebarScroll: { flex: 1 },
  selSection: { marginTop: 12 },
  selTitle: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  selEmpty: { fontSize: 12, opacity: 0.8 },
  selRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginBottom: 6,
  },
  selText: { flex: 1, fontSize: 13, fontWeight: "500" },
  selBtn: { padding: 6, marginLeft: 8 },
  gridWrap: { flex: 1, paddingHorizontal: 12 },
  gridContent: { paddingBottom: 80 },
  header: { paddingTop: 8, paddingBottom: 4 },
  searchBox: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  clearSearchBtn: { padding: 4 },
  lensesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  lensChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  lensChipTxt: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  sortBar: {
    marginTop: 10,
    borderRadius: 12,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sortBtnTxt: { fontSize: 12, fontWeight: "700" },
  selectedBtn: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedBtnTxt: { fontSize: 12, fontWeight: "700" },
  chip: {
    flex: 1,
    minHeight: 64,
    margin: GAP / 2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipIcon: { width: 22, alignItems: "center" },
  chipTextWrap: { flex: 1 },
  chipTitle: { fontSize: 13, fontWeight: "700" },
  chipSub: { fontSize: 12, opacity: 0.9 },
  chipCount: { fontSize: 12, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700" },
  sheetClose: { padding: 6 },
  sheetBody: { paddingBottom: 8 },
  sheetFooter: { flexDirection: "row", justifyContent: "flex-end" },
  sheetClear: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  sheetClearTxt: { fontSize: 12, fontWeight: "700" },
  fabClear: {
    position: "absolute",
    right: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    elevation: 4,
  },
  fabClearTxt: { fontSize: 12, fontWeight: "800" },
});
