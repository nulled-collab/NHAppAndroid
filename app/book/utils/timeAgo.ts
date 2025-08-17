export const timeAgo = (d: string | number) => {
  const t = typeof d === "string" ? Date.parse(d) : d * 1000;
  const s = Math.floor((Date.now() - t) / 1000);
  const tbl: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [u, n] of tbl) {
    if (s >= n) {
      const v = Math.floor(s / n);
      return `${v} ${u}${v > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
};
