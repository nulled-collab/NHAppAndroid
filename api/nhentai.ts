import axios from "axios";
import * as FileSystem from "expo-file-system";
import { Image, Platform } from "react-native";

const corsProxy = "https://thingproxy.freeboard.io/fetch/";
const baseURL =
  Platform.OS === "web"
    ? corsProxy + "https://nhentai.net/api"
    : "https://nhentai.net/api";

const api = axios.create({
  baseURL,
  headers: { "User-Agent": "nh-client" },
  timeout: 10_000,
});

export interface Tag {
  id: number;
  type: string;
  name: string;
  url: string;
  count: number;
}

export interface BookPage {
  page: number;
  url: string;
  urlThumb: string;
  width: number;
  height: number;
}

export interface Book {
  id: number;
  title: {
    english: string;
    japanese: string;
    pretty: string;
  };
  uploaded: string;
  media: number;
  favorites: number;
  pagesCount: number;
  scanlator: string;
  tags: Tag[];
  cover: string;
  coverW: number;
  coverH: number;
  thumbnail: string;
  pages: BookPage[];
  artists?: Tag[];
  characters?: Tag[];
  parodies?: Tag[];
  groups?: Tag[];
  categories?: Tag[];
  languages?: Tag[];
  raw?: any;
}

export interface ApiUser {
  id: number;
  username: string;
  slug: string;
  avatar_url: string;
  is_superuser: boolean;
  is_staff: boolean;
  avatar?: string;
}

export interface GalleryComment {
  id: number;
  gallery_id: number;
  poster: ApiUser;
  post_date: number;
  body: string;
  avatar: string;
}

const AVATAR_BASE = "https://i.nhentai.net/";

const absolutizeAvatar = (u?: string): string => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return AVATAR_BASE + u.replace(/^\/+/, "");
};

const mapComment = (c: any): GalleryComment => {
  const epochSec = Number(c?.post_date ?? 0); // из API приходит в секундах
  const poster: ApiUser = {
    ...(c.poster || {}),
    avatar: absolutizeAvatar(c.poster?.avatar_url), // <— alias
  };

  return {
    id: c.id,
    gallery_id: c.gallery_id,
    poster,
    post_date: epochSec * 1000, // <— теперь ms-таймстамп
    body: String(c.body ?? ""),
    avatar: absolutizeAvatar(c.poster?.avatar_url),
  };
};

export const getComments = async (id: number): Promise<GalleryComment[]> => {
  if (!id) throw new Error("getComments: invalid gallery id");
  const { data } = await api.get(`/gallery/${id}/comments`);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(mapComment);
};

export const getRelatedByApi = async (id: number): Promise<Book[]> => {
  if (!id) throw new Error("getRelatedByApi: invalid gallery id");
  const { data } = await api.get(`/gallery/${id}/related`);
  const arr = Array.isArray(data?.result) ? data.result : [];
  return arr.map(parseBookData);
};

export const getRelatedBooks = async (
  id: number,
  includeTags: TagFilter[] = [],
  excludeTags: TagFilter[] = []
): Promise<{ books: Book[] }> => {
  const passFilters = (b: Book) => {
    const tagKeys = new Set(b.tags.map((t) => `${t.type}:${t.name}`));
    for (const t of excludeTags) {
      if (tagKeys.has(`${t.type}:${t.name}`)) return false;
    }
    for (const t of includeTags) {
      if (!tagKeys.has(`${t.type}:${t.name}`)) return false;
    }
    return true;
  };

  try {
    const viaApi = (await getRelatedByApi(id)).filter((b) => b.id !== id);
    const filtered = viaApi.filter(passFilters);
    if (filtered.length) {
      return { books: filtered.slice(0, 12) };
    }
  } catch {}

  try {
    const book = await getBook(id);
    const first = book.tags[0]?.name ?? "";
    if (!first) return { books: [] };

    const { books } = await searchBooks({
      query: first,
      sort: "popular",
      includeTags,
      excludeTags,
    });

    return {
      books: books.filter((b) => b.id !== id && passFilters(b)).slice(0, 12),
    };
  } catch {
    return { books: [] };
  }
};

