import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import VendorDashboard from './pages/VendorDashboard'
import VendorManagement from './pages/VendorManagement'
import VendorProfile from './pages/VendorProfile'
import ProcurementDashboard from './pages/ProcurementDashboard'
import PurchaseOrders from './pages/PurchaseOrders'
import VendorPerformance from './pages/VendorPerformance'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import ReportsDashboard from './pages/ReportsDashboard'
import Notifications from './pages/Notifications'
import FinanceDashboard from './pages/FinanceDashboard'
import AuditorDashboard from './pages/AuditorDashboard'
import SupplyChainDashboard from './pages/SupplyChainDashboard'
import ProcurementRequests from './pages/ProcurementRequests'
import Contracts from './pages/Contracts'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/vendor-dashboard" element={<VendorDashboard />} />
              <Route path="/finance-dashboard" element={<FinanceDashboard />} />
              <Route path="/vendor-management" element={<VendorManagement />} />
              <Route path="/my-vendor-profile" element={<VendorProfile />} />
              <Route path="/procurement" element={<ProcurementDashboard />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/vendor-performance" element={<VendorPerformance />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/reports" element={<ReportsDashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/supply-chain" element={<SupplyChainDashboard />} />
              <Route path="/procurement-requests" element={<ProcurementRequests />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/auditor-dashboard" element={<AuditorDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>
          </Route>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
