// =====================================
// API CONFIGURATION
// =====================================

const BASE_URL = "http://127.0.0.1:8000";


// =====================================
// GENERIC API REQUEST
// =====================================

async function apiRequest(
    endpoint,
    method = "GET",
    data = null,
    token = null
) {
    const authToken = token || getToken();

    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (authToken) {
        options.headers.Authorization =
            `Bearer ${authToken}`;
    }

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    console.log(
        `${method} ${BASE_URL}${endpoint}`
    );

    try {
        const response = await fetch(
            `${BASE_URL}${endpoint}`,
            options
        );

        let result = null;

        const contentType =
            response.headers.get("content-type");

        if (
            contentType &&
            contentType.includes("application/json")
        ) {
            result = await response.json();
        }

        if (!response.ok) {
            console.error(
                "API Error:",
                response.status,
                result
            );

            throw new Error(
                result?.detail ||
                `Request failed with status ${response.status}`
            );
        }

        console.log(
            "API Response:",
            result
        );

        return result;

    } catch (error) {
        console.error(
            "API Request Failed:",
            error
        );

        throw error;
    }
}

// =====================================
// AUTH
// =====================================

async function loginUser(
    email,
    password
) {

    return apiRequest(
        "/auth/login",
        "POST",
        {
            email,
            password
        }
    );
}


async function registerUser(user) {

    return apiRequest(
        "/auth/register",
        "POST",
        user
    );
}




// =====================================
// TOKEN
// =====================================

function saveToken(token) {

    localStorage.setItem(
        "access_token",
        token
    );
}


function getToken() {

    return localStorage.getItem(
        "access_token"
    );
}


function removeToken() {

    localStorage.removeItem(
        "access_token"
    );
}

function isLoggedIn() {

    return getToken() !== null;
}


// =====================================
// DASHBOARD
// =====================================

async function getDashboardSummary() {

    return apiRequest(
        "/dashboard/summary",
        "GET",
        null,
        getToken()
    );
}


async function getVendorStats() {

    return apiRequest(
        "/dashboard/vendor-stats"
    );
}


async function getVendorCategories() {

    return apiRequest(
        "/dashboard/vendor-categories"
    );
}


async function getProcurementTrend() {

    return apiRequest(
        "/dashboard/procurement-trend"
    );
}


async function getComplianceStatus() {

    return apiRequest(
        "/dashboard/compliance"
    );
}

async function getAdministratorCompliance() {

    return apiRequest(
        "/dashboard/administrator/compliance",
        "GET",
        null,
        getToken()
    );
}






async function getAdministratorDashboard() {

    return apiRequest(
        "/dashboard/administrator",
        "GET",
        null,
        getToken()
    );
}

async function getAdministratorVendorReliability() {

    return apiRequest(
        "/dashboard/administrator/vendor-reliability",
        "GET",
        null,
        getToken()
    );
}


async function getAdministratorProcurementActivity() {

    return apiRequest(
        "/dashboard/administrator/procurement-activity",
        "GET",
        null,
        getToken()
    );
}


async function getAdministratorVendorCategories() {

    return apiRequest(
        "/dashboard/administrator/vendor-categories",
        "GET",
        null,
        getToken()
    );
}




// =====================================
// VENDORS
// =====================================

async function getVendors() {

    return apiRequest(
        "/vendors"
    );
}


async function getVendor(id) {

    return apiRequest(
        `/vendors/${id}`
    );
}


async function createVendor(data) {

    return apiRequest(
        "/vendors",
        "POST",
        data
    );
}


async function updateVendor(id, data) {

    return apiRequest(
        `/vendors/${id}`,
        "PUT",
        data
    );
}


async function deleteVendor(id) {

    return apiRequest(
        `/vendors/${id}`,
        "DELETE"
    );
}


// =====================================
// PRODUCTS
// =====================================

async function getProducts() {

    return apiRequest(
        "/products"
    );
}


async function getProduct(id) {

    return apiRequest(
        `/products/${id}`
    );
}


