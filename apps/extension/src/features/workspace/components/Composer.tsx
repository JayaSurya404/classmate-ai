import { Button, Textarea } from "@classmate/ui";
import { Paperclip, Send, Square } from "lucide-react";
import { ProviderSelector } from "./ProviderSelector";
import { ResponseLengthSelector } from "./ResponseLengthSelector";

export interface ComposerProps {
  value: string;
  isStreaming: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach?: (() => void) | undefined;
  onBlurPersist?: (() => void) | undefined;
}

export function Composer({
  value,
  isStreaming,
  onChange,
  onSend,
  onStop,
  onAttach,
  onBlurPersist,
}: ComposerProps) {
  return (
    <div className="glass-panel border-t border-border p-3">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-1/80 focus-within:ring-2 focus-within:ring-ring/40">
        <Textarea
          aria-label="Message composer"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onBlur={onBlurPersist}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (isStreaming) onStop();
              else onSend();
            }
          }}
          placeholder="Ask anything about your source…"
          className="min-h-20 resize-none border-0 bg-transparent focus-visible:ring-0"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
          <div className="flex items-center gap-2">
            {onAttach && (
              <Button variant="ghost" size="icon" aria-label="Attach source" onClick={onAttach}>
                <Paperclip className="size-4" />
              </Button>
            )}
            <ProviderSelector compact />
            <ResponseLengthSelector />
          </div>
          {isStreaming ? (
            <Button variant="secondary" size="sm" onClick={onStop}>
              <Square className="size-4" aria-hidden="true" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={onSend} disabled={!value.trim()}>
              <Send className="size-4" aria-hidden="true" />
              Send
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">
        Enter to send · Shift+Enter for newline · ⌘K focus · ⌘↵ send
      </p>
    </div>
  );
}
