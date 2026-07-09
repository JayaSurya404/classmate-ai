import { describe, expect, it } from "vitest";
import { SourceSnapshotSchema } from "@classmate/contracts";
import {
  extractFromImageOcr,
  extractFromOcrRegions,
  extractFromPdfSelection,
  extractFromPdfPages,
  extractFromYoutubePageData,
  extractFromYoutubeTranscript,
  isOcrPipelineReady,
  isPdfPipelineReady,
  isYoutubePipelineReady,
} from "../adapters/futurePipelines";

describe("future content pipelines", () => {
  it("extracts PDF page text into normalized snapshot", async () => {
    const result = await extractFromPdfPages("https://example.org/paper.pdf", "Research Paper", [
      {
        pageNumber: 1,
        text: "Abstract\nThis paper discusses distributed systems.",
        headings: ["Abstract"],
        links: [{ href: "https://example.org/ref", text: "Reference", pageNumber: 1 }],
      },
      {
        pageNumber: 2,
        text: "Introduction\nWe present a novel approach.",
        tables: [{ pageNumber: 2, rows: [["Metric", "Value"], ["Accuracy", "98%"]] }],
      },
    ]);

    expect(SourceSnapshotSchema.safeParse(result.snapshot).success).toBe(true);
    expect(result.snapshot.sourceType).toBe("pdf");
    expect(result.snapshot.scope).toBe("pdf_pages");
    expect(result.snapshot.blocks.some((block) => block.headingPath.includes("Page 1"))).toBe(true);
    expect(result.metadata.links[0]?.pageNumber).toBe(1);
    expect(result.metadata.citations[0]?.href).toContain("#page=1");
  });

  it("extracts a PDF page selection with page citation", async () => {
    const result = await extractFromPdfSelection(
      "https://example.org/paper.pdf",
      "Research Paper",
      3,
      "Selected theorem statement.",
    );

    expect(result.snapshot.scope).toBe("selection");
    expect(result.metadata.citations[0]?.href).toContain("#page=3");
  });

  it("extracts YouTube transcript segments", async () => {
    const result = await extractFromYoutubeTranscript(
      "https://youtube.com/watch?v=abc",
      "Lecture recording",
      [
        { text: "Welcome to the lecture.", startMs: 0 },
        { text: "Today we cover operating systems.", startMs: 4000, language: "en", chapterTitle: "Introduction" },
      ],
    );

    expect(result.snapshot.sourceType).toBe("youtube");
    expect(result.snapshot.scope).toBe("transcript");
    expect(result.snapshot.blocks.some((block) => block.headingPath.join("/") === "Transcript/Introduction")).toBe(true);
    expect(result.metadata.description).toContain("2 segments");
    expect(result.metadata.links[1]?.timestampMs).toBe(4000);
  });

  it("extracts YouTube page data with chapters and multilingual tracks", async () => {
    const result = await extractFromYoutubePageData(
      "https://youtube.com/watch?v=abc",
      "Lecture recording",
      [
        { text: "Bonjour tout le monde.", startMs: 0, language: "fr", chapterTitle: "Accueil" },
        { text: "Bienvenue dans le cours.", startMs: 2000, language: "fr", chapterTitle: "Accueil" },
      ],
      [{ title: "Accueil", startMs: 0 }],
      [
        { id: "fr", language: "fr", label: "French", isDefault: true },
        { id: "en", language: "en", label: "English" },
      ],
      "A multilingual lecture transcript.",
    );

    expect(result.metadata.keywords).toContain("fr");
    expect(result.metadata.keywords).toContain("accueil");
    expect(result.metadata.description).toContain("multilingual");
  });

  it("extracts OCR regions with review sensitivity", async () => {
    const result = await extractFromOcrRegions("https://example.org/scan", "Scanned notes", [
      { text: "Chapter 1", confidence: 0.92, blockType: "heading", pageNumber: 1 },
      { text: "Photosynthesis converts light to energy.", confidence: 0.88, pageNumber: 1 },
    ]);

    expect(result.snapshot.sensitivity).toBe("review");
    expect(result.snapshot.blocks[0]?.headingPath).toEqual(["Page 1", "Chapter 1"]);
    expect(result.metadata.siteFamily).toBe("generic");
  });

  it("extracts image OCR as an image snapshot", async () => {
    const result = await extractFromImageOcr({
      url: "https://example.org/whiteboard.png",
      title: "Whiteboard",
      text: "Binary search divides the search range in half.",
      captions: ["Classroom whiteboard"],
    });

    expect(result.snapshot.sourceType).toBe("image");
    expect(result.snapshot.scope).toBe("image");
    expect(result.metadata.images[0]?.caption).toBe("Classroom whiteboard");
  });

  it("reports pipeline readiness flags", () => {
    expect(isPdfPipelineReady()).toBe(true);
    expect(isYoutubePipelineReady()).toBe(true);
    expect(isOcrPipelineReady()).toBe(true);
  });
});
