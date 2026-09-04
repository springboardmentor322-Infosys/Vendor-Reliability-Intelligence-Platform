/**
 * Runs on index.html (login) and register.html.
 * Detects which form is present on the page and wires it up.
 */
function showBanner(message, type = "error") {
  const banner = document.getElementById("banner");
  if (!banner) return;
  banner.textContent = message;
  banner.className = `banner show banner-${type}`;
}

function setFieldError(fieldName, message) {
  const el = document.getElementById(`${fieldName}-error`);
  if (el) el.textContent = message || "";
}

function clearErrors(fieldNames) {
  fieldNames.forEach((name) => setFieldError(name, ""));
  const banner = document.getElementById("banner");
  if (banner) banner.className = "banner";
}

// ---------- Login ----------
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(["email", "password"]);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = document.getElementById("submit-btn");

    if (!email) return setFieldError("email", "Email is required");
    if (!password) return setFieldError("password", "Password is required");

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      // FastAPI's OAuth2PasswordRequestForm expects form-encoded "username"+"password"
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      const tokenRes = await Api.post("/auth/login", body.toString(), { formEncoded: true });
      Auth.setToken(tokenRes.access_token);
      Auth.setRefreshToken(tokenRes.refresh_token);

      const user = await Api.get("/auth/me");
      Auth.setUser(user);

      const homes = {administrator:"admin-dashboard.html",procurement_manager:"procurement-dashboard.html",supply_chain_manager:"supply-chain-dashboard.html",vendor:"vendor-dashboard.html",finance_officer:"finance-dashboard.html",auditor:"auditor-dashboard.html"};
      window.location.href = homes[user.role] || "dashboard.html";
    } catch (err) {
      showBanner(err.message || "Could not sign in. Check your credentials.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
}

// ---------- Register ----------
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(["full_name", "email", "password"]);

    const full_name = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value;
    const submitBtn = document.getElementById("submit-btn");

    let hasError = false;
    if (!full_name) { setFieldError("full_name", "Full name is required"); hasError = true; }
    if (!email) { setFieldError("email", "Email is required"); hasError = true; }
    if (password.length < 6) { setFieldError("password", "Use at least 6 characters"); hasError = true; }
    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    try {
      await Api.post("/auth/register", { full_name, email, password, role });
      showBanner("Account created. Redirecting to sign in…", "success");
      setTimeout(() => (window.location.href = "index.html"), 1200);
    } catch (err) {
      showBanner(err.message || "Could not create account.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
}

// ---------- Password reset request ----------
const resetForm = document.getElementById("reset-form");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    const button = document.getElementById("reset-button");
    if (!email) return showBanner("Email is required.");
    button.disabled = true;
    button.textContent = "Requesting…";
    try {
      const result = await Api.post("/auth/password-reset-request", { email });
      showBanner(result.message || "If the account exists, reset instructions will be sent.", "success");
    } catch (err) {
      showBanner(err.message || "Could not request a password reset.");
    } finally {
      button.disabled = false;
      button.textContent = "Request reset link";
    }
  });
}

// ---------- Password reset confirmation ----------
const resetConfirmForm = document.getElementById("reset-confirm-form");
if (resetConfirmForm) {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    showBanner("This password-reset link is missing or invalid.");
    document.getElementById("reset-confirm-button").disabled = true;
  }
  resetConfirmForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const button = document.getElementById("reset-confirm-button");
    if (password.length < 6) return showBanner("Use at least 6 characters for the new password.");
    if (password !== confirmPassword) return showBanner("The new passwords do not match.");
    button.disabled = true;
    button.textContent = "Resetting…";
    try {
      const result = await Api.post("/auth/password-reset-confirm", { token, new_password: password });
      showBanner(result.message || "Password reset successfully. Redirecting to sign in…", "success");
      setTimeout(() => { window.location.href = "index.html"; }, 1300);
    } catch (err) {
      showBanner(err.message || "Could not reset the password. Request a new link and try again.");
      button.disabled = false;
      button.textContent = "Reset password";
    }
  });
}
