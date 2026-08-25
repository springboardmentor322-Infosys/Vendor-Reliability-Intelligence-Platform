const API_BASE = "http://127.0.0.1:8000";
let currentSelectedRole = 'All';
let currentActiveView = 'home';

function formatRoleName(role) {
  if (role === 'procurement_manager') return 'Procurement Manager';
  if (role === 'auditor' || role === 'finance_officer') return 'Finance Officer';
  if (role === 'vendor') return 'Vendor';
  return role;
}

function navigateTo(pageView, roleFilter = 'All', element = null) {
  currentActiveView = pageView;
  document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active-view'));
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

  if (element) {
    element.classList.add('active');
  } else {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const onclickAttr = item.getAttribute('onclick') || '';
      if (pageView === 'home' && onclickAttr.includes("'home'")) {
        item.classList.add('active');
      } else if (pageView === 'notifications' && onclickAttr.includes("'notifications'")) {
        item.classList.add('active');
      } else if (pageView === 'users' && onclickAttr.includes(`'${roleFilter}'`)) {
        item.classList.add('active');
      }
    });
  }

  if (pageView === 'home') {
    document.getElementById('view-home').classList.add('active-view');
    loadDashboardData(true);
  } else if (pageView === 'notifications') {
    document.getElementById('view-notifications').classList.add('active-view');
    renderNotificationsView(true);
  } else if (pageView === 'users') {
    document.getElementById('view-users').classList.add('active-view');
    currentSelectedRole = roleFilter;
    
    const pageHeading = document.getElementById('role-heading');
    pageHeading.innerText = roleFilter === 'All' ? 'All Registered Users' : `${roleFilter} List`;

    renderUserTable(true);
  }
}

async function loadDashboardData(isInitial = false) {
  try {
    const res = await fetch(`${API_BASE}/admin/metrics`);
    if (!res.ok) return;
    const metrics = await res.json();

    updateTextIfChanged('stat-total-users', metrics.total_users);
    updateTextIfChanged('stat-pending-approvals', metrics.pending_approvals);
    updateTextIfChanged('count-pm', metrics.pm_count);
    updateTextIfChanged('count-fo', metrics.fo_count);
    updateTextIfChanged('count-vendor', metrics.vendor_count);

    renderActivityLogs(isInitial);
    loadActiveSessionsCount();
  } catch (err) {
    console.error("Failed to load metrics:", err);
  }
}

function updateTextIfChanged(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (el && el.innerText != newValue) {
    el.innerText = newValue;
  }
}

async function loadActiveSessionsCount() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/active-sessions-count`);
    if (res.ok) {
      const data = await res.json();
      updateTextIfChanged("activeSessionsCount", data.active_sessions !== undefined ? data.active_sessions : 0);
    }
  } catch (err) {
    console.error("Failed to fetch active sessions count:", err);
  }
}

async function renderUserTable(isInitial = false) {
  const tbody = document.getElementById('user-table-body');
  if (!tbody) return;
  if (isInitial && tbody.children.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading users...</td></tr>';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/users?role=${encodeURIComponent(currentSelectedRole)}`);
    if (!res.ok) return;
    const users = await res.json();

    let newHTML = '';
    if (users.length === 0) {
      newHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No registered users under: ${currentSelectedRole}</td></tr>`;
    } else {
      users.forEach(user => {
        newHTML += `
          <tr>
            <td><strong>${user.fullname}</strong></td>
            <td>${user.email}</td>
            <td><span class="role-badge">${formatRoleName(user.role)}</span></td>
            <td>
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <button class="btn btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="loginAsUser(${user.id}, '${user.role}')">
                  <span class="material-symbols-outlined" style="font-size:16px;">login</span> Login
                </button>
                <button class="btn btn-danger btn-danger-sm" onclick="removeUser(${user.id}, '${user.fullname}')">
                  <span class="material-symbols-outlined" style="font-size:14px;">delete</span> Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    if (tbody.innerHTML.trim() !== newHTML.trim()) {
      tbody.innerHTML = newHTML;
    }
  } catch (err) {
    console.error("Failed to fetch users table:", err);
  }
}

function loginAsUser(userId, role) {
  sessionStorage.setItem("user_id", userId);
  sessionStorage.setItem("user_role", role);

  if (role === 'procurement_manager') {
    window.location.href = './manager_dash.html';
  } else if (role === 'finance_officer' || role === 'auditor') {
    window.location.href = './finance_dash.html';
  } else if (role === 'vendor') {
    window.location.href = './vendor_dash.html';
  } else {
    window.location.href = '../login/login.html';
  }
}

