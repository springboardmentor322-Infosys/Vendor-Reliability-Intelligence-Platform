import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import StatCard from '@/components/widgets/StatCard';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import Button from '@/components/widgets/Button';
import { StatusBadge } from '@/components/widgets/Badge';
import { formatDate } from '@/lib/format';
import { ROLES } from '@/data/mock';
import type { User } from '@/data/types';
import { Users, UserCheck, Shield } from 'lucide-react';

export default function UserManagement() {
  const { users, toggleUserActive } = useApp();

  const columns: Column<User>[] = [
  { key: 'name', header: 'User', render: (r) =>
    <div data-ev-id="ev_114a467a3d" className="flex items-center gap-3">
				<div data-ev-id="ev_17bb7f041d" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
					{r.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
				</div>
				<span data-ev-id="ev_e94029c946" className="font-semibold text-gray-800">{r.name}</span>
			</div>
  },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', render: (r) => <span data-ev-id="ev_05bee75d64" className="font-medium">{ROLES.find((x) => x.role === r.role)?.label}</span> },
  { key: 'createdAt', header: 'Joined', render: (r) => formatDate(r.createdAt) },
  { key: 'active', header: 'Status', render: (r) => <StatusBadge status={r.active ? 'Active' : 'Suspended'} /> },
  { key: 'actions', header: '', render: (r) =>
    <Button variant={r.active ? 'outline' : 'success'} onClick={() => toggleUserActive(r.id)} className="px-3 py-1 text-xs">
				{r.active ? 'Suspend' : 'Activate'}
			</Button>
  }];


  return (
    <div data-ev-id="ev_8378c834e9">
			<PageHeader title="User Management" subtitle="Admin-only — manage platform accounts & roles" />
			<div data-ev-id="ev_7e08caa5b1" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				<StatCard label="Total Users" value={users.length} icon={Users} accent="#1a237e" />
				<StatCard label="Active Users" value={users.filter((u) => u.active).length} icon={UserCheck} accent="#4caf50" />
				<StatCard label="Roles Configured" value={ROLES.length} icon={Shield} accent="#2196f3" />
			</div>
			<Card>
				<DataTable columns={columns} rows={users} searchKeys={['name', 'email', 'role']} />
			</Card>
		</div>);

}