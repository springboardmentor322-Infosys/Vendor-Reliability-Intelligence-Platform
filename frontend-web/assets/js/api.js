/**
 * Small fetch() wrapper so every page talks to the backend the same way:
 * - automatically attaches the JWT (if we have one)
 * - automatically redirects to login on a 401 (expired/invalid token)
 * - parses JSON and throws a normal Error with the backend's message on failure
 */
const TOKEN_KEY = "vendoriq_token";
const USER_KEY = "vendoriq_user";

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "index.html";
  },
  /** Call at the top of any protected page (dashboard.html, vendors.html). */
  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = "index.html";
    }
  },
};

const Api = {
  async request(path, { method = "GET", body, formEncoded = false } = {}) {
    const headers = {};
    const token = Auth.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let payload = body;
    if (body && !formEncoded) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    } else if (formEncoded) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload,
    });

    if (res.status === 401) {
      Auth.logout();
      throw new Error("Session expired. Please log in again.");
    }

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const message = data?.detail
        ? typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail)
        : `Request failed (${res.status})`;
      throw new Error(message);
    }

    return data;
  },

  get(path) {
    return this.request(path);
  },
  post(path, body, opts = {}) {
    return this.request(path, { method: "POST", body, ...opts });
  },
  patch(path, body) {
    return this.request(path, { method: "PATCH", body });
  },
};
