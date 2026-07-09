import {
  EmbeddingRecordSchema,
  RetrievalCacheEntrySchema,
  RetrievalEvidenceSchema,
  SemanticClusterSchema,
  type Citation,
  type EmbeddingRecord,
  type OfflineAiMode,
  type ProviderId,
  type RetrievalCacheEntry,
  type RetrievalEvidence,
  type SemanticCluster,
  type SourceSnapshot,
} from "@classmate/contracts";
import { chunkSource, estimateTokens } from "@classmate/content-core";
import type { ProviderHealth, SessionTurn } from "./intelligence";
import type { ProviderModel } from "./index";

export interface LocalEmbeddingOptions {
  dimensions?: number | undefined;
  model?: string | undefined;
}

export interface SemanticQuery {
  query: string;
  sourceIds?: readonly string[] | undefined;
  limit?: number | undefined;
  keywordWeight?: number | undefined;
  vectorWeight?: number | undefined;
}

export interface RagContext {
  query: string;
  evidence: readonly RetrievalEvidence[];
  compressedText: string;
  estimatedTokens: number;
  evidenceScore: number;
  citations: readonly Citation[];
}

export interface OfflineRouteInput {
  mode: OfflineAiMode;
  online: boolean;
  preferredProviderId?: ProviderId | undefined;
  models: readonly ProviderModel[];
  health: readonly ProviderHealth[];
}

export interface OfflineRoute {
  providerOrder: readonly ProviderId[];
  offline: boolean;
  reason: string;
}

const DEFAULT_DIMENSIONS = 96;
const DEFAULT_MODEL = "classmate-local-hash-embedding-v1";

export class LocalEmbeddingService {
  readonly dimensions: number;
  readonly model: string;

  constructor(options: LocalEmbeddingOptions = {}) {
    this.dimensions = options.dimensions ?? DEFAULT_DIMENSIONS;
    this.model = options.model ?? DEFAULT_MODEL;
  }

  embed(text: string): number[] {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = tokenize(text);
    for (const token of tokens) {
      const hash = hashText(token);
      const index = Math.abs(hash) % this.dimensions;
      const sign = hash % 2 === 0 ? 1 : -1;
      vector[index] = (vector[index] ?? 0) + sign * (1 + Math.min(3, token.length / 8));
    }
    return normalize(vector);
  }

  embedSource(source: SourceSnapshot): EmbeddingRecord[] {
    const chunks = chunkSource(source, 850);
    return chunks.map((chunk) =>
      EmbeddingRecordSchema.parse({
        schemaVersion: 1,
        id: crypto.randomUUID(),
        sourceId: source.id,
        chunkId: chunk.id,
        contentHash: source.contentHash,
        text: chunk.text,
        headingPath: chunk.headingPath,
        citations: citationsForChunk(source.id, chunk.id, chunk.text),
        vector: this.embed(`${chunk.headingPath.join(" ")} ${chunk.text}`),
        model: this.model,
        createdAt: new Date().toISOString(),
      }),
    );
  }
}

export class VectorIndex {
  private readonly records = new Map<string, EmbeddingRecord>();

  constructor(records: readonly EmbeddingRecord[] = []) {
    records.forEach((record) => this.upsert(record));
  }

  upsert(record: EmbeddingRecord): void {
    this.records.set(record.id, record);
  }

  removeBySource(sourceId: string): void {
    for (const [id, record] of this.records.entries()) {
      if (record.sourceId === sourceId) this.records.delete(id);
    }
  }

  list(): EmbeddingRecord[] {
    return [...this.records.values()];
  }

  search(queryVector: readonly number[], query: SemanticQuery): RetrievalEvidence[] {
    const keywords = new Set(tokenize(query.query));
    const keywordWeight = query.keywordWeight ?? 0.35;
    const vectorWeight = query.vectorWeight ?? 0.65;
    const sourceFilter = query.sourceIds ? new Set(query.sourceIds) : undefined;
    return this.list()
      .filter((record) => !sourceFilter || sourceFilter.has(record.sourceId))
      .map((record) => {
        const vectorScore = clamp01((cosineSimilarity(queryVector, record.vector) + 1) / 2);
        const keywordScore = keywordSimilarity(keywords, record.text);
        const score = clamp01(vectorScore * vectorWeight + keywordScore * keywordWeight);
        return RetrievalEvidenceSchema.parse({
          id: crypto.randomUUID(),
          sourceId: record.sourceId,
          chunkId: record.chunkId,
          title: record.headingPath.at(-1) ?? "Source chunk",
          text: record.text,
          score,
          keywordScore,
          vectorScore,
          headingPath: record.headingPath,
          citations: record.citations,
        });
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, query.limit ?? 8);
  }

  duplicates(threshold = 0.92): Array<readonly [EmbeddingRecord, EmbeddingRecord, number]> {
    const records = this.list();
    const pairs: Array<readonly [EmbeddingRecord, EmbeddingRecord, number]> = [];
    for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
        const left = records[leftIndex];
        const right = records[rightIndex];
        if (!left || !right) continue;
        const similarity = cosineSimilarity(left.vector, right.vector);
        if (similarity >= threshold) pairs.push([left, right, similarity] as const);
      }
    }
    return pairs;
  }

  clusters(threshold = 0.78): SemanticCluster[] {
    const records = this.list();
    const visited = new Set<string>();
    const clusters: SemanticCluster[] = [];
    for (const record of records) {
      if (visited.has(record.id)) continue;
      const similar = records.filter((candidate) => cosineSimilarity(record.vector, candidate.vector) >= threshold);
      similar.forEach((candidate) => visited.add(candidate.id));
      clusters.push(SemanticClusterSchema.parse({
        id: crypto.randomUUID(),
        label: record.headingPath.at(-1) ?? firstWords(record.text),
        recordIds: similar.map((item) => item.id),
        centroid: centroid(similar.map((item) => item.vector)),
        similarity: similar.length === 1 ? 1 : average(similar.map((item) => cosineSimilarity(record.vector, item.vector))),
      }));
    }
    return clusters;
  }
}

