import type {
	Contract,
	Invoice,
	Message,
	Notification,
	PerformanceRecord,
	ProcurementRequest,
	Product,
	PurchaseOrder,
	ReliabilityScore,
	RoleInfo,
	User,
	Vendor,
} from '@/data/types';
import { computeReliability, riskFromScore } from '@/lib/format';

export const ROLES: RoleInfo[] = [
	{ id: 1, role: 'admin', label: 'Administrator', dashboard: 'Command Center' },
	{ id: 2, role: 'procurement', label: 'Procurement Manager', dashboard: 'Procurement Workbench' },
	{ id: 3, role: 'scm', label: 'Supply Chain Manager', dashboard: 'Supplier Performance Hub' },
	{ id: 4, role: 'vendor', label: 'Vendor', dashboard: 'Vendor Portal' },
	{ id: 5, role: 'finance', label: 'Finance Officer', dashboard: 'Financial Control Panel' },
	{ id: 6, role: 'auditor', label: 'Auditor', dashboard: 'Compliance & Audit View' },
];

export const CATEGORIES = [
	'Raw Materials',
	'Electronics',
	'Logistics',
	'Packaging',
	'IT Services',
	'Office Supplies',
];

export const users: User[] = [
	{ id: 1, name: 'Arjun Mehta', email: 'admin@vendoriq.io', role: 'admin', active: true, createdAt: '2024-01-05' },
	{ id: 2, name: 'Priya Nair', email: 'procurement@vendoriq.io', role: 'procurement', active: true, createdAt: '2024-01-12' },
	{ id: 3, name: 'Rahul Verma', email: 'scm@vendoriq.io', role: 'scm', active: true, createdAt: '2024-02-01' },
	{ id: 4, name: 'Sneha Kapoor', email: 'finance@vendoriq.io', role: 'finance', active: true, createdAt: '2024-02-15' },
	{ id: 5, name: 'Vikram Rao', email: 'auditor@vendoriq.io', role: 'auditor', active: true, createdAt: '2024-03-02' },
	{ id: 6, name: 'Acme Steel Co.', email: 'vendor@vendoriq.io', role: 'vendor', vendorId: 1, active: true, createdAt: '2024-03-10' },
];

