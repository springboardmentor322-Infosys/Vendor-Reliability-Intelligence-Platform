export type Role =
	| 'admin'
	| 'procurement'
	| 'scm'
	| 'finance'
	| 'auditor'
	| 'vendor';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
	id: number;
	name: string;
	email: string;
	role: Role;
	vendorId?: number;
	active: boolean;
	createdAt: string;
}

export type VendorStatus = 'Approved' | 'Pending' | 'Rejected' | 'Suspended';

export interface Vendor {
	id: number;
	name: string;
	category: string;
	status: VendorStatus;
	email: string;
	phone: string;
	country: string;
	contact: string;
	userId?: number;
	onboardedAt: string;
	reliabilityScore: number;
	riskLevel: RiskLevel;
	totalSpend: number;
}

export interface Product {
	id: number;
	name: string;
	category: string;
	unitPrice: number;
	vendorId: number;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ProcurementRequest {
	id: number;
	title: string;
	category: string;
	quantity: number;
	estCost: number;
	requestedBy: string;
	status: RequestStatus;
	date: string;
}

export type POStatus = 'Draft' | 'Ordered' | 'Delivered' | 'Cancelled';

export interface POItem {
	name: string;
	qty: number;
	unitPrice: number;
}

export interface PurchaseOrder {
	id: number;
	poNumber: string;
	vendorId: number;
	requestId?: number;
	amount: number;
	status: POStatus;
	orderDate: string;
	expectedDate: string;
	items: POItem[];
}

export type ContractStatus = 'Active' | 'Expiring' | 'Expired' | 'Draft';

export interface Contract {
	id: number;
	vendorId: number;
	title: string;
	value: number;
	startDate: string;
	endDate: string;
	status: ContractStatus;
}

export interface PerformanceRecord {
	id: number;
	vendorId: number;
	date: string;
	onTimeDelivery: number; // percentage 0-100
	qualityRating: number; // 0-100
	defectRate: number; // percentage 0-100
	deliveredQty: number;
}

export interface ReliabilityScore {
	id: number;
	vendorId: number;
	date: string;
	score: number;
	riskLevel: RiskLevel;
}

export interface Notification {
	id: number;
	message: string;
	type: 'info' | 'success' | 'warning' | 'danger';
	read: boolean;
	date: string;
}

export interface Message {
	id: number;
	fromId: number;
	toId: number;
	subject: string;
	body: string;
	date: string;
	read: boolean;
}

export interface Invoice {
	id: number;
	vendorId: number;
	poNumber: string;
	amount: number;
	status: 'Paid' | 'Pending' | 'Overdue';
	dueDate: string;
}

export interface RoleInfo {
	id: number;
	role: Role;
	label: string;
	dashboard: string;
}
x