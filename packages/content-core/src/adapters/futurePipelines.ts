import type { SourceSnapshot } from "@classmate/contracts";
import { detectLanguage } from "../metadata/languageDetector";
import { calculateReadability } from "../metadata/readability";
import { blocksFromPlainText } from "../parsers/blockParser";
import { buildNormalizedDocument, toSourceSnapshot } from "../pipeline/normalizer";
import type {
  ExtractionMetadata,
  ExtractionResult,
  ExtractedHeading,
  ExtractedImage,
  ExtractedLink,
  ImageExtractionInput,
  OcrRegionInput,
  PdfBookmarkInput,
  PdfImageInput,
  PdfLinkInput,
  PdfPageInput,
  PdfTableInput,
  YoutubeChapterInput,
  YoutubeSegmentInput,
  YoutubeTrackInput,
  RawBlock,
} from "../types";
import { countWords, estimateReadingTimeMinutes } from "../utils/tokens";

function baseMetadata(
  siteFamily: ExtractionMetadata["siteFamily"],
  sourceType: ExtractionMetadata["sourceType"],
  blocks: readonly { text: string; headingPath: readonly string[] }[],
  url: string,
  title: string,
  overrides: Partial<
    Pick<
      ExtractionMetadata,
      "description" | "links" | "images" | "citations" | "keywords" | "canonicalUrl" | "publishedAt"
    >
  > = {},
): ExtractionMetadata {
  const fullText = blocks.map((block) => block.text).join("\n\n");
  const wordCount = countWords(fullText);
  const language = detectLanguage(fullText);
  const headings: readonly ExtractedHeading[] = blocks
    .filter((block) => block.headingPath.length > 0)
    .map((block) => ({ text: block.headingPath.at(-1) ?? "", path: block.headingPath }))
    .filter((heading) => heading.text.length > 0);

  return {
    siteFamily,
    sourceType,
    title,
    url,
    language,
    keywords: overrides.keywords ?? [],
    headings,
    readingTimeMinutes: estimateReadingTimeMinutes(wordCount),
    readability: calculateReadability(fullText),
    wordCount,
    links: overrides.links ?? [],
    images: overrides.images ?? [],
    citations: overrides.citations ?? [],
    description: overrides.description,
    canonicalUrl: overrides.canonicalUrl ?? url.split("#")[0],
    publishedAt: overrides.publishedAt,
  };
}

export async function extractFromPdfPages(
  url: string,
  title: string,
  pages: readonly PdfPageInput[],
  scope: SourceSnapshot["scope"] = "pdf_pages",
): Promise<ExtractionResult> {
  const blocks = pages.flatMap((page) => pdfPageToBlocks(page));
  const links = pages.flatMap((page) => toPdfLinks(page.links ?? []));
  const images = pages.flatMap((page) => toPdfImages(page.images ?? []));
  const citations = pages.map((page) => ({
    id: `page-${String(page.pageNumber)}`,
    text: `Page ${String(page.pageNumber)}`,
    href: `${url.split("#")[0]}#page=${String(page.pageNumber)}`,
  }));

  const metadata = baseMetadata("pdf", "pdf", blocks, url, title, {
    description: `PDF document with ${String(pages.length)} pages`,
    links,
    images,
    citations,
  });
  return buildSnapshotResult(url, title, scope, blocks, metadata, "clear");
}

export async function extractFromPdfSelection(
  url: string,
  title: string,
  pageNumber: number,
  selectionText: string,
): Promise<ExtractionResult> {
  const pageHeading = `Page ${String(pageNumber)}`;
  const blocks = blocksFromPlainText(selectionText, [pageHeading]);
  const metadata = baseMetadata("pdf", "pdf", blocks, url, title, {
    description: `Selected text from ${pageHeading}`,
    citations: [
      {
        id: `page-${String(pageNumber)}`,
        text: pageHeading,
        href: `${url.split("#")[0]}#page=${String(pageNumber)}`,
      },
    ],
  });
  return buildSnapshotResult(url, title, "selection", blocks, metadata, "clear");
}

