import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const NH_HOST = "https://nhentai.net";

// ===== Типы =====
export interface ApiUserLite {
  id: number;
  username: string;
  slug?: string;
  avatar_url?: string;
}
export interface ApiComment {
  id: number;
  gallery_id: number;
  body: string;
  post_date: number; // unix (sec)
  poster: ApiUserLite;
}

// ===== Куки =====
type AuthCookies = {
  csrftoken?: string;
  sessionid?: string;
  cf_clearance?: string;
};

export class CaptchaRequiredError extends Error {
  captchaPublicKey: string;
  constructor(key: string, msg = "Captcha required") {
    super(msg);
    this.name = "CaptchaRequired";
    this.captchaPublicKey = key;
  }
}

async function getAuthCookies(): Promise<AuthCookies> {
  const [csrf, sess, cfc] = await AsyncStorage.multiGet([
    "nh.csrf",
    "nh.session",
    "nh.cf_clearance",
  ]).then((arr) => arr.map(([, v]) => v || undefined));
  return { csrftoken: csrf, sessionid: sess, cf_clearance: cfc };
}

function buildCookieHeader(c: AuthCookies) {
  const parts: string[] = [];
  if (c.csrftoken) parts.push(`csrftoken=${c.csrftoken}`);
  if (c.sessionid) parts.push(`sessionid=${c.sessionid}`);
  if (c.cf_clearance) parts.push(`cf_clearance=${c.cf_clearance}`);
  return parts.join("; ");
}

// Пытаемся достать CSRF из cookie (на web)
function getCsrfFromCookie(): string | undefined {
  try {
    // @ts-ignore
    const c: string = typeof document !== "undefined" ? document.cookie || "" : "";
    const m = c.match(/(?:^|;\\s*)csrftoken=([^;]+)/i);
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

/** Отправить комментарий */
export async function submitComment(
  galleryId: number,
  text: string,
  captchaToken?: string
): Promise<ApiComment> {
  const url = `${NH_HOST}/api/gallery/${galleryId}/comments/submit`;

  const payload: Record<string, any> = { body: text };
  if (captchaToken) {
    payload.captcha = captchaToken;
    payload["cf-turnstile-response"] = captchaToken;
  }

  const cookies = await getAuthCookies();
  const cookieHeader = buildCookieHeader(cookies);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    Referer: `${NH_HOST}/g/${galleryId}/`,
    Origin: NH_HOST,
    "User-Agent":
      Platform.OS === "ios"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  };
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  const csrf = cookies.csrftoken || getCsrfFromCookie();
  if (csrf) {
    headers["X-CSRFToken"] = csrf;
    headers["X-Csrftoken"] = csrf;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    return (await res.json()) as ApiComment;
  }

  const raw = await res.text();
  let j: any = null;
  try { j = raw ? JSON.parse(raw) : null; } catch {}

  if (res.status === 403) {
    const key =
      j?.captcha_public_key ||
      j?.captchaPublicKey ||
      raw.match(/captcha_public_key["']?\\s*:\\s*["']([^"']+)["']/i)?.[1] ||
      raw.match(/0x[0-9A-Za-z]{30,}/)?.[0];

    const msg =
      j?.error || j?.detail || "You need to solve a CAPTCHA to continue";
    if (key) throw new CaptchaRequiredError(String(key), msg);
    throw new Error(msg || "Forbidden");
  }

  if (/timeout|duplicate|invalid[-_\\s]?input|captcha/i.test(JSON.stringify(j ?? raw))) {
    throw new Error(
      j?.error ||
        j?.detail ||
        "Токен капчи истёк или уже использован. Подтвердите капчу ещё раз."
    );
  }

  throw new Error(j?.error || j?.detail || raw || `HTTP ${res.status}`);
}

/** Удалить комментарий */
export async function deleteComment(
  commentId: number
): Promise<{ success: boolean }> {
  const cookies = await getAuthCookies();
  const cookieHeader = buildCookieHeader(cookies);

  const res = await fetch(`${NH_HOST}/api/comments/${commentId}/delete`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Origin: NH_HOST,
      Referer: `${NH_HOST}/`,
      Cookie: cookieHeader,
      "User-Agent":
        Platform.OS === "ios"
          ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
          : "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
      ...(cookies.csrftoken ? { "X-CSRFToken": cookies.csrftoken } : {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${res.statusText}. ${text.slice(0, 400)}`);
  }
  return (json ?? { success: true }) as { success: boolean };
}

export const deleteCommentById = deleteComment;
