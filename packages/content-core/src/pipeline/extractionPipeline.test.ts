import { describe, expect, it } from "vitest";
import { SourceSnapshotSchema } from "@classmate/contracts";
import { extractContent } from "../pipeline/extractionPipeline";
import {
  GENERIC_ARTICLE_HTML,
  GEEKSFORGEEKS_HTML,
  GITHUB_README_HTML,
  MDN_HTML,
  MEDIUM_HTML,
  RESEARCH_PAPER_HTML,
  STACKOVERFLOW_HTML,
  W3SCHOOLS_HTML,
  WIKIPIA_HTML,
  DOCUMENTATION_HTML,
} from "../testing/fixtures";

describe("extractContent", () => {
  it("extracts Wikipedia article structure", async () => {
    const result = await extractContent({
      url: "https://en.wikipedia.org/wiki/Operating_system",
      title: "Operating system - Wikipedia",
      html: WIKIPIA_HTML,
      language: "en",
      scope: "page",
    });

    expect(SourceSnapshotSchema.safeParse(result.snapshot).success).toBe(true);
    expect(result.metadata.siteFamily).toBe("wikipedia");
    expect(result.metadata.keywords).toContain("operating system");
    expect(result.snapshot.blocks.some((block) => block.type === "heading")).toBe(true);
    expect(result.snapshot.blocks.some((block) => block.type === "list")).toBe(true);
    expect(result.snapshot.blocks.some((block) => block.type === "code")).toBe(true);
    expect(result.snapshot.blocks.some((block) => block.type === "table")).toBe(true);
    expect(result.metadata.citations.length).toBeGreaterThan(0);
    expect(result.metadata.readingTimeMinutes).toBeGreaterThan(0);
  });

  it("extracts MDN documentation with code blocks", async () => {
    const result = await extractContent({
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
      title: "Array - JavaScript | MDN",
      html: MDN_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("mdn");
    expect(result.snapshot.sourceType).toBe("documentation");
    expect(result.snapshot.blocks.some((block) => block.type === "code" && block.language === "js")).toBe(true);
  });

  it("extracts GitHub README repository content", async () => {
    const result = await extractContent({
      url: "https://github.com/example/classmate-ai",
      title: "README",
      html: GITHUB_README_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("github");
    expect(result.snapshot.sourceType).toBe("repository");
    expect(result.snapshot.title).toContain("ClassMate AI");
    expect(result.metadata.links.some((link) => link.href.includes("github.com"))).toBe(true);
  });

  it("extracts Stack Overflow Q&A prose", async () => {
    const result = await extractContent({
      url: "https://stackoverflow.com/questions/1/example",
      title: "Event loop question",
      html: STACKOVERFLOW_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("stackoverflow");
    expect(result.snapshot.blocks.some((block) => block.text.includes("event loop"))).toBe(true);
  });

  it("extracts generic article metadata and images", async () => {
    const result = await extractContent({
      url: "https://example.org/bst",
      title: "Study Notes",
      html: GENERIC_ARTICLE_HTML,
      scope: "page",
    });

    expect(result.metadata.author).toBe("Alex Student");
    expect(result.metadata.keywords).toContain("notes");
    expect(result.metadata.images).toHaveLength(1);
    expect(result.snapshot.blocks.some((block) => block.type === "quote")).toBe(true);
  });

  it("prefers explicit selection scope", async () => {
    const result = await extractContent({
      url: "https://example.org/page",
      title: "Page",
      html: GENERIC_ARTICLE_HTML,
      selection: "Selected snippet only",
      scope: "selection",
    });

    expect(result.snapshot.scope).toBe("selection");
    expect(result.snapshot.blocks).toHaveLength(1);
    expect(result.snapshot.blocks[0]?.text).toBe("Selected snippet only");
    expect(result.snapshot.blocks[0]?.headingPath).toEqual(["Selection"]);
  });

  it("assigns stable block offsets", async () => {
    const result = await extractContent({
      url: "https://example.org/page",
      title: "Page",
      html: GENERIC_ARTICLE_HTML,
      scope: "page",
    });

    for (const block of result.snapshot.blocks) {
      expect(block.endOffset).toBeGreaterThanOrEqual(block.startOffset);
    }
  });

  it("extracts W3Schools tutorial content", async () => {
    const result = await extractContent({
      url: "https://www.w3schools.com/js/default.asp",
      title: "JavaScript Tutorial",
      html: W3SCHOOLS_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("w3schools");
    expect(result.snapshot.sourceType).toBe("documentation");
    expect(result.metadata.language).toBe("en");
  });

  it("extracts GeeksForGeeks article content", async () => {
    const result = await extractContent({
      url: "https://www.geeksforgeeks.org/data-structures/",
      title: "Data Structures",
      html: GEEKSFORGEEKS_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("geeksforgeeks");
    expect(result.snapshot.blocks.some((block) => block.text.includes("data structure"))).toBe(true);
  });

  it("extracts Medium article publication metadata", async () => {
    const result = await extractContent({
      url: "https://medium.com/example/learning",
      title: "Learning in Public",
      html: MEDIUM_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("medium");
    expect(result.metadata.publishedAt).toBe("2026-01-05T10:00:00.000Z");
  });

  it("extracts research paper author and citations", async () => {
    const result = await extractContent({
      url: "https://arxiv.org/abs/1234.5678",
      title: "Retrieval Practice Study",
      html: RESEARCH_PAPER_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("research_paper");
    expect(result.metadata.author).toBe("Dr. Ada Raman");
    expect(result.metadata.citations[0]?.id).toBe("ref-1");
  });

  it("extracts documentation sites with heading metadata and readability", async () => {
    const result = await extractContent({
      url: "https://docs.example.dev/install",
      title: "Install Guide",
      html: DOCUMENTATION_HTML,
      scope: "page",
    });

    expect(result.metadata.siteFamily).toBe("documentation");
    expect(result.metadata.headings[0]?.text).toBe("Install Guide");
    expect(result.metadata.readability.sentenceCount).toBeGreaterThan(0);
  });
});
