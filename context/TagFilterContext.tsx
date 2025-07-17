import { Tag } from "@/api/nhentai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const KEY = "globalTagFilter";

export type TagMode = "include" | "exclude";        // + / –
export interface FilterItem {
  type: Tag["type"];
  name: string;
  mode: TagMode;
}

interface Ctx {
  filters: FilterItem[];               // оба режима
  cycle:   (t: { type: string; name: string }) => void; // neutral → include → exclude → neutral
  clear:   () => void;
  includes: FilterItem[];
  excludes: FilterItem[];
}

const TagCtx = createContext<Ctx>({
  filters: [],
  cycle:   () => {},
  clear:   () => {},
  includes: [],
  excludes: [],
});

export function useFilterTags() {
  return useContext(TagCtx);
}

export function TagProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterItem[]>([]);

  /* --- storage I/O ---------------------------------------------------- */
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((j) => j && setFilters(JSON.parse(j)));
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(filters));
  }, [filters]);

  /* --- cycle helper --------------------------------------------------- */
  const cycle = (t: { type: string; name: string }) =>
    setFilters((prev) => {
      const idx = prev.findIndex(
        (x) => x.type === t.type && x.name === t.name,
      );
      if (idx === -1) {
        // neutral → include
        return [...prev, { ...t, mode: "include" }];
      }
      const item = prev[idx];
      if (item.mode === "include") {
        // include → exclude
        return prev.map((x, i) =>
          i === idx ? { ...x, mode: "exclude" } : x,
        );
      }
      // exclude → neutral (remove)
      return prev.filter((_, i) => i !== idx);
    });

  const clear = () => setFilters([]);

  return (
    <TagCtx.Provider
      value={{
        filters,
        cycle,
        clear,
        includes: filters.filter((f) => f.mode === "include"),
        excludes: filters.filter((f) => f.mode === "exclude"),
      }}
    >
      {children}
    </TagCtx.Provider>
  );
}
