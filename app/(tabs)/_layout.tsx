// app/_layout.tsx  (замени целиком или внеси те же правки)

import { TagProvider } from "@/context/TagFilterContext"; // ← НОВОЕ
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HapticTab } from "@/components/HapticTab";
import SearchBar from "@/components/SearchBar";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    /* 1. провайдер должен оборачивать все вкладки */
    <TagProvider>
      <SafeAreaProvider>
        <SearchBar />

        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            tabBarStyle: Platform.select({
              ios: { position: "absolute" },
              default: {},
            }),
          }}
        >
          {/* 2. все Screen'ы — ВНУТРИ <Tabs> --------------------------------- */}
          <Tabs.Screen
            name="index"
            options={{
              title: "New",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="clock.fill" size={28} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="popular"
            options={{
              title: "Popular",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="flame.fill" size={28} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="explore"
            options={{
              title: "Explore",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="magnifyingglass" size={28} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="favorites"
            options={{
              title: "Favorites",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="heart.fill" size={28} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="recommendations"
            options={{
              title: "For You",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="sparkles" size={28} color={color} />
              ),
            }}
          />

          {/* ← ВОТ СЮДА переносим вкладку Tags */}
          <Tabs.Screen
            name="tags"
            options={{
              title: "Tags",
              tabBarIcon: ({ color }) => (
                <IconSymbol name="tag.slash" size={28} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaProvider>
    </TagProvider>
  );
}
