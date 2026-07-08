import { cva, type VariantProps } from "class-variance-authority";
import type { InputHTMLAttributes } from "react";
import { cn } from "../utilities/cn";

const inputVariants = cva(
  "flex min-h-10 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8 text-xs",
        lg: "h-11",
      },
      state: {
        default: "",
        error: "border-danger focus-visible:border-danger focus-visible:ring-danger/30",
      },
    },
    defaultVariants: { size: "default", state: "default" },
  },
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  error?: boolean | undefined;
}

export function Input({ className, size, error, ...props }: InputProps) {
  return (
    <input
      className={cn(inputVariants({ size, state: error ? "error" : "default" }), className)}
      {...props}
    />
  );
}

export interface InputFieldProps extends InputProps {
  label: string;
  hint?: string | undefined;
  errorMessage?: string | undefined;
  id?: string | undefined;
}

export function InputField({
  label,
  hint,
  errorMessage,
  id,
  error,
  ...props
}: InputFieldProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const hasError = error ?? Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-label font-medium text-foreground">
        {label}
      </label>
      <Input id={fieldId} error={hasError} aria-invalid={hasError || undefined} aria-describedby={hint || errorMessage ? `${fieldId}-desc` : undefined} {...props} />
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
