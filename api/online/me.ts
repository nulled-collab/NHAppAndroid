import { NH_HOST } from "@/api/auth";
import { getHtmlWithCookies, isBrowser } from "./http";
import {
  normalizeNhUrl,
  tryParseUserFromAppScript,
  tryParseUserFromRightMenu,
} from "./scrape";
import type { Me } from "./types";

export async function getMe(): Promise<Me | null> {
  if (isBrowser) return null;
  try {
    const html = await getHtmlWithCookies(NH_HOST + "/");

    const fromApp = tryParseUserFromAppScript(html);
    const fromMenu = tryParseUserFromRightMenu(html);

    if (!fromApp && !fromMenu) return null;

    const id = fromApp?.id ?? fromMenu?.id;
    const username = fromApp?.username ?? fromMenu?.username;
    const slug = fromApp?.slug ?? fromMenu?.slug;
    const avatar_url = normalizeNhUrl(
      fromApp?.avatar_url || fromMenu?.avatar_url
    );
    const profile_url =
      fromApp?.profile_url ||
      fromMenu?.profile_url ||
      (id && username
        ? `${NH_HOST}/users/${id}/${encodeURIComponent(slug || username)}/`
        : undefined);

    if (!username) return null;

    return { id, username, slug, avatar_url, profile_url };
  } catch {
    return null;
  }
}
