import { Button } from "@classmate/ui";
import type { PromptSuggestion } from "../types";

export interface PromptSuggestionsProps {
  suggestions: readonly PromptSuggestion[];
  onSelect: (prompt: string) => void;
}

export function PromptSuggestions({ suggestions, onSelect }: PromptSuggestionsProps) {
  return (
    <section aria-label="Prompt suggestions">
      <h3 className="text-label font-medium text-muted-foreground">Try asking</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal py-2 text-start"
            onClick={() => {
              onSelect(item.prompt);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
