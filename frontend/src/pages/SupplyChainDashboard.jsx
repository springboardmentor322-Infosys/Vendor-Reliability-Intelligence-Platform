 import { useEffect, useState } from "react";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import { getSupplyChainDashboard } from "../services/api";

import {
  FaTruck,
  FaUsers,
  FaClipboardList,
  FaChartLine,
  FaFileContract,
  FaClock,
} from "react-icons/fa";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import "../styles/SupplyChainDashboard.css";

function SupplyChainDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const data = await getSupplyChainDashboard();

      setDashboard(data.stats);
      setError("");
    } catch (err) {
      console.error(
        "Supply Chain dashboard error:",
        err
      );

      setError(
        err.message || "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="supply-dashboard-loading">
        Loading Supply Chain Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="supply-dashboard-error">
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>

        <button onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const purchaseOrders =
    dashboard.purchaseOrders || {};

  const deliveries =
    dashboard.deliveries || {};

  const totalOrders =
    Number(purchaseOrders.total) || 0;

  const pendingOrders =
    Number(purchaseOrders.pending) || 0;

  const fulfilledOrders =
    Number(purchaseOrders.fulfilled) || 0;

  const acceptedOrders =
    Number(purchaseOrders.accepted) || 0;

  const cancelledOrders =
    Number(purchaseOrders.cancelled) || 0;

  const fulfillmentRate =
    Number(purchaseOrders.fulfillmentRate) || 0;

  const totalDeliveries =
    Number(deliveries.total) || 0;

  const advanceShipping =
    Number(deliveries.advanceShipping) || 0;

  const lateDelivery =
    Number(deliveries.lateDelivery) || 0;

  const onTimeDelivery =
    Number(deliveries.onTimeDelivery) || 0;

  const onTimeDeliveryRate =
    Number(deliveries.onTimeDeliveryRate) || 0;

  const suppliers =
    Number(dashboard.suppliers) || 0;

  const contracts =
    Number(dashboard.contracts) || 0;

  const purchaseOrderStatus =
    dashboard.purchaseOrderStatus || [];

  const deliveryStatus =
    dashboard.deliveryStatus || [];

  const shippingModes =
    dashboard.shippingModes || [];

  const regionalDeliveries =
    dashboard.regionalDeliveries || [];

  const deliveryPieData = deliveryStatus.map(
    (item) => ({
      name: item.status,
      value: Number(item.count) || 0,
    })
  );

  const purchaseOrderChartData =
    purchaseOrderStatus.map((item) => ({
      status: item.status,
      count: Number(item.count) || 0,
    }));

  const shippingModeChartData =
    shippingModes.map((item) => ({
      mode: item.mode,
      count: Number(item.count) || 0,
    }));

  const regionalChartData =
    regionalDeliveries.map((item) => ({
      region: item.region,
      deliveries: Number(item.deliveries) || 0,
    }));

  const PIE_COLORS = [
    "#4f46e5",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
  ];

  return (
    <div className="supply-dashboard-layout">

      <SupplyChainSidebar />

      <main className="supply-dashboard-main">

        {/* HEADER */}

        <header className="supply-dashboard-header">

          <div>
            <h1>
              Supply Chain Manager Dashboard
            </h1>

            <p>
              Vendor Reliability Intelligence Platform
            </p>
          </div>

          <div className="supply-dashboard-profile">

            <div className="profile-avatar">
              {user.full_name
                ? user.full_name
                    .charAt(0)
                    .toUpperCase()
                : "S"}
            </div>

            <div>
              <strong>
                {user.full_name ||
                  "Supply Chain Manager"}
              </strong>

              <span>
                {user.role ||
                  "Supply Chain Manager"}
              </span>
            </div>

          </div>

        </header>

        {/* WELCOME */}

        <section className="supply-dashboard-welcome">

          <div>
            <h2>
              Welcome Back 👋
            </h2>

            <p>
              Monitor suppliers, purchase orders,
              deliveries and supply chain performance
              from one centralized dashboard.
            </p>
          </div>

          <div className="welcome-metric">

            <span>
              On-Time Delivery
            </span>

            <strong>
              {onTimeDeliveryRate}%
            </strong>

          </div>

        </section>

        {/* KPI CARDS */}

        <section className="supply-dashboard-stats">

          <div className="supply-stat-card">

            <div className="supply-stat-icon purple">
              <FaClipboardList />
            </div>

            <div>
              <h3>
                {totalOrders.toLocaleString("en-IN")}
              </h3>

              <p>
                Purchase Orders
              </p>
            </div>

          </div>

          <div className="supply-stat-card">

            <div className="supply-stat-icon green">
              <FaUsers />
            </div>

            <div>
              <h3>
                {suppliers.toLocaleString("en-IN")}
              </h3>

              <p>
                Active Suppliers
              </p>
            </div>

          </div>

          <div className="supply-stat-card">

            <div className="supply-stat-icon orange">
              <FaTruck />
            </div>

            <div>
              <h3>
                {pendingOrders.toLocaleString("en-IN")}
              </h3>

              <p>
                Pending Fulfillment
              </p>
            </div>

          </div>

          <div className="supply-stat-card">

            <div className="supply-stat-icon blue">
              <FaChartLine />
            </div>

            <div>
              <h3>
                {fulfillmentRate}%
              </h3>

              <p>
                Fulfillment Rate
              </p>
            </div>

          </div>

          <div className="supply-stat-card">

            <div className="supply-stat-icon teal">
              <FaClock />
            </div>

            <div>
              <h3>
                {onTimeDeliveryRate}%
              </h3>

              <p>
                On-Time Delivery
              </p>
            </div>

          </div>

          <div className="supply-stat-card">

            <div className="supply-stat-icon violet">
              <FaFileContract />
            </div>

            <div>
              <h3>
                {contracts.toLocaleString("en-IN")}
              </h3>

              <p>
                Active Contracts
              </p>
            </div>

          </div>

        </section>

        {/* CHART ROW 1 */}

        <section className="supply-chart-grid">

          <div className="supply-chart-card large">

            <div className="chart-header">

              <div>
                <h2>
                  Purchase Order Status
                </h2>

                <p>
                  Current purchase order distribution
                </p>
              </div>

              <FaClipboardList />

            </div>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={purchaseOrderChartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 50,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="status"
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    name="Purchase Orders"
                    fill="#6846e5"
                    radius={[7, 7, 0, 0]}
                  />

                </BarChart>
              </ResponsiveContainer>

            </div>

            <div className="chart-summary">

              <span>
                Fulfilled:
                <strong>
                  {fulfilledOrders.toLocaleString("en-IN")}
                </strong>
              </span>

              <span>
                Pending:
                <strong>
                  {pendingOrders.toLocaleString("en-IN")}
                </strong>
              </span>

              <span>
                Accepted:
                <strong>
                  {acceptedOrders.toLocaleString("en-IN")}
                </strong>
              </span>

              <span>
                Cancelled:
                <strong>
                  {cancelledOrders.toLocaleString("en-IN")}
                </strong>
              </span>

            </div>

          </div>

          <div className="supply-chart-card">

            <div className="chart-header">

              <div>
                <h2>
                  Delivery Performance
                </h2>

                <p>
                  Delivery status distribution
                </p>
              </div>

              <FaTruck />

            </div>

            <div className="chart-container pie">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={deliveryPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="48%"
                    outerRadius={105}
                    label={({ value }) =>
                      value.toLocaleString("en-IN")
                    }
                  >

                    {deliveryPieData.map(
                      (_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

            <div className="delivery-summary">

              <div>
                <span>On Time</span>
                <strong>
                  {onTimeDelivery.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Late</span>
                <strong>
                  {lateDelivery.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Advance</span>
                <strong>
                  {advanceShipping.toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  {totalDeliveries.toLocaleString("en-IN")}
                </strong>
              </div>

            </div>

          </div>

        </section>

        {/* CHART ROW 2 */}

        <section className="supply-chart-grid">

          <div className="supply-chart-card">

            <div className="chart-header">

              <div>
                <h2>
                  Shipping Mode Analysis
                </h2>

                <p>
                  Deliveries by shipping mode
                </p>
              </div>

              <FaTruck />

            </div>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={shippingModeChartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 30,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="mode"
                  />

                  <YAxis />

                  <Tooltip />

                  <Bar
                    dataKey="count"
                    name="Deliveries"
                    fill="#22a06b"
                    radius={[7, 7, 0, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          <div className="supply-chart-card">

            <div className="chart-header">

              <div>
                <h2>
                  Regional Delivery Analysis
                </h2>

                <p>
                  Delivery volume by region
                </p>
              </div>

              <FaChartLine />

            </div>

            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={regionalChartData}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 25,
                    left: 35,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                  />

                  <YAxis
                    type="category"
                    dataKey="region"
                    width={90}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="deliveries"
                    name="Deliveries"
                    fill="#4f46e5"
                    radius={[0, 7, 7, 0]}
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </section>

        {/* SUPPLY CHAIN SUMMARY */}

        <section className="supply-summary-grid">

          <div className="supply-summary-card">

            <h2>
              Purchase Order Overview
            </h2>

            <div className="summary-row">
              <span>Total Orders</span>
              <strong>
                {totalOrders.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Fulfilled</span>
              <strong>
                {fulfilledOrders.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Pending</span>
              <strong>
                {pendingOrders.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Accepted</span>
              <strong>
                {acceptedOrders.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Cancelled</span>
              <strong>
                {cancelledOrders.toLocaleString("en-IN")}
              </strong>
            </div>

          </div>

          <div className="supply-summary-card">

            <h2>
              Delivery Overview
            </h2>

            <div className="summary-row">
              <span>Total Deliveries</span>
              <strong>
                {totalDeliveries.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>On-Time</span>
              <strong>
                {onTimeDelivery.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Late</span>
              <strong>
                {lateDelivery.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>Advance Shipping</span>
              <strong>
                {advanceShipping.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="summary-row">
              <span>On-Time Rate</span>
              <strong>
                {onTimeDeliveryRate}%
              </strong>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default SupplyChainDashboard;