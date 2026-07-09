import {
  OcrRegionSchema,
  PdfOutlineItemSchema,
  SourceAnnotationSchema,
  TranscriptSegmentSchema,
  TranscriptTrackSchema,
  VideoChapterSchema,
  type OcrRegion,
  type PdfOutlineItem,
  type SourceAnnotation,
  type TranscriptSegment,
  type TranscriptTrack,
  type VideoChapter,
} from "@classmate/contracts";
import { z } from "zod";

const PdfLinkRecordSchema = z.object({
  href: z.string().url(),
  text: z.string().max(2000),
  pageNumber: z.number().int().positive(),
});
export type PdfLinkRecord = z.infer<typeof PdfLinkRecordSchema>;

const PdfTableRecordSchema = z.object({
  pageNumber: z.number().int().positive(),
  rows: z.array(z.array(z.string().max(2000)).min(1)).min(1),
  headingPath: z.array(z.string().max(500)).optional(),
});
export type PdfTableRecord = z.infer<typeof PdfTableRecordSchema>;

const PdfImageRecordSchema = z.object({
  src: z.string().min(1),
  alt: z.string().max(1000),
  title: z.string().max(1000).optional(),
  caption: z.string().max(2000).optional(),
  pageNumber: z.number().int().positive(),
});
export type PdfImageRecord = z.infer<typeof PdfImageRecordSchema>;

const PdfPageRecordSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string().max(200_000),
  headings: z.array(z.string().max(500)).default([]),
  links: z.array(PdfLinkRecordSchema).default([]),
  tables: z.array(PdfTableRecordSchema).default([]),
  images: z.array(PdfImageRecordSchema).default([]),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  thumbnailDataUrl: z.string().min(1).optional(),
});
export type PdfPageRecord = z.infer<typeof PdfPageRecordSchema>;

const PdfSourcePayloadSchema = z.object({
  kind: z.literal("pdf"),
  title: z.string().min(1).max(500),
  url: z.string().min(1),
  author: z.string().max(500).optional(),
  subject: z.string().max(1000).optional(),
  keywords: z.array(z.string().max(200)).default([]),
  pageCount: z.number().int().positive(),
  currentPage: z.number().int().positive().default(1),
  outline: z.array(PdfOutlineItemSchema).default([]),
  pages: z.array(PdfPageRecordSchema).min(1),
});
export type PdfSourcePayload = z.infer<typeof PdfSourcePayloadSchema>;

const YoutubeSourcePayloadSchema = z.object({
  kind: z.literal("youtube"),
  title: z.string().min(1).max(500),
  url: z.string().url(),
  videoId: z.string().min(1),
  embedUrl: z.string().url(),
  description: z.string().max(100_000).optional(),
  channelTitle: z.string().max(500).optional(),
  thumbnailUrl: z.string().url().optional(),
  chapters: z.array(VideoChapterSchema).default([]),
  tracks: z.array(TranscriptTrackSchema).default([]),
  activeTrackId: z.string().min(1).optional(),
  segments: z.array(TranscriptSegmentSchema).default([]),
});
export type YoutubeSourcePayload = z.infer<typeof YoutubeSourcePayloadSchema>;

const ImageSourcePayloadSchema = z.object({
  kind: z.literal("image"),
  title: z.string().min(1).max(500),
  url: z.string().min(1),
  mimeType: z.string().max(200).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  captions: z.array(z.string().max(2000)).default([]),
  ocrRegions: z.array(OcrRegionSchema).default([]),
  previewDataUrl: z.string().min(1).optional(),
});
export type ImageSourcePayload = z.infer<typeof ImageSourcePayloadSchema>;

export const SourceDocumentPayloadSchema = z.discriminatedUnion("kind", [
  PdfSourcePayloadSchema,
  YoutubeSourcePayloadSchema,
  ImageSourcePayloadSchema,
]);
export type SourceDocumentPayload = z.infer<typeof SourceDocumentPayloadSchema>;

export const StoredSourceDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  title: z.string().min(1).max(500),
  kind: z.enum(["pdf", "youtube", "image"]),
  url: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  payload: SourceDocumentPayloadSchema,
});
export type StoredSourceDocument = z.infer<typeof StoredSourceDocumentSchema>;

