import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button } from "./Button";
import { cn } from "../utilities/cn";
import { reducedMotionTransition, scaleIn, transitions } from "../utilities/motion";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string | undefined;
  description?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
  showClose?: boolean | undefined;
  size?: "sm" | "md" | "lg" | "full" | undefined;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-[min(100%,48rem)]",
} as const;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  showClose = true,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onOpenChange, open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
          <motion.button
            type="button"
            aria-label="Close modal overlay"
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotionTransition(transitions.fast, prefersReducedMotion)}
            onClick={() => {
              onOpenChange(false);
            }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            aria-describedby={description ? "modal-description" : undefined}
            className={cn(
              "glass-panel relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl shadow-lg sm:rounded-2xl",
              sizeClasses[size],
              className,
            )}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={reducedMotionTransition(transitions.normal, prefersReducedMotion)}
          >
            {(title || showClose) && (
              <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  {title && (
                    <h2 id="modal-title" className="text-title font-semibold">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="modal-description" className="mt-1 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {showClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    ×
                  </Button>
                )}
              </header>
            )}
            <div className="overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
