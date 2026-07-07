import { z } from "zod";

export const IdSchema = z.string().uuid();
export const SourceTypeSchema = z.enum(["article", "documentation", "repository", "pdf", "youtube", "lms", "generic", "pasted"]);
export const ContentBlockSchema = z.object({
  id: z.string().min(1), type: z.enum(["heading", "paragraph", "code", "list", "table", "quote"]),
  text: z.string().max(100_000), headingPath: z.array(z.string()).max(12), startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(), language: z.string().max(32).optional()
}).refine((value) => value.endOffset >= value.startOffset, "Invalid source offsets");
export const SourceSnapshotSchema = z.object({
  schemaVersion: z.literal(1), id: IdSchema, title: z.string().min(1).max(500), canonicalUrl: z.string().url().optional(),
  sourceType: SourceTypeSchema, capturedAt: z.string().datetime(), contentHash: z.string().min(16),
  language: z.string().min(2).max(32).default("und"), blocks: z.array(ContentBlockSchema).max(10_000),
  scope: z.enum(["selection", "section", "page", "transcript", "pdf_pages", "pasted"]),
  sensitivity: z.enum(["clear", "review", "blocked"])
});
export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

export const StudyActionSchema = z.enum(["summary", "explain_simple", "explain_deep", "flashcards", "quiz", "memory_tricks", "exam_answer", "university_answer", "lab_record", "viva", "chat"]);
export type StudyAction = z.infer<typeof StudyActionSchema>;
export const CitationSchema = z.object({ id: z.string(), sourceId: IdSchema, chunkId: z.string(), quote: z.string().max(1000).optional(), confidence: z.enum(["high", "medium", "low"]) });
export const ArtifactSchema = z.object({
  schemaVersion: z.literal(1), id: IdSchema, type: StudyActionSchema, title: z.string().min(1).max(500), markdown: z.string(),
  citations: z.array(CitationSchema), sourceIds: z.array(IdSchema), createdAt: z.string().datetime(),
  provenance: z.object({ provider: z.enum(["gemini", "groq", "openrouter", "ollama"]), model: z.string(), templateId: z.string(), templateVersion: z.string(), isAiGenerated: z.literal(true) })
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const ProviderIdSchema = z.enum(["gemini", "groq", "openrouter", "ollama"]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export const GenerationRequestSchema = z.object({
  schemaVersion: z.literal(1), operationId: IdSchema, action: StudyActionSchema, prompt: z.string().max(20_000),
  source: SourceSnapshotSchema, providerId: ProviderIdSchema.optional(), modelId: z.string().optional(),
  settings: z.object({ depth: z.enum(["brief", "standard", "deep"]), locale: z.string(), marks: z.union([z.literal(2), z.literal(5), z.literal(10), z.literal(16)]).optional(), allowPaid: z.boolean().default(false) })
});
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("phase"), sequence: z.number().int(), phase: z.enum(["preparing", "routing", "streaming", "validating"]) }),
  z.object({ type: z.literal("delta"), sequence: z.number().int(), text: z.string() }),
  z.object({ type: z.literal("warning"), sequence: z.number().int(), message: z.string() }),
  z.object({ type: z.literal("complete"), sequence: z.number().int(), finishReason: z.enum(["stop", "length"]) }),
  z.object({ type: z.literal("error"), sequence: z.number().int(), code: z.string(), message: z.string(), retryable: z.boolean() })
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;

export const ExtensionMessageSchema = z.discriminatedUnion("type", [
  z.object({ version: z.literal(1), type: z.literal("CAPTURE_CONTEXT"), requestId: IdSchema, scope: z.enum(["selection", "page"]) }),
  z.object({ version: z.literal(1), type: z.literal("OPEN_SIDE_PANEL"), requestId: IdSchema })
]);
export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;

export const SettingsSchema = z.object({
  schemaVersion: z.literal(1),
  theme: z.enum(["dark", "light", "system"]),
  locale: z.string().min(2).max(32),
  defaultProvider: ProviderIdSchema,
  explanationDepth: z.enum(["brief", "standard", "deep"]),
  telemetryConsent: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;
