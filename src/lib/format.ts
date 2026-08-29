import type { RiskLevel } from '@/data/types';

export const currency = (n: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(n);

export const compactCurrency = (n: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(n);

export const formatDate = (iso: string) =>
	new Date(iso).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

export const riskColor = (risk: RiskLevel): string => {
	switch (risk) {
		case 'Low':
			return '#4caf50';
		case 'Medium':
			return '#ff9800';
		case 'High':
			return '#f44336';
		case 'Critical':
			return '#b71c1c';
	}
};

export const riskFromScore = (score: number): RiskLevel => {
	if (score >= 80) return 'Low';
	if (score >= 60) return 'Medium';
	if (score >= 40) return 'High';
	return 'Critical';
};

export const statusColor = (status: string): string => {
	const s = status.toLowerCase();
	if (['approved', 'active', 'delivered', 'paid', 'excellent'].includes(s))
		return '#4caf50';
	if (['pending', 'expiring', 'ordered', 'average', 'draft'].includes(s))
		return s === 'ordered' ? '#2196f3' : '#ff9800';
	if (['rejected', 'expired', 'poor', 'overdue', 'cancelled', 'suspended'].includes(s))
		return '#f44336';
	return '#9e9e9e';
};

export const computeReliability = (records: {
	onTimeDelivery: number;
	qualityRating: number;
	defectRate: number;
}[]): number => {
	if (records.length === 0) return 0;
	const avg = (fn: (r: (typeof records)[number]) => number) =>
		records.reduce((s, r) => s + fn(r), 0) / records.length;
	const onTime = avg((r) => r.onTimeDelivery);
	const quality = avg((r) => r.qualityRating);
	const defect = avg((r) => r.defectRate);
	const score = 0.4 * onTime + 0.35 * quality + 0.25 * (100 - defect);
	return Math.round(Math.max(0, Math.min(100, score)));
};
