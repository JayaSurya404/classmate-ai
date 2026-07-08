import type { HTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  label?: string | undefined;
  orientation?: "horizontal" | "vertical" | undefined;
}

export function Divider({ className, label, orientation = "horizontal", ...props }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <hr
        role="separator"
        aria-orientation="vertical"
        className={cn("mx-2 h-auto w-px self-stretch border-0 bg-border", className)}
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)} role="separator">
        <hr className="flex-1 border-0 border-t border-border" aria-hidden="true" />
        <span className="text-caption text-muted-foreground">{label}</span>
        <hr className="flex-1 border-0 border-t border-border" aria-hidden="true" />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn("border-0 border-t border-border", className)}
      {...props}
    />
  );
}
