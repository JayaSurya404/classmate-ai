import { cn } from "@classmate/ui";
import { BookOpen, GraduationCap, Library, Settings } from "lucide-react";
import type { WorkspacePanel } from "../types";

const NAV_ITEMS: readonly { id: WorkspacePanel; label: string; icon: typeof GraduationCap }[] = [
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "library", label: "Library", icon: Library },
  { id: "practice", label: "Practice", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export interface WorkspaceNavigationProps {
  activePanel: WorkspacePanel;
  collapsed?: boolean | undefined;
  onSelect: (panel: WorkspacePanel) => void;
}

export function WorkspaceNavigation({
  activePanel,
  collapsed,
  onSelect,
}: WorkspaceNavigationProps) {
  return (
    <nav
      aria-label="Workspace navigation"
      className={cn(
        "glass-panel hidden shrink-0 flex-col border-e border-border md:flex",
        collapsed ? "w-16" : "w-44",
      )}
    >
      <ul className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activePanel === id;
          return (
            <li key={id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  onSelect(id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>{label}</span>}
                {collapsed && <span className="sr-only">{label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function WorkspaceMobileNav({
  activePanel,
  onSelect,
}: {
  activePanel: WorkspacePanel;
  onSelect: (panel: WorkspacePanel) => void;
}) {
  return (
    <nav
      aria-label="Workspace navigation"
      className="glass-panel flex border-t border-border md:hidden"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={activePanel === id ? "page" : undefined}
          onClick={() => {
            onSelect(id);
          }}
          className={cn(
            "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activePanel === id ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
