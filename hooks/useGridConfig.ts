// hooks/useGridConfig.ts
import type { GridConfig } from "@/components/BookList";
import {
  getCurrentGridConfigMapSync,
  subscribeGridConfig,
} from "@/config/gridConfig";
import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

export function useGridConfig(): GridConfig {
  const { width, height } = useWindowDimensions();
  const [map, setMap] = useState(getCurrentGridConfigMapSync());

  useEffect(() => {
    const unsub = subscribeGridConfig(setMap);
    return () => unsub();
  }, []);

  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  if (isTablet && isLandscape) return map.tabletLandscape;
  if (isTablet && !isLandscape) return map.tabletPortrait;
  if (!isTablet && isLandscape) return map.phoneLandscape;
  return map.phonePortrait;
}
