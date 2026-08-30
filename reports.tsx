import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, downloadCsv, money, pct } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Verita" },
      {
        name: "description",
        content: "Exportable procurement reports: vendor scorecards, spend by category and risk exposure.",
      },
      { property: "og:title", content: "Procurement reports" },
      { property: "og:description", content: "Export scorecards, spend and risk exposure." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading, error } = usePlatformData();

  const view = useMemo(() => {
    if (!data) return null;
    const byCategory = new Map<
      string,
      { category: string; spend: number; vendors: number; scoreSum: number }
    >();
    for (const v of data.vendors) {
      const m = data.metrics.get(v.id)!;
      const label = CATEGORY_LABELS[v.category];
      const row = byCategory.get(label) ?? { category: label, spend: 0, vendors: 0, scoreSum: 0 };
      row.spend += m.spend;
      row.vendors += 1;
      row.scoreSum += m.reliabilityScore;
      byCategory.set(label, row);
    }
    const categories = [...byCategory.values()].map((r) => ({
      ...r,
      avgScore: Number((r.scoreSum / r.vendors).toFixed(1)),
    }));

    const metrics = [...data.metrics.values()];
    return {
      categories,
      spend: metrics.reduce((s, m) => s + m.spend, 0),
      highRisk: metrics.filter((m) => m.risk === "high").length,
      avgScore: metrics.length
        ? metrics.reduce((s, m) => s + m.reliabilityScore, 0) / metrics.length
        : 0,
    };
  }, [data]);

  const exports = [
    {
      label: "Vendor scorecard report",
      hint: "Reliability, spend, punctuality and quality per vendor",
      run: () =>
        downloadCsv(
          "vendor-scorecards.csv",
          (data?.vendors ?? []).map((v) => {
            const m = data!.metrics.get(v.id)!;
            return {
              vendor: v.name,
              code: v.code,
              category: v.category,
              status: v.status,
              reliability_score: m.reliabilityScore,
              risk: m.risk,
              on_time_rate: m.onTimeRate.toFixed(1),
              quality_score: m.qualityScore.toFixed(1),
              defect_rate: m.defectRate.toFixed(1),
              invoice_accuracy: m.invoiceAccuracy.toFixed(1),
              orders: m.orders,
              spend: Math.round(m.spend),
            };
          }),
        ),
    },
    {
      label: "Spend by category",
      hint: "Aggregate spend, vendor count and average score",
      run: () =>
        downloadCsv(
          "spend-by-category.csv",
          (view?.categories ?? []).map((c) => ({
            category: c.category,
            vendors: c.vendors,
            spend: Math.round(c.spend),
            avg_reliability: c.avgScore,
          })),
        ),
    },
    {
      label: "Delivery performance",
      hint: "Every delivery with promised vs actual dates",
      run: () =>
        downloadCsv(
          "delivery-performance.csv",
          (data?.deliveries ?? []).map((d) => ({
            vendor: data!.vendors.find((v) => v.id === d.vendor_id)?.name ?? "",
            status: d.status,
            promised_date: d.promised_date,
            delivered_date: d.delivered_date,
            days_late: d.days_late,
            shipping_mode: d.shipping_mode,
          })),
        ),
    },
    {
      label: "Contract compliance",
      hint: "Contract register with expiry and compliance scores",
      run: () =>
        downloadCsv(
          "contract-compliance.csv",
          (data?.contracts ?? []).map((c) => ({
            contract_number: c.contract_number,
            vendor: data!.vendors.find((v) => v.id === c.vendor_id)?.name ?? "",
            status: c.status,
            start_date: c.start_date,
            end_date: c.end_date,
            compliance_score: c.compliance_score,
            value: c.value,
          })),
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Reports" description="Aggregated procurement reporting with CSV export." />
      <DataShell isLoading={isLoading} error={error}>
        {view && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Total spend" value={money(view.spend)} />
              <KpiCard label="Avg reliability" value={view.avgScore.toFixed(1)} />
              <KpiCard
                label="High-risk vendors"
                value={view.highRisk}
                tone={view.highRisk ? "bad" : "good"}
              />
            </div>

            <Panel title="Category performance">
              <div className="h-72 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={view.categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                    <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar yAxisId="l" dataKey="spend" name="Spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="r" dataKey="avgScore" name="Avg score" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Category</th>
                      <th className="px-4 py-2.5 text-right font-medium">Vendors</th>
                      <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                      <th className="px-4 py-2.5 text-right font-medium">Avg score</th>
                      <th className="px-4 py-2.5 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {view.categories.map((c) => (
                      <tr key={c.category}>
                        <td className="px-4 py-2.5">{c.category}</td>
                        <td className="numeric px-4 py-2.5 text-right">{c.vendors}</td>
                        <td className="numeric px-4 py-2.5 text-right">{money(c.spend)}</td>
                        <td className="numeric px-4 py-2.5 text-right">{c.avgScore}</td>
                        <td className="numeric px-4 py-2.5 text-right">
                          {pct(view.spend ? (c.spend / view.spend) * 100 : 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid gap-4 sm:grid-cols-2">
              {exports.map((e) => (
                <div key={e.label} className="panel flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <FileSpreadsheet className="size-4 text-primary" />
                      {e.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{e.hint}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={e.run}>
                    <Download className="mr-2 size-4" />
                    CSV
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataShell>
    </>
  );
}
