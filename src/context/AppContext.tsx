import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type {
  User,
  Vendor,
  ProcurementRequest,
  PurchaseOrder,
  Contract,
  PerformanceRecord,
  Message,
  Notification,
  Invoice,
  ReliabilityScore,
  Role,
  VendorStatus,
  RequestStatus,
  POStatus,
} from '@/data/types';

import { loadCsv } from '@/data/csv';

interface AppState {
  currentUser: User | null;
  loading: boolean;

  login: (role: Role) => void;
  logout: () => void;

  vendors: Vendor[];
  addVendor: (
  vendor: Omit<Vendor, 'id' | 'reliabilityScore' | 'riskLevel'>
) => void;
  setVendorStatus: (id: number, status: VendorStatus) => void;

  procurements: ProcurementRequest[];
  addProcurement: (
  item: Omit<ProcurementRequest, 'id'>
) => void;
  setProcurementStatus: (id: number, status: RequestStatus) => void;

  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (
  item: Omit<PurchaseOrder, 'id'>
) => void;

  contracts: Contract[];
  addContract: (
  item: Omit<Contract, 'id'>
) => void;

  performance: PerformanceRecord[];
  addPerformance: (
  item: Omit<PerformanceRecord, 'id'>
) => void;

  reliabilityScores: ReliabilityScore[];

  invoices: Invoice[];

  messages: Message[];
  sendMessage: (
  message: Omit<Message, 'id' | 'date' | 'read'>
) => void;

  notifications: Notification[];
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;

