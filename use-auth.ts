import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MANAGER_ROLES, type AppRole } from "@/lib/domain";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useCurrentUser() {
  const { session, user, loading } = useSession();

  const profile = useQuery({
    queryKey: ["me", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return {
        profile: prof ?? null,
        roles: (roles ?? []).map((r) => r.role as AppRole),
      };
    },
  });

  const roles = profile.data?.roles ?? [];
  const role = roles[0] ?? null;

  return {
    session,
    user,
    loading: loading || profile.isLoading,
    profile: profile.data?.profile ?? null,
    roles,
    role,
    isVendor: roles.includes("vendor"),
    isAdmin: roles.includes("administrator"),
    isStaff: roles.length > 0 && !roles.includes("vendor"),
    canManage: roles.some((r) => MANAGER_ROLES.includes(r)),
    isFinance: roles.includes("finance_officer") || roles.includes("administrator"),
    vendorId: profile.data?.profile?.vendor_id ?? null,
  };
}
