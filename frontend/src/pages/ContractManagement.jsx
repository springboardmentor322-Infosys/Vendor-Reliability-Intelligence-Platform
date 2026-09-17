import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import ProcurementSidebar from "../components/ProcurementSidebar";
import SupplyChainSidebar from "../components/SupplyChainSidebar";
import FinanceSidebar from "../components/FinanceSidebar";
import VendorSidebar from "../components/VendorSidebar";
import AuditorSidebar from "../components/AuditorSidebar";
import "../styles/ContractManagement.css";

import {
  FaFileContract,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
} from "react-icons/fa";

function ContractManagement() {
  const [contracts, setContracts] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    vendor_id: "",
    contract_title: "",
    contract_value: "",
    start_date: "",
    end_date: "",
    status: "Draft",
    description: "",
    renewal_notice_days: 30,
    compliance_status: "Compliant",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getUserRole = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return "";
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      return payload.role || "";
    } catch {
      return "";
    }
  };

  const userRole = getUserRole();

  const isAdministrator =
    userRole === "Administrator";

  const isProcurementManager =
    userRole === "Procurement Manager";

  const isSupplyChainManager =
    userRole === "Supply Chain Manager";

  const isFinanceOfficer =
    userRole === "Finance Officer";

  const isVendor =
    userRole === "Vendor";

  const isAuditor =
    userRole === "Auditor";

  const canCreate =
    isAdministrator ||
    isProcurementManager;

  const canEdit =
    isAdministrator ||
    isProcurementManager;

  const canDelete =
    isAdministrator;

  const canUpdateStatus =
    isAdministrator ||
    isProcurementManager;

  const canUpdateCompliance =
    isAdministrator ||
    isProcurementManager ||
    isSupplyChainManager ||
    isAuditor;

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

      case "Auditor":
        return <AuditorSidebar />;

      default:
        return null;
    }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/contracts",
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
            "Failed to fetch contracts"
        );
      }

      setContracts(data.contracts || []);
    } catch (err) {
      console.error(
        "Contracts fetch error:",
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

      const token =
        localStorage.getItem("token");

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
          data.message ||
            "Failed to fetch vendors"
        );
      }

      setVendors(data.vendors || []);
    } catch (err) {
      console.error(
        "Vendors fetch error:",
        err
      );
    } finally {
      setVendorsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();

    if (
      isAdministrator ||
      isProcurementManager ||
      isSupplyChainManager ||
      isAuditor
    ) {
      fetchVendors();
    } else {
      setVendorsLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openCreateForm = () => {
    if (!canCreate) {
      return;
    }

    setEditingContract(null);

    setFormData({
      vendor_id: "",
      contract_title: "",
      contract_value: "",
      start_date: "",
      end_date: "",
      status: "Draft",
      description: "",
      renewal_notice_days: 30,
      compliance_status: "Compliant",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const handleEdit = (contract) => {
    if (!canEdit) {
      return;
    }

    setEditingContract(contract);

    setFormData({
      vendor_id:
        contract.vendor_id || "",
      contract_title:
        contract.contract_title || "",
      contract_value:
        contract.contract_value || "",
      start_date: contract.start_date
        ? String(
            contract.start_date
          ).substring(0, 10)
        : "",
      end_date: contract.end_date
        ? String(
            contract.end_date
          ).substring(0, 10)
        : "",
      status:
        contract.status || "Draft",
      description:
        contract.description || "",
      renewal_notice_days:
        contract.renewal_notice_days ??
        30,
      compliance_status:
        contract.compliance_status ||
        "Compliant",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingContract(null);

    setFormData({
      vendor_id: "",
      contract_title: "",
      contract_value: "",
      start_date: "",
      end_date: "",
      status: "Draft",
      description: "",
      renewal_notice_days: 30,
      compliance_status: "Compliant",
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!canCreate) {
      return;
    }

    setMessage("");
    setError("");

    try {
      if (
        formData.end_date &&
        formData.start_date &&
        formData.end_date <
          formData.start_date
      ) {
        throw new Error(
          "End date cannot be before start date"
        );
      }

      const token =
        localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/contracts",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_id: Number(
              formData.vendor_id
            ),
            contract_title:
              formData.contract_title.trim(),
            contract_value: Number(
              formData.contract_value
            ),
            start_date:
              formData.start_date,
            end_date:
              formData.end_date,
            description:
              formData.description.trim() ||
              null,
            renewal_notice_days:
              Number(
                formData.renewal_notice_days
              ),
            compliance_status:
              formData.compliance_status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create contract"
        );
      }

      setMessage(
        "Contract created successfully!"
      );

      closeForm();
      fetchContracts();
    } catch (err) {
      console.error(
        "Create contract error:",
        err
      );

      setError(err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (
      !editingContract ||
      !canEdit
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      if (
        formData.end_date &&
        formData.start_date &&
        formData.end_date <
          formData.start_date
      ) {
        throw new Error(
          "End date cannot be before start date"
        );
      }

      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/contracts/${editingContract.contract_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vendor_id: Number(
              formData.vendor_id
            ),
            contract_title:
              formData.contract_title.trim(),
            contract_value: Number(
              formData.contract_value
            ),
            start_date:
              formData.start_date,
            end_date:
              formData.end_date,
            status:
              formData.status,
            description:
              formData.description.trim() ||
              null,
            renewal_notice_days:
              Number(
                formData.renewal_notice_days
              ),
            compliance_status:
              formData.compliance_status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update contract"
        );
      }

      setMessage(
        "Contract updated successfully!"
      );

      closeForm();
      fetchContracts();
    } catch (err) {
      console.error(
        "Update contract error:",
        err
      );

      setError(err.message);
    }
  };

  const deleteContract = async (id) => {
    if (!canDelete) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this contract?"
      );

    if (!confirmDelete) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/contracts/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete contract"
        );
      }

      setMessage(
        "Contract deleted successfully!"
      );

      fetchContracts();
    } catch (err) {
      console.error(
        "Delete contract error:",
        err
      );

      setError(err.message);
    }
  };

  const updateStatus = async (
    id,
    status
  ) => {
    if (!canUpdateStatus) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/contracts/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update contract status"
        );
      }

      setMessage(
        `Contract status changed to ${status}.`
      );

      fetchContracts();
    } catch (err) {
      console.error(
        "Update contract status error:",
        err
      );

      setError(err.message);
    }
  };

  const updateComplianceStatus = async (
    id,
    compliance_status
  ) => {
    if (!canUpdateCompliance) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const token =
        localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/contracts/${id}/compliance`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            compliance_status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update compliance status"
        );
      }

      setMessage(
        `Compliance changed to ${compliance_status}.`
      );

      setContracts(
        (currentContracts) =>
          currentContracts.map(
            (contract) =>
              Number(
                contract.contract_id
              ) === Number(id)
                ? {
                    ...contract,
                    compliance_status,
                  }
                : contract
          )
      );
    } catch (err) {
      console.error(
        "Update compliance status error:",
        err
      );

      setError(err.message);
    }
  };

  const handleView = (contract) => {
    setViewingContract(contract);
  };

  const getVendorName = (
    vendorId
  ) => {
    const vendor =
      vendors.find(
        (item) =>
          Number(
            item.vendor_id
          ) === Number(vendorId)
      );

    if (!vendor) {
      return `Vendor #${vendorId}`;
    }

    return (
      vendor.vendor_name ||
      vendor.name ||
      vendor.company_name ||
      `Vendor #${vendorId}`
    );
  };

  const filteredContracts =
    contracts.filter(
      (contract) => {
        const vendorName =
          getVendorName(
            contract.vendor_id
          );

        const search =
          searchTerm.toLowerCase();

        return (
          `CON-${contract.contract_id}`
            .toLowerCase()
            .includes(search) ||
          String(
            contract.contract_title ||
              ""
          )
            .toLowerCase()
            .includes(search) ||
          vendorName
            .toLowerCase()
            .includes(search) ||
          String(
            contract.vendor_id
          )
            .toLowerCase()
            .includes(search) ||
          String(
            contract.status || ""
          )
            .toLowerCase()
            .includes(search) ||
          String(
            contract.compliance_status ||
              ""
          )
            .toLowerCase()
            .includes(search)
        );
      }
    );

  const totalContracts =
    contracts.length;

  const draftContracts =
    contracts.filter(
      (contract) =>
        contract.status?.toLowerCase() ===
        "draft"
    ).length;

  const activeContracts =
    contracts.filter(
      (contract) =>
        contract.status?.toLowerCase() ===
        "active"
    ).length;

  const expiredContracts =
    contracts.filter(
      (contract) =>
        contract.status?.toLowerCase() ===
        "expired"
    ).length;

  const terminatedContracts =
    contracts.filter(
      (contract) =>
        contract.status?.toLowerCase() ===
        "terminated"
    ).length;

  const formatValue = (
    value
  ) => {
    const numericValue =
      Number(value || 0);

    return numericValue.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString(
      "en-IN"
    );
  };

  const getExpiryDetails = (
    endDate
  ) => {
    if (!endDate) {
      return {
        daysRemaining: null,
        status:
          "No Expiry Date",
        risk: "Unknown",
        className:
          "expiry-unknown",
      };
    }

    const today = new Date();
    const expiry =
      new Date(endDate);

    today.setHours(
      0,
      0,
      0,
      0
    );

    expiry.setHours(
      0,
      0,
      0,
      0
    );

    const difference =
      expiry.getTime() -
      today.getTime();

    const daysRemaining =
      Math.ceil(
        difference /
          (1000 *
            60 *
            60 *
            24)
      );

    if (daysRemaining < 0) {
      return {
        daysRemaining,
        status: "Expired",
        risk: "High",
        className:
          "expiry-high",
      };
    }

    if (
      daysRemaining <= 30
    ) {
      return {
        daysRemaining,
        status:
          "Expires within 30 days",
        risk: "High",
        className:
          "expiry-high",
      };
    }

    if (
      daysRemaining <= 60
    ) {
      return {
        daysRemaining,
        status:
          "Expires within 60 days",
        risk: "Medium",
        className:
          "expiry-medium",
      };
    }

    if (
      daysRemaining <= 90
    ) {
      return {
        daysRemaining,
        status:
          "Expires within 90 days",
        risk: "Low",
        className:
          "expiry-low",
      };
    }

    return {
      daysRemaining,
      status:
        "More than 90 days",
      risk: "Safe",
      className:
        "expiry-safe",
    };
  };

  const getExpiryText = (
    endDate
  ) => {
    const expiry =
      getExpiryDetails(
        endDate
      );

    if (
      expiry.daysRemaining ===
      null
    ) {
      return "—";
    }

    if (
      expiry.daysRemaining < 0
    ) {
      return `${Math.abs(
        expiry.daysRemaining
      )} days overdue`;
    }

    if (
      expiry.daysRemaining === 0
    ) {
      return "Expires today";
    }

    return `${expiry.daysRemaining} days remaining`;
  };

  return (
    <div className="contracts-layout">
      {getRoleSidebar()}

      <main className="contracts-main">
        <div className="contracts-header">
          <div>
            <h1>
              Contract Management
            </h1>

            <p>
              Create, manage and
              monitor vendor
              contracts.
            </p>
          </div>

          {canCreate && (
            <button
              className="create-contract-btn"
              onClick={
                openCreateForm
              }
            >
              <FaPlus />
              Create Contract
            </button>
          )}
        </div>

        {message && (
          <div className="contract-success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="contract-error-message">
            {error}
          </div>
        )}

        <section className="contracts-summary">
          <div className="contract-summary-card">
            <div className="contract-summary-icon total">
              <FaFileContract />
            </div>

            <div>
              <h3>
                {totalContracts}
              </h3>

              <p>
                Total Contracts
              </p>
            </div>
          </div>

          <div className="contract-summary-card">
            <div className="contract-summary-icon draft">
              <FaClock />
            </div>

            <div>
              <h3>
                {draftContracts}
              </h3>

              <p>Draft</p>
            </div>
          </div>

          <div className="contract-summary-card">
            <div className="contract-summary-icon active">
              <FaCheckCircle />
            </div>

            <div>
              <h3>
                {activeContracts}
              </h3>

              <p>Active</p>
            </div>
          </div>

          <div className="contract-summary-card">
            <div className="contract-summary-icon expired">
              <FaExclamationTriangle />
            </div>

            <div>
              <h3>
                {expiredContracts}
              </h3>

              <p>Expired</p>
            </div>
          </div>

          <div className="contract-summary-card">
            <div className="contract-summary-icon terminated">
              <FaTimesCircle />
            </div>

            <div>
              <h3>
                {terminatedContracts}
              </h3>

              <p>Terminated</p>
            </div>
          </div>
        </section>

        <section className="contracts-table-card">
          <div className="contracts-table-header">
            <div>
              <h2>
                Contract Records
              </h2>

              <p>
                Contracts retrieved
                from PostgreSQL.
              </p>
            </div>

            <div className="contracts-search">
              <FaSearch />

              <input
                type="text"
                placeholder="Search contracts..."
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
            <p className="contracts-message">
              Loading contracts...
            </p>
          ) : filteredContracts.length ===
            0 ? (
            <p className="contracts-message">
              {searchTerm
                ? "No contracts match your search."
                : "No contracts found. Create your first contract."}
            </p>
          ) : (
            <div className="contracts-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Contract ID
                    </th>

                    <th>Title</th>

                    <th>Vendor</th>

                    <th>Value</th>

                    <th>
                      Start Date
                    </th>

                    <th>
                      End Date
                    </th>

                    <th>
                      Renewal Notice
                    </th>

                    <th>Expiry</th>

                    <th>
                      Compliance
                    </th>

                    <th>Status</th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContracts.map(
                    (contract) => {
                      const expiry =
                        getExpiryDetails(
                          contract.end_date
                        );

                      return (
                        <tr
                          key={
                            contract.contract_id
                          }
                        >
                          <td>
                            <strong>
                              CON-
                              {
                                contract.contract_id
                              }
                            </strong>
                          </td>

                          <td>
                            <div className="contract-title-cell">
                              <strong>
                                {
                                  contract.contract_title
                                }
                              </strong>

                              <small>
                                Contract #
                                {
                                  contract.contract_id
                                }
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="contract-vendor-cell">
                              <strong>
                                {getVendorName(
                                  contract.vendor_id
                                )}
                              </strong>

                              <small>
                                Vendor #
                                {
                                  contract.vendor_id
                                }
                              </small>
                            </div>
                          </td>

                          <td>
                            ₹
                            {formatValue(
                              contract.contract_value
                            )}
                          </td>

                          <td>
                            {formatDate(
                              contract.start_date
                            )}
                          </td>

                          <td>
                            {formatDate(
                              contract.end_date
                            )}
                          </td>

                          <td>
                            {contract.renewal_notice_days ??
                              30}{" "}
                            days
                          </td>

                          <td>
                            <div className="expiry-info">
                              <span
                                className={`expiry-badge ${expiry.className}`}
                              >
                                {
                                  expiry.status
                                }
                              </span>

                              <small>
                                {getExpiryText(
                                  contract.end_date
                                )}
                              </small>

                              {expiry.risk !==
                                "Unknown" && (
                                <small>
                                  Risk:{" "}
                                  {
                                    expiry.risk
                                  }
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            {canUpdateCompliance ? (
                              <select
                                className={`contract-compliance-select ${
                                  (
                                    contract.compliance_status ||
                                    "Compliant"
                                  )
                                    .toLowerCase()
                                    .replace(
                                      /\s+/g,
                                      "-"
                                    )
                                }`}
                                value={
                                  contract.compliance_status ||
                                  "Compliant"
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateComplianceStatus(
                                    contract.contract_id,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="Compliant">
                                  Compliant
                                </option>

                                <option value="Under Review">
                                  Under Review
                                </option>

                                <option value="Non-Compliant">
                                  Non-Compliant
                                </option>
                              </select>
                            ) : (
                              <span
                                className={`contract-detail-status ${
                                  (
                                    contract.compliance_status ||
                                    "Compliant"
                                  )
                                    .toLowerCase()
                                    .replace(
                                      /\s+/g,
                                      "-"
                                    )
                                }`}
                              >
                                {contract.compliance_status ||
                                  "Compliant"}
                              </span>
                            )}
                          </td>

                          <td>
                            {canUpdateStatus ? (
                              <select
                                className={`contract-status-select ${
                                  contract.status?.toLowerCase()
                                }`}
                                value={
                                  contract.status ||
                                  "Draft"
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateStatus(
                                    contract.contract_id,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="Draft">
                                  Draft
                                </option>

                                <option value="Active">
                                  Active
                                </option>

                                <option value="Expired">
                                  Expired
                                </option>

                                <option value="Terminated">
                                  Terminated
                                </option>
                              </select>
                            ) : (
                              <span
                                className={`contract-detail-status ${
                                  contract.status?.toLowerCase()
                                }`}
                              >
                                {contract.status ||
                                  "Draft"}
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="contract-action-buttons">
                              <button
                                type="button"
                                className="contract-view-btn"
                                title="View Contract"
                                onClick={() =>
                                  handleView(
                                    contract
                                  )
                                }
                              >
                                <FaEye />
                              </button>

                              {canEdit && (
                                <button
                                  type="button"
                                  className="contract-edit-btn"
                                  title="Edit Contract"
                                  onClick={() =>
                                    handleEdit(
                                      contract
                                    )
                                  }
                                >
                                  <FaEdit />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  className="contract-delete-btn"
                                  title="Delete Contract"
                                  onClick={() =>
                                    deleteContract(
                                      contract.contract_id
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="contract-workflow">
          <h2>
            Contract Lifecycle
          </h2>

          <div className="contract-workflow-grid">
            <div className="contract-workflow-step">
              <span>1</span>

              <h3>Draft</h3>

              <p>
                Contract details are
                prepared and
                reviewed before
                activation.
              </p>
            </div>

            <div className="contract-workflow-step">
              <span>2</span>

              <h3>Active</h3>

              <p>
                The approved
                contract becomes
                active for the
                vendor.
              </p>
            </div>

            <div className="contract-workflow-step">
              <span>3</span>

              <h3>Monitoring</h3>

              <p>
                Contract dates,
                renewal periods
                and compliance
                are monitored.
              </p>
            </div>

            <div className="contract-workflow-step">
              <span>4</span>

              <h3>Closure</h3>

              <p>
                Contracts are
                marked expired or
                terminated when
                the lifecycle ends.
              </p>
            </div>
          </div>
        </section>
      </main>

      {showForm && (
        <div className="contract-modal-overlay">
          <div className="contract-modal">
            <div className="contract-modal-header">
              <div>
                <h2>
                  {editingContract
                    ? "Edit Contract"
                    : "Create Contract"}
                </h2>

                <p>
                  {editingContract
                    ? "Update the contract details."
                    : "Enter the contract details."}
                </p>
              </div>

              <button
                type="button"
                className="contract-modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                editingContract
                  ? handleUpdate
                  : handleCreate
              }
            >
              <div className="contract-form-group">
                <label>Vendor</label>

                <select
                  name="vendor_id"
                  value={
                    formData.vendor_id
                  }
                  onChange={
                    handleChange
                  }
                  required
                  disabled={
                    vendorsLoading
                  }
                >
                  <option value="">
                    {vendorsLoading
                      ? "Loading vendors..."
                      : "Select Vendor"}
                  </option>

                  {vendors.map(
                    (vendor) => (
                      <option
                        key={
                          vendor.vendor_id
                        }
                        value={
                          vendor.vendor_id
                        }
                      >
                        {vendor.vendor_name ||
                          vendor.name ||
                          vendor.company_name ||
                          `Vendor #${vendor.vendor_id}`}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="contract-form-group">
                <label>
                  Contract Title
                </label>

                <input
                  type="text"
                  name="contract_title"
                  placeholder="Example: Annual Software Supply Agreement"
                  value={
                    formData.contract_title
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="150"
                  required
                />
              </div>

              <div className="contract-form-group">
                <label>
                  Contract Value
                </label>

                <input
                  type="number"
                  name="contract_value"
                  placeholder="Example: 500000"
                  value={
                    formData.contract_value
                  }
                  onChange={
                    handleChange
                  }
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              <div className="contract-form-group">
                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  name="start_date"
                  value={
                    formData.start_date
                  }
                  onChange={
                    handleChange
                  }
                  required
                />
              </div>

              <div className="contract-form-group">
                <label>
                  End Date
                </label>

                <input
                  type="date"
                  name="end_date"
                  value={
                    formData.end_date
                  }
                  onChange={
                    handleChange
                  }
                  min={
                    formData.start_date ||
                    undefined
                  }
                  required
                />
              </div>

              <div className="contract-form-group">
                <label>
                  Renewal Notice Period
                </label>

                <input
                  type="number"
                  name="renewal_notice_days"
                  value={
                    formData.renewal_notice_days
                  }
                  onChange={
                    handleChange
                  }
                  min="0"
                  required
                />
              </div>

              {editingContract && (
                <div className="contract-form-group">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      formData.status
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option value="Draft">
                      Draft
                    </option>

                    <option value="Active">
                      Active
                    </option>

                    <option value="Expired">
                      Expired
                    </option>

                    <option value="Terminated">
                      Terminated
                    </option>
                  </select>
                </div>
              )}

              <div className="contract-form-group">
                <label>
                  Compliance
                </label>

                <select
                  name="compliance_status"
                  value={
                    formData.compliance_status
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="Compliant">
                    Compliant
                  </option>

                  <option value="Under Review">
                    Under Review
                  </option>

                  <option value="Non-Compliant">
                    Non-Compliant
                  </option>
                </select>
              </div>

              <div className="contract-form-group">
                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  placeholder="Enter contract description..."
                  value={
                    formData.description
                  }
                  onChange={
                    handleChange
                  }
                  rows="4"
                />
              </div>

              <div className="contract-modal-actions">
                <button
                  type="button"
                  className="contract-cancel-btn"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="contract-save-btn"
                >
                  {editingContract
                    ? "Save Changes"
                    : "Create Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingContract && (
        <div className="contract-modal-overlay">
          <div className="contract-view-modal">
            <div className="contract-modal-header">
              <div>
                <h2>
                  Contract Details
                </h2>

                <p>
                  CON-
                  {
                    viewingContract.contract_id
                  }
                </p>
              </div>

              <button
                type="button"
                className="contract-modal-close"
                onClick={() =>
                  setViewingContract(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="contract-details">
              <div className="contract-detail-item">
                <span>
                  Contract ID
                </span>

                <strong>
                  CON-
                  {
                    viewingContract.contract_id
                  }
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  Contract Title
                </span>

                <strong>
                  {
                    viewingContract.contract_title
                  }
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>Vendor</span>

                <strong>
                  {getVendorName(
                    viewingContract.vendor_id
                  )}
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  Vendor ID
                </span>

                <strong>
                  {
                    viewingContract.vendor_id
                  }
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  Contract Value
                </span>

                <strong>
                  ₹
                  {formatValue(
                    viewingContract.contract_value
                  )}
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  Start Date
                </span>

                <strong>
                  {formatDate(
                    viewingContract.start_date
                  )}
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  End Date
                </span>

                <strong>
                  {formatDate(
                    viewingContract.end_date
                  )}
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>
                  Renewal Notice
                </span>

                <strong>
                  {
                    viewingContract.renewal_notice_days ??
                    30
                  }{" "}
                  days
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>Expiry</span>

                <div className="expiry-info">
                  <span
                    className={`expiry-badge ${
                      getExpiryDetails(
                        viewingContract.end_date
                      ).className
                    }`}
                  >
                    {
                      getExpiryDetails(
                        viewingContract.end_date
                      ).status
                    }
                  </span>

                  <small>
                    {getExpiryText(
                      viewingContract.end_date
                    )}
                  </small>

                  {getExpiryDetails(
                    viewingContract.end_date
                  ).risk !==
                    "Unknown" && (
                    <small>
                      Risk:{" "}
                      {
                        getExpiryDetails(
                          viewingContract.end_date
                        ).risk
                      }
                    </small>
                  )}
                </div>
              </div>

              <div className="contract-detail-item">
                <span>
                  Compliance
                </span>

                <strong
                  className={`contract-detail-status ${
                    (
                      viewingContract.compliance_status ||
                      "Compliant"
                    )
                      .toLowerCase()
                      .replace(
                        /\s+/g,
                        "-"
                      )
                  }`}
                >
                  {viewingContract.compliance_status ||
                    "Compliant"}
                </strong>
              </div>

              <div className="contract-detail-item">
                <span>Status</span>

                <strong
                  className={`contract-detail-status ${
                    viewingContract.status?.toLowerCase()
                  }`}
                >
                  {
                    viewingContract.status
                  }
                </strong>
              </div>

              <div className="contract-detail-description">
                <span>
                  Description
                </span>

                <p>
                  {viewingContract.description ||
                    "No description provided."}
                </p>
              </div>
            </div>

            <div className="contract-modal-actions">
              <button
                type="button"
                className="contract-cancel-btn"
                onClick={() =>
                  setViewingContract(
                    null
                  )
                }
              >
                Close
              </button>

              {canEdit && (
                <button
                  type="button"
                  className="contract-save-btn"
                  onClick={() => {
                    setViewingContract(
                      null
                    );

                    handleEdit(
                      viewingContract
                    );
                  }}
                >
                  <FaEdit />
                  Edit Contract
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractManagement;