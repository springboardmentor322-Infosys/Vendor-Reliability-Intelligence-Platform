const form = document.getElementById("registerForm");

const message = document.getElementById("message");

const registerBtn = document.getElementById("registerBtn");

const password = document.getElementById("password");

const confirmPassword = document.getElementById("confirmPassword");

const togglePassword = document.getElementById("togglePassword");

const toggleConfirm = document.getElementById("toggleConfirm");

// Show / Hide Password

togglePassword.addEventListener("click", () => {

    password.type = password.type === "password" ? "text" : "password";

    togglePassword.classList.toggle("fa-eye");

    togglePassword.classList.toggle("fa-eye-slash");

});

// Show / Hide Confirm Password

toggleConfirm.addEventListener("click", () => {

    confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";

    toggleConfirm.classList.toggle("fa-eye");

    toggleConfirm.classList.toggle("fa-eye-slash");

});

// Register

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.innerHTML = "";

    if (password.value !== confirmPassword.value) {

        message.className = "error";

        message.innerHTML = "Passwords do not match.";

        return;

    }

    registerBtn.disabled = true;

    registerBtn.innerHTML = "Creating Account...";

    const userData = {

        full_name: document.getElementById("full_name").value.trim(),

        email: document.getElementById("email").value.trim(),

        password: password.value

    };

    try {

        await registerUser(userData);

        message.className = "success";

        message.innerHTML = "Registration successful. Redirecting to login...";

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1500);

    }

    catch (error) {

        message.className = "error";

        message.innerHTML = error.detail || "Registration failed.";

    }

    registerBtn.disabled = false;

    registerBtn.innerHTML = "Register";

});