import { NavLink } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { navForRole } from '@/lib/nav';
import { ROLES } from '@/data/mock';

export default function Sidebar() {
  const { currentUser } = useApp();
  if (!currentUser) return null;
  const items = navForRole(currentUser.role);
  const roleInfo = ROLES.find((r) => r.role === currentUser.role);
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <aside data-ev-id="ev_96ebab4331" className="hidden md:flex w-64 shrink-0 flex-col bg-primary text-white/90 h-screen sticky top-0">
			<div data-ev-id="ev_d5b02c3b90" className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
				<div data-ev-id="ev_31084e4fc2" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
					<ShieldCheck className="h-5 w-5 text-white" />
				</div>
				<div data-ev-id="ev_139d7fd491" className="leading-tight">
					<p data-ev-id="ev_756776584f" className="text-base font-bold text-white">VendorIQ</p>
					<p data-ev-id="ev_c3775c5e18" className="text-[11px] text-white/60">Reliability Intelligence</p>
				</div>
			</div>

			<nav data-ev-id="ev_b58eb8d744" className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
				{groups.map((group) =>
        <div data-ev-id="ev_a389f61538" key={group} className="flex flex-col gap-1">
						<p data-ev-id="ev_c508b20109" className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
							{group}
						</p>
						{items.
          filter((i) => i.group === group).
          map((item) =>
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive ?
            'bg-white text-primary shadow-sm' :
            'text-white/75 hover:bg-white/10 hover:text-white'}`

            }>

								<item.icon className="h-[18px] w-[18px]" />
								{item.label}
							</NavLink>
          )}
					</div>
        )}
			</nav>

			<div data-ev-id="ev_8f28e476ad" className="border-t border-white/10 px-4 py-3">
				<p data-ev-id="ev_ddd31c5f48" className="text-xs text-white/50">Signed in as</p>
				<p data-ev-id="ev_c7133d9dd4" className="text-sm font-semibold text-white">{roleInfo?.label}</p>
			</div>
		</aside>);

}