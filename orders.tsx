import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformData } from "@/hooks/use-platform-data";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv, money, shortDate, type PurchaseOrder } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — Verita" },
      {
        name: "description",
        content: "Track purchase orders end to end: approval, fulfilment, value and priority.",
      },
      { property: "og:title", content: "Purchase orders" },
      { property: "og:description", content: "Procurement workflow from request to completion." },
    ],
  }),
  component: OrdersPage,
});

type Row = PurchaseOrder & { vendorName: string };

function OrdersPage() {
  const { data, isLoading, error } = usePlatformData();
  const { canManage, user } = useCurrentUser();
  const [status, setStatus] = useState("all");
  const queryClient = useQueryClient();

  const advance = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: PurchaseOrder["status"] }) => {
      const { error: err } = await supabase
        .from("purchase_orders")
        .update(
          next === "approved"
            ? { status: next, approved_by: user?.id ?? null, approved_at: new Date().toISOString() }
            : { status: next },
        )
        .eq("id", id);
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["platform-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.orders
      .filter((o) => status === "all" || o.status === status)
      .map((o) => ({
        ...o,
        vendorName: data.vendors.find((v) => v.id === o.vendor_id)?.name ?? "—",
      }));
  }, [data, status]);

  const totals = useMemo(() => {
    const value = rows.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    return {
      value,
      pending: rows.filter((o) => o.status === "pending").length,
      open: rows.filter((o) => ["pending", "approved", "ordered"].includes(o.status)).length,
    };
  }, [rows]);

  const nextStatus = (s: PurchaseOrder["status"]): PurchaseOrder["status"] | null =>
    s === "pending" ? "approved" : s === "approved" ? "ordered" : s === "delivered" ? "completed" : null;

  const columns: Column<Row>[] = [
    {
      key: "po",
      header: "PO",
      render: (o) => (
        <>
          <p className="numeric font-medium">{o.po_number}</p>
          <p className="text-xs text-muted-foreground">{shortDate(o.order_date)}</p>
        </>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (o) => (
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: o.vendor_id }}
          className="hover:text-primary hover:underline"
        >
          {o.vendorName}
        </Link>
      ),
    },
    { key: "priority", header: "Priority", render: (o) => <StatusBadge value={o.priority} /> },
    { key: "status", header: "Status", render: (o) => <StatusBadge value={o.status} /> },
    {
      key: "expected",
      header: "Expected",
      render: (o) => <span className="numeric text-muted-foreground">{shortDate(o.expected_delivery)}</span>,
    },
    {
      key: "amount",
      header: "Value",
      align: "right",
      render: (o) => <span className="numeric">{money(Number(o.total_amount), o.currency)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (o) => {
        const next = nextStatus(o.status);
        if (!canManage || !next) return null;
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={advance.isPending}
            onClick={() => advance.mutate({ id: o.id, next })}
          >
            <Check className="mr-1.5 size-3.5" />
            {next === "approved" ? "Approve" : next === "ordered" ? "Place" : "Complete"}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Purchase orders" description="Approve, place and close procurement orders.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "purchase-orders.csv",
              rows.map((o) => ({
                po_number: o.po_number,
                vendor: o.vendorName,
                status: o.status,
                priority: o.priority,
                order_date: o.order_date,
                expected_delivery: o.expected_delivery,
                amount: o.total_amount,
                currency: o.currency,
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
          <KpiCard label="Order value" value={money(totals.value)} hint={`${rows.length} orders`} />
          <KpiCard label="Awaiting approval" value={totals.pending} tone={totals.pending ? "warn" : "good"} />
          <KpiCard label="Open orders" value={totals.open} />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(o) => `${o.po_number} ${o.vendorName} ${o.requester_name ?? ""}`}
          filter={{
            label: "Statuses",
            value: status,
            options: ["all", "pending", "approved", "ordered", "delivered", "completed", "cancelled"],
            onChange: setStatus,
          }}
          emptyMessage="No purchase orders match these filters."
        />
      </DataShell>
    </>
  );
}
