import type { ReactNode } from 'react';

export default function Card({
  children,
  className = '',
  accent,
  title,
  subtitle,
  action







}: {children: ReactNode;className?: string;accent?: string;title?: string;subtitle?: string;action?: ReactNode;}) {
  return (
    <div data-ev-id="ev_cf07e95fb5"
    className={`rounded-lg border border-border bg-card shadow-sm ${className}`}
    style={accent ? { borderLeft: `5px solid ${accent}` } : undefined}>

			{(title || action) &&
      <div data-ev-id="ev_1c104fb137" className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
					<div data-ev-id="ev_4e335d0be1">
						{title && <h3 data-ev-id="ev_52fabac674" className="text-sm font-semibold text-gray-800">{title}</h3>}
						{subtitle && <p data-ev-id="ev_aecfaa3a05" className="text-xs text-muted-foreground">{subtitle}</p>}
					</div>
					{action}
				</div>
      }
			<div data-ev-id="ev_64adcde3b9" className="p-4">{children}</div>
		</div>);

}