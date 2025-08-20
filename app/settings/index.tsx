import Slider from "@react-native-community/slider";
import * as NavigationBar from "expo-navigation-bar";
import { setStatusBarHidden } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import GridSection from "@/components/settings/GridSection";
import SettingsBuilder from "@/components/settings/SettingsBuilder";
import SettingsLayout from "@/components/settings/SettingsLayout";

import { FS_KEY, RH_KEY, STORAGE_KEY_HUE } from "@/components/settings/keys";
import type { SettingsSection } from "@/components/settings/schema";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useTheme } from "@/lib/ThemeContext";
import { useI18n } from "@/lib/i18n/I18nContext";

import Section from "@/components/settings/Section";
import StorageManager from "@/components/settings/StorageManager";
import LanguageRow from "@/components/settings/rows/LanguageRow";
import { GridProfile } from "@/config/gridConfig";

function systemProfileForDims(w: number, h: number): GridProfile {
  const isLandscape = w > h;
  const isTablet = Math.min(w, h) >= 600;
  if (isTablet && isLandscape) return "tabletLandscape";
  if (isTablet && !isLandscape) return "tabletPortrait";
  if (!isTablet && isLandscape) return "phoneLandscape";
  return "phonePortrait";
}

export default function SettingsScreen() {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const sysProfile = systemProfileForDims(width, height);
  const [activeProfile, setActiveProfile] = useState<GridProfile>(sysProfile);

  const { hue, setHue, colors } = useTheme();
  const [hueLocal, setHueLocal] = usePersistedState<number>(
    STORAGE_KEY_HUE,
    hue
  );
  const [fullscreen, setFullscreen] = usePersistedState<boolean>(FS_KEY, false);
  const [hideHints, setHideHints] = usePersistedState<boolean>(RH_KEY, false);

  const toggleFullscreen = async (value: boolean) => {
    setFullscreen(value);
    try {
      (globalThis as any).__setFullscreen?.(value);
    } catch {}
    try {
      setStatusBarHidden(value, "fade");
    } catch {}
    if (Platform.OS === "android") {
      try {
        if (value) {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setButtonStyleAsync("light");
        } else {
          await NavigationBar.setVisibilityAsync("visible");
          await NavigationBar.setButtonStyleAsync("light");
        }
      } catch (e) {
        console.warn("[settings] expo-navigation-bar failed:", e);
      }
    }
  };

  const sections: SettingsSection[] = useMemo(
    () => [
      {
        id: "language",
        title: t("settings.section.language"),
        cards: [
          {
            id: "language-card",
            items: [
              {
                id: "language-row",
                kind: "custom",
                render: () => <LanguageRow />,
              },
            ],
          },
        ],
      },
      {
        id: "appearance",
        title: t("settings.section.appearance"),
        cards: [
          {
            id: "theme-card",
            items: [
              {
                id: "hue-slider",
                kind: "custom",
                render: () => (
                  <>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.txt,
                      }}
                    >
                      {t("settings.appearance.theme")}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: colors.sub, marginTop: 8 }}
                    >
                      {t("settings.appearance.hue", {
                        deg: Math.round(hueLocal),
                      })}
                    </Text>
                    <Slider
                      style={{ marginTop: 8 }}
                      minimumValue={0}
                      maximumValue={360}
                      step={1}
                      value={hueLocal}
                      minimumTrackTintColor={colors.accent}
                      thumbTintColor={colors.accent}
                      onValueChange={(deg) => setHueLocal(deg)}
                      onSlidingComplete={(deg) => setHue(deg)}
                    />
                  </>
                ),
              },
            ],
          },
        ],
      },
      {
        id: "screen",
        title: t("settings.section.display"),
        cards: [
          {
            id: "screen-card",
            items: [
              {
                id: "fullscreen",
                kind: "toggle",
                title: t("settings.display.fullscreen"),
                description: t("settings.display.fullscreenDesc"),
                value: fullscreen,
                onToggle: toggleFullscreen,
              },
              {
                id: "android-note",
                kind: "custom",
                render: () => (
                  <View
                    style={{
                      marginTop: 12,
                      borderRadius: 10,
                      borderWidth: StyleSheet.hairlineWidth,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderColor: colors.page,
                      backgroundColor: colors.bg,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: colors.sub }}>
                      {t("settings.display.androidNote")}
                    </Text>
                  </View>
                ),
              },
            ],
          },
        ],
      },
      {
        id: "reader",
        title: t("settings.section.reader"),
        cards: [
          {
            id: "reader-card",
            items: [
              {
                id: "hide-hints",
                kind: "toggle",
                title: t("settings.reader.hideHints"),
                description: t("settings.reader.hideHintsDesc"),
                value: hideHints,
                onToggle: (v) => {
                  setHideHints(v);
                  try {
                    (globalThis as any).__setReaderHideHints?.(v);
                  } catch {}
                },
              },
            ],
          },
        ],
      },
    ],
    [colors, fullscreen, hideHints, hueLocal, t]
  );

  return (
    <SettingsLayout title={t("settings.title")}>
      <SettingsBuilder sections={sections} />

      <Section title={t("settings.section.grid")} />
      <GridSection
        activeProfile={activeProfile}
        setActiveProfile={setActiveProfile}
      />

      <Section title={t("settings.section.storage")} />
      <StorageManager />
    </SettingsLayout>
  );
}
