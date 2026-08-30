import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
export type Delivery = Database["public"]["Tables"]["deliveries"]["Row"];
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type Inspection = Database["public"]["Tables"]["quality_inspections"]["Row"];
export type Communication = Database["public"]["Tables"]["communications"]["Row"];

export const ROLE_LABELS: Record<AppRole, string> = {
  administrator: "Administrator",
  procurement_manager: "Procurement Manager",
  supply_chain_manager: "Supply Chain Manager",
  vendor: "Vendor",
  finance_officer: "Finance Officer",
  auditor: "Auditor",
};

export const CATEGORY_LABELS: Record<Database["public"]["Enums"]["vendor_category"], string> = {
  raw_material: "Raw Material",
  equipment: "Equipment",
  it: "IT",
  service: "Service",
  logistics: "Logistics",
  maintenance: "Maintenance",
};

export const MANAGER_ROLES: AppRole[] = [
  "administrator",
  "procurement_manager",
  "supply_chain_manager",
];

export function titleCase(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function money(value: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function pct(value: number | null | undefined, digits = 1) {
  return `${(value ?? 0).toFixed(digits)}%`;
}

export function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type RiskLevel = "low" | "medium" | "high";

export function riskLevel(score: number): RiskLevel {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

export type VendorMetrics = {
  vendorId: string;
  orders: number;
  spend: number;
  deliveries: number;
  onTimeRate: number;
  avgDaysLate: number;
  defectRate: number;
  qualityScore: number;
  fulfillmentRate: number;
  avgResponseHours: number;
  invoiceAccuracy: number;
  reliabilityScore: number;
  risk: RiskLevel;
};

type MetricsInput = {
  orders: Pick<PurchaseOrder, "vendor_id" | "status" | "total_amount">[];
  deliveries: Pick<Delivery, "vendor_id" | "status" | "days_late">[];
  inspections: Pick<Inspection, "vendor_id" | "passed" | "quality_score" | "defect_count">[];
  invoices: Pick<Invoice, "vendor_id" | "status">[];
  communications: Pick<Communication, "vendor_id" | "response_time_hours">[];
};

/**
 * Composite reliability score (0-100):
 * 40% on-time delivery, 25% quality, 15% order fulfilment,
 * 10% responsiveness, 10% invoice accuracy.
 */
export function computeVendorMetrics(vendorId: string, input: MetricsInput): VendorMetrics {
  const orders = input.orders.filter((o) => o.vendor_id === vendorId);
  const deliveries = input.deliveries.filter((d) => d.vendor_id === vendorId);
  const inspections = input.inspections.filter((q) => q.vendor_id === vendorId);
  const invoices = input.invoices.filter((i) => i.vendor_id === vendorId);
  const comms = input.communications.filter(
    (c) => c.vendor_id === vendorId && c.response_time_hours != null,
  );

  // A shipment counts toward punctuality once it has arrived or is flagged late.
  const completedDeliveries = deliveries.filter(
    (d) => d.status === "delivered" || d.status === "delayed",
  );
  const onTime = completedDeliveries.filter(
    (d) => d.status === "delivered" && (d.days_late ?? 0) <= 0,
  ).length;
  const onTimeRate = completedDeliveries.length
    ? (onTime / completedDeliveries.length) * 100
    : 100;
  const avgDaysLate = completedDeliveries.length
    ? completedDeliveries.reduce((s, d) => s + Math.max(0, d.days_late ?? 0), 0) /
      completedDeliveries.length
    : 0;

  const qualityScore = inspections.length
    ? inspections.reduce((s, q) => s + (q.quality_score ?? 0), 0) / inspections.length
    : 90;
  const defectRate = inspections.length
    ? (inspections.filter((q) => !q.passed).length / inspections.length) * 100
    : 0;

  const closedOrders = orders.filter((o) => o.status !== "pending" && o.status !== "approved");
  const fulfilled = closedOrders.filter(
    (o) => o.status === "delivered" || o.status === "completed",
  ).length;
  const fulfillmentRate = closedOrders.length ? (fulfilled / closedOrders.length) * 100 : 100;

  const avgResponseHours = comms.length
    ? comms.reduce((s, c) => s + (c.response_time_hours ?? 0), 0) / comms.length
    : 0;
  const responsiveness = Math.max(0, 100 - avgResponseHours * 2);

  const settled = invoices.filter((i) => i.status !== "draft" && i.status !== "submitted");
  const clean = settled.filter((i) => i.status !== "disputed" && i.status !== "overdue").length;
  const invoiceAccuracy = settled.length ? (clean / settled.length) * 100 : 100;

  const reliabilityScore =
    onTimeRate * 0.4 +
    qualityScore * 0.25 +
    fulfillmentRate * 0.15 +
    responsiveness * 0.1 +
    invoiceAccuracy * 0.1;

  return {
    vendorId,
    orders: orders.length,
    spend: orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0),
    deliveries: deliveries.length,
    onTimeRate,
    avgDaysLate,
    defectRate,
    qualityScore,
    fulfillmentRate,
    avgResponseHours,
    invoiceAccuracy,
    reliabilityScore: Math.round(reliabilityScore * 10) / 10,
    risk: riskLevel(reliabilityScore),
  };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
