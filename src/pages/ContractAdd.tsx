import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button, { FormField, inputClass } from '@/components/widgets/Button';
import type { ContractStatus } from '@/data/types';

export default function ContractAdd() {
  const { vendors, addContract } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    vendorId: String(vendors[0]?.id ?? ''),
    title: '', value: '', startDate: '', endDate: '', status: 'Active' as ContractStatus
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addContract({
      vendorId: Number(form.vendorId),
      title: form.title,
      value: Number(form.value),
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status
    });
    navigate('/contracts');
  };

  return (
    <div data-ev-id="ev_01dec4ffc7">
			<PageHeader title="New Contract" subtitle="Create a vendor contract" />
			<Card className="max-w-3xl">
				<form data-ev-id="ev_caceda5531" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField label="Vendor">
						<select data-ev-id="ev_bf13a3fbd1" className={inputClass} value={form.vendorId} onChange={(e) => set('vendorId', e.target.value)}>
							{vendors.map((v) => <option data-ev-id="ev_064ceb4e0d" key={v.id} value={v.id}>{v.name}</option>)}
						</select>
					</FormField>
					<FormField label="Contract Title">
						<input data-ev-id="ev_ee499cdc50" required className={inputClass} value={form.title} onChange={(e) => set('title', e.target.value)} />
					</FormField>
					<FormField label="Value ($)">
						<input data-ev-id="ev_0a69f27547" required type="number" min="0" className={inputClass} value={form.value} onChange={(e) => set('value', e.target.value)} />
					</FormField>
					<FormField label="Status">
						<select data-ev-id="ev_3a965e1ed0" className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
							{['Active', 'Expiring', 'Expired', 'Draft'].map((s) => <option data-ev-id="ev_0f032c4b23" key={s}>{s}</option>)}
						</select>
					</FormField>
					<FormField label="Start Date">
						<input data-ev-id="ev_cad026bf20" required type="date" className={inputClass} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
					</FormField>
					<FormField label="End Date">
						<input data-ev-id="ev_9af8437e02" required type="date" className={inputClass} value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
					</FormField>
					<div data-ev-id="ev_889af343a6" className="flex gap-2 sm:col-span-2">
						<Button type="submit"><Save className="h-4 w-4" /> Save Contract</Button>
						<Button type="button" variant="outline" onClick={() => navigate('/contracts')}>Cancel</Button>
					</div>
				</form>
			</Card>
		</div>);

}