export class SemanticRetrievalService {
  private readonly embeddings: LocalEmbeddingService;
  private readonly index: VectorIndex;

  constructor(records: readonly EmbeddingRecord[] = [], embeddings = new LocalEmbeddingService()) {
    this.embeddings = embeddings;
    this.index = new VectorIndex(records);
  }

  indexSource(source: SourceSnapshot): EmbeddingRecord[] {
    const records = this.embeddings.embedSource(source);
    records.forEach((record) => this.index.upsert(record));
    return records;
  }

  search(query: SemanticQuery): RetrievalEvidence[] {
    return this.index.search(this.embeddings.embed(query.query), query);
  }

  buildRagContext(query: string, history: readonly SessionTurn[] = [], tokenBudget = 2_400): RagContext {
    const memoryText = history.slice(-6).map((turn) => `${turn.role}: ${turn.content}`).join("\n");
    const evidence = this.search({ query: `${query}\n${memoryText}`, limit: 12 });
    const selected: RetrievalEvidence[] = [];
    let usedTokens = 0;
    for (const item of evidence) {
      const tokens = estimateTokens(item.text);
      if (usedTokens + tokens > tokenBudget && selected.length > 0) continue;
      selected.push(item);
      usedTokens += tokens;
      if (usedTokens >= tokenBudget) break;
    }
    const citations = selected.flatMap((item) => item.citations);
    return {
      query,
      evidence: selected,
      compressedText: selected.map((item) => `### ${item.title}\n${item.text}\n[citation:${item.chunkId}]`).join("\n\n"),
      estimatedTokens: usedTokens,
      evidenceScore: selected.length === 0 ? 0 : average(selected.map((item) => item.score)),
      citations,
    };
  }

  relatedConcepts(query: string, limit = 8): readonly string[] {
    return [...new Set(this.search({ query, limit: limit * 2 }).flatMap((hit) => [...hit.headingPath, ...tokenize(hit.text).slice(0, 4)]))].slice(0, limit);
  }

  duplicates(): Array<readonly [EmbeddingRecord, EmbeddingRecord, number]> {
    return this.index.duplicates();
  }

  clusters(): SemanticCluster[] {
    return this.index.clusters();
  }
}

export class RetrievalCache {
  private readonly entries = new Map<string, RetrievalCacheEntry>();

  get(query: string): RetrievalCacheEntry | undefined {
    return this.entries.get(stableHash(query));
  }

  set(query: string, evidence: readonly RetrievalEvidence[]): RetrievalCacheEntry {
    const entry = RetrievalCacheEntrySchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      queryHash: stableHash(query),
      query,
      evidence,
      createdAt: new Date().toISOString(),
    });
    this.entries.set(entry.queryHash, entry);
    return entry;
  }
}

export function routeOfflineAi(input: OfflineRouteInput): OfflineRoute {
  const localAvailable = input.models.some((model) => model.providerId === "ollama" && model.capabilities.local);
  const ollamaHealthy = input.health.find((entry) => entry.providerId === "ollama")?.available !== false;
  if (input.mode === "offline" || !input.online) {
    return {
      providerOrder: localAvailable && ollamaHealthy ? ["ollama"] : [],
      offline: true,
      reason: localAvailable ? "Offline study mode is using local Ollama." : "Offline mode requires a local Ollama model.",
    };
  }
  if (input.mode === "auto" && localAvailable && input.preferredProviderId === "ollama") {
    return { providerOrder: ["ollama"], offline: false, reason: "Auto routing prefers local inference." };
  }
  const healthy = input.health.filter((entry) => entry.available).map((entry) => entry.providerId);
  return {
    providerOrder: input.preferredProviderId ? [input.preferredProviderId, ...healthy.filter((id) => id !== input.preferredProviderId)] : healthy,
    offline: false,
    reason: "Online routing can use configured providers with local fallback.",
  };
}

function citationsForChunk(sourceId: string, chunkId: string, text: string): Citation[] {
  return [{ id: `${chunkId}:local`, sourceId, chunkId, quote: text.slice(0, 280), confidence: "medium" }];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().normalize("NFC").split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(31, hash) + text.charCodeAt(index);
  }
  return hash;
}

function stableHash(text: string): string {
  return `semantic-${Math.abs(hashText(text.normalize("NFC").replace(/\s+/g, " ").trim())).toString(16).padStart(16, "0")}`;
}

function normalize(vector: readonly number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Math.round((value / magnitude) * 1_000_000) / 1_000_000);
}

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }
  return dot / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
}

function keywordSimilarity(query: ReadonlySet<string>, text: string): number {
  if (query.size === 0) return 0;
  const textTokens = new Set(tokenize(text));
  const matches = [...query].filter((token) => textTokens.has(token)).length;
  return matches / query.size;
}

function centroid(vectors: readonly (readonly number[])[]): number[] {
  const dimensions = Math.max(...vectors.map((vector) => vector.length), DEFAULT_DIMENSIONS);
  const values = Array.from({ length: dimensions }, (_, index) => average(vectors.map((vector) => vector[index] ?? 0)));
  return normalize(values);
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function firstWords(text: string): string {
  return text.split(/\s+/).slice(0, 5).join(" ") || "Semantic cluster";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

const STOP_WORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "using", "about", "source", "your", "have"]);
