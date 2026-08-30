import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel } from "@/components/data-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/domain";

export type Column<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  filter,
  title,
  action,
  pageSize = 25,
  emptyMessage = "Nothing to show yet.",
}: {
  rows: T[];
  columns: Column<T>[];
  searchKeys?: (row: T) => string;
  filter?: { label: string; value: string; options: string[]; onChange: (v: string) => void };
  title?: string;
  action?: ReactNode;
  pageSize?: number;
  emptyMessage?: string;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!q || !searchKeys) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => searchKeys(r).toLowerCase().includes(needle));
  }, [rows, q, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="space-y-3">
      {(searchKeys || filter) && (
        <div className="flex flex-wrap gap-2">
          {searchKeys && (
            <div className="relative min-w-56 flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search"
                className="pl-9"
              />
            </div>
          )}
          {filter && (
            <Select value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o === "all" ? `All ${filter.label.toLowerCase()}` : titleCase(o)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Panel title={title} action={action}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground uppercase">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slice.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-muted/40">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2.5 ${c.align === "right" ? "text-right" : ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {slice.length === 0 && <EmptyState message={emptyMessage} />}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {filtered.length} rows · page {current} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </button>
              <button
                className="rounded-md border border-border px-2 py-1 disabled:opacity-40"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
