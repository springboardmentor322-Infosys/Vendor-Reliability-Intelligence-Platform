import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button, { FormField, inputClass } from '@/components/widgets/Button';
import { CATEGORIES } from '@/data/mock';

export default function ProcurementAdd() {
  const { addProcurement, currentUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', category: CATEGORIES[0], quantity: '', estCost: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addProcurement({
      title: form.title,
      category: form.category,
      quantity: Number(form.quantity),
      estCost: Number(form.estCost),
      requestedBy: currentUser?.name ?? 'Unknown',
      status: 'Pending',
      date: new Date().toISOString().slice(0, 10)
    });
    navigate('/procurement');
  };

  return (
    <div data-ev-id="ev_f68647151d">
			<PageHeader title="New Procurement Request" subtitle="Submit an internal request for approval" />
			<Card className="max-w-3xl">
				<form data-ev-id="ev_24232e1829" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField label="Request Title">
						<input data-ev-id="ev_68ee007568" required className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
					</FormField>
					<FormField label="Category">
						<select data-ev-id="ev_0a46549e97" className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
							{CATEGORIES.map((c) => <option data-ev-id="ev_b02a3187f9" key={c}>{c}</option>)}
						</select>
					</FormField>
					<FormField label="Quantity">
						<input data-ev-id="ev_43afca7bd4" required type="number" min="1" className={inputClass} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
					</FormField>
					<FormField label="Estimated Cost ($)">
						<input data-ev-id="ev_2d8f2e0538" required type="number" min="0" className={inputClass} value={form.estCost} onChange={(e) => set('estCost', e.target.value)} />
					</FormField>
					<div data-ev-id="ev_2f8bf2808d" className="flex gap-2 sm:col-span-2">
						<Button type="submit"><Save className="h-4 w-4" /> Submit Request</Button>
						<Button type="button" variant="outline" onClick={() => navigate('/procurement')}>Cancel</Button>
					</div>
				</form>
			</Card>
		</div>);

}