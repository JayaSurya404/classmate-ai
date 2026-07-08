import { create } from "zustand";
import type { StudySession } from "../features/workspace/types";

interface SessionsState {
  sessions: StudySession[];
  activeSessionId: string | undefined;
  createSession(title: string, sourceTitle?: string, sourceId?: string): string;
  setActiveSession(id: string | undefined): void;
  updateSession(id: string, patch: Partial<Pick<StudySession, "title" | "messageCount" | "updatedAt">>): void;
  getActiveSession(): StudySession | undefined;
}

function newSession(title: string, sourceTitle?: string, sourceId?: string): StudySession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    sourceId,
    sourceTitle,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  activeSessionId: undefined,

  createSession: (title, sourceTitle, sourceId) => {
    const session = newSession(title, sourceTitle, sourceId);
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));
    return session.id;
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  updateSession: (id, patch) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id ? { ...session, ...patch, updatedAt: new Date().toISOString() } : session,
      ),
    }));
  },

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find((session) => session.id === activeSessionId);
  },
}));
