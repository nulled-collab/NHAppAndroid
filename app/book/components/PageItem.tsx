import { Image as ExpoImage } from "expo-image";
import React, { memo } from "react";
import { Pressable, Text } from "react-native";

// единый зазор между карточками (как CSS gap)
export const GAP = 10;

export const PageItem = memo(
  function PageItem({
    page,
    itemW,
    cols,
    metaColor,
    onPress,
  }: {
    page: { page: number; url: string; width: number; height: number };
    itemW: number;
    cols: number;
    metaColor: string;
    onPress: () => void;
  }) {
    const isGrid = cols > 1;

    return (
      <Pressable
        onPress={onPress}
        style={{
          width: itemW,
          // вертикальный зазор между строками
          marginBottom: GAP,
          // симметричный горизонтальный gap: по половинке на каждую сторону
          marginHorizontal: isGrid ? GAP / 2 : 0,
        }}
      >
        <ExpoImage
          source={{ uri: page.url }}
          style={
            isGrid
              ? { width: itemW, height: itemW, borderRadius: 10 }
              : {
                  width: itemW,
                  aspectRatio: page.width / page.height,
                  borderRadius: 10,
                }
          }
          contentFit={isGrid ? "cover" : "contain"}
          cachePolicy="disk"
        />
        <Text
          style={{
            color: metaColor,
            fontSize: 12,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {page.page}
        </Text>
      </Pressable>
    );
  },
  (a, b) =>
    a.page.url === b.page.url &&
    a.page.page === b.page.page &&
    a.itemW === b.itemW &&
    a.cols === b.cols &&
    a.metaColor === b.metaColor
);

export default PageItem;
