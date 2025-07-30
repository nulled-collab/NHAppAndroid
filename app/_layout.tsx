import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Drawer } from "react-native-drawer-layout";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { DrawerContext } from "@/components/DrawerContext";
import { SearchBar } from "@/components/SearchBar";
import SideMenu from "@/components/SideMenu";
import { hsbToHex } from "@/constants/Colors";
import { SortProvider } from "@/context/SortContext";
import { TagProvider } from "@/context/TagFilterContext";

export default function RootLayout() {
  const bgColor = hsbToHex({ saturation: 76, brightness: 30 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const hideSearchBar = pathname === "/read";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
        <Drawer
          open={drawerOpen}
          onOpen={() => setDrawerOpen(true)}
          onClose={() => setDrawerOpen(false)}
          drawerPosition="left"
          drawerStyle={{ width: 260 }}
          renderDrawerContent={() => (
            <SideMenu closeDrawer={() => setDrawerOpen(false)} />
          )}
        >
          <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
            <SortProvider>
              <TagProvider>
                {/* Поисковая строка book/[id] не показывать <SearchBar /> */}
                {!hideSearchBar && <SearchBar />}
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: bgColor },
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="favorites" />
                  <Stack.Screen name="search" />
                  <Stack.Screen name="book/[id]" />
                  <Stack.Screen name="read" />
                  <Stack.Screen name="downloaded" />
                  <Stack.Screen name="recommendations" />
                  <Stack.Screen name="tags" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" backgroundColor={bgColor} />
              </TagProvider>
            </SortProvider>
          </DrawerContext.Provider>
        </Drawer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}