import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { BookPage, getBook, loadBookFromLocal } from "@/api/nhentai";
import { useTheme } from "@/lib/ThemeContext";

import { useI18n } from "@/lib/i18n/I18nContext";
import { ControlsDesktop } from "../components/read/ControlsDesktop";
import { ControlsMobile } from "../components/read/ControlsMobile";
import { InspectCanvas } from "../components/read/InspectCanvas";
import { Banner, HintsOverlay } from "../components/read/Overlays";
import { BottomScrubber, ThumbRail } from "../components/read/ThumbRail";

type Orientation = "vertical" | "horizontal";
type FitMode = "contain" | "cover";

const RH_KEY = "reader_hide_hints";
const G_ORIENT = "reader_last_orient";
const G_DUAL = "reader_last_dual";
const G_FIT = "reader_last_fit";
const G_TAP = "reader_last_tap";
const G_HAND = "reader_last_hand";
const G_INSPECT = "reader_last_inspect";

export type ReadHistoryEntry = [number, number, number, number];
const READ_HISTORY_KEY = "readHistory";

type ReaderSettings = {
  orientation: Orientation;
  dualInLandscape: boolean;
  fit: FitMode;
};

type HintsState = { left: boolean; center: boolean; right: boolean };

const getBool = (v: string | null | undefined, def = false) =>
  v == null ? def : v === "1" || v.toLowerCase?.() === "true";
const saveBool = (k: string, v: boolean) => {
  AsyncStorage.setItem(k, v ? "1" : "0").catch(() => {});
};
const saveStr = (k: string, v: string) => {
  AsyncStorage.setItem(k, v).catch(() => {});
};

