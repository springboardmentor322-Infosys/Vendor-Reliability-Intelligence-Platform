// =====================================
// COMPONENT LOADER
// =====================================

async function loadComponent(id, file) {

    const element =
        document.getElementById(id);

    if (!element) {

        console.error(
            `Component container #${id} not found.`
        );

        return false;
    }

    try {

        const response =
            await fetch(file);

        if (!response.ok) {

            throw new Error(
                `Failed to load ${file}: ${response.status}`
            );

        }

        element.innerHTML =
            await response.text();

        return true;

    } catch (error) {

        console.error(
            `Component loading failed for ${file}:`,
            error
        );

        return false;
    }
}


// =====================================
// LOAD SCRIPT
// =====================================

function loadScript(file) {

    return new Promise(
        (resolve, reject) => {

            const existingScript =
                document.querySelector(
                    `script[src="${file}"]`
                );

            if (existingScript) {

                resolve();

                return;
            }


            const script =
                document.createElement("script");

            script.src = file;

            script.onload = () => {

                resolve();

            };

            script.onerror = () => {

                reject(
                    new Error(
                        `Failed to load script: ${file}`
                    )
                );

            };

            document.body.appendChild(script);

        }
    );

}


// =====================================
// INITIALIZE SHARED LAYOUT
// =====================================

async function initializeLayout() {

    try {

        // =================================
        // LOAD HTML COMPONENTS
        // =================================

        const sidebarLoaded =
            await loadComponent(
                "sidebar-container",
                "components/sidebar.html"
            );

        const navbarLoaded =
            await loadComponent(
                "navbar",
                "components/navbar.html"
            );

        const footerLoaded =
            await loadComponent(
                "footer",
                "components/footer.html"
            );


        // =================================
        // CHECK REQUIRED COMPONENTS
        // =================================

        if (!sidebarLoaded) {

            console.error(
                "Sidebar component could not be loaded."
            );

        }

        if (!navbarLoaded) {

            console.error(
                "Navbar component could not be loaded."
            );

        }

        if (!footerLoaded) {

            console.error(
                "Footer component could not be loaded."
            );

        }


        // =================================
        // LOAD COMPONENT JAVASCRIPT
        // =================================

        await loadScript(
            "js/sidebar.js"
        );

        await loadScript(
            "js/navbar.js"
        );


        // =================================
        // INITIALIZE SIDEBAR
        // =================================

        if (
            typeof initializeSidebar ===
            "function"
        ) {

            initializeSidebar();

        } else {

            console.error(
                "initializeSidebar() is not available."
            );

        }


        // =================================
        // INITIALIZE NAVBAR
        // =================================

        if (
            typeof initializeNavbar ===
            "function"
        ) {

            initializeNavbar();

        } else {

            console.error(
                "initializeNavbar() is not available."
            );

        }


        // =================================
        // APPLY ROLE PERMISSIONS
        // =================================

        if (
            typeof applyRolePermissions ===
            "function"
        ) {

            await applyRolePermissions();

        } else {

            console.error(
                "applyRolePermissions() is not available."
            );

        }


    } catch (error) {

        console.error(
            "Layout initialization failed:",
            error
        );

    }

}


// =====================================
// ROLE PERMISSIONS
// =====================================

async function applyRolePermissions() {

    try {

        const user =
            await getCurrentUser();

        if (!user) {

            return;

        }


        // =================================
        // APPLY DATA-PERMISSION RULES
        // =================================

        document
            .querySelectorAll(
                "[data-permission]"
            )
            .forEach(item => {

                const permission =
                    item.dataset.permission;


                if (
                    !hasPermission(
                        permission,
                        user.role
                    )
                ) {

                    item.remove();

                }

            });


        // =================================
        // USER NAME
        // =================================

        const userName =
            document.getElementById(
                "sidebarUserName"
            );

        if (userName) {

            userName.textContent =
                user.full_name ||
                "User";

        }


        // =================================
        // USER ROLE
        // =================================

        const userRole =
            document.getElementById(
                "sidebarUserRole"
            );

        if (userRole) {

            userRole.textContent =
                user.role ||
                "User";

        }


    } catch (error) {

        console.error(
            "Role permission initialization failed:",
            error
        );

    }

}


// =====================================
// START LAYOUT
// =====================================

window.addEventListener(
    "load",
    initializeLayout
);