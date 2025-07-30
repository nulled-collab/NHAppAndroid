import { Tag } from "@/api/nhentai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const KEY = "globalTagFilter";

export type TagMode = "include" | "exclude";
export interface FilterItem {
  type: Tag["type"];
  name: string;
  mode: TagMode;
}

interface Ctx {
  filters: FilterItem[];
  cycle: (t: { type: string; name: string }) => void;
  clear: () => void;
  includes: FilterItem[];
  excludes: FilterItem[];
  filtersReady: boolean;
}

const TagCtx = createContext<Ctx>({
  filters: [],
  cycle: () => {},
  clear: () => {},
  includes: [],
  excludes: [],
  filtersReady: false,
});

export function useFilterTags() {
  return useContext(TagCtx);
}

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [filtersReady, setFiltersReady] = useState(false);

  /* Pre-compute includes and excludes to avoid filtering on every render */
  const includes = useMemo(() => filters.filter(f => f.mode === "include"), [filters]);
  const excludes = useMemo(() => filters.filter(f => f.mode === "exclude"), [filters]);

  /* Load filters from AsyncStorage */
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((j) => j && setFilters(JSON.parse(j)))
      .finally(() => setFiltersReady(true));
  }, []);

  /* Save filters to AsyncStorage */
  useEffect(() => {
    if (filtersReady) {
      AsyncStorage.setItem(KEY, JSON.stringify(filters));
    }
  }, [filters, filtersReady]);

  /* Optimized cycle function */
  const cycle = useCallback((t: { type: string; name: string }) => {
    setFilters((prev) => {
      const idx = prev.findIndex(x => x.type === t.type && x.name === t.name);
      if (idx === -1) {
        return [...prev, { ...t, mode: "include" }];
      }
      const item = prev[idx];
      if (item.mode === "include") {
        return prev.map((x, i) => (i === idx ? { ...x, mode: "exclude" } : x));
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const clear = useCallback(() => setFilters([]), []);

  return (
    <TagCtx.Provider
      value={{
        filters,
        cycle,
        clear,
        includes,
        excludes,
        filtersReady,
      }}
    >
      {children}
    </TagCtx.Provider>
  );
}