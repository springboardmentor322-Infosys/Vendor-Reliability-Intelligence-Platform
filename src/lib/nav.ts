import type { Role } from '@/data/types';
import {
	LayoutDashboard,
	Building2,
	PlusCircle,
	ClipboardList,
	FilePlus2,
	ShoppingCart,
	FileText,
	Trophy,
	ActivitySquare,
	MessagesSquare,
	FileBarChart,
	Users,
	Bell,
	type LucideIcon,
} from 'lucide-react';

export interface NavItem {
	label: string;
	path: string;
	icon: LucideIcon;
	roles: Role[];
	group: string;
}

const ALL: Role[] = ['admin', 'procurement', 'scm', 'finance', 'auditor', 'vendor'];

export const NAV: NavItem[] = [
	{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ALL, group: 'Overview' },
	{ label: 'Rankings', path: '/rankings', icon: Trophy, roles: ALL, group: 'Overview' },

	{ label: 'Vendors', path: '/vendors', icon: Building2, roles: ['admin', 'procurement', 'scm', 'finance', 'auditor'], group: 'Vendor Management' },
	{ label: 'Add Vendor', path: '/vendors/add', icon: PlusCircle, roles: ['admin', 'procurement'], group: 'Vendor Management' },

	{ label: 'Procurement', path: '/procurement', icon: ClipboardList, roles: ['admin', 'procurement', 'scm', 'finance', 'auditor'], group: 'Procurement' },
	{ label: 'New Request', path: '/procurement/add', icon: FilePlus2, roles: ['admin', 'procurement', 'scm'], group: 'Procurement' },
	{ label: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: ALL, group: 'Procurement' },
	{ label: 'New PO', path: '/purchase-orders/add', icon: FilePlus2, roles: ['admin', 'procurement'], group: 'Procurement' },

	{ label: 'Contracts', path: '/contracts', icon: FileText, roles: ALL, group: 'Contracts & Quality' },
	{ label: 'New Contract', path: '/contracts/add', icon: FilePlus2, roles: ['admin'], group: 'Contracts & Quality' },
	{ label: 'Log Performance', path: '/performance/add', icon: ActivitySquare, roles: ['admin', 'scm'], group: 'Contracts & Quality' },

	{ label: 'Messages', path: '/messages', icon: MessagesSquare, roles: ALL, group: 'Communication' },
	{ label: 'Notifications', path: '/notifications', icon: Bell, roles: ALL, group: 'Communication' },

	{ label: 'Reports', path: '/reports', icon: FileBarChart, roles: ['admin', 'finance', 'auditor', 'procurement'], group: 'Admin' },
	{ label: 'User Management', path: '/users', icon: Users, roles: ['admin'], group: 'Admin' },
];

export const navForRole = (role: Role) => NAV.filter((n) => n.roles.includes(role));
