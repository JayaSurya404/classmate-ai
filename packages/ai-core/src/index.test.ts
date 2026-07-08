import { describe, expect, it } from "vitest";
import { createSourceSnapshot } from "@classmate/test-kit";
import type { GenerationRequest } from "@classmate/contracts";
import type { ProviderModel } from "./index";
import { isAllowedLoopback } from "./index";
import {
  compressSource,
  createIntelligencePlan,
  createMetric,
  MemoryResponseCache,
  routeProviders,
  scoreConfidence,
} from "./index";

describe("Ollama endpoint policy", () => { it("permits only explicit HTTP loopback addresses", () => { expect(isAllowedLoopback("http://localhost:11434/v1")).toBe(true); expect(isAllowedLoopback("https://example.com")).toBe(false); expect(isAllowedLoopback("file:///tmp/model")).toBe(false); }); });

const models: readonly ProviderModel[] = [
  model("gemini", 1_000_000),
  model("groq", 128_000),
  model("openrouter", 128_000),
  model("ollama", 32_000, true),
];

describe("AI intelligence layer", () => {
  it("routes providers by preference, availability, and context fit", () => {
    const request = requestFor(createSourceSnapshot(), "summary");
    const routes = routeProviders({
      request,
      models,
      preferredProviderId: "groq",
      health: [
        { providerId: "gemini", available: true, latencyMs: 900 },
        { providerId: "groq", available: true, latencyMs: 400 },
        { providerId: "openrouter", available: true, latencyMs: 700 },
        { providerId: "ollama", available: true, latencyMs: 300 },
      ],
      history: [],
    });

    expect(routes[0]).toBe("groq");
    expect(routes).toContain("gemini");
  });

  it("falls back when the preferred provider is unavailable", () => {
    const routes = routeProviders({
      request: requestFor(createSourceSnapshot(), "summary"),
      models,
      preferredProviderId: "gemini",
      health: [
        { providerId: "gemini", available: false },
        { providerId: "groq", available: true },
        { providerId: "openrouter", available: true },
        { providerId: "ollama", available: true },
      ],
      history: [],
    });

    expect(routes[0]).toBe("groq");
    expect(routes).not.toContain("gemini");
  });

  it("compresses context while preserving selected source blocks", () => {
    const source = createSourceSnapshot({
      blocks: [
        block("b1", "heading", "Install"),
        block("b2", "paragraph", "Run pnpm install to set up the project."),
        block("b3", "paragraph", "Photosynthesis converts light energy in plants."),
      ],
    });
    const compressed = compressSource(source, "How do I install this project?", 80);

    expect(compressed.source.blocks.some((entry) => entry.id === "b2")).toBe(true);
    expect(compressed.selectedChunkIds.length).toBeGreaterThan(0);
    expect(compressed.coverageRatio).toBeGreaterThan(0);
  });

  it("adds relevant session memory to future requests", () => {
    const plan = createIntelligencePlan({
      request: requestFor(createSourceSnapshot(), "explain_simple"),
      models,
      preferredProviderId: "gemini",
      health: [{ providerId: "gemini", available: true }],
      history: [
        { role: "user", content: "What is a kernel?" },
        { role: "assistant", content: "A kernel manages system resources." },
      ],
    });

    expect(plan.request.prompt).toContain("Relevant session memory");
    expect(plan.request.prompt).toContain("kernel manages");
  });

  it("caches identical responses and invalidates by source hash", () => {
    const cache = new MemoryResponseCache();
    cache.set("key", "hash-a", "answer");
    expect(cache.get("key", "hash-a")?.content).toBe("answer");
    expect(cache.get("key", "hash-b")).toBeUndefined();
    cache.invalidateSource("hash-a");
    expect(cache.get("key", "hash-a")).toBeUndefined();
  });

  it("creates content-free metrics records", () => {
    const metric = createMetric({
      id: "metric-1",
      providerId: "gemini",
      operationId: "op-1",
      forecast: { promptTokens: 100, completionTokens: 50, totalTokens: 150, estimatedLatencyMs: 2000, estimatedCostUsd: 0 },
      cacheHit: true,
      retries: 1,
      status: "completed",
      latencyMs: 1234.4,
      modelId: "gemini-2.5-flash",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    expect(metric.promptTokens).toBe(100);
    expect(metric.latencyMs).toBe(1234);
    expect(JSON.stringify(metric)).not.toContain("answer");
  });

  it("scores confidence lower when evidence coverage is weak", () => {
    const high = scoreConfidence(
      { source: createSourceSnapshot(), selectedChunkIds: ["S1-C1"], omittedChunkCount: 0, coverageRatio: 1 },
      { action: "summary", templateId: "study.summary", contentKind: "documentation", instruction: "" },
      "Explain event loop behavior",
    );
    const low = scoreConfidence(
      { source: createSourceSnapshot(), selectedChunkIds: [], omittedChunkCount: 5, coverageRatio: 0.1 },
      { action: "summary", templateId: "study.summary", contentKind: "article", instruction: "" },
      "Explain event loop behavior",
    );

    expect(high.label).toBe("high");
    expect(low.label).toBe("low");
    expect(low.reason).toContain("uncertainty");
  });
});

function model(providerId: ProviderModel["providerId"], contextTokens: number, local = false): ProviderModel {
  return {
    id: `${providerId}-model`,
    displayName: providerId,
    providerId,
    isFree: true,
    contextTokens,
    capabilities: { textGeneration: true, streaming: true, structuredOutput: false, largeContext: contextTokens > 64_000, local },
  };
}

function requestFor(source: ReturnType<typeof createSourceSnapshot>, action: GenerationRequest["action"]): GenerationRequest {
  return {
    schemaVersion: 1,
    operationId: "00000000-0000-4000-8000-000000000002",
    action,
    prompt: "Explain the source",
    source,
    providerId: "gemini",
    modelId: "gemini-model",
    settings: { depth: "standard", locale: "en", allowPaid: false },
  };
}

function block(
  id: string,
  type: ReturnType<typeof createSourceSnapshot>["blocks"][number]["type"],
  text: string,
): ReturnType<typeof createSourceSnapshot>["blocks"][number] {
  return {
    id,
    type,
    text,
    headingPath: type === "heading" ? [text] : ["Install"],
    startOffset: 0,
    endOffset: text.length,
  };
}
