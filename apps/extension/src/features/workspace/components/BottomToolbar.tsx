import { Button } from "@classmate/ui";
import { History, Plus, Sparkles } from "lucide-react";

export interface BottomToolbarProps {
  onNewSession?: (() => void) | undefined;
  onToggleHistory?: (() => void) | undefined;
}

export function BottomToolbar({ onNewSession, onToggleHistory }: BottomToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-1/70 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        {onNewSession && (
          <Button variant="ghost" size="sm" onClick={onNewSession}>
            <Plus className="size-4" aria-hidden="true" />
            New
          </Button>
        )}
        {onToggleHistory && (
          <Button variant="ghost" size="sm" onClick={onToggleHistory}>
            <History className="size-4" aria-hidden="true" />
            History
          </Button>
        )}
      </div>
      <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        Workspace ready
      </span>
    </div>
  );
}
