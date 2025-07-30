import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type MenuRoute = "/downloaded" | "/favorites" | "/recommendations" | "/tags";

const MENU: { label: string; icon: string; route: MenuRoute }[] = [
  { label: "Скачанные галереи", icon: "download", route: "/downloaded" },
  { label: "Избранные галереи", icon: "heart", route: "/favorites" },
  { label: "Рекомендации", icon: "star", route: "/recommendations" },
];

export default function SideMenu({ closeDrawer }: { closeDrawer: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.menuContainer}>
      <Text style={styles.logo}>n</Text>
      <Text style={styles.title}>NHAppAndroid</Text>
      <Text style={styles.subtitle}>Неофициальный клиент NHentai</Text>
      <View style={{ marginVertical: 12 }} />
      {MENU.map((item) => (
        <Pressable
          key={item.route}
          style={styles.menuItem}
          onPress={() => {
            closeDrawer();
            setTimeout(() => router.push(item.route), 250);
          }}
        >
          <Feather
            name={item.icon as any}
            size={20}
            color="#fff"
            style={{ width: 28 }}
          />
          <Text style={styles.menuText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: "#23202b",
    padding: 18,
  },
  logo: { fontSize: 44, color: "#fff", fontWeight: "900", marginBottom: 8 },
  title: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  subtitle: { fontSize: 13, color: "#aaa" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  menuText: { fontSize: 15, color: "#fff", marginLeft: 8 },
});
