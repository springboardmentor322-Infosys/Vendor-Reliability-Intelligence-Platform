import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button, { FormField, inputClass } from '@/components/widgets/Button';
import { CATEGORIES } from '@/data/mock';

export default function VendorAdd() {
  const { addVendor } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', category: CATEGORIES[0], email: '', phone: '', country: '', contact: ''
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addVendor({
      ...form,
      status: 'Pending',
      onboardedAt: new Date().toISOString().slice(0, 10),
      totalSpend: 0
    });
    navigate('/vendors');
  };

  return (
    <div data-ev-id="ev_3b84dbca93">
			<PageHeader title="Add Vendor" subtitle="Onboard a new supplier — starts as Pending approval" />
			<Card className="max-w-3xl">
				<form data-ev-id="ev_8fa07b67c4" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<FormField label="Company Name">
						<input data-ev-id="ev_0cd8cc74e6" required className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
					</FormField>
					<FormField label="Category">
						<select data-ev-id="ev_7b35681b76" className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
							{CATEGORIES.map((c) => <option data-ev-id="ev_0862126681" key={c}>{c}</option>)}
						</select>
					</FormField>
					<FormField label="Contact Person">
						<input data-ev-id="ev_12ee6a1677" required className={inputClass} value={form.contact} onChange={(e) => set('contact', e.target.value)} />
					</FormField>
					<FormField label="Country">
						<input data-ev-id="ev_8fd0139cdf" required className={inputClass} value={form.country} onChange={(e) => set('country', e.target.value)} />
					</FormField>
					<FormField label="Email">
						<input data-ev-id="ev_232980c0dc" required type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
					</FormField>
					<FormField label="Phone">
						<input data-ev-id="ev_593fe58abe" required className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
					</FormField>
					<div data-ev-id="ev_9cafe383df" className="flex gap-2 sm:col-span-2">
						<Button type="submit"><Save className="h-4 w-4" /> Save Vendor</Button>
						<Button type="button" variant="outline" onClick={() => navigate('/vendors')}>Cancel</Button>
					</div>
				</form>
			</Card>
		</div>);

}