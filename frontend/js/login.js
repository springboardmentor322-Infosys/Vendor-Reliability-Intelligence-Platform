document.getElementById("loginForm").addEventListener("submit", loginUser);

async function loginUser(event) {
    event.preventDefault();

    const emailInput = document.getElementById("email").value.trim();
    const passwordInput = document.getElementById("password").value;

    if (!emailInput || !passwordInput) {
        showToast("Email and Password are required.", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("email", emailInput);
    formData.append("password", passwordInput);

    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            body: formData
        });

        console.log("Login API HTTP Status:", response.status);

        if (!response.ok) {
            const errResult = await response.json().catch(() => ({}));
            showToast(errResult.detail || `Server error during login (Status: ${response.status})`, "error");
            return;
        }

        const result = await response.json();

        // Log ONLY safe parameters during development
        console.log("Login response message:", result.message);
        if (result.role) {
            console.log("Logged in role:", result.role);
        }

        if (result.message === "Waiting for Admin Approval") {
            showToast("Your account is pending Admin Approval.", "warning");
            return;
        }

        if (result.message === "Your Account has been Rejected") {
            showToast("Your account registration has been Rejected by an administrator.", "error");
            return;
        }

        if (result.message === "Invalid Email or Password") {
            showToast("Invalid email address or password.", "error");
            return;
        }

        if (result.message === "Login Successful") {
            const token = result.access_token;
            const role = result.role;
            const name = result.name;

            if (!token) {
                showToast("Login failed: Access token missing in server payload.", "error");
                return;
            }

            if (!role) {
                showToast("Login failed: Account role missing in server payload.", "error");
                return;
            }

            // Save credentials
            saveSession(token, name, role);

            // Double check localStorage keys exist and are set
            const savedToken = getToken();
            const savedRole = getUserRole();
            const savedName = getUserName();

            if (savedToken && savedRole && savedName) {
                showToast(`Welcome, ${savedName}! Redirecting to dashboard...`, "success");
                
                // Short delay to allow the user to read the toast
                setTimeout(() => {
                    redirectToDashboard(savedRole);
                }, 1000);
            } else {
                showToast("Failed to initiate local session storage variables.", "error");
            }
        } else {
            showToast(result.message || "Unknown response message from auth server.", "warning");
        }

    } catch (error) {
        console.error("Login request connection exception:", error);
        showToast("Network Error: Unable to connect to the authentication server.", "error");
    }
}