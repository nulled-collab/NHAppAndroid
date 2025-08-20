import { getRandomBook } from "@/api/nhentai";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuRoute =
  | "/downloaded"
  | "/favorites"
  | "/history"
  | "/recommendations"
  | "/tags"
  | "/settings";

const MENU: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: MenuRoute;
}[] = [
  { label: "Скачанные", icon: "download", route: "/downloaded" },
  { label: "Избранное", icon: "heart", route: "/favorites" },
  { label: "История", icon: "clock", route: "/history" },
  { label: "Рекомендации", icon: "star", route: "/recommendations" },
  { label: "Теги / Фильтры", icon: "tag", route: "/tags" },
  { label: "Настройки", icon: "settings", route: "/settings" },
];

function Rounded({
  children,
  radius = 10,
  rippleColor,
  style,
  onPress,
  disabled,
  pressedStyle,
}: {
  children: React.ReactNode;
  radius?: number;
  rippleColor: string;
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
  pressedStyle?: any;
}) {
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden" }, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: rippleColor, borderless: false }}
        style={({ pressed }) => [
          { borderRadius: radius },
          pressed &&
            (pressedStyle ??
              Platform.select({
                android: { opacity: 0.94, transform: [{ scale: 0.99 }] },
                ios: { opacity: 0.85 },
              })),
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

export default function SideMenu({
  closeDrawer,
  fullscreen,
}: {
  closeDrawer: () => void;
  fullscreen: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [randomLoading, setRandomLoading] = React.useState(false);

  const goRandom = async () => {
    if (randomLoading) return;
    try {
      setRandomLoading(true);
      const b = await getRandomBook();
      closeDrawer();
      router.push({
        pathname: "/book/[id]",
        params: { id: String(b.id), title: b.title.pretty, random: "1" },
      });
    } finally {
      setRandomLoading(false);
    }
  };

  const R = 10;
  const PAD_V = 8;
  const PAD_H = 10;
  const ICON = 18;
  const FS = 13;
  const GAP = 8;
  const rippleItem = colors.accent + "2A";
  const rippleLucky = "#ffffff22";

  const dynamicTop = fullscreen ? 12 : Math.max(insets.top, 12);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.menuBg,
          paddingTop: dynamicTop,
          paddingHorizontal: 12,
        },
      ]}
    >
      <View style={[styles.header, { marginBottom: 6 }]}>
        <View
          style={[
            styles.logoWrap,
            { backgroundColor: colors.accent + "22", borderRadius: 9 },
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
            Unofficial
          </Text>
        </View>
      </View>

      <Rounded
        rippleColor={rippleLucky}
        radius={R}
        onPress={goRandom}
        disabled={randomLoading}
      >
        <View
          style={[
            styles.luckyBtn,
            {
              borderRadius: R,
              backgroundColor: colors.accent,
            },
          ]}
        >
          {randomLoading ? (
            <ActivityIndicator
              size="small"
              style={[styles.luckyTxt]}
              color={colors.bg}
            />
          ) : (
            <>
              <Feather
                name="shuffle"
                size={ICON}
                style={{
                  width: 22,
                  textAlign: "center",
                  marginRight: GAP - 2,
                }}
                color={colors.bg}
              />
              <Text style={[styles.luckyTxt, { color: colors.bg }]}>
                Мне повезёт
              </Text>
            </>
          )}
        </View>
      </Rounded>

      <View style={{ marginTop: 6 }}>
        {MENU.map((item) => {
          const active = pathname?.startsWith(item.route);
          const tint = active ? colors.accent : colors.menuTxt;
          const bg = active ? colors.accent + "15" : "transparent";

          return (
            <Rounded
              key={item.route}
              radius={R}
              rippleColor={rippleItem}
              onPress={() => {
                closeDrawer();
                router.push(item.route);
              }}
            >
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: bg,
                    borderRadius: R,
                    paddingVertical: PAD_V - 1,
                    paddingHorizontal: PAD_H - 2,
                  },
                ]}
              >
                {active && (
                  <View style={[styles.activeBar, { backgroundColor: tint }]} />
                )}

                <Feather
                  name={item.icon}
                  size={ICON}
                  color={tint}
                  style={{
                    width: 22,
                    textAlign: "center",
                    marginRight: GAP - 2,
                  }}
                />

                <Text
                  style={[
                    styles.itemTxt,
                    { color: tint, fontSize: FS, flexShrink: 1 },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            </Rounded>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      {/* <Text style={[styles.footer, { color: colors.sub }]}>v1.0</Text> */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center" },

  logoWrap: {
    width: 45,
    height: 45,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  logoImg: { width: 45, height: 45 },

  title: { fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { fontSize: 10, fontWeight: "700" },

  luckyBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 2,
    minHeight: 44,
    width: "100%",
  },
  luckyTxt: {
    fontSize: 12,
    width: "100%",
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    minHeight: 44,
  },
  
  activeBar: {
    width: 3,
    height: "70%",
    borderRadius: 2,
    marginRight: 8,
  },
  itemTxt: { fontWeight: "700" },

  footer: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginTop: 8,
  },
});
