import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { PageHeader } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Verita" },
      {
        name: "description",
        content: "Risk alerts for late deliveries, expiring contracts, overdue invoices and quality failures.",
      },
      { property: "og:title", content: "Procurement alerts" },
      { property: "og:description", content: "Risk alerts across vendors, contracts and invoices." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      return rows;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id?: string) => {
      const query = supabase.from("notifications").update({ read: true });
      const { error: err } = id ? await query.eq("id", id) : await query.eq("read", false);
      if (err) throw err;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];
  const unread = rows.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader title="Notifications" description={`${unread} unread of ${rows.length} alerts`}>
        <Button
          variant="outline"
          size="sm"
          disabled={!unread || markRead.isPending}
          onClick={() => markRead.mutate(undefined)}
        >
          <CheckCheck className="mr-2 size-4" />
          Mark all read
        </Button>
      </PageHeader>

      <DataShell isLoading={isLoading} error={error}>
        <Panel>
          <div className="divide-y divide-border">
            {rows.map((n) => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-primary/[0.04]"}`}
              >
                <span className="mt-0.5">
                  {n.severity === "critical" || n.severity === "warning" ? (
                    <AlertTriangle
                      className={`size-4 ${n.severity === "critical" ? "text-destructive" : "text-warning"}`}
                    />
                  ) : (
                    <Info className="size-4 text-info" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="numeric text-xs text-muted-foreground">
                      {shortDate(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                </div>
                {!n.read && (
                  <button
                    className="self-start text-xs font-medium text-primary hover:underline"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
            {rows.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Bell className="size-5" />
                <EmptyState message="No notifications right now." />
              </div>
            )}
          </div>
        </Panel>
      </DataShell>
    </>
  );
}
