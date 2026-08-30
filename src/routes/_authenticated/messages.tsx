import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformData } from "@/hooks/use-platform-data";
import { useCurrentUser } from "@/hooks/use-auth";
import { DataShell, EmptyState, Panel } from "@/components/data-shell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shortDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Vendor Messages — Verita" },
      {
        name: "description",
        content: "Vendor communication log with response times feeding the responsiveness score.",
      },
      { property: "og:title", content: "Vendor communications" },
      { property: "og:description", content: "Threads, response times and resolution times." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { data, isLoading, error } = usePlatformData();
  const { profile, user, isVendor, vendorId } = useCurrentUser();
  const queryClient = useQueryClient();
  const [vendor, setVendor] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      const target = isVendor ? vendorId : vendor;
      if (!target) throw new Error("Select a vendor first");
      const { error: err } = await supabase.from("communications").insert({
        vendor_id: target,
        subject,
        body,
        sender_id: user?.id ?? null,
        sender_name: profile?.full_name ?? user?.email ?? "User",
        sender_type: isVendor ? "vendor" : "buyer",
      });
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Message sent");
      setSubject("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["platform-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const messages = useMemo(() => {
    if (!data) return [];
    return data.communications.map((c) => ({
      ...c,
      vendorName: data.vendors.find((v) => v.id === c.vendor_id)?.name ?? "—",
    }));
  }, [data]);

  const stats = useMemo(() => {
    const withResponse = messages.filter((m) => m.response_time_hours != null);
    const withResolution = messages.filter((m) => m.resolution_time_hours != null);
    return {
      threads: new Set(messages.map((m) => m.thread_id)).size,
      avgResponse: withResponse.length
        ? withResponse.reduce((s, m) => s + Number(m.response_time_hours), 0) / withResponse.length
        : 0,
      avgResolution: withResolution.length
        ? withResolution.reduce((s, m) => s + Number(m.resolution_time_hours), 0) /
          withResolution.length
        : 0,
    };
  }, [messages]);

  return (
    <>
      <PageHeader title="Messages" description="Buyer–vendor threads with response and resolution timing." />
      <DataShell isLoading={isLoading} error={error}>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Threads" value={stats.threads} hint={`${messages.length} messages`} />
          <KpiCard label="Avg response" value={`${stats.avgResponse.toFixed(1)}h`} />
          <KpiCard label="Avg resolution" value={`${stats.avgResolution.toFixed(1)}h`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="New message" className="lg:col-span-1">
            <form
              className="space-y-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                send.mutate();
              }}
            >
              {!isVendor && (
                <div className="space-y-1.5">
                  <Label>Vendor</Label>
                  <Select value={vendor} onValueChange={setVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.vendors ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={send.isPending}>
                <Send className="mr-2 size-4" />
                Send message
              </Button>
            </form>
          </Panel>

          <Panel title="Communication log" className="lg:col-span-2">
            <div className="max-h-[32rem] divide-y divide-border overflow-y-auto">
              {messages.map((m) => (
                <article key={m.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.subject}</p>
                    <span className="numeric text-xs text-muted-foreground">
                      {shortDate(m.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.vendorName} · {m.sender_name ?? m.sender_type}
                    {m.response_time_hours != null &&
                      ` · replied in ${Number(m.response_time_hours).toFixed(1)}h`}
                  </p>
                  <p className="mt-2 text-sm text-foreground/85">{m.body}</p>
                </article>
              ))}
              {messages.length === 0 && <EmptyState message="No messages yet." />}
            </div>
          </Panel>
        </div>
      </DataShell>
    </>
  );
}
