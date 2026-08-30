import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gauge, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABELS, type AppRole } from "@/lib/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Verita Vendor Intelligence" },
      {
        name: "description",
        content:
          "Sign in to Verita to monitor vendor reliability, procurement risk, deliveries and contract compliance.",
      },
      { property: "og:title", content: "Sign in — Verita Vendor Intelligence" },
      {
        property: "og:description",
        content: "Access your procurement risk workspace.",
      },
    ],
  }),
  component: AuthPage,
});

const SIGNUP_ROLES: AppRole[] = [
  "procurement_manager",
  "supply_chain_manager",
  "finance_officer",
  "auditor",
  "administrator",
];

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<AppRole>("procurement_manager");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/dashboard" });
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, job_title: jobTitle, role },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirmation(true);
          toast.success("Account created — confirm your email to sign in.");
          return;
        }
        router.navigate({ to: "/dashboard" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-sidebar text-sidebar-foreground hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 place-items-center rounded-md">
            <Gauge className="size-5" />
          </div>
          <span className="font-display font-semibold">Verita</span>
        </Link>
        <div className="max-w-md space-y-4">
          <h2 className="font-display text-3xl leading-tight font-semibold">
            Know which suppliers you can count on.
          </h2>
          <p className="text-sm text-sidebar-foreground/70">
            Composite reliability scoring across on-time delivery, quality, fulfilment,
            responsiveness and invoice accuracy — with the procurement workflow attached.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Role-based access for procurement, supply chain, finance, audit and vendor users.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Access the vendor reliability workspace.
            </p>
          </div>

          {awaitingConfirmation && (
            <div className="rounded-md border border-info/30 bg-info/10 p-3 text-sm text-foreground">
              Check <span className="font-medium">{email}</span> for a confirmation link, then sign in.
            </div>
          )}

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Sign up
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Category Manager"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIGNUP_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
