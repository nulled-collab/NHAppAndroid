import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    NativeSyntheticEvent,
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

/* -------------------------------------------------------------------------- */

const ImageZoom = _ImageZoom as any;
const bg = hsbToHex({ saturation: 76, brightness: 25 });

export default function ReadScreen() {
  /* ─── params ─── */
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const router = useRouter();
  const startIndex = Math.max(0, (parseInt(page ?? "1") || 1) - 1);

  /* ─── refs & state ─── */
  const pager = useRef<PagerView>(null);
  const lastVol = useRef<number | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [isZoomed, setZoom] = useState(false);
  const [idx, setIdx] = useState(startIndex); // current page

  /* ─── dynamic window size & orientation ─── */
  const { width: W, height: H } = useWindowDimensions();
  const isPortrait = H >= W;
  const pageOrientation: "vertical" | "horizontal" = isPortrait ? "vertical" : "horizontal";

  /* ─── load pages ─── */
  useEffect(() => {
    const loadPages = async () => {
      const localBook = await loadBookFromLocal(Number(id));
      if (localBook) {
        setUrls(localBook.pages.map((p: BookPage) => p.url));
        return;
      }

      try {
        const fetchedBook = await getBook(Number(id));
        setUrls(fetchedBook.pages.map((p: BookPage) => p.url));
      } catch (error) {
        console.error("API fetch failed, check offline data:", error);
        const fallbackBook = await loadBookFromLocal(Number(id));
        if (fallbackBook) setUrls(fallbackBook.pages.map((p: BookPage) => p.url));
        else router.back();
      }
    };

    loadPages();
  }, [id]);

  /* ─── jump to initial ─── */
  useEffect(() => {
    if (urls.length && startIndex < urls.length) {
      pager.current?.setPageWithoutAnimation(startIndex);
      setIdx(startIndex);
    }
  }, [urls, startIndex]);

  /* ─── helpers ─── */
  const jump = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(urls.length - 1, n));
      pager.current?.setPageWithoutAnimation(next);
      setIdx(next);
    },
    [urls.length]
  );

  const onSel = (e: NativeSyntheticEvent<{ position: number }>) => {
    setIdx(e.nativeEvent.position);
    setZoom(false);
  };

  /* ─── volume ± (Android) ─── */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let off: undefined | (() => void);
    try {
      const SS: any = require("react-native-system-setting");
      off = SS.addVolumeListener((ev: { value: number }) => {
        if (isZoomed) return;
        if (lastVol.current == null) {
          lastVol.current = ev.value;
          return;
        }
        const dir = ev.value > lastVol.current ? -1 : 1; // вверх громкость → назад
        lastVol.current = ev.value;
        jump(idx + dir);
      });
    } catch {
      console.log("[read] volume listener unavailable (Expo Go)");
    }
    return () => off?.();
  }, [idx, isZoomed, jump]);

  /* ─── tap-zones ─── */
  const TapZones = () =>
    !isZoomed && (
      <>
        <Pressable
          style={StyleSheet.absoluteFillObject as any}
          hitSlop={{ left: 0, right: W * 0.7, top: 0, bottom: 0 }}
          onPress={() => jump(idx - 1)}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject as any}
          hitSlop={{ left: W * 0.7, right: 0, top: 0, bottom: 0 }}
          onPress={() => jump(idx + 1)}
        />
      </>
    );

  if (!urls.length) return <ActivityIndicator style={{ flex: 1 }} />;

  /* ---------------------------------------------------------------------- */

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />

      <PagerView
        key={pageOrientation} /* force re-mount when orientation flips */
        ref={pager}
        style={{ flex: 1 }}
        orientation={pageOrientation}
        initialPage={startIndex}
        onPageSelected={onSel}
        scrollEnabled={!isZoomed}
      >
        {urls.map((u, i) => (
          <View key={`${i}-${W}-${H}`} style={{ width: W, height: H, backgroundColor: bg }}>
            <ImageZoom
              cropWidth={W}
              cropHeight={H}
              imageWidth={W}
              imageHeight={H}
              minScale={1}
              enableCenterFocus={false}
              enableDoubleClickZoom={false}
              pinchToZoom
              panToMove={isZoomed}
              onMove={({ scale }: { scale?: number }) => setZoom(scale ? scale > 1.01 : false)}
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

      {/* page counter */}
      <View style={styles.counterWrap} pointerEvents="none">
        <Text style={styles.counterTxt}>
          {idx + 1} / {urls.length}
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

/* ─── styles ─── */
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