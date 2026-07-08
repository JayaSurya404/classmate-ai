import type { GenerationRequest, ProviderId, SourceSnapshot, StudyAction } from "@classmate/contracts";
import { chunkSource, estimateTokens } from "@classmate/content-core";
import { assemblePrompt, loadPromptTemplate } from "@classmate/prompt-library";
import type { ProviderModel } from "./index";

export type ContentKind =
  | "documentation"
  | "research_paper"
  | "code"
  | "article"
  | "github"
  | "stackoverflow"
  | "wikipedia"
  | "medium";

export interface SessionTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderHealth {
  providerId: ProviderId;
  available: boolean;
  latencyMs?: number | undefined;
  lastErrorCode?: string | undefined;
}

export interface PromptRoute {
  action: StudyAction;
  templateId: string;
  contentKind: ContentKind;
  instruction: string;
}

export interface CompressionResult {
  source: SourceSnapshot;
  selectedChunkIds: readonly string[];
  omittedChunkCount: number;
  coverageRatio: number;
}

export interface TokenForecast {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedLatencyMs: number;
  estimatedCostUsd: number;
}

export interface ConfidenceScore {
  value: number;
  label: "low" | "medium" | "high";
  evidenceCoverage: number;
  reason: string;
}

export interface IntelligencePlan {
  request: GenerationRequest;
  route: PromptRoute;
  providerOrder: readonly ProviderId[];
  compression: CompressionResult;
  confidence: ConfidenceScore;
  forecast: TokenForecast;
  cacheKey: string;
}

export interface CachedAiResponse {
  content: string;
  sourceHash: string;
  createdAt: string;
}

export interface AiMetric {
  id: string;
  providerId: ProviderId;
  operationId: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  cacheHit: boolean;
  retries: number;
  status: "completed" | "failed" | "cancelled";
  createdAt: string;
  modelId?: string | undefined;
  errorCode?: string | undefined;
}

export interface MetricInput {
  providerId: ProviderId;
  operationId: string;
  forecast: TokenForecast;
  cacheHit: boolean;
  retries: number;
  status: AiMetric["status"];
  latencyMs: number;
  modelId?: string | undefined;
  errorCode?: string | undefined;
  id?: string | undefined;
  createdAt?: string | undefined;
}

export interface IntelligenceInput {
  request: GenerationRequest;
  models: readonly ProviderModel[];
  health: readonly ProviderHealth[];
  history: readonly SessionTurn[];
  preferredProviderId?: ProviderId | undefined;
}

const MAX_HISTORY_TURNS = 4;
const PROVIDER_PRIORITY: readonly ProviderId[] = ["gemini", "groq", "openrouter", "ollama"];

export function createIntelligencePlan(input: IntelligenceInput): IntelligencePlan {
  const route = routePrompt(input.request);
  const providerOrder = routeProviders(input);
  const selectedProvider = providerOrder[0] ?? input.request.providerId ?? input.preferredProviderId;
  const model = selectModel(input.models, selectedProvider);
  const budget = Math.max(1_000, Math.floor((model?.contextTokens ?? 32_000) * 0.55));
  const enrichedPrompt = enrichPrompt(input.request.prompt, route, input.history);
  const compressed = compressSource(input.request.source, enrichedPrompt, budget);
  const request: GenerationRequest = {
    ...input.request,
    prompt: enrichedPrompt,
    source: compressed.source,
    providerId: selectedProvider,
    modelId: model?.id ?? input.request.modelId,
  };
  const forecast = estimateGeneration(request, model);
  const confidence = scoreConfidence(compressed, route, request.prompt);

  return {
    request,
    route,
    providerOrder,
    compression: compressed,
    confidence,
    forecast,
    cacheKey: createCacheKey(request),
  };
}

export function routePrompt(request: GenerationRequest): PromptRoute {
  const contentKind = classifyContentKind(request.source);
  const template = loadPromptTemplate(request.action);
  return {
    action: request.action,
    templateId: template.id,
    contentKind,
    instruction: sourceSpecificInstruction(contentKind),
  };
}

