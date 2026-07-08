import { describe, expect, it } from "vitest";
import { createSourceSnapshot } from "@classmate/test-kit";
import {
  chunkByHeadings,
  chunkSource,
  detectLanguage,
  generateChunkCitations,
  normalizeVisibleText,
  calculateReadability,
  validateCitationIds,
} from "./index";

describe("content pipeline utilities", () => {
  it("normalizes visible text", () => {
    expect(normalizeVisibleText(" a   b \n\n\n c ")).toBe("a b\n\n c");
  });

  it("chunks source blocks within token budget", () => {
    const chunks = chunkSource(createSourceSnapshot());
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.semanticType).toBe("paragraph");
    expect(chunks[0]?.blockIds).toEqual(["b1"]);
    expect(chunks[0]?.metadata.contentTypes).toEqual(["paragraph"]);
    expect(chunks[0]?.metadata.citationId).toContain(":chunk:1");
  });

  it("validates citation IDs against chunk IDs", () => {
    const chunks = chunkSource(createSourceSnapshot());
    expect(validateCitationIds(["S1-C1", "invented"], chunks)).toEqual(["S1-C1"]);
  });

  it("chunks by headings into semantic sections", () => {
    const source = createSourceSnapshot({
      blocks: [
        {
          id: "b1",
          type: "heading",
          text: "Intro",
          headingPath: ["Intro"],
          startOffset: 0,
          endOffset: 5,
        },
        {
          id: "b2",
          type: "paragraph",
          text: "First paragraph.",
          headingPath: ["Intro"],
          startOffset: 7,
          endOffset: 23,
        },
        {
          id: "b3",
          type: "heading",
          text: "Details",
          headingPath: ["Details"],
          startOffset: 25,
          endOffset: 32,
        },
        {
          id: "b4",
          type: "paragraph",
          text: "Second paragraph.",
          headingPath: ["Details"],
          startOffset: 34,
          endOffset: 51,
        },
      ],
    });

    const sections = chunkByHeadings(source);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.sectionTitle).toBe("Intro");
    expect(sections[1]?.sectionTitle).toBe("Details");
    expect(sections[0]?.metadata.contentTypes).toEqual(["heading", "paragraph"]);
  });

  it("detects declared and script-based languages", () => {
    expect(detectLanguage("Hello world", "en-US")).toBe("en");
    expect(detectLanguage("प्रकाश संश्लेषण पौधों में होता है")).toBe("hi");
  });

  it("calculates deterministic readability metrics", () => {
    const readability = calculateReadability("Cells store energy. Students observe cells under microscopes.");
    expect(readability.sentenceCount).toBe(2);
    expect(readability.averageWordsPerSentence).toBeGreaterThan(1);
    expect(readability.label).toMatch(/easy|standard|difficult/);
  });

  it("generates chunk citations for grounded AI features", () => {
    const source = createSourceSnapshot();
    const chunks = chunkSource(source);
    const citations = generateChunkCitations(source, chunks);
    expect(citations[0]?.id).toBe(chunks[0]?.metadata.citationId);
    expect(citations[0]?.blockId).toBe("b1");
  });
});