export interface SourceSearchResult {
  id: string;
  sourceId: string;
  title: string;
  snippet: string;
  score: number;
  pageNumber?: number | undefined;
  timestampMs?: number | undefined;
}

export function isPdfSourceDocument(
  document: StoredSourceDocument | undefined,
): document is StoredSourceDocument & { payload: PdfSourcePayload } {
  return document?.payload.kind === "pdf";
}

export function isYoutubeSourceDocument(
  document: StoredSourceDocument | undefined,
): document is StoredSourceDocument & { payload: YoutubeSourcePayload } {
  return document?.payload.kind === "youtube";
}

export function isImageSourceDocument(
  document: StoredSourceDocument | undefined,
): document is StoredSourceDocument & { payload: ImageSourcePayload } {
  return document?.payload.kind === "image";
}

export function createStoredSourceDocument(args: {
  sourceId: string;
  title: string;
  url: string;
  payload: SourceDocumentPayload;
  id?: string | undefined;
  createdAt?: string | undefined;
}): StoredSourceDocument {
  const createdAt = args.createdAt ?? new Date().toISOString();
  return StoredSourceDocumentSchema.parse({
    schemaVersion: 1,
    id: args.id ?? crypto.randomUUID(),
    sourceId: args.sourceId,
    title: args.title,
    kind: args.payload.kind,
    url: args.url,
    createdAt,
    updatedAt: createdAt,
    payload: args.payload,
  });
}

export function createStoredAnnotation(args: {
  sourceId: string;
  kind: SourceAnnotation["kind"];
  anchor: SourceAnnotation["anchor"];
  text?: string | undefined;
  color?: string | undefined;
  id?: string | undefined;
  createdAt?: string | undefined;
}): SourceAnnotation {
  const createdAt = args.createdAt ?? new Date().toISOString();
  return SourceAnnotationSchema.parse({
    schemaVersion: 1,
    id: args.id ?? crypto.randomUUID(),
    sourceId: args.sourceId,
    kind: args.kind,
    text: args.text,
    color: args.color,
    anchor: args.anchor,
    createdAt,
    updatedAt: createdAt,
  });
}

export function createPdfOutlineItem(
  title: string,
  pageNumber: number,
  depth: number,
  id = crypto.randomUUID(),
): PdfOutlineItem {
  return PdfOutlineItemSchema.parse({ id, title, pageNumber, depth });
}

export function createTranscriptTrack(args: {
  id: string;
  language: string;
  label: string;
  isAutoGenerated?: boolean | undefined;
  isDefault?: boolean | undefined;
}): TranscriptTrack {
  return TranscriptTrackSchema.parse(args);
}

export function createTranscriptSegment(args: {
  id?: string | undefined;
  text: string;
  startMs: number;
  durationMs?: number | undefined;
  language?: string | undefined;
  chapterTitle?: string | undefined;
}): TranscriptSegment {
  return TranscriptSegmentSchema.parse({
    id: args.id ?? crypto.randomUUID(),
    text: args.text,
    startMs: args.startMs,
    durationMs: args.durationMs,
    language: args.language,
    chapterTitle: args.chapterTitle,
  });
}

export function createVideoChapter(args: {
  id?: string | undefined;
  title: string;
  startMs: number;
  endMs?: number | undefined;
}): VideoChapter {
  return VideoChapterSchema.parse({
    id: args.id ?? crypto.randomUUID(),
    title: args.title,
    startMs: args.startMs,
    endMs: args.endMs,
  });
}

export function createOcrRegion(args: {
  id?: string | undefined;
  text: string;
  confidence?: number | undefined;
  pageNumber?: number | undefined;
  blockType?: OcrRegion["blockType"] | undefined;
  boundingBox?: OcrRegion["boundingBox"] | undefined;
}): OcrRegion {
  return OcrRegionSchema.parse({
    id: args.id ?? crypto.randomUUID(),
    text: args.text,
    confidence: args.confidence,
    pageNumber: args.pageNumber,
    blockType: args.blockType,
    boundingBox: args.boundingBox,
  });
}
