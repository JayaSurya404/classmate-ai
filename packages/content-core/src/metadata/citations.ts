import type { SourceSnapshot } from "@classmate/contracts";
import type { ExtractedCitation, SourceChunk } from "../types";

export function generateBlockCitations(source: SourceSnapshot): readonly ExtractedCitation[] {
  return source.blocks.map((block) => ({
    id: `${source.id}:${block.id}`,
    text: block.text.slice(0, 500),
    blockId: block.id,
  }));
}

export function generateChunkCitations(
  source: SourceSnapshot,
  chunks: readonly SourceChunk[],
): readonly ExtractedCitation[] {
  return chunks.map((chunk) => ({
    id: chunk.metadata.citationId,
    text: chunk.text.slice(0, 500),
    blockId: chunk.blockIds[0],
    href: source.canonicalUrl ? `${source.canonicalUrl}#${chunk.id}` : undefined,
  }));
}
