import type { SourceSnapshot } from "@classmate/contracts";
import { estimateTokens } from "../utils/tokens";
import type { RawBlockType, SourceChunk } from "../types";

export function chunkSource(
  source: SourceSnapshot,
  budgetTokens = 1200,
): readonly SourceChunk[] {
  const result: SourceChunk[] = [];

  let text = "";
  let start = 0;
  let headingPath: readonly string[] = [];
  let blockIds: string[] = [];
  let contentTypes: RawBlockType[] = [];
  let dominantType: RawBlockType | "mixed" = "paragraph";

  const flush = (): void => {
    if (!text) return;

    result.push({
      id: `S1-C${String(result.length + 1)}`,
      sourceId: source.id,
      text,
      headingPath,
      startOffset: start,
      endOffset: start + text.length,
      estimatedTokens: estimateTokens(text),
      blockIds: [...blockIds],
      semanticType: dominantType,
      metadata: {
        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
        contentTypes: [...new Set(contentTypes)],
        citationId: `${source.id}:chunk:${String(result.length + 1)}`,
      },
      sectionTitle: headingPath.at(-1),
    });

    text = "";
    blockIds = [];
    contentTypes = [];
  };

  for (const block of source.blocks) {
    const next = text ? `${text}\n\n${block.text}` : block.text;

    if (text && estimateTokens(next) > budgetTokens) {
      flush();
    }

    if (!text) {
      start = block.startOffset;
      headingPath = block.headingPath;
      dominantType = block.type;
    } else if (block.type !== dominantType) {
      dominantType = "mixed";
    }

    text = text ? `${text}\n\n${block.text}` : block.text;
    blockIds.push(block.id);
    contentTypes.push(block.type);
  }

  flush();

  return result;
}

export function chunkByHeadings(source: SourceSnapshot): readonly SourceChunk[] {
  const sections: SourceChunk[] = [];
  let currentBlocks: typeof source.blocks = [];
  let currentHeading: readonly string[] = [];

  const flush = (): void => {
    if (currentBlocks.length === 0) return;
    const text = currentBlocks.map((block) => block.text).join("\n\n");
    sections.push({
      id: `S1-H${String(sections.length + 1)}`,
      sourceId: source.id,
      text,
      headingPath: currentHeading,
      startOffset: currentBlocks[0]?.startOffset ?? 0,
      endOffset: currentBlocks.at(-1)?.endOffset ?? 0,
      estimatedTokens: estimateTokens(text),
      blockIds: currentBlocks.map((block) => block.id),
      semanticType: currentBlocks.length === 1 ? currentBlocks[0]!.type : "mixed",
      metadata: {
        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
        contentTypes: [...new Set(currentBlocks.map((block) => block.type))],
        citationId: `${source.id}:heading:${String(sections.length + 1)}`,
      },
      sectionTitle: currentHeading.at(-1),
    });
    currentBlocks = [];
  };

  for (const block of source.blocks) {
    if (block.type === "heading") {
      flush();
      currentHeading = block.headingPath;
      currentBlocks = [block];
    } else {
      currentBlocks.push(block);
    }
  }

  flush();
  return sections;
}

export function validateCitationIds(
  ids: readonly string[],
  chunks: readonly SourceChunk[],
): readonly string[] {
  const allowed = new Set(chunks.map((chunk) => chunk.id));
  return ids.filter((id) => allowed.has(id));
}
