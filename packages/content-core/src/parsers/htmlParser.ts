import { parseHTML } from "linkedom";
import { removeBoilerplate } from "../cleaners";
import type { ExtractionInput } from "../types";

export interface ParsedHtmlDocument {
  document: Document;
  root: Element;
}

export function parseHtmlDocument(input: Pick<ExtractionInput, "html">, rootSelector: string): ParsedHtmlDocument {
  const { document } = parseHTML(input.html);
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  removeBoilerplate(clone);
  const root = clone.querySelector(rootSelector) ?? clone.querySelector("body") ?? clone;
  return { document, root };
}

export function selectContentRoot(document: Document, selector: string): Element {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  removeBoilerplate(clone);
  return clone.querySelector(selector) ?? clone.querySelector("body") ?? clone;
}
