const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePasswordIcon = document.getElementById("togglePassword");
const messageBox = document.getElementById("message");
const loginButton = document.getElementById("loginButton");
const buttonText = document.getElementById("buttonText");

/* =========================================
SHOW / HIDE PASSWORD
========================================= */

if (togglePasswordIcon && passwordInput) {


togglePasswordIcon.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePasswordIcon.classList.remove("fa-eye");
        togglePasswordIcon.classList.add("fa-eye-slash");

    } else {

        passwordInput.type = "password";

        togglePasswordIcon.classList.remove("fa-eye-slash");
        togglePasswordIcon.classList.add("fa-eye");

    }

});


}

/* =========================================
LOGIN
========================================= */

loginForm.addEventListener("submit", async function (event) {


event.preventDefault();

const username =
    document.getElementById("username").value.trim();

const password =
    document.getElementById("password").value;

const rememberMe =
    document.getElementById("rememberMe").checked;


messageBox.textContent = "";

loginButton.disabled = true;

buttonText.textContent = "Logging in...";


try {

    const response = await fetch(
        "http://127.0.0.1:8000/login",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        }
    );


    /* =========================================
       READ RESPONSE SAFELY
    ========================================= */

    const contentType =
        response.headers.get("content-type") || "";

    let data;


    if (contentType.includes("application/json")) {

        data = await response.json();

    } else {

        const text = await response.text();

        console.error(
            "Non-JSON server response:",
            text
        );

        throw new Error(
            `Server returned ${response.status}: ${text}`
        );
    }


    console.log(
        "Login Response:",
        data
    );


    /* =========================================
       HANDLE HTTP ERRORS
    ========================================= */

    if (!response.ok) {

        let errorMessage = "Login failed";

        if (typeof data.detail === "string") {

            errorMessage = data.detail;

        } else if (Array.isArray(data.detail)) {

            errorMessage = data.detail
                .map(error => error.msg)
                .join(", ");

        }

        throw new Error(errorMessage);
    }


    /* =========================================
       VALIDATE TOKEN
    ========================================= */

    if (!data.access_token) {

        throw new Error(
            "Login successful, but access token was not returned."
        );
    }


    /* =========================================
       STORAGE
    ========================================= */

    const storage =
        rememberMe
            ? localStorage
            : sessionStorage;


    storage.setItem(
        "access_token",
        data.access_token
    );


    if (data.user_id !== undefined) {

        storage.setItem(
            "user_id",
            String(data.user_id)
        );

    }


    storage.setItem(
        "username",
        data.username ||
        data.email ||
        username
    );


    if (data.email) {

        storage.setItem(
            "email",
            data.email
        );

    }


    if (data.role) {

        storage.setItem(
            "role",
            data.role
        );

    }


    /* =========================================
       SUCCESS
    ========================================= */

    messageBox.style.color = "#16a34a";

    messageBox.textContent =
        "Login successful. Redirecting...";


    setTimeout(function () {

        redirectToDashboard(data.role);

    }, 500);


} catch (error) {

    console.error(
        "Login Error:",
        error
    );


    messageBox.style.color = "#dc2626";

    messageBox.textContent =
        error.message ||
        "Login failed";


    loginButton.disabled = false;

    buttonText.textContent = "Login";

}


});

/* =========================================
ROLE BASED REDIRECT
========================================= */

function redirectToDashboard(role) {


    if (!role) {

        messageBox.style.color = "#dc2626";

        messageBox.textContent =
            "User role not found.";

        return;
    }


    const normalizedRole = String(role)
        .toLowerCase()
        .trim()
        .replace(/_/g, " ")
        .replace(/-/g, " ");


    console.log(
        "Original Role:",
        role
    );

    console.log(
        "Normalized Role:",
        normalizedRole
    );


    const dashboards = {

        "admin":
            "/AdminDashboard.html",

        "vendor":
            "/VendorDashboard",

        "auditor":
            "/AuditorDashboard",

        "finance officer":
            "/financerdashboard",

        "manager":
            "/ManagerDashboard",

        "procurement manager":
            "/ManagerDashboard",

        "supply chain manager":
            "/supplychaindashboard"

    };


    const dashboard =
        dashboards[normalizedRole];


    if (dashboard) {

        window.location.href = dashboard;

    } else {

        messageBox.style.color = "#dc2626";

        messageBox.textContent =
            "No dashboard assigned for role: " +
            role;

    }

}