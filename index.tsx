import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, FileText, Gauge, ShieldCheck, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Verita — Vendor Reliability & Procurement Risk" },
      {
        name: "description",
        content:
          "Score vendor reliability, manage purchase orders, track deliveries and monitor contract compliance in one procurement risk platform.",
      },
      { property: "og:title", content: "Verita — Vendor Reliability & Procurement Risk" },
      {
        property: "og:description",
        content:
          "Composite supplier scoring across delivery, quality, fulfilment, responsiveness and invoicing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Gauge,
    title: "Reliability scoring",
    body: "Weighted composite score per vendor with low / watch / high-risk banding.",
  },
  {
    icon: Users,
    title: "Vendor lifecycle",
    body: "Onboarding, approval workflow, categories, contacts and suspension controls.",
  },
  {
    icon: Truck,
    title: "Delivery tracking",
    body: "Promised vs delivered dates, lateness, shipping mode and status history.",
  },
  {
    icon: ShieldCheck,
    title: "Quality & inspections",
    body: "Defect counts, pass rates and inspection scores tied to each delivery.",
  },
  {
    icon: FileText,
    title: "Contracts & compliance",
    body: "Expiry monitoring, renewals, certifications and compliance scores.",
  },
  {
    icon: Activity,
    title: "Analytics & reports",
    body: "Spend, risk trends and exportable procurement reporting.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Gauge className="size-5" />
          </div>
          <span className="font-display font-semibold">Verita</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <p className="text-xs font-semibold tracking-widest text-accent-foreground uppercase">
          Vendor reliability intelligence
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Procurement decisions backed by supplier evidence, not gut feel.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground">
          Verita consolidates purchase orders, deliveries, quality inspections, contracts and
          invoices into a single reliability score per vendor — so procurement, supply chain and
          finance teams see the same risk picture.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Open the workspace</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">Create an account</Link>
          </Button>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        Verita — vendor reliability intelligence & procurement risk management.
      </footer>
    </div>
  );
}
