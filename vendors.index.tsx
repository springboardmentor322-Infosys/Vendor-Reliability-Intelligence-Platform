import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { PageHeader } from "@/components/kpi-card";
import { RiskBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, downloadCsv, money, pct } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/vendors/")({
  head: () => ({
    meta: [
      { title: "Vendors — Verita" },
      {
        name: "description",
        content: "Vendor directory with reliability scores, spend, categories and status.",
      },
      { property: "og:title", content: "Vendor directory" },
      { property: "og:description", content: "Reliability, spend and status per supplier." },
    ],
  }),
  component: VendorsPage,
});

function VendorsPage() {
  const { data, isLoading, error } = usePlatformData();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [risk, setRisk] = useState("all");

  const rows = useMemo(() => {
    if (!data) return [];
    return data.vendors
      .map((v) => ({ vendor: v, m: data.metrics.get(v.id)! }))
      .filter(({ vendor, m }) => {
        if (q && !`${vendor.name} ${vendor.code} ${vendor.country ?? ""}`.toLowerCase().includes(q.toLowerCase()))
          return false;
        if (category !== "all" && vendor.category !== category) return false;
        if (status !== "all" && vendor.status !== status) return false;
        if (risk !== "all" && m.risk !== risk) return false;
        return true;
      })
      .sort((a, b) => b.m.reliabilityScore - a.m.reliabilityScore);
  }, [data, q, category, status, risk]);

  return (
    <>
      <PageHeader title="Vendors" description={`${rows.length} suppliers matching your filters`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "vendors.csv",
              rows.map(({ vendor, m }) => ({
                code: vendor.code,
                name: vendor.name,
                category: vendor.category,
                country: vendor.country,
                status: vendor.status,
                reliability_score: m.reliabilityScore,
                risk: m.risk,
                orders: m.orders,
                spend: Math.round(m.spend),
                on_time_rate: m.onTimeRate.toFixed(1),
              })),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </PageHeader>

      <DataShell isLoading={isLoading} error={error}>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or country"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {["all", "active", "pending", "inactive", "suspended"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="low">Low risk</SelectItem>
              <SelectItem value="medium">Watch</SelectItem>
              <SelectItem value="high">High risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Vendor</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-4 py-2.5 text-right font-medium">On-time</th>
                  <th className="px-4 py-2.5 font-medium">Reliability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ vendor, m }) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/vendors/$vendorId"
                        params={{ vendorId: vendor.id }}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {vendor.name}
                      </Link>
                      <p className="numeric text-xs text-muted-foreground">
                        {vendor.code} · {vendor.country ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {CATEGORY_LABELS[vendor.category]}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge value={vendor.status} />
                    </td>
                    <td className="numeric px-4 py-2.5 text-right">{m.orders}</td>
                    <td className="numeric px-4 py-2.5 text-right">{money(m.spend)}</td>
                    <td className="numeric px-4 py-2.5 text-right">{pct(m.onTimeRate)}</td>
                    <td className="px-4 py-2.5">
                      <RiskBadge risk={m.risk} score={m.reliabilityScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <EmptyState message="No vendors match these filters." />}
          </div>
        </Panel>
      </DataShell>
    </>
  );
}
