import { useCallback, useRef } from "react";
import type { ProviderId, StreamEvent, StudyAction } from "@classmate/contracts";
import { captureActiveTab } from "../../../adapters/chrome/capture";
import { localRepositories } from "../../../adapters/local-db/database";
import { useMessagesStore } from "../../../stores/messages-store";
import { useProviderStore } from "../../../stores/provider-store";
import { useSessionsStore } from "../../../stores/sessions-store";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { PROMPT_SUGGESTIONS } from "../constants";
import type { ChatMessage, ResponseLength } from "../types";
import {
  actionLabel,
  createStudyGeneration,
  persistAssistantArtifact,
  recordGenerationMetric,
  type StudyGeneration,
} from "../services/studyEngine";

export function useWorkspaceActions() {
  const abortRef = useRef<AbortController | undefined>(undefined);
  const generationRef = useRef<StudyGeneration | undefined>(undefined);
  const workspace = useWorkspaceStore();
  const sessions = useSessionsStore();
  const messages = useMessagesStore();
  const providerId = useProviderStore((state) => state.providerId);
  const setProviderStatus = useProviderStore((state) => state.setStatus);

  const ensureSession = useCallback((): string => {
    if (sessions.activeSessionId) return sessions.activeSessionId;
    const title = workspace.source?.title ?? "New study session";
    return sessions.createSession(title, workspace.source?.title, workspace.source?.id);
  }, [sessions, workspace.source]);

  const captureSource = useCallback(async (): Promise<void> => {
    workspace.setIsCapturing(true);
    workspace.setStatusMessage(undefined);
    const result = await captureActiveTab();
    if (result.ok) {
      workspace.setSource(result.source);
      await localRepositories.sources.save(result.source);
    } else {
      workspace.setStatusMessage(result.message);
    }
    workspace.setIsCapturing(false);
  }, [workspace]);

  const finishStream = useCallback(
    (sessionId: string, assistantId: string): void => {
      messages.updateMessage(assistantId, { status: "complete" });
      workspace.setIsThinking(false);
      setProviderStatus("ready");
      sessions.updateSession(sessionId, {
        messageCount: messages.getSessionMessages(sessionId).length,
      });
    },
    [messages, sessions, setProviderStatus, workspace],
  );

  const failStream = useCallback(
    (assistantId: string, message: string, provider: ProviderId): void => {
      messages.updateMessage(assistantId, { status: "error", error: message });
      workspace.setIsThinking(false);
      workspace.setStatusMessage(message);
      setProviderStatus(provider === "ollama" ? "offline" : "unconfigured");
    },
    [messages, setProviderStatus, workspace],
  );

  const runGeneration = useCallback(
    async (args: {
      sessionId: string;
      assistantId: string;
      action: StudyAction;
      prompt: string;
      responseLength: ResponseLength;
      provider: ProviderId;
    }): Promise<void> => {
      if (!workspace.source) {
        failStream(args.assistantId, "Attach or capture a source before generating.", args.provider);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      workspace.setIsThinking(true);
      workspace.setStatusMessage(undefined);
      setProviderStatus("busy");

      try {
        const generation = await createStudyGeneration(
          {
            action: args.action,
            prompt: args.prompt,
            source: workspace.source,
            providerId: args.provider,
            responseLength: args.responseLength,
            history: messages.getSessionMessages(args.sessionId),
          },
          controller.signal,
        );
        generationRef.current = generation;
        if (generation.plan.confidence.label === "low") {
          workspace.setStatusMessage("Evidence coverage is limited; the response should indicate uncertainty.");
        }
        await localRepositories.operations.update(generation.request.operationId, {
          status: "streaming",
          startedAt: new Date().toISOString(),
          lastSequence: 0,
          partialText: "",
        });
        await consumeStream(generation.stream, args.assistantId, messages.appendToMessage);
        if (!controller.signal.aborted) {
          await recordGenerationMetric({ generation, status: "completed" });
          generationRef.current = undefined;
          finishStream(args.sessionId, args.assistantId);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        if (generationRef.current) {
          await recordGenerationMetric({
            generation: generationRef.current,
            status: "failed",
            errorCode: errorMessage(error),
          });
          generationRef.current = undefined;
        }
        failStream(args.assistantId, errorMessage(error), args.provider);
      }
    },
    [failStream, finishStream, messages.appendToMessage, setProviderStatus, workspace],
  );

  const startMessage = useCallback(
    (content: string, action: StudyAction): void => {
      const text = content.trim();
      if (!text) return;
      const sessionId = ensureSession();
      const responseLength = workspace.responseLength;
      workspace.setMode("chat");
      workspace.setComposerDraft("");
      void chrome.storage.local.set({ draft: "" });

      messages.addMessage(userMessage(sessionId, text, action, responseLength, workspace.source?.id));
      const assistantId = messages.addMessage(
        assistantMessage(sessionId, action, providerId, responseLength, workspace.source?.id),
      );

      sessions.updateSession(sessionId, {
        messageCount: messages.getSessionMessages(sessionId).length + 2,
        title: workspace.source?.title ?? actionLabel(action),
      });

      void runGeneration({
        sessionId,
        assistantId,
        action,
        prompt: text,
        responseLength,
        provider: providerId,
      });
    },
    [ensureSession, messages, providerId, runGeneration, sessions, workspace],
  );

  const sendMessage = useCallback(
    (content?: string): void => {
      startMessage(content ?? workspace.composerDraft, workspace.activeQuickAction);
    },
    [startMessage, workspace.activeQuickAction, workspace.composerDraft],
  );

  const stopGeneration = useCallback((): void => {
    abortRef.current?.abort();
    if (generationRef.current) {
      void recordGenerationMetric({ generation: generationRef.current, status: "cancelled" });
      generationRef.current = undefined;
    }
    workspace.setIsThinking(false);
    setProviderStatus("ready");
    const session = sessions.getActiveSession();
    if (!session) return;
    const lastAssistant = messages.getLastAssistantMessage(session.id);
    if (lastAssistant?.status === "streaming") {
      messages.updateMessage(lastAssistant.id, { status: "cancelled", error: "Generation stopped." });
    }
  }, [messages, sessions, setProviderStatus, workspace]);

  const retryMessage = useCallback(
    (messageId: string): void => {
      const request = findPriorUser(messages.messages, messageId);
      if (request) startMessage(request.content, request.action ?? workspace.activeQuickAction);
    },
    [messages.messages, startMessage, workspace.activeQuickAction],
  );

  const regenerateMessage = useCallback(
    (messageId: string): void => {
      const target = messages.messages.find((message) => message.id === messageId);
      const request = findPriorUser(messages.messages, messageId);
      if (!target || !request) return;
      messages.updateMessage(messageId, { content: "", status: "streaming", error: undefined });
      void runGeneration({
        sessionId: target.sessionId,
        assistantId: messageId,
        action: request.action ?? workspace.activeQuickAction,
        prompt: request.content,
        responseLength: request.responseLength ?? workspace.responseLength,
        provider: target.providerId ?? providerId,
      });
    },
    [messages, providerId, runGeneration, workspace.activeQuickAction, workspace.responseLength],
  );

  const continueMessage = useCallback(
    (messageId: string): void => {
      const target = messages.messages.find((message) => message.id === messageId);
      if (!target) return;
      startMessage(
        `Continue this ${actionLabel(target.action ?? "chat")} response without repeating it.\n\nPrior response:\n${target.content}`,
        target.action ?? "chat",
      );
    },
    [messages.messages, startMessage],
  );

  const saveAssistantMessage = useCallback(
    async (messageId: string, saved: boolean): Promise<void> => {
      const message = messages.messages.find((entry) => entry.id === messageId);
      if (!message || !workspace.source) return;
      if (saved && message.content.trim()) {
        await persistAssistantArtifact({
          action: message.action ?? workspace.activeQuickAction,
          content: message.content,
          providerId: message.providerId ?? providerId,
          source: workspace.source,
        });
      }
      messages.saveMessage(messageId, saved);
    },
    [messages, providerId, workspace.activeQuickAction, workspace.source],
  );

  return {
    captureSource,
    sendMessage,
    stopGeneration,
    retryMessage,
    regenerateMessage,
    continueMessage,
    saveAssistantMessage,
    applySuggestion: workspace.setComposerDraft,
    copyMessage: (content: string) => navigator.clipboard.writeText(content),
    copyLastResponse: () => copyLast(messages, sessions),
    loadDraft: () => loadDraft(workspace.setComposerDraft),
    removeSource: () => workspace.setSource(undefined),
    suggestions: PROMPT_SUGGESTIONS,
  };
}

function userMessage(
  sessionId: string,
  content: string,
  action: StudyAction,
  responseLength: ResponseLength,
  sourceId?: string,
): Omit<ChatMessage, "createdAt"> {
  return { id: crypto.randomUUID(), sessionId, role: "user", content, status: "complete", action, responseLength, sourceId };
}

function assistantMessage(
  sessionId: string,
  action: StudyAction,
  providerId: ProviderId,
  responseLength: ResponseLength,
  sourceId?: string,
): Omit<ChatMessage, "createdAt"> {
  return { id: crypto.randomUUID(), sessionId, role: "assistant", content: "", status: "streaming", action, providerId, responseLength, sourceId };
}

async function consumeStream(
  stream: AsyncIterable<StreamEvent>,
  messageId: string,
  append: (id: string, delta: string) => void,
): Promise<void> {
  for await (const event of stream) {
    if (event.type === "delta") append(messageId, event.text);
    if (event.type === "error") throw new Error(event.message);
  }
}

function findPriorUser(messages: readonly ChatMessage[], messageId: string): ChatMessage | undefined {
  const index = messages.findIndex((message) => message.id === messageId);
  return [...messages.slice(0, index)].reverse().find((message) => message.role === "user");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The provider could not complete this request.";
}

async function copyLast(messages: ReturnType<typeof useMessagesStore.getState>, sessions: ReturnType<typeof useSessionsStore.getState>): Promise<void> {
  const session = sessions.getActiveSession();
  if (!session) return;
  const last = messages.getLastAssistantMessage(session.id);
  if (last?.content) await navigator.clipboard.writeText(last.content);
}

async function loadDraft(setDraft: (draft: string) => void): Promise<void> {
  const stored = await chrome.storage.local.get("draft");
  if (typeof stored.draft === "string" && stored.draft) setDraft(stored.draft);
}
