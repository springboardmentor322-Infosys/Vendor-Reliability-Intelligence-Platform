import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { PageHeader } from "@/components/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, shortDate, type AppRole } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Verita" },
      {
        name: "description",
        content: "Administer platform users and assign procurement, finance, audit and vendor roles.",
      },
      { property: "og:title", content: "Users & roles" },
      { property: "og:description", content: "Role-based access administration." },
    ],
  }),
  component: AdminPage,
});

const ROLES = Object.keys(ROLE_LABELS) as AppRole[];

function AdminPage() {
  const { isAdmin } = useCurrentUser();
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      return (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole | undefined,
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Users & roles" />
        <Panel>
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <ShieldCheck className="size-5" />
            <p className="text-sm">Administrator access required.</p>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Roles are stored separately from profiles and enforced by database policies."
      />
      <DataShell isLoading={users.isLoading} error={users.error}>
        <Panel title="Platform users">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Job title</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(users.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.job_title ?? "—"}</td>
                    <td className="numeric px-4 py-2.5 text-muted-foreground">
                      {shortDate(u.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={u.role ?? ""}
                        onValueChange={(v) => setRole.mutate({ userId: u.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="Assign role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(users.data ?? []).length === 0 && <EmptyState message="No users yet." />}
          </div>
        </Panel>
      </DataShell>
    </>
  );
}
