import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StatusBar as RNStatusBar, View } from "react-native";
import { Drawer } from "react-native-drawer-layout";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { DrawerContext } from "@/components/DrawerContext";
import { OverlayPortalProvider } from "@/components/OverlayPortal";
import { SearchBar } from "@/components/SearchBar";
import SideMenu from "@/components/SideMenu";
import { getGridConfigMap } from "@/config/gridConfig";
import { SortProvider } from "@/context/SortContext";
import { TagProvider } from "@/context/TagFilterContext";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";

const FS_KEY = "ui_fullscreen";

function TopChrome({ bg }: { bg: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: bg }}>
      <StatusBar translucent style="light" />
      <View style={{ height: insets.top, backgroundColor: bg }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [gridReady, setGridReady] = useState(false);
  const pathname = usePathname();
  const { colors, hue } = useTheme();

  useEffect(() => {
    (globalThis as any).__setFullscreen = (v: boolean) => setFullscreen(v);
    return () => {
      if ((globalThis as any).__setFullscreen) {
        delete (globalThis as any).__setFullscreen;
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FS_KEY);
        setFullscreen(raw === "1");
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    getGridConfigMap()
      .catch(() => {})
      .finally(() => {
        if (alive) setGridReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const hideSearchBar =
    pathname === "/read" || pathname === "/settings" || pathname === "/tags";

  const insets = useSafeAreaInsets();
  const statusH = useMemo(() => {
    if (Platform.OS === "ios") return insets.top;
    return RNStatusBar.currentHeight ?? 0;
  }, [insets.top]);

  const edges = useMemo(() => {
    if (fullscreen) return [] as const;
    return Platform.OS === "ios"
      ? (["top", "bottom"] as const)
      : (["bottom"] as const);
  }, [fullscreen]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      try {
        if (fullscreen) {
          await Promise.all([
            NavigationBar.setVisibilityAsync("hidden"),
            NavigationBar.setButtonStyleAsync("light"),
          ]);
        } else {
          await Promise.all([
            NavigationBar.setVisibilityAsync("visible"),
            NavigationBar.setButtonStyleAsync("light"),
          ]);
        }
      } catch (e) {
        console.warn("[layout] expo-navigation-bar failed:", e);
      }
    })();
  }, [fullscreen, colors.bg]);

  if (!gridReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView
        edges={edges}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <Drawer
          open={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          drawerPosition="left"
          drawerStyle={{ width: 260, backgroundColor: colors.menuBg }}
          swipeEnabled={false}
          renderDrawerContent={() => (
            <SideMenu
              closeDrawer={() => setDrawerOpen(false)}
              fullscreen={fullscreen}
            />
          )}
        >
          <DrawerContext.Provider
            value={{ openDrawer: () => setDrawerOpen(true) }}
          >
            <SortProvider>
              <TagProvider>
                <OverlayPortalProvider>
                  {!fullscreen && <TopChrome bg={colors.searchBg} />}
                  <View style={{ backgroundColor: colors.searchBg }}>
                    {!hideSearchBar && <SearchBar />}
                  </View>
                  <Stack
                    key={hue}
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.bg },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="favorites" />
                    <Stack.Screen name="explore" />
                    <Stack.Screen name="book/[id]" />
                    <Stack.Screen name="read" />
                    <Stack.Screen name="downloaded" />
                    <Stack.Screen name="recommendations" />
                    <Stack.Screen name="tags" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </OverlayPortalProvider>
              </TagProvider>
            </SortProvider>
          </DrawerContext.Provider>
        </Drawer>
      </SafeAreaView>
    </View>
  );
}
