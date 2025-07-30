import { GridConfig } from "@/components/BookList";

// Плотная сетка по умолчанию (всё регулируется columnGap/paddingHorizontal)
export const gridConfigMap: {
  phonePortrait: GridConfig;
  phoneLandscape: GridConfig;
  tabletPortrait: GridConfig;
  tabletLandscape: GridConfig;
  default: GridConfig;
} = {
  phonePortrait:   { numColumns: 2, paddingHorizontal: 10, columnGap: 5 },
  phoneLandscape:  { numColumns: 4, paddingHorizontal: 10, columnGap: 5 },
  tabletPortrait:  { numColumns: 4, paddingHorizontal: 10, columnGap: 5 },
  tabletLandscape: { numColumns: 4, paddingHorizontal: 10, columnGap: 5 },
  default:         { numColumns: 3, paddingHorizontal: 10, columnGap: 5 },
};
