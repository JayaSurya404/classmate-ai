import { describe, expect, it } from "vitest";
import {
  extractOcrImage,
  extractPdfDocument,
  extractYoutubeVideo,
  sourceSnapshotsFromPdfExtraction,
} from "./multimodalSources";

describe("multimodal source adapters", () => {
  it("extracts a PDF document with document and page snapshots", async () => {
    const extraction = await extractPdfDocument({
      url: "https://example.edu/paper.pdf",
      title: "Algorithms Paper",
      pages: [
        { pageNumber: 1, text: "Abstract\nBinary search is efficient.", headings: ["Abstract"] },
        { pageNumber: 2, text: "Method\nDivide and conquer halves the range.", headings: ["Method"] },
      ],
      bookmarks: [{ id: "bookmark-1", pageNumber: 2, label: "Method" }],
    });

    expect(extraction.document.snapshot.sourceType).toBe("pdf");
    expect(extraction.pages).toHaveLength(2);
    expect(extraction.outline[0]?.title).toBe("Abstract");
    expect(extraction.bookmarks[0]?.pageNumber).toBe(2);
    expect(sourceSnapshotsFromPdfExtraction(extraction)).toHaveLength(3);
  });

  it("extracts OCR image regions as an image source", async () => {
    const result = await extractOcrImage({
      url: "file:scan.png",
      title: "Scanned notes",
      mimeType: "image/png",
      width: 640,
      height: 480,
      regions: [
        {
          text: "Photosynthesis converts light into chemical energy.",
          confidence: 0.91,
          boundingBox: [0, 0, 640, 120],
        },
      ],
    });

    expect(result.snapshot.sourceType).toBe("image");
    expect(result.snapshot.scope).toBe("image");
    expect(result.metadata.description).toContain("OCR source");
    expect(result.metadata.images[0]?.caption).toBe("Scanned notes");
  });

  it("extracts a YouTube transcript with chapters and timestamp index", async () => {
    const result = await extractYoutubeVideo({
      url: "https://www.youtube.com/watch?v=abc123",
      title: "Operating Systems Lecture",
      description: "Processes and scheduling.",
      author: "Course Channel",
      thumbnailUrl: "https://img.youtube.com/vi/abc123/default.jpg",
      chapters: [{ title: "Scheduling", startMs: 10_000 }],
      transcript: [
        { text: "Welcome to operating systems.", startMs: 0, durationMs: 4_000, language: "en" },
        { text: "Scheduling decides which process runs next.", startMs: 10_000, durationMs: 6_000, language: "en" },
      ],
    });

    expect(result.snapshot.sourceType).toBe("youtube");
    expect(result.chapters[0]?.title).toBe("Scheduling");
    expect(result.timestampIndex[1]?.endMs).toBe(16_000);
    expect(result.metadata.images[0]?.src).toContain("abc123");
  });
});
