import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download } from "lucide-react";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { downloadCsv, pct, shortDate, type Inspection } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/quality")({
  head: () => ({
    meta: [
      { title: "Quality Inspections — Verita" },
      {
        name: "description",
        content: "Inspection results, defect counts and pass rates linked to vendor deliveries.",
      },
      { property: "og:title", content: "Quality inspections" },
      { property: "og:description", content: "Defect counts and pass rates by supplier." },
    ],
  }),
  component: QualityPage,
});

type Row = Inspection & { vendorName: string };

function QualityPage() {
  const { data, isLoading, error } = usePlatformData();

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.inspections.map((q) => ({
      ...q,
      vendorName: data.vendors.find((v) => v.id === q.vendor_id)?.name ?? "—",
    }));
  }, [data]);

  const stats = useMemo(() => {
    const passed = rows.filter((r) => r.passed).length;
    return {
      passRate: rows.length ? (passed / rows.length) * 100 : 0,
      defects: rows.reduce((s, r) => s + (r.defect_count ?? 0), 0),
      avgScore: rows.length ? rows.reduce((s, r) => s + (r.quality_score ?? 0), 0) / rows.length : 0,
    };
  }, [rows]);

  const columns: Column<Row>[] = [
    {
      key: "vendor",
      header: "Vendor",
      render: (q) => (
        <Link
          to="/vendors/$vendorId"
          params={{ vendorId: q.vendor_id }}
          className="font-medium hover:text-primary hover:underline"
        >
          {q.vendorName}
        </Link>
      ),
    },
    {
      key: "date",
      header: "Inspected",
      render: (q) => <span className="numeric text-muted-foreground">{shortDate(q.inspected_at)}</span>,
    },
    {
      key: "inspector",
      header: "Inspector",
      render: (q) => <span className="text-muted-foreground">{q.inspector_name ?? "—"}</span>,
    },
    {
      key: "result",
      header: "Result",
      render: (q) => (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
            q.passed
              ? "border-success/30 bg-success/12 text-success"
              : "border-destructive/30 bg-destructive/12 text-destructive"
          }`}
        >
          {q.passed ? "Passed" : "Failed"}
        </span>
      ),
    },
    {
      key: "defects",
      header: "Defects",
      align: "right",
      render: (q) => <span className="numeric">{q.defect_count}</span>,
    },
    {
      key: "score",
      header: "Score",
      align: "right",
      render: (q) => <span className="numeric">{q.quality_score}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Quality inspections" description="Inspection outcomes feeding the quality component of each score.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "quality-inspections.csv",
              rows.map((q) => ({
                vendor: q.vendorName,
                inspected_at: q.inspected_at,
                inspector: q.inspector_name,
                passed: q.passed,
                defect_count: q.defect_count,
                quality_score: q.quality_score,
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
            label="Pass rate"
            value={pct(stats.passRate)}
            tone={stats.passRate >= 90 ? "good" : stats.passRate >= 75 ? "warn" : "bad"}
          />
          <KpiCard label="Total defects" value={stats.defects} />
          <KpiCard label="Avg quality score" value={stats.avgScore.toFixed(1)} />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(q) => `${q.vendorName} ${q.inspector_name ?? ""}`}
          emptyMessage="No inspections recorded."
        />
      </DataShell>
    </>
  );
}
