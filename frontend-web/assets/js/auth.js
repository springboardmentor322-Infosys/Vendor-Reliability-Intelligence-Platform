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

      const user = await Api.get("/auth/me");
      Auth.setUser(user);

      window.location.href = "dashboard.html";
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
    const password = document.getElementById("password").value;
    const submitBtn = document.getElementById("submit-btn");

    let hasError = false;
    if (!full_name) { setFieldError("full_name", "Full name is required"); hasError = true; }
    if (!email) { setFieldError("email", "Email is required"); hasError = true; }
    if (password.length < 12) { setFieldError("password", "Use at least 12 characters"); hasError = true; }
    if (hasError) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account…";

    try {
      await Api.post("/auth/register", { full_name, email, password });
      showBanner("Vendor account created. An administrator must link it to a vendor record before it can access supplier data.", "success");
      setTimeout(() => (window.location.href = "index.html"), 1200);
    } catch (err) {
      showBanner(err.message || "Could not create account.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  });
}
