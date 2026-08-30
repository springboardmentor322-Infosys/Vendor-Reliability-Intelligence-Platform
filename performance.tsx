import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { money, pct } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Performance Analytics — Verita" },
      {
        name: "description",
        content: "Delivery punctuality trends, defect rates and spend-versus-risk analysis across the supply base.",
      },
      { property: "og:title", content: "Supply performance analytics" },
      { property: "og:description", content: "Punctuality, quality and spend-risk positioning." },
    ],
  }),
  component: PerformancePage,
});

const AXIS = { fontSize: 11 };
const TIP = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function PerformancePage() {
  const { data, isLoading, error } = usePlatformData();

  const view = useMemo(() => {
    if (!data) return null;

    const months = new Map<
      string,
      { month: string; onTime: number; total: number; defects: number; inspections: number }
    >();
    for (const d of data.deliveries) {
      const key = (d.promised_date ?? "").slice(0, 7);
      if (!key || (d.status !== "delivered" && d.status !== "delayed")) continue;
      const row =
        months.get(key) ?? { month: key, onTime: 0, total: 0, defects: 0, inspections: 0 };
      row.total += 1;
      if (d.status === "delivered" && (d.days_late ?? 0) <= 0) row.onTime += 1;
      months.set(key, row);
    }
    for (const q of data.inspections) {
      const key = (q.inspected_at ?? "").slice(0, 7);
      if (!key) continue;
      const row =
        months.get(key) ?? { month: key, onTime: 0, total: 0, defects: 0, inspections: 0 };
      row.inspections += 1;
      if (!q.passed) row.defects += 1;
      months.set(key, row);
    }

    const trend = [...months.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map((r) => ({
        month: r.month,
        onTimeRate: r.total ? Number(((r.onTime / r.total) * 100).toFixed(1)) : 0,
        defectRate: r.inspections ? Number(((r.defects / r.inspections) * 100).toFixed(1)) : 0,
      }));

    const scatter = data.vendors.map((v) => {
      const m = data.metrics.get(v.id)!;
      return { name: v.name, spend: Math.round(m.spend), score: m.reliabilityScore, orders: m.orders };
    });

    const metrics = [...data.metrics.values()];
    const avgLate = metrics.length
      ? metrics.reduce((s, m) => s + m.avgDaysLate, 0) / metrics.length
      : 0;
    const avgDefect = metrics.length
      ? metrics.reduce((s, m) => s + m.defectRate, 0) / metrics.length
      : 0;
    const avgResp = metrics.length
      ? metrics.reduce((s, m) => s + m.avgResponseHours, 0) / metrics.length
      : 0;
    const atRiskSpend = metrics
      .filter((m) => m.risk === "high")
      .reduce((s, m) => s + m.spend, 0);

    return { trend, scatter, avgLate, avgDefect, avgResp, atRiskSpend };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Performance analytics"
        description="Punctuality and quality trends, plus where your spend sits against supplier risk."
      />
      <DataShell isLoading={isLoading} error={error}>
        {view && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Avg days late" value={view.avgLate.toFixed(1)} hint="Across all vendors" />
              <KpiCard label="Avg defect rate" value={pct(view.avgDefect)} hint="Failed inspections" />
              <KpiCard label="Avg response time" value={`${view.avgResp.toFixed(1)}h`} hint="Vendor replies" />
              <KpiCard
                label="Spend at high risk"
                value={money(view.atRiskSpend)}
                hint="Vendors scoring under 60"
                tone={view.atRiskSpend > 0 ? "bad" : "good"}
              />
            </div>

            <Panel title="On-time vs defect rate by month">
              <div className="h-80 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={view.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={AXIS} stroke="var(--muted-foreground)" />
                    <YAxis tick={AXIS} stroke="var(--muted-foreground)" unit="%" />
                    <Tooltip contentStyle={TIP} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="onTimeRate"
                      name="On-time %"
                      stroke="var(--risk-low)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="defectRate"
                      name="Defect %"
                      stroke="var(--risk-high)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Spend vs reliability">
              <div className="h-80 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="spend"
                      name="Spend"
                      tick={AXIS}
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <YAxis
                      dataKey="score"
                      name="Reliability"
                      domain={[0, 100]}
                      tick={AXIS}
                      stroke="var(--muted-foreground)"
                    />
                    <ZAxis dataKey="orders" range={[50, 300]} />
                    <Tooltip
                      contentStyle={TIP}
                      formatter={(value: number, name: string) =>
                        name === "Spend" ? money(value) : value
                      }
                    />
                    <Scatter data={view.scatter} fill="var(--chart-1)" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        )}
      </DataShell>
    </>
  );
}
