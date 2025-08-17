import type { Book } from "@/api/nhentai";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, ToastAndroid } from "react-native";
import { sanitize } from "../utils/sanitize";
import { useThrottle } from "../utils/useThrottle";

// Скачивание/удаление локальной книги + прогресс
export const useDownload = (
  book: Book | null,
  local: boolean,
  setLocal: (v: boolean) => void,
  setBook: (updater: any) => void
) => {
  const router = useRouter();
  const [dl, setDL] = useState(false);
  const [pr, setPr] = useState(0);
  const setPrThrottled = useThrottle((v: number) => setPr(v), 120);

  const handleDownloadOrDelete = useCallback(async () => {
    if (!book || dl) return;

    const lang = book.languages?.[0]?.name ?? "Unknown";
    const title = sanitize(book.title.pretty);
    const dir = `${FileSystem.documentDirectory}NHAppAndroid/${book.id}_${title}/${sanitize(lang)}/`;

    setDL(true);
    setPr(0);

    try {
      if (local) {
        // Поиск и удаление существующей локальной папки книги
        const nhDir = `${FileSystem.documentDirectory}NHAppAndroid/`;
        const titles = await FileSystem.readDirectoryAsync(nhDir);

        for (const t of titles) {
          const titleDir = `${nhDir}${t}/`;
          const langs = await FileSystem.readDirectoryAsync(titleDir);
          for (const l of langs) {
            const langDir = `${titleDir}${l}/`;
            const metaUri = `${langDir}metadata.json`;
            const info = await FileSystem.getInfoAsync(metaUri);
            if (!info.exists) continue;
            try {
              const raw = await FileSystem.readAsStringAsync(metaUri);
              const meta = JSON.parse(raw);
              if (meta.id !== book.id) continue;
              await FileSystem.deleteAsync(titleDir, { idempotent: true });
              if (Platform.OS === "android")
                ToastAndroid.show("Deleted", ToastAndroid.SHORT);
              setLocal(false);
              setBook(null);
              router.back();
              return;
            } catch {}
          }
        }
        if (Platform.OS === "android")
          ToastAndroid.show("Book not found locally", ToastAndroid.SHORT);
        return;
      }

      // Скачивание страниц
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const total = book.pages.length;
      const pagesCopy = [...book.pages];

      for (let i = 0; i < total; i++) {
        const p = pagesCopy[i];
        const num = (i + 1).toString().padStart(3, "0");
        const ext = p.url.split(".").pop()!.split("?")[0];
        const uri = `${dir}Image${num}.${ext}`;

        const exists = (await FileSystem.getInfoAsync(uri)).exists;
        if (!exists) await FileSystem.downloadAsync(p.url, uri);

        pagesCopy[i] = { ...p, url: uri, urlThumb: uri };
        if ((i & 3) === 3) setPrThrottled((i + 1) / total);
      }

      await FileSystem.writeAsStringAsync(
        `${dir}metadata.json`,
        JSON.stringify({ ...book, pages: pagesCopy }),
        { encoding: "utf8" }
      );

      setBook((prev: any) => (prev ? { ...prev, pages: pagesCopy } : prev));
      setPr(1);
      if (Platform.OS === "android") ToastAndroid.show("Saved", ToastAndroid.SHORT);
      setLocal(true);
    } catch (e) {
      console.error(e);
      if (Platform.OS === "android") ToastAndroid.show("Error", ToastAndroid.LONG);
    } finally {
      setDL(false);
      setTimeout(() => setPr(0), 150);
    }
  }, [book, dl, local, router, setLocal, setBook, setPrThrottled]);

  return { dl, pr, handleDownloadOrDelete };
};
