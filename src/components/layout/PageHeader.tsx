import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  action




}: {title: string;subtitle?: string;action?: ReactNode;}) {
  return (
    <div data-ev-id="ev_fc7d42cb8c" className="mb-6 flex flex-wrap items-end justify-between gap-3">
			<div data-ev-id="ev_787bd357c4">
				<h2 data-ev-id="ev_9fcdc8336a" className="text-xl font-bold text-gray-800 md:text-2xl">{title}</h2>
				{subtitle && <p data-ev-id="ev_fabcca522d" className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
			</div>
			{action}
		</div>);

}