import { useEffect } from "react";
import { useWorkspaceStore } from "../../../stores/workspace-store";

interface WorkspaceShortcutHandlers {
  onSend: () => void;
  onStop: () => void;
  onFocusComposer: () => void;
  onCopyLastResponse: () => void;
  isStreaming: boolean;
}

export function useWorkspaceShortcuts(handlers: WorkspaceShortcutHandlers): void {
  const isThinking = useWorkspaceStore((state) => state.isThinking);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey;

      if (mod && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (handlers.isStreaming || isThinking) handlers.onStop();
        else handlers.onSend();
        return;
      }

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handlers.onFocusComposer();
        return;
      }

      if (mod && event.shiftKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        handlers.onCopyLastResponse();
        return;
      }

      if (event.key === "Escape" && (handlers.isStreaming || isThinking)) {
        event.preventDefault();
        handlers.onStop();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handlers, isThinking]);
}
