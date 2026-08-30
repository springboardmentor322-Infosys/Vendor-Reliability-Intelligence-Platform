import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ClipboardList, Gauge, Truck, Wallet } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataShell, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { RiskBadge, StatusBadge } from "@/components/status-badge";
import { CATEGORY_LABELS, money, pct, shortDate, titleCase } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Verita Vendor Intelligence" },
      {
        name: "description",
        content:
          "Live procurement risk overview: vendor reliability, spend, on-time delivery and contract exposure.",
      },
      { property: "og:title", content: "Procurement Risk Dashboard" },
      { property: "og:description", content: "Vendor reliability and spend at a glance." },
    ],
  }),
  component: Dashboard,
});

const RISK_COLORS = ["var(--risk-low)", "var(--risk-medium)", "var(--risk-high)"];

function Dashboard() {
  const { data, isLoading, error } = usePlatformData();
  const { profile, role, isVendor } = useCurrentUser();

  const view = useMemo(() => {
    if (!data) return null;
    const metrics = [...data.metrics.values()];
    const spend = data.orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const completed = data.deliveries.filter(
      (d) => d.status === "delivered" || d.status === "delayed",
    );
    const onTime = completed.filter(
      (d) => d.status === "delivered" && (d.days_late ?? 0) <= 0,
    ).length;
    const openOrders = data.orders.filter(
      (o) => o.status === "pending" || o.status === "approved" || o.status === "ordered",
    ).length;
    const avgScore = metrics.length
      ? metrics.reduce((s, m) => s + m.reliabilityScore, 0) / metrics.length
      : 0;

    const now = Date.now();
    const expiring = data.contracts.filter((c) => {
      const end = new Date(c.end_date).getTime();
      return end > now && end - now < 1000 * 60 * 60 * 24 * 90;
    });

    const byMonth = new Map<string, { month: string; spend: number; orders: number }>();
    for (const o of data.orders) {
      const key = (o.order_date ?? "").slice(0, 7);
      if (!key) continue;
      const row = byMonth.get(key) ?? { month: key, spend: 0, orders: 0 };
      row.spend += Number(o.total_amount ?? 0);
      row.orders += 1;
      byMonth.set(key, row);
    }
    const trend = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

    const riskSplit = (["low", "medium", "high"] as const).map((level) => ({
      name: level === "low" ? "Low risk" : level === "medium" ? "Watch" : "High risk",
      value: metrics.filter((m) => m.risk === level).length,
    }));

    const categorySpend = new Map<string, number>();
    for (const v of data.vendors) {
      const m = data.metrics.get(v.id);
      categorySpend.set(v.category, (categorySpend.get(v.category) ?? 0) + (m?.spend ?? 0));
    }

    const ranked = [...metrics].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    const vendorName = (id: string) => data.vendors.find((v) => v.id === id)?.name ?? "—";

    return {
      spend,
      onTimeRate: completed.length ? (onTime / completed.length) * 100 : 0,
      openOrders,
      avgScore,
      expiring,
      trend,
      riskSplit,
      categoryData: [...categorySpend.entries()].map(([k, v]) => ({
        category: CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS] ?? titleCase(k),
        spend: v,
      })),
      top: ranked.slice(0, 5).map((m) => ({ ...m, name: vendorName(m.vendorId) })),
      bottom: ranked
        .slice(-5)
        .reverse()
        .map((m) => ({ ...m, name: vendorName(m.vendorId) })),
      recentOrders: data.orders.slice(0, 6).map((o) => ({ ...o, vendor: vendorName(o.vendor_id) })),
    };
  }, [data]);

  return (
    <>
      <PageHeader
        title={isVendor ? "Vendor workspace" : "Procurement risk dashboard"}
        description={
          profile?.full_name
            ? `${profile.full_name}${role ? " · " + role.replace(/_/g, " ") : ""}`
            : "Recalculated live from orders, deliveries, quality and invoices."
        }
      />
      <DataShell isLoading={isLoading} error={error}>
        {view && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total spend"
                value={money(view.spend)}
                hint={`${data!.orders.length} purchase orders`}
                icon={Wallet}
              />
              <KpiCard
                label="On-time delivery"
                value={pct(view.onTimeRate)}
                hint="Completed deliveries"
                icon={Truck}
                tone={view.onTimeRate >= 85 ? "good" : view.onTimeRate >= 70 ? "warn" : "bad"}
              />
              <KpiCard
                label="Avg reliability"
                value={view.avgScore.toFixed(1)}
                hint={`${data!.vendors.length} vendors scored`}
                icon={Gauge}
                tone={view.avgScore >= 80 ? "good" : view.avgScore >= 65 ? "warn" : "bad"}
              />
              <KpiCard
                label="Open orders"
                value={view.openOrders}
                hint={`${view.expiring.length} contracts expiring ≤90d`}
                icon={ClipboardList}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Panel title="Spend & order volume" className="lg:col-span-2">
                <div className="h-72 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={view.trend}>
                      <defs>
                        <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => money(v)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="var(--primary)"
                        fill="url(#spendFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel title="Risk distribution">
                <div className="h-72 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={view.riskSplit}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {view.riskSplit.map((_, i) => (
                          <Cell key={i} fill={RISK_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                    {view.riskSplit.map((r, i) => (
                      <span key={r.name} className="inline-flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ background: RISK_COLORS[i] }}
                        />
                        {r.name} ({r.value})
                      </span>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Spend by category">
                <div className="h-64 p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.categoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(v: number) => money(v)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="spend" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel
                title="Reliability leaders & laggards"
                action={
                  <Link to="/reliability" className="text-xs font-medium text-primary hover:underline">
                    View all
                  </Link>
                }
              >
                <div className="divide-y divide-border">
                  {[...view.top.slice(0, 3), ...view.bottom.slice(0, 3)].map((v) => (
                    <Link
                      key={v.vendorId}
                      to="/vendors/$vendorId"
                      params={{ vendorId: v.vendorId }}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="truncate text-sm font-medium">{v.name}</span>
                      <RiskBadge risk={v.risk} score={v.reliabilityScore} />
                    </Link>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Recent purchase orders">
                <div className="divide-y divide-border">
                  {view.recentOrders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="numeric truncate text-sm font-medium">{o.po_number}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.vendor} · {shortDate(o.order_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="numeric text-sm">{money(Number(o.total_amount))}</span>
                        <StatusBadge value={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Contracts expiring within 90 days">
                <div className="divide-y divide-border">
                  {view.expiring.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No contracts expiring soon.
                    </p>
                  )}
                  {view.expiring.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="numeric truncate text-xs text-muted-foreground">
                          {c.contract_number} · ends {shortDate(c.end_date)}
                        </p>
                      </div>
                      <AlertTriangle className="size-4 shrink-0 text-warning" />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </DataShell>
    </>
  );
}
