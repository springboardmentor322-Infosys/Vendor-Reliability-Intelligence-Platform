 import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import "../styles/PurchaseOrders.css";

import {
  FaFileInvoice,
  FaClock,
  FaCheckCircle,
  FaTruck,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaPaperPlane,
  FaBan,
  FaThumbsUp,
  FaBoxOpen,
} from "react-icons/fa";

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageLimit = 20;

  const [statusCounts, setStatusCounts] = useState({
    totalRecords: 0,
    pendingCount: 0,
    issuedCount: 0,
    acceptedCount: 0,
    fulfilledCount: 0,
    cancelledCount: 0,
  });

  const [formData, setFormData] = useState({
    vendor_id: "",
    order_amount: "",
    order_date: "",
    delivery_date: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getUserRole = () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return "";
      }

      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      return payload.role || "";
    } catch (err) {
      console.error("Unable to read user role:", err);
      return "";
    }
  };

  const userRole = getUserRole();

  const isAdministrator = userRole === "Administrator";
  const isProcurementManager =
    userRole === "Procurement Manager";
  const isVendor = userRole === "Vendor";

  const canCreate =
    isAdministrator || isProcurementManager;

  const canEdit =
    isAdministrator || isProcurementManager;

  const canDelete = isAdministrator;

  const getRoleSidebar = () => {
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

      default:
        return null;
    }
  };

  const fetchPurchaseOrders = async (page = currentPage) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/purchase-orders?page=${page}&limit=${pageLimit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch purchase orders"
        );
      }

      setPurchaseOrders(data.purchaseOrders || []);

      setCurrentPage(
        data.pagination?.currentPage || page
      );

      setTotalPages(
        data.pagination?.totalPages || 1
      );

      setStatusCounts({
        totalRecords:
          data.summary?.totalRecords || 0,
        pendingCount:
          data.summary?.pendingCount || 0,
        issuedCount:
          data.summary?.issuedCount || 0,
        acceptedCount:
          data.summary?.acceptedCount || 0,
        fulfilledCount:
          data.summary?.fulfilledCount || 0,
        cancelledCount:
          data.summary?.cancelledCount || 0,
      });
    } catch (err) {
      console.error(
        "Purchase orders fetch error:",
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      setVendorsLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/vendors",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch vendors"
        );
      }

      setVendors(data.vendors || []);
    } catch (err) {
      console.error("Vendors fetch error:", err);
    } finally {
      setVendorsLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders(1);
    fetchVendors();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openCreateForm = () => {
    setEditingOrder(null);

    setFormData({
      vendor_id: "",
      order_amount: "",
      order_date: "",
      delivery_date: "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const handleEdit = (order) => {
    if (!canEdit) {
      return;
    }

    setEditingOrder(order);

    setFormData({
      vendor_id: order.vendor_id || "",
      order_amount: order.order_amount || "",
      order_date: order.order_date
        ? order.order_date.substring(0, 10)
        : "",
      delivery_date: order.delivery_date
        ? order.delivery_date.substring(0, 10)
        : "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOrder(null);

    setFormData({
      vendor_id: "",
      order_amount: "",
      order_date: "",
      delivery_date: "",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/purchase-orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_id: Number(formData.vendor_id),
            order_amount: Number(
              formData.order_amount
            ),
            order_date: formData.order_date,
            delivery_date:
              formData.delivery_date || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create purchase order"
        );
      }

      setMessage(
        "Purchase order created successfully!"
      );

      closeForm();

      fetchPurchaseOrders(currentPage);
    } catch (err) {
      console.error(
        "Create purchase order error:",
        err
      );

      setError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingOrder) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/purchase-orders/${editingOrder.po_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_id: Number(formData.vendor_id),
            order_amount: Number(
              formData.order_amount
            ),
            order_date: formData.order_date,
            delivery_date:
              formData.delivery_date || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update purchase order"
        );
      }

      setMessage(
        "Purchase order updated successfully!"
      );

      closeForm();

      fetchPurchaseOrders(currentPage);
    } catch (err) {
      console.error(
        "Update purchase order error:",
        err
      );

      setError(err.message);
    }
  };

  const deletePurchaseOrder = async (id) => {
    if (!canDelete) {
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this purchase order?"
    );

    if (!confirmDelete) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/purchase-orders/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete purchase order"
        );
      }

      setMessage(
        "Purchase order deleted successfully!"
      );

      if (
        purchaseOrders.length === 1 &&
        currentPage > 1
      ) {
        fetchPurchaseOrders(currentPage - 1);
      } else {
        fetchPurchaseOrders(currentPage);
      }
    } catch (err) {
      console.error(
        "Delete purchase order error:",
        err
      );

      setError(err.message);
    }
  };

  const updateStatus = async (id, status) => {
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/purchase-orders/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update purchase order status"
        );
      }

      setMessage(
        `PO-${id} status changed to ${status}.`
      );

      setViewingOrder(null);

      fetchPurchaseOrders(currentPage);
    } catch (err) {
      console.error(
        "Update purchase order status error:",
        err
      );

      setError(err.message);
    }
  };

  const handleWorkflowAction = (order) => {
    const { po_id, status } = order;

    if (
      isProcurementManager &&
      status === "Pending"
    ) {
      updateStatus(po_id, "Issued");
      return;
    }

    if (
      isVendor &&
      status === "Issued"
    ) {
      updateStatus(po_id, "Accepted");
      return;
    }

    if (
      isVendor &&
      status === "Accepted"
    ) {
      updateStatus(po_id, "Fulfilled");
      return;
    }
  };

  const handleCancelOrder = (order) => {
    if (!isProcurementManager) {
      return;
    }

    const confirmCancel = window.confirm(
      `Cancel PO-${order.po_id}?`
    );

    if (!confirmCancel) {
      return;
    }

    updateStatus(order.po_id, "Cancelled");
  };

  const getWorkflowAction = (order) => {
    if (
      isProcurementManager &&
      order.status === "Pending"
    ) {
      return {
        label: "Issue PO",
        icon: <FaPaperPlane />,
        className: "issue-btn",
        action: () =>
          handleWorkflowAction(order),
      };
    }

    if (
      isVendor &&
      order.status === "Issued"
    ) {
      return {
        label: "Accept PO",
        icon: <FaThumbsUp />,
        className: "accept-btn",
        action: () =>
          handleWorkflowAction(order),
      };
    }

    if (
      isVendor &&
      order.status === "Accepted"
    ) {
      return {
        label: "Mark Fulfilled",
        icon: <FaBoxOpen />,
        className: "fulfill-btn",
        action: () =>
          handleWorkflowAction(order),
      };
    }

    return null;
  };

  const handleView = (order) => {
    setViewingOrder(order);
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) =>
        Number(item.vendor_id) === Number(vendorId)
    );

    if (!vendor) {
      return `Vendor #${vendorId}`;
    }

    return (
      vendor.company_name ||
      vendor.vendor_name ||
      vendor.name ||
      `Vendor #${vendorId}`
    );
  };

  const filteredOrders = purchaseOrders.filter(
    (order) => {
      const vendorName = getVendorName(
        order.vendor_id
      );

      const search =
        searchTerm.toLowerCase();

      return (
        `PO-${order.po_id}`
          .toLowerCase()
          .includes(search) ||
        vendorName
          .toLowerCase()
          .includes(search) ||
        String(order.vendor_id)
          .toLowerCase()
          .includes(search) ||
        String(order.status || "")
          .toLowerCase()
          .includes(search)
      );
    }
  );

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN"
    );
  };

  const getStatusClass = (status) => {
    return (status || "Pending").toLowerCase();
  };

  return (
    <div className="purchase-orders-layout">
      <AuditorSidebar />

      <main className="purchase-orders-main">
        <div className="purchase-orders-header">
          <div>
            <h1>Purchase Orders</h1>

            <p>
              Create, manage and track purchase
              orders.
            </p>

            <span className="current-role">
              Logged in as: {userRole || "User"}
            </span>
          </div>

          {canCreate && (
            <button
              className="create-po-btn"
              onClick={openCreateForm}
            >
              <FaPlus />
              Create Purchase Order
            </button>
          )}
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <section className="purchase-orders-summary">
          <div className="purchase-order-card">
            <div className="purchase-order-icon total">
              <FaFileInvoice />
            </div>

            <div>
              <h3>
                {statusCounts.totalRecords}
              </h3>
              <p>Total Orders</p>
            </div>
          </div>

          <div className="purchase-order-card">
            <div className="purchase-order-icon pending">
              <FaClock />
            </div>

            <div>
              <h3>
                {statusCounts.pendingCount}
              </h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="purchase-order-card">
            <div className="purchase-order-icon issued">
              <FaFileInvoice />
            </div>

            <div>
              <h3>
                {statusCounts.issuedCount}
              </h3>
              <p>Issued</p>
            </div>
          </div>

          <div className="purchase-order-card">
            <div className="purchase-order-icon accepted">
              <FaCheckCircle />
            </div>

            <div>
              <h3>
                {statusCounts.acceptedCount}
              </h3>
              <p>Accepted</p>
            </div>
          </div>

          <div className="purchase-order-card">
            <div className="purchase-order-icon fulfilled">
              <FaTruck />
            </div>

            <div>
              <h3>
                {statusCounts.fulfilledCount}
              </h3>
              <p>Fulfilled</p>
            </div>
          </div>

          <div className="purchase-order-card">
            <div className="purchase-order-icon cancelled">
              <FaTrash />
            </div>

            <div>
              <h3>
                {statusCounts.cancelledCount}
              </h3>
              <p>Cancelled</p>
            </div>
          </div>
        </section>

        <section className="purchase-orders-table-card">
          <div className="purchase-orders-table-header">
            <div>
              <h2>
                Purchase Order Records
              </h2>

              <p>
                Purchase orders retrieved from
                PostgreSQL.
              </p>
            </div>

            <div className="purchase-orders-search">
              <FaSearch />

              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>
          </div>

          {loading ? (
            <p className="purchase-orders-message">
              Loading purchase orders...
            </p>
          ) : filteredOrders.length === 0 ? (
            <p className="purchase-orders-message">
              {searchTerm
                ? "No purchase orders match your search."
                : "No purchase orders found."}
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>PO ID</th>
                    <th>Vendor</th>
                    <th>Amount</th>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Status</th>
                    <th>Workflow</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const workflowAction =
                      getWorkflowAction(order);

                    return (
                      <tr key={order.po_id}>
                        <td>
                          <strong>
                            PO-{order.po_id}
                          </strong>
                        </td>

                        <td>
                          <div className="vendor-cell">
                            <strong>
                              {getVendorName(
                                order.vendor_id
                              )}
                            </strong>

                            <small>
                              Vendor #
                              {order.vendor_id}
                            </small>
                          </div>
                        </td>

                        <td>
                          ₹
                          {formatAmount(
                            order.order_amount
                          )}
                        </td>

                        <td>
                          {formatDate(
                            order.order_date
                          )}
                        </td>

                        <td>
                          {formatDate(
                            order.delivery_date
                          )}
                        </td>

                        <td>
                          <span
                            className={`po-status-badge ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status ||
                              "Pending"}
                          </span>
                        </td>

                        <td>
                          <div className="workflow-actions">
                            {workflowAction && (
                              <button
                                type="button"
                                className={`workflow-action-btn ${workflowAction.className}`}
                                onClick={
                                  workflowAction.action
                                }
                              >
                                {
                                  workflowAction.icon
                                }

                                {
                                  workflowAction.label
                                }
                              </button>
                            )}

                            {isProcurementManager &&
                              [
                                "Pending",
                                "Issued",
                                "Accepted",
                              ].includes(
                                order.status
                              ) && (
                                <button
                                  type="button"
                                  className="workflow-action-btn cancel-workflow-btn"
                                  onClick={() =>
                                    handleCancelOrder(
                                      order
                                    )
                                  }
                                >
                                  <FaBan />
                                  Cancel
                                </button>
                              )}

                            {!workflowAction &&
                              !(
                                isProcurementManager &&
                                [
                                  "Pending",
                                  "Issued",
                                  "Accepted",
                                ].includes(
                                  order.status
                                )
                              ) && (
                                <span className="no-action">
                                  No action
                                </span>
                              )}
                          </div>
                        </td>

                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-btn"
                              title="View Purchase Order"
                              onClick={() =>
                                handleView(order)
                              }
                            >
                              <FaEye />
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                className="edit-btn"
                                title="Edit Purchase Order"
                                onClick={() =>
                                  handleEdit(order)
                                }
                              >
                                <FaEdit />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                className="delete-btn"
                                title="Delete Purchase Order"
                                onClick={() =>
                                  deletePurchaseOrder(
                                    order.po_id
                                  )
                                }
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="purchase-orders-pagination">
              <button
                type="button"
                onClick={() =>
                  fetchPurchaseOrders(
                    currentPage - 1
                  )
                }
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <span>
                Page {currentPage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  fetchPurchaseOrders(
                    currentPage + 1
                  )
                }
                disabled={
                  currentPage === totalPages
                }
              >
                Next
              </button>
            </div>
          )}
        </section>

        <section className="purchase-order-workflow">
          <h2>Purchase Order Workflow</h2>

          <div className="workflow-grid">
            <div className="workflow-step">
              <span>1</span>

              <h3>Pending</h3>

              <p>
                An approved procurement request
                creates a purchase order in
                pending status.
              </p>
            </div>

            <div className="workflow-step">
              <span>2</span>

              <h3>Issue PO</h3>

              <p>
                The Procurement Manager issues
                the purchase order to the vendor.
              </p>
            </div>

            <div className="workflow-step">
              <span>3</span>

              <h3>Vendor Acceptance</h3>

              <p>
                The vendor accepts the issued
                purchase order before processing it.
              </p>
            </div>

            <div className="workflow-step">
              <span>4</span>

              <h3>Fulfillment</h3>

              <p>
                The vendor fulfills the accepted
                order and marks it fulfilled.
              </p>
            </div>
          </div>
        </section>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <div className="purchase-order-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingOrder
                    ? "Edit Purchase Order"
                    : "Create Purchase Order"}
                </h2>

                <p>
                  {editingOrder
                    ? "Update the purchase order details. Status is controlled by the workflow."
                    : "Enter the purchase order details."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                editingOrder
                  ? handleUpdate
                  : handleCreate
              }
            >
              <div className="form-group">
                <label>Vendor</label>

                <select
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                  required
                  disabled={vendorsLoading}
                >
                  <option value="">
                    {vendorsLoading
                      ? "Loading vendors..."
                      : "Select Vendor"}
                  </option>

                  {vendors.map((vendor) => (
                    <option
                      key={vendor.vendor_id}
                      value={vendor.vendor_id}
                    >
                      {vendor.company_name ||
                        vendor.vendor_name ||
                        vendor.name ||
                        `Vendor #${vendor.vendor_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Order Amount</label>

                <input
                  type="number"
                  name="order_amount"
                  placeholder="Example: 150000"
                  value={formData.order_amount}
                  onChange={handleChange}
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Order Date</label>

                <input
                  type="date"
                  name="order_date"
                  value={formData.order_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Delivery Date</label>

                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleChange}
                  min={
                    formData.order_date ||
                    undefined
                  }
                />
              </div>

              {editingOrder && (
                <div className="workflow-info">
                  <strong>
                    Status: {editingOrder.status}
                  </strong>

                  <span>
                    Status changes are performed
                    through the procurement workflow.
                  </span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-po-btn"
                >
                  {editingOrder
                    ? "Save Changes"
                    : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingOrder && (
        <div className="modal-overlay">
          <div className="purchase-order-view-modal">
            <div className="modal-header">
              <div>
                <h2>
                  Purchase Order Details
                </h2>

                <p>
                  PO-{viewingOrder.po_id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setViewingOrder(null)
                }
              >
                ×
              </button>
            </div>

            <div className="po-details">
              <div className="detail-item">
                <span>
                  Purchase Order ID
                </span>

                <strong>
                  PO-{viewingOrder.po_id}
                </strong>
              </div>

              <div className="detail-item">
                <span>Vendor</span>

                <strong>
                  {getVendorName(
                    viewingOrder.vendor_id
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>Vendor ID</span>

                <strong>
                  {viewingOrder.vendor_id}
                </strong>
              </div>

              <div className="detail-item">
                <span>Order Amount</span>

                <strong>
                  ₹
                  {formatAmount(
                    viewingOrder.order_amount
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>Order Date</span>

                <strong>
                  {formatDate(
                    viewingOrder.order_date
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>Delivery Date</span>

                <strong>
                  {formatDate(
                    viewingOrder.delivery_date
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>Status</span>

                <strong
                  className={`detail-status ${getStatusClass(
                    viewingOrder.status
                  )}`}
                >
                  {viewingOrder.status}
                </strong>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  setViewingOrder(null)
                }
              >
                Close
              </button>

              {getWorkflowAction(
                viewingOrder
              ) && (
                <button
                  type="button"
                  className={`save-po-btn ${getWorkflowAction(
                    viewingOrder
                  ).className}`}
                  onClick={() =>
                    getWorkflowAction(
                      viewingOrder
                    ).action()
                  }
                >
                  {
                    getWorkflowAction(
                      viewingOrder
                    ).icon
                  }

                  {
                    getWorkflowAction(
                      viewingOrder
                    ).label
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;