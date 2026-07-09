import { parseHTML } from "linkedom";
import { collapseWhitespace, removeBoilerplate } from "../cleaners";
import type { ExtractionInput } from "../types";

export interface ParsedHtmlDocument {
  document: Document;
  root: Element;
  diagnostics: HtmlParseDiagnostics;
}

export interface HtmlParseDiagnostics {
  bodyExists: boolean;
  selector: string;
  candidateCount: number;
  selectedTag: string;
  selectedTextLength: number;
  selectedElementCount: number;
}

export function parseHtmlDocument(input: Pick<ExtractionInput, "html">, rootSelector: string): ParsedHtmlDocument {
  const { document } = parseHTML(input.html);
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  removeBoilerplate(clone);
  const body = clone.querySelector("body");
  const candidates = contentRootCandidates(clone, rootSelector);
  const root = candidates[0]?.element ?? body ?? clone;
  return {
    document,
    root,
    diagnostics: {
      bodyExists: Boolean(body),
      selector: rootSelector,
      candidateCount: candidates.length,
      selectedTag: root.tagName.toLowerCase(),
      selectedTextLength: readableTextLength(root),
      selectedElementCount: root.querySelectorAll("*").length,
    },
  };
}

export function selectContentRoot(document: Document, selector: string): Element {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  removeBoilerplate(clone);
  return contentRootCandidates(clone, selector)[0]?.element ?? clone.querySelector("body") ?? clone;
}

function contentRootCandidates(clone: HTMLElement, selector: string): Array<{ element: Element; score: number }> {
  const seen = new Set<Element>();
  const candidates: Element[] = [];

  for (const part of selector.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    clone.querySelectorAll(trimmed).forEach((element) => {
      if (!seen.has(element)) {
        seen.add(element);
        candidates.push(element);
      }
    });
  }

  const body = clone.querySelector("body");
  if (body && !seen.has(body)) {
    candidates.push(body);
  }
  if (!seen.has(clone)) {
    candidates.push(clone);
  }

  return candidates
    .map((element) => ({ element, score: candidateScore(element) }))
    .sort((left, right) => right.score - left.score);
}

function candidateScore(element: Element): number {
  const readableElements = element.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,pre,code,table,blockquote").length;
  return readableTextLength(element) + readableElements * 250;
}

function readableTextLength(element: Element): number {
  return collapseWhitespace(element.textContent ?? "").length;
}
