type Locale = "en" | "ru" | "zhCN" | "ja";

const translations: Record<
  Locale,
  {
    units: Record<string, string[]>;
    justNow: string;
    ago: string;
  }
> = {
  en: {
    units: {
      year: ["year", "years"],
      month: ["month", "months"],
      day: ["day", "days"],
      hour: ["hour", "hours"],
      minute: ["minute", "minutes"],
      second: ["second", "seconds"],
    },
    justNow: "just now",
    ago: "ago",
  },
  ru: {
    units: {
      year: ["год", "года", "лет"],
      month: ["месяц", "месяца", "месяцев"],
      day: ["день", "дня", "дней"],
      hour: ["час", "часа", "часов"],
      minute: ["минута", "минуты", "минут"],
      second: ["секунда", "секунды", "секунд"],
    },
    justNow: "только что",
    ago: "назад",
  },
  zhCN: {
    units: {
      year: ["年", "年"],
      month: ["个月", "个月"],
      day: ["天", "天"],
      hour: ["小时", "小时"],
      minute: ["分钟", "分钟"],
      second: ["秒", "秒"],
    },
    justNow: "刚刚",
    ago: "前",
  },
  ja: {
    units: {
      year: ["年", "年"],
      month: ["ヶ月", "ヶ月"],
      day: ["日", "日"],
      hour: ["時間", "時間"],
      minute: ["分", "分"],
      second: ["秒", "秒"],
    },
    justNow: "たった今",
    ago: "前",
  },
};

function pluralRu(n: number, forms: string[]) {
  return forms[
    n % 10 === 1 && n % 100 !== 11
      ? 0
      : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)
      ? 1
      : 2
  ];
}

export const timeAgo = (d: string | number, locale: Locale = "en") => {
  const t = typeof d === "string" ? Date.parse(d) : d * 1000;
  const s = Math.floor((Date.now() - t) / 1000);

  const tbl: [keyof (typeof translations)["en"]["units"], number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  const tr = translations[locale];

  for (const [u, n] of tbl) {
    if (s >= n) {
      const v = Math.floor(s / n);
      if (locale === "ru") {
        return `${v} ${pluralRu(v, tr.units[u])} ${tr.ago}`;
      } else if (locale === "zhCN" || locale === "ja") {
        return `${v}${tr.units[u][0]}${tr.ago}`;
      } else {
        return `${v} ${tr.units[u][v > 1 ? 1 : 0]} ${tr.ago}`;
      }
    }
  }
  return tr.justNow;
};
