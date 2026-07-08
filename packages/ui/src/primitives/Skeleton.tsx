import type { HTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full" | undefined;
}

const roundedClasses = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
} as const;

export function Skeleton({ className, rounded = "md", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-surface-2",
        roundedClasses[rounded],
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number | undefined; className?: string | undefined }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string | undefined }) {
  return (
    <div className={cn("glass-panel space-y-3 rounded-xl p-4", className)} aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  );
}
