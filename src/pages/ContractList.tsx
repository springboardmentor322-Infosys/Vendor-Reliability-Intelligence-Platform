import { useNavigate } from 'react-router';
import { FilePlus2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import DonutChart from '@/components/widgets/DonutChart';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import Button from '@/components/widgets/Button';
import { StatusBadge } from '@/components/widgets/Badge';
import { currency, formatDate, statusColor } from '@/lib/format';
import type { Contract } from '@/data/types';

export default function ContractList() {
  const { contracts, vendors, currentUser } = useApp();
  const navigate = useNavigate();
  const canAdd = currentUser?.role === 'admin';

  const rows =
  currentUser?.role === 'vendor' ?
  contracts.filter((c) => c.vendorId === currentUser.vendorId) :
  contracts;

  const breakdown = (['Active', 'Expiring', 'Expired', 'Draft'] as const).map((s) => ({
    name: s,
    value: rows.filter((c) => c.status === s).length,
    color: statusColor(s)
  }));

  const columns: Column<Contract>[] = [
  { key: 'title', header: 'Contract', render: (r) => <span data-ev-id="ev_7fb13e505a" className="font-semibold text-gray-800">{r.title}</span> },
  { key: 'vendor', header: 'Vendor', render: (r) => vendors.find((v) => v.id === r.vendorId)?.name ?? '—' },
  { key: 'value', header: 'Value', render: (r) => currency(r.value) },
  { key: 'startDate', header: 'Start', render: (r) => formatDate(r.startDate) },
  { key: 'endDate', header: 'End', render: (r) => formatDate(r.endDate) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }];


  return (
    <div data-ev-id="ev_e499bdb66f">
			<PageHeader
        title="Contracts"
        subtitle="Vendor contracts with start / end tracking"
        action={canAdd && <Button onClick={() => navigate('/contracts/add')}><FilePlus2 className="h-4 w-4" /> New Contract</Button>} />

			<div data-ev-id="ev_78388fff05" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card title="Contract Status Breakdown">
					<DonutChart data={breakdown} centerValue={String(rows.length)} centerLabel="Contracts" />
				</Card>
				<div data-ev-id="ev_f1f0b1217c" className="lg:col-span-2">
					<Card title="All Contracts">
						<DataTable columns={columns} rows={rows} searchKeys={['title']} />
					</Card>
				</div>
			</div>
		</div>);

}