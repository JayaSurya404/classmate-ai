import { describe, expect, it } from "vitest";
import type { KnowledgeGraphEdge, KnowledgeGraphNode, NoteBlock } from "@classmate/contracts";
import { NotebookService } from "./notebook";

describe("NotebookService", () => {
  it("creates notes, autosaves versions, and searches tags/content", () => {
    const note = NotebookService.createNote({
      title: "Binary Search",
      markdown: "# Binary Search\n\n- [ ] Review divide and conquer\n\n```ts\nconst mid = 1;\n```",
    });
    const saved = NotebookService.autoSave(note, `${note.markdown}\n\nUpdated notes.`);
    const hits = NotebookService.search([saved], { query: "divide", status: "active" });

    expect(note.blocks.some((block: NoteBlock) => block.type === "checkbox")).toBe(true);
    expect(note.blocks.some((block: NoteBlock) => block.type === "code")).toBe(true);
    expect(saved.versions).toHaveLength(1);
    expect(hits[0]?.title).toBe("Binary Search");
  });

  it("generates cited AI notes and builds a knowledge graph", () => {
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const first = NotebookService.generateAiNote({
      title: "Revision Note",
      kind: "revision",
      sourceTitle: "Algorithms",
      sourceText: "Binary search repeatedly halves a sorted range until the target is found.",
      sourceId,
      citations: [{ id: "c1", sourceId, chunkId: "chunk-1", quote: "halves a sorted range", confidence: "high" }],
    });
    const second = NotebookService.linkNotes(NotebookService.createNote({ title: "Related", markdown: "Binary search examples.", sourceIds: [sourceId] }), first.id);
    const graph = NotebookService.buildKnowledgeGraph([first, second]);
    const related = NotebookService.relatedNotes([first, second], first);

    expect(first.citations[0]?.chunkId).toBe("chunk-1");
    expect(graph.nodes.some((node: KnowledgeGraphNode) => node.kind === "source")).toBe(true);
    expect(graph.edges.some((edge: KnowledgeGraphEdge) => edge.label === "links")).toBe(true);
    expect(related[0]?.note.id).toBe(second.id);
  });

  it("exports notebook data in markdown, html, csv, and json", () => {
    const note = NotebookService.createNote({ title: "Export Me", markdown: "Important note." });
    const graph = NotebookService.buildKnowledgeGraph([note]);

    expect(NotebookService.exportNotes([note], graph, "markdown")).toContain("# Export Me");
    expect(NotebookService.exportNotes([note], graph, "html")).toContain("<article>");
    expect(NotebookService.exportNotes([note], graph, "csv")).toContain("title,kind,status");
    expect(NotebookService.exportNotes([note], graph, "json")).toContain("Export Me");
  });
});
