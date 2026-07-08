import { create } from "zustand";
import type { ChatMessage, MessageStatus } from "../features/workspace/types";

interface MessagesState {
  messages: ChatMessage[];
  streamingMessageId: string | undefined;
  addMessage(message: Omit<ChatMessage, "createdAt"> & { createdAt?: string | undefined }): string;
  updateMessage(id: string, patch: Partial<ChatMessage>): void;
  appendToMessage(id: string, delta: string): void;
  removeMessage(id: string): void;
  getSessionMessages(sessionId: string): ChatMessage[];
  getLastAssistantMessage(sessionId: string): ChatMessage | undefined;
  pinMessage(id: string, pinned: boolean): void;
  saveMessage(id: string, saved: boolean): void;
  clearSession(sessionId: string): void;
}

function createMessage(
  input: Omit<ChatMessage, "createdAt"> & { createdAt?: string | undefined },
): ChatMessage {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  streamingMessageId: undefined,

  addMessage: (message) => {
    const entry = createMessage(message);
    set((state) => ({
      messages: [...state.messages, entry],
      streamingMessageId: message.status === "streaming" ? entry.id : state.streamingMessageId,
    }));
    return entry.id;
  },

  updateMessage: (id, patch) => {
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, ...patch } : message,
      ),
      streamingMessageId:
        patch.status && patch.status !== "streaming" && state.streamingMessageId === id
          ? undefined
          : state.streamingMessageId,
    }));
  },

  appendToMessage: (id, delta) => {
    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, content: message.content + delta } : message,
      ),
    }));
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== id),
      streamingMessageId: state.streamingMessageId === id ? undefined : state.streamingMessageId,
    }));
  },

  getSessionMessages: (sessionId) =>
    get().messages.filter((message) => message.sessionId === sessionId),

  getLastAssistantMessage: (sessionId) => {
    const sessionMessages = get().getSessionMessages(sessionId);
    for (let index = sessionMessages.length - 1; index >= 0; index -= 1) {
      const message = sessionMessages[index];
      if (message?.role === "assistant") return message;
    }
    return undefined;
  },

  pinMessage: (id, pinned) => {
    get().updateMessage(id, { pinned });
  },

  saveMessage: (id, saved) => {
    get().updateMessage(id, { saved });
  },

  clearSession: (sessionId) => {
    set((state) => ({
      messages: state.messages.filter((message) => message.sessionId !== sessionId),
      streamingMessageId: undefined,
    }));
  },
}));

export function isStreamingStatus(status: MessageStatus): boolean {
  return status === "streaming" || status === "pending";
}
