import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = '#1a237e',
  delta,
  hint







}: {label: string;value: string | number;icon: LucideIcon;accent?: string;delta?: number;hint?: string;}) {
  return (
    <div data-ev-id="ev_3e9d6a596d"
    className="rounded-lg border border-border bg-card p-4 shadow-sm"
    style={{ borderLeft: `5px solid ${accent}` }}>

			<div data-ev-id="ev_c5f0cb317a" className="flex items-start justify-between">
				<div data-ev-id="ev_4a382b38ff" className="min-w-0">
					<p data-ev-id="ev_50676d5c28" className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{label}
					</p>
					<p data-ev-id="ev_73cdf81591" className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
					{hint && <p data-ev-id="ev_93bf5288c4" className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
				</div>
				<div data-ev-id="ev_bdce39fe95"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}18`, color: accent }}>

					<Icon className="h-5 w-5" />
				</div>
			</div>
			{delta !== undefined &&
      <div data-ev-id="ev_c5fcba71fa" className="mt-3 flex items-center gap-1 text-xs font-medium">
					{delta >= 0 ?
        <TrendingUp className="h-3.5 w-3.5 text-success" /> :

        <TrendingDown className="h-3.5 w-3.5 text-danger" />
        }
					<span data-ev-id="ev_cd36585393" className={delta >= 0 ? 'text-success' : 'text-danger'}>
						{delta >= 0 ? '+' : ''}
						{delta}%
					</span>
					<span data-ev-id="ev_355305849a" className="text-muted-foreground">vs last month</span>
				</div>
      }
		</div>);

}