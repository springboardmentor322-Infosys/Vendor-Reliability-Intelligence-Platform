import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { Notification } from '@/data/types';
import { formatDate } from '@/lib/format';

const ICONS = {
  info: { Icon: Info, color: '#2196f3' },
  success: { Icon: CheckCircle2, color: '#4caf50' },
  warning: { Icon: AlertTriangle, color: '#ff9800' },
  danger: { Icon: XCircle, color: '#f44336' }
};

export default function AlertsPanel({ items }: {items: Notification[];}) {
  if (items.length === 0)
  return <p data-ev-id="ev_bcbf46c007" className="py-6 text-center text-sm text-muted-foreground">No active alerts.</p>;
  return (
    <div data-ev-id="ev_ca830ee399" className="flex flex-col gap-2">
			{items.map((n) => {
        const { Icon, color } = ICONS[n.type];
        return (
          <div data-ev-id="ev_e17ac73473"
          key={n.id}
          className="flex items-start gap-3 rounded-lg border border-border p-3"
          style={{ backgroundColor: `${color}0c` }}>

						<Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
						<div data-ev-id="ev_fa9923a526" className="min-w-0">
							<p data-ev-id="ev_740b7d9c88" className="text-sm text-gray-700">{n.message}</p>
							<p data-ev-id="ev_566d4c3759" className="mt-0.5 text-xs text-muted-foreground">{formatDate(n.date)}</p>
						</div>
					</div>);

      })}
		</div>);

}