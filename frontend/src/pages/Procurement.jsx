 import { useEffect, useState } from "react";

import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";

import "../styles/Procurement.css";

import {
  FaClipboardList,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaFileInvoice,
  FaTrophy,
  FaStar,
  FaBuilding,
  FaCalendarAlt,
  FaBoxOpen,
} from "react-icons/fa";

function Procurement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const [formData, setFormData] = useState({
    request_title: "",
    description: "",
    department: "",
    items: [
      {
        item_name: "",
        quantity: 1,
        estimated_cost: "",
      },
    ],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [poItems, setPoItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorScores, setVendorScores] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  const [poForm, setPoForm] = useState({
    order_amount: "",
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: "",
  });

  const [poLoading, setPoLoading] = useState(false);
  const [poCreating, setPoCreating] = useState(false);

  const token = localStorage.getItem("token");

  let loggedInUser = null;

  try {
    loggedInUser = JSON.parse(
      localStorage.getItem("user")
    );
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

  const fetchRequests = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/procurement",
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
            "Failed to fetch procurement requests"
        );
      }

      setRequests(data.requests || []);
    } catch (err) {
      console.error(
        "Procurement fetch error:",
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleItemChange = (index, e) => {
    const updatedItems = [...formData.items];

    updatedItems[index] = {
      ...updatedItems[index],
      [e.target.name]: e.target.value,
    };

    setFormData({
      ...formData,
      items: updatedItems,
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_name: "",
          quantity: 1,
          estimated_cost: "",
        },
      ],
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      return;
    }

    setFormData({
      ...formData,
      items: formData.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    });
  };

  const openCreateForm = () => {
    setEditingRequest(null);

    setFormData({
      request_title: "",
      description: "",
      department: "",
      items: [
        {
          item_name: "",
          quantity: 1,
          estimated_cost: "",
        },
      ],
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRequest(null);

    setFormData({
      request_title: "",
      description: "",
      department: "",
      items: [
        {
          item_name: "",
          quantity: 1,
          estimated_cost: "",
        },
      ],
    });
  };

  const handleEdit = async (request) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/procurement/${request.request_id}`,
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
            "Failed to fetch procurement request"
        );
      }

      setEditingRequest(request);

      setFormData({
        request_title:
          data.request?.request_title || "",
        description:
          data.request?.description || "",
        department:
          data.request?.department || "",
        items:
          data.request?.items?.length > 0
            ? data.request.items.map((item) => ({
                item_name:
                  item.item_name || "",
                quantity:
                  item.quantity || 1,
                estimated_cost:
                  item.estimated_cost || "",
              }))
            : [
                {
                  item_name: "",
                  quantity: 1,
                  estimated_cost: "",
                },
              ],
      });

      setError("");
      setMessage("");
      setShowForm(true);
    } catch (err) {
      console.error(
        "Get procurement request error:",
        err
      );

      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/procurement",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            request_title:
              formData.request_title,
            description:
              formData.description,
            department:
              formData.department,
            items: formData.items,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create request"
        );
      }

      setMessage(
        "Procurement request created successfully!"
      );

      closeForm();
      await fetchRequests();
    } catch (err) {
      console.error(
        "Create request error:",
        err
      );

      setError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingRequest) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/procurement/${editingRequest.request_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update request"
        );
      }

      setMessage(
        "Procurement request updated successfully!"
      );

      closeForm();
      await fetchRequests();
    } catch (err) {
      console.error(
        "Update request error:",
        err
      );

      setError(err.message);
    }
  };

  const deleteRequest = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this procurement request?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/procurement/${id}`,
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
            "Failed to delete request"
        );
      }

      setMessage(
        "Procurement request deleted successfully!"
      );

      await fetchRequests();
    } catch (err) {
      console.error(
        "Delete request error:",
        err
      );

      setError(err.message);
    }
  };

  const handleApprovalAction = async (
    id,
    action
  ) => {
    setMessage("");
    setError("");
    setProcessingId(id);

    try {
      const response = await fetch(
        `http://localhost:5000/api/procurement/${id}/${action}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${action} procurement request`
        );
      }

      setMessage(
        data.message ||
          `Procurement request ${action}d successfully`
      );

      await fetchRequests();
    } catch (err) {
      console.error(
        `Procurement ${action} error:`,
        err
      );

      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const canApproveOrReject = (request) => {
    if (
      request.status?.toLowerCase() !==
      "pending"
    ) {
      return false;
    }

    const totalAmount = Number(
      request.total_estimated_cost || 0
    );

    if (totalAmount <= 100000) {
      return userRole ===
        "Procurement Manager";
    }

    return userRole ===
      "Finance Officer";
  };

  const getApprovalMessage = (request) => {
    if (
      request.status?.toLowerCase() !==
      "pending"
    ) {
      return "";
    }

    const totalAmount = Number(
      request.total_estimated_cost || 0
    );

    if (
      totalAmount <= 100000 &&
      userRole !== "Procurement Manager"
    ) {
      return "Procurement Manager approval required";
    }

    if (
      totalAmount > 100000 &&
      userRole !== "Finance Officer"
    ) {
      return "Finance Officer approval required";
    }

    return "";
  };

  const toScore = (...values) => {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        const numeric = Number(value);

        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    }

    return null;
  };

  const formatScore = (value) => {
    const numeric = Number(value);

    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(numeric)
    ) {
      return "N/A";
    }

    return numeric.toFixed(1);
  };

  const getVendorScoreRows = (
    vendorList,
    selectionList
  ) => {
    const selectionMap = new Map();

    selectionList.forEach((item) => {
      const vendorId = Number(
        item.vendor_id ??
          item.vendorId
      );

      if (Number.isFinite(vendorId)) {
        selectionMap.set(
          vendorId,
          item
        );
      }
    });

    return vendorList
      .filter((vendor) => {
        const status = String(
          vendor.approval_status ??
            vendor.approvalStatus ??
            vendor.status ??
            ""
        ).toLowerCase();

        return (
          status === "approved" ||
          status === "active"
        );
      })
      .map((vendor) => {
        const vendorId = Number(
          vendor.vendor_id ??
            vendor.vendorId
        );

        const selected =
          selectionMap.get(vendorId) ||
          {};

        const performanceRecords =
          Number(
            selected.performanceRecords ??
              selected.performance_records ??
              0
          );

        const deliveryRecords =
          Number(
            selected.deliveryRecords ??
              selected.delivery_records ??
              selected.deliveries ??
              0
          );

        const qualityRecords =
          Number(
            selected.qualityRecords ??
              selected.quality_records ??
              selected.inspections ??
              0
          );

        const evidenceCount =
          Number(
            selected.evidenceCount ??
              selected.evidence_count ??
              performanceRecords +
                deliveryRecords +
                qualityRecords
          );

        const hasOperationalEvidence =
          Boolean(
            selected.hasOperationalEvidence ??
              selected.has_operational_history ??
              selected.hasOperationalHistory ??
              (
                performanceRecords > 0 ||
                deliveryRecords > 0 ||
                qualityRecords > 0
              )
          );

        const reliabilityScore = toScore(
          selected.reliability,
          selected.reliability_score,
          selected.reliabilityScore,
          selected.rating
        );

        const performanceScore = toScore(
          selected.performance,
          selected.performance_score,
          selected.performanceScore
        );

        const deliveryScore = toScore(
          selected.delivery,
          selected.delivery_score,
          selected.deliveryScore,
          selected.onTimeRate
        );

        const qualityScore = toScore(
          selected.quality,
          selected.quality_score,
          selected.qualityScore,
          selected.qualityPassRate
        );

        const complianceScore = toScore(
          selected.compliance,
          selected.compliance_score,
          selected.complianceScore
        );

        const hasAnyScore = [
          reliabilityScore,
          performanceScore,
          deliveryScore,
          qualityScore,
          complianceScore,
        ].some(
          (value) => value !== null
        );

        const backendRank =
          Number(selected.rank);

        return {
          ...vendor,

          vendor_id: vendorId,

          company_name:
            vendor.company_name ??
            vendor.companyName ??
            `Vendor #${vendorId}`,

          category:
            vendor.category ??
            vendor.category_name ??
            vendor.categoryName ??
            "-",

          approval_status:
            vendor.approval_status ??
            vendor.approvalStatus ??
            vendor.status ??
            "Approved",

          reliability_score:
            reliabilityScore,

          performance_score:
            performanceScore,

          delivery_score:
            deliveryScore,

          quality_score:
            qualityScore,

          compliance_score:
            complianceScore,

          purchase_orders:
            Number(
              selected.purchase_orders ??
                selected.purchaseOrders ??
                0
            ),

          deliveries:
            deliveryRecords,

          inspections:
            qualityRecords,

          evidence_count:
            evidenceCount,

          performance_records:
            performanceRecords,

          delivery_records:
            deliveryRecords,

          quality_records:
            qualityRecords,

          has_operational_history:
            hasOperationalEvidence,

          reliability_status:
            selected.reliability_status ??
            selected.reliabilityStatus ??
            (
              hasOperationalEvidence ||
              hasAnyScore
                ? "Historical performance data"
                : "Insufficient Data"
            ),

          assessment_type:
            selected.assessmentType ??
            (
              hasOperationalEvidence
                ? "Operational Score"
                : hasAnyScore
                ? "Historical Performance Score"
                : "Not Scored"
            ),

          backend_rank:
            Number.isFinite(backendRank)
              ? backendRank
              : null,
        };
      })
      .sort((a, b) => {
        if (
          a.backend_rank !== null &&
          b.backend_rank !== null
        ) {
          return (
            a.backend_rank -
            b.backend_rank
          );
        }

        if (
          a.backend_rank !== null &&
          b.backend_rank === null
        ) {
          return -1;
        }

        if (
          a.backend_rank === null &&
          b.backend_rank !== null
        ) {
          return 1;
        }

        const performanceDifference =
          (b.performance_score ?? -1) -
          (a.performance_score ?? -1);

        if (
          performanceDifference !== 0
        ) {
          return performanceDifference;
        }

        return (
          (b.reliability_score ?? -1) -
          (a.reliability_score ?? -1)
        );
      })
      .map((vendor, index) => ({
        ...vendor,

        rank:
          vendor.backend_rank !== null
            ? vendor.backend_rank
            : index + 1,
      }));
  };

  const fetchVendorSelection = async () => {
    const response = await fetch(
      "http://localhost:5000/api/dashboard/procurement",
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
          "Failed to load vendor comparison data"
      );
    }

    return Array.isArray(
      data.stats?.vendorSelection
    )
      ? data.stats.vendorSelection
      : [];
  };

  const handleGeneratePO = async (
    request
  ) => {
    setMessage("");
    setError("");
    setPoLoading(true);

    try {
      const [
        requestResponse,
        vendorsResponse,
        selectionRows,
      ] = await Promise.all([
        fetch(
          `http://localhost:5000/api/procurement/${request.request_id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),

        fetch(
          "http://localhost:5000/api/vendors",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),

        fetchVendorSelection(),
      ]);

      const requestData =
        await requestResponse.json();

      const vendorData =
        await vendorsResponse.json();

      if (!requestResponse.ok) {
        throw new Error(
          requestData.message ||
            "Failed to load procurement request"
        );
      }

      if (!vendorsResponse.ok) {
        throw new Error(
          vendorData.message ||
            "Failed to load vendors"
        );
      }

      const requestDetails =
        requestData.request || request;

      const vendorList =
        Array.isArray(
          vendorData.vendors
        )
          ? vendorData.vendors
          : [];

      const scoreRows =
        getVendorScoreRows(
          vendorList,
          selectionRows
        );

      const items = Array.isArray(
        requestDetails.items
      )
        ? requestDetails.items
        : [];

      const itemTotal = items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
          Number(item.estimated_cost || 0),
        0
      );

      const requestTotal = Number(
        requestDetails.total_estimated_cost || 0
      );

      const originalRequestTotal = Number(
        request.total_estimated_cost || 0
      );

      const totalAmount =
        requestTotal > 0
          ? requestTotal
          : originalRequestTotal > 0
          ? originalRequestTotal
          : itemTotal;

      const requestForModal = {
        ...requestDetails,
        total_estimated_cost: totalAmount,
      };

      setSelectedRequest(
        requestForModal
      );

      setPoItems(items);

      setVendors(scoreRows);
      setVendorScores(scoreRows);

      const bestVendor =
        scoreRows.find(
          (vendor) =>
            vendor.performance_score !==
              null ||
            vendor.reliability_score !==
              null ||
            vendor.delivery_score !==
              null ||
            vendor.quality_score !==
              null
        ) || scoreRows[0];

      setSelectedVendorId(
        bestVendor
          ? String(
              bestVendor.vendor_id
            )
          : ""
      );

      setPoForm({
        order_amount:
          totalAmount > 0
            ? String(totalAmount)
            : "",
        order_date:
          new Date()
            .toISOString()
            .slice(0, 10),
        delivery_date: "",
      });

      setShowPOModal(true);
    } catch (err) {
      console.error(
        "Open purchase order flow error:",
        err
      );

      setError(
        err.message ||
          "Unable to open purchase order flow"
      );
    } finally {
      setPoLoading(false);
    }
  };

  const closePOModal = () => {
    if (poCreating) {
      return;
    }

    setShowPOModal(false);
    setSelectedRequest(null);
    setPoItems([]);
    setVendors([]);
    setVendorScores([]);
    setSelectedVendorId("");

    setPoForm({
      order_amount: "",
      order_date:
        new Date()
          .toISOString()
          .slice(0, 10),
      delivery_date: "",
    });
  };

  const selectedVendor =
    vendorScores.find(
      (vendor) =>
        String(
          vendor.vendor_id
        ) ===
        String(selectedVendorId)
    ) || null;

  const handlePOFormChange = (e) => {
    setPoForm({
      ...poForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateAssignedPO =
    async (e) => {
      e.preventDefault();

      setMessage("");
      setError("");

      if (!selectedRequest) {
        setError(
          "Procurement request details are missing."
        );
        return;
      }

      if (!selectedVendorId) {
        setError(
          "Please select a vendor."
        );
        return;
      }

      if (
        Number(poForm.order_amount) <= 0
      ) {
        setError(
          "PO amount must be greater than 0."
        );
        return;
      }

      if (!poForm.order_date) {
        setError(
          "Order date is required."
        );
        return;
      }

      setPoCreating(true);

      try {
        const createResponse =
          await fetch(
            "http://localhost:5000/api/purchase-orders",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                vendor_id: Number(
                  selectedVendorId
                ),

                order_amount: Number(
                  poForm.order_amount
                ),

                order_date:
                  poForm.order_date,

                delivery_date:
                  poForm.delivery_date ||
                  null,
              }),
            }
          );

        const createData =
          await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(
            createData.message ||
              "Failed to create purchase order"
          );
        }

        const purchaseOrder =
          createData.purchaseOrder;

        let issuedSuccessfully =
          false;

        if (purchaseOrder?.po_id) {
          const issueResponse =
            await fetch(
              `http://localhost:5000/api/purchase-orders/${purchaseOrder.po_id}/status`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  status: "Issued",
                }),
              }
            );

          issuedSuccessfully =
            issueResponse.ok;
        }

        setMessage(
          issuedSuccessfully
            ? `PO-${purchaseOrder.po_id} created, assigned to ${
                selectedVendor?.company_name ||
                "the selected vendor"
              }, issued, and vendor notification sent.`
            : `PO-${
                purchaseOrder?.po_id ||
                ""
              } created and assigned to ${
                selectedVendor?.company_name ||
                "the selected vendor"
              }. Vendor notification was sent.`
        );

        closePOModal();

        await fetchRequests();
      } catch (err) {
        console.error(
          "Create assigned purchase order error:",
          err
        );

        setError(
          err.message ||
            "Failed to create purchase order"
        );
      } finally {
        setPoCreating(false);
      }
    };

  const totalRequests =
    requests.length;

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status?.toLowerCase() ===
        "pending"
    ).length;

  const approvedRequests =
    requests.filter(
      (request) =>
        request.status?.toLowerCase() ===
        "approved"
    ).length;

  const rejectedRequests =
    requests.filter(
      (request) =>
        request.status?.toLowerCase() ===
        "rejected"
    ).length;

  const filteredRequests =
    requests.filter((request) => {
      const search =
        searchTerm.toLowerCase();

      return (
        request.request_title
          ?.toLowerCase()
          .includes(search) ||
        request.department
          ?.toLowerCase()
          .includes(search) ||
        String(
          request.request_id
        ).includes(search) ||
        request.status
          ?.toLowerCase()
          .includes(search)
      );
    });

  return (
    <div>
      {renderSidebar()}

      <main className="procurement-main">
        <div className="procurement-header">
          <div>
            <h1>
              Procurement Management
            </h1>

            <p>
              Create and manage procurement
              requests, vendor selection and
              purchase orders.
            </p>
          </div>

          <button
            className="create-request-btn"
            onClick={openCreateForm}
          >
            <FaPlus />
            Create Request
          </button>
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

        {showForm && (
          <div className="modal-overlay">
            <div className="request-modal">
              <div className="modal-header">
                <div>
                  <h2>
                    {editingRequest
                      ? "Edit Procurement Request"
                      : "Create Procurement Request"}
                  </h2>

                  <p>
                    {editingRequest
                      ? "Update the procurement request details."
                      : "Enter the procurement request details."}
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
                  editingRequest
                    ? handleUpdate
                    : handleSubmit
                }
              >
                <div className="form-group">
                  <label>
                    Request Title
                  </label>

                  <input
                    type="text"
                    name="request_title"
                    placeholder="Example: Laptop Procurement"
                    value={
                      formData.request_title
                    }
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Department
                  </label>

                  <input
                    type="text"
                    name="department"
                    placeholder="Example: Information Technology"
                    value={
                      formData.department
                    }
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Procurement Items
                  </label>

                  {formData.items.map(
                    (item, index) => (
                      <div
                        key={index}
                        style={{
                          border:
                            "1px solid #ddd",
                          padding: "15px",
                          marginBottom:
                            "12px",
                          borderRadius:
                            "8px",
                        }}
                      >
                        <input
                          type="text"
                          name="item_name"
                          placeholder="Item name"
                          value={
                            item.item_name
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              e
                            )
                          }
                          required
                        />

                        <input
                          type="number"
                          name="quantity"
                          placeholder="Quantity"
                          min="1"
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              e
                            )
                          }
                          required
                        />

                        <input
                          type="number"
                          name="estimated_cost"
                          placeholder="Estimated cost per item"
                          min="0"
                          step="0.01"
                          value={
                            item.estimated_cost
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              e
                            )
                          }
                          required
                        />

                        {formData.items
                          .length > 1 && (
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() =>
                              removeItem(
                                index
                              )
                            }
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    className="create-request-btn"
                    onClick={addItem}
                  >
                    <FaPlus />
                    Add Item
                  </button>
                </div>

                <div className="form-group">
                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    placeholder="Describe the procurement requirement"
                    value={
                      formData.description
                    }
                    onChange={handleChange}
                    rows="5"
                  />
                </div>

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
                    className="save-request-btn"
                  >
                    {editingRequest
                      ? "Save Changes"
                      : "Create Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPOModal && (
          <div className="modal-overlay">
            <div
              className="request-modal"
              style={{
                maxWidth: "1100px",
                width: "95%",
              }}
            >
              <div className="modal-header">
                <div>
                  <h2>
                    Create & Assign Purchase
                    Order
                  </h2>

                  <p>
                    Compare vendor reliability,
                    performance, delivery and
                    quality before assigning the
                    approved procurement request.
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closePOModal}
                  disabled={poCreating}
                >
                  ×
                </button>
              </div>

              {poLoading ? (
                <p className="procurement-message">
                  Loading request and vendor
                  comparison...
                </p>
              ) : (
                <form
                  onSubmit={
                    handleCreateAssignedPO
                  }
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "16px",
                      }}
                    >
                      <h3>
                        <FaBuilding /> Buyer /
                        Procurement Manager
                      </h3>

                      <p>
                        <strong>
                          Name:
                        </strong>{" "}
                        {loggedInUser?.full_name ||
                          loggedInUser?.name ||
                          "Procurement Manager"}
                      </p>

                      <p>
                        <strong>
                          User ID:
                        </strong>{" "}
                        {loggedInUser?.user_id ||
                          loggedInUser?.id ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Role:
                        </strong>{" "}
                        Procurement Manager
                      </p>

                      <p>
                        <strong>
                          Department:
                        </strong>{" "}
                        {selectedRequest?.department ||
                          "-"}
                      </p>
                    </div>

                    <div
                      style={{
                        border:
                          "1px solid #e5e7eb",
                        borderRadius: "10px",
                        padding: "16px",
                      }}
                    >
                      <h3>
                        <FaClipboardList />{" "}
                        Procurement Request
                      </h3>

                      <p>
                        <strong>
                          Request:
                        </strong>{" "}
                        PR-
                        {
                          selectedRequest?.request_id
                        }
                      </p>

                      <p>
                        <strong>
                          Title:
                        </strong>{" "}
                        {selectedRequest?.request_title ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Department:
                        </strong>{" "}
                        {selectedRequest?.department ||
                          "-"}
                      </p>

                      <p>
                        <strong>
                          Estimated Cost:
                        </strong>{" "}
                        ₹
                        {Number(
                          selectedRequest?.total_estimated_cost ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    <h3>
                      <FaTrophy /> Vendor
                      Comparison & Selection
                    </h3>

                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>
                              Rank
                            </th>

                            <th>
                              Vendor
                            </th>

                            <th>
                              Category
                            </th>

                            <th>
                              Reliability
                            </th>

                            <th>
                              Performance
                            </th>

                            <th>
                              Delivery
                            </th>

                            <th>
                              Quality
                            </th>

                            <th>
                              Select
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {vendorScores.map(
                            (vendor) => (
                              <tr
                                key={
                                  vendor.vendor_id
                                }
                              >
                                <td>
                                  <strong>
                                    #
                                    {
                                      vendor.rank
                                    }

                                    {vendor.rank ===
                                      1 &&
                                      " ⭐"}
                                  </strong>
                                </td>

                                <td>
                                  <strong>
                                    {
                                      vendor.company_name
                                    }
                                  </strong>

                                  <br />

                                  <small>
                                    {
                                      vendor.reliability_status
                                    }
                                  </small>
                                </td>

                                <td>
                                  {
                                    vendor.category
                                  }
                                </td>

                                <td>
                                  {formatScore(
                                    vendor.reliability_score
                                  )}
                                </td>

                                <td>
                                  {formatScore(
                                    vendor.performance_score
                                  )}
                                </td>

                                <td>
                                  {formatScore(
                                    vendor.delivery_score
                                  )}
                                </td>

                                <td>
                                  {formatScore(
                                    vendor.quality_score
                                  )}
                                </td>

                                <td>
                                  <input
                                    type="radio"
                                    name="selected_vendor"
                                    value={
                                      vendor.vendor_id
                                    }
                                    checked={
                                      String(
                                        selectedVendorId
                                      ) ===
                                      String(
                                        vendor.vendor_id
                                      )
                                    }
                                    onChange={(e) =>
                                      setSelectedVendorId(
                                        e
                                          .target
                                          .value
                                      )
                                    }
                                    required
                                  />
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {vendorScores.length ===
                      0 && (
                      <p className="procurement-message">
                        No approved vendors were
                        found.
                      </p>
                    )}

                    {selectedVendor && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding:
                            "12px 16px",
                          borderRadius:
                            "8px",
                          background:
                            "#f3f6fb",
                        }}
                      >
                        <strong>
                          Selected Seller:
                        </strong>{" "}
                        {
                          selectedVendor.company_name
                        }{" "}
                        — Rank #
                        {
                          selectedVendor.rank
                        }
                        , Reliability{" "}
                        {formatScore(
                          selectedVendor.reliability_score
                        )}
                        , Performance{" "}
                        {formatScore(
                          selectedVendor.performance_score
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    <h3>
                      <FaBoxOpen /> Product /
                      Item Details
                    </h3>

                    {poItems.length > 0 ? (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>
                                Product / Item
                              </th>

                              <th>
                                Quantity
                              </th>

                              <th>
                                Estimated Unit
                                Cost
                              </th>

                              <th>
                                Estimated Total
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {poItems.map(
                              (
                                item,
                                index
                              ) => (
                                <tr
                                  key={
                                    item.item_id ||
                                    index
                                  }
                                >
                                  <td>
                                    {item.item_name ||
                                      "-"}
                                  </td>

                                  <td>
                                    {item.quantity ||
                                      0}
                                  </td>

                                  <td>
                                    ₹
                                    {Number(
                                      item.estimated_cost ||
                                        0
                                    ).toLocaleString(
                                      "en-IN"
                                    )}
                                  </td>

                                  <td>
                                    ₹
                                    {(
                                      Number(
                                        item.quantity ||
                                          0
                                      ) *
                                      Number(
                                        item.estimated_cost ||
                                          0
                                      )
                                    ).toLocaleString(
                                      "en-IN"
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>
                        No item details were
                        returned for this request.
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      marginBottom: "20px",
                    }}
                  >
                    <h3>
                      <FaFileInvoice /> Purchase
                      Order Details
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <div className="form-group">
                        <label>
                          PO Amount
                        </label>

                        <input
                          type="number"
                          name="order_amount"
                          min="0.01"
                          step="0.01"
                          value={
                            poForm.order_amount
                          }
                          onChange={
                            handlePOFormChange
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          <FaCalendarAlt />{" "}
                          Order Date
                        </label>

                        <input
                          type="date"
                          name="order_date"
                          value={
                            poForm.order_date
                          }
                          onChange={
                            handlePOFormChange
                          }
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          <FaCalendarAlt />{" "}
                          Expected Delivery
                          Date
                        </label>

                        <input
                          type="date"
                          name="delivery_date"
                          value={
                            poForm.delivery_date
                          }
                          onChange={
                            handlePOFormChange
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius: "10px",
                      padding: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <h3>
                      <FaStar /> Buyer–Seller
                      Relationship
                    </h3>

                    <p>
                      <strong>
                        Buyer:
                      </strong>{" "}
                      {loggedInUser?.full_name ||
                        loggedInUser?.name ||
                        "Procurement Manager"}{" "}
                      (Procurement Manager)
                    </p>

                    <p>
                      <strong>
                        Seller:
                      </strong>{" "}
                      {selectedVendor?.company_name ||
                        "Select a vendor"}
                    </p>

                    <p>
                      The selected vendor will
                      receive a purchase-order
                      notification. The PO is
                      assigned to the selected
                      vendor after creation.
                    </p>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={
                        closePOModal
                      }
                      disabled={poCreating}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="save-request-btn"
                      disabled={
                        poCreating ||
                        !selectedVendorId
                      }
                    >
                      {poCreating
                        ? "Creating PO..."
                        : "Create & Assign Purchase Order"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <section className="procurement-summary">
          <div className="procurement-card">
            <div className="procurement-icon total">
              <FaClipboardList />
            </div>

            <div>
              <h3>
                {totalRequests}
              </h3>

              <p>
                Total Requests
              </p>
            </div>
          </div>

          <div className="procurement-card">
            <div className="procurement-icon pending">
              <FaClock />
            </div>

            <div>
              <h3>
                {pendingRequests}
              </h3>

              <p>
                Pending Requests
              </p>
            </div>
          </div>

          <div className="procurement-card">
            <div className="procurement-icon approved">
              <FaCheckCircle />
            </div>

            <div>
              <h3>
                {approvedRequests}
              </h3>

              <p>
                Approved Requests
              </p>
            </div>
          </div>

          <div className="procurement-card">
            <div className="procurement-icon rejected">
              <FaTimesCircle />
            </div>

            <div>
              <h3>
                {rejectedRequests}
              </h3>

              <p>
                Rejected Requests
              </p>
            </div>
          </div>
        </section>

        <section className="procurement-table-card">
          <div className="procurement-table-header">
            <div>
              <h2>
                Procurement Requests
              </h2>

              <p>
                Requests retrieved from
                PostgreSQL.
              </p>
            </div>

            <div className="procurement-search">
              <FaSearch />

              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {loading ? (
            <p className="procurement-message">
              Loading procurement
              requests...
            </p>
          ) : filteredRequests.length ===
            0 ? (
            <p className="procurement-message">
              No procurement requests
              found.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>
                      Request Title
                    </th>
                    <th>
                      Department
                    </th>
                    <th>
                      Items
                    </th>
                    <th>
                      Total Estimated Cost
                    </th>
                    <th>
                      Requested By
                    </th>
                    <th>
                      Status
                    </th>
                    <th>
                      Created
                    </th>
                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map(
                    (request) => {
                      const approvalMessage =
                        getApprovalMessage(
                          request
                        );

                      const canApprove =
                        canApproveOrReject(
                          request
                        );

                      const isProcessing =
                        processingId ===
                        request.request_id;

                      return (
                        <tr
                          key={
                            request.request_id
                          }
                        >
                          <td>
                            PR-
                            {
                              request.request_id
                            }
                          </td>

                          <td>
                            {
                              request.request_title
                            }
                          </td>

                          <td>
                            {
                              request.department
                            }
                          </td>

                          <td>
                            {
                              request.item_count ||
                              0
                            }
                          </td>

                          <td>
                            ₹
                            {Number(
                              request.total_estimated_cost ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            User #
                            {
                              request.requested_by
                            }
                          </td>

                          <td>
                            <span
                              className={`request-status ${
                                request.status?.toLowerCase()
                              }`}
                            >
                              {request.status ||
                                "Pending"}
                            </span>
                          </td>

                          <td>
                            {new Date(
                              request.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            <div className="action-buttons">
                              {request.status?.toLowerCase() ===
                                "pending" && (
                                <>
                                  {canApprove && (
                                    <>
                                      <button
                                        type="button"
                                        className="approve-btn"
                                        title="Approve Request"
                                        disabled={
                                          isProcessing
                                        }
                                        onClick={() =>
                                          handleApprovalAction(
                                            request.request_id,
                                            "approve"
                                          )
                                        }
                                      >
                                        <FaCheck />
                                      </button>

                                      <button
                                        type="button"
                                        className="reject-btn"
                                        title="Reject Request"
                                        disabled={
                                          isProcessing
                                        }
                                        onClick={() =>
                                          handleApprovalAction(
                                            request.request_id,
                                            "reject"
                                          )
                                        }
                                      >
                                        <FaTimes />
                                      </button>
                                    </>
                                  )}

                                  {!canApprove &&
                                    approvalMessage && (
                                      <span
                                        className="approval-info"
                                        title={
                                          approvalMessage
                                        }
                                      >
                                        {
                                          approvalMessage
                                        }
                                      </span>
                                    )}
                                </>
                              )}

                              {request.status?.toLowerCase() ===
                                "approved" && (
                                <button
                                  type="button"
                                  className="po-btn"
                                  title="Create and Assign Purchase Order"
                                  disabled={
                                    poLoading
                                  }
                                  onClick={() =>
                                    handleGeneratePO(
                                      request
                                    )
                                  }
                                >
                                  <FaFileInvoice />
                                </button>
                              )}

                              <button
                                type="button"
                                className="edit-btn"
                                title="Edit Request"
                                onClick={() =>
                                  handleEdit(
                                    request
                                  )
                                }
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                className="delete-btn"
                                title="Delete Request"
                                onClick={() =>
                                  deleteRequest(
                                    request.request_id
                                  )
                                }
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="procurement-workflow">
          <h2>
            Procurement Workflow
          </h2>

          <div className="workflow-grid">
            <div className="workflow-step">
              <span>1</span>

              <h3>
                Create Request
              </h3>

              <p>
                User submits a procurement
                requirement.
              </p>
            </div>

            <div className="workflow-step">
              <span>2</span>

              <h3>
                Approval
              </h3>

              <p>
                Procurement Manager or
                Finance Officer reviews
                the request based on the
                approval threshold.
              </p>
            </div>

            <div className="workflow-step">
              <span>3</span>

              <h3>
                Vendor Comparison
              </h3>

              <p>
                Procurement Manager compares
                vendor reliability,
                performance, delivery and
                quality before selecting
                the supplier.
              </p>
            </div>

            <div className="workflow-step">
              <span>4</span>

              <h3>
                Purchase Order
              </h3>

              <p>
                The selected vendor is
                assigned the PO containing
                buyer, seller, product and
                order details.
              </p>
            </div>

            <div className="workflow-step">
              <span>5</span>

              <h3>
                Vendor Notification
              </h3>

              <p>
                The assigned vendor receives
                a notification and can review
                the issued purchase order.
              </p>
            </div>

            <div className="workflow-step">
              <span>6</span>

              <h3>
                Fulfillment
              </h3>

              <p>
                Vendor accepts the order and
                progresses through fulfillment
                and delivery.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Procurement;