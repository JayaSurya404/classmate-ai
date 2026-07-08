import { Badge, MarkdownRenderer } from "@classmate/ui";
import { Sparkles } from "lucide-react";
import { StreamingResponse } from "./StreamingResponse";
import { MessageActions } from "./MessageActions";
import type { ChatMessage } from "../types";

export interface ResponseCardProps {
  message: ChatMessage;
  onCopy: () => void;
  onRetry?: (() => void) | undefined;
  onRegenerate?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
  onPin?: ((pinned: boolean) => void) | undefined;
  onSave?: ((saved: boolean) => void) | undefined;
}

export function ResponseCard({
  message,
  onCopy,
  onRetry,
  onRegenerate,
  onContinue,
  onPin,
  onSave,
}: ResponseCardProps) {
  const isStreaming = message.status === "streaming" || message.status === "pending";
  const isError = message.status === "error" || message.status === "cancelled";

  return (
    <article className="group space-y-2" aria-label="AI response">
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
        <span className="text-label font-medium">ClassMate</span>
        {message.pinned && <Badge variant="primary">Pinned</Badge>}
        {message.saved && <Badge variant="success">Saved</Badge>}
        {isStreaming && <Badge variant="info">Generating</Badge>}
        {isError && <Badge variant="warning">Incomplete</Badge>}
      </div>

      <div className="glass-panel rounded-2xl rounded-es-md p-4">
        {isStreaming && !message.content ? (
          <StreamingResponse />
        ) : (
          <MarkdownRenderer markdown={message.content || "_Waiting for response…_"} />
        )}
        {isStreaming && message.content && (
          <p className="mt-2 inline-block animate-pulse text-primary" aria-hidden="true">
            ▍
          </p>
        )}
        {message.error && (
          <p className="mt-2 text-sm text-warning">{message.error}</p>
        )}
      </div>

      <MessageActions
        content={message.content}
        pinned={message.pinned}
        saved={message.saved}
        canRetry={isError}
        canRegenerate={message.status === "complete"}
        canContinue={message.status === "complete"}
        onCopy={onCopy}
        onRetry={onRetry}
        onRegenerate={onRegenerate}
        onContinue={onContinue}
        onPin={onPin}
        onSave={onSave}
      />
    </article>
  );
}
