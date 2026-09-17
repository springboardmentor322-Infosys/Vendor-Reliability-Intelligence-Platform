 import { useEffect, useState } from "react";

import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";

import "../styles/DeliveryTracking.css";

import {
  FaTruck,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
} from "react-icons/fa";

function DeliveryTracking() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  let loggedInUser = null;

  try {
    loggedInUser = JSON.parse(localStorage.getItem("user"));
  } catch (err) {
    loggedInUser = null;
  }

  const userRole = loggedInUser?.role || "";

  const renderSidebar = () => {
    switch (userRole) {
      case "Administrator":
        return <AdminSidebar />;

      case "Procurement Manager":
        return <ProcurementSidebar />;

      case "Supply Chain Manager":
        return <SupplyChainSidebar />;

      case "Finance Officer":
        return <FinanceSidebar />;

      case "Vendor":
        return <VendorSidebar />;

      case "Auditor":
        return <AuditorSidebar />;

      default:
        return null;
    }
  };

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/deliveries",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch deliveries"
        );
      }

      setDeliveries(data.deliveries || []);
    } catch (err) {
      console.error("Delivery fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const totalDeliveries = deliveries.length;

  const lateDeliveries = deliveries.filter(
    (delivery) =>
      delivery.late_delivery_risk === 1
  ).length;

  const advanceShipping = deliveries.filter(
    (delivery) =>
      delivery.delivery_status === "Advance shipping"
  ).length;

  const lateDelivery = deliveries.filter(
    (delivery) =>
      delivery.delivery_status === "Late delivery"
  ).length;

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const searchText = search.toLowerCase();

      return (
        String(delivery.delivery_id)
          .toLowerCase()
          .includes(searchText) ||
        String(delivery.order_id)
          .toLowerCase()
          .includes(searchText) ||
        String(delivery.delivery_status)
          .toLowerCase()
          .includes(searchText) ||
        String(delivery.shipping_mode)
          .toLowerCase()
          .includes(searchText) ||
        String(delivery.order_country)
          .toLowerCase()
          .includes(searchText) ||
        String(delivery.order_region)
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  return (
    <div>
      {renderSidebar()}

      <main className="delivery-main">

        <div className="delivery-header">

          <div>
            <h1>Delivery Tracking</h1>

            <p>
              Monitor delivery status, shipping progress
              and late delivery risk.
            </p>
          </div>

        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <section className="delivery-summary">

          <div className="delivery-card">

            <div className="delivery-icon total">
              <FaTruck />
            </div>

            <div>
              <h3>{totalDeliveries}</h3>
              <p>Total Deliveries</p>
            </div>

          </div>

          <div className="delivery-card">

            <div className="delivery-icon advance">
              <FaCheckCircle />
            </div>

            <div>
              <h3>{advanceShipping}</h3>
              <p>Advance Shipping</p>
            </div>

          </div>

          <div className="delivery-card">

            <div className="delivery-icon late">
              <FaExclamationTriangle />
            </div>

            <div>
              <h3>{lateDelivery}</h3>
              <p>Late Delivery</p>
            </div>

          </div>

          <div className="delivery-card">

            <div className="delivery-icon risk">
              <FaClock />
            </div>

            <div>
              <h3>{lateDeliveries}</h3>
              <p>Late Delivery Risk</p>
            </div>

          </div>

        </section>

        <section className="delivery-table-card">

          <div className="delivery-table-header">

            <div>

              <h2>
                Delivery Records
              </h2>

              <p>
                Delivery information retrieved from
                PostgreSQL.
              </p>

            </div>

            <div className="delivery-search">

              <FaSearch />

              <input
                type="text"
                placeholder="Search deliveries..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

          </div>

          {loading ? (

            <p className="delivery-message">
              Loading delivery records...
            </p>

          ) : filteredDeliveries.length === 0 ? (

            <p className="delivery-message">
              No delivery records found.
            </p>

          ) : (

            <div className="delivery-table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Delivery ID</th>
                    <th>Order ID</th>
                    <th>Order Date</th>
                    <th>Shipping Date</th>
                    <th>Delivery Status</th>
                    <th>Shipping Mode</th>
                    <th>Risk</th>
                    <th>Region</th>
                    <th>Country</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredDeliveries
                    .slice(0, 100)
                    .map((delivery) => (

                      <tr
                        key={delivery.delivery_id}
                      >

                        <td>
                          DEL-
                          {delivery.delivery_id}
                        </td>

                        <td>
                          {delivery.order_id}
                        </td>

                        <td>
                          {new Date(
                            delivery.order_date
                          ).toLocaleDateString()}
                        </td>

                        <td>
                          {new Date(
                            delivery.shipping_date
                          ).toLocaleDateString()}
                        </td>

                        <td>

                          <span
                            className={`delivery-status ${delivery.delivery_status
                              ?.toLowerCase()
                              .replace(
                                /\s+/g,
                                "-"
                              )}`}
                          >
                            {delivery.delivery_status}
                          </span>

                        </td>

                        <td>
                          {delivery.shipping_mode}
                        </td>

                        <td>

                          {delivery.late_delivery_risk ===
                          1 ? (
                            <span className="risk-high">
                              High Risk
                            </span>
                          ) : (
                            <span className="risk-low">
                              Low Risk
                            </span>
                          )}

                        </td>

                        <td>
                          {delivery.order_region}
                        </td>

                        <td>
                          {delivery.order_country}
                        </td>

                      </tr>

                    ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <section className="delivery-workflow">

          <h2>
            Delivery Tracking Workflow
          </h2>

          <div className="workflow-grid">

            <div className="workflow-step">

              <span>1</span>

              <h3>
                Order Created
              </h3>

              <p>
                Purchase order is created from an
                approved procurement request.
              </p>

            </div>

            <div className="workflow-step">

              <span>2</span>

              <h3>
                Shipping
              </h3>

              <p>
                Vendor ships the ordered products using
                the selected shipping method.
              </p>

            </div>

            <div className="workflow-step">

              <span>3</span>

              <h3>
                Tracking
              </h3>

              <p>
                Delivery status and late-delivery risk
                are monitored.
              </p>

            </div>

            <div className="workflow-step">

              <span>4</span>

              <h3>
                Delivery
              </h3>

              <p>
                Delivery is completed and the order
                lifecycle is updated.
              </p>

            </div>

          </div>

        </section>

      </main>
    </div>
  );
}

export default DeliveryTracking;