import { create } from "zustand";
import type { WorkspacePanel } from "../features/workspace/types";

interface UiState {
  panel: WorkspacePanel;
  sidebarCollapsed: boolean;
  setPanel(panel: WorkspacePanel): void;
  setSidebarCollapsed(collapsed: boolean): void;
  toggleSidebar(): void;
}

export const useUiStore = create<UiState>((set) => ({
  panel: "study",
  sidebarCollapsed: false,
  setPanel: (panel) => {
    set({ panel });
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed });
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
}));
