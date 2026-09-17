 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminSidebar from "../components/AdminSidebar";
import { getAdminDashboard } from "../services/api";

import "../styles/UserManagement.css";

import {
  FaUsers,
  FaUserPlus,
  FaArrowLeft,
  FaSearch,
} from "react-icons/fa";

export default function UserManagement() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminDashboard();

      console.log("Admin dashboard response:", data);

      setDashboard(data);

      setUsers(
        Array.isArray(data?.users)
          ? data.users
          : []
      );
    } catch (err) {
      console.error(
        "User management error:",
        err
      );

      setError(
        err.message ||
          "Failed to load user information"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-page-loading">
        <h2>Loading User Management...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-page-error">
        <h2>
          Unable to load User Management
        </h2>

        <p>{error}</p>

        <button onClick={loadUsers}>
          Try Again
        </button>
      </div>
    );
  }

  const stats = dashboard?.stats || {};

  const totalUsers =
    Number(stats.totalUsers) || 0;

  const filteredUsers = users.filter((user) => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    if (!search) {
      return true;
    }

    return (
      String(user.user_id || "")
        .toLowerCase()
        .includes(search) ||
      String(user.full_name || "")
        .toLowerCase()
        .includes(search) ||
      String(user.email || "")
        .toLowerCase()
        .includes(search) ||
      String(user.phone || "")
        .toLowerCase()
        .includes(search) ||
      String(user.role_id || "")
        .toLowerCase()
        .includes(search) ||
      String(user.status || "")
        .toLowerCase()
        .includes(search)
    );
  });

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  return (
    <div className="user-management-layout">

      <AdminSidebar />

      <main className="user-management-main">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="user-page-header">

          <div>
            <h1>User Management</h1>

            <p>
              Manage system users, roles and
              account information.
            </p>
          </div>

          <button
            className="back-button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            <FaArrowLeft />
            Dashboard
          </button>

        </div>

        {/* =====================================================
            USER KPI
        ===================================================== */}

        <section className="user-stat-card">

          <div className="user-stat-icon">
            <FaUsers />
          </div>

          <div>
            <h2>{totalUsers}</h2>

            <p>
              Registered Users
            </p>
          </div>

        </section>

        {/* =====================================================
            SYSTEM USERS INFORMATION
        ===================================================== */}

        <section className="user-management-card">

          <div className="user-card-header">

            <div>
              <h2>System Users</h2>

              <p>
                Users registered in the
                VendorIQ platform.
              </p>
            </div>

            <button
              className="add-user-button"
              type="button"
            >
              <FaUserPlus />
              Add User
            </button>

          </div>

          <div className="user-info-grid">

            <div className="user-info-item">

              <div className="user-info-icon">
                <FaUsers />
              </div>

              <div>
                <h3>
                  Registered Users
                </h3>

                <p>
                  The system currently contains{" "}
                  <strong>
                    {totalUsers}
                  </strong>{" "}
                  registered user accounts.
                </p>
              </div>

            </div>

            <div className="user-info-item">

              <div className="user-info-icon">
                <FaUsers />
              </div>

              <div>
                <h3>
                  Role-Based Access
                </h3>

                <p>
                  Each account is associated
                  with a role through the
                  role_id field.
                </p>
              </div>

            </div>

            <div className="user-info-item">

              <div className="user-info-icon">
                <FaUsers />
              </div>

              <div>
                <h3>
                  Account Status
                </h3>

                <p>
                  User account status is
                  retrieved directly from
                  the database.
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            USERS TABLE
        ===================================================== */}

        <section className="users-table-card">

          <div className="users-table-header">

            <div>
              <h2>
                All Users
              </h2>

              <p>
                Live user records from the
                VendorIQ database.
              </p>
            </div>

            <div className="user-search-box">

              <FaSearch />

              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="users-table-wrapper">

            <table className="users-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role ID</th>
                  <th>Status</th>
                  <th>Vendor ID</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                    >

                      <td>
                        <span className="user-id">
                          #{user.user_id}
                        </span>
                      </td>

                      <td>
                        <div className="user-name-cell">
                          <div className="user-avatar">
                            {(
                              user.full_name ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>
                            {user.full_name ||
                              "—"}
                          </span>
                        </div>
                      </td>

                      <td>
                        {user.email ||
                          "—"}
                      </td>

                      <td>
                        {user.phone ||
                          "—"}
                      </td>

                      <td>
                        <span className="role-badge">
                          Role {user.role_id ?? "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`user-status ${
                            String(
                              user.status || ""
                            )
                              .toLowerCase()
                              .replace(
                                /\s+/g,
                                "-"
                              )
                          }`}
                        >
                          {user.status ||
                            "—"}
                        </span>
                      </td>

                      <td>
                        {user.vendor_id ??
                          "—"}
                      </td>

                      <td>
                        {formatDate(
                          user.created_at
                        )}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="no-users"
                    >
                      {users.length === 0
                        ? "No users found in the database."
                        : "No users match your search."}
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          <div className="users-table-footer">

            <span>
              Showing{" "}
              <strong>
                {filteredUsers.length}
              </strong>{" "}
              of{" "}
              <strong>
                {users.length}
              </strong>{" "}
              users
            </span>

          </div>

        </section>

        {/* =====================================================
            INFORMATION NOTE
        ===================================================== */}

        <section className="user-note">

          <h3>
            User Management
          </h3>

          <p>
            The platform currently has{" "}
            <strong>
              {totalUsers}
            </strong>{" "}
            registered users. User records
            displayed above are retrieved
            directly from the VendorIQ
            PostgreSQL database.
          </p>

        </section>

      </main>

    </div>
  );
}