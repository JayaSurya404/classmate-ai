import { Button } from "@classmate/ui";
import { ArrowDown } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { ChatMessage } from "../types";

export interface ChatContainerProps {
  messages: ChatMessage[];
  isThinking: boolean;
  showJumpToLatest: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScrollToBottom: () => void;
  onCopy: (content: string) => void;
  onRetry: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
  onPin: (messageId: string, pinned: boolean) => void;
  onSave: (messageId: string, saved: boolean) => void;
}

export function ChatContainer({
  messages,
  isThinking,
  showJumpToLatest,
  containerRef,
  onScrollToBottom,
  onCopy,
  onRetry,
  onRegenerate,
  onContinue,
  onPin,
  onSave,
}: ChatContainerProps) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto px-[var(--panel-px)] py-4"
        aria-label="Conversation"
        tabIndex={0}
      >
        <ChatMessages
          messages={messages}
          onCopy={onCopy}
          onRetry={onRetry}
          onRegenerate={onRegenerate}
          onContinue={onContinue}
          onPin={onPin}
          onSave={onSave}
        />
        {isThinking && (
          <div className="mt-4">
            <ThinkingIndicator />
          </div>
        )}
      </div>
      {showJumpToLatest && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto shadow-md"
            onClick={onScrollToBottom}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
}
