import { Feather } from "@expo/vector-icons";
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
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import PagerView from "react-native-pager-view";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { BookPage, getBook, loadBookFromLocal } from "@/api/nhentai";
import { useTheme } from "@/lib/ThemeContext";

type Orientation = "vertical" | "horizontal";
type FitMode = "contain" | "cover";

const PROGRESS_KEY = (id: number) => `readProgress_${id}`;
const SETTINGS_KEY = (id: number) => `readerSettings_${id}`;
const INSPECT_KEY = (id: number) => `inspectPref_${id}`;
const RH_KEY = "reader_hide_hints";

type ReaderSettings = {
  orientation: Orientation;
  dualInLandscape: boolean;
  rtl: boolean;
  fit: FitMode;
};

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

  const pager = useRef<PagerView>(null);
  const lastVol = useRef<number | null>(null);

  const [urls, setUrls] = useState<string[]>([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [uiVisible, setUI] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [hintLeft, setHintLeft] = useState(true);
  const [hintRight, setHintRight] = useState(true);
  const [hintTop, setHintTop] = useState(true);
  const [hideHints, setHideHints] = useState(false);

  const [settings, setSettings] = useState<ReaderSettings>({
    orientation: isLandscape ? "horizontal" : "vertical",
    dualInLandscape: true,
    rtl: false,
    fit: "contain",
  });

  useEffect(() => {
    (async () => {
      try {
        const sRaw = await AsyncStorage.getItem(SETTINGS_KEY(bookId));
        if (sRaw) setSettings((prev) => ({ ...prev, ...JSON.parse(sRaw) }));
        const inspectRaw = await AsyncStorage.getItem(INSPECT_KEY(bookId));
        if (inspectRaw != null) setInspect(inspectRaw === "1");
        const hh = await AsyncStorage.getItem(RH_KEY);
        setHideHints(hh === "1");
        const local = await loadBookFromLocal(bookId);
        if (local) {
          setUrls(local.pages.map((p: BookPage) => p.url));
          return;
        }
        const fetched = await getBook(bookId);
        setUrls(fetched.pages.map((p: BookPage) => p.url));
      } catch {
        router.back();
      }
    })();
  }, [bookId]);

  useEffect(() => {
    AsyncStorage.setItem(SETTINGS_KEY(bookId), JSON.stringify(settings));
  }, [bookId, settings]);

  useEffect(() => {
    AsyncStorage.setItem(INSPECT_KEY(bookId), inspect ? "1" : "0");
  }, [bookId, inspect]);

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

  const canDual = isLandscape && (isTablet || W >= 800) && urls.length >= 2;
  const useDualNow = settings.dualInLandscape && canDual;

  const frames: number[][] = useMemo(() => {
    if (!urls.length) return [];
    if (!useDualNow) return urls.map((_, i) => [i]);
    const out: number[][] = [];
    for (let i = 0; i < urls.length; i += 2) {
      const a = i;
      const b = i + 1;
      if (b < urls.length) out.push(settings.rtl ? [b, a] : [a, b]);
      else out.push([a]);
    }
    return out;
  }, [urls, useDualNow, settings.rtl]);

  useEffect(() => {
    if (!frames.length) return;
    (async () => {
      const pFromRoute = Math.max(1, parseInt(pageParam ?? "0") || 0);
      let initialPageIndex = pFromRoute ? pFromRoute - 1 : 0;
      if (!pFromRoute) {
        const saved = await AsyncStorage.getItem(PROGRESS_KEY(bookId));
        if (saved) {
          const n = Math.max(0, Math.min(urls.length - 1, parseInt(saved, 10)));
          initialPageIndex = n;
        }
      }
      const idx = useDualNow
        ? Math.floor(initialPageIndex / 2)
        : initialPageIndex;
      setFrameIdx(idx);
      setTimeout(() => pager.current?.setPage(idx), 0);
    })();
  }, [frames.length, useDualNow, pageParam, bookId, urls.length]);

  useEffect(() => {
    if (frames.length) pager.current?.setPage(frameIdx);
  }, [W, H, frames.length]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let remove: () => void;
    try {
      const SystemSetting = require("react-native-system-setting");
      remove = SystemSetting.addVolumeListener(
        ({ value }: { value: number }) => {
          if (inspect) return;
          if (lastVol.current == null) {
            lastVol.current = value;
            return;
          }
          const goingUp = value > lastVol.current;
          lastVol.current = value;
          jump(goingUp ? "prev" : "next");
        }
      );
    } catch {
      console.warn("[ReadScreen] react-native-system-setting not available");
    }
    return () => remove?.();
  }, [inspect, frameIdx, frames.length, isNavigating]);

  const totalPages = urls.length;
  const currentPages = frames[frameIdx] ?? [0];
  const firstAbsPage = currentPages.length ? Math.min(...currentPages) : 0;
  const isSingleFrame = (frames[frameIdx]?.length ?? 1) === 1;

  useEffect(() => {
    if (!totalPages) return;
    AsyncStorage.setItem(PROGRESS_KEY(bookId), String(firstAbsPage));
  }, [bookId, firstAbsPage, totalPages]);

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

  const navDir = (dir: "prev" | "next") => {
    if (settings.orientation === "horizontal" && settings.rtl) {
      return dir === "prev" ? "next" : "prev";
    }
    return dir;
  };

  const jump = useCallback(
    (dir: "prev" | "next") => {
      if (inspect) return;
      if (isNavigating) return;
      setIsNavigating(true);
      const d = navDir(dir);
      const next = d === "next" ? frameIdx + 1 : frameIdx - 1;
      if (next >= 0 && next < frames.length) {
        pager.current?.setPage(next);
        setFrameIdx(next);
      }
      setTimeout(() => setIsNavigating(false), 260);
    },
    [
      inspect,
      frameIdx,
      frames.length,
      isNavigating,
      settings.orientation,
      settings.rtl,
    ]
  );

  const topBand = Math.min(120, Math.max(80, H * 0.18));

  const TapZones = () => {
    return (
      <>
        {!inspect && (
          <>
            <Pressable
              style={[
                StyleSheet.absoluteFillObject,
                { width: W * 0.33, top: topBand, height: H - topBand },
              ]}
              onPress={() => {
                setHintLeft(false);
                jump("prev");
              }}
            />
            <Pressable
              style={[
                StyleSheet.absoluteFillObject,
                {
                  left: W * 0.67,
                  width: W * 0.33,
                  top: topBand,
                  height: H - topBand,
                },
              ]}
              onPress={() => {
                setHintRight(false);
                jump("next");
              }}
            />
          </>
        )}
        <Pressable
          style={[
            StyleSheet.absoluteFillObject,
            { left: 0, right: 0, top: 0, height: topBand },
          ]}
          onPress={() => {
            setHintTop(false);
            setUI((s) => !s);
          }}
        />
      </>
    );
  };

  const TapHints = () =>
    !inspect && !hideHints ? (
      <>
        {hintLeft && (
          <View
            pointerEvents="none"
            style={[
              styles.hintBox,
              { left: 0, width: W * 0.33, top: topBand, height: H - topBand },
            ]}
          >
            <Text style={styles.hintText}>Назад</Text>
          </View>
        )}
        {hintRight && (
          <View
            pointerEvents="none"
            style={[
              styles.hintBox,
              {
                left: W * 0.67,
                width: W * 0.33,
                top: topBand,
                height: H - topBand,
              },
            ]}
          >
            <Text style={styles.hintText}>Вперёд</Text>
          </View>
        )}
        {hintTop && (
          <View
            pointerEvents="none"
            style={[
              styles.hintBox,
              { left: 0, right: 0, top: 0, height: topBand },
            ]}
          >
            <Text style={styles.hintText}>Панели: показать/скрыть</Text>
          </View>
        )}
      </>
    ) : null;

  if (!urls.length) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const pageOrientation: Orientation = settings.orientation;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        orientation={pageOrientation}
        initialPage={frameIdx}
        onPageSelected={(e) => {
          setFrameIdx(e.nativeEvent.position);
          setIsNavigating(false);
        }}
        scrollEnabled={!inspect}
      >
        {frames.map((group, i) => {
          const dual = group.length === 2;
          const rtlRow = settings.rtl ? "row-reverse" : "row";
          const singleUri = !dual ? urls[group[0]] : undefined;

          return (
            <View
              key={i}
              style={{ width: W, height: H, backgroundColor: colors.bg }}
            >
              {inspect && !dual ? (
                <InspectCanvas
                  uri={singleUri!}
                  width={W}
                  height={H}
                  onExit={() => setInspect(false)}
                />
              ) : dual ? (
                <View
                  style={{
                    flex: 1,
                    flexDirection: rtlRow as any,
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
                        borderLeftWidth: k === 1 ? StyleSheet.hairlineWidth : 0,
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

              <TapZones />
              <TapHints />
            </View>
          );
        })}
      </PagerView>

      {uiVisible && (
        <Pressable
          onPress={() => setUI(false)}
          style={styles.topBar}
          android_ripple={{ color: "#ffffff22" }}
        >
          <Pressable
            onPress={() => {
              setUI(false);
              router.back();
            }}
            style={styles.iconBtn}
            android_ripple={{ color: "#ffffff22" }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>

          <Text style={styles.topTitle} numberOfLines={1}>
            #{bookId} —{" "}
            {useDualNow
              ? `${Math.min(...currentPages) + 1}-${
                  Math.max(...currentPages) + 1
                }`
              : `${firstAbsPage + 1}`}{" "}
            / {totalPages}
          </Text>

          <View style={styles.iconBtn} />
        </Pressable>
      )}

      {uiVisible && (
        <Pressable
          onPress={() => setUI(false)}
          style={styles.bottomBar}
          android_ripple={{ color: "#ffffff22" }}
        >
          <Pressable
            style={styles.progressWrap}
            onPress={(e) => {
              const x = (e.nativeEvent as any).locationX as number;
              const w = Dimensions.get("window").width;
              const ratio = Math.max(0, Math.min(1, x / w));
              const targetPage = Math.round((totalPages - 1) * ratio);
              const targetFrame = useDualNow
                ? Math.floor(targetPage / 2)
                : targetPage;
              pager.current?.setPage(targetFrame);
              setFrameIdx(targetFrame);
              setUI(false);
            }}
          >
            <View style={styles.progressBg} />
            <View
              style={[
                styles.progressFg,
                { width: `${((firstAbsPage + 1) / totalPages) * 100}%` },
              ]}
            />
          </Pressable>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => {
                setSettings((s) => ({
                  ...s,
                  orientation:
                    s.orientation === "vertical" ? "horizontal" : "vertical",
                }));
                setUI(false);
              }}
              style={styles.actionBtn}
            >
              <Feather
                name={
                  settings.orientation === "vertical"
                    ? "arrow-down"
                    : "arrow-right"
                }
                size={18}
                color="#fff"
              />
              <Text style={styles.actionTxt}>
                {settings.orientation === "vertical"
                  ? "Вертикально"
                  : "Горизонтально"}
              </Text>
            </Pressable>

            {canDual && (
              <Pressable
                onPress={() => {
                  setSettings((s) => ({
                    ...s,
                    dualInLandscape: !s.dualInLandscape,
                  }));
                  setUI(false);
                }}
                style={styles.actionBtn}
              >
                <Feather
                  name="layout"
                  size={18}
                  color={settings.dualInLandscape ? "#fff" : "#ddd"}
                />
                <Text style={styles.actionTxt}>Двойная</Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setSettings((s) => ({ ...s, rtl: !s.rtl }));
                setUI(false);
              }}
              style={styles.actionBtn}
            >
              <Feather name="chevrons-right" size={18} color="#fff" />
              <Text style={styles.actionTxt}>
                {settings.rtl ? "Справа → налево" : "Слева → направо"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSettings((s) => ({
                  ...s,
                  fit: s.fit === "contain" ? "cover" : "contain",
                }));
                setUI(false);
              }}
              style={styles.actionBtn}
            >
              <Feather
                name={settings.fit === "contain" ? "maximize" : "minimize"}
                size={18}
                color="#fff"
              />
              <Text style={styles.actionTxt}>
                {settings.fit === "contain" ? "Подогнать" : "Заполнить"}
              </Text>
            </Pressable>

            {isSingleFrame && (
              <Pressable
                onPress={() => {
                  setInspect((v) => !v);
                  setUI(false);
                }}
                style={styles.actionBtn}
              >
                <Feather
                  name="search"
                  size={18}
                  color={inspect ? "#fff" : "#ddd"}
                />
                <Text style={styles.actionTxt}>
                  {inspect ? "Осмотр: Вкл" : "Осмотр"}
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      )}
    </GestureHandlerRootView>
  );
}

function InspectCanvas({
  uri,
  width,
  height,
  onExit,
}: {
  uri: string;
  width: number;
  height: number;
  onExit: () => void;
}) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const reset = () => {
    scale.value = withTiming(1, { duration: 160 });
    rotation.value = withTiming(0, { duration: 160 });
    tx.value = withTiming(0, { duration: 160 });
    ty.value = withTiming(0, { duration: 160 });
  };

  const pan = Gesture.Pan().onChange((e) => {
    tx.value += e.changeX;
    ty.value += e.changeY;
  });
  const pinch = Gesture.Pinch().onChange((e) => {
    const next = scale.value * e.scaleChange;
    scale.value = Math.max(1, next);
  });
  const rotate = Gesture.Rotation().onChange((e) => {
    rotation.value += e.rotationChange;
  });

  const composed = Gesture.Simultaneous(pan, pinch, rotate);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: `${rotation.value}rad` },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "transparent",
            zIndex: 10,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Animated.View style={[{ width, height }, style]}>
          <ExpoImage
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            cachePolicy="disk"
          />
        </Animated.View>

        <View
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            flexDirection: "row",
            gap: 8,
          }}
        >
          <Pressable
            onPress={reset}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
              Сброс
            </Text>
          </Pressable>
          <Pressable
            onPress={onExit}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              backgroundColor: "rgba(0,0,0,0.65)",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
              Выйти
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  topTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 4,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    zIndex: 20,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  actionTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
  progressWrap: { height: 8, borderRadius: 999, overflow: "hidden" },
  progressBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  progressFg: { height: 8, borderRadius: 999, backgroundColor: "#ffffff" },
  iconBtn: { padding: 8, borderRadius: 10, overflow: "hidden" },
  hintBox: {
    position: "absolute",
    borderWidth: 0,
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  hintText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
  },
});
