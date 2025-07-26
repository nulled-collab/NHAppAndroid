/* app/read.tsx
   – счётчик «страница / всего» внизу по центру
   – свайп по всему экрану, двухпальцевый pinch-zoom, minScale = 1
*/

import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import _ImageZoom from "react-native-image-pan-zoom";
import PagerView from "react-native-pager-view";

import { getBook } from "@/api/nhentai";
import { buildPageSources } from "@/components/buildPageSources";
import { hsbToHex } from "@/constants/Colors";

const { width: W, height: H } = Dimensions.get("window");
const bg = hsbToHex({ saturation: 76, brightness: 25 });
const ImageZoom = _ImageZoom as any;

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
  const [idx, setIdx] = useState(startIndex); // ← current page

  /* ─── load ─── */
  useEffect(() => {
    getBook(Number(id))
      .then((b) => setUrls(b.pages.map((p) => p.url)))
      .catch(() => router.back());
  }, [id]);

  /* jump to initial */
  useEffect(() => {
    if (urls.length && startIndex < urls.length) {
      pager.current?.setPageWithoutAnimation(startIndex);
      setIdx(startIndex);
    }
  }, [urls, startIndex]);

  /* ─── helpers ─── */
  const jump = (n: number) => {
    const next = Math.max(0, Math.min(urls.length - 1, n));
    pager.current?.setPageWithoutAnimation(next);
    setIdx(next);
  };

  const onSel = (e: NativeSyntheticEvent<{ position: number }>) => {
    setIdx(e.nativeEvent.position);
    setZoom(false);
  };

  /* ─── volume ± ─── */
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
        const dir = ev.value > lastVol.current ? -1 : 1;
        lastVol.current = ev.value;
        jump(idx + dir);
      });
    } catch {
      console.log("[read] volume listener unavailable (Expo Go)");
    }
    return () => off?.();
  }, [idx, isZoomed, urls]);

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

  /* ─── UI ─── */
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar hidden />
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        orientation="vertical"
        initialPage={startIndex}
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
              enableDoubleClickZoom={false}
              pinchToZoom
              panToMove={isZoomed}
              onMove={({ scale }: { scale?: number }) =>
                setZoom(scale ? scale > 1.01 : false)
              }
            >
              <ExpoImage
                source={buildPageSources(u)}
                style={{ width: W, height: H }}
                contentFit="contain"
                cachePolicy="disk"
              />
            </ImageZoom>
            <TapZones />
          </View>
        ))}
      </PagerView>

      {/* ─── page counter ─── */}
      <View style={styles.counterWrap}>
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
  counterTxt: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
