const form = document.getElementById("loginForm");

const message = document.getElementById("message");

const loginBtn = document.getElementById("loginBtn");

const password = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");

// ===============================
// Show / Hide Password
// ===============================

togglePassword.addEventListener("click", () => {

    if (password.type === "password") {

        password.type = "text";

        togglePassword.classList.remove("fa-eye");

        togglePassword.classList.add("fa-eye-slash");

    } else {

        password.type = "password";

        togglePassword.classList.remove("fa-eye-slash");

        togglePassword.classList.add("fa-eye");

    }

});

// ===============================
// Login
// ===============================

form.addEventListener("submit", async function (e) {

    e.preventDefault();

    message.innerHTML = "";

    loginBtn.disabled = true;

    loginBtn.innerHTML = "Logging in...";

    const email = document.getElementById("email").value.trim();

    const passwordValue = password.value;

    try {

        const response = await loginUser(email, passwordValue);

        saveToken(response.access_token);

        message.className = "success";

        message.innerHTML = "Login Successful";

        setTimeout(() => {

            window.location.href = "dashboard.html";

        }, 1000);

    } catch (error) {

        message.className = "error";

        message.innerHTML = error.detail || "Invalid email or password.";

    }

    loginBtn.disabled = false;

    loginBtn.innerHTML = "Login";

});