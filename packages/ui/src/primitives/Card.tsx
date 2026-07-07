import type { HTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface-1/90 shadow-sm backdrop-blur-xl", className)} {...props} />;
}
