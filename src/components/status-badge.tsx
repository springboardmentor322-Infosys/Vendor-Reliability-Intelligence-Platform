import { cn } from "@/lib/utils";
import { titleCase, type RiskLevel } from "@/lib/domain";

const TONES: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  good: "bg-success/12 text-success border-success/30",
  warn: "bg-warning/15 text-warning border-warning/35",
  bad: "bg-destructive/12 text-destructive border-destructive/30",
  info: "bg-info/12 text-info border-info/30",
  accent: "bg-accent/15 text-accent-foreground border-accent/40",
};

const MAP: Record<string, keyof typeof TONES> = {
  // vendors
  active: "good",
  inactive: "neutral",
  pending: "warn",
  suspended: "bad",
  // po
  approved: "info",
  ordered: "info",
  delivered: "good",
  completed: "good",
  cancelled: "neutral",
  // deliveries
  shipped: "info",
  in_transit: "info",
  delayed: "bad",
  // contracts
  draft: "neutral",
  expiring: "warn",
  expired: "bad",
  terminated: "neutral",
  // invoices
  submitted: "info",
  paid: "good",
  overdue: "bad",
  disputed: "bad",
  // priority
  low: "neutral",
  medium: "info",
  high: "warn",
  critical: "bad",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const tone = MAP[value] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {titleCase(value)}
    </span>
  );
}

export function RiskBadge({ risk, score }: { risk: RiskLevel; score?: number }) {
  const tone = risk === "low" ? "good" : risk === "medium" ? "warn" : "bad";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {risk === "low" ? "Low risk" : risk === "medium" ? "Watch" : "High risk"}
      {score != null && <span className="numeric opacity-80">{score.toFixed(1)}</span>}
    </span>
  );
}
