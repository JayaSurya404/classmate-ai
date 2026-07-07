import type { SourceSnapshot } from "@classmate/contracts";

export interface SourceChunk {
  id: string;
  sourceId: string;
  text: string;
  headingPath: readonly string[];
  startOffset: number;
  endOffset: number;
  estimatedTokens: number;
}

export function normalizeVisibleText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function chunkSource(
  source: SourceSnapshot,
  budgetTokens = 1200
): readonly SourceChunk[] {
  const result: SourceChunk[] = [];

  let text = "";
  let start = 0;
  let headingPath: readonly string[] = [];

  const flush = () => {
    if (!text) return;

    result.push({
      id: `S1-C${result.length + 1}`,
      sourceId: source.id,
      text,
      headingPath,
      startOffset: start,
      endOffset: start + text.length,
      estimatedTokens: estimateTokens(text)
    });

    text = "";
  };

  for (const block of source.blocks) {
    const next = text ? `${text}\n\n${block.text}` : block.text;

    if (text && estimateTokens(next) > budgetTokens) {
      flush();
    }

    if (!text) {
      start = block.startOffset;
      headingPath = block.headingPath;
    }

    text = text ? `${text}\n\n${block.text}` : block.text;
  }

  flush();

  return result;
}

export function validateCitationIds(
  ids: readonly string[],
  chunks: readonly SourceChunk[]
): readonly string[] {
  const allowed = new Set(chunks.map((chunk) => chunk.id));

  return ids.filter((id) => allowed.has(id));
}