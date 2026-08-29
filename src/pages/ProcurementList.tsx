import { useNavigate } from 'react-router';
import { FilePlus2, CheckCircle2, XCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import Button from '@/components/widgets/Button';
import { StatusBadge } from '@/components/widgets/Badge';
import { currency, formatDate } from '@/lib/format';
import type { ProcurementRequest } from '@/data/types';

export default function ProcurementList() {
  const { procurements, currentUser, setProcurementStatus } = useApp();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'procurement';
  const canAdd = ['admin', 'procurement', 'scm'].includes(currentUser?.role ?? '');

  const columns: Column<ProcurementRequest>[] = [
  { key: 'title', header: 'Request', render: (r) => <span data-ev-id="ev_b53b7e0cc1" className="font-semibold text-gray-800">{r.title}</span> },
  { key: 'category', header: 'Category' },
  { key: 'quantity', header: 'Qty', render: (r) => r.quantity.toLocaleString() },
  { key: 'estCost', header: 'Est. Cost', render: (r) => currency(r.estCost) },
  { key: 'requestedBy', header: 'Requested By' },
  { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'actions', header: '', render: (r) =>
    isAdmin && r.status === 'Pending' ?
    <div data-ev-id="ev_72ecff3f7a" className="flex gap-1">
					<button data-ev-id="ev_e40a6ac79b" onClick={() => setProcurementStatus(r.id, 'Approved')} className="rounded-md p-1.5 text-success hover:bg-success/10" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>
					<button data-ev-id="ev_b660106a03" onClick={() => setProcurementStatus(r.id, 'Rejected')} className="rounded-md p-1.5 text-danger hover:bg-danger/10" title="Reject"><XCircle className="h-4 w-4" /></button>
				</div> :
    null }];


  return (
    <div data-ev-id="ev_e764b04bc5">
			<PageHeader
        title="Procurement Requests"
        subtitle="Internal requests before PO creation"
        action={canAdd && <Button onClick={() => navigate('/procurement/add')}><FilePlus2 className="h-4 w-4" /> New Request</Button>} />

			<Card>
				<DataTable columns={columns} rows={procurements} searchKeys={['title', 'category', 'requestedBy']} />
			</Card>
		</div>);

}