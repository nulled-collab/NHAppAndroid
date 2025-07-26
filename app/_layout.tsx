// _layout.tsx
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import "react-native-reanimated";

import { Colors } from "@/constants/Colors";
import { SortProvider } from "@/context/SortContext";
import { TagProvider } from "@/context/TagFilterContext";
import { useColorScheme } from "@/hooks/useColorScheme";

// Create custom themes
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background.hex, // e.g., "#1C1733"
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background.hex, // e.g., "#1C1733"
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <SortProvider>
      <TagProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: Colors[colorScheme ?? "light"].background.hex, // Root background
            }}
          >
            <Stack
              screenOptions={{
                contentStyle: {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].background.hex, // Match root background
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="read" options={{ headerShown: false }} />
              <Stack.Screen name="explore" options={{ headerShown: false }} />
              <Stack.Screen name="tags" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar
              style="auto"
              backgroundColor={Colors[colorScheme ?? "light"].background.hex}
            />
          </View>
        </ThemeProvider>
      </TagProvider>
    </SortProvider>
  );
}
