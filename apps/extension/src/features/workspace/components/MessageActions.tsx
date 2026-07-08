import type { ReactNode } from "react";
import {
  Copy,
  CornerDownRight,
  Pin,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button, Tooltip } from "@classmate/ui";

export interface MessageActionsProps {
  content: string;
  pinned?: boolean | undefined;
  saved?: boolean | undefined;
  canRetry?: boolean | undefined;
  canRegenerate?: boolean | undefined;
  canContinue?: boolean | undefined;
  onCopy: () => void;
  onRetry?: (() => void) | undefined;
  onRegenerate?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
  onPin?: ((pinned: boolean) => void) | undefined;
  onSave?: ((saved: boolean) => void) | undefined;
}

export function MessageActions({
  content,
  pinned,
  saved,
  canRetry,
  canRegenerate,
  canContinue,
  onCopy,
  onRetry,
  onRegenerate,
  onContinue,
  onPin,
  onSave,
}: MessageActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
      <ActionButton label="Copy response" onClick={onCopy}>
        <Copy className="size-3.5" />
      </ActionButton>
      {canRetry && onRetry && (
        <ActionButton label="Retry" onClick={onRetry}>
          <RotateCcw className="size-3.5" />
        </ActionButton>
      )}
      {canRegenerate && onRegenerate && (
        <ActionButton label="Regenerate" onClick={onRegenerate}>
          <RefreshCw className="size-3.5" />
        </ActionButton>
      )}
      {canContinue && onContinue && (
        <ActionButton label="Continue" onClick={onContinue}>
          <CornerDownRight className="size-3.5" />
        </ActionButton>
      )}
      {onPin && (
        <ActionButton label={pinned ? "Unpin" : "Pin response"} onClick={() => onPin(!pinned)}>
          <Pin className={`size-3.5 ${pinned ? "fill-current" : ""}`} />
        </ActionButton>
      )}
      {onSave && (
        <ActionButton label={saved ? "Saved" : "Save response"} onClick={() => onSave(!saved)}>
          <Save className={`size-3.5 ${saved ? "fill-current" : ""}`} />
        </ActionButton>
      )}
      <span className="sr-only">{content.slice(0, 40)}</span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon" className="size-7" aria-label={label} onClick={onClick}>
        {children}
      </Button>
    </Tooltip>
  );
}
