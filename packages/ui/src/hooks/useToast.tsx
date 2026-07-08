import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "default" | "success" | "warning" | "danger" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string | undefined;
  variant?: ToastVariant | undefined;
  durationMs?: number | undefined;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (item: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastCounter = 0;

function nextToastId(): string {
  toastCounter += 1;
  return `toast-${String(toastCounter)}`;
}

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string): void => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, "id">): string => {
      const id = nextToastId();
      const durationMs = item.durationMs ?? 5000;
      setToasts((current) => [...current, { ...item, id }]);
      if (durationMs > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, durationMs);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, toast, dismiss }), [dismiss, toast, toasts]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
