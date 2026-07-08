import {
  createIntelligencePlan,
  createMetric,
  type IntelligencePlan,
  MemoryResponseCache,
  type ProviderCredential,
  type ProviderHealth,
  type SessionTurn,
} from "@classmate/ai-core";
import type {
  Artifact,
  GenerationRequest,
  ProviderId,
  SourceSnapshot,
  StreamEvent,
  StudyAction,
} from "@classmate/contracts";
import { chunkSource, validateCitationIds } from "@classmate/content-core";
import { loadPromptTemplate } from "@classmate/prompt-library";
import { createProvider, models } from "../../../adapters/ai/providers";
import { credentialVault, settingsRepository } from "../../../adapters/chrome/storage";
import { localRepositories } from "../../../adapters/local-db/database";
import type { ChatMessage, ResponseLength } from "../types";

export interface StudyRequestInput {
  action: StudyAction;
  prompt: string;
  source: SourceSnapshot;
  providerId: ProviderId;
  responseLength: ResponseLength;
  history: readonly ChatMessage[];
}

export interface StudyGeneration {
  request: GenerationRequest;
  stream: AsyncIterable<StreamEvent>;
  plan: IntelligencePlan;
  providerId: ProviderId;
  cacheHit: boolean;
  startedAt: number;
  retries: number;
}

const responseCache = new MemoryResponseCache();

export async function createStudyGeneration(
  input: StudyRequestInput,
  signal: AbortSignal,
): Promise<StudyGeneration> {
  const settings = await settingsRepository.get();
  const baseRequest = createBaseRequest(input, settings.locale);
  const plan = createIntelligencePlan({
    request: baseRequest,
    models: Object.values(models),
    health: await providerHealth(),
    history: toSessionTurns(input.history),
    preferredProviderId: input.providerId,
  });
  const cached = responseCache.get(plan.cacheKey, plan.request.source.contentHash);

  if (cached) {
    return {
      request: plan.request,
      stream: cachedStream(cached.content),
      plan,
      providerId: plan.request.providerId ?? input.providerId,
      cacheHit: true,
      startedAt: performance.now(),
      retries: 0,
    };
  }

  const attempts = plan.providerOrder.length > 0 ? plan.providerOrder : [input.providerId];
  let lastError: Error | undefined;

  for (const [index, providerId] of attempts.entries()) {
    try {
      const credential = await credentialVault.get(providerId);
      const provider = createProvider(providerId, normalizeCredential(providerId, credential));
      const configuration = await provider.validateConfiguration();
      if (!configuration.ok) throw new Error(configuration.message);

      const request = { ...plan.request, providerId, modelId: models[providerId].id };
      await localRepositories.operations.saveIntent(request);

      return {
        request,
      stream: cacheStream(provider.stream(request, signal), plan.cacheKey, request.source.contentHash),
        plan,
        providerId,
        cacheHit: false,
        startedAt: performance.now(),
        retries: index,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Provider route failed.");
      if (signal.aborted) throw lastError;
    }
  }

  throw userFriendlyProviderError(lastError);
}

export async function recordGenerationMetric(args: {
  generation: StudyGeneration;
  status: "completed" | "failed" | "cancelled";
  errorCode?: string | undefined;
  latencyMs?: number | undefined;
}): Promise<void> {
  await localRepositories.metrics.save({
    ...createMetric({
      providerId: args.generation.providerId,
      operationId: args.generation.request.operationId,
      forecast: args.generation.plan.forecast,
      cacheHit: args.generation.cacheHit,
      retries: args.generation.retries,
      status: args.status,
      latencyMs: args.latencyMs ?? performance.now() - args.generation.startedAt,
      modelId: args.generation.request.modelId,
      errorCode: args.errorCode,
    }),
  });
}

export async function persistAssistantArtifact(args: {
  action: StudyAction;
  content: string;
  providerId: ProviderId;
  source: SourceSnapshot;
}): Promise<Artifact> {
  const chunks = chunkSource(args.source);
  const validChunkIds = validateCitationIds(extractCitationIds(args.content), chunks);
  const template = loadPromptTemplate(args.action);
  const artifact: Artifact = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    type: args.action,
    title: artifactTitle(args.action, args.source.title),
    markdown: args.content,
    citations: validChunkIds.map((chunkId) => ({
      id: crypto.randomUUID(),
      sourceId: args.source.id,
      chunkId,
      confidence: "high",
    })),
    sourceIds: [args.source.id],
    createdAt: new Date().toISOString(),
    provenance: {
      provider: args.providerId,
      model: models[args.providerId].id,
      templateId: template.id,
      templateVersion: template.version,
      isAiGenerated: true,
    },
  };
  await localRepositories.artifacts.save(artifact);
  return artifact;
}

