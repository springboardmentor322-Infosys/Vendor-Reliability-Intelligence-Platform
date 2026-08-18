// ==================================================
// AUTH.JS
// Shared Authentication & Authorization Helpers
// ==================================================

const AUTH_KEYS = {
    TOKEN: "access_token",
    ROLE: "user_role",
    NAME: "user_name"
};

const API_BASE = "http://127.0.0.1:8000";

// ==================================================
// TOAST SYSTEM
// ==================================================

function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");

    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";

    if (type === "success") {
        icon = "✅";
    } else if (type === "error") {
        icon = "❌";
    } else if (type === "warning") {
        icon = "⚠️";
    }

    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation =
            "slideIn 0.3s ease-out reverse forwards";

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

window.showToast = showToast;


// ==================================================
// SESSION MANAGEMENT
// ==================================================

function saveSession(token, name, role) {

    if (!token) {
        console.error("Cannot save session: token is missing.");
        return;
    }

    localStorage.setItem(AUTH_KEYS.TOKEN, token);
    localStorage.setItem(AUTH_KEYS.ROLE, role || "");
    localStorage.setItem(AUTH_KEYS.NAME, name || "");
}


// ==================================================
// GET TOKEN
// ==================================================

function getToken() {
    return localStorage.getItem(AUTH_KEYS.TOKEN);
}


// ==================================================
// GET USER ROLE
// ==================================================

function getUserRole() {

    const role = localStorage.getItem(AUTH_KEYS.ROLE);

    if (!role) {
        return null;
    }

    const cleanRole = role
        .trim()
        .toLowerCase();

    // Exact role mappings

    if (cleanRole === "admin") {
        return "Admin";
    }

    if (
        cleanRole === "procurement manager" ||
        cleanRole === "procurement"
    ) {
        return "Procurement Manager";
    }

    if (
        cleanRole === "supply chain manager" ||
        cleanRole === "supplychain" ||
        cleanRole === "scm"
    ) {
        return "Supply Chain Manager";
    }

    if (cleanRole === "vendor") {
        return "Vendor";
    }

    if (
        cleanRole === "finance officer" ||
        cleanRole === "finance"
    ) {
        return "Finance Officer";
    }

    if (
        cleanRole === "auditor" ||
        cleanRole === "audit"
    ) {
        return "Auditor";
    }


    // Partial role mappings

    if (cleanRole.includes("admin")) {
        return "Admin";
    }

    if (cleanRole.includes("procurement")) {
        return "Procurement Manager";
    }

    if (
        cleanRole.includes("supply") ||
        cleanRole.includes("chain")
    ) {
        return "Supply Chain Manager";
    }

    if (cleanRole.includes("finance")) {
        return "Finance Officer";
    }

    if (cleanRole.includes("auditor")) {
        return "Auditor";
    }

    if (cleanRole.includes("vendor")) {
        return "Vendor";
    }


    // Generic formatting fallback

    return role
        .split(" ")
        .map(word =>
            word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()
        )
        .join(" ");
}


// ==================================================
// GET USER NAME
// ==================================================

function getUserName() {

    return localStorage.getItem(AUTH_KEYS.NAME);
}


// ==================================================
// AUTHENTICATION STATUS
// ==================================================

function isAuthenticated() {

    const token = getToken();

    return !!(
        token &&
        token.trim() !== ""
    );
}


// ==================================================
// LOGOUT
// ==================================================

function logout() {

    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.ROLE);
    localStorage.removeItem(AUTH_KEYS.NAME);
    localStorage.removeItem("vendor_id");

    // Clear session storage as well

    sessionStorage.clear();

    // Always return to login page

    window.location.replace("login.html");
}


// ==================================================
// ROLE BASED DASHBOARD REDIRECT
// ==================================================

function redirectToDashboard(role) {

    const normalizedRole = role
        ? role.trim().toLowerCase()
        : "";

    switch (normalizedRole) {

        case "admin":

            window.location.replace(
                "admin_dashboard.html"
            );

            break;


        case "procurement manager":
        case "procurement":

            window.location.replace(
                "procurement_dashboard.html"
            );

            break;


        case "supply chain manager":
        case "supplychain":
        case "scm":

            window.location.replace(
                "supplychain_dashboard.html"
            );

            break;


        case "vendor":

            window.location.replace(
                "vendor_dashboard.html"
            );

            break;


        case "finance officer":
        case "finance":

            window.location.replace(
                "finance_dashboard.html"
            );

            break;


        case "auditor":
        case "audit":

            window.location.replace(
                "auditor_dashboard.html"
            );

            break;


        default:

            console.error(
                "Unknown user role:",
                role
            );

            logout();

            break;
    }
}


// ==================================================
// PAGE PROTECTION
// ==================================================

