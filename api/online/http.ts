import { NH_HOST, cookieHeaderString, hasNativeCookieJar } from "@/api/auth";
import axios from "axios";
import { Platform } from "react-native";

export const isBrowser = Platform.OS === "web";

function baseHeaders(): Record<string, string> {
  return {
    Referer: NH_HOST + "/",
    "User-Agent": "nh-client",
    Accept: "text/html,application/xhtml+xml",
    "Cache-Control": "no-cache",
  };
}

/** Универсальный HTML-GET с куками (нативный jar или руками через Header) */
export async function fetchHtml(url: string): Promise<{
  html: string;
  finalUrl: string;
  status: number;
}> {
  if (isBrowser) return { html: "", finalUrl: url, status: 0 };

  const useNativeJar = hasNativeCookieJar();
  const headers = baseHeaders();

  if (!useNativeJar) {
    const cookie = await cookieHeaderString({ preferNative: false });
    if (cookie) headers.Cookie = cookie;
  }

  const res = await axios.get<string>(url, {
    transformResponse: (r) => r,
    validateStatus: (s) => s >= 200 && s < 500,
    withCredentials: true,
    headers,
  });

  const finalUrl =
    String((res as any)?.request?.responseURL || res.headers?.location || url) || url;

  return {
    html: String(res.data || ""),
    finalUrl,
    status: Number(res.status || 0),
  };
}

/** Простой помощник: только HTML (когда редирект не важен) */
export async function getHtmlWithCookies(url: string): Promise<string> {
  const { html } = await fetchHtml(url);
  return html;
}
