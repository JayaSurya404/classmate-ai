import { Button, ThemeToggle } from "@classmate/ui";
import { PanelLeft } from "lucide-react";
import { SessionInfo } from "./SessionInfo";
import { ContextCardCompact } from "./ContextCard";
import type { SourceSnapshot } from "@classmate/contracts";
import type { StudySession } from "../types";

export interface WorkspaceHeaderProps {
  source: SourceSnapshot | undefined;
  session: StudySession | undefined;
  onToggleNav?: (() => void) | undefined;
}

export function WorkspaceHeader({ source, session, onToggleNav }: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-[var(--panel-px)] py-3">
        {onToggleNav && (
          <Button variant="ghost" size="icon" aria-label="Toggle navigation" onClick={onToggleNav}>
            <PanelLeft className="size-5" />
          </Button>
        )}
        <div className="grid size-9 place-items-center rounded-xl bg-primary font-bold text-primary-foreground">
          C
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">ClassMate AI</h1>
          <SessionInfo session={session} />
        </div>
        <ThemeToggle />
      </div>
      {source && (
        <div className="border-t border-border px-[var(--panel-px)] py-2">
          <ContextCardCompact source={source} />
        </div>
      )}
    </header>
  );
}
