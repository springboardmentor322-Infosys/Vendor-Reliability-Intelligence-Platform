import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  searchable = true,
  searchKeys = [],
  empty = 'No records found.'






}: {columns: Column<T>[];rows: T[];searchable?: boolean;searchKeys?: string[];empty?: string;}) {
  const [q, setQ] = useState('');
  const filtered =
  q && searchKeys.length ?
  rows.filter((r) =>
  searchKeys.some((k) => String((r as Record<string, unknown>)[k] ?? '').toLowerCase().includes(q.toLowerCase()))
  ) :
  rows;

  return (
    <div data-ev-id="ev_5db9a3234b" className="flex flex-col gap-3">
			{searchable &&
      <div data-ev-id="ev_322ddee7af" className="flex items-center gap-2 self-start rounded-lg border border-border bg-canvas px-3 py-2">
					<Search className="h-4 w-4 text-muted-foreground" />
					<input data-ev-id="ev_d5409e189b"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search..."
        className="w-52 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />

				</div>
      }
			<div data-ev-id="ev_1d4ff5cc2d" className="overflow-x-auto rounded-lg border border-border">
				<table data-ev-id="ev_95700a10c4" className="w-full border-collapse text-sm">
					<thead data-ev-id="ev_08380890b1">
						<tr data-ev-id="ev_d5f8f2d824" className="bg-canvas text-left">
							{columns.map((c) =>
              <th data-ev-id="ev_19efa22e3f" key={c.key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{c.header}
								</th>
              )}
						</tr>
					</thead>
					<tbody data-ev-id="ev_33028dccd6">
						{filtered.length === 0 ?
            <tr data-ev-id="ev_5d84ad28ca">
								<td data-ev-id="ev_b023620fb3" colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
									{empty}
								</td>
							</tr> :

            filtered.map((row, i) =>
            <tr data-ev-id="ev_3425d50cfa" key={i} className="border-t border-border hover:bg-canvas/60">
									{columns.map((c) =>
              <td data-ev-id="ev_4c8e08ddd1" key={c.key} className={`px-4 py-3 text-gray-700 ${c.className ?? ''}`}>
											{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
										</td>
              )}
								</tr>
            )
            }
					</tbody>
				</table>
			</div>
		</div>);

}