export function compressSource(
  source: SourceSnapshot,
  prompt: string,
  tokenBudget: number,
): CompressionResult {
  const chunks = chunkSource(source, 900);
  const ranked = chunks
    .map((chunk) => ({ chunk, score: relevanceScore(chunk.text, prompt, chunk.headingPath) }))
    .sort((left, right) => right.score - left.score);
  const selectedIds = new Set<string>();
  let usedTokens = 0;

  for (const item of ranked) {
    if (usedTokens + item.chunk.estimatedTokens > tokenBudget && selectedIds.size > 0) continue;
    selectedIds.add(item.chunk.id);
    usedTokens += item.chunk.estimatedTokens;
    if (usedTokens >= tokenBudget) break;
  }

  const selectedBlockIds = new Set(
    chunks.filter((chunk) => selectedIds.has(chunk.id)).flatMap((chunk) => chunk.blockIds),
  );
  const blocks = source.blocks.filter((block) => selectedBlockIds.has(block.id));

  return {
    source: { ...source, blocks: blocks.length > 0 ? blocks : source.blocks.slice(0, 1) },
    selectedChunkIds: [...selectedIds],
    omittedChunkCount: Math.max(0, chunks.length - selectedIds.size),
    coverageRatio: chunks.length === 0 ? 1 : selectedIds.size / chunks.length,
  };
}

export function routeProviders(input: IntelligenceInput): readonly ProviderId[] {
  const contextTokens = estimateTokens(sourceText(input.request.source));
  const health = new Map(input.health.map((entry) => [entry.providerId, entry]));
  const candidates = input.models
    .filter((model) => model.capabilities.textGeneration)
    .filter((model) => input.request.settings.allowPaid || model.isFree)
    .filter((model) => model.contextTokens >= contextTokens)
    .filter((model) => health.get(model.providerId)?.available !== false);

  const preferred = input.preferredProviderId ?? input.request.providerId;
  return [...candidates]
    .sort((left, right) => providerRank(left, preferred, health) - providerRank(right, preferred, health))
    .map((model) => model.providerId)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, 3);
}

export function estimateGeneration(
  request: GenerationRequest,
  model?: ProviderModel | undefined,
): TokenForecast {
  const prompt = assemblePrompt(request);
  const promptTokens = estimateTokens(`${prompt.system}\n\n${prompt.user}`);
  const completionTokens = outputReserve(request.settings.depth);
  const localMultiplier = model?.capabilities.local ? 2.2 : 1;
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedLatencyMs: Math.round((900 + completionTokens * 18 + promptTokens * 0.4) * localMultiplier),
    estimatedCostUsd: model?.isFree === false ? Math.round((promptTokens + completionTokens) * 0.000002 * 10000) / 10000 : 0,
  };
}

export function scoreConfidence(
  compression: CompressionResult,
  route: PromptRoute,
  prompt: string,
): ConfidenceScore {
  const hasSpecificIntent = keywords(prompt).length > 1;
  const routeBonus = route.contentKind === "research_paper" || route.contentKind === "documentation" ? 0.05 : 0;
  const value = clamp(compression.coverageRatio * 0.75 + (hasSpecificIntent ? 0.15 : 0.05) + routeBonus);
  const label = value >= 0.72 ? "high" : value >= 0.45 ? "medium" : "low";
  const reason =
    label === "low"
      ? "Evidence coverage is limited; the response should state uncertainty."
      : "Selected source chunks provide usable evidence for the requested response.";
  return { value, label, evidenceCoverage: compression.coverageRatio, reason };
}

export function createCacheKey(request: GenerationRequest): string {
  return [
    request.source.contentHash,
    request.action,
    request.providerId ?? "auto",
    request.modelId ?? "auto",
    request.settings.depth,
    request.settings.locale,
    stableText(request.prompt),
  ].join(":");
}

export class MemoryResponseCache {
  private readonly entries = new Map<string, CachedAiResponse>();

  get(cacheKey: string, sourceHash: string): CachedAiResponse | undefined {
    const entry = this.entries.get(cacheKey);
    if (!entry || entry.sourceHash !== sourceHash) return undefined;
    return entry;
  }

  set(cacheKey: string, sourceHash: string, content: string, createdAt = new Date().toISOString()): void {
    this.entries.set(cacheKey, { content, sourceHash, createdAt });
  }

  invalidateSource(sourceHash: string): void {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.sourceHash === sourceHash) this.entries.delete(key);
    }
  }
}