async function createProduct(data) {

    return apiRequest(
        "/products",
        "POST",
        data
    );
}


async function updateProduct(id, data) {

    return apiRequest(
        `/products/${id}`,
        "PUT",
        data
    );
}


async function deleteProduct(id) {

    return apiRequest(
        `/products/${id}`,
        "DELETE"
    );
}


// =====================================
// PURCHASE ORDERS
// =====================================

async function getPurchaseOrders(
    page = 1,
    limit = 50
) {

    return await apiRequest(
        `/purchase-orders/?page=${page}&limit=${limit}`
    );
}


async function getPurchaseOrder(id) {

    return apiRequest(
        `/purchase-orders/${id}`
    );
}


async function createPurchaseOrder(data) {

    return apiRequest(
        "/purchase-orders",
        "POST",
        data
    );
}


async function updatePurchaseOrder(
    id,
    data
) {

    return apiRequest(
        `/purchase-orders/${id}`,
        "PUT",
        data
    );
}


async function deletePurchaseOrder(id) {

    return apiRequest(
        `/purchase-orders/${id}`,
        "DELETE"
    );
}


// =====================================
// DELIVERIES
// =====================================

async function getDeliveries(
    page = 1,
    limit = 50
) {

    return await apiRequest(
        `/deliveries/?page=${page}&limit=${limit}`
    );

}

async function getDelivery(id) {

    return apiRequest(
        `/deliveries/${id}`
    );
}


async function createDelivery(data) {

    return apiRequest(
        "/deliveries",
        "POST",
        data
    );
}


async function updateDelivery(
    id,
    data
) {

    return apiRequest(
        `/deliveries/${id}`,
        "PUT",
        data
    );
}


async function deleteDelivery(id) {

    return apiRequest(
        `/deliveries/${id}`,
        "DELETE"
    );
}


// =====================================
// CONTRACTS
// =====================================





async function getContracts(
    page = 1,
    limit = 50
) {

    return await apiRequest(
        `/contracts/?page=${page}&limit=${limit}`
    );

}

async function getContract(id) {

    return apiRequest(
        `/contracts/${id}`
    );
}


async function createContract(contract) {

    return apiRequest(
        "/contracts/",
        "POST",
        contract,
        getToken()
    );
}


async function updateContract(id, contract) {

    return apiRequest(
        `/contracts/${id}`,
        "PUT",
        contract,
        getToken()
    );
}


async function deleteContract(id) {

    return apiRequest(
        `/contracts/${id}`,
        "DELETE",
        null,
        getToken()
    );
}
// =====================================
// INVOICES
// =====================================



async function getInvoices(
  page = 1,
  limit = 50
) {

  return await apiRequest(
    `/invoices/?page=${page}&limit=${limit}`
  );

}

async function getInvoice(id) {

    return apiRequest(
        `/invoices/${id}`
    );
}


async function createInvoice(invoice) {

    return apiRequest(
        "/invoices/",
        "POST",
        invoice,
        getToken()
    );
}


async function updateInvoice(id, invoice) {

    return apiRequest(
        `/invoices/${id}`,
        "PUT",
        invoice,
        getToken()
    );
}


async function deleteInvoice(id) {

    return apiRequest(
        `/invoices/${id}`,
        "DELETE",
        null,
        getToken()
    );
}
// =====================================
// QUALITY INSPECTIONS
// =====================================





async function getQualityInspections(
    page = 1,
    pageSize = 50
) {

    return await apiRequest(
        `/quality-inspections/?page=${page}&page_size=${pageSize}`
    );

}

async function getQualityInspection(id) {

    return apiRequest(
        `/quality-inspections/${id}`
    );
}



async function createQualityInspection(data) {

    return apiRequest(
        "/quality-inspections/",
        "POST",
        data,
        getToken()
    );
}


async function updateQualityInspection(id, data) {

    return apiRequest(
        `/quality-inspections/${id}`,
        "PUT",
        data,
        getToken()
    );
}


async function deleteQualityInspection(id) {

    return apiRequest(
        `/quality-inspections/${id}`,
        "DELETE",
        null,
        getToken()
    );
}

