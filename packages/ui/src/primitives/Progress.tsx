import type { HTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number | undefined;
  label?: string | undefined;
  showValue?: boolean | undefined;
}

export function Progress({
  value,
  max = 100,
  label = "Progress",
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const percent = max > 0 ? Math.round((clamped / max) * 100) : 0;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-standard)]"
          style={{ width: `${String(percent)}%` }}
        />
      </div>
      {showValue && <span className="text-caption text-muted-foreground">{percent}%</span>}
    </div>
  );
}

export interface IndeterminateProgressProps extends HTMLAttributes<HTMLDivElement> {
  label?: string | undefined;
}

export function IndeterminateProgress({ label = "Loading", className, ...props }: IndeterminateProgressProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuetext={label}
      className={cn("h-2 overflow-hidden rounded-full bg-surface-2", className)}
      {...props}
    >
      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
    </div>
  );
}
