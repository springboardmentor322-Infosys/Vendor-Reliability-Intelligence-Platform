(() => {
  "use strict";

  const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";
  const configuredBaseUrl = typeof window.VENDORIQ_API_BASE_URL === "string"
    ? window.VENDORIQ_API_BASE_URL.trim()
    : "";
  const API_BASE_URL = (configuredBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

  class ApiError extends Error {
    constructor(message, status = 0, payload = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.payload = payload;
    }
  }

  function formatValidationIssues(issues) {
    if (!Array.isArray(issues)) {
      return "";
    }

    return issues
      .map((issue) => {
        if (!issue || typeof issue !== "object") {
          return "";
        }

        const location = Array.isArray(issue.loc)
          ? issue.loc.filter((part) => part !== "body").join(" → ")
          : "";
        const message = issue.msg || issue.message || "Invalid value";
        return location ? `${location}: ${message}` : message;
      })
      .filter(Boolean)
      .join(" ");
  }

  function getErrorMessage(payload, fallbackMessage) {
    if (!payload) {
      return fallbackMessage;
    }

    if (typeof payload === "string") {
      return payload;
    }

    const detail = payload.detail;
    if (typeof detail === "string") {
      return detail;
    }

    const validationMessage = formatValidationIssues(detail);
    if (validationMessage) {
      return validationMessage;
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }

    return fallbackMessage;
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 204) {
      return null;
    }

    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (_) {
        return null;
      }
    }

    try {
      const text = await response.text();
      return text || null;
    } catch (_) {
      return null;
    }
  }

  async function request(path, options = {}) {
    const {
      method = "GET",
      body,
      token,
      headers = {},
      signal,
      _retry = false
    } = options;
    const requestHeaders = {
      Accept: "application/json",
      ...headers
    };

    const authToken = token || (window.VendorIQAuth ? window.VendorIQAuth.getAccessToken() : "");
    if (authToken) {
      requestHeaders.Authorization = `Bearer ${authToken}`;
    }

    const requestOptions = {
      method,
      headers: requestHeaders,
      signal
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        "Unable to connect to the VendorIQ server. Confirm that the backend is running and try again."
      );
    }

    const payload = await parseResponse(response);
    if (!response.ok) {
      if (response.status === 401 && !_retry && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh-token")) {
        const auth = window.VendorIQAuth;
        if (auth && auth.getRefreshToken()) {
          try {
            const newToken = await auth.refreshAccessToken();
            return await request(path, { ...options, token: newToken, _retry: true });
          } catch (_) {
            if (auth) {
              auth.clearSession();
              auth.redirectToLogin();
            }
            throw new ApiError("Session expired. Please sign in again.", 401, payload);
          }
        } else if (auth) {
          auth.clearSession();
          auth.redirectToLogin();
        }
      }

      throw new ApiError(
        getErrorMessage(payload, `Request failed (${response.status}).`),
        response.status,
        payload
      );
    }

    return payload;
  }

  function responseData(payload) {
    if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
      return payload.data;
    }
    return payload || {};
  }

  function tokenFrom(payload, type) {
    const data = responseData(payload);
    const tokenKey = type === "refresh" ? "refresh_token" : "access_token";
    const alternateKey = type === "refresh" ? "refreshToken" : "accessToken";
    const nestedTokens = data.tokens && typeof data.tokens === "object" ? data.tokens : {};

    return data[tokenKey] || data[alternateKey] || nestedTokens[tokenKey] || nestedTokens[alternateKey] || "";
  }

  window.VendorIQApi = Object.freeze({
    baseUrl: API_BASE_URL,
    ApiError,
    getErrorMessage,
    responseData,
    tokenFrom,
    request,
    register: (payload) => request("/auth/register", { method: "POST", body: payload }),
    login: (email, password) => request("/auth/login", {
      method: "POST",
      body: { email, password }
    }),
    refreshToken: (refreshToken) => request("/auth/refresh-token", {
      method: "POST",
      body: { refresh_token: refreshToken }
    }),
    me: (accessToken) => request("/auth/me", { token: accessToken })
  });
})();
