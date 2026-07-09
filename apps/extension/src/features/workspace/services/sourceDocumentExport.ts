import type { SourceAnnotation } from "@classmate/contracts";
import {
  isImageSourceDocument,
  isPdfSourceDocument,
  isYoutubeSourceDocument,
  type StoredSourceDocument,
} from "../sourceDocuments";

export type SourceExportFormat = "markdown" | "json" | "csv";

export function exportSourceDocument(
  document: StoredSourceDocument,
  annotations: readonly SourceAnnotation[],
  format: SourceExportFormat,
): string {
  if (format === "json") {
    return JSON.stringify({ document, annotations }, null, 2);
  }
  if (format === "csv") {
    return toCsv(document, annotations);
  }
  return toMarkdown(document, annotations);
}

export function searchSourceDocument(document: StoredSourceDocument, query: string): readonly SourceSearchHit[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  if (isPdfSourceDocument(document)) {
    return document.payload.pages.flatMap((page) =>
      page.text.toLowerCase().includes(normalized)
        ? [{ id: `${document.id}:p${String(page.pageNumber)}`, label: `Page ${String(page.pageNumber)}`, snippet: snippet(page.text, normalized), pageNumber: page.pageNumber }]
        : [],
    );
  }
  if (isYoutubeSourceDocument(document)) {
    return document.payload.segments.flatMap((segment) =>
      segment.text.toLowerCase().includes(normalized)
        ? [{ id: segment.id, label: formatTimestamp(segment.startMs), snippet: snippet(segment.text, normalized), timestampMs: segment.startMs }]
        : [],
    );
  }
  if (isImageSourceDocument(document)) {
    return document.payload.ocrRegions.flatMap((region) =>
      region.text.toLowerCase().includes(normalized)
        ? [{ id: region.id, label: "OCR region", snippet: snippet(region.text, normalized), pageNumber: region.pageNumber }]
        : [],
    );
  }
  return [];
}

export interface SourceSearchHit {
  id: string;
  label: string;
  snippet: string;
  pageNumber?: number | undefined;
  timestampMs?: number | undefined;
}

function toMarkdown(document: StoredSourceDocument, annotations: readonly SourceAnnotation[]): string {
  const lines = [`# ${document.title}`, "", `Source: ${document.url}`, ""];
  if (isPdfSourceDocument(document)) {
    lines.push(`Pages: ${String(document.payload.pageCount)}`, "");
    for (const page of document.payload.pages) {
      lines.push(`## Page ${String(page.pageNumber)}`, page.text, "");
    }
  } else if (isYoutubeSourceDocument(document)) {
    lines.push(`Video: ${document.payload.embedUrl}`, "");
    for (const segment of document.payload.segments) {
      lines.push(`- [${formatTimestamp(segment.startMs)}] ${segment.text}`);
    }
    lines.push("");
  } else if (isImageSourceDocument(document)) {
    lines.push(`Image: ${document.payload.width ?? "?"}x${document.payload.height ?? "?"}`, "");
    for (const region of document.payload.ocrRegions) {
      lines.push(`- ${region.text}`);
    }
    lines.push("");
  }
  if (annotations.length > 0) {
    lines.push("## Annotations");
    annotations.forEach((annotation) => {
      lines.push(`- ${annotation.kind}: ${annotation.text ?? annotation.anchor.quote ?? ""}`);
    });
  }
  return lines.join("\n");
}

function toCsv(document: StoredSourceDocument, annotations: readonly SourceAnnotation[]): string {
  const rows: string[][] = [["type", "location", "text"]];
  if (isPdfSourceDocument(document)) {
    document.payload.pages.forEach((page) => rows.push(["pdf_page", `page ${String(page.pageNumber)}`, page.text]));
  }
  if (isYoutubeSourceDocument(document)) {
    document.payload.segments.forEach((segment) => rows.push(["transcript", formatTimestamp(segment.startMs), segment.text]));
  }
  if (isImageSourceDocument(document)) {
    document.payload.ocrRegions.forEach((region) => rows.push(["ocr", region.pageNumber ? `page ${String(region.pageNumber)}` : "image", region.text]));
  }
  annotations.forEach((annotation) => rows.push([annotation.kind, annotation.anchor.pageNumber ? `page ${String(annotation.anchor.pageNumber)}` : "", annotation.text ?? ""]));
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function snippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query);
  const start = Math.max(0, index - 48);
  return text.slice(start, start + 140).trim();
}

function formatTimestamp(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
