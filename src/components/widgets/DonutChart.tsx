import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

export default function DonutChart({ data, centerLabel, centerValue }: {data: DonutDatum[];centerLabel?: string;centerValue?: string;}) {
  return (
    <div data-ev-id="ev_c4f2e65ccd" className="relative h-64 w-full">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="none">
						{data.map((d) =>
            <Cell key={d.name} fill={d.color} />
            )}
					</Pie>
					<Tooltip />
					<Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
				</PieChart>
			</ResponsiveContainer>
			{centerValue &&
      <div data-ev-id="ev_c453ae555a" className="pointer-events-none absolute inset-0 top-[-28px] flex flex-col items-center justify-center">
					<span data-ev-id="ev_fc37e8a75a" className="text-2xl font-bold text-gray-800">{centerValue}</span>
					{centerLabel && <span data-ev-id="ev_76dd3d1334" className="text-xs text-muted-foreground">{centerLabel}</span>}
				</div>
      }
		</div>);

}