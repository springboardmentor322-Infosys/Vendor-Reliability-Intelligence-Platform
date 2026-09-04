/**
 * Small fetch() wrapper so every page talks to the backend the same way:
 * - automatically attaches the JWT (if we have one)
 * - automatically redirects to login on a 401 (expired/invalid token)
 * - parses JSON and throws a normal Error with the backend's message on failure
 */
const TOKEN_KEY = "vendoriq_token";
const REFRESH_TOKEN_KEY = "vendoriq_refresh_token";
const USER_KEY = "vendoriq_user";

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  setRefreshToken(token) {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
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
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = "index.html";
  },
  async refreshSession() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;
      const tokens = await response.json();
      this.setToken(tokens.access_token);
      this.setRefreshToken(tokens.refresh_token);
      return true;
    } catch (_) {
      return false;
    }
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
    if (body instanceof FormData) {
      payload = body;
    } else if (body && !formEncoded) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    } else if (formEncoded) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    let res;
    const send = () => fetch(`${API_BASE_URL}${path}`, { method, headers, body: payload });
    try {
      res = await send();
    } catch (networkError) {
      throw new Error("Cannot connect to the VendorIQ API. Start Docker Desktop, run START_VENDORIZ.bat, and wait for the API health-check success message.");
    }

    // A 401 while signing in means the entered credentials are wrong.  Do not
    // redirect in that case: the sign-in page needs to show its error message.
    // A 401 on an authenticated request does mean the saved session has expired.
    if (res.status === 401 && token) {
      const refreshed = await Auth.refreshSession();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${Auth.getToken()}`;
        res = await send();
      }
      if (res.status === 401) {
        Auth.logout();
        throw new Error("Session expired. Please log in again.");
      }
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
