export { FlashcardsService } from "./services/flashcards";
export { QuizService } from "./services/quiz";
export { MemoryToolsService } from "./services/memory-tools";
export { MindMapService } from "./services/mind-map";
export { StudyPlanService } from "./services/study-plan";
export { ExportService } from "./services/export";
export { NotebookService } from "./services/notebook";
export type { NotebookExportFormat } from "./services/notebook";
export { ExamService } from "./services/exam";
export { AnalyticsService, RevisionService } from "./services/analytics";
export { SyncCollaborationService, type ChangeInput, type MergeResult, type VersionComparison } from "./services/sync-collaboration";

export type {
  ActivityFeedEvent,
  AnalyticsActivity,
  CollaborationComment,
  Collaborator,
  SharedWorkspace,
  SyncConflict,
  SyncDelta,
  SyncDevice,
  SyncMetadata,
  SyncOperation,
  VersionSnapshot,
  Exam,
  ExamQuestion,
  ExamResult,
  FlashcardDeck,
  Flashcard,
  KnowledgeGraph,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  LearningAnalytics,
  NoteCollection,
  NoteFolder,
  NoteTag,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  RevisionItem,
  RevisionPlan,
  SmartNote,
  MemoryAid,
  MindMap,
  MindMapNode,
  StudyPlan,
  StudyPlanItem,
} from "@classmate/contracts";
