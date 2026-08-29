import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'success' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  outline: 'border border-border bg-card text-gray-700 hover:bg-canvas',
  ghost: 'text-gray-600 hover:bg-canvas',
  success: 'bg-success text-white hover:brightness-95',
  danger: 'bg-danger text-white hover:brightness-95'
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {children: ReactNode;variant?: Variant;} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button data-ev-id="ev_5259041fa7"
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
    {...props}>

			{children}
		</button>);

}

export function FormField({
  label,
  children



}: {label: string;children: ReactNode;}) {
  return (
    <label data-ev-id="ev_f72e25fb0c" className="flex flex-col gap-1.5">
			<span data-ev-id="ev_0a2ed45d97" className="text-sm font-medium text-gray-700">{label}</span>
			{children}
		</label>);

}

export const inputClass =
'rounded-lg border border-border bg-card px-3 py-2 text-sm text-gray-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';