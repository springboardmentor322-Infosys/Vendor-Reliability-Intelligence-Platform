import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import VendorSidebar from "../components/VendorSidebar";
import "../styles/Communication.css";

import {
  FaComments,
  FaPlus,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaReply,
  FaTimes,
} from "react-icons/fa";

const API_URL = "http://localhost:5000/api";

const initialFormData = {
  vendor_id: "",
  entity_type: "",
  entity_id: "",
  communication_type: "Email",
  subject: "",
  message: "",
  communication_date: "",
  communication_status: "Pending",
};

function Communication() {
  const [communications, setCommunications] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingCommunication, setViewingCommunication] =
    useState(null);
  const [editingCommunication, setEditingCommunication] =
    useState(null);
  const [viewingThread, setViewingThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(initialFormData);

  const [replyData, setReplyData] = useState({
    message: "",
    communication_type: "Message",
  });

  const getToken = () => localStorage.getItem("token");

  const getUserRole = () => {
    const token = getToken();

    if (!token) {
      return "";
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));

      return (
        payload.role ||
        payload.role_name ||
        payload.user_role ||
        ""
      );
    } catch (err) {
      console.error("Unable to read user role from token:", err);
      return "";
    }
  };

  const renderRoleSidebar = () => {
    const role = getUserRole()
      .toString()
      .trim()
      .toLowerCase();

    if (
      role === "administrator" ||
      role === "admin"
    ) {
      return <AdminSidebar />;
    }

    if (
      role === "procurement manager" ||
      role === "procurement_manager" ||
      role === "procurementmanager"
    ) {
      return <ProcurementSidebar />;
    }

    if (
      role === "supply chain manager" ||
      role === "supply_chain_manager" ||
      role === "supplychainmanager"
    ) {
      return <SupplyChainSidebar />;
    }

    if (
      role === "finance officer" ||
      role === "finance_officer" ||
      role === "financeofficer"
    ) {
      return <FinanceSidebar />;
    }

    if (role === "vendor") {
      return <VendorSidebar />;
    }

    if (role === "auditor") {
      return <AuditorSidebar />;
    }

    return <VendorSidebar />;
  };

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/communications`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch communications"
        );
      }

      setCommunications(data.communications || []);
    } catch (err) {
      console.error("Communication fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/vendors`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error("Vendor fetch error:", err);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await fetch(`${API_URL}/contracts`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setContracts(data.contracts || []);
      }
    } catch (err) {
      console.error("Contract fetch error:", err);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(
        `${API_URL}/purchase-orders`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPurchaseOrders(
          data.purchaseOrders ||
            data.purchase_orders ||
            data.orders ||
            []
        );
      }
    } catch (err) {
      console.error("Purchase order fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCommunications();
    fetchVendors();
    fetchContracts();
    fetchPurchaseOrders();
  }, []);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleEntityTypeChange = (e) => {
    const entityType = e.target.value;

    setFormData((previous) => ({
      ...previous,
      entity_type: entityType,
      entity_id: "",
    }));
  };

  const openCreateForm = () => {
    setEditingCommunication(null);

    setFormData({
      ...initialFormData,
      communication_date: new Date()
        .toISOString()
        .slice(0, 16),
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const handleEdit = (communication) => {
    let entityType = communication.entity_type || "";
    let entityId = communication.entity_id || "";

    if (!entityType && communication.contract_id) {
      entityType = "CONTRACT";
      entityId = communication.contract_id;
    }

    setEditingCommunication(communication);

    setFormData({
      vendor_id: communication.vendor_id || "",
      entity_type: entityType,
      entity_id: entityId || "",
      communication_type:
        communication.communication_type || "Email",
      subject: communication.subject || "",
      message: communication.message || "",
      communication_date: communication.communication_date
        ? String(communication.communication_date).slice(0, 16)
        : "",
      communication_status:
        communication.communication_status || "Pending",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCommunication(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!formData.vendor_id) {
      setError("Please select a vendor.");
      return;
    }

    if (!formData.subject.trim()) {
      setError("Subject is required.");
      return;
    }

    if (!formData.message.trim()) {
      setError("Message is required.");
      return;
    }

    if (formData.entity_type && !formData.entity_id) {
      setError(
        `Please select a ${
          formData.entity_type === "PO"
            ? "purchase order"
            : "contract"
        }.`
      );
      return;
    }

    try {
      const url = editingCommunication
        ? `${API_URL}/communications/${editingCommunication.communication_id}`
        : `${API_URL}/communications`;

      const response = await fetch(url, {
        method: editingCommunication ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          vendor_id: Number(formData.vendor_id),

          contract_id:
            formData.entity_type === "CONTRACT"
              ? Number(formData.entity_id)
              : null,

          communication_type:
            formData.communication_type,

          subject: formData.subject.trim(),

          message: formData.message.trim(),

          communication_date:
            formData.communication_date || null,

          communication_status:
            formData.communication_status,

          entity_type:
            formData.entity_type || null,

          entity_id: formData.entity_id
            ? Number(formData.entity_id)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save communication"
        );
      }

      closeForm();

      setMessage(
        editingCommunication
          ? "Communication updated successfully."
          : "Communication created successfully."
      );

      await fetchCommunications();
    } catch (err) {
      console.error("Communication save error:", err);
      setError(err.message);
    }
  };

  const deleteCommunication = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this communication?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/communications/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete communication"
        );
      }

      setMessage("Communication deleted successfully.");

      if (
        viewingCommunication?.communication_id === id
      ) {
        setViewingCommunication(null);
      }

      if (
        viewingThread?.communication_id === id
      ) {
        setViewingThread(null);
        setThreadMessages([]);
      }

      await fetchCommunications();
    } catch (err) {
      console.error("Communication delete error:", err);
      setError(err.message);
    }
  };

  const updateStatus = async (communication, status) => {
    try {
      const response = await fetch(
        `${API_URL}/communications/${communication.communication_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            communication_status: status,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update status"
        );
      }

      setMessage(
        "Communication status updated successfully."
      );

      await fetchCommunications();

      if (viewingThread) {
        await fetchThreadMessages(viewingThread);
      }
    } catch (err) {
      console.error("Status update error:", err);
      setError(err.message);
    }
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(
      (item) =>
        Number(item.vendor_id) === Number(vendorId)
    );

    return (
      vendor?.vendor_name ||
      vendor?.name ||
      `Vendor #${vendorId}`
    );
  };

  const getContractName = (contractId) => {
    if (!contractId) {
      return "Not linked";
    }

    const contract = contracts.find(
      (item) =>
        Number(item.contract_id) ===
        Number(contractId)
    );

    return (
      contract?.contract_title ||
      contract?.title ||
      `Contract #${contractId}`
    );
  };

  const getPurchaseOrderName = (poId) => {
    if (!poId) {
      return "Not linked";
    }

    const purchaseOrder = purchaseOrders.find(
      (item) =>
        Number(item.po_id) === Number(poId)
    );

    return (
      purchaseOrder?.po_number ||
      purchaseOrder?.order_number ||
      purchaseOrder?.purchase_order_number ||
      `PO-${poId}`
    );
  };

  const getEntityName = (communication) => {
    if (
      communication.entity_type === "PO" &&
      communication.entity_id
    ) {
      return getPurchaseOrderName(
        communication.entity_id
      );
    }

    if (
      communication.entity_type === "CONTRACT" &&
      communication.entity_id
    ) {
      return getContractName(
        communication.entity_id
      );
    }

    if (communication.contract_id) {
      return getContractName(
        communication.contract_id
      );
    }

    return "Not linked";
  };

  const getEntityTypeLabel = (communication) => {
    if (communication.entity_type === "PO") {
      return "Purchase Order";
    }

    if (communication.entity_type === "CONTRACT") {
      return "Contract";
    }

    if (communication.contract_id) {
      return "Contract";
    }

    return "Not linked";
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString("en-IN");
  };

  const filteredCommunications = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) {
      return communications;
    }

    return communications.filter((communication) => {
      return (
        getVendorName(communication.vendor_id)
          .toLowerCase()
          .includes(search) ||
        String(communication.subject || "")
          .toLowerCase()
          .includes(search) ||
        String(communication.message || "")
          .toLowerCase()
          .includes(search) ||
        String(communication.communication_type || "")
          .toLowerCase()
          .includes(search) ||
        String(communication.communication_status || "")
          .toLowerCase()
          .includes(search) ||
        getEntityName(communication)
          .toLowerCase()
          .includes(search) ||
        getEntityTypeLabel(communication)
          .toLowerCase()
          .includes(search)
      );
    });
  }, [
    communications,
    searchTerm,
    vendors,
    contracts,
    purchaseOrders,
  ]);

  const getCommunicationEntity = (communication) => {
    let entityType = communication.entity_type;
    let entityId = communication.entity_id;

    if (!entityType && communication.contract_id) {
      entityType = "CONTRACT";
      entityId = communication.contract_id;
    }

    if (!entityType || !entityId) {
      return null;
    }

    return {
      entity_type: entityType,
      entity_id: entityId,
    };
  };

  const fetchThreadMessages = async (communication) => {
    try {
      setThreadLoading(true);
      setError("");

      const entity = getCommunicationEntity(
        communication
      );

      if (!entity) {
        setThreadMessages([communication]);
        return;
      }

      const response = await fetch(
        `${API_URL}/communications/thread/${entity.entity_type}/${entity.entity_id}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch communication thread"
        );
      }

      setThreadMessages(data.communications || []);
    } catch (err) {
      console.error("Communication thread error:", err);
      setError(err.message);
      setThreadMessages([communication]);
    } finally {
      setThreadLoading(false);
    }
  };

  const openThread = async (communication) => {
    setViewingThread(communication);

    setReplyData({
      message: "",
      communication_type: "Message",
    });

    setMessage("");
    setError("");

    await fetchThreadMessages(communication);
  };

  const closeThread = () => {
    setViewingThread(null);
    setThreadMessages([]);

    setReplyData({
      message: "",
      communication_type: "Message",
    });
  };

  const handleReply = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!replyData.message.trim()) {
      setError("Reply message is required.");
      return;
    }

    if (!viewingThread) {
      setError("No communication thread selected.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/communications/${viewingThread.communication_id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            vendor_id: Number(
              viewingThread.vendor_id
            ),
            message: replyData.message.trim(),
            communication_type:
              replyData.communication_type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to send reply"
        );
      }

      setReplyData({
        message: "",
        communication_type: "Message",
      });

      setMessage(
        "Reply added to the communication thread."
      );

      await fetchCommunications();
      await fetchThreadMessages(viewingThread);
    } catch (err) {
      console.error("Reply error:", err);
      setError(err.message);
    }
  };

  const totalCommunications = communications.length;

  const pendingCommunications =
    communications.filter(
      (item) =>
        item.communication_status?.toLowerCase() ===
        "pending"
    ).length;

  const sentCommunications = communications.filter(
    (item) =>
      item.communication_status?.toLowerCase() ===
      "sent"
  ).length;

  const resolvedCommunications =
    communications.filter(
      (item) =>
        item.communication_status?.toLowerCase() ===
        "resolved"
    ).length;

  const closedCommunications = communications.filter(
    (item) =>
      item.communication_status?.toLowerCase() ===
      "closed"
  ).length;

  return (
    <div className="communication-layout">
      {renderRoleSidebar()}

      <main className="communication-main">
        <div className="communication-header">
          <div>
            <h1>Communication Management</h1>

            <p>
              Manage vendor communication history,
              purchase order discussions, contract
              discussions and message threads.
            </p>
          </div>

          <button
            className="create-communication-btn"
            onClick={openCreateForm}
          >
            <FaPlus />
            Add Communication
          </button>
        </div>

        {message && (
          <div className="communication-success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="communication-error-message">
            {error}
          </div>
        )}

        <section className="communication-summary">
          <div className="communication-summary-card">
            <div className="communication-summary-icon total">
              <FaComments />
            </div>

            <div>
              <h3>{totalCommunications}</h3>
              <p>Total</p>
            </div>
          </div>

          <div className="communication-summary-card">
            <div className="communication-summary-icon pending">
              <FaComments />
            </div>

            <div>
              <h3>{pendingCommunications}</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="communication-summary-card">
            <div className="communication-summary-icon sent">
              <FaComments />
            </div>

            <div>
              <h3>{sentCommunications}</h3>
              <p>Sent</p>
            </div>
          </div>

          <div className="communication-summary-card">
            <div className="communication-summary-icon resolved">
              <FaComments />
            </div>

            <div>
              <h3>{resolvedCommunications}</h3>
              <p>Resolved</p>
            </div>
          </div>

          <div className="communication-summary-card">
            <div className="communication-summary-icon closed">
              <FaComments />
            </div>

            <div>
              <h3>{closedCommunications}</h3>
              <p>Closed</p>
            </div>
          </div>
        </section>

        <section className="communication-table-card">
          <div className="communication-table-header">
            <div>
              <h2>Communication History</h2>

              <p>
                Vendor communication, purchase order
                discussions and contract-related records.
              </p>
            </div>

            <div className="communication-search">
              <FaSearch />

              <input
                type="text"
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>
          </div>

          {loading ? (
            <p className="communication-message">
              Loading communications...
            </p>
          ) : filteredCommunications.length === 0 ? (
            <p className="communication-message">
              {searchTerm
                ? "No communications match your search."
                : "No communication records found. Add your first communication."}
            </p>
          ) : (
            <div className="communication-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Vendor</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Linked Entity</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCommunications.map(
                    (communication) => (
                      <tr
                        key={
                          communication.communication_id
                        }
                      >
                        <td>
                          COM-
                          {communication.communication_id}
                        </td>

                        <td>
                          <div className="communication-vendor-cell">
                            <strong>
                              {getVendorName(
                                communication.vendor_id
                              )}
                            </strong>

                            <small>
                              Vendor #
                              {communication.vendor_id}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span className="communication-type-badge">
                            {
                              communication.communication_type
                            }
                          </span>
                        </td>

                        <td>
                          <div className="communication-subject-cell">
                            <strong>
                              {communication.subject}
                            </strong>

                            <small>
                              {communication.parent_communication_id
                                ? "Reply"
                                : "Original message"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div className="communication-contract-cell">
                            <strong>
                              {getEntityName(
                                communication
                              )}
                            </strong>

                            <small>
                              {getEntityTypeLabel(
                                communication
                              )}
                            </small>
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            communication.communication_date
                          )}
                        </td>

                        <td>
                          <select
                            className={`communication-status-select ${communication.communication_status?.toLowerCase()}`}
                            value={
                              communication.communication_status ||
                              "Pending"
                            }
                            onChange={(e) =>
                              updateStatus(
                                communication,
                                e.target.value
                              )
                            }
                          >
                            <option value="Pending">
                              Pending
                            </option>

                            <option value="Sent">
                              Sent
                            </option>

                            <option value="Resolved">
                              Resolved
                            </option>

                            <option value="Closed">
                              Closed
                            </option>
                          </select>
                        </td>

                        <td>
                          <div className="communication-action-buttons">
                            <button
                              type="button"
                              className="communication-thread-btn"
                              onClick={() =>
                                openThread(
                                  communication
                                )
                              }
                              title="View Thread"
                            >
                              <FaReply />
                            </button>

                            <button
                              type="button"
                              className="communication-view-btn"
                              onClick={() =>
                                setViewingCommunication(
                                  communication
                                )
                              }
                              title="View"
                            >
                              <FaEye />
                            </button>

                            <button
                              type="button"
                              className="communication-edit-btn"
                              onClick={() =>
                                handleEdit(
                                  communication
                                )
                              }
                              title="Edit"
                            >
                              <FaEdit />
                            </button>

                            <button
                              type="button"
                              className="communication-delete-btn"
                              onClick={() =>
                                deleteCommunication(
                                  communication.communication_id
                                )
                              }
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {showForm && (
        <div className="communication-modal-overlay">
          <div className="communication-modal">
            <div className="communication-modal-header">
              <div>
                <h2>
                  {editingCommunication
                    ? "Edit Communication"
                    : "Add Communication"}
                </h2>

                <p>
                  Record a vendor, purchase order or
                  contract-related communication.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="communication-modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="communication-form-group">
                <label>Vendor</label>

                <select
                  name="vendor_id"
                  value={formData.vendor_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">
                    Select Vendor
                  </option>

                  {vendors.map((vendor) => (
                    <option
                      key={vendor.vendor_id}
                      value={vendor.vendor_id}
                    >
                      {vendor.vendor_name ||
                        vendor.name ||
                        `Vendor #${vendor.vendor_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="communication-form-group">
                <label>Attach To</label>

                <select
                  name="entity_type"
                  value={formData.entity_type}
                  onChange={handleEntityTypeChange}
                >
                  <option value="">
                    Not Linked
                  </option>

                  <option value="PO">
                    Purchase Order
                  </option>

                  <option value="CONTRACT">
                    Contract
                  </option>
                </select>
              </div>

              {formData.entity_type === "PO" && (
                <div className="communication-form-group">
                  <label>Purchase Order</label>

                  <select
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select Purchase Order
                    </option>

                    {purchaseOrders.map((po) => (
                      <option
                        key={po.po_id}
                        value={po.po_id}
                      >
                        {po.po_number ||
                          po.order_number ||
                          po.purchase_order_number ||
                          `PO-${po.po_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.entity_type ===
                "CONTRACT" && (
                <div className="communication-form-group">
                  <label>Contract</label>

                  <select
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Select Contract
                    </option>

                    {contracts.map((contract) => (
                      <option
                        key={contract.contract_id}
                        value={contract.contract_id}
                      >
                        CON-
                        {contract.contract_id} -{" "}
                        {contract.contract_title ||
                          contract.title ||
                          `Contract #${contract.contract_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="communication-form-group">
                <label>Communication Type</label>

                <select
                  name="communication_type"
                  value={formData.communication_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Email">
                    Email
                  </option>

                  <option value="Phone">
                    Phone
                  </option>

                  <option value="Meeting">
                    Meeting
                  </option>

                  <option value="Message">
                    Message
                  </option>

                  <option value="Notice">
                    Notice
                  </option>
                </select>
              </div>

              <div className="communication-form-group">
                <label>Subject</label>

                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter communication subject"
                  required
                />
              </div>

              <div className="communication-form-group">
                <label>Message</label>

                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Enter communication details"
                  rows="5"
                  required
                />
              </div>

              <div className="communication-form-row">
                <div className="communication-form-group">
                  <label>
                    Communication Date
                  </label>

                  <input
                    type="datetime-local"
                    name="communication_date"
                    value={
                      formData.communication_date
                    }
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="communication-form-group">
                  <label>Status</label>

                  <select
                    name="communication_status"
                    value={
                      formData.communication_status
                    }
                    onChange={handleChange}
                  >
                    <option value="Pending">
                      Pending
                    </option>

                    <option value="Sent">
                      Sent
                    </option>

                    <option value="Resolved">
                      Resolved
                    </option>

                    <option value="Closed">
                      Closed
                    </option>
                  </select>
                </div>
              </div>

              <div className="communication-modal-actions">
                <button
                  type="button"
                  onClick={closeForm}
                  className="communication-cancel-btn"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="communication-save-btn"
                >
                  {editingCommunication
                    ? "Save Changes"
                    : "Add Communication"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingCommunication && (
        <div className="communication-modal-overlay">
          <div className="communication-view-modal">
            <div className="communication-modal-header">
              <div>
                <h2>Communication Details</h2>

                <p>
                  COM-
                  {
                    viewingCommunication.communication_id
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewingCommunication(null)
                }
                className="communication-modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="communication-details">
              <div className="communication-detail-item">
                <span>Vendor</span>

                <strong>
                  {getVendorName(
                    viewingCommunication.vendor_id
                  )}
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Communication Type</span>

                <strong>
                  {
                    viewingCommunication.communication_type
                  }
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Subject</span>

                <strong>
                  {viewingCommunication.subject}
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Linked Entity</span>

                <strong>
                  {getEntityName(
                    viewingCommunication
                  )}
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Entity Type</span>

                <strong>
                  {getEntityTypeLabel(
                    viewingCommunication
                  )}
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Date</span>

                <strong>
                  {formatDate(
                    viewingCommunication.communication_date
                  )}
                </strong>
              </div>

              <div className="communication-detail-item">
                <span>Status</span>

                <strong
                  className={`communication-detail-status ${viewingCommunication.communication_status?.toLowerCase()}`}
                >
                  {
                    viewingCommunication.communication_status
                  }
                </strong>
              </div>

              <div className="communication-detail-message">
                <span>Message</span>

                <p>
                  {viewingCommunication.message}
                </p>
              </div>
            </div>

            <div className="communication-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setViewingCommunication(null)
                }
                className="communication-cancel-btn"
              >
                Close
              </button>

              <button
                type="button"
                className="communication-save-btn"
                onClick={() => {
                  const selected =
                    viewingCommunication;

                  setViewingCommunication(null);
                  handleEdit(selected);
                }}
              >
                <FaEdit />
                Edit
              </button>

              <button
                type="button"
                className="communication-thread-action-btn"
                onClick={() => {
                  setViewingCommunication(null);
                  openThread(viewingCommunication);
                }}
              >
                <FaReply />
                View Thread
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingThread && (
        <div className="communication-modal-overlay">
          <div className="communication-thread-modal">
            <div className="communication-modal-header">
              <div>
                <h2>
                  {viewingThread.subject}
                </h2>

                <p>
                  {getVendorName(
                    viewingThread.vendor_id
                  )}{" "}
                  •{" "}
                  {getEntityName(
                    viewingThread
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={closeThread}
                className="communication-modal-close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="communication-thread-info">
              <span>
                {threadMessages.length} message
                {threadMessages.length !== 1
                  ? "s"
                  : ""}
              </span>

              <span>
                Vendor:{" "}
                {getVendorName(
                  viewingThread.vendor_id
                )}
              </span>

              <span>
                {getEntityTypeLabel(
                  viewingThread
                )}
                :{" "}
                {getEntityName(
                  viewingThread
                )}
              </span>
            </div>

            <div className="communication-thread-messages">
              {threadLoading ? (
                <p className="communication-message">
                  Loading thread...
                </p>
              ) : threadMessages.length === 0 ? (
                <p className="communication-message">
                  No messages found in this thread.
                </p>
              ) : (
                threadMessages.map((item) => (
                  <div
                    key={item.communication_id}
                    className="communication-thread-message"
                  >
                    <div className="communication-thread-message-header">
                      <div>
                        <strong>
                          {getVendorName(
                            item.vendor_id
                          )}
                        </strong>

                        <span>
                          {
                            item.communication_type
                          }
                        </span>
                      </div>

                      <small>
                        {formatDate(
                          item.communication_date
                        )}
                      </small>
                    </div>

                    {item.subject && (
                      <strong>
                        {item.subject}
                      </strong>
                    )}

                    <p>{item.message}</p>

                    <span
                      className={`communication-detail-status ${item.communication_status?.toLowerCase()}`}
                    >
                      {item.communication_status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <form
              className="communication-reply-form"
              onSubmit={handleReply}
            >
              <h3>Reply to Thread</h3>

              <div className="communication-form-group">
                <label>
                  Communication Type
                </label>

                <select
                  value={
                    replyData.communication_type
                  }
                  onChange={(e) =>
                    setReplyData((previous) => ({
                      ...previous,
                      communication_type:
                        e.target.value,
                    }))
                  }
                >
                  <option value="Message">
                    Message
                  </option>

                  <option value="Email">
                    Email
                  </option>

                  <option value="Phone">
                    Phone
                  </option>

                  <option value="Meeting">
                    Meeting
                  </option>

                  <option value="Notice">
                    Notice
                  </option>
                </select>
              </div>

              <div className="communication-form-group">
                <label>Reply</label>

                <textarea
                  value={replyData.message}
                  onChange={(e) =>
                    setReplyData((previous) => ({
                      ...previous,
                      message: e.target.value,
                    }))
                  }
                  placeholder="Enter your reply..."
                  rows="4"
                  required
                />
              </div>

              <div className="communication-modal-actions">
                <button
                  type="button"
                  onClick={closeThread}
                  className="communication-cancel-btn"
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="communication-save-btn"
                >
                  <FaReply />
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Communication;