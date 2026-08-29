/**
 * VendorIQ — route definitions.
 * Router lives in main.tsx. Use <Routes> + <Route> only.
 */
import { Routes, Route, Navigate } from 'react-router';
import AppShell from '@/components/layout/AppShell';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Rankings from '@/pages/Rankings';
import VendorList from '@/pages/VendorList';
import VendorAdd from '@/pages/VendorAdd';
import ProcurementList from '@/pages/ProcurementList';
import ProcurementAdd from '@/pages/ProcurementAdd';
import POList from '@/pages/POList';
import POAdd from '@/pages/POAdd';
import ContractList from '@/pages/ContractList';
import ContractAdd from '@/pages/ContractAdd';
import PerformanceAdd from '@/pages/PerformanceAdd';
import Messages from '@/pages/Messages';
import UserManagement from '@/pages/UserManagement';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';

export default function App() {
	return (
		<Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/register" element={<Register />} />
			<Route element={<AppShell />}>
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/rankings" element={<Rankings />} />
				<Route path="/vendors" element={<VendorList />} />
				<Route path="/vendors/add" element={<VendorAdd />} />
				<Route path="/procurement" element={<ProcurementList />} />
				<Route path="/procurement/add" element={<ProcurementAdd />} />
				<Route path="/purchase-orders" element={<POList />} />
				<Route path="/purchase-orders/add" element={<POAdd />} />
				<Route path="/contracts" element={<ContractList />} />
				<Route path="/contracts/add" element={<ContractAdd />} />
				<Route path="/performance/add" element={<PerformanceAdd />} />
				<Route path="/messages" element={<Messages />} />
				<Route path="/notifications" element={<Notifications />} />
				<Route path="/reports" element={<Reports />} />
				<Route path="/users" element={<UserManagement />} />
			</Route>
			<Route path="/" element={<Navigate to="/dashboard" replace />} />
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	);
}
