import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button } from "./Button";
import { reducedMotionTransition, scaleIn, transitions } from "../utilities/motion";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children?: ReactNode | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  onConfirm?: (() => void) | undefined;
  variant?: "default" | "danger" | undefined;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <motion.button
            type="button"
            aria-label="Close dialog overlay"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotionTransition(transitions.fast, prefersReducedMotion)}
            onClick={() => {
              onOpenChange(false);
            }}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby={description ? "dialog-description" : undefined}
            className="glass-panel relative z-10 w-full max-w-md rounded-xl p-5 shadow-lg"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={reducedMotionTransition(transitions.normal, prefersReducedMotion)}
          >
            <h2 id="dialog-title" className="text-title font-semibold">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {children && <div className="mt-4">{children}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { onOpenChange(false); }}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant === "danger" ? "danger" : "primary"}
                onClick={() => {
                  onConfirm?.();
                  onOpenChange(false);
                }}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
