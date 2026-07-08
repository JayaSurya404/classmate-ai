import type { ReactNode } from "react";
import { cn } from "../utilities/cn";

export interface HeaderProps {
  title: string;
  subtitle?: string | undefined;
  logo?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  status?: ReactNode | undefined;
  className?: string | undefined;
  sticky?: boolean | undefined;
}

export function Header({
  title,
  subtitle,
  logo,
  actions,
  status,
  className,
  sticky = true,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "z-20 border-b border-border bg-background/80 backdrop-blur-xl",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-[var(--panel-px)] py-3">
        {logo}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-bold">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {status}
        {actions}
      </div>
    </header>
  );
}

export function HeaderLogo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-primary font-bold text-primary-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HeaderStatus({
  label,
  variant = "success",
}: {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | undefined;
}) {
  const dotClass = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  }[variant];

  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", dotClass)} aria-hidden="true" />
      {label}
    </span>
  );
}
