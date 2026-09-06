// =====================================
// SETTINGS MODULE
// =====================================

document.addEventListener("DOMContentLoaded", initializeSettings);

// =====================================
// INITIALIZE
// =====================================

async function initializeSettings() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    populateProfile(user);

    initializeProfileForm();

    initializePasswordForm();

    initializePasswordToggles();

    initializeLogout();
  } catch (error) {
    console.error("Settings initialization failed:", error);

    showSettingsMessage("Unable to load your account information.", "error");
  }
}

// =====================================
// POPULATE PROFILE
// =====================================

function populateProfile(user) {
  const fullName = document.getElementById("fullName");

  const email = document.getElementById("email");

  const role = document.getElementById("role");

  const accountRoleStatus = document.getElementById("accountRoleStatus");

  if (fullName) {
    fullName.value = user.full_name || "";
  }

  if (email) {
    email.value = user.email || "";
  }

  if (role) {
    role.value = user.role || "";
  }

  if (accountRoleStatus) {
    accountRoleStatus.textContent = user.role || "User";
  }
}

// =====================================
// PROFILE FORM
// =====================================

function initializeProfileForm() {
  const form = document.getElementById("profileForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = document.getElementById("saveProfileBtn");

    const fullName = document.getElementById("fullName")?.value.trim();

    if (!fullName) {
      showSettingsMessage("Full name is required.", "error");

      return;
    }

    if (fullName.length < 2) {
      showSettingsMessage(
        "Full name must contain at least 2 characters.",
        "error",
      );

      return;
    }

    setButtonLoading(button, true, "Saving...");

    try {
      const token = localStorage.getItem("access_token");

      const updatedUser = await updateProfile(fullName);

      // Update stored user
      localStorage.setItem("current_user", JSON.stringify(updatedUser));

      // Update sidebar
      const sidebarName = document.getElementById("sidebarUserName");

      if (sidebarName) {
        sidebarName.textContent = updatedUser.full_name;
      }

      showSettingsMessage(
        "Profile information updated successfully.",
        "success",
      );
    } catch (error) {
      console.error("Profile update failed:", error);

      showSettingsMessage(
        getErrorMessage(error, "Unable to update profile."),
        "error",
      );
    } finally {
      setButtonLoading(button, false, "Save Changes");
    }
  });
}

// =====================================
// PASSWORD FORM
// =====================================

function initializePasswordForm() {
  const form = document.getElementById("passwordForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword")?.value;

    const newPassword = document.getElementById("newPassword")?.value;

    const confirmPassword = document.getElementById("confirmPassword")?.value;

    const button = document.getElementById("changePasswordBtn");

    if (!currentPassword || !newPassword || !confirmPassword) {
      showPasswordMessage("Please complete all password fields.", "error");

      return;
    }

    if (newPassword.length < 8) {
      showPasswordMessage(
        "New password must contain at least 8 characters.",
        "error",
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      showPasswordMessage(
        "New password and confirmation do not match.",
        "error",
      );

      return;
    }

    if (currentPassword === newPassword) {
      showPasswordMessage(
        "New password must be different from your current password.",
        "error",
      );

      return;
    }

    setButtonLoading(button, true, "Changing...");

    try {
      const token = localStorage.getItem("access_token");

      await changePassword(currentPassword, newPassword);

      form.reset();

      showPasswordMessage("Password changed successfully.", "success");
    } catch (error) {
      console.error("Password change failed:", error);

      showPasswordMessage(
        getErrorMessage(error, "Unable to change password."),
        "error",
      );
    } finally {
      setButtonLoading(button, false, "Change Password");
    }
  });
}

// =====================================
// PASSWORD VISIBILITY
// =====================================

function initializePasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;

      const input = document.getElementById(targetId);

      if (!input) {
        return;
      }

      const icon = button.querySelector("i");

      if (input.type === "password") {
        input.type = "text";

        if (icon) {
          icon.className = "fas fa-eye-slash";
        }

        button.setAttribute("aria-label", "Hide password");
      } else {
        input.type = "password";

        if (icon) {
          icon.className = "fas fa-eye";
        }

        button.setAttribute("aria-label", "Show password");
      }
    });
  });
}

// =====================================
// LOGOUT
// =====================================

function initializeLogout() {
  const button = document.getElementById("settingsLogoutBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.removeItem("access_token");

      localStorage.removeItem("current_user");

      window.location.href = "login.html";
    }
  });
}

// =====================================
// BUTTON LOADING
// =====================================

function setButtonLoading(button, loading, text) {
  if (!button) {
    return;
  }

  button.disabled = loading;

  const span = button.querySelector("span");

  if (span) {
    span.textContent = text;
  } else {
    button.textContent = text;
  }
}

// =====================================
// SETTINGS MESSAGE
// =====================================

function showSettingsMessage(message, type) {
  const element = document.getElementById("settingsMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className = `settings-message show ${type}`;

  setTimeout(() => {
    element.className = "settings-message";
  }, 5000);
}

// =====================================
// PASSWORD MESSAGE
// =====================================

function showPasswordMessage(message, type) {
  const element = document.getElementById("passwordMessage");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.className = `settings-message show ${type}`;

  setTimeout(() => {
    element.className = "settings-message";
  }, 5000);
}

// =====================================
// ERROR MESSAGE
// =====================================

function getErrorMessage(error, fallback) {
  if (error?.message && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function toggleSidebarCollapse() {

    const sidebar =
        document.getElementById("sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle("collapsed");

    document.body.classList.toggle(
        "sidebar-collapsed",
        sidebar.classList.contains("collapsed")
    );
}