export const loadBookFromLocal = async (id: number): Promise<Book | null> => {
  const nhDir = `${FileSystem.documentDirectory}NHAppAndroid/`;
  if (!(await FileSystem.getInfoAsync(nhDir)).exists) return null;

  const titles = await FileSystem.readDirectoryAsync(nhDir);

  for (const title of titles) {
    const titleDir = `${nhDir}${title}/`;

    const idMatch = title.match(/^(\d+)_/);
    const titleId = idMatch ? Number(idMatch[1]) : null;

    const langs = await FileSystem.readDirectoryAsync(titleDir);
    for (const lang of langs) {
      const langDir = `${titleDir}${lang}/`;
      const metaUri = `${langDir}metadata.json`;

      if (!(await FileSystem.getInfoAsync(metaUri)).exists) continue;

      try {
        const raw = await FileSystem.readAsStringAsync(metaUri);
        const book: Book = JSON.parse(raw);

        if (book.id !== id) continue;
        if (titleId && titleId !== book.id) continue;

        const images = (await FileSystem.readDirectoryAsync(langDir))
          .filter((f) => f.startsWith("Image"))
          .sort();

        const pages: BookPage[] = await Promise.all(
          images.map(
            (img, idx) =>
              new Promise<BookPage>((res, rej) => {
                const uri = `${langDir}${img}`;
                Image.getSize(
                  uri,
                  (w, h) =>
                    res({
                      url: uri,
                      urlThumb: uri,
                      width: w,
                      height: h,
                      page: idx + 1,
                    }),
                  rej
                );
              })
          )
        );

        book.pages = pages;
        book.cover = pages[0].url;
        return book;
      } catch (e) {
        console.warn("Failed to load metadata:", e);
        continue;
      }
    }
  }

  return null;
};

