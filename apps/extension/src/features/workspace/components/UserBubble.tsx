import { Avatar, cn } from "@classmate/ui";

export interface UserBubbleProps {
  content: string;
  timestamp?: string | undefined;
}

export function UserBubble({ content, timestamp }: UserBubbleProps) {
  return (
    <article className="flex justify-end gap-2.5" aria-label="Your message">
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-2xl rounded-ee-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <p className="text-end text-caption text-muted-foreground">{formatTime(timestamp)}</p>
        )}
      </div>
      <Avatar size="sm" fallback="You" className="mt-1 shrink-0 bg-primary/20 text-primary" />
    </article>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function UserBubbleSkeleton({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("flex justify-end gap-2.5", className)} aria-hidden="true">
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-primary/20" />
    </div>
  );
}