export function createMetric(input: MetricInput): AiMetric {
  return {
    id: input.id ?? crypto.randomUUID(),
    providerId: input.providerId,
    operationId: input.operationId,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    promptTokens: input.forecast.promptTokens,
    completionTokens: input.forecast.completionTokens,
    cacheHit: input.cacheHit,
    retries: input.retries,
    status: input.status,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.modelId ? { modelId: input.modelId } : {}),
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
}

function classifyContentKind(source: SourceSnapshot): ContentKind {
  const url = source.canonicalUrl?.toLowerCase() ?? "";
  const hasCode = source.blocks.some((block) => block.type === "code");
  if (url.includes("github.com")) return "github";
  if (url.includes("stackoverflow.com") || url.includes("stackexchange.com")) return "stackoverflow";
  if (url.includes("wikipedia.org")) return "wikipedia";
  if (url.includes("medium.com")) return "medium";
  if (source.sourceType === "documentation") return hasCode ? "code" : "documentation";
  if (source.sourceType === "repository") return "github";
  if (url.includes("arxiv.org") || url.includes("doi.org")) return "research_paper";
  if (hasCode) return "code";
  return "article";
}

function sourceSpecificInstruction(kind: ContentKind): string {
  switch (kind) {
    case "documentation":
      return "Prioritize APIs, definitions, parameters, examples, and version caveats.";
    case "research_paper":
      return "Prioritize abstract, method, findings, limitations, and avoid overstating claims.";
    case "code":
    case "github":
      return "Prioritize repository intent, code behavior, setup steps, and cite code chunks precisely.";
    case "stackoverflow":
      return "Separate the question, accepted-style reasoning, caveats, and code constraints.";
    case "wikipedia":
      return "Preserve neutral wording, definitions, chronology, and cited factual distinctions.";
    case "medium":
      return "Separate author perspective from source-supported facts.";
    default:
      return "Prioritize the thesis, structure, key evidence, and takeaways.";
  }
}

function enrichPrompt(prompt: string, route: PromptRoute, history: readonly SessionTurn[]): string {
  const recent = history.slice(-MAX_HISTORY_TURNS);
  const historyText = recent.length
    ? `\n\nRelevant session memory:\n${recent.map((turn) => `${turn.role}: ${stableText(turn.content).slice(0, 700)}`).join("\n")}`
    : "";
  return `${prompt}\n\nSmart routing: ${route.instruction}\nConfidence policy: cite every generated section with source chunk IDs. If evidence is weak, explicitly say what is uncertain.${historyText}`;
}

function providerRank(model: ProviderModel, preferred: ProviderId | undefined, health: Map<ProviderId, ProviderHealth>): number {
  const preferredBonus = preferred === model.providerId ? -100 : 0;
  const priority = PROVIDER_PRIORITY.indexOf(model.providerId);
  const latency = health.get(model.providerId)?.latencyMs ?? 1_000;
  const localBonus = model.capabilities.local ? 8 : 0;
  return preferredBonus + (priority < 0 ? 20 : priority * 10) + latency / 1_000 + localBonus;
}

function selectModel(models: readonly ProviderModel[], providerId?: ProviderId): ProviderModel | undefined {
  return models.find((model) => model.providerId === providerId);
}

function sourceText(source: SourceSnapshot): string {
  return source.blocks.map((block) => block.text).join("\n\n");
}

function relevanceScore(text: string, prompt: string, headings: readonly string[]): number {
  const promptWords = new Set(keywords(prompt));
  const textWords = keywords(`${headings.join(" ")} ${text}`);
  const overlap = textWords.filter((word) => promptWords.has(word)).length;
  const headingBonus = headings.length > 0 ? 1.5 : 0;
  const codeBonus = /```|function|class|const|import/.test(text) ? 0.5 : 0;
  return overlap + headingBonus + codeBonus + Math.min(2, textWords.length / 120);
}

function keywords(value: string): string[] {
  return stableText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function stableText(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function outputReserve(depth: GenerationRequest["settings"]["depth"]): number {
  if (depth === "brief") return 500;
  if (depth === "deep") return 1_800;
  return 1_000;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "using",
  "about",
  "source",
]);
