import type { ContentBlock, SourceSnapshot, SourceType } from "@classmate/contracts";

export type SiteFamily =
  | "wikipedia"
  | "mdn"
  | "w3schools"
  | "geeksforgeeks"
  | "github"
  | "stackoverflow"
  | "medium"
  | "research_paper"
  | "documentation"
  | "html_article"
  | "pdf"
  | "youtube"
  | "lms"
  | "generic";

export type RawBlockType = ContentBlock["type"];

export interface RawBlock {
  type: RawBlockType;
  text: string;
  headingPath: readonly string[];
  language?: string | undefined;
}

export interface ExtractedLink {
  href: string;
  text: string;
  external: boolean;
}

export interface ExtractedImage {
  src: string;
  alt: string;
  title?: string | undefined;
}

export interface ExtractedCitation {
  id: string;
  text: string;
  href?: string | undefined;
  blockId?: string | undefined;
}

export interface ExtractedHeading {
  text: string;
  path: readonly string[];
}

export interface ReadabilityMetrics {
  score: number;
  label: "easy" | "standard" | "difficult";
  sentenceCount: number;
  averageWordsPerSentence: number;
}

export interface ExtractionMetadata {
  siteFamily: SiteFamily;
  sourceType: SourceType;
  title: string;
  url: string;
  language: string;
  author?: string | undefined;
  description?: string | undefined;
  keywords: readonly string[];
  headings: readonly ExtractedHeading[];
  readingTimeMinutes: number;
  readability: ReadabilityMetrics;
  wordCount: number;
  links: readonly ExtractedLink[];
  images: readonly ExtractedImage[];
  citations: readonly ExtractedCitation[];
  canonicalUrl?: string | undefined;
  publishedAt?: string | undefined;
}

export interface NormalizedDocument {
  title: string;
  url: string;
  language: string;
  blocks: readonly RawBlock[];
  metadata: ExtractionMetadata;
}

export interface ExtractionInput {
  url: string;
  title: string;
  html: string;
  language?: string | undefined;
  selection?: string | undefined;
  scope: SourceSnapshot["scope"];
}

export interface ExtractionResult {
  snapshot: SourceSnapshot;
  metadata: ExtractionMetadata;
  document: NormalizedDocument;
}

export interface SourceChunk {
  id: string;
  sourceId: string;
  text: string;
  headingPath: readonly string[];
  startOffset: number;
  endOffset: number;
  estimatedTokens: number;
  blockIds: readonly string[];
  semanticType: RawBlockType | "mixed";
  metadata: {
    wordCount: number;
    contentTypes: readonly RawBlockType[];
    citationId: string;
  };
  sectionTitle?: string | undefined;
}

export interface PdfPageInput {
  pageNumber: number;
  text: string;
}

export interface YoutubeSegmentInput {
  text: string;
  startMs: number;
  durationMs?: number | undefined;
}

export interface OcrRegionInput {
  text: string;
  confidence?: number | undefined;
  boundingBox?: readonly [number, number, number, number] | undefined;
}
