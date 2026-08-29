import { riskColor, statusColor } from '@/lib/format';
import type { RiskLevel } from '@/data/types';

export function StatusBadge({ status }: {status: string;}) {
  const color = statusColor(status);
  return (
    <span data-ev-id="ev_4e96271d66"
    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    style={{ backgroundColor: `${color}1f`, color }}>

			<span data-ev-id="ev_e2ea04fa45" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
			{status}
		</span>);

}

export function RiskBadge({ risk }: {risk: RiskLevel;}) {
  const color = riskColor(risk);
  return (
    <span data-ev-id="ev_cafb738067"
    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    style={{ backgroundColor: `${color}1f`, color }}>

			{risk} Risk
		</span>);

}

export function ScorePill({ score }: {score: number;}) {
  const color = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : score >= 40 ? '#f44336' : '#b71c1c';
  return (
    <div data-ev-id="ev_27bb525254" className="flex items-center gap-2">
			<div data-ev-id="ev_35c0a0be9c" className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
				<div data-ev-id="ev_40633f09b0" className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
			</div>
			<span data-ev-id="ev_ada8089f3a" className="text-sm font-semibold" style={{ color }}>
				{score}
			</span>
		</div>);

}