// =====================================
// SHARED SIDEBAR
// =====================================

function initializeSidebar() {

    // IMPORTANT:
    // sidebar.html uses class="sidebar", not id="sidebar"
    const sidebar = document.querySelector(".sidebar");

    const overlay =
        document.getElementById("sidebarOverlay");

    if (!sidebar) {
        console.error(
            "Sidebar .sidebar not found."
        );
        return;
    }

    // =================================
    // RESTORE COLLAPSED STATE
    // =================================

    const savedState =
        localStorage.getItem("sidebarState");

    if (savedState === "collapsed") {
        sidebar.classList.add("collapsed");
    }

    // =================================
    // LOGOUT
    // =================================

    initializeSidebarLogout();

    // =================================
    // ACTIVE MENU
    // =================================

    setActiveSidebarItem();

    // =================================
    // MOBILE OVERLAY
    // =================================

    if (
        overlay &&
        overlay.dataset.initialized !== "true"
    ) {
        overlay.dataset.initialized = "true";

        overlay.addEventListener(
            "click",
            closeSidebar
        );
    }

    // =================================
    // MOBILE MENU BUTTON
    // =================================

    const mobileMenuButton =
        document.getElementById("menuToggle");

    if (
        mobileMenuButton &&
        mobileMenuButton.dataset.initialized !== "true"
    ) {
        mobileMenuButton.dataset.initialized = "true";

        mobileMenuButton.addEventListener(
            "click",
            toggleSidebar
        );
    }

    // =================================
    // DESKTOP COLLAPSE BUTTON
    // =================================

    const collapseButton =
        document.getElementById("collapseBtn");

    if (
        collapseButton &&
        collapseButton.dataset.initialized !== "true"
    ) {
        collapseButton.dataset.initialized = "true";

        collapseButton.addEventListener(
            "click",
            toggleSidebarCollapse
        );
    }

    console.log(
        "Sidebar initialized successfully."
    );
}


// =====================================
// LOGOUT HANDLER
// =====================================

function handleSidebarLogout() {

    try {

        console.log(
            "Handling sidebar logout..."
        );

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "current_user"
        );

        localStorage.removeItem(
            "sidebarState"
        );

        window.location.replace(
            "login.html"
        );

    } catch (error) {

        console.error(
            "Logout failed:",
            error
        );

        window.location.replace(
            "login.html"
        );
    }
}


// =====================================
// ACTIVE MENU
// =====================================

function setActiveSidebarItem() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    const menuLinks =
        document.querySelectorAll(
            ".sidebar-menu a"
        );

    menuLinks.forEach((link) => {

        const href =
            link.getAttribute("href");

        if (!href) {
            return;
        }

        const linkPage =
            href
                .split("/")
                .pop()
                .split("?")[0]
                .toLowerCase();

        if (linkPage === currentPage) {

            link.classList.add("active");

        } else {

            link.classList.remove("active");

        }
    });
}


// =====================================
// MOBILE SIDEBAR
// =====================================

function toggleSidebar() {

    const sidebar =
        document.querySelector(".sidebar");

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle("show");

    if (overlay) {
        overlay.classList.toggle("show");
    }
}


// =====================================
// CLOSE MOBILE SIDEBAR
// =====================================

function closeSidebar() {

    const sidebar =
        document.querySelector(".sidebar");

    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );

    if (sidebar) {
        sidebar.classList.remove("show");
    }

    if (overlay) {
        overlay.classList.remove("show");
    }
}


// =====================================
// DESKTOP COLLAPSE
// =====================================

function toggleSidebarCollapse() {

    const sidebar =
        document.querySelector(".sidebar");

    if (!sidebar) {
        return;
    }

    sidebar.classList.toggle(
        "collapsed"
    );

    if (
        sidebar.classList.contains(
            "collapsed"
        )
    ) {

        localStorage.setItem(
            "sidebarState",
            "collapsed"
        );

    } else {

        localStorage.setItem(
            "sidebarState",
            "expanded"
        );
    }
}


// =====================================
// LOGOUT
// =====================================

function initializeSidebarLogout() {

    const logoutButton =
        document.getElementById(
            "sidebarLogout"
        );

    if (!logoutButton) {

        console.error(
            "Sidebar logout button #sidebarLogout not found."
        );

        return;
    }

    // Prevent duplicate listeners
    if (
        logoutButton.dataset.logoutInitialized ===
        "true"
    ) {
        return;
    }

    logoutButton.dataset.logoutInitialized =
        "true";

    logoutButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();
            event.stopPropagation();

            console.log(
                "Sidebar logout clicked"
            );

            // Use existing logout()
            // from auth.js if available
            if (
                typeof logout === "function"
            ) {

                logout();

            } else {

                console.warn(
                    "logout() is not available. Using fallback logout."
                );

                handleSidebarLogout();
            }
        }
    );

    console.log(
        "Sidebar logout initialized successfully."
    );
}