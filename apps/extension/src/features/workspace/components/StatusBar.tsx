import { cn } from "@classmate/ui";
import { useProviderStore } from "../../../stores/provider-store";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { PROVIDER_LABELS } from "../constants";

export function StatusBar() {
  const statusMessage = useWorkspaceStore((state) => state.statusMessage);
  const providerId = useProviderStore((state) => state.providerId);
  const providerStatus = useProviderStore((state) => state.status);

  return (
    <footer
      className="flex items-center justify-between gap-2 border-t border-border bg-background/70 px-[var(--panel-px)] py-1.5 text-caption text-muted-foreground backdrop-blur-xl"
      aria-live="polite"
    >
      <span className={cn(statusMessage && "text-warning")}>
        {statusMessage ?? "Local-first · Your drafts stay on this device"}
      </span>
      <span className="shrink-0">
        {PROVIDER_LABELS[providerId]} · {providerStatus}
      </span>
    </footer>
  );
}
