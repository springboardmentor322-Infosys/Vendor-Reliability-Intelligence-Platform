import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { RiskBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { downloadCsv, pct } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/reliability")({
  head: () => ({
    meta: [
      { title: "Reliability Scores — Verita" },
      {
        name: "description",
        content:
          "Composite vendor reliability scoring across on-time delivery, quality, fulfilment, responsiveness and invoice accuracy.",
      },
      { property: "og:title", content: "Vendor reliability scores" },
      { property: "og:description", content: "Weighted supplier scorecards, recalculated live." },
    ],
  }),
  component: ReliabilityPage,
});

const WEIGHTS = [
  ["On-time delivery", "40%"],
  ["Quality score", "25%"],
  ["Order fulfilment", "15%"],
  ["Responsiveness", "10%"],
  ["Invoice accuracy", "10%"],
];

function ReliabilityPage() {
  const { data, isLoading, error } = usePlatformData();

  const rows = useMemo(() => {
    if (!data) return [];
    return data.vendors
      .map((v) => ({ v, m: data.metrics.get(v.id)! }))
      .sort((a, b) => b.m.reliabilityScore - a.m.reliabilityScore);
  }, [data]);

  const counts = useMemo(
    () => ({
      low: rows.filter((r) => r.m.risk === "low").length,
      medium: rows.filter((r) => r.m.risk === "medium").length,
      high: rows.filter((r) => r.m.risk === "high").length,
    }),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Reliability scores"
        description="Weighted composite recalculated from live orders, deliveries, inspections, invoices and messages."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "reliability-scores.csv",
              rows.map(({ v, m }) => ({
                vendor: v.name,
                score: m.reliabilityScore,
                risk: m.risk,
                on_time_rate: m.onTimeRate.toFixed(1),
                quality_score: m.qualityScore.toFixed(1),
                fulfillment_rate: m.fulfillmentRate.toFixed(1),
                avg_response_hours: m.avgResponseHours.toFixed(1),
                invoice_accuracy: m.invoiceAccuracy.toFixed(1),
              })),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export scores
        </Button>
      </PageHeader>

      <DataShell isLoading={isLoading} error={error}>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Low risk (80+)" value={counts.low} tone="good" />
          <KpiCard label="Watchlist (60–79)" value={counts.medium} tone="warn" />
          <KpiCard label="High risk (<60)" value={counts.high} tone="bad" />
        </div>

        <Panel title="Scoring model">
          <div className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-5">
            {WEIGHTS.map(([label, weight]) => (
              <div key={label}>
                <p className="numeric text-lg font-semibold text-primary">{weight}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Vendor scorecards">
          <div className="divide-y divide-border">
            {rows.map(({ v, m }) => (
              <div key={v.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to="/vendors/$vendorId"
                    params={{ vendorId: v.id }}
                    className="text-sm font-medium hover:text-primary hover:underline"
                  >
                    {v.name}
                  </Link>
                  <RiskBadge risk={m.risk} score={m.reliabilityScore} />
                </div>
                <Progress value={m.reliabilityScore} className="mt-2 h-1.5" />
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
                  <span>On-time {pct(m.onTimeRate)}</span>
                  <span>Quality {m.qualityScore.toFixed(1)}</span>
                  <span>Fulfilment {pct(m.fulfillmentRate)}</span>
                  <span>Response {m.avgResponseHours.toFixed(1)}h</span>
                  <span>Invoices {pct(m.invoiceAccuracy)}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 && <EmptyState message="No vendors visible yet." />}
          </div>
        </Panel>
      </DataShell>
    </>
  );
}
