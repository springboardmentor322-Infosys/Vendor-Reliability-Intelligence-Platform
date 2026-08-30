import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { ROLE_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: typeof Gauge; hideForVendor?: boolean };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reliability", label: "Reliability Scores", icon: Gauge },
      { to: "/performance", label: "Performance", icon: Activity },
    ],
  },
  {
    section: "Procurement",
    items: [
      { to: "/vendors", label: "Vendors", icon: Users },
      { to: "/orders", label: "Purchase Orders", icon: ClipboardList },
      { to: "/deliveries", label: "Deliveries", icon: Truck },
      { to: "/products", label: "Products", icon: Boxes, hideForVendor: true },
    ],
  },
  {
    section: "Compliance & Finance",
    items: [
      { to: "/contracts", label: "Contracts", icon: FileText },
      { to: "/invoices", label: "Invoices", icon: Receipt },
      { to: "/quality", label: "Quality", icon: ShieldCheck },
    ],
  },
  {
    section: "Collaboration",
    items: [
      { to: "/messages", label: "Messages", icon: MessageSquare },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/reports", label: "Reports", icon: BarChart3, hideForVendor: true },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role, isVendor, isAdmin, user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    router.navigate({ to: "/auth" });
  };

  const initials = (profile?.full_name ?? user?.email ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 place-items-center rounded-md">
            <Gauge className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold">Verita</p>
            <p className="text-[11px] text-sidebar-foreground/60">Vendor Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {NAV.map((group) => {
            const items = group.items.filter((i) => !(isVendor && i.hideForVendor));
            if (!items.length) return null;
            return (
              <div key={group.section}>
                <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">
                  {group.section}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      activeProps={{
                        className:
                          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                      }}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {isAdmin && (
            <div>
              <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/45 uppercase">
                Administration
              </p>
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                activeProps={{
                  className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                }}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              >
                <ShieldCheck className="size-4" />
                Users & Roles
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-2.5 px-1.5 py-1.5">
            <div className="bg-sidebar-accent text-sidebar-accent-foreground numeric grid size-8 place-items-center rounded-full text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-medium">{profile?.full_name ?? user?.email}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">
                {role ? ROLE_LABELS[role] : "—"}
              </p>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
          <Link
            to="/notifications"
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="size-5" />
            {(unread.data ?? 0) > 0 && (
              <span className="numeric absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread.data}
              </span>
            )}
          </Link>
        </header>
        <main className="min-w-0 flex-1 space-y-6 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
