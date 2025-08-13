import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type MenuRoute =
  | "/downloaded"
  | "/favorites"
  | "/recommendations"
  | "/tags"
  | "/settings";

const MENU: { label: string; icon: string; route: MenuRoute }[] = [
  { label: "Скачанные галереи", icon: "download", route: "/downloaded" },
  { label: "Избранные галереи", icon: "heart", route: "/favorites" },
  { label: "Рекомендации", icon: "star", route: "/recommendations" },
  { label: "Теги / Фильтры", icon: "tag", route: "/tags" },
  { label: "Настройки", icon: "settings", route: "/settings" },
];

export default function SideMenu({
  closeDrawer,
  fullscreen,
}: {
  closeDrawer: () => void;
  fullscreen: boolean;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.menuContainer, { backgroundColor: colors.menuBg }]}>
      <View style={[styles.header, { marginTop: fullscreen ? 0 : 20 }]}>
        <View
          style={[
            styles.logoWrap,
            { backgroundColor: colors.accent + "22", borderRadius: 12, overflow: "hidden" },
          ]}
        >
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.menuTxt }]}>
            NHApp Android
          </Text>
          <Text style={[styles.subtitle, { color: colors.sub }]}>
            Неофициальный клиент
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { borderBottomColor: colors.page }]} />

      {MENU.map((item) => {
        const active = pathname?.startsWith(item.route);
        const bg = active ? colors.accent + "26" : "transparent";
        const txt = active ? colors.accent : colors.menuTxt;

        return (
          <Pressable
            key={item.route}
            style={[styles.menuItem, { backgroundColor: bg, borderRadius: 12 }]}
            android_ripple={{ color: colors.accent + "33", borderless: false }}
            onPress={() => {
              closeDrawer();
              router.push(item.route);
            }}
          >
            <Feather
              name={item.icon as any}
              size={20}
              color={txt}
              style={{ width: 28 }}
            />
            <Text style={[styles.menuText, { color: txt }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  logoImg: {
    width: 44,
    height: 44,
  },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 12, marginTop: 2 },
  divider: {
    height: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginVertical: 2,
  },
  menuText: { fontSize: 15, marginLeft: 8, fontWeight: "600" },
});
