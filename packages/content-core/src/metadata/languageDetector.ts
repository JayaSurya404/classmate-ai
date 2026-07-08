import { collapseWhitespace } from "../cleaners";

const LANGUAGE_ALIASES = new Map<string, string>([
  ["en-us", "en"],
  ["en-gb", "en"],
  ["pt-br", "pt"],
  ["zh-cn", "zh"],
  ["zh-tw", "zh"],
]);

export function normalizeLanguageTag(value?: string | null): string {
  const cleaned = collapseWhitespace(value ?? "").toLowerCase();
  if (!cleaned) return "und";
  const primary = cleaned.split(/[_-]/).filter(Boolean).slice(0, 2).join("-");
  return LANGUAGE_ALIASES.get(primary) ?? primary.split("-")[0] ?? "und";
}

export function detectLanguage(text: string, declared?: string | null): string {
  const normalizedDeclared = normalizeLanguageTag(declared);
  if (normalizedDeclared !== "und") return normalizedDeclared;

  const sample = text.slice(0, 10_000);
  if (/[\u0900-\u097F]/u.test(sample)) return "hi";
  if (/[\u0980-\u09FF]/u.test(sample)) return "bn";
  if (/[\u0B80-\u0BFF]/u.test(sample)) return "ta";
  if (/[\u0C00-\u0C7F]/u.test(sample)) return "te";
  if (/[\u0600-\u06FF]/u.test(sample)) return "ar";
  if (/[\u0400-\u04FF]/u.test(sample)) return "ru";
  if (/[\u4E00-\u9FFF]/u.test(sample)) return "zh";
  if (/[\u3040-\u30FF]/u.test(sample)) return "ja";
  if (/[\uAC00-\uD7AF]/u.test(sample)) return "ko";
  if (/[A-Za-z]/.test(sample)) return "en";
  return "und";
}
