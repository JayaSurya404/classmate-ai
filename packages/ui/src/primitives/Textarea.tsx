import type { TextareaHTMLAttributes } from "react";
import { cn } from "../utilities/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | undefined;
}

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-[5rem] w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
        className,
      )}
      {...props}
    />
  );
}

export interface TextareaFieldProps extends TextareaProps {
  label: string;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  id?: string | undefined;
}

export function TextareaField({
  label,
  hint,
  errorMessage,
  id,
  error,
  ...props
}: TextareaFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const hasError = error ?? Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-label font-medium text-foreground">
        {label}
      </label>
      <Textarea
        id={fieldId}
        error={hasError}
        aria-invalid={hasError || undefined}
        aria-describedby={hint || errorMessage ? `${fieldId}-desc` : undefined}
        {...props}
      />
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
