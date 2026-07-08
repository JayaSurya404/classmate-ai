import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@classmate/ui";
import { Clock, MessageSquare } from "lucide-react";
import type { StudySession } from "../types";

export interface StudySessionCardProps {
  session: StudySession;
  isActive?: boolean | undefined;
  onSelect?: (() => void) | undefined;
}

export function StudySessionCard({ session, isActive, onSelect }: StudySessionCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-surface-2/50 ${isActive ? "border-primary/50 bg-primary/5" : ""}`}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-sm">{session.title}</CardTitle>
          {isActive && <Badge variant="primary">Active</Badge>}
        </div>
        {session.sourceTitle && (
          <CardDescription className="line-clamp-1">{session.sourceTitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex items-center gap-3 pt-0 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="size-3.5" aria-hidden="true" />
          {session.messageCount} messages
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          {formatRelative(session.updatedAt)}
        </span>
      </CardContent>
    </Card>
  );
}

function formatRelative(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  return new Date(iso).toLocaleDateString();
}
