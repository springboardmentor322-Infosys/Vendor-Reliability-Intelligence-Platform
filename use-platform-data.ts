import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeVendorMetrics, type VendorMetrics } from "@/lib/domain";

async function fetchAll() {
  const [vendors, orders, deliveries, contracts, invoices, inspections, communications] =
    await Promise.all([
      supabase.from("vendors").select("*").order("name"),
      supabase.from("purchase_orders").select("*").order("order_date", { ascending: false }),
      supabase.from("deliveries").select("*").order("created_at", { ascending: false }),
      supabase.from("contracts").select("*").order("end_date"),
      supabase.from("invoices").select("*").order("issued_date", { ascending: false }),
      supabase
        .from("quality_inspections")
        .select("*")
        .order("inspected_at", { ascending: false }),
      supabase.from("communications").select("*").order("created_at", { ascending: false }),
    ]);

  const err = [vendors, orders, deliveries, contracts, invoices, inspections, communications].find(
    (r) => r.error,
  );
  if (err?.error) throw err.error;

  return {
    vendors: vendors.data ?? [],
    orders: orders.data ?? [],
    deliveries: deliveries.data ?? [],
    contracts: contracts.data ?? [],
    invoices: invoices.data ?? [],
    inspections: inspections.data ?? [],
    communications: communications.data ?? [],
  };
}

export type PlatformData = Awaited<ReturnType<typeof fetchAll>> & {
  metrics: Map<string, VendorMetrics>;
};

export function usePlatformData() {
  return useQuery<PlatformData>({
    queryKey: ["platform-data"],
    staleTime: 30_000,
    queryFn: async () => {
      const data = await fetchAll();
      const metrics = new Map<string, VendorMetrics>();
      for (const v of data.vendors) {
        metrics.set(v.id, computeVendorMetrics(v.id, data));
      }
      return { ...data, metrics };
    },
  });
}
