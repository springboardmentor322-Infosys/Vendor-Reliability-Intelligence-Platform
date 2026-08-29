import { useNavigate } from 'react-router';
import { FilePlus2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import StatCard from '@/components/widgets/StatCard';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import Button from '@/components/widgets/Button';
import { StatusBadge } from '@/components/widgets/Badge';
import { currency, formatDate } from '@/lib/format';
import type { PurchaseOrder } from '@/data/types';
import { ShoppingCart, PackageCheck, Clock, DollarSign } from 'lucide-react';

export default function POList() {
  const { purchaseOrders, vendors, currentUser } = useApp();
  const navigate = useNavigate();
  const canAdd = currentUser?.role === 'admin' || currentUser?.role === 'procurement';

  const rows =
  currentUser?.role === 'vendor' ?
  purchaseOrders.filter((p) => p.vendorId === currentUser.vendorId) :
  purchaseOrders;

  const total = rows.reduce((s, p) => s + p.amount, 0);
  const delivered = rows.filter((p) => p.status === 'Delivered').length;
  const open = rows.filter((p) => p.status === 'Ordered').length;

  const columns: Column<PurchaseOrder>[] = [
  { key: 'poNumber', header: 'PO #', render: (r) => <span data-ev-id="ev_c009c529f3" className="font-semibold text-gray-800">{r.poNumber}</span> },
  { key: 'vendor', header: 'Vendor', render: (r) => vendors.find((v) => v.id === r.vendorId)?.name ?? '—' },
  { key: 'items', header: 'Items', render: (r) => `${r.items.length} line(s)` },
  { key: 'amount', header: 'Amount', render: (r) => <span data-ev-id="ev_aa5497cd71" className="font-medium">{currency(r.amount)}</span> },
  { key: 'orderDate', header: 'Ordered', render: (r) => formatDate(r.orderDate) },
  { key: 'expectedDate', header: 'Expected', render: (r) => formatDate(r.expectedDate) },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> }];


  return (
    <div data-ev-id="ev_cf9c4949df">
			<PageHeader
        title="Purchase Orders"
        subtitle="Track orders across all suppliers"
        action={canAdd && <Button onClick={() => navigate('/purchase-orders/add')}><FilePlus2 className="h-4 w-4" /> New PO</Button>} />

			<div data-ev-id="ev_92d3962bc7" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Total POs" value={rows.length} icon={ShoppingCart} accent="#1a237e" />
				<StatCard label="Delivered" value={delivered} icon={PackageCheck} accent="#4caf50" />
				<StatCard label="Open Orders" value={open} icon={Clock} accent="#ff9800" />
				<StatCard label="Total Value" value={currency(total)} icon={DollarSign} accent="#2196f3" />
			</div>
			<Card>
				<DataTable columns={columns} rows={rows} searchKeys={['poNumber', 'status']} />
			</Card>
		</div>);

}