export interface Paged<T> {
  items: T[];
  books: T[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  perPage?: number;
  [extra: string]: any;
}

export const getCoverVariants = (base: string, token: string): string[] => {
  switch (token) {
    case "j":
      return [`${base}.jpg`, `${base}.png`, `${base}.webp`];
    case "J":
      return [`${base}.jpg.webp`, `${base}.jpg`, `${base}.png`];
    case "p":
      return [`${base}.png`, `${base}.jpg`, `${base}.webp`];
    case "P":
      return [`${base}.png.webp`, `${base}.png`, `${base}.jpg`];
    case "w":
      return [`${base}.webp`, `${base}.jpg`, `${base}.png`];
    case "W":
      return [`${base}.webp.webp`, `${base}.webp`, `${base}.jpg`];
    case "g":
      return [`${base}.gif`, `${base}.jpg`];
    case "G":
      return [`${base}.gif.webp`, `${base}.gif`, `${base}.jpg`];
    default:
      return [`${base}.jpg`, `${base}.png`];
  }
};

const extByToken = (t: string): string => {
  switch (t) {
    case "J":
      return "jpg.webp";
    case "j":
      return "jpg";
    case "P":
      return "png.webp";
    case "p":
      return "png";
    case "W":
      return "webp.webp";
    case "w":
      return "webp";
    case "G":
      return "gif.webp";
    case "g":
      return "gif";
    default:
      throw new Error(`Unknown image token: ${t}`);
  }
};

const pickHost = (media: number, page: number): string => {
  const hosts = ["i1", "i2", "i3", "i4"];
  return hosts[(media + page) % hosts.length];
};

export interface TagFilter {
  type: Tag["type"];
  name: string;
}

export const parseBookData = (item: any): Book => {
  const media = item.media_id;
  const coverExt = extByToken(item.images.cover?.t || "j");
  const thumbExt = extByToken(item.images.thumbnail?.t || "j");

  const coverBase = `https://t3.nhentai.net/galleries/${media}/cover`;
  const thumbBase = `https://t3.nhentai.net/galleries/${media}/thumb`;

  const pages: BookPage[] = Array.from({ length: item.num_pages }, (_, i) => {
    const pageNum = i + 1;
    const img = item.images.pages[i] || {};
    const pageExt = extByToken(img.t || "j");
    const host = pickHost(media, pageNum);

    const pageBase = `https://${host}.nhentai.net/galleries/${media}/${pageNum}`;
    const pageBaseThumb = `https://t1.nhentai.net/galleries/${media}/${pageNum}t`;

    return {
      page: pageNum,
      url: `${pageBase}.${pageExt}`,
      urlThumb: `${pageBaseThumb}.${pageExt}`,
      width: img.w ?? 0,
      height: img.h ?? 0,
    };
  });

  const tags: Tag[] = item.tags || [];
  const filterTags = (type: string) => tags.filter((t) => t.type === type);

  return {
    id: Number(item.id),
    title: {
      english: item.title.english,
      japanese: item.title.japanese,
      pretty: item.title.pretty,
    },
    uploaded: item.upload_date
      ? new Date(item.upload_date * 1000).toISOString()
      : "",
    media,
    favorites: item.num_favorites,
    pagesCount: item.num_pages,
    scanlator: item.scanlator || "",
    tags,

    cover: `${coverBase}.${coverExt}`,
    coverW: item.images.cover?.w ?? 0,
    coverH: item.images.cover?.h ?? 0,

    thumbnail: `${thumbBase}.${thumbExt}`,
    pages,

    artists: filterTags("artist"),
    characters: filterTags("character"),
    parodies: filterTags("parody"),
    groups: filterTags("group"),
    categories: filterTags("category"),
    languages: filterTags("language"),

    raw: item,
  };
};

export const getBook = async (id: number): Promise<Book> =>
  parseBookData((await api.get(`/gallery/${id}`)).data);

export const getBookPages = async (
  id: number,
  startPage: number,
  endPage: number
): Promise<{ pages: Book["pages"]; totalPages: number }> => {
  if (!id || !startPage || !endPage) throw new Error("Invalid parameters");
  const { data } = await api.get(`/gallery/${id}`);
  const book = parseBookData(data);
  return {
    pages: book.pages.slice(startPage - 1, endPage),
    totalPages: book.pagesCount,
  };
};

export const getFavorites = async (params: {
  ids: number[];
  sort?: "relevance" | "popular";
  page?: number;
  perPage?: number;
}): Promise<Paged<Book>> => {
  const { ids, sort = "relevance", page = 1, perPage = 24 } = params;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Ids array required");
  }

  const promises = ids.map((id) =>
    api
      .get(`/gallery/${id}`)
      .then((res) => parseBookData(res.data))
      .catch(() => null)
  );
  const all = (await Promise.all(promises)).filter(Boolean) as Book[];

  let sorted = all;
  if (sort === "popular") {
    sorted = [...all].sort((a: Book, b: Book) => b.favorites - a.favorites);
  }

  const start = (page - 1) * perPage;
  const paged = sorted.slice(start, start + perPage);

  return {
    items: paged,
    books: paged,
    totalPages: Math.max(1, Math.ceil(sorted.length / perPage)),
    currentPage: page,
    totalItems: sorted.length,
    perPage,
  };
};

interface SearchParams {
  query?: string;
  sort?: string;
  page?: number;
  perPage?: number;
  includeTags?: TagFilter[];
  excludeTags?: TagFilter[];
  filterTags?: TagFilter[];
  contentType?: "new" | "popular" | "";
}

