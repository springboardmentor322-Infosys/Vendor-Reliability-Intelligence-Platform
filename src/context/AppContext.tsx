import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import type {
	Contract,
	Message,
	Notification,
	PerformanceRecord,
	ProcurementRequest,
	PurchaseOrder,
	Role,
	User,
	Vendor,
} from '@/data/types';
import * as db from '@/data/mock';
import { computeReliability, riskFromScore } from '@/lib/format';

interface AppState {
	currentUser: User | null;
	login: (role: Role) => void;
	logout: () => void;
	vendors: Vendor[];
	addVendor: (v: Omit<Vendor, 'id' | 'reliabilityScore' | 'riskLevel'>) => void;
	setVendorStatus: (id: number, status: Vendor['status']) => void;
	procurements: ProcurementRequest[];
	addProcurement: (p: Omit<ProcurementRequest, 'id'>) => void;
	setProcurementStatus: (id: number, status: ProcurementRequest['status']) => void;
	purchaseOrders: PurchaseOrder[];
	addPurchaseOrder: (p: Omit<PurchaseOrder, 'id'>) => void;
	contracts: Contract[];
	addContract: (c: Omit<Contract, 'id'>) => void;
	performance: PerformanceRecord[];
	addPerformance: (r: Omit<PerformanceRecord, 'id'>) => void;
	messages: Message[];
	sendMessage: (m: Omit<Message, 'id' | 'date' | 'read'>) => void;
	notifications: Notification[];
	markNotificationRead: (id: number) => void;
	markAllNotificationsRead: () => void;
	users: User[];
	toggleUserActive: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [currentUser, setCurrentUser] = useState<User | null>(() => {
		const stored = localStorage.getItem('vendoriq_role');
		if (stored) return db.users.find((u) => u.role === stored) ?? null;
		return null;
	});
	const [vendors, setVendors] = useState<Vendor[]>(db.vendors);
	const [procurements, setProcurements] = useState<ProcurementRequest[]>(db.procurementRequests);
	const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(db.purchaseOrders);
	const [contracts, setContracts] = useState<Contract[]>(db.contracts);
	const [performance, setPerformance] = useState<PerformanceRecord[]>(db.performanceRecords);
	const [messages, setMessages] = useState<Message[]>(db.messages);
	const [notifications, setNotifications] = useState<Notification[]>(db.notifications);
	const [users, setUsers] = useState<User[]>(db.users);

	const login = useCallback((role: Role) => {
		const u = db.users.find((x) => x.role === role) ?? null;
		if (u) {
			setCurrentUser(u);
			localStorage.setItem('vendoriq_role', role);
		}
	}, []);

	const logout = useCallback(() => {
		setCurrentUser(null);
		localStorage.removeItem('vendoriq_role');
	}, []);

	const addVendor: AppState['addVendor'] = useCallback((v) => {
		setVendors((prev) => [
			{ ...v, id: Math.max(0, ...prev.map((x) => x.id)) + 1, reliabilityScore: 0, riskLevel: 'Medium' },
			...prev,
		]);
	}, []);

	const setVendorStatus: AppState['setVendorStatus'] = useCallback((id, status) => {
		setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
	}, []);

	const addProcurement: AppState['addProcurement'] = useCallback((p) => {
		setProcurements((prev) => [{ ...p, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev]);
	}, []);

	const setProcurementStatus: AppState['setProcurementStatus'] = useCallback((id, status) => {
		setProcurements((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
	}, []);

	const addPurchaseOrder: AppState['addPurchaseOrder'] = useCallback((p) => {
		setPurchaseOrders((prev) => [{ ...p, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev]);
	}, []);

	const addContract: AppState['addContract'] = useCallback((c) => {
		setContracts((prev) => [{ ...c, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev]);
	}, []);

	const addPerformance: AppState['addPerformance'] = useCallback((r) => {
		setPerformance((prev) => {
			const next = [{ ...r, id: Math.max(0, ...prev.map((x) => x.id)) + 1 }, ...prev];
			const recs = next.filter((x) => x.vendorId === r.vendorId);
			const score = computeReliability(recs);
			setVendors((vs) =>
				vs.map((v) => (v.id === r.vendorId ? { ...v, reliabilityScore: score, riskLevel: riskFromScore(score) } : v)),
			);
			return next;
		});
	}, []);

	const sendMessage: AppState['sendMessage'] = useCallback((m) => {
		setMessages((prev) => [
			...prev,
			{ ...m, id: Math.max(0, ...prev.map((x) => x.id)) + 1, date: new Date().toISOString().slice(0, 10), read: false },
		]);
	}, []);

	const markNotificationRead: AppState['markNotificationRead'] = useCallback((id) => {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
	}, []);

	const markAllNotificationsRead = useCallback(() => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
	}, []);

	const toggleUserActive: AppState['toggleUserActive'] = useCallback((id) => {
		setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
	}, []);

	const value = useMemo<AppState>(
		() => ({
			currentUser, login, logout,
			vendors, addVendor, setVendorStatus,
			procurements, addProcurement, setProcurementStatus,
			purchaseOrders, addPurchaseOrder,
			contracts, addContract,
			performance, addPerformance,
			messages, sendMessage,
			notifications, markNotificationRead, markAllNotificationsRead,
			users, toggleUserActive,
		}),
		[currentUser, login, logout, vendors, addVendor, setVendorStatus, procurements, addProcurement, setProcurementStatus, purchaseOrders, addPurchaseOrder, contracts, addContract, performance, addPerformance, messages, sendMessage, notifications, markNotificationRead, markAllNotificationsRead, users, toggleUserActive],
	);

	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error('useApp must be used within AppProvider');
	return ctx;
}
