import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { RiskBadge, StatusBadge } from "@/components/status-badge";
import { CATEGORY_LABELS, money, pct, shortDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/vendors/$vendorId")({
  head: () => ({
    meta: [
      { title: "Vendor profile — Verita" },
      {
        name: "description",
        content: "Vendor scorecard: reliability breakdown, orders, deliveries, quality and contracts.",
      },
      { property: "og:title", content: "Vendor scorecard" },
      { property: "og:description", content: "Full reliability breakdown for a supplier." },
    ],
  }),
  component: VendorDetail,
});

function VendorDetail() {
  const { vendorId } = Route.useParams();
  const { data, isLoading, error } = usePlatformData();

  const v = useMemo(() => {
    if (!data) return null;
    const vendor = data.vendors.find((x) => x.id === vendorId);
    if (!vendor) return null;
    const m = data.metrics.get(vendorId)!;
    const orders = data.orders.filter((o) => o.vendor_id === vendorId);
    const deliveries = data.deliveries.filter((d) => d.vendor_id === vendorId);
    const contracts = data.contracts.filter((c) => c.vendor_id === vendorId);
    const invoices = data.invoices.filter((i) => i.vendor_id === vendorId);
    const inspections = data.inspections.filter((q) => q.vendor_id === vendorId);

    const byMonth = new Map<string, { month: string; onTime: number; late: number }>();
    for (const d of deliveries) {
      const key = (d.promised_date ?? "").slice(0, 7);
      if (!key) continue;
      const row = byMonth.get(key) ?? { month: key, onTime: 0, late: 0 };
      if ((d.days_late ?? 0) > 0) row.late += 1;
      else row.onTime += 1;
      byMonth.set(key, row);
    }

    return {
      vendor,
      m,
      orders,
      deliveries,
      contracts,
      invoices,
      inspections,
      trend: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
      radar: [
        { axis: "On-time", value: Math.round(m.onTimeRate) },
        { axis: "Quality", value: Math.round(m.qualityScore) },
        { axis: "Fulfilment", value: Math.round(m.fulfillmentRate) },
        { axis: "Response", value: Math.round(Math.max(0, 100 - m.avgResponseHours * 2)) },
        { axis: "Invoicing", value: Math.round(m.invoiceAccuracy) },
      ],
    };
  }, [data, vendorId]);

  return (
    <DataShell isLoading={isLoading} error={error}>
      {!v ? (
        <EmptyState message="Vendor not found or not visible with your permissions." />
      ) : (
        <div className="space-y-6">
          <Link
            to="/vendors"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All vendors
          </Link>

          <PageHeader
            title={v.vendor.name}
            description={`${CATEGORY_LABELS[v.vendor.category]} · ${v.vendor.code}`}
          >
            <StatusBadge value={v.vendor.status} />
            <RiskBadge risk={v.m.risk} score={v.m.reliabilityScore} />
          </PageHeader>

          <div className="panel grid gap-3 p-4 text-sm sm:grid-cols-3">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" /> {v.vendor.contact_email ?? "—"}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" /> {v.vendor.contact_phone ?? "—"}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" /> {v.vendor.city ?? "—"}, {v.vendor.country ?? "—"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Reliability score" value={v.m.reliabilityScore.toFixed(1)} hint="Composite 0–100" />
            <KpiCard label="On-time rate" value={pct(v.m.onTimeRate)} hint={`Avg ${v.m.avgDaysLate.toFixed(1)}d late`} />
            <KpiCard label="Defect rate" value={pct(v.m.defectRate)} hint={`${v.inspections.length} inspections`} />
            <KpiCard label="Spend" value={money(v.m.spend)} hint={`${v.m.orders} orders`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Score breakdown">
              <div className="h-72 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={v.radar}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                    <Radar
                      dataKey="value"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Delivery punctuality by month">
              <div className="h-72 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={v.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="onTime" stackId="a" fill="var(--risk-low)" name="On time" />
                    <Bar dataKey="late" stackId="a" fill="var(--risk-high)" name="Late" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Recent purchase orders">
              <div className="divide-y divide-border">
                {v.orders.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="numeric truncate font-medium">{o.po_number}</p>
                      <p className="text-xs text-muted-foreground">{shortDate(o.order_date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="numeric">{money(Number(o.total_amount))}</span>
                      <StatusBadge value={o.status} />
                    </div>
                  </div>
                ))}
                {v.orders.length === 0 && <EmptyState message="No orders yet." />}
              </div>
            </Panel>

            <Panel title="Contracts & compliance">
              <div className="divide-y divide-border">
                {v.contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="numeric text-xs text-muted-foreground">
                        {shortDate(c.start_date)} → {shortDate(c.end_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="numeric text-xs text-muted-foreground">
                        {c.compliance_score ?? "—"}
                      </span>
                      <StatusBadge value={c.status} />
                    </div>
                  </div>
                ))}
                {v.contracts.length === 0 && <EmptyState message="No contracts on file." />}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </DataShell>
  );
}
