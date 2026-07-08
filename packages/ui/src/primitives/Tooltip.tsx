import { useId, useState, type ReactNode } from "react";
import { cn } from "../utilities/cn";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right" | undefined;
  className?: string | undefined;
}

const sideClasses = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 me-2 -translate-y-1/2",
  right: "left-full top-1/2 ms-2 -translate-y-1/2",
} as const;

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
      onFocus={() => {
        setOpen(true);
      }}
      onBlur={() => {
        setOpen(false);
      }}
    >
      <span aria-describedby={open ? tooltipId : undefined}>{children}</span>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 max-w-xs rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-caption text-foreground shadow-md",
            sideClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