export const searchBooks = async (
  params: SearchParams = {}
): Promise<Paged<Book>> => {
  const {
    query = "",
    sort = "",
    page = 1,
    perPage = 24,
    includeTags = params.filterTags ?? [],
    excludeTags = [],
    contentType = "",
  } = params;

  const includePart = includeTags.length
    ? includeTags
        .map((t) => `${t.type.replace(/s$/, "")}:"${t.name}"`)
        .join(" ")
    : "";
  const excludePart = excludeTags.length
    ? excludeTags
        .map((t) => `-${t.type.replace(/s$/, "")}:"${t.name}"`)
        .join(" ")
    : "";
  const nhQuery = `${query.trim()} ${includePart} ${excludePart}`.trim() || " ";

  const allowedSorts = [
    "popular",
    "popular-week",
    "popular-today",
    "popular-month",
    "date",
  ];
  const realSort =
    contentType === "new"
      ? "date"
      : contentType === "popular" && !allowedSorts.includes(sort as any)
      ? "popular"
      : sort;

  const effectivePerPage = Math.min(perPage || 24, 100);
  const { data } = await api.get("/galleries/search", {
    params: {
      query: nhQuery,
      page: +page || 1,
      per_page: effectivePerPage,
      sort: realSort,
    },
  });

  const books = data.result.map(parseBookData) as Book[];
  const totalPages = data.num_pages || 1;
  const totalItems = data.total || books.length;

  if (totalItems > effectivePerPage && books.length < totalItems) {
    const remainingPages = Math.ceil(
      (totalItems - books.length) / effectivePerPage
    );
    const additionalPages = await Promise.all(
      Array.from({ length: remainingPages }, (_, i) =>
        api.get("/galleries/search", {
          params: {
            query: nhQuery,
            page: page + i + 1,
            per_page: effectivePerPage,
            sort: realSort,
          },
        })
      )
    );
    additionalPages.forEach(({ data }) => {
      books.push(...data.result.map(parseBookData));
    });
  }

  return {
    items: books,
    books,
    totalPages,
    currentPage: +page || 1,
    perPage: effectivePerPage,
    totalItems,
  };
};

const siteBase =
  Platform.OS === "web"
    ? corsProxy + "https://nhentai.net"
    : "https://nhentai.net";

