import { Badge } from "@classmate/ui";
import { MessageSquare, Timer } from "lucide-react";
import type { StudySession } from "../types";

export interface SessionInfoProps {
  session: StudySession | undefined;
}

export function SessionInfo({ session }: SessionInfoProps) {
  if (!session) {
    return (
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <Timer className="size-3.5" aria-hidden="true" />
        No active session
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-1">
        <MessageSquare className="size-3" aria-hidden="true" />
        {session.messageCount}
      </Badge>
      <span className="truncate text-caption text-muted-foreground">{session.title}</span>
    </div>
  );
}
