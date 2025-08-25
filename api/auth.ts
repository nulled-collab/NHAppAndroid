// api/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const NH_HOST = "https://nhentai.net";
export const LOGIN_URL = `${NH_HOST}/login/?next=/`;

export type AuthTokens = {
  csrftoken?: string;
  /** sessionid чаще всего HttpOnly → из JS его не видно */
  sessionid?: string;
};

const STORAGE_KEY = "@auth.tokens.v1";

// Доп. ключи, которые мы сохраняли из WebView/скрейперов:
const EXTRA_AUTH_KEYS = ["nh.csrf", "nh.session", "nh.cf_clearance", "nh.me"];

// -------- CookieManager (лениво и безопасно для Expo Go) ----------
let CookieManager: any = null;
if (Constants.appOwnership !== "expo") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CookieManager = require("@react-native" + "-cookies/cookies").default;
  } catch {}
}

export const hasNativeCookieJar = () => Boolean(CookieManager);

// --------- helpers ----------
function normalizeTokens(obj: any): AuthTokens {
  const rawCsrf =
    typeof obj?.csrftoken === "string" ? obj.csrftoken.trim() : "";
  const rawSess =
    typeof obj?.sessionid === "string" ? obj.sessionid.trim() : "";
  return {
    csrftoken: rawCsrf || undefined,
    sessionid: rawSess || undefined,
  };
}

export function buildCookieHeader(tokens: AuthTokens): string {
  const parts: string[] = [];
  if (tokens.csrftoken) parts.push(`csrftoken=${tokens.csrftoken}`);
  if (tokens.sessionid) parts.push(`sessionid=${tokens.sessionid}`);
  return parts.join("; ");
}

// ------ native cookie set/clear ------
const COOKIE_HOSTS = [
  "https://nhentai.net",
  "http://nhentai.net",
  "https://www.nhentai.net",
  "http://www.nhentai.net",
];

async function applyTokensToNativeJar(tokens: AuthTokens): Promise<void> {
  if (!CookieManager) return;
  try {
    const ops: Promise<any>[] = [];
    for (const h of COOKIE_HOSTS) {
      if (tokens.csrftoken) {
        ops.push(
          CookieManager.set(h, {
            name: "csrftoken",
            value: String(tokens.csrftoken),
            path: "/",
            secure: h.startsWith("https"),
            sameSite: "Lax",
          })
        );
      }
      // sessionid не пишем руками — сервер кладёт HttpOnly сам
    }
    await Promise.all(ops);
    if (Platform.OS === "android") await CookieManager.flush?.();
  } catch {}
}

// --------- storage ----------
export async function saveTokens(tokens: AuthTokens): Promise<void> {
  const prev = await loadTokens();
  const next = normalizeTokens({
    csrftoken: tokens.csrftoken ?? prev.csrftoken,
    sessionid: tokens.sessionid ?? prev.sessionid,
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  await applyTokensToNativeJar(next);
}

/** Всегда возвращает объект с ключами { csrftoken?, sessionid? } */
export async function loadTokens(): Promise<AuthTokens> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { csrftoken: undefined, sessionid: undefined };
    const parsed = JSON.parse(raw);
    return normalizeTokens(parsed);
  } catch {
    return { csrftoken: undefined, sessionid: undefined };
  }
}

/** Полная очистка наших токенов + всех доп. ключей, которые могли сохранить WebView/скрейперы */
export async function clearTokens(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEY, ...EXTRA_AUTH_KEYS]);
  } catch {
    // fallback: удалить по одному
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    for (const k of EXTRA_AUTH_KEYS)
      await AsyncStorage.removeItem(k).catch(() => {});
  }
}

export async function getCookieHeader(): Promise<string> {
  return buildCookieHeader(await loadTokens());
}

// --------- manual ----------
export async function setManualTokens(csrftoken?: string, sessionid?: string) {
  await saveTokens({ csrftoken, sessionid });
}

// --------- native jar sync ----------
function pickCookieValue(cookies: any, name: string): string | undefined {
  if (!cookies) return undefined;
  return cookies?.[name]?.value ?? cookies?.[name];
}

export async function syncNativeCookiesFromJar(): Promise<AuthTokens> {
  if (!CookieManager) return await loadTokens();

  if (Platform.OS === "android") {
    try {
      await CookieManager.flush?.();
    } catch {}
  }

  let found: AuthTokens = {};
  for (const h of COOKIE_HOSTS) {
    try {
      const jar = await CookieManager.get(h);
      if (!found.csrftoken) found.csrftoken = pickCookieValue(jar, "csrftoken");
      if (!found.sessionid) found.sessionid = pickCookieValue(jar, "sessionid");
      if (found.csrftoken && found.sessionid) break;
    } catch {}
  }

  const next = normalizeTokens({ ...(await loadTokens()), ...found });
  await saveTokens(next);
  return next;
}

