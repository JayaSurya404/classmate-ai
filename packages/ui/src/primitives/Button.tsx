import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../utilities/cn";
import { Spinner } from "./Spinner";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold outline-none transition-[background,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border border-border bg-surface-2 text-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        danger: "bg-danger text-danger-foreground hover:brightness-110",
        outline: "border border-border bg-transparent hover:bg-surface-2",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  leftIcon?: ReactNode | undefined;
  rightIcon?: ReactNode | undefined;
}

export function Button({
  className,
  variant,
  size,
  type = "button",
  loading = false,
  loadingLabel = "Loading",
  disabled,
  children,
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="sm" label={loadingLabel} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}

export { buttonVariants };
