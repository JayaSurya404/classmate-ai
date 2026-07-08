import { motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cn } from "../utilities/cn";
import { reducedMotionTransition, transitions } from "../utilities/motion";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within Tabs");
  return ctx;
}

export interface TabsProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function Tabs({ value, defaultValue = "", onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value ?? internal;

  const setValue = useCallback(
    (next: string): void => {
      if (value === undefined) setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange, value],
  );

  const ctx = useMemo(
    () => ({ value: current, setValue, baseId }),
    [baseId, current, setValue],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  className?: string | undefined;
  "aria-label"?: string | undefined;
}

export function TabsList({ children, className, "aria-label": ariaLabel = "Tabs" }: TabsListProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full gap-1 rounded-lg border border-border bg-surface-2/80 p-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string | undefined;
  disabled?: boolean | undefined;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const { value: selected, setValue, baseId } = useTabsContext();
  const isSelected = selected === value;
  const prefersReducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={cn(
        "relative flex-1 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => {
        setValue(value);
      }}
    >
      {isSelected && (
        <motion.span
          layoutId={`${baseId}-tab-indicator`}
          className="absolute inset-0 rounded-md bg-surface-1 shadow-sm"
          transition={reducedMotionTransition(transitions.fast, prefersReducedMotion)}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string | undefined;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: selected, baseId } = useTabsContext();
  if (selected !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn("mt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      {children}
    </div>
  );
}

export interface SimpleTabsProps {
  items: readonly { value: string; label: string; content: ReactNode }[];
  defaultValue?: string | undefined;
  className?: string | undefined;
}

export function SimpleTabs({ items, defaultValue, className }: SimpleTabsProps) {
  const [value, setValue] = useState(defaultValue ?? items[0]?.value ?? "");

  return (
    <Tabs value={value} onValueChange={setValue} className={className}>
      <TabsList>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value}>
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
