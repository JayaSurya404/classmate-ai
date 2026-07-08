import type { SourceSnapshot, StudyAction } from "@classmate/contracts";
import { create } from "zustand";
import type { ResponseLength, WorkspaceMode } from "../features/workspace/types";

interface WorkspaceState {
  mode: WorkspaceMode;
  source: SourceSnapshot | undefined;
  composerDraft: string;
  isThinking: boolean;
  isCapturing: boolean;
  scrollPinnedToBottom: boolean;
  showJumpToLatest: boolean;
  activeQuickAction: StudyAction;
  responseLength: ResponseLength;
  statusMessage: string | undefined;
  setMode(mode: WorkspaceMode): void;
  setSource(source: SourceSnapshot | undefined): void;
  setComposerDraft(draft: string): void;
  setIsThinking(thinking: boolean): void;
  setIsCapturing(capturing: boolean): void;
  setScrollPinnedToBottom(pinned: boolean): void;
  setShowJumpToLatest(show: boolean): void;
  setActiveQuickAction(action: StudyAction): void;
  setResponseLength(length: ResponseLength): void;
  setStatusMessage(message: string | undefined): void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mode: "home",
  source: undefined,
  composerDraft: "",
  isThinking: false,
  isCapturing: false,
  scrollPinnedToBottom: true,
  showJumpToLatest: false,
  activeQuickAction: "summary",
  responseLength: "medium",
  statusMessage: undefined,
  setMode: (mode) => {
    set({ mode });
  },
  setSource: (source) => {
    set({ source });
  },
  setComposerDraft: (composerDraft) => {
    set({ composerDraft });
  },
  setIsThinking: (isThinking) => {
    set({ isThinking });
  },
  setIsCapturing: (isCapturing) => {
    set({ isCapturing });
  },
  setScrollPinnedToBottom: (scrollPinnedToBottom) => {
    set({ scrollPinnedToBottom });
  },
  setShowJumpToLatest: (showJumpToLatest) => {
    set({ showJumpToLatest });
  },
  setActiveQuickAction: (activeQuickAction) => {
    set({ activeQuickAction });
  },
  setResponseLength: (responseLength) => {
    set({ responseLength });
  },
  setStatusMessage: (statusMessage) => {
    set({ statusMessage });
  },
}));
