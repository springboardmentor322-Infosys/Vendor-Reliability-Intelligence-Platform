import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DataShell({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error?: unknown;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="panel p-6">
        <p className="text-sm font-medium text-destructive">Couldn't load this data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Please try again."}
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function Spinner() {
  return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted-foreground">{message}</div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={`panel ${className ?? ""}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
