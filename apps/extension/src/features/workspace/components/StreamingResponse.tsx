import { SkeletonText } from "@classmate/ui";

export function StreamingResponse() {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-3">
      <SkeletonText lines={4} />
      <p className="text-xs text-muted-foreground">Streaming response…</p>
    </div>
  );
}