export async function getReadHistory(): Promise<ReadHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(READ_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReadHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

async function updateReadHistory(
  bookId: number,
  current: number,
  total: number
) {
  try {
    const arr = await getReadHistory();
    const filtered = arr.filter(([id]) => id !== bookId);
    const timestamp = Math.floor(Date.now() / 1000);
    filtered.unshift([bookId, current, total, timestamp]);
    await AsyncStorage.setItem(READ_HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("[readHistory] failed:", e);
  }
}

async function getLastProgressFromHistory(bookId: number) {
  const arr = await getReadHistory();
  const found = arr.find(([id]) => id === bookId);
  return found ? found[1] : null;
}

export default function ReadScreen() {
  const { colors } = useTheme();
  const { id: idParam, page: pageParam } = useLocalSearchParams<{
    id: string;
    page?: string;
  }>();
  const router = useRouter();
  const bookId = Number(idParam);

  const { width: W, height: H } = useWindowDimensions();
  const shortest = Math.min(W, H);
  const isTablet = shortest >= 600;
  const isLandscape = W > H;
  const isPhone = !isTablet;

  const pager = useRef<PagerView>(null);

  const lastVol = useRef<number | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [uiVisible, setUI] = useState(true);
  const [ready, setReady] = useState(false);

  const [tapFlipEnabled, setTapFlip] = useState(true);
  const [handSwap, setHandSwap] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>({
    orientation: isLandscape ? "horizontal" : "vertical",
    dualInLandscape: true,
    fit: "contain",
  });

  const [hideHints, setHideHints] = useState(false);
  const [hints, setHints] = useState<HintsState>({
    left: true,
    center: true,
    right: true,
  });

  const [frameIdx, setFrameIdx] = useState(0);
  const frameIdxRef = useRef(0);
  const absIndexRef = useRef(0);
  const { t } = useI18n();

  const didInitRef = useRef(false);

  const [banner, setBanner] = useState<string | null>(null);
  const bannerOpacity = useSharedValue(0);
  const showBanner = (msg: string) => {
    setBanner(msg);
    bannerOpacity.value = withTiming(1, { duration: 120 });
    setTimeout(() => {
      bannerOpacity.value = withTiming(0, { duration: 220 });
      setTimeout(() => setBanner(null), 240);
    }, 1100);
  };
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [
      {
        translateY: withTiming(bannerOpacity.value ? 0 : -6, { duration: 220 }),
      },
    ],
  }));

  useEffect(() => {
    didInitRef.current = false;
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefsPromise = Promise.all([
          AsyncStorage.getItem(G_ORIENT),
          AsyncStorage.getItem(G_DUAL),
          AsyncStorage.getItem(G_FIT),
          AsyncStorage.getItem(G_TAP),
          AsyncStorage.getItem(G_HAND),
          AsyncStorage.getItem(G_INSPECT),
          AsyncStorage.getItem(RH_KEY),
        ]);

        const bookPromise = (async () => {
          const local = await loadBookFromLocal(bookId);
          if (local) return local;
          return await getBook(bookId);
        })();

        const [[gOrient, gDual, gFit, gTap, gHand, gInsp, hh], book] =
          await Promise.all([prefsPromise, bookPromise]);
        if (cancelled) return;

        const nextSettings: ReaderSettings = {
          orientation:
            (gOrient as Orientation) ??
            (isLandscape ? "horizontal" : "vertical"),
          dualInLandscape: getBool(gDual, true),
          fit: (gFit as FitMode) ?? "contain",
        };
        setSettings(nextSettings);
        setTapFlip(getBool(gTap, true));
        setHandSwap(getBool(gHand, false));
        setInspect(getBool(gInsp, false));
        setHideHints(getBool(hh, false));

        setUrls(book.pages.map((p: BookPage) => p.url));
        setReady(true);
      } catch {
        router.back();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, router, isLandscape]);

  useEffect(() => {
    const handler = (v: boolean) => setHideHints(v);
    (globalThis as any).__setReaderHideHints = handler;
    return () => {
      if ((globalThis as any).__setReaderHideHints === handler) {
        try {
          delete (globalThis as any).__setReaderHideHints;
        } catch {}
      }
    };
  }, []);

  useEffect(
    () => saveStr(G_ORIENT, settings.orientation),
    [settings.orientation]
  );
  useEffect(
    () => saveBool(G_DUAL, settings.dualInLandscape),
    [settings.dualInLandscape]
  );
  useEffect(() => saveStr(G_FIT, settings.fit), [settings.fit]);
  useEffect(() => saveBool(G_TAP, tapFlipEnabled), [tapFlipEnabled]);
  useEffect(() => saveBool(G_HAND, handSwap), [handSwap]);
  useEffect(() => saveBool(G_INSPECT, inspect), [inspect]);

  const isLandscapeNow = isLandscape;
  const canDual = isLandscapeNow && isTablet && urls.length >= 2;
  const useDualNow = settings.dualInLandscape && canDual;

  const frameIdxFromAbs = useCallback(
    (abs: number) => (useDualNow ? Math.floor(abs / 2) : abs),
    [useDualNow]
  );

  const frames: number[][] = useMemo(() => {
    if (!urls.length) return [];
    if (!useDualNow) return urls.map((_, i) => [i]);
    const out: number[][] = [];
    for (let i = 0; i < urls.length; i += 2) {
      const a = i,
        b = i + 1;
      out.push(b < urls.length ? [a, b] : [a]);
    }
    return out;
  }, [urls, useDualNow]);

  useEffect(() => {
    if (!ready || !frames.length) return;
    if (didInitRef.current) return;

    (async () => {
      const pFromRoute = Math.max(1, parseInt(pageParam ?? "", 10) || 0);
      let initialAbs = 0;

      if (pFromRoute) initialAbs = pFromRoute - 1;
      else {
        const histAbs = await getLastProgressFromHistory(bookId);
        initialAbs = histAbs != null ? histAbs : 0;
      }

      initialAbs = Math.max(0, Math.min(urls.length - 1, initialAbs));
      absIndexRef.current = initialAbs;

      const idx = frameIdxFromAbs(initialAbs);
      setFrameIdx(idx);
      frameIdxRef.current = idx;

      setTimeout(() => {
        pager.current?.setPage(idx);
      }, 0);

      didInitRef.current = true;
    })();
  }, [ready, frames.length, bookId, frameIdxFromAbs, pageParam, urls.length]);

  const totalPages = urls.length;

  const visualFrameIdx = frameIdxFromAbs(absIndexRef.current);
  const currentPages = frames[visualFrameIdx] ?? [absIndexRef.current];

  const activeAbsPage = currentPages.length
    ? useDualNow
      ? Math.max(...currentPages)
      : currentPages[0]
    : 0;

  const isSingleFrame = (currentPages.length ?? 1) === 1;

  useEffect(() => {
    if (!totalPages) return;
    absIndexRef.current = Math.min(activeAbsPage, totalPages - 1);
    updateReadHistory(bookId, absIndexRef.current, totalPages);
  }, [bookId, activeAbsPage, totalPages]);

  useEffect(() => {
    const around = [
      ...(frames[frameIdx - 1] ?? []).map((i) => urls[i]),
      ...(frames[frameIdx + 1] ?? []).map((i) => urls[i]),
    ];
    around.forEach((u) => {
      try {
        (ExpoImage as any).prefetch?.(u);
      } catch {}
    });
  }, [frameIdx, frames, urls]);

  const THUMB_H = 64,
    THUMB_GAP = 12;
  const thumbListRef = useRef<FlatList<string>>(null);
  const [railH, setRailH] = useState(1);

  const scrollThumbsTo = useCallback(
    (abs: number) => {
      const offset = abs * (THUMB_H + THUMB_GAP) - (railH / 2 - THUMB_H / 2);
      thumbListRef.current?.scrollToOffset({
        offset: Math.max(0, offset),
        animated: true,
      });
    },
    [railH]
  );
  useEffect(() => {
    if (uiVisible && !isPhone) scrollThumbsTo(activeAbsPage);
  }, [activeAbsPage, uiVisible, isPhone, scrollThumbsTo]);

  const goToAbs = (abs: number) => {
    const targetAbs = Math.max(0, Math.min(totalPages - 1, abs));
    const targetFrame = frameIdxFromAbs(targetAbs);
    pager.current?.setPage(targetFrame);
  };

  const [scrubW, setScrubW] = useState(W);
  const onScrub = (x: number) => {
    const trackW = Math.max(1, scrubW - 20);
    const ratio = Math.max(0, Math.min(1, (x - 10) / trackW));
    const targetAbs = Math.round((totalPages - 1) * ratio);
    goToAbs(targetAbs);
  };

  const jumpFrame = useCallback(
    (next: number) => {
      if (next >= 0 && next < frames.length) {
        pager.current?.setPage(next);
      }
    },
    [frames.length]
  );
  const jumpPrev = () => jumpFrame(frameIdxRef.current - 1);
  const jumpNext = () => jumpFrame(frameIdxRef.current + 1);
  const navDir = (dir: "prev" | "next") =>
    handSwap ? (dir === "prev" ? "next" : "prev") : dir;

  const hideAllHints = useCallback(() => {
    setHints({ left: false, center: false, right: false });
  }, []);

  const native = Gesture.Native();
  const onTapZone = useCallback(
    (side: "left" | "center" | "right") => {
      hideAllHints();
      if (side === "center") {
        setUI((v) => !v);
        return;
      }
      if (!tapFlipEnabled) {
        setUI(true);
        return;
      }
      const desired: "prev" | "next" = side === "left" ? "prev" : "next";
      const real = navDir(desired);
      if (real === "prev") jumpPrev();
      else jumpNext();
    },
    [hideAllHints, tapFlipEnabled, navDir]
  );
  const tapAnywhere = Gesture.Tap()
    .maxDeltaX(16)
    .maxDeltaY(16)
    .shouldCancelWhenOutside(true)
    .requireExternalGestureToFail(native)
    .simultaneousWithExternalGesture(native)
    .onEnd((e, success) => {
      if (!success) return;
      const x = e.x;
      const third = W / 3;
      const side: "left" | "center" | "right" =
        x < third ? "left" : x > 2 * third ? "right" : "center";
      runOnJS(onTapZone)(side);
    })
    .enabled(!inspect);

  useEffect(() => {
    if (hideHints) return;
    if (!(hints.left || hints.center || hints.right)) return;
    const t = setTimeout(
      () => setHints({ left: false, center: false, right: false }),
      3000
    );
    return () => clearTimeout(t);
  }, [hideHints, hints.left, hints.center, hints.right]);

  if (!ready || !urls.length) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const pagerKey = `${useDualNow ? "dual" : "single"}-${settings.orientation}`;

  const setOrientation = (nv: Orientation) => {
    setSettings((s) => ({ ...s, orientation: nv }));
    saveStr(G_ORIENT, nv);
    showBanner(
      t("reader.banner.orientation", {
        mode:
          nv === "vertical"
            ? t("reader.banner.orientationVertical")
            : t("reader.banner.orientationHorizontal"),
      })
    );
  };

  const toggleDual = () => {
    const nv = !settings.dualInLandscape;
    setSettings((s) => ({ ...s, dualInLandscape: nv }));
    saveBool(G_DUAL, nv);
    showBanner(
      t("reader.banner.dual", {
        state: nv ? t("reader.banner.on") : t("reader.banner.off"),
      })
    );
  };

  const toggleFit = () => {
    const nv: FitMode = settings.fit === "contain" ? "cover" : "contain";
    setSettings((s) => ({ ...s, fit: nv }));
    saveStr(G_FIT, nv);
    showBanner(
      t("reader.banner.fit", {
        mode:
          nv === "contain"
            ? t("reader.banner.fitContain")
            : t("reader.banner.fitCover"),
      })
    );
  };

  const toggleTapFlip = () => {
    const nv = !tapFlipEnabled;
    setTapFlip(nv);
    saveBool(G_TAP, nv);
    showBanner(
      t("reader.banner.tap", {
        state: nv ? t("reader.banner.on") : t("reader.banner.off"),
      })
    );
  };

  const toggleHandSwap = () => {
    const nv = !handSwap;
    setHandSwap(nv);
    saveBool(G_HAND, nv);
    showBanner(
      t("reader.banner.hand", {
        state: nv ? t("reader.banner.on") : t("reader.banner.off"),
      })
    );
  };

  const toggleInspect = () => {
    const nv = !inspect;
    setInspect(nv);
    saveBool(G_INSPECT, nv);
    showBanner(
      t("reader.banner.inspect", {
        state: nv ? t("reader.banner.on") : t("reader.banner.off"),
      })
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={tapAnywhere}>
          <View style={{ flex: 1 }}>
            <PagerView
              key={pagerKey}
              ref={pager}
              style={{ flex: 1 }}
              orientation={settings.orientation}
              initialPage={frameIdxFromAbs(absIndexRef.current)}
              onPageSelected={(e) => {
                const pos = e.nativeEvent.position;

                setFrameIdx(pos);
                frameIdxRef.current = pos;

                const pagesAtPos = frames[pos] ?? [0];
                const abs = useDualNow
                  ? Math.max(...pagesAtPos)
                  : pagesAtPos[0];
                absIndexRef.current = abs;

                if (uiVisible && !isPhone) scrollThumbsTo(abs);
              }}
              scrollEnabled={!inspect}
            >
              {frames.map((group, i) => {
                const dual = group.length === 2;
                const singleUri = !dual ? urls[group[0]] : undefined;
                return (
                  <View
                    key={i}
                    style={{ width: W, height: H, backgroundColor: colors.bg }}
                  >
                    {inspect && !dual ? (
                      <InspectCanvas uri={singleUri!} width={W} height={H} />
                    ) : dual ? (
                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          backgroundColor: colors.bg,
                        }}
                      >
                        {group.map((absIdx, k) => (
                          <View
                            key={absIdx}
                            style={{
                              width: W / 2,
                              height: H,
                              backgroundColor: colors.bg,
                              borderLeftWidth:
                                k === 1 ? StyleSheet.hairlineWidth : 0,
                              borderColor: colors.page,
                            }}
                          >
                            <ExpoImage
                              source={{ uri: urls[absIdx] }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit={settings.fit}
                              cachePolicy="disk"
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ExpoImage
                        source={{ uri: singleUri! }}
                        style={{ width: W, height: H }}
                        contentFit={settings.fit}
                        cachePolicy="disk"
                      />
                    )}
                  </View>
                );
              })}
            </PagerView>

            <HintsOverlay
              visible={!hideHints}
              isPhone={isPhone}
              uiVisible={uiVisible}
              phoneBottomInset={8 + 128 + 8}
              colors={colors}
              hints={hints}
              handSwap={handSwap}
            />
            <Banner
              banner={banner}
              colors={colors}
              animatedStyle={bannerStyle}
            />
          </View>
        </GestureDetector>

        {uiVisible && !isPhone && (
          <ControlsDesktop
            colors={colors}
            canDual={isLandscape && isTablet && urls.length >= 2}
            settings={settings}
            setOrientation={setOrientation}
            toggleDual={toggleDual}
            toggleFit={toggleFit}
            tapFlipEnabled={tapFlipEnabled}
            toggleTapFlip={toggleTapFlip}
            handSwap={handSwap}
            toggleHandSwap={toggleHandSwap}
            inspect={inspect}
            toggleInspect={toggleInspect}
            jumpPrev={jumpPrev}
            jumpNext={jumpNext}
            onBack={() => router.back()}
            isSingleFrame={isSingleFrame}
          />
        )}

        {uiVisible && isPhone && (
          <ControlsMobile
            colors={colors}
            canDual={isLandscape && isTablet && urls.length >= 2}
            settings={settings}
            setOrientation={setOrientation}
            toggleDual={toggleDual}
            toggleFit={toggleFit}
            tapFlipEnabled={tapFlipEnabled}
            toggleTapFlip={toggleTapFlip}
            handSwap={handSwap}
            toggleHandSwap={toggleHandSwap}
            inspect={inspect}
            toggleInspect={toggleInspect}
            onBack={() => router.back()}
            isSingleFrame={isSingleFrame}
          />
        )}

        <ThumbRail
          visible={uiVisible && !isPhone}
          colors={colors}
          urls={urls}
          firstAbsPage={activeAbsPage}
          totalPages={totalPages}
          frames={frames}
          frameIdx={visualFrameIdx}
          useDualNow={useDualNow}
          goToAbs={goToAbs}
          railH={railH}
          setRailH={(h) => setRailH(h)}
          padCenter={Math.max(0, (railH - 64) / 2)}
          scrollRef={thumbListRef}
        />

        <BottomScrubber
          visible={uiVisible && isPhone}
          colors={colors}
          progressRatio={(activeAbsPage + 1) / Math.max(1, totalPages)}
          setWidth={setScrubW}
          onScrub={onScrub}
          trackWidthPx={Math.max(0, scrubW - 20)}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
