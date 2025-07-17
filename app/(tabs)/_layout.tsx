import { AnimatedSearchBar } from "@/components/AnimatedSearchBar";
import { Colors } from "@/constants/Colors";
import { TagProvider } from "@/context/TagFilterContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const hideSearch = pathname.startsWith("/tags");

  return (
    <TagProvider>
      <SafeAreaProvider>
        {!hideSearch && <AnimatedSearchBar />}

        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
            tabBarShowLabel: false,
            tabBarStyle: [
              {
                height: 55,
                paddingTop: 10,
              },
              Platform.select({
                ios: { position: "absolute" },
                default: {},
              }),
            ],
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "New",
              tabBarIcon: ({ color, size }) => (
                <Feather name="clock" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="popular"
            options={{
              title: "Popular",
              tabBarIcon: ({ color, size }) => (
                <Feather name="power" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: "Explore",
              tabBarIcon: ({ color, size }) => (
                <Feather name="search" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              title: "Favorites",
              tabBarIcon: ({ color, size }) => (
                <Feather name="heart" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="recommendations"
            options={{
              title: "For You",
              tabBarIcon: ({ color, size }) => (
                <Feather name="star" color={color} size={22} />
              ),
            }}
          />
          <Tabs.Screen
            name="tags"
            options={{
              title: "Tags",
              tabBarIcon: ({ color, size }) => (
                <Feather name="tag" color={color} size={22} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaProvider>
    </TagProvider>
  );
}
