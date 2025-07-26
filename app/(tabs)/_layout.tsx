import { SearchBar } from "@/components/SearchBar";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const hideSearch = pathname.startsWith("/tags");

  return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: Colors[colorScheme ?? "light"].background.hex,
          }}
        >
          {!hideSearch && <SearchBar />}
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
              tabBarShowLabel: false,
              tabBarStyle: [
                {
                  height: 55,
                  paddingTop: 10,
                  backgroundColor: Colors[colorScheme ?? "light"].background.hex,
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
                  <Feather name="home" color={color} size={22} />
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
        </View>
      </SafeAreaProvider>
  );
}