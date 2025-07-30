import type { GridConfig } from "@/components/BookList";
import { gridConfigMap } from "@/config/gridConfig";
import { useWindowDimensions } from "react-native";

export function useGridConfig(): GridConfig {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = Math.min(width, height) >= 600;

  if (isTablet && isLandscape) return gridConfigMap.tabletLandscape;
  if (isTablet && !isLandscape) return gridConfigMap.tabletPortrait;
  if (!isTablet && isLandscape) return gridConfigMap.phoneLandscape;
  return gridConfigMap.phonePortrait;
}
