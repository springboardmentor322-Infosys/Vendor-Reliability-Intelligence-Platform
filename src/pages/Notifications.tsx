import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button from '@/components/widgets/Button';
import { AlertTriangle, CheckCircle2, Info, XCircle, CheckCheck } from 'lucide-react';
import { formatDate } from '@/lib/format';

const ICONS = {
  info: { Icon: Info, color: '#2196f3' },
  success: { Icon: CheckCircle2, color: '#4caf50' },
  warning: { Icon: AlertTriangle, color: '#ff9800' },
  danger: { Icon: XCircle, color: '#f44336' }
};

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div data-ev-id="ev_c45cd870e6">
			<PageHeader
        title="Notifications"
        subtitle={`${unread} unread of ${notifications.length}`}
        action={unread > 0 && <Button variant="outline" onClick={markAllNotificationsRead}><CheckCheck className="h-4 w-4" /> Mark all read</Button>} />

			<Card>
				<div data-ev-id="ev_48e63cef61" className="flex flex-col gap-2">
					{notifications.map((n) => {
            const { Icon, color } = ICONS[n.type];
            return (
              <button data-ev-id="ev_410d407ef1"
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-canvas ${n.read ? 'opacity-60' : ''}`}>

								<div data-ev-id="ev_5ed6e493a4" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18`, color }}>
									<Icon className="h-5 w-5" />
								</div>
								<div data-ev-id="ev_d8faa3e764" className="min-w-0 flex-1">
									<p data-ev-id="ev_2e584d30f2" className="text-sm text-gray-800">{n.message}</p>
									<p data-ev-id="ev_7cbc50ce2c" className="mt-0.5 text-xs text-muted-foreground">{formatDate(n.date)}</p>
								</div>
								{!n.read && <span data-ev-id="ev_961e83ef06" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
							</button>);

          })}
				</div>
			</Card>
		</div>);

}