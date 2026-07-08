import { describe, expect, it } from "vitest";
import { SourceSnapshotSchema } from "@classmate/contracts";
import {
  extractFromOcrRegions,
  extractFromPdfPages,
  extractFromYoutubeTranscript,
  isOcrPipelineReady,
  isPdfPipelineReady,
  isYoutubePipelineReady,
} from "../adapters/futurePipelines";

describe("future content pipelines", () => {
  it("extracts PDF page text into normalized snapshot", async () => {
    const result = await extractFromPdfPages("https://example.org/paper.pdf", "Research Paper", [
      { pageNumber: 1, text: "Abstract\nThis paper discusses distributed systems." },
      { pageNumber: 2, text: "Introduction\nWe present a novel approach." },
    ]);

    expect(SourceSnapshotSchema.safeParse(result.snapshot).success).toBe(true);
    expect(result.snapshot.sourceType).toBe("pdf");
    expect(result.snapshot.scope).toBe("pdf_pages");
    expect(result.snapshot.blocks.some((block) => block.headingPath.includes("Page 1"))).toBe(true);
  });

  it("extracts YouTube transcript segments", async () => {
    const result = await extractFromYoutubeTranscript(
      "https://youtube.com/watch?v=abc",
      "Lecture recording",
      [
        { text: "Welcome to the lecture.", startMs: 0 },
        { text: "Today we cover operating systems.", startMs: 4000 },
      ],
    );

    expect(result.snapshot.sourceType).toBe("youtube");
    expect(result.snapshot.scope).toBe("transcript");
    expect(result.snapshot.blocks[0]?.headingPath).toEqual(["Transcript"]);
    expect(result.metadata.description).toContain("2 segments");
  });

  it("extracts OCR regions with review sensitivity", async () => {
    const result = await extractFromOcrRegions("https://example.org/scan", "Scanned notes", [
      { text: "Chapter 1", confidence: 0.92 },
      { text: "Photosynthesis converts light to energy.", confidence: 0.88 },
    ]);

    expect(result.snapshot.sensitivity).toBe("review");
    expect(result.snapshot.blocks[0]?.headingPath).toEqual(["OCR"]);
    expect(result.metadata.siteFamily).toBe("generic");
  });

  it("reports pipeline readiness flags", () => {
    expect(isPdfPipelineReady()).toBe(false);
    expect(isYoutubePipelineReady()).toBe(false);
    expect(isOcrPipelineReady()).toBe(false);
  });
});
