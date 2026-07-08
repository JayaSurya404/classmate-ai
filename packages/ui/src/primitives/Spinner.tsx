import { cn } from "../utilities/cn";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg" | undefined;
  label?: string | undefined;
  className?: string | undefined;
}

const sizeClasses = {
  sm: "size-3.5 border-[1.5px]",
  md: "size-5 border-2",
  lg: "size-7 border-2",
} as const;

export function Spinner({ size = "md", label = "Loading", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-e-transparent",
        sizeClasses[size],
        className,
      )}
    />
  );
}
