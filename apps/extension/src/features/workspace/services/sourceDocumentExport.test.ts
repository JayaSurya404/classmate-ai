import { describe, expect, it } from "vitest";
import { createStoredAnnotation, createStoredSourceDocument } from "../sourceDocuments";
import { exportSourceDocument, searchSourceDocument } from "./sourceDocumentExport";

const sourceId = "11111111-1111-4111-8111-111111111111";

describe("source document export service", () => {
  it("exports PDF source documents as Markdown and CSV", () => {
    const document = createStoredSourceDocument({
      id: "22222222-2222-4222-8222-222222222222",
      sourceId,
      title: "Research Paper",
      url: "https://example.org/paper.pdf",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: {
        kind: "pdf",
        title: "Research Paper",
        url: "https://example.org/paper.pdf",
        pageCount: 1,
        pages: [
          {
            pageNumber: 1,
            text: 'Binary search uses a "divide" strategy.',
            headings: [],
            links: [],
            tables: [],
            images: [],
          },
        ],
        keywords: [],
        currentPage: 1,
        outline: [],
      },
    });
    const annotation = createStoredAnnotation({
      id: "33333333-3333-4333-8333-333333333333",
      sourceId,
      kind: "highlight",
      text: "Important algorithm",
      color: "yellow",
      createdAt: "2026-01-01T00:00:00.000Z",
      anchor: { pageNumber: 1, quote: "Binary search" },
    });

    expect(exportSourceDocument(document, [annotation], "markdown")).toContain("## Page 1");
    expect(exportSourceDocument(document, [annotation], "markdown")).toContain("Important algorithm");
    expect(exportSourceDocument(document, [annotation], "csv")).toContain('"Binary search uses a ""divide"" strategy."');
  });

  it("exports JSON with annotations and searches YouTube transcript timestamps", () => {
    const document = createStoredSourceDocument({
      id: "44444444-4444-4444-8444-444444444444",
      sourceId,
      title: "Lecture",
      url: "https://www.youtube.com/watch?v=abc123",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: {
        kind: "youtube",
        title: "Lecture",
        url: "https://www.youtube.com/watch?v=abc123",
        videoId: "abc123",
        embedUrl: "https://www.youtube-nocookie.com/embed/abc123",
        chapters: [],
        tracks: [],
        segments: [
          { id: "seg-1", text: "Welcome to the lecture.", startMs: 0 },
          { id: "seg-2", text: "Merge sort recursively splits arrays.", startMs: 90_000 },
        ],
      },
    });

    const json = exportSourceDocument(document, [], "json");
    const hits = searchSourceDocument(document, "recursively");

    expect(json).toContain('"kind": "youtube"');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.timestampMs).toBe(90_000);
    expect(hits[0]?.label).toBe("01:30");
  });

  it("searches OCR image regions", () => {
    const document = createStoredSourceDocument({
      id: "55555555-5555-4555-8555-555555555555",
      sourceId,
      title: "Whiteboard",
      url: "file:whiteboard.png",
      createdAt: "2026-01-01T00:00:00.000Z",
      payload: {
        kind: "image",
        title: "Whiteboard",
        url: "file:whiteboard.png",
        captions: [],
        ocrRegions: [
          {
            id: "region-1",
            text: "Photosynthesis converts light into energy.",
            confidence: 0.87,
            pageNumber: 1,
            blockType: "paragraph",
          },
        ],
      },
    });

    const hits = searchSourceDocument(document, "light");

    expect(hits).toHaveLength(1);
    expect(hits[0]?.pageNumber).toBe(1);
    expect(exportSourceDocument(document, [], "markdown")).toContain("Photosynthesis");
  });
});