export async function extractFromYoutubeTranscript(
  url: string,
  title: string,
  segments: readonly YoutubeSegmentInput[],
  scope: SourceSnapshot["scope"] = "transcript",
): Promise<ExtractionResult> {
  const blocks = youtubeSegmentsToBlocks(segments);
  const links = segments.map((segment) => ({
    href: `${url.includes("?") ? `${url}&` : `${url}?`}t=${String(Math.floor(segment.startMs / 1000))}s`,
    text: segment.text.slice(0, 120),
    external: true,
    timestampMs: segment.startMs,
  }));

  const trackKeywords = [...new Set(segments.map((segment) => segment.language).filter(isNonEmptyString))];
  const metadata = baseMetadata("youtube", "youtube", blocks, url, title, {
    description: `Transcript with ${String(segments.length)} segments`,
    links,
    keywords: trackKeywords,
    citations: segments.map((segment, index) => ({
      id: `ts-${String(index + 1)}`,
      text: segment.text.slice(0, 180),
      href: `${url.includes("?") ? `${url}&` : `${url}?`}t=${String(Math.floor(segment.startMs / 1000))}s`,
    })),
  });
  return buildSnapshotResult(url, title, scope, blocks, metadata, "clear");
}

export async function extractFromYoutubePageData(
  url: string,
  title: string,
  segments: readonly YoutubeSegmentInput[],
  chapters: readonly YoutubeChapterInput[] = [],
  tracks: readonly YoutubeTrackInput[] = [],
  description?: string | undefined,
): Promise<ExtractionResult> {
  const result = await extractFromYoutubeTranscript(url, title, segments);
  const keywords = [
    ...tracks.map((track) => track.language),
    ...chapters.map((chapter) => chapter.title.toLocaleLowerCase()),
  ].filter(isNonEmptyString);
  const metadata = {
    ...result.metadata,
    description:
      description ??
      `Transcript with ${String(segments.length)} segments and ${String(chapters.length)} chapters`,
    keywords: [...new Set(keywords)],
  };
  const input = { url, title, html: "", scope: "transcript" as const };
  const document = buildNormalizedDocument(input, result.document.blocks, metadata);
  const snapshot = await toSourceSnapshot(document, input, "clear", result.snapshot.id);
  return { snapshot, metadata, document };
}

export async function extractFromOcrRegions(
  url: string,
  title: string,
  regions: readonly OcrRegionInput[],
  scope: SourceSnapshot["scope"] = "pasted",
): Promise<ExtractionResult> {
  const blocks = ocrRegionsToBlocks(regions);
  const metadata = baseMetadata("generic", "pasted", blocks, url, title, {
    description: `OCR extracted ${String(regions.length)} regions`,
  });
  return buildSnapshotResult(url, title, scope, blocks, metadata, "review");
}

export async function extractFromImageOcr(
  input: ImageExtractionInput,
  scope: SourceSnapshot["scope"] = "image",
): Promise<ExtractionResult> {
  const regionBlocks = input.regions ? ocrRegionsToBlocks(input.regions) : [];
  const textBlocks = regionBlocks.length > 0 ? regionBlocks : blocksFromPlainText(input.text, ["Image OCR"]);
  const captionBlocks = (input.captions ?? [])
    .map((caption) => caption.trim())
    .filter(Boolean)
    .map<RawBlock>((caption) => ({
      type: "quote",
      text: caption,
      headingPath: ["Captions"],
    }));
  const blocks = [...textBlocks, ...captionBlocks];
  const metadata = baseMetadata("generic", "image", blocks, input.url, input.title, {
    description: "OCR extracted image content",
    images: [
      {
        src: input.url,
        alt: input.title,
        caption: input.captions?.[0],
      },
    ],
  });
  return buildSnapshotResult(input.url, input.title, scope, blocks, metadata, "review");
}

