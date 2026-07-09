import { collapseWhitespace, normalizeVisibleText, redactSecrets } from "../cleaners";
import type { RawBlock } from "../types";

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const MAX_BLOCK_LENGTH = 100_000;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const MAX_REJECTION_SAMPLES = 80;

export interface BlockParseDiagnostics {
  candidateElements: number;
  acceptedBlocks: number;
  rejectedBlocks: number;
  rejectionReasons: Record<string, number>;
  rejectionSamples: readonly string[];
}

export function createBlockParseDiagnostics(): BlockParseDiagnostics {
  return {
    candidateElements: 0,
    acceptedBlocks: 0,
    rejectedBlocks: 0,
    rejectionReasons: {},
    rejectionSamples: [],
  };
}

export function parseBlocksFromElement(root: Element, diagnostics?: BlockParseDiagnostics): RawBlock[] {
  const blocks: RawBlock[] = [];
  const headingStack: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === TEXT_NODE) {
      return;
    }

    if (node.nodeType !== ELEMENT_NODE) {
      node.childNodes.forEach(walk);
      return;
    }

    const element = node as Element;
    const tag = element.tagName.toUpperCase();

    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
      recordRejection(diagnostics, element, "non-readable element");
      return;
    }

    if (HEADING_TAGS.has(tag)) {
      recordCandidate(diagnostics);
      const level = Number(tag.slice(1));
      const text = collapseWhitespace(element.textContent ?? "");
      if (!text) {
        recordRejection(diagnostics, element, "empty heading");
        return;
      }
      headingStack.splice(level - 1);
      headingStack[level - 1] = text;
      blocks.push({
        type: "heading",
        text,
        headingPath: headingStack.filter(Boolean),
      });
      recordAccepted(diagnostics);
      return;
    }

    if (tag === "PRE" || (tag === "CODE" && element.closest("pre") === null && looksLikeCodeBlock(element))) {
      recordCandidate(diagnostics);
      const language = extractCodeLanguage(element);
      const text = redactSecrets(normalizeVisibleText(element.textContent ?? ""));
      if (!text) {
        recordRejection(diagnostics, element, "empty code block");
        return;
      }
      blocks.push({
        type: "code",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
        language,
      });
      recordAccepted(diagnostics);
      return;
    }

    if (tag === "TABLE") {
      recordCandidate(diagnostics);
      const text = redactSecrets(formatTable(element));
      if (!text) {
        recordRejection(diagnostics, element, "empty table");
        return;
      }
      blocks.push({
        type: "table",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      recordAccepted(diagnostics);
      return;
    }

    if (tag === "UL" || tag === "OL") {
      recordCandidate(diagnostics);
      const text = redactSecrets(formatList(element));
      if (!text) {
        recordRejection(diagnostics, element, "empty list");
        return;
      }
      blocks.push({
        type: "list",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      recordAccepted(diagnostics);
      return;
    }

    if (tag === "BLOCKQUOTE") {
      recordCandidate(diagnostics);
      const text = redactSecrets(collapseWhitespace(element.textContent ?? ""));
      if (!text) {
        recordRejection(diagnostics, element, "empty quote");
        return;
      }
      blocks.push({
        type: "quote",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      recordAccepted(diagnostics);
      return;
    }

    if (isParagraphLike(tag, element)) {
      recordCandidate(diagnostics);
      const text = redactSecrets(collapseWhitespace(element.textContent ?? ""));
      if (!text) {
        recordRejection(diagnostics, element, "empty paragraph");
        return;
      }
      blocks.push({
        type: "paragraph",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      recordAccepted(diagnostics);
      return;
    }

    if (mayContainReadableContent(tag, element)) {
      recordCandidate(diagnostics);
      recordRejection(diagnostics, element, `container traversed: ${tag.toLowerCase()}`);
    }

    element.childNodes.forEach(walk);
  };

  walk(root);
  return mergeAdjacentParagraphs(blocks);
}

function isParagraphLike(tag: string, node: Element): boolean {
  if (tag === "P") return true;
  if (tag === "DIV" && node.childElementCount === 0) return Boolean(node.textContent?.trim());
  if (tag === "SECTION" && node.childElementCount <= 1) return Boolean(node.textContent?.trim());
  return false;
}

function mayContainReadableContent(tag: string, node: Element): boolean {
  if (!["ARTICLE", "MAIN", "SECTION", "DIV", "TD", "TH", "LI"].includes(tag)) return false;
  return Boolean(node.textContent?.trim());
}

function looksLikeCodeBlock(node: Element): boolean {
  const text = node.textContent ?? "";
  return text.includes("\n") && text.length > 40;
}

function extractCodeLanguage(node: Element): string | undefined {
  const code = node.tagName.toUpperCase() === "PRE" ? node.querySelector("code") : node;
  const className = code?.className || node.className || node.closest("pre")?.className || "";
  const match = /language-([\w-]+)/.exec(className);
  return match?.[1];
}

function formatList(list: Element): string {
  const ordered = list.tagName.toUpperCase() === "OL";
  return Array.from(list.querySelectorAll(":scope > li"))
    .map((item, index) => {
      const prefix = ordered ? `${String(index + 1)}. ` : "- ";
      return `${prefix}${collapseWhitespace(item.textContent ?? "")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function formatTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll("tr"));
  return rows
    .map((row) =>
      Array.from(row.querySelectorAll("th, td"))
        .map((cell) => collapseWhitespace(cell.textContent ?? ""))
        .join(" | "),
    )
    .filter((row) => row.trim().length > 0)
    .join("\n");
}

function mergeAdjacentParagraphs(blocks: RawBlock[]): RawBlock[] {
  const merged: RawBlock[] = [];
  for (const block of blocks) {
    const last = merged.at(-1);
    if (
      last &&
      last.type === "paragraph" &&
      block.type === "paragraph" &&
      last.headingPath.join("/") === block.headingPath.join("/")
    ) {
      last.text = `${last.text}\n\n${block.text}`.slice(0, MAX_BLOCK_LENGTH);
    } else {
      merged.push({ ...block });
    }
  }
  return merged;
}

function recordCandidate(diagnostics?: BlockParseDiagnostics): void {
  if (diagnostics) diagnostics.candidateElements += 1;
}

function recordAccepted(diagnostics?: BlockParseDiagnostics): void {
  if (diagnostics) diagnostics.acceptedBlocks += 1;
}

function recordRejection(diagnostics: BlockParseDiagnostics | undefined, element: Element, reason: string): void {
  if (!diagnostics) return;
  diagnostics.rejectedBlocks += 1;
  diagnostics.rejectionReasons[reason] = (diagnostics.rejectionReasons[reason] ?? 0) + 1;
  const samples = diagnostics.rejectionSamples as string[];
  if (samples.length >= MAX_REJECTION_SAMPLES) return;
  const text = collapseWhitespace(element.textContent ?? "").slice(0, 140);
  samples.push(`${element.tagName.toLowerCase()}: ${reason}${text ? ` — ${text}` : ""}`);
}

export function blocksFromPlainText(text: string, headingPath: readonly string[] = []): RawBlock[] {
  const normalized = redactSecrets(normalizeVisibleText(text));
  if (!normalized) return [];
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      type: "paragraph" as const,
      text: paragraph.slice(0, MAX_BLOCK_LENGTH),
      headingPath: [...headingPath],
    }));
}
