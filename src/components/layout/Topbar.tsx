import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, LogOut, Search, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ROLES } from '@/data/mock';
import type { Role } from '@/data/types';

export default function Topbar() {
  const { currentUser, logout, notifications, login } = useApp();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  if (!currentUser) return null;
  const roleInfo = ROLES.find((r) => r.role === currentUser.role);
  const initials = currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('');

  return (
    <header data-ev-id="ev_0cf544b531" className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur md:px-6">
			<div data-ev-id="ev_779003e71e">
				<h1 data-ev-id="ev_cad5743ff4" className="text-base font-bold text-gray-800 md:text-lg">{roleInfo?.dashboard}</h1>
				<p data-ev-id="ev_4221b3bca2" className="hidden text-xs text-muted-foreground sm:block">Welcome back, {currentUser.name}</p>
			</div>

			<div data-ev-id="ev_29ee0d428d" className="ml-auto hidden items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 lg:flex">
				<Search className="h-4 w-4 text-muted-foreground" />
				<input data-ev-id="ev_d9dc5deee1"
        placeholder="Search vendors, POs, contracts..."
        className="w-56 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />

			</div>

			<div data-ev-id="ev_b7a99d08fd" className="relative">
				<button data-ev-id="ev_0d461b8aad"
        onClick={() => setSwitcherOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-canvas">

					View as <ChevronDown className="h-3.5 w-3.5" />
				</button>
				{switcherOpen &&
        <div data-ev-id="ev_b495cf77fd" className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-1 shadow-lg">
						{ROLES.map((r) =>
          <button data-ev-id="ev_5693ae2842"
          key={r.id}
          onClick={() => {
            login(r.role as Role);
            setSwitcherOpen(false);
            navigate('/dashboard');
          }}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-canvas ${
          r.role === currentUser.role ? 'text-primary font-semibold' : 'text-gray-700'}`
          }>

								{r.label}
							</button>
          )}
					</div>
        }
			</div>

			<button data-ev-id="ev_10c816b687"
      onClick={() => navigate('/notifications')}
      className="relative rounded-lg border border-border p-2 text-gray-600 hover:bg-canvas"
      aria-label="Notifications">

				<Bell className="h-5 w-5" />
				{unread > 0 &&
        <span data-ev-id="ev_eff61b48a5" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
						{unread}
					</span>
        }
			</button>

			<div data-ev-id="ev_8b9f0d4b0c" className="flex items-center gap-2">
				<div data-ev-id="ev_fb9998abeb" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
					{initials}
				</div>
				<button data-ev-id="ev_1292585098"
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="rounded-lg p-2 text-gray-500 hover:bg-canvas hover:text-danger"
        aria-label="Log out">

					<LogOut className="h-5 w-5" />
				</button>
			</div>
		</header>);

}