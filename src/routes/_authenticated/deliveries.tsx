import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv, pct, shortDate, titleCase, type Delivery } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Deliveries — Verita" },
      {
        name: "description",
        content: "Delivery tracking with promised versus actual dates, lateness and shipping mode.",
      },
      { property: "og:title", content: "Delivery tracking" },
      { property: "og:description", content: "Promised vs actual dates and lateness per shipment." },
    ],
  }),
  component: DeliveriesPage,
});

type Row = Delivery & { vendorName: string; poNumber: string };

function DeliveriesPage() {
  const { data, isLoading, error } = usePlatformData();
  const [status, setStatus] = useState("all");

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.deliveries
      .filter((d) => status === "all" || d.status === status)
      .map((d) => ({
        ...d,
        vendorName: data.vendors.find((v) => v.id === d.vendor_id)?.name ?? "—",
        poNumber: data.orders.find((o) => o.id === d.purchase_order_id)?.po_number ?? "—",
      }));
  }, [data, status]);

  const stats = useMemo(() => {
    const done = rows.filter((d) => d.status === "delivered" || d.status === "delayed");
    const onTime = done.filter(
      (d) => d.status === "delivered" && (d.days_late ?? 0) <= 0,
    ).length;
    return {
      onTimeRate: done.length ? (onTime / done.length) * 100 : 0,
      late: done.length - onTime,
      inTransit: rows.filter((d) => d.status === "shipped" || d.status === "in_transit").length,
    };
  }, [rows]);

  const columns: Column<Row>[] = [
    {
      key: "po",
      header: "Order",
      render: (d) => (
        <>
          <p className="numeric font-medium">{d.poNumber}</p>
          <p className="numeric text-xs text-muted-foreground">{d.tracking_number ?? "no tracking"}</p>
        </>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (d) => (
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: d.vendor_id }}
          className="hover:text-primary hover:underline"
        >
          {d.vendorName}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (d) => <StatusBadge value={d.status} /> },
    {
      key: "mode",
      header: "Mode",
      render: (d) => <span className="text-muted-foreground">{titleCase(d.shipping_mode)}</span>,
    },
    {
      key: "promised",
      header: "Promised",
      render: (d) => <span className="numeric text-muted-foreground">{shortDate(d.promised_date)}</span>,
    },
    {
      key: "delivered",
      header: "Delivered",
      render: (d) => <span className="numeric text-muted-foreground">{shortDate(d.delivered_date)}</span>,
    },
    {
      key: "late",
      header: "Days late",
      align: "right",
      render: (d) => (
        <span className={`numeric ${(d.days_late ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
          {d.days_late ?? 0}
        </span>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      align: "right",
      render: (d) => <span className="numeric">{d.quantity_delivered}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Deliveries" description="Shipment status and punctuality against promised dates.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "deliveries.csv",
              rows.map((d) => ({
                po_number: d.poNumber,
                vendor: d.vendorName,
                status: d.status,
                shipping_mode: d.shipping_mode,
                promised_date: d.promised_date,
                delivered_date: d.delivered_date,
                days_late: d.days_late,
                quantity: d.quantity_delivered,
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
          <KpiCard
            label="On-time rate"
            value={pct(stats.onTimeRate)}
            tone={stats.onTimeRate >= 85 ? "good" : stats.onTimeRate >= 70 ? "warn" : "bad"}
          />
          <KpiCard label="Late deliveries" value={stats.late} tone={stats.late ? "bad" : "good"} />
          <KpiCard label="In transit" value={stats.inTransit} />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(d) => `${d.poNumber} ${d.vendorName} ${d.tracking_number ?? ""}`}
          filter={{
            label: "Statuses",
            value: status,
            options: ["all", "pending", "shipped", "in_transit", "delivered", "delayed", "cancelled"],
            onChange: setStatus,
          }}
          emptyMessage="No deliveries match these filters."
        />
      </DataShell>
    </>
  );
}
