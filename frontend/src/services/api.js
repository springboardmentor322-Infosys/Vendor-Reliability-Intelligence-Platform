 const API_URL = "http://localhost:5000/api";

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";

    throw new Error(
      data.message || "Session expired. Please login again."
    );
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

/* ==============================
   AUTHENTICATION
================================ */

export const registerUser = async (userData) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
};

export const loginUser = async (loginData) => {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(loginData),
  });

  localStorage.setItem("token", data.token);

  localStorage.setItem(
    "user",
    JSON.stringify(data.user)
  );

  return data;
};

export const getAdminTest = async () => {
  return apiRequest("/auth/admin-test", {
    method: "GET",
  });
};

/* ==============================
   PROFILE
================================ */

export const getProfile = async () => {
  return apiRequest("/auth/profile", {
    method: "GET",
  });
};

export const updateProfile = async (profileData) => {
  return apiRequest("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
};

/* ==============================
   ROLE DASHBOARDS
================================ */

export const getAdminDashboard = async () => {
  return apiRequest("/dashboard/admin", {
    method: "GET",
  });
};

export const getProcurementDashboard = async () => {
  return apiRequest("/dashboard/procurement", {
    method: "GET",
  });
};

export const getSupplyChainDashboard = async () => {
  return apiRequest("/dashboard/supply-chain", {
    method: "GET",
  });
};

export const getFinanceDashboard = async () => {
  return apiRequest("/dashboard/finance", {
    method: "GET",
  });
};

export const getVendorDashboard = async () => {
  return apiRequest("/dashboard/vendor", {
    method: "GET",
  });
};

export const getAuditorDashboard = async () => {
  return apiRequest("/dashboard/auditor", {
    method: "GET",
  });
};

/* ==============================
   AUDITOR INSPECTIONS
================================ */

export const getAuditDeliveries = async () => {
  return apiRequest("/auditor/deliveries", {
    method: "GET",
  });
};

export const getAuditInspections = async () => {
  return apiRequest("/auditor/inspections", {
    method: "GET",
  });
};

export const getAuditInspectionByDelivery = async (
  deliveryId
) => {
  return apiRequest(
    `/auditor/inspections/delivery/${deliveryId}`,
    {
      method: "GET",
    }
  );
};

export const createAuditInspection = async (
  inspectionData
) => {
  return apiRequest("/auditor/inspections", {
    method: "POST",
    body: JSON.stringify(inspectionData),
  });
};
export const getVendorInvoices = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch(
    "http://localhost:5000/api/invoices",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to load invoices"
    );
  }

  return data;
};