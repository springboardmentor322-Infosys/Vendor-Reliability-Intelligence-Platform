import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Save } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import GaugeChart from '@/components/widgets/GaugeChart';
import Button, { FormField, inputClass } from '@/components/widgets/Button';
import { computeReliability } from '@/lib/format';

export default function PerformanceAdd() {
  const { vendors, addPerformance } = useApp();
  const navigate = useNavigate();
  const [vendorId, setVendorId] = useState(String(vendors[0]?.id ?? ''));
  const [onTime, setOnTime] = useState('90');
  const [quality, setQuality] = useState('88');
  const [defect, setDefect] = useState('4');
  const [deliveredQty, setDeliveredQty] = useState('500');

  const preview = computeReliability([
  { onTimeDelivery: Number(onTime), qualityRating: Number(quality), defectRate: Number(defect) }]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addPerformance({
      vendorId: Number(vendorId),
      date: new Date().toISOString().slice(0, 10),
      onTimeDelivery: Number(onTime),
      qualityRating: Number(quality),
      defectRate: Number(defect),
      deliveredQty: Number(deliveredQty)
    });
    navigate('/rankings');
  };

  return (
    <div data-ev-id="ev_db084ab942">
			<PageHeader title="Log Vendor Performance" subtitle="Records feed the reliability scoring engine" />
			<div data-ev-id="ev_72983f9b48" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div data-ev-id="ev_9eb14984d7" className="lg:col-span-2">
					<Card>
						<form data-ev-id="ev_9527948672" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField label="Vendor">
								<select data-ev-id="ev_28045438fa" className={inputClass} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
									{vendors.map((v) => <option data-ev-id="ev_f95ec36836" key={v.id} value={v.id}>{v.name}</option>)}
								</select>
							</FormField>
							<FormField label="Delivered Quantity">
								<input data-ev-id="ev_4620e09665" type="number" min="0" className={inputClass} value={deliveredQty} onChange={(e) => setDeliveredQty(e.target.value)} />
							</FormField>
							<FormField label="On-Time Delivery (%)">
								<input data-ev-id="ev_a15dc29b9f" type="number" min="0" max="100" className={inputClass} value={onTime} onChange={(e) => setOnTime(e.target.value)} />
							</FormField>
							<FormField label="Quality Rating (0-100)">
								<input data-ev-id="ev_4b330eff34" type="number" min="0" max="100" className={inputClass} value={quality} onChange={(e) => setQuality(e.target.value)} />
							</FormField>
							<FormField label="Defect Rate (%)">
								<input data-ev-id="ev_809c541ab9" type="number" min="0" max="100" step="0.1" className={inputClass} value={defect} onChange={(e) => setDefect(e.target.value)} />
							</FormField>
							<div data-ev-id="ev_c57d877faf" className="flex gap-2 sm:col-span-2">
								<Button type="submit"><Save className="h-4 w-4" /> Record & Recalculate</Button>
								<Button type="button" variant="outline" onClick={() => navigate('/rankings')}>Cancel</Button>
							</div>
						</form>
					</Card>
				</div>
				<Card title="Score Preview" subtitle="0.4×OnTime + 0.35×Quality + 0.25×(100-Defect)">
					<GaugeChart score={preview} label="Projected" />
				</Card>
			</div>
		</div>);

}