import type { StudyAction } from "@classmate/contracts";
import { cn } from "@classmate/ui";
import { QUICK_ACTIONS } from "../constants";

export interface QuickActionsProps {
  activeAction: StudyAction;
  onSelect: (action: StudyAction, prompt: string) => void;
}

export function QuickActions({ activeAction, onSelect }: QuickActionsProps) {
  return (
    <section aria-label="Quick actions">
      <h3 className="text-label font-medium text-muted-foreground">Quick actions</h3>
      <div className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        {QUICK_ACTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelect(item.id, item.prompt);
            }}
            className={cn(
              "glass-panel min-h-18 rounded-xl p-3 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
              activeAction === item.id
                ? "border-primary bg-primary/10"
                : "hover:bg-surface-2/80",
            )}
          >
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
