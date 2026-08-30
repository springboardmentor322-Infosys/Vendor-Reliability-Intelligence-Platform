import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv, money, shortDate, type Contract } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/contracts")({
  head: () => ({
    meta: [
      { title: "Contracts & Compliance — Verita" },
      {
        name: "description",
        content: "Contract register with expiry monitoring, compliance scores, certifications and renewals.",
      },
      { property: "og:title", content: "Contracts & compliance" },
      { property: "og:description", content: "Expiry windows, compliance scores and renewals." },
    ],
  }),
  component: ContractsPage,
});

type Row = Contract & { vendorName: string; daysLeft: number };

function ContractsPage() {
  const { data, isLoading, error } = usePlatformData();
  const [status, setStatus] = useState("all");

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return data.contracts
      .filter((c) => status === "all" || c.status === status)
      .map((c) => ({
        ...c,
        vendorName: data.vendors.find((v) => v.id === c.vendor_id)?.name ?? "—",
        daysLeft: Math.round((new Date(c.end_date).getTime() - now) / 86_400_000),
      }));
  }, [data, status]);

  const stats = useMemo(
    () => ({
      value: rows.reduce((s, c) => s + Number(c.value ?? 0), 0),
      expiring: rows.filter((c) => c.daysLeft > 0 && c.daysLeft <= 90).length,
      lowCompliance: rows.filter((c) => (c.compliance_score ?? 100) < 80).length,
    }),
    [rows],
  );

  const columns: Column<Row>[] = [
    {
      key: "contract",
      header: "Contract",
      render: (c) => (
        <>
          <p className="font-medium">{c.title}</p>
          <p className="numeric text-xs text-muted-foreground">{c.contract_number}</p>
        </>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (c) => (
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: c.vendor_id }}
          className="hover:text-primary hover:underline"
        >
          {c.vendorName}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (c) => <StatusBadge value={c.status} /> },
    {
      key: "term",
      header: "Term",
      render: (c) => (
        <span className="numeric text-xs text-muted-foreground">
          {shortDate(c.start_date)} → {shortDate(c.end_date)}
        </span>
      ),
    },
    {
      key: "daysLeft",
      header: "Days left",
      align: "right",
      render: (c) => (
        <span
          className={`numeric ${
            c.daysLeft <= 0 ? "text-destructive" : c.daysLeft <= 90 ? "text-warning" : ""
          }`}
        >
          {c.daysLeft}
        </span>
      ),
    },
    {
      key: "compliance",
      header: "Compliance",
      align: "right",
      render: (c) => (
        <span
          className={`numeric ${(c.compliance_score ?? 100) < 80 ? "text-warning" : "text-success"}`}
        >
          {c.compliance_score ?? "—"}
        </span>
      ),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      render: (c) => <span className="numeric">{money(Number(c.value))}</span>,
    },
    {
      key: "renew",
      header: "Auto-renew",
      render: (c) => (
        <span className="text-xs text-muted-foreground">{c.auto_renew ? "Yes" : "No"}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Contracts & compliance" description="Expiry exposure and compliance across agreements.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "contracts.csv",
              rows.map((c) => ({
                contract_number: c.contract_number,
                title: c.title,
                vendor: c.vendorName,
                status: c.status,
                start_date: c.start_date,
                end_date: c.end_date,
                days_left: c.daysLeft,
                compliance_score: c.compliance_score,
                value: c.value,
                auto_renew: c.auto_renew,
              })),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </PageHeader>

      <DataShell isLoading={isLoading} error={error}>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Contracted value" value={money(stats.value)} hint={`${rows.length} contracts`} />
          <KpiCard
            label="Expiring ≤90 days"
            value={stats.expiring}
            tone={stats.expiring ? "warn" : "good"}
          />
          <KpiCard
            label="Compliance below 80"
            value={stats.lowCompliance}
            tone={stats.lowCompliance ? "bad" : "good"}
          />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(c) => `${c.contract_number} ${c.title} ${c.vendorName}`}
          filter={{
            label: "Statuses",
            value: status,
            options: ["all", "draft", "active", "expiring", "expired", "terminated"],
            onChange: setStatus,
          }}
          emptyMessage="No contracts match these filters."
        />
      </DataShell>
    </>
  );
}
