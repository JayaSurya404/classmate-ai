import { describe, expect, it } from "vitest";
import type { SourceSnapshot } from "@classmate/contracts";
import type { ProviderModel } from "./index";
import { LocalEmbeddingService, routeOfflineAi, SemanticRetrievalService, VectorIndex } from "./index";

const source: SourceSnapshot = {
  schemaVersion: 1,
  id: "11111111-1111-4111-8111-111111111111",
  title: "Algorithms",
  canonicalUrl: "https://example.com/algorithms",
  sourceType: "article",
  capturedAt: "2026-01-01T00:00:00.000Z",
  contentHash: "hash-000000000001",
  language: "en",
  scope: "page",
  sensitivity: "clear",
  blocks: [
    {
      id: "b1",
      type: "heading",
      text: "Binary Search",
      headingPath: ["Binary Search"],
      startOffset: 0,
      endOffset: 13,
    },
    {
      id: "b2",
      type: "paragraph",
      text: "Binary search halves a sorted array to find a target efficiently.",
      headingPath: ["Binary Search"],
      startOffset: 14,
      endOffset: 80,
    },
    {
      id: "b3",
      type: "paragraph",
      text: "Merge sort recursively splits arrays and combines sorted halves.",
      headingPath: ["Merge Sort"],
      startOffset: 81,
      endOffset: 150,
    },
  ],
};

describe("semantic retrieval", () => {
  it("generates local embeddings and performs hybrid semantic search", () => {
    const embeddings = new LocalEmbeddingService({ dimensions: 32 });
    const records = embeddings.embedSource(source);
    const index = new VectorIndex(records);
    const hits = index.search(embeddings.embed("sorted array target"), { query: "sorted array target", limit: 2 });

    expect(records[0]?.vector).toHaveLength(32);
    expect(hits[0]?.text).toContain("sorted array");
    expect(hits[0]?.citations[0]?.sourceId).toBe(source.id);
  });

  it("builds citation-preserving RAG context and related concepts", () => {
    const service = new SemanticRetrievalService();
    service.indexSource(source);
    const context = service.buildRagContext("How does binary search work?", [{ role: "user", content: "I am studying arrays." }]);

    expect(context.compressedText).toContain("citation:");
    expect(context.evidenceScore).toBeGreaterThan(0);
    expect(service.relatedConcepts("binary search").length).toBeGreaterThan(0);
  });

  it("detects duplicate records and clusters similar chunks", () => {
    const service = new SemanticRetrievalService();
    const records = service.indexSource(source);
    const index = new VectorIndex([...records, { ...records[0]!, id: "22222222-2222-4222-8222-222222222222" }]);

    expect(index.duplicates().length).toBeGreaterThan(0);
    expect(index.clusters().length).toBeGreaterThan(0);
  });

  it("routes offline mode to local Ollama when available", () => {
    const model: ProviderModel = {
      id: "llama3.2",
      displayName: "Local Llama",
      providerId: "ollama",
      isFree: true,
      contextTokens: 8_000,
      capabilities: { textGeneration: true, streaming: true, structuredOutput: false, largeContext: false, local: true },
    };
    const route = routeOfflineAi({
      mode: "offline",
      online: false,
      models: [model],
      health: [{ providerId: "ollama", available: true }],
    });

    expect(route.offline).toBe(true);
    expect(route.providerOrder).toEqual(["ollama"]);
  });
});
