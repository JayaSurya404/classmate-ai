import { SourceSnapshotSchema, type ContentBlock, type SourceSnapshot } from "@classmate/contracts";
import { normalizeVisibleText } from "../cleaners";
import { computeContentHash } from "../utils/hash";
import type { ExtractionInput, ExtractionMetadata, NormalizedDocument, RawBlock } from "../types";

export function assignBlockOffsets(blocks: readonly RawBlock[]): ContentBlock[] {
  let offset = 0;
  return blocks.map((block, index) => {
    const text = block.text;
    const entry: ContentBlock = {
      id: `b${String(index + 1)}`,
      type: block.type,
      text,
      headingPath: [...block.headingPath],
      startOffset: offset,
      endOffset: offset + text.length,
      ...(block.language ? { language: block.language } : {}),
    };
    offset = entry.endOffset + 2;
    return entry;
  });
}

export async function toSourceSnapshot(
  document: NormalizedDocument,
  input: Pick<ExtractionInput, "scope">,
  sensitivity: SourceSnapshot["sensitivity"] = "clear",
  id: string = crypto.randomUUID(),
): Promise<SourceSnapshot> {
  const blocks = assignBlockOffsets(document.blocks);
  const aggregateText = blocks.map((block) => block.text).join("\n\n");
  const contentHash = await computeContentHash(aggregateText);

  return SourceSnapshotSchema.parse({
    schemaVersion: 1,
    id,
    title: document.title.slice(0, 500),
    canonicalUrl: document.metadata.canonicalUrl,
    sourceType: document.metadata.sourceType,
    capturedAt: new Date().toISOString(),
    contentHash,
    language: document.language,
    scope: input.scope,
    sensitivity,
    blocks,
  });
}

export function buildNormalizedDocument(
  input: ExtractionInput,
  blocks: readonly RawBlock[],
  metadata: ExtractionMetadata,
): NormalizedDocument {
  const title = normalizeVisibleText(metadata.title || input.title || metadata.description || "Untitled document").slice(0, 500);
  return {
    title: title || "Untitled document",
    url: metadata.canonicalUrl ?? metadata.url ?? input.url,
    language: metadata.language,
    blocks,
    metadata,
  };
}

export function sensitivityFromContent(text: string): SourceSnapshot["sensitivity"] {
  if (/\b(ssn|social security|password|credit card|api[_-]?key)\b/i.test(text)) {
    return "review";
  }
  return "clear";
}
