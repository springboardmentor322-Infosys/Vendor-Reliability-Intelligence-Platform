 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";

import {
  getAdminDashboard,
  getSupplyChainDashboard,
} from "../services/api";

import "../styles/Reports.css";

import {
  FaChartBar,
  FaUsers,
  FaBuilding,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaFileContract,
  FaArrowLeft,
  FaTruck,
} from "react-icons/fa";

export default function Reports() {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("User parsing error:", err);
      }
    }

    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        throw new Error("User session not found.");
      }

      const currentUser = JSON.parse(storedUser);

      let data;

      if (currentUser.role === "Supply Chain Manager") {
        data = await getSupplyChainDashboard();
      } else {
        data = await getAdminDashboard();
      }

      console.log("Reports API Response:", data);

      setDashboard(data?.stats || data || {});
    } catch (err) {
      console.error("Reports error:", err);

      setError(
        err.message || "Failed to load reports"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <h2>Loading Reports...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-error">
        <h2>Unable to load reports</h2>

        <p>{error}</p>

        <button onClick={loadReports}>
          Try Again
        </button>
      </div>
    );
  }

  const isSupplyChain =
    user.role === "Supply Chain Manager";

  const adminTotalUsers =
    Number(dashboard?.totalUsers) || 0;

  const adminActiveVendors =
    Number(dashboard?.activeVendors) || 0;

  const adminProcurementRequests =
    Number(dashboard?.procurementRequests) || 0;

  const adminPurchaseOrders =
    Number(dashboard?.purchaseOrders) || 0;

  const adminComplianceScore =
    Number(dashboard?.complianceScore) || 0;

  const adminOpenRequests =
    Number(dashboard?.openRequests) || 0;

  const supplyDeliveries =
    Number(dashboard?.deliveries?.total) || 0;

  const supplyOnTimeRate =
    Number(
      dashboard?.deliveries?.onTimeDeliveryRate
    ) || 0;

  const supplyOrders =
    Number(dashboard?.purchaseOrders?.total) || 0;

  const supplyFulfillmentRate =
    Number(
      dashboard?.purchaseOrders?.fulfillmentRate
    ) || 0;

  const supplySuppliers =
    Number(dashboard?.suppliers) || 0;

  const supplyContracts =
    Number(dashboard?.contracts) || 0;

  return (
    <div className="reports-layout">

      {isSupplyChain ? (
        <SupplyChainSidebar />
      ) : (
        <AdminSidebar />
      )}

      <main className="reports-main">

        <div className="reports-header">

          <div>
            <h1>Reports & Exports</h1>

            <p>
              View centralized business and
              operational statistics.
            </p>
          </div>

          <button
            className="reports-back-button"
            onClick={() =>
              navigate(
                isSupplyChain
                  ? "/supply-chain-dashboard"
                  : "/admin/dashboard"
              )
            }
          >
            <FaArrowLeft />
            Dashboard
          </button>

        </div>

        <section className="report-title-card">

          <div className="report-title-icon">
            <FaChartBar />
          </div>

          <div>
            <h2>
              VendorIQ Business Report
            </h2>

            <p>
              Current platform statistics
              generated from the system database.
            </p>
          </div>

        </section>

        {isSupplyChain ? (

          <>

            <section className="report-grid">

              <div className="report-card">
                <FaTruck />

                <div>
                  <h3>
                    {supplyDeliveries}
                  </h3>

                  <p>
                    Total Deliveries
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaChartBar />

                <div>
                  <h3>
                    {supplyOnTimeRate}%
                  </h3>

                  <p>
                    On-Time Delivery Rate
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaFileInvoiceDollar />

                <div>
                  <h3>
                    {supplyOrders}
                  </h3>

                  <p>
                    Purchase Orders
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaClipboardList />

                <div>
                  <h3>
                    {supplyFulfillmentRate}%
                  </h3>

                  <p>
                    Fulfillment Rate
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaBuilding />

                <div>
                  <h3>
                    {supplySuppliers}
                  </h3>

                  <p>
                    Approved Suppliers
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaFileContract />

                <div>
                  <h3>
                    {supplyContracts}
                  </h3>

                  <p>
                    Contracts
                  </p>
                </div>
              </div>

            </section>

            <section className="report-summary">

              <h2>
                Supply Chain Report Summary
              </h2>

              <div className="summary-row">
                <span>
                  Total Deliveries
                </span>

                <strong>
                  {supplyDeliveries}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  On-Time Delivery Rate
                </span>

                <strong>
                  {supplyOnTimeRate}%
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Purchase Orders
                </span>

                <strong>
                  {supplyOrders}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Fulfillment Rate
                </span>

                <strong>
                  {supplyFulfillmentRate}%
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Approved Suppliers
                </span>

                <strong>
                  {supplySuppliers}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Contracts
                </span>

                <strong>
                  {supplyContracts}
                </strong>
              </div>

            </section>

          </>

        ) : (

          <>

            <section className="report-grid">

              <div className="report-card">
                <FaUsers />

                <div>
                  <h3>
                    {adminTotalUsers}
                  </h3>

                  <p>
                    Total Users
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaBuilding />

                <div>
                  <h3>
                    {adminActiveVendors}
                  </h3>

                  <p>
                    Active Vendors
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaClipboardList />

                <div>
                  <h3>
                    {adminProcurementRequests}
                  </h3>

                  <p>
                    Procurement Requests
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaFileInvoiceDollar />

                <div>
                  <h3>
                    {adminPurchaseOrders}
                  </h3>

                  <p>
                    Purchase Orders
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaFileContract />

                <div>
                  <h3>
                    {adminComplianceScore}%
                  </h3>

                  <p>
                    Contract Compliance
                  </p>
                </div>
              </div>

              <div className="report-card">
                <FaClipboardList />

                <div>
                  <h3>
                    {adminOpenRequests}
                  </h3>

                  <p>
                    Open Requests
                  </p>
                </div>
              </div>

            </section>

            <section className="report-summary">

              <h2>
                Report Summary
              </h2>

              <div className="summary-row">
                <span>
                  Registered Users
                </span>

                <strong>
                  {adminTotalUsers}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Active Vendors
                </span>

                <strong>
                  {adminActiveVendors}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Procurement Requests
                </span>

                <strong>
                  {adminProcurementRequests}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Purchase Orders
                </span>

                <strong>
                  {adminPurchaseOrders}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Open Procurement Requests
                </span>

                <strong>
                  {adminOpenRequests}
                </strong>
              </div>

              <div className="summary-row">
                <span>
                  Compliance Score
                </span>

                <strong>
                  {adminComplianceScore}%
                </strong>
              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}