import { Spinner } from "@classmate/ui";
import { Sparkles } from "lucide-react";

export function ThinkingIndicator({ label = "Thinking" }: { label?: string | undefined }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/70 px-3 py-2 text-sm text-muted-foreground"
    >
      <Sparkles className="size-4 animate-pulse text-primary" aria-hidden="true" />
      <span>{label}…</span>
      <Spinner size="sm" label={label} className="text-primary" />
    </div>
  );
}
