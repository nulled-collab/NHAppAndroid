import type { Book } from "@/api/nhentai";
import { GalleryComment, getComments, getRelatedBooks } from "@/api/nhentai";
import { useCallback, useEffect, useState } from "react";
import { InteractionManager } from "react-native";

export const useRelatedComments = (book: Book | null) => {
  const [related, setRelated] = useState<Book[]>([]);
  const [relLoading, setRelLoading] = useState(false);

  const [allComments, setAllComments] = useState<GalleryComment[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [cmtLoading, setCmtLoading] = useState(false);

  const refetchRelated = useCallback(async () => {
    if (!book) return;
    try {
      setRelLoading(true);
      const r = await getRelatedBooks(book.id);
      setRelated(r.books.slice(0, 5));
    } catch {
      setRelated([]);
    } finally {
      setRelLoading(false);
    }
  }, [book?.id]);

  const refetchComments = useCallback(async () => {
    if (!book) return;
    try {
      setCmtLoading(true);
      const cs = await getComments(book.id);
      setAllComments(cs);
      setVisibleCount(20);
    } catch {
      setAllComments([]);
      setVisibleCount(0);
    } finally {
      setCmtLoading(false);
    }
  }, [book?.id]);

  useEffect(() => {
    if (!book) return;
    const task = InteractionManager.runAfterInteractions(() => {
      refetchRelated();
      refetchComments();
    });
    return () => task.cancel();
  }, [book?.id, refetchRelated, refetchComments]);

  return {
    related,
    relLoading,
    refetchRelated,
    allComments,
    visibleCount,
    setVisibleCount,
    cmtLoading,
    refetchComments,
  };
};
