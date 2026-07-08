import { Avatar } from "@classmate/ui";
import { ResponseCard } from "./ResponseCard";
import { UserBubble } from "./UserBubble";
import type { ChatMessage } from "../types";

export interface AIBubbleProps {
  message: ChatMessage;
  onCopy: () => void;
  onRetry?: (() => void) | undefined;
  onRegenerate?: (() => void) | undefined;
  onContinue?: (() => void) | undefined;
  onPin?: ((pinned: boolean) => void) | undefined;
  onSave?: ((saved: boolean) => void) | undefined;
}

export function AIBubble(props: AIBubbleProps) {
  return (
    <div className="flex gap-2.5">
      <Avatar size="sm" fallback="AI" className="mt-1 shrink-0 bg-primary/15 text-primary" />
      <div className="min-w-0 flex-1">
        <ResponseCard {...props} />
      </div>
    </div>
  );
}

export interface ChatMessagesProps {
  messages: ChatMessage[];
  onCopy: (content: string) => void;
  onRetry: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onContinue: (messageId: string) => void;
  onPin: (messageId: string, pinned: boolean) => void;
  onSave: (messageId: string, saved: boolean) => void;
}

export function ChatMessages({
  messages,
  onCopy,
  onRetry,
  onRegenerate,
  onContinue,
  onPin,
  onSave,
}: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-title font-semibold">Start your study session</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Attach a source, pick a quick action, or ask a question to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {messages.map((message) =>
        message.role === "user" ? (
          <UserBubble key={message.id} content={message.content} timestamp={message.createdAt} />
        ) : (
          <AIBubble
            key={message.id}
            message={message}
            onCopy={() => {
              onCopy(message.content);
            }}
            onRetry={
              message.status === "error" || message.status === "cancelled"
                ? () => {
                    onRetry(message.id);
                  }
                : undefined
            }
            onRegenerate={
              message.status === "complete"
                ? () => {
                    onRegenerate(message.id);
                  }
                : undefined
            }
            onContinue={
              message.status === "complete"
                ? () => {
                    onContinue(message.id);
                  }
                : undefined
            }
            onPin={(pinned) => {
              onPin(message.id, pinned);
            }}
            onSave={(saved) => {
              onSave(message.id, saved);
            }}
          />
        ),
      )}
    </div>
  );
}