  users: User[];
  toggleUserActive: (id: number) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const roleStorageKey = 'vendoriq_role';

function normalizeRole(value: string): Role {
  const role = value?.toLowerCase();

  if (role === 'procurement') return 'procurement';
  if (role === 'scm') return 'scm';
  if (role === 'finance') return 'finance';
  if (role === 'auditor') return 'auditor';
  if (role === 'vendor') return 'vendor';

  return 'admin';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [reliabilityScores, setReliabilityScores] = useState<ReliabilityScore[]>(
    []
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          usersCsv,
          vendorsCsv,
          procurementCsv,
          purchaseOrdersCsv,
          invoicesCsv,
          contractsCsv,
          performanceCsv,
          reliabilityCsv,
          messagesCsv,
          notificationsCsv,
        ] = await Promise.all([
          loadCsv<any>('users.csv'),
          loadCsv<any>('vendors.csv'),
          loadCsv<any>('procurement_requests.csv'),
          loadCsv<any>('purchase_orders.csv'),
          loadCsv<any>('invoices.csv'),
          loadCsv<any>('contracts.csv'),
          loadCsv<any>('performance_records.csv'),
          loadCsv<any>('reliability_scores.csv'),
          loadCsv<any>('messages.csv'),
          loadCsv<any>('notifications.csv'),
        ]);

        const loadedUsers: User[] = usersCsv.map((row) => ({
          id: Number(row.id),
          name: row.name,
          email: row.email,
          role: normalizeRole(row.role),
          vendorId: row.vendorId ? Number(row.vendorId) : undefined,
          active:
            row.active === true ||
            row.active === 'true' ||
            row.active === 'True' ||
            row.active === '1',
          createdAt: row.createdAt || row.created_at || row.date || '',
        }));

        const loadedVendors: Vendor[] = vendorsCsv.map((row) => ({
          id: Number(row.id),
          name: row.name,
          category: row.category,
          status: row.status as VendorStatus,
          email: row.email,
          phone: row.phone,
          country: row.country,
          contact: row.contact || row.contactPerson || '',
          userId: row.userId ? Number(row.userId) : undefined,
          onboardedAt:
            row.onboardedAt || row.onboarded_at || row.date || '',
          reliabilityScore: Number(
            row.reliabilityScore || row.reliability_score || 0
          ),
          riskLevel: row.riskLevel || row.risk_level || 'Medium',
          totalSpend: Number(row.totalSpend || row.total_spend || 0),
        }));

        const loadedProcurements: ProcurementRequest[] =
          procurementCsv.map((row) => ({
            id: Number(row.id),
            title: row.title,
            category: row.category,
            quantity: Number(row.quantity || 0),
            estCost: Number(row.estCost || row.estimatedCost || 0),
            requestedBy: row.requestedBy || row.requested_by || '',
            status: row.status as RequestStatus,
            date: row.date || '',
          }));

        const loadedPurchaseOrders: PurchaseOrder[] = purchaseOrdersCsv.map(
          (row) => {
            const quantity = Number(row.quantity || 1);
            const amount = Number(row.amount || 0);

            return {
              id: Number(row.id),
              poNumber: row.poNumber || row.po_number || `PO-${row.id}`,
              vendorId: Number(row.vendorId || row.vendor_id),
              requestId: row.requestId
                ? Number(row.requestId)
                : row.request_id
                  ? Number(row.request_id)
                  : undefined,
              amount,
              status: normalizePOStatus(row.status),
              orderDate: row.orderDate || row.order_date || row.date || '',
              expectedDate:
                row.expectedDate || row.expected_date || row.date || '',
              items: [
                {
                  name: row.itemName || row.item_name || 'Procurement Item',
                  qty: quantity,
                  unitPrice: quantity > 0 ? amount / quantity : amount,
                },
              ],
            };
          }
        );

        const loadedInvoices: Invoice[] = invoicesCsv.map((row) => ({
          id: Number(row.id),
          vendorId: Number(row.vendorId || row.vendor_id),
          poNumber: row.poNumber || row.po_number || '',
          amount: Number(row.amount || 0),
          status: row.status as Invoice['status'],
          dueDate: row.dueDate || row.due_date || row.date || '',
        }));

        const loadedContracts: Contract[] = contractsCsv.map((row) => ({
          id: Number(row.id),
          vendorId: Number(row.vendorId || row.vendor_id),
          title: row.title,
          value: Number(row.value || 0),
          startDate: row.startDate || row.start_date || '',
          endDate: row.endDate || row.end_date || '',
          status: row.status,
        }));

        const loadedPerformance: PerformanceRecord[] = performanceCsv.map(
          (row) => ({
            id: Number(row.id),
            vendorId: Number(row.vendorId || row.vendor_id),
            date: row.date || '',
            onTimeDelivery: Number(
              row.onTimeDelivery || row.on_time_delivery || 0
            ),
            qualityRating:
              Number(row.qualityRating || row.quality_rating || 0) <= 5
                ? Number(row.qualityRating || row.quality_rating || 0) * 20
                : Number(row.qualityRating || row.quality_rating || 0),
            defectRate: Number(row.defectRate || row.defect_rate || 0),
            deliveredQty: Number(
              row.deliveredQty || row.delivered_qty || row.quantity || 0
            ),
          })
        );

        const loadedReliability: ReliabilityScore[] = reliabilityCsv.map(
          (row) => ({
            id: Number(row.id),
            vendorId: Number(row.vendorId || row.vendor_id),
            date: row.date || '',
            score: Number(
              row.score || row.reliabilityScore || row.reliability_score || 0
            ),
            riskLevel: row.riskLevel || row.risk_level || 'Medium',
          })
        );

        const loadedMessages: Message[] = messagesCsv.map((row) => ({
          id: Number(row.id),
          fromId: Number(row.fromId || row.from_id || 0),
          toId: Number(row.toId || row.to_id || 0),
          subject: row.subject || '',
          body: row.body || '',
          date: row.date || '',
          read:
            row.read === true ||
            row.read === 'true' ||
            row.read === 'True' ||
            row.read === '1',
        }));

        const loadedNotifications: Notification[] = notificationsCsv.map(
          (row) => ({
            id: Number(row.id),
            message: row.message || '',
            type: row.type || 'info',
            read:
              row.read === true ||
              row.read === 'true' ||
              row.read === 'True' ||
              row.read === '1',
            date: row.date || '',
          })
        );

        setUsers(loadedUsers);
        setVendors(loadedVendors);
        setProcurements(loadedProcurements);
        setPurchaseOrders(loadedPurchaseOrders);
        setInvoices(loadedInvoices);
        setContracts(loadedContracts);
        setPerformance(loadedPerformance);
        setReliabilityScores(loadedReliability);
        setMessages(loadedMessages);
        setNotifications(loadedNotifications);

        const savedRole = localStorage.getItem(roleStorageKey);

        if (savedRole) {
          const role = normalizeRole(savedRole);
          const user = loadedUsers.find((item) => item.role === role);

          if (user) {
            setCurrentUser(user);
          }
        }
      } catch (error) {
        console.error('Failed to load VendorIQ datasets:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function login(role: Role) {
    const user = users.find((item) => item.role === role);

    if (user) {
      setCurrentUser(user);
      localStorage.setItem(roleStorageKey, role);
    }
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem(roleStorageKey);
  }

  function addVendor(
  vendor: Omit<Vendor, 'id' | 'reliabilityScore' | 'riskLevel'>
) {
  const newVendor: Vendor = {
    ...vendor,
    id: Date.now(),
    reliabilityScore: 0,
    riskLevel: 'Medium',
  };

  setVendors((prev) => [newVendor, ...prev]);
}

  function setVendorStatus(id: number, status: VendorStatus) {
    setVendors((prev) =>
      prev.map((vendor) =>
        vendor.id === id ? { ...vendor, status } : vendor
      )
    );
  }

  function addProcurement(
  item: Omit<ProcurementRequest, 'id'>
) {
  const newItem: ProcurementRequest = {
    ...item,
    id: Date.now(),
  };

  setProcurements((prev) => [newItem, ...prev]);
}

  function setProcurementStatus(id: number, status: RequestStatus) {
    setProcurements((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  }

  function addPurchaseOrder(
  item: Omit<PurchaseOrder, 'id'>
) {
  const newItem: PurchaseOrder = {
    ...item,
    id: Date.now(),
  };

  setPurchaseOrders((prev) => [newItem, ...prev]);
}

  function addContract(
  item: Omit<Contract, 'id'>
) {
  const newItem: Contract = {
    ...item,
    id: Date.now(),
  };

  setContracts((prev) => [newItem, ...prev]);
}

  function addPerformance(
  item: Omit<PerformanceRecord, 'id'>
) {
  const newItem: PerformanceRecord = {
    ...item,
    id: Date.now(),
  };

  setPerformance((prev) => [newItem, ...prev]);
}

  function sendMessage(
  message: Omit<Message, 'id' | 'date' | 'read'>
) {
  const newMessage: Message = {
    ...message,
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    read: false,
  };

  setMessages((prev) => [newMessage, ...prev]);
}

  function markNotificationRead(id: number) {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );
  }

  function markAllNotificationsRead() {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );
  }

  function toggleUserActive(id: number) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, active: !user.active } : user
      )
    );
  }

  const value = useMemo<AppState>(
    () => ({
      currentUser,
      loading,

      login,
      logout,

      vendors,
      addVendor,
      setVendorStatus,

      procurements,
      addProcurement,
      setProcurementStatus,

      purchaseOrders,
      addPurchaseOrder,

      contracts,
      addContract,

      performance,
      addPerformance,

      reliabilityScores,

      invoices,

      messages,
      sendMessage,

      notifications,
      markNotificationRead,
      markAllNotificationsRead,

      users,
      toggleUserActive,
    }),
    [
      currentUser,
      loading,
      vendors,
      procurements,
      purchaseOrders,
      contracts,
      performance,
      reliabilityScores,
      invoices,
      messages,
      notifications,
      users,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }

  return context;
}

function normalizePOStatus(status: string): POStatus {
  switch (status) {
    case 'Pending Approval':
      return 'Pending Approval';

    case 'Approved':
      return 'Approved';

    case 'Ordered':
      return 'Ordered';

    case 'Delivered':
      return 'Delivered';

    case 'Completed':
      return 'Completed';

    case 'Cancelled':
      return 'Cancelled';

    case 'Draft':
    default:
      return 'Draft';
  }
}