const vendorSeed: Array<Omit<Vendor, 'reliabilityScore' | 'riskLevel'>> = [
	{ id: 1, name: 'Acme Steel Co.', category: 'Raw Materials', status: 'Approved', email: 'sales@acmesteel.com', phone: '+1 202 555 0111', country: 'USA', contact: 'John Carter', userId: 6, onboardedAt: '2024-03-10', totalSpend: 482000 },
	{ id: 2, name: 'NovaTech Electronics', category: 'Electronics', status: 'Approved', email: 'hello@novatech.com', phone: '+1 415 555 0182', country: 'USA', contact: 'Lisa Wong', onboardedAt: '2024-02-18', totalSpend: 356500 },
	{ id: 3, name: 'BlueLine Logistics', category: 'Logistics', status: 'Approved', email: 'ops@blueline.com', phone: '+44 20 7946 0321', country: 'UK', contact: 'Mark Evans', onboardedAt: '2024-01-22', totalSpend: 298000 },
	{ id: 4, name: 'PackRight Solutions', category: 'Packaging', status: 'Approved', email: 'info@packright.com', phone: '+49 30 5557 8912', country: 'Germany', contact: 'Anna Schmidt', onboardedAt: '2024-04-02', totalSpend: 142300 },
	{ id: 5, name: 'ByteWorks IT', category: 'IT Services', status: 'Pending', email: 'contact@byteworks.io', phone: '+91 80 5557 2210', country: 'India', contact: 'Ravi Kumar', onboardedAt: '2024-05-11', totalSpend: 89000 },
	{ id: 6, name: 'OfficePlus Supplies', category: 'Office Supplies', status: 'Approved', email: 'sales@officeplus.com', phone: '+1 312 555 0165', country: 'USA', contact: 'Emily Stone', onboardedAt: '2024-03-28', totalSpend: 67400 },
	{ id: 7, name: 'IronForge Metals', category: 'Raw Materials', status: 'Approved', email: 'contact@ironforge.com', phone: '+61 2 5550 8734', country: 'Australia', contact: 'Tom Reed', onboardedAt: '2024-02-05', totalSpend: 211900 },
	{ id: 8, name: 'Circuitry Global', category: 'Electronics', status: 'Suspended', email: 'sales@circuitry.com', phone: '+86 21 5557 3345', country: 'China', contact: 'Wei Chen', onboardedAt: '2024-01-15', totalSpend: 178200 },
	{ id: 9, name: 'SwiftHaul Transport', category: 'Logistics', status: 'Approved', email: 'dispatch@swifthaul.com', phone: '+1 713 555 0198', country: 'USA', contact: 'Carlos Diaz', onboardedAt: '2024-04-19', totalSpend: 123700 },
	{ id: 10, name: 'GreenBox Packaging', category: 'Packaging', status: 'Pending', email: 'hello@greenbox.com', phone: '+31 20 5557 6621', country: 'Netherlands', contact: 'Sofie Bakker', onboardedAt: '2024-05-30', totalSpend: 45600 },
	{ id: 11, name: 'CloudNine Systems', category: 'IT Services', status: 'Approved', email: 'sales@cloudnine.io', phone: '+1 206 555 0143', country: 'USA', contact: 'Nina Patel', onboardedAt: '2024-03-14', totalSpend: 156800 },
	{ id: 12, name: 'Titan Raw Corp', category: 'Raw Materials', status: 'Rejected', email: 'info@titanraw.com', phone: '+55 11 5557 9032', country: 'Brazil', contact: 'Paulo Souza', onboardedAt: '2024-02-27', totalSpend: 12000 },
];

