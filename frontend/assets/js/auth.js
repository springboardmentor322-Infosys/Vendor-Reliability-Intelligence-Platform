(() => {
  "use strict";

  const api = window.VendorIQApi;
  const STORAGE_KEYS = Object.freeze({
    accessToken: "vendoriq_access_token",
    refreshToken: "vendoriq_refresh_token",
    user: "vendoriq_user"
  });

  function getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      // The application can still continue during this browser session when storage is unavailable.
    }
  }

  function removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {
      // Nothing else is needed if browser storage is unavailable.
    }
  }

  function getAccessToken() {
    const val = getItem(STORAGE_KEYS.accessToken);
    return (val && val !== "null" && val !== "undefined") ? val : "";
  }

  function getRefreshToken() {
    const val = getItem(STORAGE_KEYS.refreshToken);
    return (val && val !== "null" && val !== "undefined") ? val : "";
  }

  function readStoredUser() {
    const storedValue = getItem(STORAGE_KEYS.user);
    if (!storedValue) {
      return null;
    }

    try {
      return normalizeUser(JSON.parse(storedValue));
    } catch (_) {
      removeItem(STORAGE_KEYS.user);
      return null;
    }
  }

  function roleName(role) {
    if (typeof role === "string") {
      return role.trim();
    }

    if (role && typeof role === "object") {
      return String(role.name || role.role_name || role.role || "").trim();
    }

    return "";
  }

  function getRoleNames(user) {
    if (!user || typeof user !== "object") {
      return [];
    }

    const rawRoles = Array.isArray(user.roles)
      ? user.roles
      : (user.roles ? [user.roles] : [user.role, user.role_name]);

    return [...new Set(rawRoles.map(roleName).filter(Boolean))];
  }

  function normalizeUser(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const user = value.user && typeof value.user === "object" ? value.user : value;
    const roles = getRoleNames(user);

    return {
      ...user,
      first_name: String(user.first_name || user.firstName || "").trim(),
      last_name: String(user.last_name || user.lastName || "").trim(),
      email: String(user.email || "").trim(),
      phone: String(user.phone || "").trim(),
      roles
    };
  }

  function responseUser(payload) {
    const data = api.responseData(payload);
    return normalizeUser(data.user || data.profile || null);
  }

  function setUser(user) {
    const normalizedUser = normalizeUser(user);
    if (normalizedUser) {
      setItem(STORAGE_KEYS.user, JSON.stringify(normalizedUser));
    }
    return normalizedUser;
  }

  function saveSession(payload) {
    const accessToken = api.tokenFrom(payload, "access");
    const refreshToken = api.tokenFrom(payload, "refresh");

    if (!accessToken) {
      throw new Error("The sign-in response did not include an access token.");
    }

    setItem(STORAGE_KEYS.accessToken, accessToken);
    if (refreshToken) {
      setItem(STORAGE_KEYS.refreshToken, refreshToken);
    }

    const user = responseUser(payload);
    if (user) {
      setUser(user);
    }

    return { accessToken, refreshToken, user };
  }

  function clearSession() {
    Object.values(STORAGE_KEYS).forEach(removeItem);
  }

  function isAuthenticated() {
    return Boolean(getAccessToken());
  }

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  function requireAuthentication() {
    if (isAuthenticated()) {
      return true;
    }

    redirectToLogin();
    return false;
  }

  async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const payload = await api.refreshToken(refreshToken);
    const session = saveSession(payload);
    return session.accessToken;
  }

  function setBusy(button, isBusy) {
    if (!button) {
      return;
    }

    const label = button.querySelector(".button-label");
    const spinner = button.querySelector(".spinner-border");
    button.disabled = isBusy;
    button.setAttribute("aria-busy", String(isBusy));
    if (label) {
      label.classList.toggle("visually-hidden", isBusy);
    }
    if (spinner) {
      spinner.classList.toggle("d-none", !isBusy);
    }
  }

  function showStatus(element, message, type = "danger") {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.classList.remove("d-none");
  }

  function clearStatus(element) {
    if (!element) {
      return;
    }

    element.textContent = "";
    element.className = "alert d-none";
  }

  function togglePassword(button) {
    const inputId = button.dataset.passwordToggle;
    const input = document.getElementById(inputId);
    if (!input) {
      return;
    }

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    button.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    button.setAttribute("aria-pressed", String(isHidden));
    const label = button.querySelector("span");
    if (label) {
      label.textContent = isHidden ? "Hide" : "Show";
    }
  }

  function bindPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => togglePassword(button));
    });
  }

  function initialiseLogin() {
    const form = document.getElementById("loginForm");
    if (!form) {
      return;
    }

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitButton = document.getElementById("loginSubmit");
    const status = document.getElementById("loginStatus");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus(status);
      emailInput.value = emailInput.value.trim();
      passwordInput.setCustomValidity("");
      form.classList.add("was-validated");

      if (!form.checkValidity()) {
        return;
      }

      setBusy(submitButton, true);
      try {
        clearSession();
        const payload = await api.login(emailInput.value, passwordInput.value);
        saveSession(payload);
        try {
          const mePayload = await api.request("/auth/me", { token: payload.access_token });
          setUser(mePayload);
        } catch (_) {}
        window.location.replace("dashboard.html");
      } catch (error) {
        const isUnauthorized = error instanceof api.ApiError && error.status === 401;
        showStatus(
          status,
          isUnauthorized ? "Incorrect email address or password." : (error.message || "Unable to sign in. Please try again."),
          "danger"
        );
      } finally {
        setBusy(submitButton, false);
      }
    });
  }

  const passwordRules = Object.freeze({
    length: (value) => value.length >= 8,
    upper: (value) => /[A-Z]/.test(value),
    lower: (value) => /[a-z]/.test(value),
    number: (value) => /\d/.test(value),
    special: (value) => /[^A-Za-z0-9]/.test(value)
  });

  function passwordIsValid(value) {
    return Object.values(passwordRules).every((test) => test(value));
  }

  function updatePasswordRules(value) {
    Object.entries(passwordRules).forEach(([name, test]) => {
      const rule = document.querySelector(`[data-password-rule="${name}"]`);
      if (rule) {
        rule.classList.toggle("is-valid", test(value));
      }
    });
  }

  function initialiseRegister() {
    const form = document.getElementById("registerForm");
    if (!form) {
      return;
    }

    const passwordInput = document.getElementById("registerPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const emailInput = document.getElementById("registerEmail");
    const status = document.getElementById("registerStatus");
    const submitButton = document.getElementById("registerSubmit");

    passwordInput.addEventListener("input", () => {
      passwordInput.setCustomValidity("");
      updatePasswordRules(passwordInput.value);
      if (confirmPasswordInput.value) {
        confirmPasswordInput.setCustomValidity(
          passwordInput.value === confirmPasswordInput.value ? "" : "Passwords must match."
        );
      }
    });

    confirmPasswordInput.addEventListener("input", () => {
      confirmPasswordInput.setCustomValidity(
        passwordInput.value === confirmPasswordInput.value ? "" : "Passwords must match."
      );
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus(status);
      ["firstName", "lastName", "registerEmail", "phone"].forEach((id) => {
        const input = document.getElementById(id);
        input.value = input.value.trim();
      });

      passwordInput.setCustomValidity(
        passwordIsValid(passwordInput.value) ? "" : "Use a password that meets every requirement."
      );
      confirmPasswordInput.setCustomValidity(
        passwordInput.value === confirmPasswordInput.value ? "" : "Passwords must match."
      );
      updatePasswordRules(passwordInput.value);
      form.classList.add("was-validated");

      if (!form.checkValidity()) {
        return;
      }

      const payload = {
        first_name: document.getElementById("firstName").value,
        last_name: document.getElementById("lastName").value,
        email: emailInput.value,
        phone: document.getElementById("phone").value,
        password: passwordInput.value,
        role_name: document.getElementById("roleName").value
      };

      setBusy(submitButton, true);
      try {
        await api.register(payload);
        showStatus(status, "Your account has been created. Redirecting you to sign in…", "success");
        form.reset();
        updatePasswordRules("");
        window.setTimeout(() => window.location.replace("login.html"), 1150);
      } catch (error) {
        showStatus(status, error.message || "Unable to create your account. Please try again.", "danger");
      } finally {
        setBusy(submitButton, false);
      }
    });
  }

  function initialiseForgotPassword() {
    const form = document.getElementById("forgotPasswordForm");
    if (!form) {
      return;
    }

    const emailInput = document.getElementById("forgotEmail");
    const status = document.getElementById("forgotPasswordStatus");
    const submitButton = form.querySelector("[type=\"submit\"]");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus(status);
      emailInput.value = emailInput.value.trim();
      form.classList.add("was-validated");
      if (!form.checkValidity()) {
        return;
      }

      setBusy(submitButton, true);
      try {
        const result = await api.request("/auth/forgot-password", {
          method: "POST",
          body: { email: emailInput.value }
        });
        showStatus(
          status,
          result.message || "If this email address is registered, a reset link has been sent.",
          "success"
        );
        form.reset();
      } catch (error) {
        showStatus(
          status,
          error.message || "Unable to process your request. Please try again.",
          "danger"
        );
      } finally {
        setBusy(submitButton, false);
      }
    });
  }

  function initialisePage() {
    bindPasswordToggles();
    const page = document.body.dataset.page;

    if ((page === "login" || page === "register") && isAuthenticated()) {
      window.location.replace("dashboard.html");
      return;
    }

    if (page === "login") {
      initialiseLogin();
    } else if (page === "register") {
      initialiseRegister();
    } else if (page === "forgot-password") {
      initialiseForgotPassword();
    } else {
      const script = document.createElement("script");
      script.src = "assets/js/notifications.js";
      document.body.appendChild(script);
    }
  }

  window.VendorIQAuth = Object.freeze({
    getAccessToken,
    getRefreshToken,
    getUser: readStoredUser,
    setUser,
    getRoleNames,
    saveSession,
    clearSession,
    isAuthenticated,
    requireAuthentication,
    refreshAccessToken,
    redirectToLogin,
    showStatus
  });

  // Every authenticated page shares one navigation definition. Loading it here
  // prevents each page from inventing a different sidebar based on its own UI.
  window.VendorIQNavigationReady = window.VendorIQNavigationReady || new Promise((resolve) => {
    if (window.VendorIQNavigation) {
      resolve(window.VendorIQNavigation);
      return;
    }
    const script = document.createElement("script");
    script.src = "assets/js/navigation.js";
    script.onload = () => resolve(window.VendorIQNavigation);
    script.onerror = () => resolve(window.VendorIQNavigation || null);
    (document.head || document.documentElement).appendChild(script);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialisePage, { once: true });
  } else {
    initialisePage();
  }
})();
