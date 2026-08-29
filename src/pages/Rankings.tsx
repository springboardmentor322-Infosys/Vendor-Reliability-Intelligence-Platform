import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import DataTable, { type Column } from '@/components/widgets/DataTable';
import BarChartCard from '@/components/widgets/BarChartCard';
import { RiskBadge, ScorePill } from '@/components/widgets/Badge';
import { riskColor } from '@/lib/format';
import type { Vendor } from '@/data/types';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Rankings() {
  const { vendors } = useApp();
  const ranked = [...vendors].sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  const top = ranked.slice(0, 8);

  const chartData = top.map((v) => ({ name: v.name.split(' ')[0], score: v.reliabilityScore }));
  const colors = top.map((v) => riskColor(v.riskLevel));

  const podium = ranked.slice(0, 3);
  const podiumIcons = [Trophy, Medal, Award];
  const podiumColors = ['#ffb300', '#90a4ae', '#a1887f'];

  const columns: Column<Vendor>[] = [
  { key: 'rank', header: '#', render: (r) => <span data-ev-id="ev_1027e8914a" className="font-bold text-gray-500">{ranked.indexOf(r) + 1}</span> },
  { key: 'name', header: 'Vendor', render: (r) => <span data-ev-id="ev_6458cca69c" className="font-semibold text-gray-800">{r.name}</span> },
  { key: 'category', header: 'Category' },
  { key: 'reliabilityScore', header: 'Reliability', render: (r) => <ScorePill score={r.reliabilityScore} /> },
  { key: 'riskLevel', header: 'Risk', render: (r) => <RiskBadge risk={r.riskLevel} /> }];


  return (
    <div data-ev-id="ev_caa40ff2f7">
			<PageHeader title="Vendor Rankings" subtitle="Suppliers ranked by calculated reliability score" />

			<div data-ev-id="ev_28a4907281" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{podium.map((v, i) => {
          const Icon = podiumIcons[i];
          return (
            <div data-ev-id="ev_b9ee992ee8" key={v.id} className="rounded-lg border border-border bg-card p-5 shadow-sm" style={{ borderTop: `4px solid ${podiumColors[i]}` }}>
							<div data-ev-id="ev_94c779405b" className="flex items-center justify-between">
								<Icon className="h-7 w-7" style={{ color: podiumColors[i] }} />
								<span data-ev-id="ev_45b33a2501" className="text-3xl font-bold" style={{ color: riskColor(v.riskLevel) }}>{v.reliabilityScore}</span>
							</div>
							<p data-ev-id="ev_b797200648" className="mt-3 font-semibold text-gray-800">{v.name}</p>
							<p data-ev-id="ev_beaaf90db3" className="text-xs text-muted-foreground">{v.category} · Rank #{i + 1}</p>
						</div>);

        })}
			</div>

			<div data-ev-id="ev_936d5ef2f7" className="mb-6">
				<Card title="Reliability Score by Vendor" subtitle="Top performers, color-coded by risk">
					<BarChartCard data={chartData} series={[{ key: 'score', color: '#1a237e', label: 'Reliability' }]} colorByCell={colors} height={300} />
				</Card>
			</div>

			<Card title="Full Ranking Table">
				<DataTable columns={columns} rows={ranked} searchKeys={['name', 'category']} />
			</Card>
		</div>);

}