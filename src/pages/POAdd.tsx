import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button, { FormField, inputClass } from '@/components/widgets/Button';
import { currency } from '@/lib/format';

export default function POAdd() {
  const { vendors, addPurchaseOrder } = useApp();
  const navigate = useNavigate();
  const approved = vendors.filter((v) => v.status === 'Approved');
  const [vendorId, setVendorId] = useState(String(approved[0]?.id ?? ''));
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  const amount = (Number(qty) || 0) * (Number(unitPrice) || 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = 1000 + Math.floor(Math.random() * 9000);
    addPurchaseOrder({
      poNumber: `PO-2024-${num}`,
      vendorId: Number(vendorId),
      amount,
      status: 'Draft',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: expectedDate || new Date().toISOString().slice(0, 10),
      items: [{ name: itemName, qty: Number(qty), unitPrice: Number(unitPrice) }]
    });
    navigate('/purchase-orders');
  };

  return (
    <div data-ev-id="ev_5e565af341">
			<PageHeader title="New Purchase Order" subtitle="Create a PO for an approved vendor" />
			<Card className="max-w-3xl">
				<form data-ev-id="ev_e65fe0a924" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField label="Vendor">
						<select data-ev-id="ev_37b004985e" className={inputClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
							{approved.map((v) => <option data-ev-id="ev_0647593ac7" key={v.id} value={v.id}>{v.name}</option>)}
						</select>
					</FormField>
					<FormField label="Expected Delivery">
						<input data-ev-id="ev_447ba036f5" type="date" className={inputClass} value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
					</FormField>
					<FormField label="Item / Product">
						<input data-ev-id="ev_94359c6df9" required className={inputClass} value={itemName} onChange={(e) => setItemName(e.target.value)} />
					</FormField>
					<FormField label="Quantity">
						<input data-ev-id="ev_3d6d932ae9" required type="number" min="1" className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
					</FormField>
					<FormField label="Unit Price ($)">
						<input data-ev-id="ev_5ad71d50e8" required type="number" min="0" step="0.01" className={inputClass} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
					</FormField>
					<div data-ev-id="ev_2f6a349357" className="flex items-end">
						<div data-ev-id="ev_5043c7219f" className="rounded-lg bg-primary/5 px-4 py-2">
							<p data-ev-id="ev_9005aca9e4" className="text-xs text-muted-foreground">Order Total</p>
							<p data-ev-id="ev_e9be6701b5" className="text-lg font-bold text-primary">{currency(amount)}</p>
						</div>
					</div>
					<div data-ev-id="ev_f6566e56e6" className="flex gap-2 sm:col-span-2">
						<Button type="submit"><Save className="h-4 w-4" /> Create PO</Button>
						<Button type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
					</div>
				</form>
			</Card>
		</div>);

}
