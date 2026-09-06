function initializeNavbar() {

    updateNavbarUser();

    initializeProfileDropdown();

    initializeNavbarLogout();

    initializeClock();

    initializeGreeting();

    initializeGlobalSearch();
}


/* ================================
   USER INFORMATION
================================ */

async function updateNavbarUser() {

    try {

        const user = await getCurrentUser();

        if (!user) {
            return;
        }

        const userName =
            user.full_name ||
            user.name ||
            user.email ||
            "User";

        const userRole =
            user.role ||
            "User";

        const navbarUserName =
            document.getElementById("navbarUserName");

        const navbarUserRole =
            document.getElementById("navbarUserRole");

        const dropdownUserName =
            document.getElementById("dropdownUserName");

        const dropdownUserRole =
            document.getElementById("dropdownUserRole");

        if (navbarUserName) {
            navbarUserName.textContent = userName;
        }

        if (navbarUserRole) {
            navbarUserRole.textContent = userRole;
        }

        if (dropdownUserName) {
            dropdownUserName.textContent = userName;
        }

        if (dropdownUserRole) {
            dropdownUserRole.textContent = userRole;
        }

    } catch (error) {

        console.error(
            "Failed to load navbar user:",
            error
        );

    }
}


/* ================================
   PROFILE DROPDOWN
================================ */

function initializeProfileDropdown() {

    const profileBtn =
        document.getElementById("profileBtn");

    const profileDropdown =
        document.getElementById("profileDropdown");

    if (!profileBtn || !profileDropdown) {
        return;
    }

    profileBtn.addEventListener("click", function (event) {

        event.stopPropagation();

        profileDropdown.classList.toggle("show");

    });

    document.addEventListener("click", function (event) {

        if (
            !profileDropdown.contains(event.target) &&
            !profileBtn.contains(event.target)
        ) {

            profileDropdown.classList.remove("show");

        }

    });

}


/* ================================
   LOGOUT
================================ */

function initializeNavbarLogout() {

    const logoutBtn =
        document.getElementById("navbarLogoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {

        logout();

    });

}


/* ================================
   CLOCK
================================ */

function initializeClock() {

    updateClock();

    setInterval(updateClock, 1000);

}


function updateClock() {

    const now = new Date();

    const dateElement =
        document.getElementById("currentDate");

    const timeElement =
        document.getElementById("currentTime");

    if (dateElement) {

        dateElement.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    }

    if (timeElement) {

        timeElement.textContent =
            now.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

    }

}


/* ================================
   GREETING
================================ */

function initializeGreeting() {

    const greetingText =
        document.getElementById("greetingText");

    if (!greetingText) {
        return;
    }

    const hour = new Date().getHours();

    if (hour < 12) {

        greetingText.textContent =
            "Good Morning 👋";

    } else if (hour < 17) {

        greetingText.textContent =
            "Good Afternoon 👋";

    } else {

        greetingText.textContent =
            "Good Evening 👋";

    }

}


/* ================================
   GLOBAL SEARCH
================================ */

function initializeGlobalSearch() {

    const searchInput =
        document.getElementById("globalSearch");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Enter") {
                return;
            }

            const query =
                searchInput.value.trim();

            if (!query) {
                return;
            }

            console.log(
                "Global search:",
                query
            );

        }
    );

}