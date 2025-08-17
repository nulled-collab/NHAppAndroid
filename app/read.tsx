import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
  GestureResponderEvent,
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

/* ========= Типы/ключи ========= */

type Orientation = "vertical" | "horizontal";
type FitMode = "contain" | "cover";

const PROGRESS_KEY = (id: number) => `readProgress_${id}`; // прогресс на книгу
const HINTS_STATE_KEY = (id: number) => `reader_hints_state_${id}`; // поштучные подсказки на книгу
const RH_KEY = "reader_hide_hints"; // глобал «прятать подсказки»

// Глобальные последние выбранные пользователем (распространяются на все книги)
const G_ORIENT = "reader_last_orient"; // "vertical" | "horizontal"
const G_DUAL = "reader_last_dual"; // "1" | "0"
const G_FIT = "reader_last_fit"; // "contain" | "cover"
const G_TAP = "reader_last_tap"; // "1" | "0"
const G_HAND = "reader_last_hand"; // "1" | "0"  ← «смена пальцев»
const G_INSPECT = "reader_last_inspect"; // "1" | "0"

type ReaderSettings = {
  orientation: Orientation;
  dualInLandscape: boolean;
  fit: FitMode;
};

type HintsState = { left: boolean; center: boolean; right: boolean };

/* ========= helpers ========= */

const getBool = (v: string | null | undefined, def = false) =>
  v == null ? def : v === "1";
const saveBool = (k: string, v: boolean) => {
  AsyncStorage.setItem(k, v ? "1" : "0").catch(() => {});
};
const saveStr = (k: string, v: string) => {
  AsyncStorage.setItem(k, v).catch(() => {});
};