async function renderActivityLogs(isInitial = false) {
  const activityList = document.getElementById('activity-log-list');
  if (!activityList) return;
  if (isInitial && activityList.children.length === 0) {
    activityList.innerHTML = '<li style="padding:0.5rem;">Loading activity...</li>';
  }

  try {
    const res = await fetch(`${API_BASE}/admin/pending-users`);
    if (!res.ok) return;
    const pendingUsers = await res.json();

    let newHTML = '';
    if (pendingUsers.length === 0) {
      newHTML = '<li style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem;">No pending user registration requests.</li>';
    } else {
      pendingUsers.forEach(user => {
        newHTML += `
          <li class="activity-item">
            <div class="activity-header">
              <span class="material-symbols-outlined" style="color:var(--warning-color)">pending_actions</span>
              <div>
                <strong>Pending Approval</strong>
                <div class="card-subtitle">${user.fullname} (${user.email}) requested ${formatRoleName(user.role)} account</div>
              </div>
            </div>
            <div class="activity-actions">
              <button class="btn btn-success" onclick="approveUserFromActivity(${user.id})">
                <span class="material-symbols-outlined" style="font-size:14px;">check</span> Approve
              </button>
              <button class="btn btn-danger btn-danger-sm" onclick="rejectUserFromActivity(${user.id})">
                <span class="material-symbols-outlined" style="font-size:14px;">close</span> Reject
              </button>
            </div>
          </li>
        `;
      });
    }

    if (activityList.innerHTML.trim() !== newHTML.trim()) {
      activityList.innerHTML = newHTML;
    }
  } catch (err) {
    console.error("Could not load pending requests:", err);
  }
}

