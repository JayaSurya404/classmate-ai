import type { SourceSnapshot } from "@classmate/contracts";
import {
  extractFromImageOcr,
  extractFromPdfPages,
  extractFromYoutubePageData,
} from "./futurePipelines";
import type { ExtractionResult, OcrRegionInput, PdfPageInput, YoutubeSegmentInput } from "../types";

export interface PdfDocumentInput {
  url: string;
  title: string;
  pages: readonly PdfPageInput[];
  metadata?: Readonly<Record<string, string>> | undefined;
  outline?: readonly PdfOutlineItem[] | undefined;
  bookmarks?: readonly PdfBookmarkInput[] | undefined;
}

export interface PdfOutlineItem {
  title: string;
  pageNumber: number;
  children?: readonly PdfOutlineItem[] | undefined;
}

export interface PdfBookmarkInput {
  id: string;
  pageNumber: number;
  label: string;
}

export interface PdfDocumentExtraction {
  document: ExtractionResult;
  pages: readonly ExtractionResult[];
  outline: readonly PdfOutlineItem[];
  bookmarks: readonly PdfBookmarkInput[];
}

export interface OcrImageInput {
  url: string;
  title: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "application/pdf";
  width?: number | undefined;
  height?: number | undefined;
  regions: readonly OcrRegionInput[];
}

export interface YoutubeVideoInput {
  url: string;
  title: string;
  description?: string | undefined;
  author?: string | undefined;
  durationSeconds?: number | undefined;
  publishedAt?: string | undefined;
  language?: string | undefined;
  thumbnailUrl?: string | undefined;
  chapters?: readonly YoutubeChapterInput[] | undefined;
  transcript: readonly YoutubeSegmentInput[];
}

export interface YoutubeChapterInput {
  title: string;
  startMs: number;
}

export interface YoutubeVideoExtraction extends ExtractionResult {
  chapters: readonly YoutubeChapterInput[];
  timestampIndex: readonly YoutubeTimestampIndexItem[];
}

export interface YoutubeTimestampIndexItem {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export async function extractPdfDocument(input: PdfDocumentInput): Promise<PdfDocumentExtraction> {
  const document = await extractFromPdfPages(input.url, input.title, input.pages, "pdf_pages");
  const pages = await Promise.all(
    input.pages.map((page) =>
      extractFromPdfPages(`${input.url}#page=${String(page.pageNumber)}`, `${input.title} - Page ${String(page.pageNumber)}`, [page], "pdf_pages"),
    ),
  );

  return {
    document,
    pages,
    outline: input.outline ?? inferPdfOutline(input.pages),
    bookmarks: input.bookmarks ?? [],
  };
}

export async function extractOcrImage(input: OcrImageInput): Promise<ExtractionResult> {
  const result = await extractFromImageOcr({
    url: input.url,
    title: input.title,
    text: input.regions.map((region) => region.text).join("\n\n"),
    captions: [input.title],
    layoutWidth: input.width,
    layoutHeight: input.height,
    regions: input.regions,
  });
  return {
    ...result,
    metadata: {
      ...result.metadata,
      description: imageDescription(input),
    },
    document: {
      ...result.document,
      metadata: {
        ...result.document.metadata,
        description: imageDescription(input),
      },
    },
  };
}

export async function extractYoutubeVideo(input: YoutubeVideoInput): Promise<YoutubeVideoExtraction> {
  const result = await extractFromYoutubePageData(
    input.url,
    input.title,
    input.transcript,
    input.chapters ?? [],
    [],
    input.description,
  );
  return {
    ...result,
    metadata: {
      ...result.metadata,
      author: input.author,
      description: input.description ?? result.metadata.description,
      publishedAt: input.publishedAt,
      language: input.language ?? result.metadata.language,
      images: input.thumbnailUrl
        ? [{ src: input.thumbnailUrl, alt: `${input.title} thumbnail` }]
        : result.metadata.images,
    },
    chapters: input.chapters ?? inferChapters(input.transcript),
    timestampIndex: input.transcript.map((segment, index) => ({
      id: `t${String(index + 1)}`,
      startMs: segment.startMs,
      endMs: segment.startMs + (segment.durationMs ?? 0),
      text: segment.text,
    })),
  };
}

export function sourceSnapshotsFromPdfExtraction(extraction: PdfDocumentExtraction): readonly SourceSnapshot[] {
  return [extraction.document.snapshot, ...extraction.pages.map((page) => page.snapshot)];
}

function inferPdfOutline(pages: readonly PdfPageInput[]): readonly PdfOutlineItem[] {
  return pages.map((page) => ({
    title: firstLine(page.text) || `Page ${String(page.pageNumber)}`,
    pageNumber: page.pageNumber,
  }));
}

function inferChapters(transcript: readonly YoutubeSegmentInput[]): readonly YoutubeChapterInput[] {
  if (transcript.length === 0) return [];
  const interval = Math.max(1, Math.ceil(transcript.length / 5));
  return transcript
    .filter((_, index) => index % interval === 0)
    .map((segment, index) => ({ title: `Chapter ${String(index + 1)}`, startMs: segment.startMs }));
}

function firstLine(text: string): string {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

function imageDescription(input: OcrImageInput): string {
  const size = input.width && input.height ? ` ${String(input.width)}x${String(input.height)}` : "";
  return `OCR source (${input.mimeType}${size}) with ${String(input.regions.length)} detected regions.`;
}
