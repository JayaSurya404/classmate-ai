import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../utilities/cn";
import { reducedMotionTransition, transitions } from "../utilities/motion";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string | undefined }> | undefined;
  badge?: ReactNode | undefined;
}

export interface SidebarProps {
  items: readonly SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  header?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  collapsed?: boolean | undefined;
  "aria-label"?: string | undefined;
}

export function Sidebar({
  items,
  activeId,
  onSelect,
  header,
  footer,
  className,
  collapsed = false,
  "aria-label": ariaLabel = "Primary navigation",
}: SidebarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "glass-panel flex flex-col border-e border-border",
        collapsed ? "w-16" : "w-56",
        className,
      )}
    >
      {header && <div className="border-b border-border p-3">{header}</div>}
      <ul className="flex flex-1 flex-col gap-1 p-2">
        {items.map((item) => {
          const isActive = item.id === activeId;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  onSelect(item.id);
                }}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={reducedMotionTransition(transitions.fast, prefersReducedMotion)}
                    aria-hidden="true"
                  />
                )}
                {Icon && <Icon className="relative z-10 size-5 shrink-0" aria-hidden="true" />}
                {!collapsed && (
                  <>
                    <span className="relative z-10 flex-1 truncate text-start">{item.label}</span>
                    {item.badge && <span className="relative z-10">{item.badge}</span>}
                  </>
                )}
                {collapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </nav>
  );
}

export interface BottomRailProps {
  items: readonly SidebarItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string | undefined;
}

export function BottomRail({ items, activeId, onSelect, className }: BottomRailProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "glass-panel fixed inset-x-0 bottom-0 z-30 flex border-t border-border md:hidden",
        className,
      )}
    >
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-current={activeId === id ? "page" : undefined}
          onClick={() => {
            onSelect(id);
          }}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activeId === id ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {Icon && <Icon className="size-5" aria-hidden="true" />}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
