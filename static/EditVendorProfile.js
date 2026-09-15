/* ==========================================================
   API CONFIGURATION
========================================================== */

const API = "http://127.0.0.1:8000";


/* ==========================================================
   GET VENDOR ID
========================================================== */

/*
    During vendor login, store the vendor ID like:

    localStorage.setItem(
        "vendor_id",
        data.vendor_id
    );

*/

let vendorId =
    localStorage.getItem("vendor_id");


/*
    Temporary fallback for testing.

    You can remove this after
    vendor login is connected.
*/

if (!vendorId) {

    vendorId = "VND0000001";

}


/* ==========================================================
   DOM ELEMENTS
========================================================== */

const form =
    document.getElementById(
        "vendorProfileForm"
    );


const vendorIdInput =
    document.getElementById(
        "vendor_id"
    );


const vendorNameInput =
    document.getElementById(
        "vendor_name"
    );


const countryInput =
    document.getElementById(
        "country"
    );


const emailInput =
    document.getElementById(
        "email"
    );


const phoneInput =
    document.getElementById(
        "phone"
    );


const businessTypeInput =
    document.getElementById(
        "business_type"
    );


const categoryInput =
    document.getElementById(
        "category"
    );


const addressInput =
    document.getElementById(
        "address"
    );


const contactPersonInput =
    document.getElementById(
        "contact_person"
    );


const newPasswordInput =
    document.getElementById(
        "new_password"
    );


const confirmPasswordInput =
    document.getElementById(
        "confirm_password"
    );


const changePassword =
    document.getElementById(
        "changePassword"
    );


const messageBox =
    document.getElementById(
        "formMessage"
    );


const saveBtn =
    document.getElementById(
        "saveBtn"
    );


/* ==========================================================
   SHOW MESSAGE
========================================================== */

function showMessage(
    message,
    type = "success"
) {

    messageBox.textContent =
        message;

    messageBox.className =
        "form-message " + type;

}


/* ==========================================================
   LOAD VENDOR PROFILE
========================================================== */

