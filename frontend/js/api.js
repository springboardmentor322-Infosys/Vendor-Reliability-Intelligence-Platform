// ===============================
// Backend Configuration
// ===============================

const BASE_URL = "http://127.0.0.1:8000";

// ===============================
// Generic API Request
// ===============================

async function apiRequest(endpoint, method = "GET", data = null, token = null) {

    const options = {
        method: method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    const result = await response.json();

    if (!response.ok) {
        throw result;
    }

    return result;
}

// ===============================
// Authentication APIs
// ===============================

async function loginUser(email, password) {

    return await apiRequest("/auth/login", "POST", {
        email,
        password
    });

}

async function registerUser(userData) {

    return await apiRequest("/auth/register", "POST", userData);

}

// ===============================
// Token Management
// ===============================

function saveToken(token) {

    localStorage.setItem("access_token", token);

}

function getToken() {

    return localStorage.getItem("access_token");

}

function removeToken() {

    localStorage.removeItem("access_token");

}

// ===============================
// Login Status
// ===============================

function isLoggedIn() {

    return getToken() !== null;

}

async function getCurrentUser() {

    return await apiRequest(
        "/auth/me",
        "GET",
        null,
        getToken()
    );

}