/**
 * Строка Cookie. В НАТИВНЫХ сборках НЕ подставляем вручную,
 * иначе затрём HttpOnly sessionid из системного джара.
 */
export async function cookieHeaderString(opts?: {
  preferNative?: boolean;
}): Promise<string> {
  const preferNative = opts?.preferNative ?? true;
  if (preferNative && hasNativeCookieJar()) return "";
  return buildCookieHeader(await loadTokens());
}

/** Чек авторизации */
export async function hasValidTokens(): Promise<boolean> {
  const t = await loadTokens();
  if (t.csrftoken && t.sessionid) return true;

  if (CookieManager) {
    try {
      if (Platform.OS === "android") await CookieManager.flush?.();
      for (const h of COOKIE_HOSTS) {
        const jar = await CookieManager.get(h);
        const sess = pickCookieValue(jar, "sessionid");
        if (sess) return true;
      }
    } catch {}
  }
  return false;
}

// ---------- fetch helpers ----------
export type NHFetchInit = RequestInit & {
  csrf?: boolean;
  withAuth?: boolean;
};

export async function nhFetch(
  path: string,
  init: NHFetchInit = {}
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${NH_HOST}${path}`;

  const withAuth = init.withAuth !== false;
  const headers = new Headers(init.headers || {});

  if (withAuth && !headers.has("Cookie") && !hasNativeCookieJar()) {
    const cookieHeader = await cookieHeaderString({ preferNative: false });
    if (cookieHeader) headers.set("Cookie", cookieHeader);
  }

  const tokens = await loadTokens();
  const needsCsrf =
    init.csrf === true ||
    (init.method && !/^(GET|HEAD)$/i.test(String(init.method))) ||
    false;

  if (needsCsrf && tokens.csrftoken && !headers.has("X-CSRFToken")) {
    headers.set("X-CSRFToken", tokens.csrftoken);
    if (!headers.has("Referer")) headers.set("Referer", NH_HOST + "/");
  }

  return fetch(url, { ...init, headers });
}

/* ================== LOGOUT ================== */

async function tryRemoteLogout(): Promise<boolean> {
  try {
    const res = await nhFetch("/logout/", {
      method: "POST",
      csrf: true,
      withAuth: true,
    });
    if (res.status >= 200 && res.status < 400) return true;
  } catch {}
  try {
    const res2 = await nhFetch("/logout/?next=/", {
      method: "GET",
      withAuth: true,
    });
    if (res2.status >= 200 && res2.status < 400) return true;
  } catch {}
  return false;
}

async function clearNativeCookies(): Promise<void> {
  if (!CookieManager) return;

  // чистим все возможные варианты хостов
  const hosts = [
    "https://nhentai.net",
    "http://nhentai.net",
    "https://www.nhentai.net",
    "http://www.nhentai.net",
  ];

  try {
    if (typeof CookieManager.clearByName === "function") {
      for (const h of hosts) {
        await CookieManager.clearByName(h, "csrftoken");
        await CookieManager.clearByName(h, "sessionid");
        // заодно почистим cf_clearance на всякий, если вдруг мешает
        try {
          await CookieManager.clearByName(h, "cf_clearance");
        } catch {}
      }
    } else {
      // фолбэк через "просрочку"
      const expired = "1970-01-01T00:00:00.000Z";
      for (const h of hosts) {
        await CookieManager.set(h, {
          name: "csrftoken",
          value: "",
          path: "/",
          expires: expired,
        });
        await CookieManager.set(h, {
          name: "sessionid",
          value: "",
          path: "/",
          expires: expired,
        });
        try {
          await CookieManager.set(h, {
            name: "cf_clearance",
            value: "",
            path: "/",
            expires: expired,
          });
        } catch {}
      }
    }

    // на Android обязательно flush
    if (Platform.OS === "android") await CookieManager.flush?.();

    // как «последний шанс» — try clearAll (если есть)
    try {
      await CookieManager.clearAll?.();
    } catch {}
  } catch {}
}

export async function logout(): Promise<void> {
  try {
    await tryRemoteLogout();
  } catch {}

  // 1) Жёстко чистим куки из нативного джара
  await clearNativeCookies();

  // 2) Чистим наши локальные токены
  await clearTokens();

  // 3) Удаляем любые вспомогательные ключи (кэш «me», вспомогательные от CloudflareGate)
  try {
    await AsyncStorage.multiRemove([
      "nh.csrf",
      "nh.session",
      "nh.cf_clearance",
      "nh.me",
    ]);
  } catch {}
}

/* ========= ДОП. УТИЛИТЫ ========= */

export async function getAuthCookies(): Promise<AuthTokens> {
  try {
    if (hasNativeCookieJar()) return await syncNativeCookiesFromJar();
  } catch {}
  return await loadTokens();
}

export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  await saveTokens(tokens);
}
