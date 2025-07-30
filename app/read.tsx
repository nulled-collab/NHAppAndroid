import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import _ImageZoom from "react-native-image-pan-zoom";
import PagerView from "react-native-pager-view";

import { BookPage, getBook, loadBookFromLocal } from "@/api/nhentai";
import { hsbToHex } from "@/constants/Colors";

const ImageZoom = _ImageZoom as any;
const bg = hsbToHex({ saturation: 76, brightness: 30 });

export default function ReadScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const router = useRouter();

  // refs & state
  const pager = useRef<PagerView>(null);
  const lastVol = useRef<number | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [isZoomed, setZoom] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // dimensions & orientation
  const { width: W, height: H } = useWindowDimensions();
  const isPortrait = H >= W;
  const pageOrientation: "vertical" | "horizontal" = isPortrait
    ? "vertical"
    : "horizontal";

  // load pages
  useEffect(() => {
    (async () => {
      const localBook = await loadBookFromLocal(Number(id));
      if (localBook) {
        setUrls(localBook.pages.map((p: BookPage) => p.url));
        return;
      }
      try {
        const fetched = await getBook(Number(id));
        setUrls(fetched.pages.map((p: BookPage) => p.url));
      } catch {
        router.back();
      }
    })();
  }, [id]);

  // set initial page once
  useEffect(() => {
    if (!urls.length) return;
    const initial = Math.max(0, (parseInt(page ?? "1") || 1) - 1);
    setIdx(initial);
    setTimeout(() => {
      pager.current?.setPage(initial);
    }, 0);
  }, [urls]);

  // restore on orientation change
  useEffect(() => {
    if (urls.length) {
      pager.current?.setPage(idx);
    }
  }, [W, H, urls.length]);

  // volume buttons navigation (Android only)
  useEffect(() => {
    if (Platform.OS !== "android") return;

    let removeListener: () => void;
    try {
      const SystemSetting = require("react-native-system-setting");
      removeListener = SystemSetting.addVolumeListener(({ value }: { value: number }) => {
        if (isZoomed) return;
        if (lastVol.current == null) {
          lastVol.current = value;
          return;
        }
        const direction = value > lastVol.current ? "prev" : "next";
        lastVol.current = value;
        jump(direction);
      });
    } catch {
      console.warn("[ReadScreen] react-native-system-setting not available");
    }

    return () => {
      if (removeListener) removeListener();
      lastVol.current = null;
    };
  }, [isZoomed, idx, urls.length, isNavigating]);

  // smooth jump
  const jump = useCallback(
    (direction: "prev" | "next") => {
      if (isNavigating) return;
      setIsNavigating(true);
      const nextIdx = direction === "next" ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < urls.length) {
        pager.current?.setPage(nextIdx);
        setIdx(nextIdx);
      }
      setTimeout(() => setIsNavigating(false), 300);
    },
    [idx, urls.length, isNavigating]
  );

  // on page selected
  const onSel = useCallback(
    (e: any) => {
      setIdx(e.nativeEvent.position);
      setZoom(false);
      setIsNavigating(false);
    },
    []
  );

  // tap zones
  const TapZones = () =>
    !isZoomed && (
      <>
        <Pressable
          style={[StyleSheet.absoluteFillObject, { width: W * 0.5 }]}
          onPress={() => jump("prev")}
        />
        <Pressable
          style={[
            StyleSheet.absoluteFillObject,
            { left: W * 0.5, width: W * 0.5 },
          ]}
          onPress={() => jump("next")}
        />
      </>
    );

  if (!urls.length) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        orientation={pageOrientation}
        initialPage={idx}
        onPageSelected={onSel}
        scrollEnabled={!isZoomed}
      >
        {urls.map((u, i) => (
          <View key={i} style={{ width: W, height: H, backgroundColor: bg }}>
            <ImageZoom
              cropWidth={W}
              cropHeight={H}
              imageWidth={W}
              imageHeight={H}
              minScale={1}
              enableCenterFocus={false}
              enableDoubleClickZoom
              pinchToZoom
              panToMove={isZoomed}
              onMove={({ scale }: { scale?: number }) =>
                setZoom(Boolean(scale && scale > 1.01))
              }
            >
              <ExpoImage
                source={{ uri: u }}
                style={{ width: W, height: H }}
                contentFit="contain"
                cachePolicy="disk"
              />
            </ImageZoom>
            <TapZones />
          </View>
        ))}
      </PagerView>

      <View style={styles.counterWrap} pointerEvents="none">
        <Text style={styles.counterTxt}>
          {idx + 1} / {urls.length}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  counterWrap: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  counterTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
