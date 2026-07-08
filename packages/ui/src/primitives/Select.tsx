import type { SelectHTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | undefined;
}

export function Select({ className, error, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex min-h-10 w-full appearance-none rounded-lg border border-border bg-surface-2 px-3 py-2 pe-8 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export interface SelectFieldProps extends SelectProps {
  label: string;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  id?: string | undefined;
}

export function SelectField({
  label,
  hint,
  errorMessage,
  id,
  error,
  children,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const hasError = error ?? Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-label font-medium text-foreground">
        {label}
      </label>
      <Select
        id={fieldId}
        error={hasError}
        aria-invalid={hasError || undefined}
        aria-describedby={hint || errorMessage ? `${fieldId}-desc` : undefined}
        {...props}
      >
        {children}
      </Select>
      {(hint || errorMessage) && (
        <p
          id={`${fieldId}-desc`}
          className={cn("text-caption", errorMessage ? "text-danger" : "text-muted-foreground")}
          role={errorMessage ? "alert" : undefined}
        >
          {errorMessage ?? hint}
        </p>
      )}
    </div>
  );
}
