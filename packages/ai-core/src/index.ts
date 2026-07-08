import type { GenerationRequest, ProviderId, StreamEvent } from "@classmate/contracts";
import { assemblePrompt } from "@classmate/prompt-library";
export {
  compressSource,
  createCacheKey,
  createIntelligencePlan,
  createMetric,
  estimateGeneration,
  MemoryResponseCache,
  routePrompt,
  routeProviders,
  scoreConfidence,
  type AiMetric,
  type CachedAiResponse,
  type CompressionResult,
  type ConfidenceScore,
  type ContentKind,
  type IntelligenceInput,
  type IntelligencePlan,
  type MetricInput,
  type PromptRoute,
  type ProviderHealth,
  type SessionTurn,
  type TokenForecast,
} from "./intelligence";

export interface ProviderCapabilities { textGeneration: true; streaming: boolean; structuredOutput: boolean; largeContext: boolean; local: boolean; }
export interface ProviderModel { id: string; displayName: string; providerId: ProviderId; isFree: boolean; contextTokens: number; capabilities: ProviderCapabilities; }
export interface AiProvider {
  readonly id: ProviderId;
  models(): readonly ProviderModel[];
  validateConfiguration(): Promise<{ ok: true } | { ok: false; message: string }>;
  stream(request: GenerationRequest, signal: AbortSignal): AsyncIterable<StreamEvent>;
}
export interface ProviderCredential { apiKey?: string; baseUrl?: string; }

type OpenAiCompatibleId = "groq" | "openrouter" | "ollama";
interface OpenAiCompatibleOptions { id: OpenAiCompatibleId; credential: ProviderCredential; model: ProviderModel; headers?: Readonly<Record<string, string>>; }
export class OpenAiCompatibleProvider implements AiProvider {
  readonly id: OpenAiCompatibleId; private readonly options: OpenAiCompatibleOptions;
  constructor(options: OpenAiCompatibleOptions) { this.id = options.id; this.options = options; }
  models(): readonly ProviderModel[] { return [this.options.model]; }
  async validateConfiguration(): Promise<{ ok: true } | { ok: false; message: string }> {
    if (this.id !== "ollama" && !this.options.credential.apiKey) return { ok: false, message: "An API key is required." };
    if (this.id === "ollama" && !isAllowedLoopback(this.options.credential.baseUrl ?? "")) return { ok: false, message: "Ollama must use an explicit localhost HTTP endpoint." };
    return { ok: true };
  }
  async *stream(request: GenerationRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
    const prompt = assemblePrompt(request); const baseUrl = this.options.credential.baseUrl ?? (this.id === "groq" ? "https://api.groq.com/openai/v1" : "https://openrouter.ai/api/v1");
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, { method: "POST", signal, headers: { "Content-Type": "application/json", ...(this.options.credential.apiKey ? { Authorization: `Bearer ${this.options.credential.apiKey}` } : {}), ...this.options.headers }, body: JSON.stringify({ model: this.options.model.id, stream: true, messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }] }) });
    if (!response.ok || !response.body) { yield { type: "error", sequence: 1, code: mapHttpError(response.status), message: "The provider could not complete this request.", retryable: response.status === 429 || response.status >= 500 }; return; }
    yield { type: "phase", sequence: 1, phase: "streaming" }; let sequence = 2;
    for await (const data of parseSse(response.body)) { const text = readOpenAiDelta(data); if (text) yield { type: "delta", sequence: sequence++, text }; }
    yield { type: "complete", sequence, finishReason: "stop" };
  }
}

export class GeminiProvider implements AiProvider {
  readonly id = "gemini" as const; constructor(private readonly credential: ProviderCredential, private readonly model: ProviderModel) {}
  models(): readonly ProviderModel[] { return [this.model]; }
  async validateConfiguration(): Promise<{ ok: true } | { ok: false; message: string }> { return this.credential.apiKey ? { ok: true } : { ok: false, message: "An API key is required." }; }
  async *stream(request: GenerationRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
    const prompt = assemblePrompt(request); const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model.id)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.credential.apiKey ?? "")}`;
    const response = await fetch(url, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: prompt.system }] }, contents: [{ role: "user", parts: [{ text: prompt.user }] }] }) });
    if (!response.ok || !response.body) { yield { type: "error", sequence: 1, code: mapHttpError(response.status), message: "Gemini could not complete this request.", retryable: response.status === 429 || response.status >= 500 }; return; }
    yield { type: "phase", sequence: 1, phase: "streaming" }; let sequence = 2;
    for await (const data of parseSse(response.body)) { const text = readGeminiDelta(data); if (text) yield { type: "delta", sequence: sequence++, text }; }
    yield { type: "complete", sequence, finishReason: "stop" };
  }
}

export class ProviderRouter {
  constructor(private readonly providers: readonly AiProvider[]) {}
  routes(request: GenerationRequest): readonly AiProvider[] {
    const candidates = request.providerId ? this.providers.filter((provider) => provider.id === request.providerId) : this.providers;
    return candidates.filter((provider) => request.settings.allowPaid || provider.models().some((model) => model.isFree)).slice(0, 2);
  }
}
export function isAllowedLoopback(value: string): boolean { try { const url = new URL(value); return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]"); } catch { return false; } }
function mapHttpError(status: number): string { if (status === 401 || status === 403) return "PROVIDER_AUTH"; if (status === 429) return "PROVIDER_RATE_LIMITED"; if (status === 413) return "CONTEXT_TOO_LARGE"; return status >= 500 ? "PROVIDER_UNAVAILABLE" : "PROVIDER_REQUEST"; }
async function* parseSse(body: ReadableStream<Uint8Array>): AsyncIterable<string> { const reader = body.getReader(); const decoder = new TextDecoder(); let buffer = ""; try { while (true) { const read = await reader.read(); if (read.done) break; buffer += decoder.decode(read.value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() ?? ""; for (const event of events) for (const line of event.split("\n")) if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") yield line.slice(6); } } finally { reader.releaseLock(); } }
function readOpenAiDelta(data: string): string { try { const value: unknown = JSON.parse(data); if (typeof value !== "object" || value === null || !("choices" in value) || !Array.isArray(value.choices)) return ""; const choice = value.choices[0]; return typeof choice === "object" && choice !== null && "delta" in choice && typeof choice.delta === "object" && choice.delta !== null && "content" in choice.delta && typeof choice.delta.content === "string" ? choice.delta.content : ""; } catch { return ""; } }
function readGeminiDelta(data: string): string { try { const value: unknown = JSON.parse(data); if (typeof value !== "object" || value === null || !("candidates" in value) || !Array.isArray(value.candidates)) return ""; const candidate = value.candidates[0]; if (typeof candidate !== "object" || candidate === null || !("content" in candidate) || typeof candidate.content !== "object" || candidate.content === null || !("parts" in candidate.content) || !Array.isArray(candidate.content.parts)) return ""; return candidate.content.parts.map((part: unknown) => typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : "").join(""); } catch { return ""; } }