async function renderNotificationsView(isInitial = false) {
  const tbody = document.getElementById('notifications-table-body');
  if (!tbody) return;
  if (isInitial && tbody.children.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading notifications...</td></tr>';
  }

  try {
    const logsRes = await fetch(`${API_BASE}/admin/system-logs`);
    if (!logsRes.ok) return;
    const systemLogs = await logsRes.json();

    let newHTML = '';
    if (systemLogs.length === 0) {
      newHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">No system notifications.</td></tr>';
    } else {
      systemLogs.forEach(log => {
        let badgeStyle = 'background-color: #f3f4f6; color: #374151;';
        let actionHTML = `<span style="color: var(--text-muted); font-size:0.85rem;">Logged</span>`;

        if (log.event_type === 'Pending Approval') {
          badgeStyle = 'background-color: #fff7ed; color: #c2410c;';
          actionHTML = `<span style="color: var(--warning-color); font-weight:600; font-size:0.85rem;">Awaiting Review</span>`;
        } else if (log.event_type === 'Approved') {
          badgeStyle = 'background-color: #f0fdf4; color: #16a34a;';
          actionHTML = `<span style="color: var(--success-color); font-weight:600; font-size:0.85rem;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">check_circle</span> Approved</span>`;
        } else if (log.event_type === 'User Rejected') {
          badgeStyle = 'background-color: #fff1f2; color: #e11d48;';
          actionHTML = `<span style="color: #e11d48; font-weight:600; font-size:0.85rem;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">close</span> Rejected</span>`;
        } else if (log.event_type === 'User Deleted') {
          badgeStyle = 'background-color: #fef2f2; color: #dc2626;';
          actionHTML = `<span style="color: var(--danger-color); font-weight:600; font-size:0.85rem;"><span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">delete</span> Removed</span>`;
        }

        newHTML += `
          <tr>
            <td>${log.timestamp}</td>
            <td><span class="role-badge" style="${badgeStyle}">${log.event_type}</span></td>
            <td>${log.description}</td>
            <td>${actionHTML}</td>
          </tr>
        `;
      });
    }

    if (tbody.innerHTML.trim() !== newHTML.trim()) {
      tbody.innerHTML = newHTML;
    }
  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
}

async function markAllNotificationsRead() {
  try {
    await fetch(`${API_BASE}/admin/system-logs/read`, { method: 'PUT' });
    renderNotificationsView(false);
  } catch (err) {
    console.error("Failed to mark notifications read:", err);
  }
}

async function approveUserFromActivity(userId) {
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/approve`, { method: 'PUT' });
    if (res.ok) {
      loadDashboardData(false);
      renderNotificationsView(false);
    }
  } catch (err) {
    alert("Error approving user.");
  }
}

async function rejectUserFromActivity(userId) {
  if (confirm("Are you sure you want to reject this request?")) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDashboardData(false);
        renderNotificationsView(false);
      }
    } catch (err) {
      alert("Error rejecting user.");
    }
  }
}

async function removeUser(userId, userName) {
  if (confirm(`Are you sure you want to delete ${userName}?`)) {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        renderUserTable(false);
        loadDashboardData(false);
        renderNotificationsView(false);
      }
    } catch (err) {
      alert("Error deleting user.");
    }
  }
}

function openAddUserModal() {
  document.getElementById('user-modal').classList.add('active');
}

function closeAddUserModal() {
  document.getElementById('user-modal').classList.remove('active');
  document.getElementById('add-user-form').reset();
}

async function handleAddUserSubmit(event) {
  event.preventDefault();
  
  const fullname = document.getElementById('user-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const phone = document.getElementById('user-phone').value.trim();
  const roleName = document.getElementById('user-role').value;
  const password = document.getElementById('user-pass').value;
  const repassword = document.getElementById('user-repass').value;

  if (password !== repassword) {
    alert("Passwords do not match!");
    return;
  }
  
  const roleMap = {
    'Procurement Manager': 'procurement_manager',
    'Finance Officer': 'finance_officer',
    'Vendor': 'vendor'
  };
  
  const role = roleMap[roleName] || 'vendor';

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullname, email, phone, role, password })
    });

    if (res.ok) {
      alert("User added successfully!");
      closeAddUserModal();
      loadDashboardData(false);
      renderNotificationsView(false);
      if (currentSelectedRole) {
        renderUserTable(false);
      }
    } else {
      const errData = await res.json();
      alert(errData.detail || "Failed to add user.");
    }
  } catch (err) {
    console.error("Error creating user:", err);
    alert(err.message || "Network error while trying to add user.");
  }
}

async function exportUsersToCSV() {
  try {
    const res = await fetch(`${API_BASE}/admin/users?role=${encodeURIComponent(currentSelectedRole)}`);
    if (!res.ok) {
      alert("Failed to fetch user data for export.");
      return;
    }
    const users = await res.json();

    if (users.length === 0) {
      alert("No users available to export under this filter.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Full Name,Email,Role\n";
    users.forEach(user => {
      const row = [
        user.id,
        `"${user.fullname.replace(/"/g, '""')}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        `"${formatRoleName(user.role)}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_${currentSelectedRole.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Failed to export users:", err);
    alert("An error occurred while exporting users.");
  }
}

async function exportRoleToCSV(roleName) {
  try {
    const res = await fetch(`${API_BASE}/admin/users?role=${encodeURIComponent(roleName)}`);
    if (!res.ok) {
      alert(`Failed to fetch ${roleName} data for export.`);
      return;
    }
    const users = await res.json();

    if (users.length === 0) {
      alert(`No users available to export for ${roleName}.`);
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Full Name,Email,Role\n";
    users.forEach(user => {
      const row = [
        user.id,
        `"${user.fullname.replace(/"/g, '""')}"`,
        `"${user.email.replace(/"/g, '""')}"`,
        `"${formatRoleName(user.role)}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users_${roleName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error(`Failed to export ${roleName}:`, err);
    alert(`An error occurred while exporting ${roleName}.`);
  }
}

async function checkActiveSession() {
  const currentUserId = sessionStorage.getItem("user_id");

  if (!currentUserId) {
    window.location.href = "../login/index.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/verify/${currentUserId}`);
    if (!res.ok) {
      alert("Your account has been removed or revoked by an administrator.");
      sessionStorage.clear();
      window.location.href = "../login/index.html";
    }
  } catch (err) {
    console.error("Session verification failed:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkActiveSession();
  loadDashboardData(true);
});

async function handleLogout(event) {
    if (event) event.preventDefault();
    
    const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
    if (userId) {
        try {
            await fetch(`${API_BASE}/api/v1/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: parseInt(userId) })
            });
        } catch (err) {
            console.error("Logout notification failed:", err);
        }
    }

    sessionStorage.clear();
    localStorage.clear();
    window.location.href = '../login/index.html';
}

setInterval(() => {
  const currentUserId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (currentUserId) {
    fetch(`${API_BASE}/users/verify/${currentUserId}`).catch(() => {});
  }
}, 3000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadDashboardData(false);
  }
});

window.addEventListener('beforeunload', () => {
  const userId = sessionStorage.getItem("user_id") || localStorage.getItem("user_id");
  if (userId) {
    fetch(`${API_BASE}/api/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: parseInt(userId) }),
      keepalive: true
    }).catch(() => {});
  }
});

setInterval(() => {
  try {
    if (currentActiveView === 'home') {
      loadDashboardData(false);
    } else if (currentActiveView === 'notifications') {
      renderNotificationsView(false);
    } else if (currentActiveView === 'users' && currentSelectedRole) {
      renderUserTable(false);
    }
  } catch (err) {
    console.error("Background poll error:", err);
  }
}, 3000);