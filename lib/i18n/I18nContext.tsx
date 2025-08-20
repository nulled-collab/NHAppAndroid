import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

// где лежат JSON словари (подключаются статически, чтобы Metro их упаковал)
const dictionaries: Record<string, any> = {
  en: require("@/assets/i18n/en.json"),
  ru: require("@/assets/i18n/ru.json"),
};

export type AppLocale = "system" | "en" | "ru";
const LANG_KEY = "app_language";

function normalizeDeviceLocale(): "en" | "ru" {
  const tag = (
    Localization.getLocales?.()[0]?.languageCode || "en"
  ).toLowerCase();
  if (tag.startsWith("ru") || tag === "uk" || tag === "be") return "ru"; // дружественный fallback
  return "en";
}

type I18nValue = {
  locale: AppLocale;
  resolved: "en" | "ru" | "zhCN" | "ja";
  setLocale: (l: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  available: { code: AppLocale; label: string }[];
};

const I18nCtx = createContext<I18nValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocale] = useState<AppLocale>("system");
  const resolved = useMemo(
    () => (locale === "system" ? normalizeDeviceLocale() : locale),
    [locale]
  );

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved === "en" || saved === "ru" || saved === "system")
          setLocale(saved);
      } catch {}
    })();
  }, []);

  const dict = dictionaries[resolved] || dictionaries.en;
  const fallback = dictionaries.en;

  const t = useMemo(
    () => (key: string, params?: Record<string, string | number>) => {
      const direct = (o: any, k: string) =>
        o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined;

      // 1) пробуем точный ключ "settings.section.appearance"
      // 2) если нет — ищем по пути "settings" → "section" → "appearance"
      const raw =
        direct(dict, key) ??
        get(dict, key) ??
        direct(fallback, key) ??
        get(fallback, key) ??
        key;

      if (!params) return String(raw);
      return String(raw).replace(/\{(\w+)\}/g, (_, name) =>
        String(params[name] ?? "")
      );
    },
    [dict, fallback]
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      resolved,
      setLocale: (l) => {
        setLocale(l);
        AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
      },
      t,
      available: [
        { code: "system", label: t("settings.language.system") },
        { code: "en", label: t("settings.language.english") },
        { code: "ru", label: t("settings.language.russian") },
      ],
    }),
    [locale, resolved, t]
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
};

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

// утилита dot-path
function get(obj: any, path: string): any {
  return path
    .split(".")
    .reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
}
