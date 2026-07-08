import type { SourceSnapshot } from "@classmate/contracts";
import { detectLanguage } from "../metadata/languageDetector";
import { calculateReadability } from "../metadata/readability";
import { blocksFromPlainText } from "../parsers/blockParser";
import { buildNormalizedDocument, toSourceSnapshot } from "../pipeline/normalizer";
import type {
  ExtractionMetadata,
  ExtractionResult,
  ExtractedHeading,
  OcrRegionInput,
  PdfPageInput,
  YoutubeSegmentInput,
} from "../types";
import { countWords, estimateReadingTimeMinutes } from "../utils/tokens";

function baseMetadata(
  siteFamily: ExtractionMetadata["siteFamily"],
  sourceType: ExtractionMetadata["sourceType"],
  blocks: readonly { text: string; headingPath: readonly string[] }[],
  url: string,
  title: string,
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
    keywords: [],
    headings,
    readingTimeMinutes: estimateReadingTimeMinutes(wordCount),
    readability: calculateReadability(fullText),
    wordCount,
    links: [],
    images: [],
    citations: [],
    canonicalUrl: url.split("#")[0],
  };
}

export async function extractFromPdfPages(
  url: string,
  title: string,
  pages: readonly PdfPageInput[],
  scope: SourceSnapshot["scope"] = "pdf_pages",
): Promise<ExtractionResult> {
  const blocks = pages.flatMap((page) =>
    blocksFromPlainText(page.text, [`Page ${String(page.pageNumber)}`]),
  );

  const metadata = baseMetadata("pdf", "pdf", blocks, url, title);
  const input = { url, title, html: "", scope };
  const document = buildNormalizedDocument(input, blocks, metadata);
  const snapshot = await toSourceSnapshot(document, input, "clear");

  return { snapshot, metadata, document };
}

export async function extractFromYoutubeTranscript(
  url: string,
  title: string,
  segments: readonly YoutubeSegmentInput[],
  scope: SourceSnapshot["scope"] = "transcript",
): Promise<ExtractionResult> {
  const transcriptText = segments.map((segment) => segment.text.trim()).filter(Boolean).join("\n");
  const blocks = blocksFromPlainText(transcriptText, ["Transcript"]);

  const metadata = {
    ...baseMetadata("youtube", "youtube", blocks, url, title),
    description: `Transcript with ${String(segments.length)} segments`,
  };
  const input = { url, title, html: "", scope };
  const document = buildNormalizedDocument(input, blocks, metadata);
  const snapshot = await toSourceSnapshot(document, input, "clear");

  return { snapshot, metadata, document };
}

export async function extractFromOcrRegions(
  url: string,
  title: string,
  regions: readonly OcrRegionInput[],
  scope: SourceSnapshot["scope"] = "pasted",
): Promise<ExtractionResult> {
  const combined = regions
    .map((region) => region.text.trim())
    .filter(Boolean)
    .join("\n\n");
  const blocks = blocksFromPlainText(combined, ["OCR"]);

  const metadata = {
    ...baseMetadata("generic", "pasted", blocks, url, title),
    description: "OCR extracted text. UI integration is not enabled in this milestone.",
  };
  const input = { url, title, html: "", scope };
  const document = buildNormalizedDocument(input, blocks, metadata);
  const snapshot = await toSourceSnapshot(document, input, "review");

  return { snapshot, metadata, document };
}

export function isOcrPipelineReady(): boolean {
  return false;
}

export function isPdfPipelineReady(): boolean {
  return false;
}

export function isYoutubePipelineReady(): boolean {
  return false;
}
