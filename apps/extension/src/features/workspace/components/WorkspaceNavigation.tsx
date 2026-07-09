import { cn } from "@classmate/ui";
import { Activity, AlertTriangle, BarChart3, BookOpen, CalendarDays, Cloud, FileText, GitCompare, GraduationCap, History, Image, Library, Network, NotebookPen, Search, Settings, Share2, Video } from "lucide-react";
import type { WorkspacePanel } from "../types";

const NAV_ITEMS: readonly { id: WorkspacePanel; label: string; icon: typeof GraduationCap }[] = [
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "ocr", label: "OCR", icon: Image },
  { id: "video", label: "Video", icon: Video },
  { id: "notebook", label: "Notebook", icon: NotebookPen },
  { id: "graph", label: "Graph", icon: Network },
  { id: "search", label: "Search", icon: Search },
  { id: "practice", label: "Practice", icon: BookOpen },
  { id: "exam", label: "Exam", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "revision", label: "Revision", icon: CalendarDays },
  { id: "history", label: "History", icon: History },
  { id: "sync", label: "Sync", icon: Cloud },
  { id: "collaboration", label: "Share", icon: Share2 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "versions", label: "Versions", icon: GitCompare },
  { id: "conflicts", label: "Conflicts", icon: AlertTriangle },
  { id: "library", label: "Library", icon: Library },
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
