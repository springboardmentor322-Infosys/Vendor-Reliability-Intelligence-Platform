import { useNavigate } from 'react-router';
import { PlusCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import Button from '@/components/widgets/Button';
import { StatusBadge, RiskBadge, ScorePill } from '@/components/widgets/Badge';
import { currency } from '@/lib/format';
import type { Vendor } from '@/data/types';

export default function VendorList() {
  const { vendors, currentUser, setVendorStatus } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const canAdd = currentUser?.role === 'admin' || currentUser?.role === 'procurement';

  const rows =
  currentUser?.role === 'vendor' ?
  vendors.filter((v) => v.id === currentUser.vendorId) :
  vendors;

  const columns: Column<Vendor>[] = [
  { key: 'name', header: 'Vendor', render: (r) =>
    <div data-ev-id="ev_a4ba54eee7">
				<p data-ev-id="ev_c22b85f0a7" className="font-semibold text-gray-800">{r.name}</p>
				<p data-ev-id="ev_b85b2ac723" className="text-xs text-muted-foreground">{r.contact} · {r.country}</p>
			</div>
  },
  { key: 'category', header: 'Category' },
  { key: 'reliabilityScore', header: 'Reliability', render: (r) => <ScorePill score={r.reliabilityScore} /> },
  { key: 'riskLevel', header: 'Risk', render: (r) => <RiskBadge risk={r.riskLevel} /> },
  { key: 'totalSpend', header: 'Total Spend', render: (r) => <span data-ev-id="ev_1364d31580" className="font-medium">{currency(r.totalSpend)}</span> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'actions', header: '', render: (r) =>
    isAdmin && r.status !== 'Approved' ?
    <div data-ev-id="ev_fe0d4e4fe3" className="flex gap-1">
					<button data-ev-id="ev_858afef46a" onClick={() => setVendorStatus(r.id, 'Approved')} className="rounded-md p-1.5 text-success hover:bg-success/10" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
					<button data-ev-id="ev_dc8425f08c" onClick={() => setVendorStatus(r.id, 'Rejected')} className="rounded-md p-1.5 text-danger hover:bg-danger/10" title="Reject"><XCircle className="h-4 w-4" /></button>
				</div> :
    null }];


  return (
    <div data-ev-id="ev_4197690d7c">
			<PageHeader
        title="Vendors"
        subtitle={`${rows.length} suppliers in your network`}
        action={canAdd && <Button onClick={() => navigate('/vendors/add')}><PlusCircle className="h-4 w-4" /> Add Vendor</Button>} />

			<Card>
				<DataTable columns={columns} rows={rows} searchKeys={['name', 'category', 'country', 'contact']} />
			</Card>
		</div>);

}