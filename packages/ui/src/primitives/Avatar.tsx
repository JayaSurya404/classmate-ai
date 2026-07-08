import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../utilities/cn";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-semibold text-muted-foreground",
  {
    variants: {
      size: {
        sm: "size-7 text-xs",
        md: "size-9 text-sm",
        lg: "size-12 text-base",
        xl: "size-16 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface AvatarProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  src?: string | undefined;
  alt?: string | undefined;
  fallback?: string | undefined;
}

export function Avatar({ className, size, src, alt, fallback, ...props }: AvatarProps) {
  const initials = fallback?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        <img src={src} alt={alt ?? fallback ?? "Avatar"} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
