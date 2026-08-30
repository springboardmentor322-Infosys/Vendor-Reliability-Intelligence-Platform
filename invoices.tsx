import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformData } from "@/hooks/use-platform-data";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv, money, shortDate, type Invoice } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Verita" },
      {
        name: "description",
        content: "Invoice register with approval, payment status, overdue exposure and disputes.",
      },
      { property: "og:title", content: "Invoices" },
      { property: "og:description", content: "Approval, payment and dispute tracking." },
    ],
  }),
  component: InvoicesPage,
});

type Row = Invoice & { vendorName: string; poNumber: string };

function InvoicesPage() {
  const { data, isLoading, error } = usePlatformData();
  const { isFinance, canManage } = useCurrentUser();
  const [status, setStatus] = useState("all");
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Invoice["status"] }) => {
      const { error: err } = await supabase
        .from("invoices")
        .update(
          next === "paid"
            ? { status: next, paid_date: new Date().toISOString().slice(0, 10) }
            : { status: next },
        )
        .eq("id", id);
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["platform-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.invoices
      .filter((i) => status === "all" || i.status === status)
      .map((i) => ({
        ...i,
        vendorName: data.vendors.find((v) => v.id === i.vendor_id)?.name ?? "—",
        poNumber: data.orders.find((o) => o.id === i.purchase_order_id)?.po_number ?? "—",
      }));
  }, [data, status]);

  const stats = useMemo(
    () => ({
      total: rows.reduce((s, i) => s + Number(i.amount ?? 0), 0),
      outstanding: rows
        .filter((i) => i.status !== "paid")
        .reduce((s, i) => s + Number(i.amount ?? 0), 0),
      overdue: rows.filter((i) => i.status === "overdue").length,
      disputed: rows.filter((i) => i.status === "disputed").length,
    }),
    [rows],
  );

  const canEdit = isFinance || canManage;

  const columns: Column<Row>[] = [
    {
      key: "invoice",
      header: "Invoice",
      render: (i) => (
        <>
          <p className="numeric font-medium">{i.invoice_number}</p>
          <p className="numeric text-xs text-muted-foreground">{i.poNumber}</p>
        </>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (i) => (
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: i.vendor_id }}
          className="hover:text-primary hover:underline"
        >
          {i.vendorName}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (i) => <StatusBadge value={i.status} /> },
    {
      key: "issued",
      header: "Issued",
      render: (i) => <span className="numeric text-muted-foreground">{shortDate(i.issued_date)}</span>,
    },
    {
      key: "due",
      header: "Due",
      render: (i) => <span className="numeric text-muted-foreground">{shortDate(i.due_date)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (i) => <span className="numeric">{money(Number(i.amount))}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (i) => {
        if (!canEdit) return null;
        const next: Invoice["status"] | null =
          i.status === "submitted" ? "approved" : i.status !== "paid" ? "paid" : null;
        if (!next) return null;
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: i.id, next })}
          >
            {next === "approved" ? "Approve" : "Mark paid"}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Invoices" description="Approval, payment and dispute exposure by vendor.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "invoices.csv",
              rows.map((i) => ({
                invoice_number: i.invoice_number,
                po_number: i.poNumber,
                vendor: i.vendorName,
                status: i.status,
                issued_date: i.issued_date,
                due_date: i.due_date,
                paid_date: i.paid_date,
                amount: i.amount,
              })),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </PageHeader>

      <DataShell isLoading={isLoading} error={error}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Invoiced" value={money(stats.total)} hint={`${rows.length} invoices`} />
          <KpiCard label="Outstanding" value={money(stats.outstanding)} tone="warn" />
          <KpiCard label="Overdue" value={stats.overdue} tone={stats.overdue ? "bad" : "good"} />
          <KpiCard label="Disputed" value={stats.disputed} tone={stats.disputed ? "bad" : "good"} />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(i) => `${i.invoice_number} ${i.vendorName} ${i.poNumber}`}
          filter={{
            label: "Statuses",
            value: status,
            options: ["all", "draft", "submitted", "approved", "paid", "overdue", "disputed"],
            onChange: setStatus,
          }}
          emptyMessage="No invoices match these filters."
        />
      </DataShell>
    </>
  );
}
