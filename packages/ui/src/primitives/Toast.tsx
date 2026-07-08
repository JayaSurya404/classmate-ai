import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./Button";
import { useToast, type ToastVariant } from "../hooks/useToast";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../utilities/cn";
import { fadeInUp, reducedMotionTransition, transitions } from "../utilities/motion";

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-surface-2",
  success: "border-success/40 bg-success/10",
  warning: "border-warning/40 bg-warning/10",
  danger: "border-danger/40 bg-danger/10",
  info: "border-info/40 bg-info/10",
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pe-4"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <motion.div
            key={item.id}
            layout
            role="status"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={reducedMotionTransition(transitions.normal, prefersReducedMotion)}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-md backdrop-blur-xl",
              variantClasses[item.variant ?? "default"],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label="Dismiss notification"
              onClick={() => {
                dismiss(item.id);
              }}
            >
              ×
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
