/** Вернуть список альтернативных URL для одной и той же картинки.
 *  Берём исходный `url`, убираем расширение и подставляем варианты. */
export const buildImageFallbacks = (url: string): string[] => {
  const m = url.match(/^(.*)\.(jpg|png|webp|gif)(\.webp)?$/i);
  if (!m) return [url];               // не удалось распарсить
  const base = m[1];
  /** Порядок приоритета: исходное → jpg → png → webp → gif. */
  const exts = ["jpg", "png", "webp", "gif"];
  /* если было двойное расширение `.jpg.webp` — оставляем оба */
  const orig = m.slice(2).filter(Boolean).join(".");
  return [orig, ...exts]
    .filter((e, i, self) => self.indexOf(e) === i) // убрать дубли
    .map((ext) => `${base}.${ext}`);
};
