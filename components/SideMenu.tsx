import {
  hasNativeCookieJar,
  loadTokens,
  LOGIN_URL,
  logout,
  setManualTokens,
  syncNativeCookiesFromJar,
} from "@/api/auth";
import { getRandomBook } from "@/api/nhentai";
import { getMe, type Me } from "@/api/nhentaiOnline";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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

const LIBRARY_MENU: {
  labelKey: string;
  icon: keyof typeof Feather.glyphMap;
  route: MenuRoute;
}[] = [
  { labelKey: "menu.downloaded", icon: "download", route: "/downloaded" },
  { labelKey: "menu.favorites", icon: "heart", route: "/favorites" },
  {
    labelKey: "menu.favoritesOnline",
    icon: "cloud",
    route: "/favoritesOnline",
  },
  { labelKey: "menu.history", icon: "clock", route: "/history" },
  { labelKey: "menu.recommendations", icon: "star", route: "/recommendations" },
  { labelKey: "menu.tags", icon: "tag", route: "/tags" },
  { labelKey: "menu.settings", icon: "settings", route: "/settings" },
];

function CardPressable({
  children,
  radius = 14,
  onPress,
  onLongPress,
  delayLongPress,
  style,
  disabled,
  ripple,
  overlayColor,
  hitSlop,
}: {
  children: React.ReactNode;
  radius?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  style?: any;
  disabled?: boolean;
  ripple: string;
  overlayColor?: string;
  hitSlop?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
}) {
  const overlay = overlayColor ?? "rgba(255,255,255,0.10)";
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden" }, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress ?? 350}
        android_ripple={
          !disabled ? { color: ripple, borderless: false } : undefined
        }
        hitSlop={hitSlop}
      >
        {({ pressed }) => (
          <View style={[{ borderRadius: radius }]}>
            {children}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: overlay,
                  opacity: pressed && !disabled ? 1 : 0,
                },
              ]}
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function IconBtn({
  onPress,
  onLongPress,
  children,
  ripple,
  overlayColor,
  size = 36,
  radius = 10,
  hitSlop = 6,
}: {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  ripple: string;
  overlayColor?: string;
  size?: number;
  radius?: number;
  hitSlop?: number;
}) {
  return (
    <CardPressable
      onPress={onPress}
      onLongPress={onLongPress}
      ripple={ripple}
      overlayColor={overlayColor}
      radius={radius}
      hitSlop={hitSlop}
      style={{ width: size, height: size }}
    >
      <View
        style={{
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </View>
    </CardPressable>
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
  const [loginVisible, setLoginVisible] = React.useState(false);
  const [wvBusy, setWvBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const [tokens, setTokens] = React.useState<{
    csrftoken?: string;
    sessionid?: string;
  }>({});
  const [me, setMe] = React.useState<Me | null>(null);
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
          setStatus(t("login.status.signedAs", { user: m.username, why }));
          setLoginVisible(false);
        } else {
          setStatus(t("login.status.notSigned", { why }));
        }
      } catch {
        setStatus(t("login.status.notSigned", { why }));
      }
    },
    [t]
  );

  const refreshTokensFromJar = React.useCallback(
    async (reason: string) => {
      if (!canUseNativeJar) return;
      try {
        const synced = await syncNativeCookiesFromJar();
        setTokens(synced);
        if (synced.csrftoken) setCsrfInput(synced.csrftoken);
        if (synced.sessionid) setSessInput(synced.sessionid);
        setStatus(t("login.status.cookiesSynced", { reason }));
        await fetchMeAndMaybeClose("cookies");
      } catch (e) {
        setStatus(t("login.status.cookiesFailed", { reason }));
        console.log("[auth] sync error:", e);
      }
    },
    [canUseNativeJar, fetchMeAndMaybeClose, t]
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
    })();
    true;
  `;

  const onWvMessage = React.useCallback(
    async (ev: any) => {
      try {
        const data = JSON.parse(ev?.nativeEvent?.data);
        if (data?.type === "cookies") {
          const cookies = data.cookies || {};
          const csrf =
            typeof cookies.csrftoken === "string"
              ? cookies.csrftoken
              : undefined;
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
        }
      } catch {}
    },
    [canUseNativeJar, refreshTokensFromJar, fetchMeAndMaybeClose]
  );

  const handleNavChange = React.useCallback(
    (_navState: any) => {
      setStatus(t("login.status.navigating"));
      if (canUseNativeJar) refreshTokensFromJar("nav");
    },
    [canUseNativeJar, refreshTokensFromJar, t]
  );

  const applyManual = React.useCallback(
    async (nextCsrf: string, nextSess: string) => {
      await setManualTokens(
        nextCsrf?.trim() || undefined,
        nextSess?.trim() || undefined
      );
      const curr = await loadTokens();
      setTokens(curr);
      setStatus(t("login.status.tokensSaved"));
      await fetchMeAndMaybeClose("manual");
    },
    [fetchMeAndMaybeClose, t]
  );

  const doLogout = React.useCallback(async () => {
    await logout();
    const curr = await loadTokens();
    setTokens(curr);
    setMe(null);
    setCsrfInput("");
    setSessInput("");
    setStatus(t("login.status.loggedOut"));
  }, [t]);

  const R = 14;
  const ICON = 18;
  const dynamicTop = fullscreen ? 12 : Math.max(insets.top, 12);
  const loggedIn = Boolean(me);
  const showManualInputs = !loggedIn && (!canUseNativeJar || isExpoGo);

  const ripplePrimary = "#FFFFFF33";
  const rippleItem = colors.accent + "33";
  const rippleSubtle = colors.accent + "22";
  const overlayStrong = "rgba(255,255,255,0.12)";
  const overlaySoft = "rgba(255,255,255,0.08)";

  const mask = (s?: string) =>
    s ? (s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s) : "-";

  const copy = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch {}
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={{ marginVertical: 12 }}>
      <Text
        style={{
          color: colors.sub,
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 0.6,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

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
      <View style={styles.headerRow}>
        <View>
          <Text
            style={{ color: colors.menuTxt, fontWeight: "900", fontSize: 16 }}
          >
            {t("menu.brand")}
          </Text>
          <Text style={{ color: colors.sub, fontSize: 11 }}>
            {t("menu.brandTag")}
          </Text>
        </View>
      </View>

      <CardPressable
        ripple={ripplePrimary}
        overlayColor={overlayStrong}
        radius={R}
        onPress={goRandom}
        disabled={randomLoading}
      >
        <View style={[styles.primaryBtn, { backgroundColor: colors.accent }]}>
          {randomLoading ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <>
              <Feather name="shuffle" size={ICON} color={colors.bg} />
              <Text style={[styles.primaryBtnTxt, { color: colors.bg }]}>
                {t("menu.random")}
              </Text>
            </>
          )}
        </View>
      </CardPressable>

      <Section title={t("menu.section.library")}>
        <View style={{ gap: 6 }}>
          {LIBRARY_MENU.map((item) => {
            const active = pathname?.startsWith(item.route);
            const disabled = !loggedIn && item.route === "/favoritesOnline";
            const tint = disabled
              ? colors.sub
              : active
              ? colors.accent
              : colors.menuTxt;
            const bg = active ? colors.accent + "14" : colors.tagBg;

            return (
              <CardPressable
                key={item.route}
                ripple={rippleItem}
                overlayColor={overlaySoft}
                radius={R}
                onPress={() => {
                  if (disabled) return;
                  closeDrawer();
                  router.push(item.route);
                }}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.menuRow,
                    {
                      backgroundColor: bg,
                      borderColor: active ? colors.accent + "55" : colors.page,
                    },
                  ]}
                >
                  {active && (
                    <View
                      style={[styles.activeBar, { backgroundColor: tint }]}
                    />
                  )}
                  <Feather
                    name={item.icon}
                    size={ICON}
                    color={tint}
                    style={{ width: 22, textAlign: "center", marginRight: 12 }}
                  />
                  <Text
                    style={[styles.itemTxt, { color: tint, flex: 1 }]}
                    numberOfLines={1}
                  >
                    {t(item.labelKey)}
                  </Text>
                  {disabled && (
                    <Feather name="lock" size={14} color={colors.sub} />
                  )}
                </View>
              </CardPressable>
            );
          })}
        </View>
      </Section>

      <View style={{ flex: 1 }} />

      <Section title={t("menu.section.account")}>
        {loggedIn ? (
          <CardPressable
            ripple={rippleSubtle}
            overlayColor={overlaySoft}
            radius={R}
            onPress={() => {
              if (!me) return;
              const slug = me.slug || me.username || String(me.id || "");
              router.push({
                pathname: "/profile/[id]/[slug]",
                params: { id: String(me.id ?? ""), slug },
              });
              closeDrawer();
            }}
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
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "#0002",
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: colors.accent + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="user" size={18} color={colors.accent} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.menuTxt, fontWeight: "900" }}
                  numberOfLines={1}
                >
                  {me?.username}
                </Text>
                {!!me?.profile_url && (
                  <Text
                    style={{ color: colors.sub, fontSize: 11 }}
                    numberOfLines={1}
                  >
                    {me.profile_url}
                  </Text>
                )}
              </View>

              <IconBtn
                ripple={rippleSubtle}
                overlayColor={overlaySoft}
                onPress={doLogout}
              >
                <Feather name="log-out" size={18} color={colors.accent} />
              </IconBtn>
            </View>
          </CardPressable>
        ) : (
          <CardPressable
            ripple={rippleSubtle}
            overlayColor={overlaySoft}
            radius={R}
            onPress={() => setLoginVisible(true)}
          >
            <View
              style={[
                styles.loginBtn,
                {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent + "10",
                },
              ]}
            >
              <Feather
                name="log-in"
                size={ICON}
                color={colors.accent}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.loginTxt, { color: colors.accent }]}>
                {t("menu.login")}
              </Text>
            </View>
          </CardPressable>
        )}
      </Section>

      <Modal
        visible={loginVisible}
        animationType="slide"
        onRequestClose={() => setLoginVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.page, paddingTop: 10 }}>
          <View
            style={{
              paddingHorizontal: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{ color: colors.title, fontWeight: "900", fontSize: 16 }}
            >
              {t("menu.login")}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {canUseNativeJar && (
                <IconBtn
                  ripple={"#fff2"}
                  overlayColor={"rgba(255,255,255,0.12)"}
                  onPress={() => refreshTokensFromJar("manual")}
                  size={36}
                >
                  <Feather name="download" size={18} color={colors.title} />
                </IconBtn>
              )}
              <IconBtn
                ripple={"#fff2"}
                overlayColor={"rgba(255,255,255,0.12)"}
                onPress={() => setLoginVisible(false)}
                size={36}
              >
                <Feather name="x" size={20} color={colors.title} />
              </IconBtn>
            </View>
          </View>

          <View style={{ paddingHorizontal: 10, gap: 8 }}>
            {!showManualInputs && (
              <>
                <Text
                  style={{ color: colors.sub, fontSize: 12, marginBottom: 2 }}
                >
                  {isExpoGo ? t("login.hint.expo") : t("login.hint.native")}
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
                {!canUseNativeJar && (
                  <TextInput
                    placeholder="sessionid"
                    value={sessInput}
                    onChangeText={setSessInput}
                    onEndEditing={() => applyManual(csrfInput, sessInput)}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: colors.accent + "55",
                        color: colors.title,
                      },
                    ]}
                    placeholderTextColor={colors.sub}
                  />
                )}
              </>
            )}
          </View>

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

          <View style={{ padding: 8 }}>
            <Text
              style={{ color: colors.sub, fontSize: 12, textAlign: "center" }}
            >
              {wvBusy ? t("login.loading") : t("login.ready")}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
    width: "100%",
  },
  primaryBtnTxt: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
    textAlign: "center",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
  },
  activeBar: { width: 3, height: "70%", borderRadius: 2, marginRight: 8 },

  itemTxt: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  loginTxt: { fontWeight: "900", fontSize: 13, letterSpacing: 0.2 },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
  },
});
