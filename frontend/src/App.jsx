 import { Routes, Route } from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import ForgotPassword from "./pages/forgotPassword";
import ResetPassword from "./pages/resetPassword";
import Profile from "./pages/profile";

import AdminDashboard from "./pages/AdminDashboard";
import ProcurementDashboard from "./pages/ProcurementDashboard";
import SupplyChainDashboard from "./pages/SupplyChainDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AuditorDashboard from "./pages/AuditorDashboard";

import Unauthorized from "./pages/Unauthorized";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import VendorManagement from "./pages/VendorManagement";
import VendorPerformance from "./pages/VendorPerformance";
import VendorReliability from "./pages/VendorReliability";
import Invoices from "./pages/Invoices";
import VendorReports from "./pages/VendorReports";
import Reports from "./pages/Reports";
import Procurement from "./pages/Procurement";
import PurchaseOrders from "./pages/PurchaseOrders";
import ContractManagement from "./pages/ContractManagement";
import Analytics from "./pages/Analytics";
import DeliveryTracking from "./pages/DeliveryTracking";
import Communication from "./pages/Communication";
import Notifications from "./pages/Notifications";
import VendorSettings from "./pages/VendorSettings";
import UserManagement from "./pages/UserManagement";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Administrator"]}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Administrator"]}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/procurement-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Procurement Manager"]}>
              <ProcurementDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/supply-chain-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Supply Chain Manager"]}>
              <SupplyChainDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/finance-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Finance Officer"]}>
              <FinanceDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Vendor"]}>
              <VendorDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/auditor-dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Auditor"]}>
              <AuditorDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendors"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Auditor",
              ]}
            >
              <VendorManagement />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/procurement"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Auditor",
              ]}
            >
              <Procurement />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <PurchaseOrders />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/contracts"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <ContractManagement />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <Analytics />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/delivery-tracking"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Supply Chain Manager",
                "Vendor",
              ]}
            >
              <DeliveryTracking />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/deliveries"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Supply Chain Manager",
                "Vendor",
              ]}
            >
              <DeliveryTracking />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/communication"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Auditor",
                "Vendor",
              ]}
            >
              <Communication />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <Notifications />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["Administrator"]}>
              <UserManagement />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor-performance"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <VendorPerformance />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor-reliability"
        element={
          <ProtectedRoute>
            <RoleRoute
              allowedRoles={[
                "Administrator",
                "Procurement Manager",
                "Supply Chain Manager",
                "Finance Officer",
                "Vendor",
                "Auditor",
              ]}
            >
              <VendorReliability />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

 <Route
  path="/invoices"
  element={
    <ProtectedRoute>
      <RoleRoute
        allowedRoles={[
          "Administrator",
          "Procurement Manager",
          "Finance Officer",
          "Vendor",
        ]}
      >
        <Invoices />
      </RoleRoute>
    </ProtectedRoute>
  }
/>

<Route
  path="/admin/reports"
  element={
    <ProtectedRoute>
       <RoleRoute
  allowedRoles={[
    "Administrator","Supply Chain Manager"

    ,
  ]}
>
  <Reports />
</RoleRoute>
    </ProtectedRoute>
  }
/>

<Route
  path="/reports"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["Administrator", "Supply Chain Manager"]}>
        <Reports />
      </RoleRoute>
    </ProtectedRoute>
  }
/>
 

<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <RoleRoute allowedRoles={["Vendor"]}>
        <VendorSettings />
      </RoleRoute>
    </ProtectedRoute>
  }
/>

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />
    </Routes>
  );
}

export default App;