export function isOcrPipelineReady(): boolean {
  return true;
}

export function isPdfPipelineReady(): boolean {
  return true;
}

export function isYoutubePipelineReady(): boolean {
  return true;
}

function pdfPageToBlocks(page: PdfPageInput): RawBlock[] {
  const pageHeading = `Page ${String(page.pageNumber)}`;
  const headingBlocks = (page.headings ?? []).map<RawBlock>((heading) => ({
    type: "heading",
    text: heading,
    headingPath: [pageHeading, heading],
  }));
  const textBlocks = blocksFromPlainText(page.text, [pageHeading]);
  const tableBlocks = (page.tables ?? [])
    .map((table) => tableToBlock(pageHeading, table))
    .filter((value): value is RawBlock => value !== undefined);
  return [
    { type: "heading", text: pageHeading, headingPath: [pageHeading] },
    ...headingBlocks,
    ...textBlocks,
    ...tableBlocks,
  ];
}

function tableToBlock(pageHeading: string, table: PdfTableInput): RawBlock | undefined {
  const text = table.rows
    .map((row) => row.map((cell) => cell.trim()).filter(Boolean).join(" | "))
    .filter(Boolean)
    .join("\n");
  if (!text) return undefined;
  return {
    type: "table",
    text,
    headingPath: [pageHeading, ...(table.headingPath ?? [])],
  };
}

function youtubeSegmentsToBlocks(segments: readonly YoutubeSegmentInput[]): RawBlock[] {
  const blocks: RawBlock[] = [];
  let activeChapter: string | undefined;
  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;
    const chapter = segment.chapterTitle?.trim();
    if (chapter && chapter !== activeChapter) {
      activeChapter = chapter;
      blocks.push({
        type: "heading",
        text: chapter,
        headingPath: ["Transcript", chapter],
      });
    }
    blocks.push({
      type: "paragraph",
      text,
      headingPath: activeChapter ? ["Transcript", activeChapter] : ["Transcript"],
      ...(segment.language ? { language: segment.language } : {}),
    });
  }
  return blocks.length > 0 ? blocks : blocksFromPlainText("", ["Transcript"]);
}

function ocrRegionsToBlocks(regions: readonly OcrRegionInput[]): RawBlock[] {
  return regions
    .map((region): RawBlock | undefined => {
      const text = region.text.trim();
      if (!text) return undefined;
      const pageHeading = region.pageNumber ? `Page ${String(region.pageNumber)}` : "OCR";
      const type: RawBlock["type"] = region.blockType === "heading"
        ? "heading"
        : region.blockType === "table"
          ? "table"
          : region.blockType === "caption"
            ? "quote"
            : "paragraph";
      return {
        type,
        text,
        headingPath: type === "heading" ? [pageHeading, text] : [pageHeading],
      } satisfies RawBlock;
    })
    .filter((value): value is RawBlock => value !== undefined);
}

function toPdfLinks(links: readonly PdfLinkInput[]): ExtractedLink[] {
  return links.map((link) => ({
    href: link.href,
    text: link.text,
    external: /^https?:/i.test(link.href),
    pageNumber: link.pageNumber,
  }));
}

function toPdfImages(images: readonly PdfImageInput[]): ExtractedImage[] {
  return images.map((image) => ({
    src: image.src,
    alt: image.alt,
    title: image.title,
    caption: image.caption,
    pageNumber: image.pageNumber,
  }));
}

async function buildSnapshotResult(
  url: string,
  title: string,
  scope: SourceSnapshot["scope"],
  blocks: readonly RawBlock[],
  metadata: ExtractionMetadata,
  sensitivity: SourceSnapshot["sensitivity"],
): Promise<ExtractionResult> {
  const input = { url, title, html: "", scope };
  const document = buildNormalizedDocument(input, blocks, metadata);
  const snapshot = await toSourceSnapshot(document, input, sensitivity);
  return { snapshot, metadata, document };
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
