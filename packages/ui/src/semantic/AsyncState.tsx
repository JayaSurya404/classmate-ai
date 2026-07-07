import type { ReactNode } from "react";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <Card role="status" aria-live="polite" className="animate-pulse p-4 text-sm text-muted-foreground">{label}…</Card>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <Card className="p-5 text-center"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</Card>;
}
export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <Card role="alert" className="border-danger/50 p-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p>{onRetry && <Button className="mt-3" variant="secondary" onClick={onRetry}>Try again</Button>}</Card>;
}
