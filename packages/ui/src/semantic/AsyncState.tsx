import type { ReactNode } from "react";
import { Button } from "../primitives/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../primitives/Card";
import { SkeletonCard } from "../primitives/Skeleton";
import { Spinner } from "../primitives/Spinner";

export function LoadingState({
  label = "Loading",
  description,
}: {
  label?: string | undefined;
  description?: string | undefined;
}) {
  return (
    <Card role="status" aria-live="polite" className="p-5">
      <div className="flex items-center gap-3">
        <Spinner label={label} />
        <div>
          <p className="text-sm font-medium">{label}…</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    </Card>
  );
}

export function LoadingSkeleton({ count = 2 }: { count?: number | undefined }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <Card className="p-6 text-center">
      {icon && <div className="mx-auto mb-3 text-muted-foreground">{icon}</div>}
      <CardHeader className="items-center p-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action && <CardFooter className="mt-4 justify-center border-0 p-0">{action}</CardFooter>}
    </Card>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  action,
}: {
  title?: string | undefined;
  description: string;
  onRetry?: (() => void) | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <Card role="alert" className="border-danger/40 p-5">
      <CardHeader className="p-0">
        <CardTitle className="text-danger">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-4">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
        {action}
      </CardContent>
    </Card>
  );
}
