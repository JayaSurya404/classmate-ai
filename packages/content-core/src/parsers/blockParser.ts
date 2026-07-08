import { collapseWhitespace, normalizeVisibleText, redactSecrets } from "../cleaners";
import type { RawBlock } from "../types";

const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
const MAX_BLOCK_LENGTH = 100_000;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

export function parseBlocksFromElement(root: Element): RawBlock[] {
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
      return;
    }

    if (HEADING_TAGS.has(tag)) {
      const level = Number(tag.slice(1));
      const text = collapseWhitespace(element.textContent ?? "");
      if (!text) return;
      headingStack.splice(level - 1);
      headingStack[level - 1] = text;
      blocks.push({
        type: "heading",
        text,
        headingPath: headingStack.filter(Boolean),
      });
      return;
    }

    if (tag === "PRE" || (tag === "CODE" && element.closest("pre") === null && looksLikeCodeBlock(element))) {
      const language = extractCodeLanguage(element);
      const text = redactSecrets(normalizeVisibleText(element.textContent ?? ""));
      if (!text) return;
      blocks.push({
        type: "code",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
        language,
      });
      return;
    }

    if (tag === "TABLE") {
      const text = redactSecrets(formatTable(element));
      if (!text) return;
      blocks.push({
        type: "table",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      return;
    }

    if (tag === "UL" || tag === "OL") {
      const text = redactSecrets(formatList(element));
      if (!text) return;
      blocks.push({
        type: "list",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      return;
    }

    if (tag === "BLOCKQUOTE") {
      const text = redactSecrets(collapseWhitespace(element.textContent ?? ""));
      if (!text) return;
      blocks.push({
        type: "quote",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      return;
    }

    if (isParagraphLike(tag, element)) {
      const text = redactSecrets(collapseWhitespace(element.textContent ?? ""));
      if (!text) return;
      blocks.push({
        type: "paragraph",
        text: text.slice(0, MAX_BLOCK_LENGTH),
        headingPath: [...headingStack],
      });
      return;
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
