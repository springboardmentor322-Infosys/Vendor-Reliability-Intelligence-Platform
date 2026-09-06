async function initializeProfile() {

    try {

        const user = await getCurrentUser();

        if (!user) {

            window.location.href = "login.html";

            return;

        }


        const fullName =
            user.full_name ||
            user.name ||
            "User";

        const email =
            user.email ||
            "Not available";

        const role =
            user.role ||
            "User";

        const userId =
            user.id ||
            "Not available";


        // Profile header

        const profileName =
            document.getElementById("profileName");

        const profileRole =
            document.getElementById("profileRole");


        if (profileName) {
            profileName.textContent = fullName;
        }

        if (profileRole) {
            profileRole.textContent = role;
        }


        // Account information

        const profileFullName =
            document.getElementById("profileFullName");

        const profileEmail =
            document.getElementById("profileEmail");

        const profileRoleText =
            document.getElementById("profileRoleText");

        const profileId =
            document.getElementById("profileId");

        const profileCreatedAt =
            document.getElementById("profileCreatedAt");


        if (profileFullName) {
            profileFullName.textContent = fullName;
        }

        if (profileEmail) {
            profileEmail.textContent = email;
        }

        if (profileRoleText) {
            profileRoleText.textContent = role;
        }

        if (profileId) {
            profileId.textContent = userId;
        }


        // Created date

        if (profileCreatedAt) {

            if (user.created_at) {

                const date =
                    new Date(user.created_at);

                profileCreatedAt.textContent =
                    date.toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    );

            } else {

                profileCreatedAt.textContent =
                    "Not available";

            }

        }


        // Role card

        const roleCardRole =
            document.getElementById("roleCardRole");

        const roleDescription =
            document.getElementById("roleDescription");


        if (roleCardRole) {
            roleCardRole.textContent = role;
        }


        if (roleDescription) {

            roleDescription.textContent =
                getRoleDescription(role);

        }


        // Logout

        const logoutBtn =
            document.getElementById("profileLogoutBtn");


        if (logoutBtn) {

            logoutBtn.addEventListener(
                "click",
                function () {

                    logout();

                }
            );

        }


    } catch (error) {

        console.error(
            "Failed to load profile:",
            error
        );

    }

}


/* =================================
   ROLE DESCRIPTION
================================= */

function getRoleDescription(role) {

    const descriptions = {

        "Administrator":
            "You have full administrative access to the Vendor Reliability Intelligence and Procurement Risk Management Platform. You can manage users, vendors, procurement activities, analytics, reports, audit logs, and system settings.",

        "Procurement Manager":
            "You are responsible for procurement operations, vendor management, purchase orders, procurement requests, contracts, deliveries, quality inspections, analytics, and procurement reporting.",

        "Supply Chain Manager":
            "You are responsible for supply chain operations, deliveries, purchase orders, vendors, contracts, quality inspections, communication, analytics, and operational reporting.",

        "Finance Officer":
            "You are responsible for financial operations including invoices, payments, purchase orders, contracts, vendor information, financial analytics, and financial reporting.",

        "Vendor":
            "You have access to your vendor-related procurement activities, purchase orders, deliveries, contracts, invoices, communications, products, notifications, and your assigned dashboard.",

        "Auditor":
            "You have access to audit and compliance information including vendors, procurement requests, purchase orders, deliveries, contracts, invoices, quality inspections, reports, notifications, and audit logs."

    };


    return descriptions[role] ||
        "Your account has access to the modules authorized for your assigned role.";

}