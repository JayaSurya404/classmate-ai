import type { ProviderId, SourceSnapshot, StudyAction } from "@classmate/contracts";

export type MessageRole = "user" | "assistant" | "system";
export type MessageStatus = "pending" | "streaming" | "complete" | "error" | "cancelled";
export type ResponseLength = "short" | "medium" | "detailed";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  pinned?: boolean | undefined;
  saved?: boolean | undefined;
  error?: string | undefined;
  action?: StudyAction | undefined;
  providerId?: ProviderId | undefined;
  responseLength?: ResponseLength | undefined;
  sourceId?: string | undefined;
}

export interface StudySession {
  id: string;
  title: string;
  sourceId?: string | undefined;
  sourceTitle?: string | undefined;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export type WorkspaceMode = "home" | "chat";
export type WorkspacePanel = "study" | "pdf" | "ocr" | "video" | "notebook" | "editor" | "graph" | "search" | "practice" | "exam" | "analytics" | "revision" | "progress" | "history" | "recommendations" | "sync" | "collaboration" | "activity" | "versions" | "conflicts" | "library" | "settings";

export interface QuickActionItem {
  id: StudyAction;
  label: string;
  description: string;
  prompt: string;
}

export interface PromptSuggestion {
  id: string;
  label: string;
  prompt: string;
}

export interface WorkspaceContext {
  source: SourceSnapshot | undefined;
}

export type ProviderStatus = "ready" | "unconfigured" | "offline" | "busy";

export interface ProviderState {
  providerId: ProviderId;
  status: ProviderStatus;
}
