// components/SideMenu.tsx
import {
  hasNativeCookieJar,
  loadTokens,
  LOGIN_URL,
  logout,
  setManualTokens,
  syncNativeCookiesFromJar,
} from "@/api/auth";
import { getRandomBook } from "@/api/nhentai";
import { getMe, Me } from "@/api/nhentaiOnline";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type MenuRoute =
  | "/downloaded"
  | "/favorites"
  | "/favoritesOnline"
  | "/history"
  | "/recommendations"
  | "/tags"
  | "/settings";

const MENU: {
  labelKey: string;
  icon: keyof typeof Feather.glyphMap;
  route: MenuRoute;
}[] = [
  { labelKey: "menu.downloaded", icon: "download", route: "/downloaded" },
  { labelKey: "menu.favorites", icon: "heart", route: "/favorites" },
  { labelKey: "menu.favoritesOnline", icon: "heart", route: "/favoritesOnline" },
  { labelKey: "menu.history", icon: "clock", route: "/history" },
  { labelKey: "menu.recommendations", icon: "star", route: "/recommendations" },
  { labelKey: "menu.tags", icon: "tag", route: "/tags" },
  { labelKey: "menu.settings", icon: "settings", route: "/settings" },
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
        android_ripple={!disabled ? { color: rippleColor, borderless: false } : undefined}
        style={({ pressed }) => [
          { borderRadius: radius },
          pressed &&
            !disabled &&
            (pressedStyle ??
              (Platform.select({
                android: { opacity: 0.94, transform: [{ scale: 0.99 }] },
                ios: { opacity: 0.85 },
              }) as any)),
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
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [randomLoading, setRandomLoading] = React.useState(false);

  // ---- Login UI state ----
  const [loginVisible, setLoginVisible] = React.useState(false);
  const [wvBusy, setWvBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [tokens, setTokens] = React.useState<{ csrftoken?: string; sessionid?: string }>({});
  const [me, setMe] = React.useState<Me | null>(null);

  // manual inputs
  const [csrfInput, setCsrfInput] = React.useState("");
  const [sessInput, setSessInput] = React.useState("");

  const webRef = React.useRef<WebView>(null);
  const canUseNativeJar = hasNativeCookieJar();
  const isExpoGo = Constants.appOwnership === "expo";

  React.useEffect(() => {
    (async () => {
      const tks = await loadTokens();
      setTokens(tks);
      setCsrfInput(tks.csrftoken ?? "");
      setSessInput(tks.sessionid ?? "");
      try {
        const m = await getMe();
        if (m) setMe(m);
      } catch {}
    })();
  }, []);

  const fetchMeAndMaybeClose = React.useCallback(
    async (why: string) => {
      try {
        const m = await getMe();
        if (m) {
          setMe(m);
          setStatus(`signed in as ${m.username} (${why})`);
          setLoginVisible(false);
        } else {
          setStatus(`not signed yet (${why})`);
        }
      } catch {
        setStatus(`not signed yet (${why})`);
      }
    },
    []
  );

  const refreshTokensFromJar = React.useCallback(
    async (reason: string) => {
      if (!canUseNativeJar) return;
      try {
        const synced = await syncNativeCookiesFromJar();
        setTokens(synced);
        if (synced.csrftoken) setCsrfInput(synced.csrftoken);
        if (synced.sessionid) setSessInput(synced.sessionid);
        setStatus(`cookies synced (${reason})`);
        await fetchMeAndMaybeClose("cookies");
      } catch (e) {
        setStatus(`cookies sync failed (${reason})`);
        console.log("[auth] sync error:", e);
      }
    },
    [canUseNativeJar, fetchMeAndMaybeClose]
  );

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

  // ---- WebView instrumentation ----
  const injected = `
    (function () {
      function getCookieMap() {
        var out = {};
        try {
          (document.cookie || "").split(";").forEach(function (p) {
            var kv = p.split("=");
            if (!kv[0]) return;
            var k = kv[0].trim();
            var v = (kv[1] || "").trim();
            if (k === "csrftoken" || k === "sessionid") out[k] = v;
          });
        } catch (e) {}
        return out;
      }
      var last = "";
      function tick() {
        try {
          var raw = document.cookie || "";
          if (raw !== last) {
            last = raw;
            var m = getCookieMap();
            if (m.csrftoken || m.sessionid) {
              window.ReactNativeWebView &&
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({ type: "cookies", cookies: m, href: location.href })
                );
            }
          }
        } catch (e) {}
        setTimeout(tick, 700);
      }
      tick();
      document.addEventListener("DOMContentLoaded", function () {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "log", msg: "domready" }));
        } catch (e) {}
      });
    })();
    true;
  `;

  const onWvMessage = React.useCallback(
    async (ev: any) => {
      try {
        const data = JSON.parse(ev?.nativeEvent?.data);
        if (data?.type === "log") {
          console.log("[WebView]", data.msg);
          return;
        }
        if (data?.type === "cookies") {
          const cookies = data.cookies || {};
          const csrf = typeof cookies.csrftoken === "string" ? cookies.csrftoken : undefined;

          if (csrf) {
            await setManualTokens(csrf, undefined);
            const now = await loadTokens();
            setTokens(now);
            setCsrfInput(now.csrftoken ?? "");
          }

          if (canUseNativeJar) {
            await refreshTokensFromJar("wv-msg");
          } else {
            await fetchMeAndMaybeClose("webview");
          }
        } else {
          console.log("[WebView message]", data);
        }
      } catch (e) {
        console.log("[WebView raw msg]", ev?.nativeEvent?.data);
      }
    },
    [canUseNativeJar, refreshTokensFromJar, fetchMeAndMaybeClose]
  );

  const handleNavChange = React.useCallback(
    (navState: any) => {
      console.log("[Login][nav]", navState.url);
      setStatus("navigating…");
      if (canUseNativeJar) refreshTokensFromJar("nav");
    },
    [canUseNativeJar, refreshTokensFromJar]
  );

  const applyManual = React.useCallback(
    async (nextCsrf: string, nextSess: string) => {
      await setManualTokens(nextCsrf?.trim() || undefined, nextSess?.trim() || undefined);
      const curr = await loadTokens();
      setTokens(curr);
      setStatus("tokens saved (manual)");
      await fetchMeAndMaybeClose("manual");
    },
    [fetchMeAndMaybeClose]
  );

  // ---- logout ----
  const doLogout = React.useCallback(async () => {
    await logout();
    const curr = await loadTokens();
    setTokens(curr);
    setMe(null);
    setCsrfInput("");
    setSessInput("");
    setStatus("logged out");
    console.log("[auth] logged out");
  }, []);

  // ---- styles consts ----
  const R = 12;
  const PAD_V = 8;
  const PAD_H = 10;
  const ICON = 18;
  const FS = 13;
  const rippleItem = colors.accent + "2A";
  const rippleLucky = "#ffffff22";
  const rippleLogin = colors.accent + "33";
  const dynamicTop = fullscreen ? 12 : Math.max(insets.top, 12);

  const mask = (s?: string) => (s ? (s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s) : "-");

  const loggedIn = Boolean(me);

  // ======= UI =======
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
      {/* AUTH BLOCK */}
      {loggedIn ? (
        <Rounded
          rippleColor={rippleLogin}
          radius={R}
          onPress={() => {
            if (!me) return;
            const slug = me.slug || me.username || String(me.id || "");
            router.push({
              pathname: "/profile/[id]/[slug]",
              params: { id: String(me.id ?? ""), slug },
            });
          }}
          style={{ marginBottom: 10 }}
        >
          <View
            style={[
              styles.profileCard,
              {
                borderColor: colors.accent,
                backgroundColor: colors.accent + "12",
              },
            ]}
          >
            {me?.avatar_url ? (
              <Image
                source={{ uri: me.avatar_url }}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#0002" }}
              />
            ) : (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: colors.accent + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="user" size={18} color={colors.accent} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.menuTxt, fontWeight: "900" }} numberOfLines={1}>
                {me?.username}
              </Text>
              {!!me?.profile_url && (
                <Text style={{ color: colors.sub, fontSize: 11 }} numberOfLines={1}>
                  {me.profile_url}
                </Text>
              )}
            </View>
            <Feather name="external-link" size={18} color={colors.accent} />
          </View>
        </Rounded>
      ) : (
        <Rounded
          rippleColor={rippleLogin}
          radius={R}
          onPress={() => setLoginVisible(true)}
          style={{ marginBottom: 10 }}
        >
          <View
            style={[
              styles.loginBtn,
              {
                borderRadius: R,
                borderColor: colors.accent,
                backgroundColor: colors.accent + "10",
              },
            ]}
          >
            <Feather
              name="log-in"
              size={ICON}
              color={colors.accent}
              style={{ width: 22, textAlign: "center", marginRight: 6 }}
            />
            <Text style={[styles.loginTxt, { color: colors.accent }]}>
              {t("menu.login") ?? "Sign in"}
            </Text>
          </View>
        </Rounded>
      )}

      {/* Lucky button */}
      <Rounded rippleColor={rippleLucky} radius={R} onPress={goRandom} disabled={randomLoading}>
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
            <ActivityIndicator size="small" style={[styles.luckyTxt]} color={colors.bg} />
          ) : (
            <>
              <Feather
                name="shuffle"
                size={ICON}
                style={{ width: 22, textAlign: "center", marginRight: 6 }}
                color={colors.bg}
              />
              <Text style={[styles.luckyTxt, { color: colors.bg }]}>{t("menu.random")}</Text>
            </>
          )}
        </View>
      </Rounded>

      {/* menu items */}
      <View style={{ marginTop: 6 }}>
        {MENU.map((item) => {
          const active = pathname?.startsWith(item.route);
          const disabled = !loggedIn && item.route === "/favoritesOnline";
          const baseTint = active ? colors.accent : colors.menuTxt;
          const tint = disabled ? colors.sub : baseTint;
          const bg = active ? colors.accent + "15" : "transparent";

          return (
            <Rounded
              key={item.route}
              radius={R}
              rippleColor={rippleItem}
              onPress={() => {
                if (disabled) return;
                closeDrawer();
                router.push(item.route);
              }}
              disabled={disabled}
            >
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: bg,
                    borderRadius: R,
                    paddingVertical: PAD_V - 1,
                    paddingHorizontal: PAD_H - 2,
                    opacity: disabled ? 0.5 : 1,
                  },
                ]}
              >
                {active && <View style={[styles.activeBar, { backgroundColor: tint }]} />}

                <Feather
                  name={item.icon}
                  size={ICON}
                  color={tint}
                  style={{ width: 22, textAlign: "center", marginRight: 6 }}
                />

                <Text
                  style={[
                    styles.itemTxt,
                    { color: tint, fontSize: FS, flexShrink: 1 },
                  ]}
                >
                  {t(item.labelKey)}
                </Text>

                {disabled && (
                  <Feather
                    name="lock"
                    size={14}
                    color={colors.sub}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
            </Rounded>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* bottom actions + status + brand */}
      <View style={{ marginBottom: Math.max(insets.bottom, 12) }}>
        {/* logout button (only when logged in) */}
        {loggedIn && (
          <Rounded
            rippleColor={rippleItem}
            radius={R}
            onPress={async () => {
              await doLogout();
              // можно закрыть меню после логаута, если нужно:
              // closeDrawer();
            }}
            style={{ marginBottom: 10 }}
          >
            <View
              style={[
                styles.logoutBtn,
                {
                  borderRadius: R,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Feather
                name="log-out"
                size={ICON}
                color={colors.accent}
                style={{ width: 22, textAlign: "center", marginRight: 6 }}
              />
              <Text style={[styles.logoutTxt, { color: colors.accent }]}>
                {t("menu.logout") ?? "Log out"}
              </Text>
            </View>
          </Rounded>
        )}

        {/* auth status */}
        <Text style={{ color: colors.sub, fontSize: 11 }}>
          csrf: {mask(tokens.csrftoken)} • session: {tokens.sessionid ? mask(tokens.sessionid) : "HttpOnly (auto)"}
        </Text>
        {!!status && (
          <Text style={{ color: colors.sub, fontSize: 11, marginTop: 2 }}>{status}</Text>
        )}

        {/* brand */}
        <Text style={{ color: colors.menuTxt, fontWeight: "900", marginTop: 10 }}>
          NHAppAndroid
        </Text>
        <Text style={{ color: colors.sub, fontSize: 11, marginTop: 1 }}>Unofficial</Text>
      </View>

      {/* LOGIN MODAL */}
      <Modal
        visible={loginVisible}
        animationType="slide"
        onRequestClose={() => setLoginVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.page,
            paddingTop: Math.max(insets.top, 10),
          }}
        >
          {/* header */}
          <View
            style={{
              paddingHorizontal: 10,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: colors.title, fontWeight: "900", fontSize: 16 }}>
              {t("menu.login") ?? "Sign in"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {canUseNativeJar && (
                <Pressable
                  onPress={() => refreshTokensFromJar("manual")}
                  android_ripple={{ color: "#fff2" }}
                  style={{ padding: 8, borderRadius: 8 }}
                >
                  <Feather name="download" size={18} color={colors.title} />
                </Pressable>
              )}

              <Pressable
                onPress={() => setLoginVisible(false)}
                android_ripple={{ color: "#fff2" }}
                style={{ padding: 8, borderRadius: 8 }}
              >
                <Feather name="x" size={20} color={colors.title} />
              </Pressable>
            </View>
          </View>

          {/* manual tokens */}
          <View style={{ paddingHorizontal: 10, gap: 8 }}>
            <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 2 }}>
              {isExpoGo
                ? "Expo Go: войдите в WebView — токены сохранятся автоматически."
                : "sessionid — HttpOnly и берётся из нативного cookie-джара; вводить его обычно не нужно."}
            </Text>

            <TextInput
              placeholder="csrftoken"
              value={csrfInput}
              onChangeText={setCsrfInput}
              onEndEditing={() => applyManual(csrfInput, sessInput)}
              autoCapitalize="none"
              style={[
                styles.input,
                { borderColor: colors.accent + "55", color: colors.title },
              ]}
              placeholderTextColor={colors.sub}
            />

            {/* на случай редких прошивок, где sessionid виден */}
            {!(tokens.csrftoken || me) && (
              <TextInput
                placeholder="sessionid (обычно HttpOnly — скрыт)"
                value={sessInput}
                onChangeText={setSessInput}
                onEndEditing={() => applyManual(csrfInput, sessInput)}
                autoCapitalize="none"
                style={[
                  styles.input,
                  { borderColor: colors.accent + "55", color: colors.title },
                ]}
                placeholderTextColor={colors.sub}
              />
            )}
          </View>

          {/* WebView */}
          <>
            <View style={{ height: 10 }} />
            <WebView
              ref={webRef}
              originWhitelist={["*"]}
              source={{ uri: LOGIN_URL }}
              onLoadStart={() => setWvBusy(true)}
              onLoadEnd={async () => {
                setWvBusy(false);
                if (canUseNativeJar) await refreshTokensFromJar("loadEnd");
                await fetchMeAndMaybeClose("loadEnd");
              }}
              onLoadProgress={(e) => {
                if (canUseNativeJar && e?.nativeEvent?.progress >= 0.6) {
                  refreshTokensFromJar("progress");
                }
              }}
              onNavigationStateChange={handleNavChange}
              onMessage={onWvMessage}
              injectedJavaScript={injected}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={{ padding: 8 }}>
                  <ActivityIndicator />
                </View>
              )}
              allowsBackForwardNavigationGestures
              style={{ flex: 1 }}
            />
          </>

          {/* footer status */}
          <View style={{ padding: 8 }}>
            <Text style={{ color: colors.sub, fontSize: 12, textAlign: "center" }}>
              {wvBusy ? "Loading…" : "Ready"}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // профиль / логин в одном месте сверху
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

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

  // Login button
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  loginTxt: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Logout button
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  logoutTxt: {
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.2,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
  },
});