// Deterministic pseudo-random for reproducible perf data
const rand = (seed: number) => {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const performanceRecords: PerformanceRecord[] = [];
let perfId = 1;
vendorSeed.forEach((v) => {
	// baseline quality varies by vendor to create a spread of scores
	const base = 55 + rand(v.id) * 42;
	MONTHS.forEach((m, mi) => {
		const noise = (rand(v.id * 10 + mi) - 0.5) * 14;
		const onTime = Math.max(35, Math.min(99, base + noise));
		const quality = Math.max(40, Math.min(99, base + noise * 0.8 + 3));
		const defect = Math.max(0.5, Math.min(30, 100 - base + noise * 0.5));
		performanceRecords.push({
			id: perfId++,
			vendorId: v.id,
			date: `2024-0${mi + 1}-15`,
			onTimeDelivery: Math.round(onTime),
			qualityRating: Math.round(quality),
			defectRate: Math.round(defect * 10) / 10,
			deliveredQty: Math.round(200 + rand(v.id + mi) * 800),
		});
	});
});

export const vendors: Vendor[] = vendorSeed.map((v) => {
	const recs = performanceRecords.filter((r) => r.vendorId === v.id);
	const score = computeReliability(recs);
	return { ...v, reliabilityScore: score, riskLevel: riskFromScore(score) };
});

export const reliabilityScores: ReliabilityScore[] = [];
let scId = 1;
vendorSeed.forEach((v) => {
	MONTHS.forEach((m, mi) => {
		const recs = performanceRecords.filter(
			(r) => r.vendorId === v.id && Number(r.date.slice(5, 7)) <= mi + 1,
		);
		const score = computeReliability(recs);
		reliabilityScores.push({ id: scId++, vendorId: v.id, date: `2024-0${mi + 1}-28`, score, riskLevel: riskFromScore(score) });
	});
});

export const products: Product[] = [
	{ id: 1, name: 'Cold Rolled Steel Sheet', category: 'Raw Materials', unitPrice: 720, vendorId: 1 },
	{ id: 2, name: 'Microcontroller Board', category: 'Electronics', unitPrice: 45, vendorId: 2 },
	{ id: 3, name: 'Freight Container (40ft)', category: 'Logistics', unitPrice: 2600, vendorId: 3 },
	{ id: 4, name: 'Corrugated Boxes (bulk)', category: 'Packaging', unitPrice: 1.2, vendorId: 4 },
	{ id: 5, name: 'Cloud Hosting License', category: 'IT Services', unitPrice: 320, vendorId: 11 },
	{ id: 6, name: 'Office Chair Ergo', category: 'Office Supplies', unitPrice: 180, vendorId: 6 },
];

export const procurementRequests: ProcurementRequest[] = [
	{ id: 1, title: 'Q3 Steel Restock', category: 'Raw Materials', quantity: 400, estCost: 288000, requestedBy: 'Priya Nair', status: 'Approved', date: '2024-06-01' },
	{ id: 2, title: 'IoT Sensor Batch', category: 'Electronics', quantity: 1200, estCost: 54000, requestedBy: 'Rahul Verma', status: 'Pending', date: '2024-06-08' },
	{ id: 3, title: 'Warehouse Freight', category: 'Logistics', quantity: 15, estCost: 39000, requestedBy: 'Priya Nair', status: 'Approved', date: '2024-06-10' },
	{ id: 4, title: 'Eco Packaging Trial', category: 'Packaging', quantity: 20000, estCost: 24000, requestedBy: 'Rahul Verma', status: 'Rejected', date: '2024-06-12' },
	{ id: 5, title: 'Cloud Infra Upgrade', category: 'IT Services', quantity: 50, estCost: 16000, requestedBy: 'Priya Nair', status: 'Pending', date: '2024-06-18' },
	{ id: 6, title: 'Office Refurbishment', category: 'Office Supplies', quantity: 120, estCost: 21600, requestedBy: 'Rahul Verma', status: 'Approved', date: '2024-06-20' },
];

export const purchaseOrders: PurchaseOrder[] = [
	{ id: 1, poNumber: 'PO-2024-1001', vendorId: 1, requestId: 1, amount: 288000, status: 'Delivered', orderDate: '2024-06-03', expectedDate: '2024-06-20', items: [{ name: 'Cold Rolled Steel Sheet', qty: 400, unitPrice: 720 }] },
	{ id: 2, poNumber: 'PO-2024-1002', vendorId: 2, amount: 54000, status: 'Ordered', orderDate: '2024-06-09', expectedDate: '2024-07-01', items: [{ name: 'Microcontroller Board', qty: 1200, unitPrice: 45 }] },
	{ id: 3, poNumber: 'PO-2024-1003', vendorId: 3, requestId: 3, amount: 39000, status: 'Delivered', orderDate: '2024-06-11', expectedDate: '2024-06-25', items: [{ name: 'Freight Container (40ft)', qty: 15, unitPrice: 2600 }] },
	{ id: 4, poNumber: 'PO-2024-1004', vendorId: 11, amount: 16000, status: 'Ordered', orderDate: '2024-06-19', expectedDate: '2024-07-05', items: [{ name: 'Cloud Hosting License', qty: 50, unitPrice: 320 }] },
	{ id: 5, poNumber: 'PO-2024-1005', vendorId: 6, requestId: 6, amount: 21600, status: 'Draft', orderDate: '2024-06-21', expectedDate: '2024-07-10', items: [{ name: 'Office Chair Ergo', qty: 120, unitPrice: 180 }] },
	{ id: 6, poNumber: 'PO-2024-1006', vendorId: 7, amount: 96000, status: 'Delivered', orderDate: '2024-05-15', expectedDate: '2024-05-30', items: [{ name: 'Steel Billets', qty: 200, unitPrice: 480 }] },
	{ id: 7, poNumber: 'PO-2024-1007', vendorId: 9, amount: 28000, status: 'Cancelled', orderDate: '2024-05-20', expectedDate: '2024-06-04', items: [{ name: 'Regional Freight', qty: 10, unitPrice: 2800 }] },
	{ id: 8, poNumber: 'PO-2024-1008', vendorId: 4, amount: 34500, status: 'Ordered', orderDate: '2024-06-22', expectedDate: '2024-07-08', items: [{ name: 'Corrugated Boxes', qty: 28750, unitPrice: 1.2 }] },
];

export const contracts: Contract[] = [
	{ id: 1, vendorId: 1, title: 'Annual Steel Supply Agreement', value: 620000, startDate: '2024-01-01', endDate: '2024-12-31', status: 'Active' },
	{ id: 2, vendorId: 2, title: 'Electronics Component MSA', value: 410000, startDate: '2024-02-01', endDate: '2024-08-15', status: 'Expiring' },
	{ id: 3, vendorId: 3, title: 'Logistics Framework Contract', value: 350000, startDate: '2023-06-01', endDate: '2024-05-31', status: 'Expired' },
	{ id: 4, vendorId: 11, title: 'Cloud Services SLA', value: 180000, startDate: '2024-03-01', endDate: '2025-02-28', status: 'Active' },
	{ id: 5, vendorId: 7, title: 'Raw Materials Supply', value: 240000, startDate: '2024-01-15', endDate: '2024-07-30', status: 'Expiring' },
	{ id: 6, vendorId: 6, title: 'Office Supplies Retainer', value: 72000, startDate: '2024-04-01', endDate: '2025-03-31', status: 'Active' },
	{ id: 7, vendorId: 4, title: 'Packaging Partnership', value: 150000, startDate: '2024-05-01', endDate: '2024-06-30', status: 'Draft' },
];

export const invoices: Invoice[] = [
	{ id: 1, vendorId: 1, poNumber: 'PO-2024-1001', amount: 288000, status: 'Paid', dueDate: '2024-07-01' },
	{ id: 2, vendorId: 3, poNumber: 'PO-2024-1003', amount: 39000, status: 'Paid', dueDate: '2024-07-05' },
	{ id: 3, vendorId: 2, poNumber: 'PO-2024-1002', amount: 54000, status: 'Pending', dueDate: '2024-07-20' },
	{ id: 4, vendorId: 7, poNumber: 'PO-2024-1006', amount: 96000, status: 'Overdue', dueDate: '2024-06-20' },
	{ id: 5, vendorId: 11, poNumber: 'PO-2024-1004', amount: 16000, status: 'Pending', dueDate: '2024-07-25' },
];

export const notifications: Notification[] = [
	{ id: 1, message: 'Contract "Electronics Component MSA" is expiring in 30 days.', type: 'warning', read: false, date: '2024-06-25' },
	{ id: 2, message: 'Circuitry Global reliability dropped below 45 — flagged High Risk.', type: 'danger', read: false, date: '2024-06-24' },
	{ id: 3, message: 'PO-2024-1001 delivered successfully by Acme Steel Co.', type: 'success', read: false, date: '2024-06-21' },
	{ id: 4, message: 'New procurement request "Cloud Infra Upgrade" pending approval.', type: 'info', read: true, date: '2024-06-18' },
	{ id: 5, message: 'Invoice for PO-2024-1006 is now overdue.', type: 'danger', read: true, date: '2024-06-21' },
];

export const messages: Message[] = [
	{ id: 1, fromId: 6, toId: 1, subject: 'Delivery schedule update', body: 'Hi, we can move the Q3 steel delivery up by a week if that helps.', date: '2024-06-20', read: false },
	{ id: 2, fromId: 1, toId: 6, subject: 'Re: Delivery schedule update', body: 'That would be great, please confirm the revised dates.', date: '2024-06-20', read: true },
	{ id: 3, fromId: 2, toId: 1, subject: 'Vendor onboarding — ByteWorks', body: 'ByteWorks IT documents are ready for your approval.', date: '2024-06-19', read: false },
	{ id: 4, fromId: 3, toId: 1, subject: 'Performance review flag', body: 'Circuitry Global needs a quality audit this month.', date: '2024-06-18', read: true },
];
