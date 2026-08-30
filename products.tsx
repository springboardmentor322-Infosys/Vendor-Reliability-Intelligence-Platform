import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformData } from "@/hooks/use-platform-data";
import { DataShell } from "@/components/data-shell";
import { DataTable, type Column } from "@/components/data-table";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { downloadCsv, money, titleCase } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products & Catalogue — Verita" },
      {
        name: "description",
        content: "Sourced product catalogue with SKUs, departments, unit prices and supplying vendors.",
      },
      { property: "og:title", content: "Product catalogue" },
      { property: "og:description", content: "SKUs, prices and supplying vendors." },
    ],
  }),
  component: ProductsPage,
});

type Row = {
  id: string;
  name: string;
  sku: string;
  category: string;
  department: string | null;
  unit_price: number;
  vendor_id: string | null;
  vendorName: string;
};

function ProductsPage() {
  const platform = usePlatformData();
  const products = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const rows: Row[] = useMemo(() => {
    if (!products.data) return [];
    return products.data.map((p) => ({
      ...p,
      unit_price: Number(p.unit_price),
      vendorName: platform.data?.vendors.find((v) => v.id === p.vendor_id)?.name ?? "Unassigned",
    }));
  }, [products.data, platform.data]);

  const stats = useMemo(
    () => ({
      count: rows.length,
      categories: new Set(rows.map((r) => r.category)).size,
      avgPrice: rows.length ? rows.reduce((s, r) => s + r.unit_price, 0) / rows.length : 0,
    }),
    [rows],
  );

  const columns: Column<Row>[] = [
    {
      key: "product",
      header: "Product",
      render: (p) => (
        <>
          <p className="font-medium">{p.name}</p>
          <p className="numeric text-xs text-muted-foreground">{p.sku}</p>
        </>
      ),
    },
    { key: "category", header: "Category", render: (p) => titleCase(p.category) },
    {
      key: "department",
      header: "Department",
      render: (p) => <span className="text-muted-foreground">{titleCase(p.department)}</span>,
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (p) =>
        p.vendor_id ? (
          <Link
            to="/vendors/$vendorId"
            params={{ vendorId: p.vendor_id }}
            className="hover:text-primary hover:underline"
          >
            {p.vendorName}
          </Link>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "price",
      header: "Unit price",
      align: "right",
      render: (p) => <span className="numeric">{money(p.unit_price)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Products" description="Catalogue of sourced items and their supplying vendors.">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "products.csv",
              rows.map((p) => ({
                sku: p.sku,
                name: p.name,
                category: p.category,
                department: p.department,
                vendor: p.vendorName,
                unit_price: p.unit_price,
              })),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </PageHeader>

      <DataShell isLoading={products.isLoading} error={products.error}>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Catalogue items" value={stats.count} />
          <KpiCard label="Categories" value={stats.categories} />
          <KpiCard label="Avg unit price" value={money(stats.avgPrice)} />
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={(p) => `${p.name} ${p.sku} ${p.category} ${p.vendorName}`}
          emptyMessage="No products in the catalogue."
        />
      </DataShell>
    </>
  );
}
