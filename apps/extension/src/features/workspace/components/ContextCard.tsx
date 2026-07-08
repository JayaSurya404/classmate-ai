import { Badge, Button, Card, cn } from "@classmate/ui";
import type { SourceSnapshot } from "@classmate/contracts";
import { FileText, LoaderCircle, Paperclip, X } from "lucide-react";

export interface ContextCardProps {
  source: SourceSnapshot | undefined;
  isCapturing: boolean;
  onCapture: () => void;
  onRemove: () => void;
}

export function ContextCard({ source, isCapturing, onCapture, onRemove }: ContextCardProps) {
  if (!source) {
    return (
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Paperclip className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">No source attached</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Capture the visible page or selection to ground your study session.
            </p>
            <Button
              className="mt-3"
              variant="secondary"
              size="sm"
              disabled={isCapturing}
              onClick={onCapture}
            >
              {isCapturing ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Paperclip className="size-4" aria-hidden="true" />
              )}
              Read this page
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const tokenEstimate = Math.ceil(
    source.blocks.reduce((total, block) => total + block.text.length, 0) / 4,
  );

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <FileText className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{source.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="primary">{source.sourceType}</Badge>
            <Badge variant="outline">{source.scope}</Badge>
            <span className="text-caption text-muted-foreground">~{tokenEstimate} tokens</span>
          </div>
        </div>
        <Button size="icon" variant="ghost" aria-label="Remove source" onClick={onRemove}>
          <X className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

export function ContextCardCompact({ source }: { source: SourceSnapshot | undefined }) {
  if (!source) return null;
  return (
    <div className={cn("flex items-center gap-2 rounded-lg bg-surface-2/80 px-2.5 py-1.5 text-xs")}>
      <Paperclip className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
      <span className="truncate text-muted-foreground">{source.title}</span>
    </div>
  );
}