function checkPageProtection() {

    const currentPath =
        window.location.pathname;

    const pageName =
        currentPath.split("/").pop();


    // ==================================================
    // PUBLIC PAGES
    // ==================================================

    const publicPages = [
        "login.html",
        "register.html",
        "index.html",
        "forgot-password.html",
        "reset-password.html"
    ];

    const isPublicPage =
        publicPages.includes(pageName) ||
        pageName === "";


    // ==================================================
    // IMPORTANT:
    // DO NOT REDIRECT FROM LOGIN PAGE
    // ==================================================

    if (isPublicPage) {

        /*
         * Login, Register, Forgot Password and Reset Password
         * must always be accessible.
         *
         * Previously this code redirected an already-authenticated
         * user from login.html directly to their dashboard.
         *
         * That behavior has intentionally been removed.
         */

        return;
    }


    // ==================================================
    // PROTECTED PAGE
    // ==================================================

    if (!isAuthenticated()) {

        console.warn(
            "User is not authenticated."
        );

        window.location.replace(
            "login.html"
        );

        return;
    }


    // ==================================================
    // GET CURRENT ROLE
    // ==================================================

    const role = getUserRole();


    if (!role) {

        console.warn(
            "Authenticated user has no valid role."
        );

        logout();

        return;
    }


    // ==================================================
    // ADMIN DASHBOARD
    // ==================================================

    if (
        pageName === "admin_dashboard.html" &&
        role !== "Admin"
    ) {

        alert(
            "Access Denied: Admin role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // PROCUREMENT DASHBOARD
    // ==================================================

    if (
        pageName === "procurement_dashboard.html" &&
        role !== "Procurement Manager"
    ) {

        alert(
            "Access Denied: Procurement Manager role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // SUPPLY CHAIN DASHBOARD
    // ==================================================

    if (
        pageName === "supplychain_dashboard.html" &&
        role !== "Supply Chain Manager" &&
        role !== "Admin"
    ) {

        alert(
            "Access Denied: Supply Chain Manager or Admin role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // VENDOR DASHBOARD
    // ==================================================

    if (
        pageName === "vendor_dashboard.html" &&
        role !== "Vendor"
    ) {

        alert(
            "Access Denied: Vendor role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // FINANCE DASHBOARD
    // ==================================================

    if (
        pageName === "finance_dashboard.html" &&
        role !== "Finance Officer"
    ) {

        alert(
            "Access Denied: Finance Officer role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // AUDITOR DASHBOARD
    // ==================================================

    if (
        pageName === "auditor_dashboard.html" &&
        role !== "Auditor"
    ) {

        alert(
            "Access Denied: Auditor role required."
        );

        redirectToDashboard(role);

        return;
    }


    // ==================================================
    // AUDIT LOGS
    // ==================================================

    if (
        pageName === "audit_logs.html" &&
        role !== "Admin" &&
        role !== "Auditor"
    ) {

        alert(
            "Access Denied: Admin or Auditor role required."
        );

        redirectToDashboard(role);

        return;
    }
}


// ==================================================
// AUTHENTICATED FETCH
// ==================================================

async function authenticatedFetch(
    url,
    options = {}
) {

    const token = getToken();

    options.headers =
        options.headers || {};


    if (token) {

        if (options.headers instanceof Headers) {

            options.headers.set(
                "Authorization",
                `Bearer ${token}`
            );

        } else {

            options.headers["Authorization"] =
                `Bearer ${token}`;
        }
    }


    try {

        const response =
            await fetch(url, options);


        // ==================================================
        // UNAUTHORIZED
        // ==================================================

        if (response.status === 401) {

            console.warn(
                "Unauthorized request. Logging out."
            );

            logout();

            return null;
        }


        // ==================================================
        // FORBIDDEN
        // ==================================================

        if (response.status === 403) {

            showToast(
                "Access Denied: You do not have permission to perform this action.",
                "error"
            );

            throw new Error(
                "Access Denied (403)"
            );
        }


        return response;

    } catch (error) {

        console.error(
            "API Request Error:",
            error
        );

        throw error;
    }
}


// ==================================================
// GLOBAL FETCH INTERCEPTOR
// ==================================================

(function () {

    const originalFetch =
        window.fetch;


    window.fetch =
        async function (
            resource,
            init = {}
        ) {

            const token =
                getToken();


            // ==================================================
            // GET REQUEST URL
            // ==================================================

            let url = "";


            if (
                typeof resource === "string"
            ) {

                url = resource;

            } else if (
                resource instanceof URL
            ) {

                url = resource.toString();

            } else if (
                resource &&
                resource.url
            ) {

                url = resource.url;
            }


            const currentOrigin =
                window.location.origin;

            const currentPath =
                window.location.pathname;


            // ==================================================
            // BACKEND ORIGIN
            // ==================================================

            let backendOrigin =
                API_BASE;


            /*
             * Frontend development servers:
             *
             * 5500
             * 5501
             * 3000
             * 5173
             *
             * API requests must go to backend port 8000.
             */

            const isFrontendOnlyPort =
                currentOrigin.includes(":5500") ||
                currentOrigin.includes(":5501") ||
                currentOrigin.includes(":3000") ||
                currentOrigin.includes(":5173");


            /*
             * If the current page itself is served by backend,
             * use that origin.
             */

            if (
                !isFrontendOnlyPort &&
                (
                    currentPath.includes("/frontend/") ||
                    currentOrigin.includes(":8000")
                )
            ) {

                backendOrigin =
                    currentOrigin;
            }


            // ==================================================
            // CONVERT RELATIVE API URL
            // ==================================================

            if (url.startsWith("/")) {

                url =
                    backendOrigin + url;

                if (
                    typeof resource === "string"
                ) {

                    resource = url;

                } else if (
                    resource instanceof URL
                ) {

                    resource =
                        new URL(url);
                }
            }


            // ==================================================
            // LOCALHOST BACKEND
            // ==================================================

            else if (
                url.startsWith(
                    "http://127.0.0.1:8000"
                )
            ) {

                url =
                    url.replace(
                        "http://127.0.0.1:8000",
                        backendOrigin
                    );

                if (
                    typeof resource === "string"
                ) {

                    resource = url;

                } else if (
                    resource instanceof URL
                ) {

                    resource =
                        new URL(url);
                }
            }


            else if (
                url.startsWith(
                    "http://localhost:8000"
                )
            ) {

                url =
                    url.replace(
                        "http://localhost:8000",
                        backendOrigin
                    );

                if (
                    typeof resource === "string"
                ) {

                    resource = url;

                } else if (
                    resource instanceof URL
                ) {

                    resource =
                        new URL(url);
                }
            }


            // ==================================================
            // DETERMINE BACKEND REQUEST
            // ==================================================

            const isBackendRequest =
                url.startsWith(
                    backendOrigin
                ) ||
                url.startsWith(
                    "http://127.0.0.1:8000"
                ) ||
                url.startsWith(
                    "http://localhost:8000"
                );


            // ==================================================
            // ATTACH JWT
            // ==================================================

            if (
                token &&
                isBackendRequest
            ) {

                init =
                    init || {};

                init.headers =
                    init.headers || {};


                if (
                    init.headers instanceof Headers
                ) {

                    if (
                        !init.headers.has(
                            "Authorization"
                        )
                    ) {

                        init.headers.set(
                            "Authorization",
                            `Bearer ${token}`
                        );
                    }

                } else if (
                    Array.isArray(
                        init.headers
                    )
                ) {

                    const hasAuth =
                        init.headers.some(
                            header =>
                                header[0].toLowerCase() ===
                                "authorization"
                        );


                    if (!hasAuth) {

                        init.headers.push([
                            "Authorization",
                            `Bearer ${token}`
                        ]);
                    }

                } else {

                    if (
                        !init.headers["Authorization"] &&
                        !init.headers["authorization"]
                    ) {

                        init.headers["Authorization"] =
                            `Bearer ${token}`;
                    }
                }
            }


            // ==================================================
            // EXECUTE REQUEST
            // ==================================================

            try {

                const response =
                    await originalFetch(
                        resource,
                        init
                    );


                // ==================================================
                // 401 HANDLING
                // ==================================================

                if (
                    response.status === 401
                ) {

                    const pageName =
                        window.location.pathname
                            .split("/")
                            .pop();


                    const publicPages = [
                        "login.html",
                        "register.html",
                        "forgot-password.html",
                        "reset-password.html"
                    ];


                    if (
                        !publicPages.includes(
                            pageName
                        )
                    ) {

                        console.warn(
                            "Unauthorized request. Logging out."
                        );

                        logout();
                    }
                }


                // ==================================================
                // 403 HANDLING
                // ==================================================

                if (
                    response.status === 403
                ) {

                    showToast(
                        "Access Denied: You do not have permission to perform this action.",
                        "error"
                    );
                }


                return response;

            } catch (error) {

                console.error(
                    "Fetch Interceptor Error:",
                    error
                );

                throw error;
            }
        };

})();


// ==================================================
// RUN PAGE PROTECTION AFTER DOM LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        checkPageProtection();

    }
);


// ==================================================
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ==================================================

window.saveSession =
    saveSession;

window.getToken =
    getToken;

window.getUserRole =
    getUserRole;

window.getUserName =
    getUserName;

window.isAuthenticated =
    isAuthenticated;

window.logout =
    logout;

window.redirectToDashboard =
    redirectToDashboard;

window.checkPageProtection =
    checkPageProtection;

window.authenticatedFetch =
    authenticatedFetch;