async function getRandomId(): Promise<number> {
  try {
    const res = await axios.get(siteBase + "/random", {
      transformResponse: (r) => r,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const loc =
      (res.headers && (res.headers.location as string)) ||
      (res.request && res.request.responseURL) ||
      "";

    const finalUrl = String(
      loc || (res as any).request?.responseURL || ""
    ).trim();
    if (!finalUrl) throw new Error("Random: no redirect URL");

    const m = finalUrl.match(/\/g\/(\d+)\//);
    if (m?.[1]) return Number(m[1]);

    const html = typeof res.data === "string" ? res.data : "";
    const mc =
      html.match(/rel=["']canonical["'][^>]*href=["'][^"']*\/g\/(\d+)\//i) ||
      html.match(/property=["']og:url["'][^>]*content=["'][^"']*\/g\/(\d+)\//i);
    if (mc?.[1]) return Number(mc[1]);

    throw new Error("Random: failed to extract gallery id");
  } catch (e) {
    throw new Error(
      `getRandomId failed: ${(e as Error)?.message || String(e)}`
    );
  }
}

export const getRandomBook = async (): Promise<Book> => {
  const id = await getRandomId();
  return getBook(id);
};

import tagsDb from "./nhentai-tags.json";
export const getTags = async (): Promise<{
  tags: typeof tagsDb;
  updated: string;
}> => {
  return { tags: tagsDb as any, updated: (tagsDb as any).updated ?? "" };
};

export interface RecommendParams {
  ids: number[];
  sentIds?: number[];
  page?: number;
  perPage?: number;
  includeTags?: TagFilter[];
  excludeTags?: TagFilter[];
  filterTags?: TagFilter[];
  randomSeed?: number;
}

const KNOWN_BUCKETS = [
  "artist",
  "parody",
  "group",
  "category",
  "character",
] as const;
type Bucket = (typeof KNOWN_BUCKETS)[number] | "tag";
const TAG_W: Record<Bucket, number> = {
  character: 4,
  artist: 3,
  parody: 2,
  group: 2,
  category: 1.5,
  tag: 1,
};
const blankFreq = () => Object.create(null) as Record<string, number>;
const bucketOf = (t: Tag["type"]): Bucket =>
  KNOWN_BUCKETS.includes(t as any) ? (t as Bucket) : "tag";

export interface CandidateBook extends Book {
  isExploration?: boolean;
}

export async function getRecommendations(
  p: RecommendParams
): Promise<
  Paged<CandidateBook & { explain: string[]; score: number }> & { debug: any }
> {
  const {
    ids,
    sentIds = [],
    page = 1,
    perPage = 24,
    includeTags = p.filterTags ?? [],
    excludeTags = [],
    randomSeed = Date.now(),
  } = p;
  if (!ids.length) throw new Error("Ids array required");

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const freq: Record<Bucket, Record<string, number>> = {
    character: blankFreq(),
    artist: blankFreq(),
    parody: blankFreq(),
    group: blankFreq(),
    category: blankFreq(),
    tag: blankFreq(),
  };

  const likedBooks = (await Promise.all(ids.map(getBook))).filter(
    Boolean
  ) as Book[];
  likedBooks.forEach((b) =>
    b.tags.forEach((t) => {
      const bkt = bucketOf(t.type);
      freq[bkt][t.name] = (freq[bkt][t.name] ?? 0) + 1;
    })
  );

  const calcTagWeight = (
    bucket: Bucket,
    tag: string,
    isRare: boolean
  ): number => {
    const base = TAG_W[bucket] ?? 1;
    const count = freq[bucket][tag] ?? 0;
    const totalTags = Object.keys(freq[bucket]).length;
    const variance = totalTags > 1 ? 1 / Math.sqrt(totalTags) : 1;
    const rarityBonus = isRare ? 1.5 : 1;
    return (
      base * (count > 0 ? Math.pow(count, 1.2) : 0.7) * variance * rarityBonus
    );
  };

  const topN = (m: Record<string, number>, n = 5) =>
    Object.entries(m)
      .sort(([, v1], [, v2]) => v2 - v1)
      .slice(0, n)
      .map(([k]) => k);
  const rareN = (m: Record<string, number>, n = 5) =>
    Object.entries(m)
      .filter(([, v]) => v <= 2)
      .slice(0, n)
      .map(([k]) => k);

  const topChars = topN(freq.character, 8);
  const topArts = topN(freq.artist, 6);
  const topTags = topN(freq.tag, 12);
  const rareTags = rareN(freq.tag, 8);
  const rareChars = rareN(freq.character, 5);

  const favQueries = [
    ...topChars.map((c) => `character:"${c}"`),
    ...topArts.map((a) => `artist:"${a}"`),
    ...topChars
      .slice(0, 3)
      .flatMap((c, i) =>
        topArts[i] ? [`character:"${c}" artist:"${topArts[i]}"`] : []
      ),
    ...rareChars.map((c) => `character:"${c}"`),
  ];
  const tagQueries = [
    topTags.join(" "),
    ...topTags.slice(0, 6).map((t) => `"${t}"`),
    ...rareTags.map((t) => `"${t}"`),
  ];

  const includePart = includeTags.length
    ? includeTags
        .map((t) => `${t.type.replace(/s$/, "")}:"${t.name}"`)
        .join(" ")
    : "";
  const withFilter = (arr: string[]) =>
    includePart ? arr.map((q) => `${includePart} ${q}`) : arr;

  const excludeIds = new Set(sentIds);
  const candidates = new Map<number, CandidateBook>();
  const fetchPage = async (q: string, pN: number) =>
    searchBooks({ query: q, sort: "popular", page: pN, perPage })
      .then((r) => r.books)
      .catch(() => [] as Book[]);

  const grab = async (queries: string[], isExploration = false) => {
    const uniqueQueries = [...new Set(queries)];
    await Promise.all(
      [1, 2, 3, 4].map((pn) =>
        Promise.all(uniqueQueries.map((q) => fetchPage(q, pn)))
      )
    ).then((pages) =>
      pages.flat(2).forEach((b) => {
        if (
          !excludeIds.has(b.id) &&
          !candidates.has(b.id) &&
          candidates.size < perPage * 15
        ) {
          candidates.set(b.id, { ...b, isExploration });
        }
      })
    );
  };

  await grab(withFilter(favQueries));
  await grab(withFilter(tagQueries), true);

  const clusterBooks = (
    books: (CandidateBook & { score: number; explain: string[] })[]
  ) => {
    const clusters: Record<string, typeof books> = {};
    books.forEach((book) => {
      const primaryTag =
        book.tags.find((t) => t.type === "character" || t.type === "tag")
          ?.name || "other";
      clusters[primaryTag] = clusters[primaryTag] || [];
      clusters[primaryTag].push(book);
    });

    const result: typeof books = [];
    const maxPerCluster = 3;
    Object.values(clusters).forEach((cluster) => {
      shuffleArray(cluster, randomSeed);
      result.push(...cluster.slice(0, maxPerCluster));
    });
    return result;
  };

  const likedSet = new Set(ids);
  const required = new Set(includeTags.map((t) => `${t.type}:${t.name}`));
  const forbidden = new Set(excludeTags.map((t) => `${t.type}:${t.name}`));
  const scored: (CandidateBook & { explain: string[]; score: number })[] = [
    ...candidates.values(),
  ].flatMap((book) => {
    const tagKeys = new Set(book.tags.map((t) => `${t.type}:${t.name}`));

    for (const f of forbidden) if (tagKeys.has(f)) return [];
    for (const r of required) if (!tagKeys.has(r)) return [];

    let score = book.favorites / 10_000;
    const explain: string[] = [];

    if (likedSet.has(book.id)) {
      score *= 0.4;
      explain.push("<i>демотирован лайком (×0.4)</i>");
    }

    if (book.isExploration) {
      score *= 0.75;
      explain.push(
        "<i>экспериментальная рекомендация для разнообразия (×0.75)</i>"
      );
    }

    book.tags.forEach((t) => {
      const bkt = bucketOf(t.type);
      const cnt = freq[bkt][t.name] ?? 0;
      const isRare = cnt <= 2 && cnt > 0;
      const add = calcTagWeight(bkt, t.name, isRare);
      score += add;
      const label =
        bkt === "tag" ? "Tag" : `${bkt.charAt(0).toUpperCase()}${bkt.slice(1)}`;
      explain.push(
        `${label} <b>${t.name}</b> встречался в ${cnt || 1} избранных${
          isRare ? ", редкий" : ""
        } — +${add.toFixed(2)}`
      );
    });

    return [{ ...book, score, explain }];
  });

  const shuffleArray = <T>(array: T[], seed: number) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const diversified = clusterBooks(scored.sort((a, b) => b.score - a.score));

  shuffleArray(diversified, randomSeed);

  const start = (page - 1) * perPage;
  const pageItems = diversified.slice(start, start + perPage);

  return {
    items: pageItems,
    books: pageItems,
    totalPages: Math.max(1, Math.ceil(diversified.length / perPage)),
    currentPage: page,
    totalItems: diversified.length,
    perPage,
    debug: {
      freq,
      topChars,
      topArts,
      topTags,
      rareTags,
      rareChars,
      favQueries: withFilter(favQueries),
      tagQueries: withFilter(tagQueries),
      includeTags,
      excludeTags,
      candidateCount: candidates.size,
      seed: randomSeed,
    },
  };
}
