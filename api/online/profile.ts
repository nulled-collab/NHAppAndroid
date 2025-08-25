import { NH_HOST } from "@/api/auth";
import { getHtmlWithCookies, isBrowser } from "./http";
import { normalizeNhUrl } from "./scrape";
import type { Me, UserComment, UserOverview } from "./types";

/** Универсальный декодер HTML-сущностей (включая &#123; и &#x7B;) */
function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    // hex/dec числовые
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g,      (_, d) => String.fromCharCode(parseInt(d, 10)))
    // именованные
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

/** Очистка HTML в текст (поддержка <br>) */
function htmlToText(s: string): string {
  return decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]+/g, " ")
  ).trim();
}

/** Заголовок профиля с самой страницы пользователя */
function parseProfileHeader(
  html: string,
  id: number,
  slug?: string
): Me | null {
  const name =
    html
      .match(
        /<div[^>]*class=["']user-info["'][^>]*>[\s\S]*?<h1>([^<]+)<\/h1>/i
      )?.[1]
      ?.trim() ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim() ||
    (slug ? String(slug) : "");

  const avatar =
    html.match(
      /<div[^>]*class=["']bigavatar["'][^>]*>\s*<img[^>]+(?:data-src|src)=["']([^"']+)["']/i
    )?.[1] || null;

  if (!name && !avatar) return null;

  const profile_url = `${NH_HOST}/users/${id}/${encodeURIComponent(
    slug || name
  )}/`;
  return {
    id,
    username: name || (slug ?? ""),
    slug,
    avatar_url: avatar ? normalizeNhUrl(avatar) : undefined,
    profile_url,
  };
}

/** Быстрый профиль */
export async function getUserProfile(
  id: number,
  slug?: string
): Promise<Me | null> {
  if (!id || isBrowser) return null;
  const base = `${NH_HOST}/users/${id}/${encodeURIComponent(slug || "")}`;
  const url = base.endsWith("/") ? base : base + "/";
  try {
    const html = await getHtmlWithCookies(url);
    const fromHeader = parseProfileHeader(html, id, slug);
    if (fromHeader?.username)
      return { ...fromHeader, profile_url: fromHeader.profile_url || url };

    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]?.trim();
    const av = html.match(
      /<img[^>]+class=["'][^"']*\bavatar\b[^"']*["'][^>]+(?:data-src|src)=["']([^"']+)["']/i
    )?.[1];
    return h1
      ? {
          id,
          username: h1,
          slug,
          avatar_url: av ? normalizeNhUrl(av) : undefined,
          profile_url: url,
        }
      : null;
  } catch {
    return null;
  }
}

/** Обзор профиля: Joined + избранные + последние комментарии + favorite tags + about */
export async function getUserOverview(
  id: number,
  slug?: string
): Promise<UserOverview | null> {
  if (!id || isBrowser) return null;
  const base = `${NH_HOST}/users/${id}/${encodeURIComponent(slug || "")}`;
  const url = base.endsWith("/") ? base : base; // допускается без завершающего /
  try {
    const html = await getHtmlWithCookies(url);

    // user — из заголовка страницы
    const headerUser = parseProfileHeader(html, id, slug) || {
      id,
      username: slug || "",
    };

    // joined
    const mJoined =
      html.match(
        /<b>\s*Joined:\s*<\/b>\s*&nbsp;\s*<time[^>]*>([^<]+)<\/time>/i
      ) ||
      html.match(/Joined:\s*([^<]+)/i) ||
      html.match(/Member\s+since:\s*([^<]+)/i);
    const joinedText = mJoined ? decodeEntities(mJoined[1].trim()) : undefined;

    // Favorite tags
    let favoriteTags: string[] | undefined;
    let favoriteTagsText: string | undefined;
    const favP =
      html.match(
        /<p[^>]*>\s*<b>\s*Favorite\s*tags:\s*<\/b>\s*([\s\S]*?)<\/p>/i
      ) || html.match(/Favorite\s*tags:\s*([\s\S]*?)<\/p>/i);

    if (favP) {
      const inner = favP[1];
      const aMatches = Array.from(
        inner.matchAll(/<a[^>]*>([^<]+)<\/a>/gi)
      ).map((m) => decodeEntities(m[1].trim()));
      if (aMatches.length) favoriteTags = aMatches.filter(Boolean);
      const rawText = htmlToText(inner);
      if (rawText) favoriteTagsText = rawText;
    }

    // About
    let about: string | undefined;
    const aboutP =
      html.match(
        /<p[^>]*>\s*<b>\s*About:\s*<\/b>\s*([\s\S]*?)<\/p>/i
      ) || html.match(/<b>\s*About:\s*<\/b>\s*([\s\S]*?)<\/p>/i);
    if (aboutP) {
      about = htmlToText(aboutP[1]); // уже декодировано
    }

    // recent favorites
    const ids = new Set<number>();
    const re = /href=["']\/g\/(\d+)\/["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && ids.size < 48) ids.add(Number(m[1]));

    // recent comments
    const commentRe =
      /<div[^>]*\bclass=["'][^"']*\bcomment\b[^"']*["'][^>]*\bdata-state=["']([\s\S]*?)["'][^>]*>/gi;

    const recentComments: UserComment[] = [];
    let mc: RegExpExecArray | null;

    while ((mc = commentRe.exec(html)) && recentComments.length < 30) {
      try {
        const json = JSON.parse(decodeEntities(mc[1]));
        const c: UserComment = {
          id: Number(json?.id),
          gallery_id: Number(json?.gallery_id),
          body: String(json?.body || ""),
          post_date:
            typeof json?.post_date === "number"
              ? Math.floor(json.post_date)
              : Number.isFinite(+json?.post_date)
              ? Math.floor(+json.post_date)
              : undefined,
          avatar_url: json?.poster?.avatar_url
            ? normalizeNhUrl(json.poster.avatar_url)
            : undefined,
          page_url:
            json?.id && json?.gallery_id
              ? `/g/${json.gallery_id}/#comment-${json.id}`
              : undefined,
        };
        if (c.id && c.gallery_id) recentComments.push(c);
      } catch {
        // пропускаем невалидные JSON
      }
    }

    return {
      me: {
        id: headerUser?.id ?? id,
        username: headerUser?.username || slug || "",
        slug: headerUser?.slug || slug,
        avatar_url: headerUser?.avatar_url,
        profile_url: headerUser?.profile_url || url,
      },
      joinedText,
      favoriteTags,
      favoriteTagsText,
      about,
      recentFavoriteIds: Array.from(ids),
      recentComments,
    };
  } catch {
    return null;
  }
}
