import { z } from "zod";

export const IdSchema = z.string().uuid();
export const SourceTypeSchema = z.enum(["article", "documentation", "repository", "pdf", "youtube", "lms", "generic", "pasted"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;
export const ContentBlockSchema = z.object({
  id: z.string().min(1), type: z.enum(["heading", "paragraph", "code", "list", "table", "quote"]),
  text: z.string().max(100_000), headingPath: z.array(z.string()).max(12), startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(), language: z.string().max(32).optional()
}).refine((value) => value.endOffset >= value.startOffset, "Invalid source offsets");
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export const SourceSnapshotSchema = z.object({
  schemaVersion: z.literal(1), id: IdSchema, title: z.string().min(1).max(500), canonicalUrl: z.string().url().optional(),
  sourceType: SourceTypeSchema, capturedAt: z.string().datetime(), contentHash: z.string().min(16),
  language: z.string().min(2).max(32).default("und"), blocks: z.array(ContentBlockSchema).max(10_000),
  scope: z.enum(["selection", "section", "page", "transcript", "pdf_pages", "pasted"]),
  sensitivity: z.enum(["clear", "review", "blocked"])
});
export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

export const StudyActionSchema = z.enum(["summary", "explain_simple", "explain_deep", "rewrite", "simplify", "flashcards", "quiz", "memory_tricks", "mind_map", "study_plan", "exam_answer", "university_answer", "lab_record", "viva", "chat"]);
export type StudyAction = z.infer<typeof StudyActionSchema>;

export const FlashcardTypeSchema = z.enum(["qa", "cloze", "definition", "concept", "formula"]);
export type FlashcardType = z.infer<typeof FlashcardTypeSchema>;

export const FlashcardSchema = z.object({
  id: z.string().uuid(),
  type: FlashcardTypeSchema,
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(2000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string().max(50)).max(10),
  citations: z.array(z.string()),
  isFavorite: z.boolean().default(false),
  reviewCount: z.number().int().nonnegative().default(0),
  lastReviewedAt: z.string().datetime().optional(),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const FlashcardDeckSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  sourceId: z.string().uuid().optional(),
  cards: z.array(FlashcardSchema).max(500),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FlashcardDeck = z.infer<typeof FlashcardDeckSchema>;

export const QuestionTypeSchema = z.enum(["multiple_choice", "true_false", "fill_blank", "matching", "one_word", "short_answer", "long_answer"]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuizQuestionSchema = z.object({
  id: z.string().uuid(),
  type: QuestionTypeSchema,
  prompt: z.string().min(1).max(2000),
  choices: z.array(z.string().max(500)).max(6).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().max(1000).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  citations: z.array(z.string()),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizAttemptSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  score: z.number().min(0).max(100),
  completedAt: z.string().datetime(),
});
export type QuizAttempt = z.infer<typeof QuizAttemptSchema>;

export const QuizSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  sourceId: z.string().uuid().optional(),
  questions: z.array(QuizQuestionSchema).max(100),
  attempts: z.array(QuizAttemptSchema).max(50),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Quiz = z.infer<typeof QuizSchema>;

export const MemoryToolTypeSchema = z.enum(["mnemonic", "acronym", "analogy", "story", "feynman"]);
export type MemoryToolType = z.infer<typeof MemoryToolTypeSchema>;

export const MemoryAidSchema = z.object({
  id: z.string().uuid(),
  type: MemoryToolTypeSchema,
  concept: z.string().min(1).max(500),
  aid: z.string().min(1).max(2000),
  explanation: z.string().max(1000).optional(),
  citations: z.array(z.string()),
});
export type MemoryAid = z.infer<typeof MemoryAidSchema>;

export const MindMapNodeSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  parentId: z.string().uuid().nullable(),
  children: z.array(z.string().uuid()),
  level: z.number().int().nonnegative(),
  isExpanded: z.boolean().default(true),
});
export type MindMapNode = z.infer<typeof MindMapNodeSchema>;

export const MindMapSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  sourceId: z.string().uuid().optional(),
  nodes: z.array(MindMapNodeSchema).max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type MindMap = z.infer<typeof MindMapSchema>;

export const StudyPlanTypeSchema = z.enum(["30_min", "1_hour", "tomorrow_exam", "one_week"]);
export type StudyPlanType = z.infer<typeof StudyPlanTypeSchema>;

export const StudyPlanItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(300),
  duration: z.number().int().positive(),
  order: z.number().int().nonnegative(),
  topics: z.array(z.string().max(200)).max(10),
});
export type StudyPlanItem = z.infer<typeof StudyPlanItemSchema>;

export const StudyPlanSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  planType: StudyPlanTypeSchema,
  sourceId: z.string().uuid().optional(),
  items: z.array(StudyPlanItemSchema).max(20),
  totalDuration: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
export type StudyPlan = z.infer<typeof StudyPlanSchema>;
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