/* ========= Экран ========= */

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
  const guardSetPageRef = useRef<number | null>(null); // защищаемся от «скачка в 0»
  const lastVol = useRef<number | null>(null);

  const [urls, setUrls] = useState<string[]>([]);
  const [uiVisible, setUI] = useState(true);
  const [ready, setReady] = useState(false); // гидрация prefs + книга

  // поведение/настройки (глобально-персистентные)
  const [tapFlipEnabled, setTapFlip] = useState(true);
  const [handSwap, setHandSwap] = useState(false); // влияет ТОЛЬКО на направление навигации
  const [inspect, setInspect] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>({
    orientation: isLandscape ? "horizontal" : "vertical",
    dualInLandscape: true,
    fit: "contain",
  });

  // подсказки
  const [hideHints, setHideHints] = useState(false);
  const [hints, setHints] = useState<HintsState>({
    left: true,
    center: true,
    right: true,
  });

  // позиция
  const [frameIdx, setFrameIdx] = useState(0);
  const absIndexRef = useRef(0);

  /* ===== Баннер статуса ===== */
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

  /* ===== Загрузка книги + ГЛОБАЛЬНЫХ предпочтений (атомарно) ===== */
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
          AsyncStorage.getItem(HINTS_STATE_KEY(bookId)),
        ]);

        const bookPromise = (async () => {
          const local = await loadBookFromLocal(bookId);
          if (local) return local;
          return await getBook(bookId);
        })();

        const [[gOrient, gDual, gFit, gTap, gHand, gInsp, hh, hintsRaw], book] =
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
        if (hintsRaw) {
          try {
            setHints({
              left: true,
              center: true,
              right: true,
              ...JSON.parse(hintsRaw),
            });
          } catch {}
        }

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

  // живой канал из settings.tsx для RH_KEY
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

  /* ===== Автосохранение ГЛОБАЛЬНЫХ предпочтений ===== */
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
  useEffect(() => {
    AsyncStorage.setItem(HINTS_STATE_KEY(bookId), JSON.stringify(hints)).catch(
      () => {}
    );
  }, [bookId, hints]);

  /* ===== Фреймы ===== */
  const isLandscapeNow = isLandscape; // для читаемости
  const canDual = isLandscapeNow && isTablet && urls.length >= 2;
  const useDualNow = settings.dualInLandscape && canDual;

  // ВАЖНО: порядок страниц в двойном развороте НЕ меняем при handSwap
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

  /* ===== Инициализация позиции (после готовности frames) ===== */
  useEffect(() => {
    if (!ready || !frames.length) return;
    (async () => {
      const pFromRoute = Math.max(1, parseInt(pageParam ?? "0") || 0);
      let initialAbs = pFromRoute ? pFromRoute - 1 : 0;
      if (!pFromRoute) {
        const saved = await AsyncStorage.getItem(PROGRESS_KEY(bookId));
        if (saved)
          initialAbs = Math.max(
            0,
            Math.min(urls.length - 1, parseInt(saved, 10))
          );
      }
      absIndexRef.current = initialAbs;
      const idx = useDualNow ? Math.floor(initialAbs / 2) : initialAbs;
      setFrameIdx(idx);
      guardSetPageRef.current = idx;
      setTimeout(() => pager.current?.setPage(idx), 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, frames.length]);

  /* ===== Восстановление при повороте/смене dual (без сброса в 0) ===== */
  useEffect(() => {
    if (!ready || !frames.length) return;
    const idx = useDualNow
      ? Math.floor(absIndexRef.current / 2)
      : absIndexRef.current;
    setFrameIdx(idx);
    guardSetPageRef.current = idx;
    setTimeout(() => pager.current?.setPage(idx), 0);
  }, [ready, W, H, useDualNow, settings.orientation, frames.length]);

  /* ===== Прогресс ===== */
  const totalPages = urls.length;
  const currentPages = frames[frameIdx] ?? [0];
  const firstAbsPage = currentPages.length ? Math.min(...currentPages) : 0;
  const isSingleFrame = (frames[frameIdx]?.length ?? 1) === 1;

  useEffect(() => {
    if (!totalPages) return;
    absIndexRef.current = firstAbsPage;
    AsyncStorage.setItem(PROGRESS_KEY(bookId), String(firstAbsPage)).catch(
      () => {}
    );
  }, [bookId, firstAbsPage, totalPages]);

  // предзагрузка соседей
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

  /* ===== Навигация ===== */

  const jumpFrame = useCallback(
    (next: number) => {
      if (next >= 0 && next < frames.length) {
        setFrameIdx(next);
        guardSetPageRef.current = next;
        pager.current?.setPage(next);
      }
    },
    [frames.length]
  );

  const jumpPrev = () => jumpFrame(frameIdx - 1);
  const jumpNext = () => jumpFrame(frameIdx + 1);

  // «Смена пальцев» теперь всегда инвертирует направление (и на телефоне, и на планшете, в любой ориентации)
  const navDir = (dir: "prev" | "next") => {
    if (handSwap) return dir === "prev" ? "next" : "prev";
    return dir;
  };

  // скрыть все подсказки одной функцией
  const hideAllHints = useCallback(() => {
    setHints({ left: false, center: false, right: false });
  }, []);

  const onTapZone = (side: "left" | "center" | "right") => {
    // при любом тапе — сразу скрываем ВСЕ подсказки
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
  };

  /* ===== Галерея/Скраббер ===== */
  const THUMB_H = 64,
    THUMB_GAP = 12;
  const thumbListRef = useRef<FlatList<string>>(null);
  const [railH, setRailH] = useState(1);
  const padCenter = Math.max(0, (railH - THUMB_H) / 2);

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
    if (uiVisible && !isPhone) scrollThumbsTo(firstAbsPage);
  }, [firstAbsPage, uiVisible, isPhone, scrollThumbsTo]);

  const goToAbs = (abs: number) => {
    const targetAbs = Math.max(0, Math.min(totalPages - 1, abs));
    const targetFrame = useDualNow ? Math.floor(targetAbs / 2) : targetAbs;
    jumpFrame(targetFrame);
  };

  // скраббер (телефон)
  const [scrubW, setScrubW] = useState(W);
  const onScrub = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / scrubW));
    const targetAbs = Math.round((totalPages - 1) * ratio);
    goToAbs(targetAbs);
  };

  /* ===== Громкость (Android) — тоже учитываем «смену пальцев» ===== */
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
          const desired: "prev" | "next" = goingUp ? "prev" : "next";
          const real = navDir(desired);
          if (real === "prev") jumpPrev();
          else jumpNext();
        }
      );
    } catch {}
    return () => remove?.();
  }, [inspect, navDir]);

  /* ===== Рендер ===== */
  if (!ready) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  if (!urls.length) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  // отступ под нижнюю панель/скраббер на телефонах
  const PHONE_UI_BOTTOM_INSET = 8 + 28 + 8;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        orientation={settings.orientation}
        initialPage={frameIdx}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          if (
            guardSetPageRef.current !== null &&
            pos !== guardSetPageRef.current
          )
            return;
          guardSetPageRef.current = null;

          setFrameIdx(pos);
          const abs = Math.min(...(frames[pos] ?? [0]));
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
            </View>
          );
        })}
      </PagerView>

      {/* ===== TAP overlay — ВНЕ PagerView ===== */}
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFillObject, { zIndex: 12 }]}
      >
        <Pressable
          onPress={() => onTapZone("left")}
          android_ripple={{ color: colors.accent + "22" }}
          style={[
            styles.tapZone,
            {
              left: 0,
              width: "30%",
              top: 0,
              bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
            },
          ]}
        />
        <Pressable
          onPress={() => onTapZone("center")}
          android_ripple={{ color: colors.accent + "22" }}
          style={[
            styles.tapZone,
            {
              left: "30%",
              width: "40%",
              top: 0,
              bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
            },
          ]}
        />
        <Pressable
          onPress={() => onTapZone("right")}
          android_ripple={{ color: colors.accent + "22" }}
          style={[
            styles.tapZone,
            {
              right: 0,
              width: "30%",
              top: 0,
              bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
            },
          ]}
        />
      </View>

      {/* ===== Подсказки зон — ВНЕ PagerView, исчезают при первом тапе ===== */}
      {!hideHints && (hints.left || hints.center || hints.right) && (
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, { zIndex: 11 }]}
        >
          {hints.left && (
            <Pressable
              onPress={() => setHints((s) => ({ ...s, left: false }))}
              style={[
                styles.hintBox,
                {
                  left: 0,
                  width: "30%",
                  top: 0,
                  bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
                  backgroundColor: colors.searchBg + "e6",
                  borderColor: colors.page,
                },
              ]}
            >
              <Text style={[styles.hintText, { color: colors.searchTxt }]}>
                {!handSwap ? "Нажми тут — Назад" : "Нажми тут — Вперёд"}
              </Text>
            </Pressable>
          )}
          {hints.center && (
            <Pressable
              onPress={() => setHints((s) => ({ ...s, center: false }))}
              style={[
                styles.hintBox,
                {
                  left: "30%",
                  width: "40%",
                  top: 0,
                  bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
                  backgroundColor: colors.searchBg + "e6",
                  borderColor: colors.accent,
                  zIndex: 1022,
                },
              ]}
            >
              <Text style={[styles.hintText, { color: colors.searchTxt }]}>
                Нажми тут — Панель
              </Text>
            </Pressable>
          )}
          {hints.right && (
            <Pressable
              onPress={() => setHints((s) => ({ ...s, right: false }))}
              style={[
                styles.hintBox,
                {
                  right: 0,
                  width: "30%",
                  top: 0,
                  bottom: isPhone && uiVisible ? PHONE_UI_BOTTOM_INSET : 0,
                  backgroundColor: colors.searchBg + "e6",
                  borderColor: colors.page,
                },
              ]}
            >
              <Text style={[styles.hintText, { color: colors.searchTxt }]}>
                {!handSwap ? "Нажми тут — Вперёд" : "Нажми тут — Назад"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ===== панели ===== */}
      {/* планшет: верхняя слева */}
      {uiVisible && !isPhone && (
        <View
          style={[
            styles.topLeftBar,
            { backgroundColor: colors.searchBg, borderColor: colors.page },
          ]}
        >
          <IconBtn
            onPress={() => router.back()}
            name="corner-up-left"
            color={colors.searchTxt}
          />
          <IconBtn
            onPress={jumpPrev}
            name="chevron-left"
            color={colors.searchTxt}
          />
          <IconBtn
            onPress={jumpNext}
            name="chevron-right"
            color={colors.searchTxt}
          />
          <View style={[styles.divider, { backgroundColor: colors.page }]} />
          <ToggleBtn
            active={tapFlipEnabled}
            onToggle={() => {
              const nv = !tapFlipEnabled;
              setTapFlip(nv);
              saveBool(G_TAP, nv);
              showBanner(`Тап-листалка: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
            }}
            name="loader"
            activeColor={colors.accent}
            color={colors.searchTxt}
          />
          <ToggleBtn
            active={handSwap}
            onToggle={() => {
              const nv = !handSwap;
              setHandSwap(nv);
              saveBool(G_HAND, nv);
              showBanner(`Смена пальцев: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
            }}
            name="repeat"
            activeColor={colors.accent}
            color={colors.searchTxt}
          />
          <IconBtn
            onPress={() => {
              const nv: Orientation =
                settings.orientation === "vertical" ? "horizontal" : "vertical";
              setSettings((s) => ({ ...s, orientation: nv }));
              saveStr(G_ORIENT, nv);
              showBanner(
                `Ориентация: ${nv === "vertical" ? "Вертикаль" : "Горизонталь"}`
              );
            }}
            name={
              settings.orientation === "vertical" ? "arrow-down" : "arrow-right"
            }
            color={colors.searchTxt}
          />
          {canDual && (
            <ToggleBtn
              active={settings.dualInLandscape}
              onToggle={() => {
                const nv = !settings.dualInLandscape;
                setSettings((s) => ({ ...s, dualInLandscape: nv }));
                saveBool(G_DUAL, nv);
                showBanner(`Двойная страница: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
              }}
              name="layout"
              activeColor={colors.accent}
              color={colors.searchTxt}
            />
          )}
          <IconBtn
            onPress={() => {
              const nv: FitMode =
                settings.fit === "contain" ? "cover" : "contain";
              setSettings((s) => ({ ...s, fit: nv }));
              saveStr(G_FIT, nv);
              showBanner(
                `Режим: ${nv === "contain" ? "Подогнать" : "Заполнить"}`
              );
            }}
            name={settings.fit === "contain" ? "maximize" : "minimize"}
            color={colors.searchTxt}
          />
          {isSingleFrame && (
            <ToggleBtn
              active={inspect}
              onToggle={() => {
                const nv = !inspect;
                setInspect(nv);
                saveBool(G_INSPECT, nv);
                showBanner(`Осмотр: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
              }}
              name="search"
              activeColor={colors.accent}
              color={colors.searchTxt}
            />
          )}
        </View>
      )}

      {/* телефон: широкая нижняя панель */}
      {uiVisible && isPhone && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: colors.searchBg, borderColor: colors.page },
          ]}
        >
          <RowBtn
            onPress={() => router.back()}
            icon="corner-up-left"
            label="Назад"
            color={colors.searchTxt}
          />
          <RowBtn
            onPress={jumpPrev}
            icon="chevron-left"
            label="Назад"
            color={colors.searchTxt}
          />
          <RowBtn
            onPress={jumpNext}
            icon="chevron-right"
            label="Вперёд"
            color={colors.searchTxt}
          />
          <RowToggle
            active={tapFlipEnabled}
            onToggle={() => {
              const nv = !tapFlipEnabled;
              setTapFlip(nv);
              saveBool(G_TAP, nv);
              showBanner(`Тап-листалка: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
            }}
            icon="loader"
            label="Тап"
            color={colors.searchTxt}
            activeColor={colors.accent}
          />
          <RowToggle
            active={handSwap}
            onToggle={() => {
              const nv = !handSwap;
              setHandSwap(nv);
              saveBool(G_HAND, nv);
              showBanner(`Пальцы: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
            }}
            icon="repeat"
            label="Пальцы"
            color={colors.searchTxt}
            activeColor={colors.accent}
          />
          <RowBtn
            onPress={() => {
              const nv: Orientation =
                settings.orientation === "vertical" ? "horizontal" : "vertical";
              setSettings((s) => ({ ...s, orientation: nv }));
              saveStr(G_ORIENT, nv);
              showBanner(`Ориентация: ${nv === "vertical" ? "Верт" : "Гориз"}`);
            }}
            icon={
              settings.orientation === "vertical" ? "arrow-down" : "arrow-right"
            }
            label="Ориент."
            color={colors.searchTxt}
          />
          {canDual && (
            <RowToggle
              active={settings.dualInLandscape}
              onToggle={() => {
                const nv = !settings.dualInLandscape;
                setSettings((s) => ({ ...s, dualInLandscape: nv }));
                saveBool(G_DUAL, nv);
                showBanner(`Двойная: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
              }}
              icon="layout"
              label="Двойная"
              color={colors.searchTxt}
              activeColor={colors.accent}
            />
          )}
          <RowBtn
            onPress={() => {
              const nv: FitMode =
                settings.fit === "contain" ? "cover" : "contain";
              setSettings((s) => ({ ...s, fit: nv }));
              saveStr(G_FIT, nv);
              showBanner(nv === "contain" ? "Подогнать" : "Заполнить");
            }}
            icon={settings.fit === "contain" ? "maximize" : "minimize"}
            label={settings.fit === "contain" ? "Подогн." : "Заполн."}
            color={colors.searchTxt}
          />
          {isSingleFrame && (
            <RowToggle
              active={inspect}
              onToggle={() => {
                const nv = !inspect;
                setInspect(nv);
                saveBool(G_INSPECT, nv);
                showBanner(`Осмотр: ${nv ? "ВКЛ" : "ВЫКЛ"}`);
              }}
              icon="search"
              label="Осмотр"
              color={colors.searchTxt}
              activeColor={colors.accent}
            />
          )}
        </View>
      )}

      {/* Баннер статуса — по центру */}
      {banner && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.banner,
            { backgroundColor: colors.searchBg, borderColor: colors.page },
            bannerStyle,
          ]}
        >
          <Text
            style={{ color: colors.searchTxt, fontWeight: "800", fontSize: 12 }}
          >
            {banner}
          </Text>
        </Animated.View>
      )}

      {/* Планшет: правая галерея */}
      {uiVisible && !isPhone && (
        <View
          style={[
            styles.thumbRailWrap,
            { backgroundColor: colors.searchBg, borderColor: colors.page },
          ]}
          onLayout={(e) => setRailH(e.nativeEvent.layout.height)}
        >
          <FlatList
            ref={thumbListRef}
            data={urls}
            keyExtractor={(_, i) => String(i)}
            showsVerticalScrollIndicator={false}
            snapToInterval={THUMB_H + THUMB_GAP}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingTop: padCenter,
              paddingBottom: padCenter,
              paddingHorizontal: 6,
            }}
            renderItem={({ item, index }) => {
              const selected =
                index === firstAbsPage ||
                (useDualNow && frames[frameIdx]?.includes(index));
              return (
                <View
                  style={{
                    height: THUMB_H,
                    marginBottom: THUMB_GAP,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Pressable
                    onPress={() => goToAbs(index)}
                    style={{ borderRadius: 12, overflow: "hidden" }}
                    android_ripple={{ color: colors.accent + "22" }}
                  >
                    <ExpoImage
                      source={{ uri: item }}
                      style={{
                        width: 52,
                        height: THUMB_H,
                        borderRadius: 12,
                        opacity: selected ? 1 : 0.85,
                      }}
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    {selected && (
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderWidth: 2,
                          borderColor: colors.accent,
                          borderRadius: 12,
                        }}
                      />
                    )}
                  </Pressable>
                </View>
              );
            }}
            getItemLayout={(_, index) => ({
              length: THUMB_H + THUMB_GAP,
              offset: (THUMB_H + THUMB_GAP) * index,
              index,
            })}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[colors.searchBg, "transparent"]}
            style={styles.fadeTop}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", colors.searchBg]}
            style={styles.fadeBottom}
          />
          <Text style={[styles.railCounter, { color: colors.searchTxt }]}>
            {firstAbsPage + 1} / {totalPages}
          </Text>
        </View>
      )}

      {/* Телефон: нижний скраббер */}
      {uiVisible && isPhone && (
        <View
          style={[
            styles.bottomScrubber,
            { backgroundColor: colors.searchBg, borderColor: colors.page },
          ]}
          onLayout={(e) => setScrubW(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onScrub}
          onResponderMove={onScrub}
        >
          <View style={[styles.scrubTrack, { backgroundColor: colors.page }]} />
          <View
            style={[
              styles.scrubFill,
              {
                backgroundColor: colors.accent,
                width: `${((firstAbsPage + 1) / totalPages) * 100}%`,
              },
            ]}
          />
          <Text style={[styles.scrubLabel, { color: colors.searchTxt }]}>
            {firstAbsPage + 1} / {totalPages}
          </Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

/* ========= Кнопки ========= */
function IconBtn({
  onPress,
  name,
  color,
}: {
  onPress: () => void;
  name: any;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.iconBtn}
      android_ripple={{ color: "#ffffff22" }}
    >
      <Feather name={name} size={18} color={color} />
    </Pressable>
  );
}
function ToggleBtn({
  active,
  onToggle,
  name,
  activeColor,
  color,
}: {
  active: boolean;
  onToggle: () => void;
  name: any;
  activeColor: string;
  color: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.iconBtn,
        active && { backgroundColor: activeColor + "12" },
      ]}
      android_ripple={{ color: activeColor + "22" }}
    >
      <Feather name={name} size={18} color={active ? activeColor : color} />
    </Pressable>
  );
}
function RowBtn({
  onPress,
  icon,
  label,
  color,
}: {
  onPress: () => void;
  icon: any;
  label: string;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.rowBtn}
      android_ripple={{ color: "#ffffff22" }}
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}
function RowToggle({
  active,
  onToggle,
  icon,
  label,
  color,
  activeColor,
}: {
  active: boolean;
  onToggle: () => void;
  icon: any;
  label: string;
  color: string;
  activeColor: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.rowBtn, active && { backgroundColor: activeColor + "12" }]}
      android_ripple={{ color: activeColor + "22" }}
    >
      <Feather name={icon} size={18} color={active ? activeColor : color} />
      <Text
        style={[
          styles.rowLabel,
          { color: active ? activeColor : color, fontWeight: "800" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ========= Inspect ========= */
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
          { zIndex: 10, justifyContent: "center", alignItems: "center" },
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

/* ========= Стили ========= */
const styles = StyleSheet.create({
  tapZone: { position: "absolute" }, // top/bottom/width задаём inline

  topLeftBar: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 20,
  },
  iconBtn: { padding: 8, borderRadius: 10, overflow: "hidden" },
  divider: { width: 1, height: 18, opacity: 0.5, marginHorizontal: 2 },

  bottomBar: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8 + 28 + 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    zIndex: 19,
  },
  rowBtn: {
    height: 40,
    minWidth: 60,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  rowLabel: { fontSize: 10, fontWeight: "700" },

  banner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
    alignItems: "center",
  },

  hintBox: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10,
  },
  hintText: { fontSize: 11, fontWeight: "800" },

  thumbRailWrap: {
    position: "absolute",
    right: 8,
    top: "12%",
    height: "76%",
    width: 56 + 12 + 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    overflow: "hidden",
    zIndex: 15,
  },
  fadeTop: { position: "absolute", top: 0, left: 0, right: 0, height: 36 },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  railCounter: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
  },

  bottomScrubber: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 18,
  },
  scrubTrack: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 6,
    borderRadius: 3,
  },
  scrubFill: { position: "absolute", left: 10, height: 6, borderRadius: 3 },
  scrubLabel: { position: "absolute", top: 6, fontSize: 11, fontWeight: "700" },
});
