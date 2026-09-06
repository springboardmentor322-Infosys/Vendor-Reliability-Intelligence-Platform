// =====================================
// AUTHENTICATION
// =====================================

async function getCurrentUser() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        window.location.href = "login.html";
        return null;
    }

    try {

        const user = await apiRequest(
            "/auth/me",
            "GET",
            null,
            token
        );

        localStorage.setItem(
            "current_user",
            JSON.stringify(user)
        );

        return user;

    } catch (error) {

        console.error(
            "Auth /me failed:",
            error
        );

        console.error(
            "Token exists:",
            Boolean(token)
        );

        throw error;
    }
}
// =====================================
// STORED USER
// =====================================

function getStoredUser() {

    const user =
        localStorage.getItem(
            "current_user"
        );

    if (!user) {

        return null;
    }

    try {

        return JSON.parse(user);

    } catch (error) {

        console.error(
            "Invalid stored user:",
            error
        );

        localStorage.removeItem(
            "current_user"
        );

        return null;
    }
}


// =====================================
// PERMISSION CHECK
// =====================================

function hasPermission(
    permission,
    role = null
) {

    const user =
        getStoredUser();

    const userRole =
        role || user?.role;

    if (!userRole) {

        return false;
    }

    return Boolean(
        ROLE_ACCESS?.[userRole]?.[permission]
    );
}


// =====================================
// REQUIRE PERMISSION
// =====================================

async function requirePermission(
    permission
) {

    const user =
        await getCurrentUser();

    if (!user) {

        return null;
    }

    if (
        !hasPermission(
            permission,
            user.role
        )
    ) {

        alert(
            "You are not authorized to access this module."
        );

        window.location.href =
            "dashboard.html";

        return null;
    }

    return user;
}


// =====================================
// LOGOUT
// =====================================

function logout() {

    removeToken();

    localStorage.removeItem(
        "current_user"
    );

    window.location.href =
        "login.html";
}