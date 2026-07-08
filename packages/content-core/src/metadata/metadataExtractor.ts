import { collapseWhitespace } from "../cleaners";
import type {
  ExtractedCitation,
  ExtractedImage,
  ExtractedLink,
  ExtractionMetadata,
  RawBlock,
  SiteFamily,
} from "../types";
import type { SourceType } from "@classmate/contracts";
import { detectLanguage } from "./languageDetector";
import { calculateReadability } from "./readability";
import { countWords, estimateReadingTimeMinutes } from "../utils/tokens";

export interface MetadataExtractionContext {
  document: Document;
  url: string;
  title: string;
  siteFamily: SiteFamily;
  sourceType: SourceType;
  blocks: readonly RawBlock[];
  language?: string | undefined;
}

export function extractMetadata(context: MetadataExtractionContext): ExtractionMetadata {
  const { document, url, blocks } = context;
  const fullText = blocks.map((block) => block.text).join("\n\n");
  const wordCount = countWords(fullText);
  const language = detectLanguage(
    fullText,
    context.language ?? document.documentElement.getAttribute("lang"),
  );

  return {
    siteFamily: context.siteFamily,
    sourceType: context.sourceType,
    title: extractTitle(document, context.title),
    url,
    language,
    author: extractAuthor(document),
    description: metaContent(document, 'meta[name="description"]') ?? metaProperty(document, "og:description"),
    keywords: extractKeywords(document),
    headings: extractHeadings(blocks),
    readingTimeMinutes: estimateReadingTimeMinutes(wordCount),
    readability: calculateReadability(fullText),
    wordCount,
    links: extractLinks(document, url),
    images: extractImages(document, url),
    citations: extractCitations(document),
    canonicalUrl: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? url.split("#")[0],
    publishedAt:
      metaProperty(document, "article:published_time") ??
      metaContent(document, 'meta[name="citation_publication_date"]') ??
      metaContent(document, 'meta[property="article:published_time"]'),
  };
}

function extractTitle(document: Document, fallback: string): string {
  return (
    metaProperty(document, "og:title") ??
    document.querySelector("h1")?.textContent?.trim() ??
    document.title.trim() ??
    fallback
  );
}

function metaContent(document: Document, selector: string): string | undefined {
  const value = document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
  return value || undefined;
}

function metaProperty(document: Document, property: string): string | undefined {
  const value = document
    .querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
    ?.content?.trim();
  return value || undefined;
}

function extractAuthor(document: Document): string | undefined {
  return (
    metaContent(document, 'meta[name="author"]') ??
    metaProperty(document, "article:author") ??
    metaContent(document, 'meta[name="citation_author"]') ??
    document.querySelector("[rel='author']")?.textContent?.trim() ??
    document.querySelector(".author, .byline, [itemprop='author']")?.textContent?.trim()
  );
}

function extractKeywords(document: Document): readonly string[] {
  const raw =
    metaContent(document, 'meta[name="keywords"]') ??
    metaContent(document, 'meta[name="news_keywords"]');
  if (!raw) return [];
  return raw
    .split(",")
    .map((keyword) => collapseWhitespace(keyword))
    .filter(Boolean)
    .slice(0, 20);
}

function extractLinks(document: Document, baseUrl: string): readonly ExtractedLink[] {
  const seen = new Set<string>();
  const links: ExtractedLink[] = [];

  document.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    let absolute = href;
    try {
      absolute = new URL(href, baseUrl).href;
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    const text = collapseWhitespace(anchor.textContent ?? "") || absolute;
    links.push({
      href: absolute,
      text,
      external: !absolute.startsWith(new URL(baseUrl).origin),
    });
  });

  return links.slice(0, 200);
}

function extractImages(document: Document, baseUrl: string): readonly ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const seen = new Set<string>();

  document.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    let absolute = src;
    try {
      absolute = new URL(src, baseUrl).href;
    } catch {
      return;
    }
    if (seen.has(absolute)) return;
    seen.add(absolute);
    images.push({
      src: absolute,
      alt: img.getAttribute("alt")?.trim() ?? "",
      title: img.getAttribute("title")?.trim() ?? undefined,
    });
  });

  return images.slice(0, 100);
}

function extractHeadings(blocks: readonly RawBlock[]): ExtractionMetadata["headings"] {
  return blocks
    .filter((block) => block.type === "heading")
    .map((block) => ({ text: block.text, path: block.headingPath }))
    .slice(0, 200);
}

function extractCitations(document: Document): readonly ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];

  document.querySelectorAll("cite, .citation, .references li, ol.references li").forEach((node, index) => {
    const text = collapseWhitespace(node.textContent ?? "");
    if (!text || text.length < 4) return;
    const href = node.querySelector("a")?.href;
    citations.push({
      id: `ref-${String(index + 1)}`,
      text: text.slice(0, 500),
      href: href ?? undefined,
    });
  });

  return citations.slice(0, 100);
}