export function actionLabel(action: StudyAction): string {
  switch (action) {
    case "summary":
      return "Summary";
    case "explain_simple":
      return "Explain simply";
    case "explain_deep":
      return "Deep explanation";
    case "rewrite":
      return "Rewrite";
    case "simplify":
      return "Simplify";
    default:
      return "Study response";
  }
}

function createBaseRequest(input: StudyRequestInput, locale: string): GenerationRequest {
  return {
    schemaVersion: 1,
    operationId: crypto.randomUUID(),
    action: input.action,
    prompt: input.prompt,
    source: input.source,
    providerId: input.providerId,
    modelId: models[input.providerId].id,
    settings: {
      depth: mapResponseLength(input.responseLength),
      locale,
      allowPaid: false,
    },
  };
}

async function providerHealth(): Promise<readonly ProviderHealth[]> {
  const entries = await Promise.all(
    Object.keys(models).map(async (id) => {
      const providerId = id as ProviderId;
      const credential = await credentialVault.get(providerId);
      const hasCredential = providerId === "ollama" || Boolean(credential?.apiKey);
      return { providerId, available: hasCredential };
    }),
  );
  return entries;
}

function toSessionTurns(messages: readonly ChatMessage[]): readonly SessionTurn[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.content.trim().length > 0)
    .slice(-8)
    .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));
}

function normalizeCredential(
  providerId: ProviderId,
  credential: { apiKey?: string | undefined; baseUrl?: string | undefined } | undefined,
): ProviderCredential {
  if (providerId === "ollama") {
    return { baseUrl: credential?.baseUrl ?? "http://localhost:11434/v1" };
  }
  return {
    ...(credential?.apiKey ? { apiKey: credential.apiKey } : {}),
    ...(credential?.baseUrl ? { baseUrl: credential.baseUrl } : {}),
  };
}

async function* cacheStream(
  stream: AsyncIterable<StreamEvent>,
  cacheKey: string,
  sourceHash: string,
): AsyncIterable<StreamEvent> {
  let content = "";
  for await (const event of stream) {
    if (event.type === "delta") content += event.text;
    if (event.type === "complete" && content.trim()) {
      responseCache.set(cacheKey, sourceHash, content);
    }
    yield event;
  }
}

async function* cachedStream(content: string): AsyncIterable<StreamEvent> {
  yield { type: "phase", sequence: 1, phase: "streaming" };
  yield { type: "delta", sequence: 2, text: content };
  yield { type: "complete", sequence: 3, finishReason: "stop" };
}

function mapResponseLength(length: ResponseLength): GenerationRequest["settings"]["depth"] {
  if (length === "short") return "brief";
  if (length === "detailed") return "deep";
  return "standard";
}

function extractCitationIds(markdown: string): readonly string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(/\bS\d+-C\d+\b/g)) {
    ids.add(match[0]);
  }
  return [...ids];
}

function userFriendlyProviderError(error: Error | undefined): Error {
  return new Error(error?.message ?? "No configured free provider can handle this request.");
}

function artifactTitle(action: StudyAction, sourceTitle: string): string {
  return `${actionLabel(action)} · ${sourceTitle}`.slice(0, 500);
}
