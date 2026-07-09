import type { ExtractionInput, NormalizedDocument, SiteFamily } from "../types";

export interface Extractor {
  readonly id: SiteFamily;
  canHandle(siteFamily: SiteFamily): boolean;
  extractRootSelector(): string;
  postProcess?(document: NormalizedDocument): NormalizedDocument;
}

export interface ExtractorContext {
  input: ExtractionInput;
  siteFamily: SiteFamily;
}

export const GENERIC_EXTRACTOR: Extractor = {
  id: "generic",
  canHandle: () => true,
  extractRootSelector: () => "main, article, [role='main'], .content, #content, body",
};

export const SITE_EXTRACTORS: readonly Extractor[] = [
  { id: "wikipedia", canHandle: (f) => f === "wikipedia", extractRootSelector: () => ".mw-parser-output, #mw-content-text, #bodyContent, main, article" },
  { id: "mdn", canHandle: (f) => f === "mdn", extractRootSelector: () => "main, article, .main-page-content, .section-content" },
  { id: "w3schools", canHandle: (f) => f === "w3schools", extractRootSelector: () => "#main, .w3-main, .w3-container, main, article" },
  { id: "geeksforgeeks", canHandle: (f) => f === "geeksforgeeks", extractRootSelector: () => "article, .text, .entry-content, .article--container, main" },
  { id: "github", canHandle: (f) => f === "github", extractRootSelector: () => "article.markdown-body, .repository-content, [data-testid='readme-content']" },
  { id: "stackoverflow", canHandle: (f) => f === "stackoverflow", extractRootSelector: () => "#question, .question, .answercell, .s-prose" },
  { id: "medium", canHandle: (f) => f === "medium", extractRootSelector: () => "article, main" },
  { id: "research_paper", canHandle: (f) => f === "research_paper", extractRootSelector: () => "article, main, .ltx_document" },
  { id: "documentation", canHandle: (f) => f === "documentation", extractRootSelector: () => "main, article, .docs-content, .markdown-body" },
  { id: "html_article", canHandle: (f) => f === "html_article", extractRootSelector: () => "article, main, [role='main']" },
  { id: "lms", canHandle: (f) => f === "lms", extractRootSelector: () => "main, #content, .course-content" },
  GENERIC_EXTRACTOR,
];

export function resolveExtractor(siteFamily: SiteFamily): Extractor {
  return SITE_EXTRACTORS.find((extractor) => extractor.canHandle(siteFamily)) ?? GENERIC_EXTRACTOR;
}
