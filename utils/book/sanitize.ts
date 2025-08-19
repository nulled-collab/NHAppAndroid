export const sanitize = (s: string) => s.replace(/[^a-z0-9_\-]+/gi, "_");
