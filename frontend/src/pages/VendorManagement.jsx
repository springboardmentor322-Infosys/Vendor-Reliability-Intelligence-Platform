import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import "../styles/VendorManagement.css";

function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);

  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [search, setSearch] = useState("");

 const [formData, setFormData] = useState({
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  category_id: "",
});

  const getUserRole = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return "";
    }

    try {
      const user = JSON.parse(storedUser);
      return user.role || user.role_name || "";
    } catch {
      return "";
    }
  };

  const renderRoleSidebar = () => {
    const role = getUserRole().toLowerCase();

    if (
      role === "administrator" ||
      role === "admin"
    ) {
      return <AdminSidebar />;
    }

    if (
      role === "procurement manager" ||
      role === "procurement_manager"
    ) {
      return <ProcurementSidebar />;
    }

    if (
      role === "supply chain manager" ||
      role === "supply_chain_manager"
    ) {
      return <SupplyChainSidebar />;
    }

    if (
      role === "finance officer" ||
      role === "finance_officer"
    ) {
      return <FinanceSidebar />;
    }

    if (role === "vendor") {
      return <VendorSidebar />;
    }

    if (role === "auditor") {
      return <AuditorSidebar />;
    }

    return null;
  };

  const fetchVendors = async () => {
    try {
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
    } catch (error) {
      console.error("Vendor fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/vendors/intelligence/performance",
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
            "Failed to fetch vendor performance"
        );
      }

      setPerformance(data.vendors || []);
    } catch (error) {
      console.error(
        "Vendor performance fetch error:",
        error
      );
    } finally {
      setPerformanceLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchPerformance();
  }, []);

  const refreshVendorData = async () => {
    setLoading(true);
    setPerformanceLoading(true);

    await Promise.all([
      fetchVendors(),
      fetchPerformance(),
    ]);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddVendor = () => {
    setEditingVendor(null);

    setFormData({
      company_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      category_id: "",
    });

    setShowForm(true);
  };

 const handleEdit = (vendor) => {
  setEditingVendor(vendor);

  setFormData({
    company_name: vendor.company_name || "",
    contact_person: vendor.contact_person || "",
    email: vendor.email || "",
    phone: vendor.phone || "",
    address: vendor.address || "",
    category_id: vendor.category_id || "",
  });

  setShowForm(true);
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const url = editingVendor
        ? `http://localhost:5000/api/vendors/${editingVendor.vendor_id}`
        : "http://localhost:5000/api/vendors";

      const method = editingVendor ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Operation failed"
        );
      }

      alert(
        editingVendor
          ? "Vendor updated successfully!"
          : "Vendor added successfully!"
      );

      setShowForm(false);
      setEditingVendor(null);

      await refreshVendorData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleView = (vendor) => {
    const vendorPerformance = performance.find(
      (item) =>
        Number(item.vendor_id) ===
        Number(vendor.vendor_id)
    );

    setSelectedVendor({
      ...vendor,
      performance: vendorPerformance || null,
    });

    setShowView(true);
  };

  const handleDelete = async (vendorId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this vendor?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/vendors/${vendorId}`,
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
          data.message || "Failed to delete vendor"
        );
      }

      alert("Vendor deleted successfully!");

      await refreshVendorData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleStatusChange = async (
    vendorId,
    status
  ) => {
    const confirmationMessage =
      status === "Under Review"
        ? "Move this vendor to Under Review?"
        : status === "Approved"
        ? "Approve this vendor?"
        : "Reject this vendor?";

    const confirmed = window.confirm(
      confirmationMessage
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/vendors/${vendorId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            approval_status: status,
          }),
        }
      );

      const text = await response.text();

      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update vendor status"
        );
      }

      alert(
        `Vendor status changed to ${status}.`
      );

      await refreshVendorData();
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(error.message);
    }
  };

  const renderStatusActions = (vendor) => {
    const status = vendor.approval_status;

    if (
      status === "Pending" ||
      status === "Rejected"
    ) {
      return (
        <button
          className="review-btn"
          onClick={() =>
            handleStatusChange(
              vendor.vendor_id,
              "Under Review"
            )
          }
        >
          Review
        </button>
      );
    }

    if (status === "Under Review") {
      return (
        <>
          <button
            className="approve-btn"
            onClick={() =>
              handleStatusChange(
                vendor.vendor_id,
                "Approved"
              )
            }
          >
            Approve
          </button>

          <button
            className="reject-btn"
            onClick={() =>
              handleStatusChange(
                vendor.vendor_id,
                "Rejected"
              )
            }
          >
            Reject
          </button>
        </>
      );
    }

    return null;
  };

  const getPerformance = (vendorId) => {
    return performance.find(
      (item) =>
        Number(item.vendor_id) ===
        Number(vendorId)
    );
  };

  const getScoreClass = (score) => {
    const value = Number(score || 0);

    if (value >= 75) {
      return "score-good";
    }

    if (value >= 50) {
      return "score-medium";
    }

    return "score-low";
  };

  const getRiskClass = (risk) => {
    if (risk === "Low") {
      return "score-good";
    }

    if (risk === "Medium") {
      return "score-medium";
    }

    if (risk === "High") {
      return "score-low";
    }

    return "";
  };

  const displayScore = (score) => {
    if (
      score === null ||
      score === undefined ||
      score === ""
    ) {
      return "N/A";
    }

    return Number(score).toFixed(1);
  };

  const filteredVendors = vendors.filter(
    (vendor) => {
      const searchText =
        search.toLowerCase();

      return (
        vendor.company_name
          ?.toLowerCase()
          .includes(searchText) ||
        vendor.email
          ?.toLowerCase()
          .includes(searchText) ||
        vendor.category
          ?.toLowerCase()
          .includes(searchText)
      );
    }
  );

  const activeVendors = vendors.filter(
    (vendor) =>
      vendor.approval_status === "Active" ||
      vendor.approval_status === "Approved"
  ).length;

  const pendingVendors = vendors.filter(
    (vendor) =>
      vendor.approval_status === "Pending"
  ).length;

  return (
    <div className="vendor-page-layout">
      {renderRoleSidebar()}

      <main className="vendor-main">
        <div className="vendor-header">
          <div>
            <h1>Vendor Management</h1>

            <p>
              Manage vendors, approval status and
              vendor information.
            </p>
          </div>

          <button
            className="add-vendor-btn"
            onClick={handleAddVendor}
          >
            + Add Vendor
          </button>
        </div>

        <div className="vendor-summary">
          <div className="vendor-summary-card">
            <h3>{vendors.length}</h3>
            <p>Total Vendors</p>
          </div>

          <div className="vendor-summary-card">
            <h3>{activeVendors}</h3>
            <p>Active Vendors</p>
          </div>

          <div className="vendor-summary-card">
            <h3>{pendingVendors}</h3>
            <p>Pending Approval</p>
          </div>

          <div className="vendor-summary-card">
            <h3>
              {performanceLoading
                ? "..."
                : performance.length}
            </h3>

            <p>Performance Records</p>
          </div>
        </div>

        <section className="vendor-table-card">
          <div className="vendor-table-header">
            <h2>Registered Vendors</h2>

            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          {loading ? (
            <p className="vendor-message">
              Loading vendors...
            </p>
          ) : filteredVendors.length === 0 ? (
            <p className="vendor-message">
              No vendors found.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Reliability</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVendors.map(
                    (vendor) => {
                      const vendorPerformance =
                        getPerformance(
                          vendor.vendor_id
                        );

                      return (
                        <tr
                          key={
                            vendor.vendor_id
                          }
                        >
                          <td>
                            {
                              vendor.company_name
                            }
                          </td>

                          <td>
                            {vendor.category ||
                              "-"}
                          </td>

                          <td>
                            {vendor.email}
                          </td>

                          <td>
                            {vendor.phone ||
                              "-"}
                          </td>

                          <td>
                            <span
                              className={`vendor-status ${
                                vendor.approval_status
                                  ?.toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )
                              }`}
                            >
                              {vendor.approval_status ||
                                "Pending"}
                            </span>
                          </td>

                          <td>
                            {performanceLoading ? (
                              "..."
                            ) : vendorPerformance ? (
                              <span
                                className={getScoreClass(
                                  vendorPerformance.reliability_score
                                )}
                              >
                                {displayScore(
                                  vendorPerformance.reliability_score
                                )}
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </td>

                          <td>
                            <div className="vendor-actions">
                              <button
                                className="view-btn"
                                onClick={() =>
                                  handleView(
                                    vendor
                                  )
                                }
                              >
                                View
                              </button>

                              <button
                                className="edit-btn"
                                onClick={() =>
                                  handleEdit(
                                    vendor
                                  )
                                }
                              >
                                Edit
                              </button>

                              {renderStatusActions(
                                vendor
                              )}

                              <button
                                className="delete-btn"
                                onClick={() =>
                                  handleDelete(
                                    vendor.vendor_id
                                  )
                                }
                              >
                                Delete
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

        <section className="vendor-table-card">
          <div className="vendor-table-header">
            <div>
              <h2>
                Vendor Performance Intelligence
              </h2>

              <p>
                Reliability is calculated using
                delivery, quality, compliance,
                communication, contract compliance
                and issue resolution data.
              </p>
            </div>
          </div>

          {performanceLoading ? (
            <p className="vendor-message">
              Calculating vendor performance...
            </p>
          ) : performance.length === 0 ? (
            <p className="vendor-message">
              No vendor performance data available.
            </p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vendor</th>
                    <th>Orders</th>
                    <th>Delivery</th>
                    <th>Quality</th>
                    <th>Compliance</th>
                    <th>Communication</th>
                    <th>Contract</th>
                    <th>Issue Resolution</th>
                    <th>Performance</th>
                    <th>Reliability</th>
                    <th>Risk</th>
                  </tr>
                </thead>

                <tbody>
                  {performance.map((item) => (
                    <tr
                      key={item.vendor_id}
                    >
                      <td>
                        {item.vendor_rank ===
                        null
                          ? "—"
                          : `#${item.vendor_rank}`}
                      </td>

                      <td>
                        <strong>
                          {item.company_name}
                        </strong>
                      </td>

                      <td>
                        {Number(
                          item.total_orders || 0
                        ).toLocaleString()}
                      </td>

                      <td>
                        {displayScore(
                          item.delivery_score
                        )}
                      </td>

                      <td>
                        {displayScore(
                          item.quality_score
                        )}
                      </td>

                      <td>
                        {displayScore(
                          item.compliance_score
                        )}
                      </td>

                      <td>
                        {displayScore(
                          item.communication_score
                        )}
                      </td>

                      <td>
                        {displayScore(
                          item.contract_compliance_score
                        )}
                      </td>

                      <td>
                        {displayScore(
                          item.issue_resolution_score
                        )}
                      </td>

                      <td>
                        <span
                          className={getScoreClass(
                            item.performance_score
                          )}
                        >
                          {displayScore(
                            item.performance_score
                          )}
                        </span>
                      </td>

                      <td>
                        <strong
                          className={getScoreClass(
                            item.reliability_score
                          )}
                        >
                          {displayScore(
                            item.reliability_score
                          )}
                        </strong>
                      </td>

                      <td>
                        <strong
                          className={getRiskClass(
                            item.risk_level
                          )}
                        >
                          {item.risk_level ||
                            "N/A"}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm && (
          <div className="modal-overlay">
            <div className="vendor-modal">
              <div className="modal-header">
                <h2>
                  {editingVendor
                    ? "Edit Vendor"
                    : "Add Vendor"}
                </h2>

                <button
                  className="close-btn"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  ×
                </button>
              </div>

              <form
                className="vendor-form"
                onSubmit={handleSubmit}
              >
                <label>Company Name</label>

                <input
                  type="text"
                  name="company_name"
                  value={
                    formData.company_name
                  }
                  onChange={handleChange}
                  required
                />

                <label>Contact Person</label>

                <input
                  type="text"
                  name="contact_person"
                  value={
                    formData.contact_person
                  }
                  onChange={handleChange}
                />

                <label>Email</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                <label>Phone</label>

                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />

                <label>Category</label>

                <input
                  type="text"
                  name="category_id"
                  value={
                    formData.category_id
                  }
                  onChange={handleChange}
                  placeholder="e.g. Software"
                />

                <label>Address</label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                />

                {editingVendor && (
                  <div className="current-status-info">
                    <strong>
                      Current Approval Status:
                    </strong>{" "}
                    {
                      editingVendor.approval_status
                    }

                    <small>
                      Use the Review, Approve
                      or Reject actions to
                      change the approval
                      workflow status.
                    </small>
                  </div>
                )}

                <div className="form-buttons">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() =>
                      setShowForm(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-btn"
                  >
                    {editingVendor
                      ? "Update Vendor"
                      : "Save Vendor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showView &&
          selectedVendor && (
            <div className="modal-overlay">
              <div className="vendor-modal">
                <div className="modal-header">
                  <h2>
                    Vendor Intelligence
                  </h2>

                  <button
                    className="close-btn"
                    onClick={() =>
                      setShowView(false)
                    }
                  >
                    ×
                  </button>
                </div>

                <div className="vendor-details">
                  <h3>
                    Vendor Information
                  </h3>

                  <p>
                    <strong>
                      Company:
                    </strong>{" "}
                    {
                      selectedVendor.company_name
                    }
                  </p>

                  <p>
                    <strong>
                      Contact Person:
                    </strong>{" "}
                    {
                      selectedVendor.contact_person ||
                      "-"
                    }
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {selectedVendor.email}
                  </p>

                  <p>
                    <strong>Phone:</strong>{" "}
                    {selectedVendor.phone ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Category:
                    </strong>{" "}
                    {selectedVendor.category_id ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Address:
                    </strong>{" "}
                    {selectedVendor.address ||
                      "-"}
                  </p>

                  <p>
                    <strong>
                      Approval Status:
                    </strong>{" "}
                    {
                      selectedVendor.approval_status ||
                      "Pending"
                    }
                  </p>

                  {selectedVendor.performance && (
                    <>
                      <hr />

                      <h3>
                        Performance Intelligence
                      </h3>

                      <p>
                        <strong>
                          Vendor Rank:
                        </strong>{" "}
                        {selectedVendor
                          .performance
                          .vendor_rank === null
                          ? "—"
                          : `#${selectedVendor.performance.vendor_rank}`}
                      </p>

                      <p>
                        <strong>
                          Risk Level:
                        </strong>{" "}
                        <span
                          className={getRiskClass(
                            selectedVendor
                              .performance
                              .risk_level
                          )}
                        >
                          {
                            selectedVendor
                              .performance
                              .risk_level
                          }
                        </span>
                      </p>

                      <p>
                        <strong>
                          Performance Score:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .performance_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Reliability Score:
                        </strong>{" "}
                        <span
                          className={getScoreClass(
                            selectedVendor
                              .performance
                              .reliability_score
                          )}
                        >
                          {displayScore(
                            selectedVendor
                              .performance
                              .reliability_score
                          )}
                        </span>
                      </p>

                      <hr />

                      <h3>
                        Reliability Breakdown
                      </h3>

                      <p>
                        <strong>
                          Delivery Score:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .delivery_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Quality Score:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .quality_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Compliance Score:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .compliance_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Communication Score:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .communication_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Contract Compliance:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .contract_compliance_score
                        )}
                      </p>

                      <p>
                        <strong>
                          Issue Resolution:
                        </strong>{" "}
                        {displayScore(
                          selectedVendor
                            .performance
                            .issue_resolution_score
                        )}
                      </p>

                      <hr />

                      <h3>
                        Operational Details
                      </h3>

                      <p>
                        <strong>
                          Total Orders:
                        </strong>{" "}
                        {Number(
                          selectedVendor
                            .performance
                            .total_orders || 0
                        ).toLocaleString()}
                      </p>

                      <p>
                        <strong>
                          Successful Deliveries:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .successful_deliveries
                        }
                      </p>

                      <p>
                        <strong>
                          Late Deliveries:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .late_deliveries
                        }
                      </p>

                      <p>
                        <strong>
                          High Risk Orders:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .high_risk_orders
                        }
                      </p>

                      <p>
                        <strong>
                          Fulfilled Orders:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .fulfilled_orders
                        }
                      </p>

                      <p>
                        <strong>
                          Cancelled Orders:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .cancelled_orders
                        }
                      </p>

                      <hr />

                      <h3>
                        Communication & Issue Resolution
                      </h3>

                      <p>
                        <strong>
                          Total Communications:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .total_communications
                        }
                      </p>

                      <p>
                        <strong>
                          Completed:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .completed_communications
                        }
                      </p>

                      <p>
                        <strong>
                          Pending:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .pending_communications
                        }
                      </p>

                      <p>
                        <strong>
                          Follow-up Required:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .follow_up_required
                        }
                      </p>

                      <hr />

                      <h3>
                        Contract Intelligence
                      </h3>

                      <p>
                        <strong>
                          Total Contracts:
                        </strong>{" "}
                        {
                          selectedVendor
                            .performance
                            .total_contracts
                        }
                      </p>
                    </>
                  )}
                </div>

                <button
                  className="save-btn"
                  onClick={() =>
                    setShowView(false)
                  }
                >
                  Close
                </button>
              </div>
            </div>
          )}
      </main>
    </div>
  );
}

export default VendorManagement;
