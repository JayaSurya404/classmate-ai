import { normalizeVisibleText, redactSecrets } from "../cleaners";
import { classifySite } from "../classifiers/siteClassifier";
import { resolveExtractor } from "../extractors/registry";
import { extractMetadata } from "../metadata/metadataExtractor";
import { blocksFromPlainText, parseBlocksFromElement } from "../parsers/blockParser";
import { parseHtmlDocument } from "../parsers/htmlParser";
import {
  buildNormalizedDocument,
  sensitivityFromContent,
  toSourceSnapshot,
} from "./normalizer";
import type { ExtractionInput, ExtractionResult, RawBlock } from "../types";

export async function extractContent(input: ExtractionInput, id?: string): Promise<ExtractionResult> {
  const classification = classifySite(input.url, input.html);
  const extractor = resolveExtractor(classification.siteFamily);
  const { document, root } = parseHtmlDocument(input, extractor.extractRootSelector());

  let blocks: RawBlock[];

  if (input.selection?.trim()) {
    blocks = blocksFromPlainText(input.selection, ["Selection"]);
  } else if (classification.siteFamily === "stackoverflow") {
    blocks = parseStackOverflowBlocks(root);
  } else {
    blocks = parseBlocksFromElement(root);
  }

  if (blocks.length === 0) {
    const fallbackText = redactSecrets(normalizeVisibleText(root.textContent ?? ""));
    blocks = blocksFromPlainText(fallbackText);
  }

  const metadata = extractMetadata({
    document,
    url: input.url,
    title: input.title,
    siteFamily: classification.siteFamily,
    sourceType: classification.sourceType,
    blocks,
    language: input.language,
  });

  let normalized = buildNormalizedDocument(input, blocks, metadata);
  if (extractor.postProcess) {
    normalized = extractor.postProcess(normalized);
  }

  const aggregateText = normalized.blocks.map((block) => block.text).join("\n\n");
  const sensitivity = sensitivityFromContent(aggregateText);
  const snapshot = await toSourceSnapshot(normalized, input, sensitivity, id);

  return { snapshot, metadata, document: normalized };
}

export interface BrowserExtractionInput {
  url: string;
  title: string;
  html: string;
  language?: string | undefined;
  selection?: string | undefined;
  scope: ExtractionInput["scope"];
}

export async function extractFromBrowserContext(
  input: BrowserExtractionInput,
  id?: string,
): Promise<ExtractionResult> {
  return extractContent(
    {
      url: input.url,
      title: input.title,
      html: input.html,
      language: input.language,
      selection: input.selection,
      scope: input.scope,
    },
    id,
  );
}

function parseStackOverflowBlocks(root: Element): RawBlock[] {
  const blocks: RawBlock[] = [];
  const selectors = ["#question", ".question", ".answercell", ".s-prose"];
  for (const selector of selectors) {
    if (root.matches(selector)) {
      blocks.push(...parseBlocksFromElement(root));
    }
    root.querySelectorAll(selector).forEach((element) => {
      blocks.push(...parseBlocksFromElement(element));
    });
  }
  return dedupeBlocks(blocks);
}

function dedupeBlocks(blocks: readonly RawBlock[]): RawBlock[] {
  const seen = new Set<string>();
  const result: RawBlock[] = [];
  for (const block of blocks) {
    const key = `${block.type}:${block.headingPath.join("/")}:${block.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(block);
  }
  return result;
}
