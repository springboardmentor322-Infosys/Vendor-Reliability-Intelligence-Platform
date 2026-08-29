import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart } from
'recharts';

export interface Series {
  key: string;
  color: string;
  label: string;
}

export default function LineChartCard({
  data,
  series,
  xKey = 'name',
  area = false,
  height = 260






}: {data: Record<string, string | number>[];series: Series[];xKey?: string;area?: boolean;height?: number;}) {
  if (area) {
    return (
      <div data-ev-id="ev_f2e81a401b" style={{ height }} className="w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
						<defs data-ev-id="ev_ce89f11953">
							{series.map((s) =>
              <linearGradient data-ev-id="ev_07b2537e26" key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
									<stop data-ev-id="ev_747fa58e2b" offset="5%" stopColor={s.color} stopOpacity={0.35} />
									<stop data-ev-id="ev_2a9d12556e" offset="95%" stopColor={s.color} stopOpacity={0} />
								</linearGradient>
              )}
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
						<XAxis dataKey={xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
						<YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
						<Tooltip />
						<Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
						{series.map((s) =>
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fill={`url(#g-${s.key})`} />
            )}
					</AreaChart>
				</ResponsiveContainer>
			</div>);

  }
  return (
    <div data-ev-id="ev_ae9ded5d82" style={{ height }} className="w-full">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
					<XAxis dataKey={xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
					<YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
					<Tooltip />
					<Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
					{series.map((s) =>
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          )}
				</LineChart>
			</ResponsiveContainer>
		</div>);

}