async function loadVendorProfile() {

    try {

        showMessage(
            "Loading vendor profile...",
            "success"
        );


        const response =
            await fetch(
                `${API}/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Unable to load vendor profile."
            );

        }


        /* ==============================================
           FORM DATA
        =============================================== */

        vendorIdInput.value =
            data.vendor_id || "";


        vendorNameInput.value =
            data.vendor_name || "";


        countryInput.value =
            data.country || "";


        emailInput.value =
            data.email || "";


        phoneInput.value =
            data.phone || "";


        businessTypeInput.value =
            data.business_type || "";


        categoryInput.value =
            data.category || "";


        addressInput.value =
            data.address || "";


        contactPersonInput.value =
            data.contact_person || "";


        /* ==============================================
           HEADER
        =============================================== */

        document.getElementById(
            "headerVendorName"
        ).textContent =
            data.vendor_name || "Vendor";


        document.getElementById(
            "sidebarVendorName"
        ).textContent =
            data.vendor_name || "Vendor";


        document.getElementById(
            "sidebarVendorId"
        ).textContent =
            data.vendor_id || "-";


        /* ==============================================
           PROFILE OVERVIEW
        =============================================== */

        document.getElementById(
            "overviewVendorName"
        ).textContent =
            data.vendor_name || "Vendor";


        document.getElementById(
            "overviewVendorId"
        ).textContent =
            data.vendor_id || "-";


        document.getElementById(
            "overviewStatus"
        ).textContent =
            data.status || "Active";


        /* ==============================================
           INITIALS
        =============================================== */

        const initials =
            getInitials(
                data.vendor_name
            );


        document.getElementById(
            "profileInitials"
        ).textContent =
            initials;


        /* ==============================================
           PERFORMANCE
        =============================================== */

        document.getElementById(
            "reliabilityScore"
        ).textContent =
            data.reliability_score ?? 0;


        document.getElementById(
            "qualityScore"
        ).textContent =
            data.quality_score ?? 0;


        document.getElementById(
            "deliveryScore"
        ).textContent =
            data.delivery_score ?? 0;


        document.getElementById(
            "contractCount"
        ).textContent =
            data.contract_count ?? 0;


        /* ==============================================
           HIDE MESSAGE
        =============================================== */

        messageBox.className =
            "form-message";


    }

    catch (error) {

        console.error(
            "Vendor profile loading error:",
            error
        );


        showMessage(
            error.message,
            "error"
        );

    }

}


/* ==========================================================
   INITIALS
========================================================== */

function getInitials(name) {

    if (!name) {

        return "V";

    }


    const words =
        name.trim().split(/\s+/);


    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        words[0][0] +
        words[1][0]
    ).toUpperCase();

}


/* ==========================================================
   PASSWORD CHECKBOX
========================================================== */

changePassword.addEventListener(
    "change",
    function () {

        const enabled =
            this.checked;


        newPasswordInput.disabled =
            !enabled;


        confirmPasswordInput.disabled =
            !enabled;


        if (!enabled) {

            newPasswordInput.value =
                "";

            confirmPasswordInput.value =
                "";

        }

    }
);


/* ==========================================================
   PASSWORD VISIBILITY
========================================================== */

function setupPasswordToggle(
    buttonId,
    inputId
) {

    const button =
        document.getElementById(
            buttonId
        );


    const input =
        document.getElementById(
            inputId
        );


    button.addEventListener(
        "click",
        function () {

            if (
                input.type ===
                "password"
            ) {

                input.type =
                    "text";

                this.innerHTML =
                    '<i class="fa-regular fa-eye-slash"></i>';

            }

            else {

                input.type =
                    "password";

                this.innerHTML =
                    '<i class="fa-regular fa-eye"></i>';

            }

        }
    );

}


setupPasswordToggle(
    "toggleNewPassword",
    "new_password"
);


setupPasswordToggle(
    "toggleConfirmPassword",
    "confirm_password"
);


/* ==========================================================
   SAVE PROFILE
========================================================== */

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        /* ==============================================
           PASSWORD VALIDATION
        =============================================== */

        if (
            changePassword.checked
        ) {

            if (
                !newPasswordInput.value
            ) {

                showMessage(
                    "Please enter a new password.",
                    "error"
                );

                return;

            }


            if (
                newPasswordInput.value.length < 6
            ) {

                showMessage(
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;

            }


            if (
                newPasswordInput.value !==
                confirmPasswordInput.value
            ) {

                showMessage(
                    "Passwords do not match.",
                    "error"
                );

                return;

            }

        }


        /* ==============================================
           REQUEST BODY
        =============================================== */

        const body = {

            vendor_name:
                vendorNameInput.value.trim(),

            country:
                countryInput.value.trim(),

            email:
                emailInput.value.trim(),

            phone:
                phoneInput.value.trim(),

            business_type:
                businessTypeInput.value,

            category:
                categoryInput.value,

            address:
                addressInput.value.trim(),

            contact_person:
                contactPersonInput.value.trim()

        };


        /* ==============================================
           PASSWORD
        =============================================== */

        if (
            changePassword.checked &&
            newPasswordInput.value
        ) {

            body.password =
                newPasswordInput.value;

        }


        /* ==============================================
           BUTTON
        =============================================== */

        saveBtn.disabled =
            true;


        saveBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';


        try {

            const response =
                await fetch(
                    `${API}/api/vendor/profile/${encodeURIComponent(vendorId)}`,
                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(body)

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                let errorMessage =
                    "Unable to update vendor profile.";


                if (
                    Array.isArray(
                        data.detail
                    )
                ) {

                    errorMessage =
                        data.detail
                            .map(
                                error =>
                                    error.msg ||
                                    "Validation error"
                            )
                            .join(", ");

                }

                else if (
                    data.detail
                ) {

                    errorMessage =
                        data.detail;

                }


                throw new Error(
                    errorMessage
                );

            }


            /* ==========================================
               SUCCESS
            =========================================== */

            showMessage(
                "Vendor profile updated successfully.",
                "success"
            );


            /* Store vendor ID */

            localStorage.setItem(
                "vendor_id",
                data.vendor_id
            );


            vendorId =
                data.vendor_id;


            /* Clear password */

            newPasswordInput.value =
                "";

            confirmPasswordInput.value =
                "";

            changePassword.checked =
                false;

            newPasswordInput.disabled =
                true;

            confirmPasswordInput.disabled =
                true;


            /* Reload profile */

            await loadVendorProfile();


            showMessage(
                "Vendor profile updated successfully.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Vendor profile update error:",
                error
            );


            showMessage(
                error.message,
                "error"
            );

        }

        finally {

            saveBtn.disabled =
                false;


            saveBtn.innerHTML =
                '<i class="fa-regular fa-floppy-disk"></i> Save Changes';

        }

    }
);


/* ==========================================================
   CANCEL
========================================================== */

document
    .getElementById("cancelBtn")
    .addEventListener(
        "click",
        function () {

            loadVendorProfile();

            showMessage(
                "Changes cancelled.",
                "success"
            );

            setTimeout(
                () => {

                    messageBox.className =
                        "form-message";

                },
                2000
            );

        }
    );


/* ==========================================================
   QUICK CHANGE PASSWORD
========================================================== */

document
    .getElementById(
        "quickChangePassword"
    )
    .addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            changePassword.checked =
                true;


            newPasswordInput.disabled =
                false;


            confirmPasswordInput.disabled =
                false;


            newPasswordInput.focus();


            document
                .querySelector(
                    ".form-section:last-of-type"
                )
                .scrollIntoView({
                    behavior: "smooth"
                });

        }
    );


/* ==========================================================
   LOGOUT
========================================================== */

document
    .getElementById(
        "logoutLink"
    )
    .addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "vendor_id"
            );

            localStorage.removeItem(
                "token"
            );

        }
    );


/* ==========================================================
   PAGE INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadVendorProfile();

    }
);