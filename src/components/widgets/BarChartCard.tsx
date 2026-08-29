import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell } from
'recharts';

export interface BarSeries {
  key: string;
  color: string;
  label: string;
}

export default function BarChartCard({
  data,
  series,
  xKey = 'name',
  height = 260,
  layout = 'horizontal',
  colorByCell







}: {data: Record<string, string | number>[];series: BarSeries[];xKey?: string;height?: number;layout?: 'horizontal' | 'vertical';colorByCell?: string[];}) {
  const vertical = layout === 'vertical';
  return (
    <div data-ev-id="ev_0065121a41" style={{ height }} className="w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} layout={layout} margin={{ top: 8, right: 8, left: vertical ? 8 : -12, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={vertical} horizontal={!vertical} />
					{vertical ?
          <>
							<XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
							<YAxis type="category" dataKey={xKey} width={110} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
						</> :

          <>
							<XAxis dataKey={xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
							<YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
						</>
          }
					<Tooltip cursor={{ fill: '#00000008' }} />
					{series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
					{series.map((s) =>
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={vertical ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={44}>
							{colorByCell &&
            data.map((_, i) => <Cell key={i} fill={colorByCell[i]} />)}
						</Bar>
          )}
				</BarChart>
			</ResponsiveContainer>
		</div>);

}