// =====================================
// COMMUNICATION HISTORY
// =====================================

async function getCommunicationHistory() {

    return apiRequest(
        "/communication-history"
    );
}


async function getCommunication(id) {

    return apiRequest(
        `/communication-history/${id}`
    );
}


async function createCommunication(data) {

    return apiRequest(
        "/communication-history",
        "POST",
        data
    );
}


async function updateCommunication(
    id,
    data
) {

    return apiRequest(
        `/communication-history/${id}`,
        "PUT",
        data
    );
}


async function deleteCommunication(id) {

    return apiRequest(
        `/communication-history/${id}`,
        "DELETE"
    );
}


// =====================================
// NOTIFICATIONS
// =====================================

async function getNotifications() {

    return apiRequest(
        "/notifications"
    );
}


async function getNotification(id) {

    return apiRequest(
        `/notifications/${id}`
    );
}


async function createNotification(data) {

    return apiRequest(
        "/notifications",
        "POST",
        data
    );
}


async function updateNotification(
    id,
    data
) {

    return apiRequest(
        `/notifications/${id}`,
        "PUT",
        data
    );
}


async function deleteNotification(id) {

    return apiRequest(
        `/notifications/${id}`,
        "DELETE"
    );
}

// =====================================
// USER MANAGEMENT
// =====================================

async function getUsers() {
    return apiRequest(
        "/users/",
        "GET",
        null,
        getToken()
    );
}

async function getUser(id) {
    return apiRequest(
        `/users/${id}`,
        "GET",
        null,
        getToken()
    );
}

async function createManagedUser(data) {
    return apiRequest(
        "/users/",
        "POST",
        data,
        getToken()
    );
}

async function updateManagedUser(id, data) {
    return apiRequest(
        `/users/${id}`,
        "PUT",
        data,
        getToken()
    );
}

async function deleteManagedUser(id) {
    return apiRequest(
        `/users/${id}`,
        "DELETE",
        null,
        getToken()
    );
}
/* =========================================================
   ADMINISTRATOR RECENT VENDORS
========================================================= */

async function getAdministratorRecentVendors() {
  return await apiRequest(
    "/dashboard/administrator/recent-vendors",
    "GET",
    null,
    getToken()
  );
}

/* =========================================================
   ADMINISTRATOR RECENT PURCHASE ORDERS
========================================================= */

async function getAdministratorRecentPurchaseOrders() {
  return await apiRequest(
    "/dashboard/administrator/recent-purchase-orders",
    "GET",
    null,
    getToken()
  );
}

// =====================================
// SETTINGS API
// =====================================

async function getSettings() {

    return apiRequest(
        "/settings",
        "GET",
        null,
        getToken()
    );

}


async function updateProfile(
    fullName
) {

    return apiRequest(
        "/settings/profile",
        "PATCH",
        {
            full_name: fullName
        },
        getToken()
    );

}


async function changePassword(
    currentPassword,
    newPassword
) {

    return apiRequest(
        "/settings/change-password",
        "POST",
        {
            current_password:
                currentPassword,

            new_password:
                newPassword
        },
        getToken()
    );

}

// =====================================
// ANALYTICS
// =====================================

async function getAnalyticsOverview(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/analytics/overview${query ? `?${query}` : ""}`);
}


// =====================================
// REPORTS
// =====================================

async function getReportOverview(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/overview${query ? `?${query}` : ""}`);
}

async function getVendorReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/vendors${query ? `?${query}` : ""}`);
}

async function getProcurementReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/procurement${query ? `?${query}` : ""}`);
}

async function getDeliveryReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/deliveries${query ? `?${query}` : ""}`);
}

async function getFinancialReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/financial${query ? `?${query}` : ""}`);
}

async function getContractReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/contracts${query ? `?${query}` : ""}`);
}

async function getQualityReport(startDate = "", endDate = "") {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const query = params.toString();
    return apiRequest(`/reports/quality${query ? `?${query}` : ""}`);
}
