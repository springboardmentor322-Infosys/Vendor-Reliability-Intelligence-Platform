import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { riskFromScore, riskColor } from '@/lib/format';

export default function GaugeChart({ score, label = 'Reliability' }: {score: number;label?: string;}) {
  const risk = riskFromScore(score);
  const color = riskColor(risk);
  const data = [
  { name: 'score', value: score },
  { name: 'rest', value: 100 - score }];

  return (
    <div data-ev-id="ev_16f1222cb5" className="relative h-44 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="85%"
            innerRadius={70}
            outerRadius={100}
            stroke="none">

						<Cell fill={color} />
						<Cell fill="#eceff1" />
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<div data-ev-id="ev_3c84fd898a" className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
				<span data-ev-id="ev_7f78998398" className="text-3xl font-bold" style={{ color }}>
					{score}
				</span>
				<span data-ev-id="ev_a1c89dacf3" className="text-xs font-medium text-muted-foreground">
					{label} · {risk}
				</span>
			</div>
		</div>);

}