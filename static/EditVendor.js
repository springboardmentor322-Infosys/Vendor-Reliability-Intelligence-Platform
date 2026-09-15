/* ==========================================================
   EDIT VENDOR JAVASCRIPT
   VendorIQ - Admin Vendor Management
========================================================== */


/* ==========================================================
   API BASE
========================================================== */

const API = window.location.origin;


/* ==========================================================
   AUTHENTICATED JSON REQUEST
==========================================================

   This function automatically sends:

   Authorization: Bearer <JWT>

   It supports the common localStorage names:
   - access_token
   - token
   - authToken
========================================================== */

/* ==========================================================
   AUTHENTICATED JSON REQUEST
   VendorIQ - Centralized Authentication
========================================================== */

async function getJSON(url, options = {}) {

    /*
       Support ALL token keys used across VendorIQ.
       Priority:
       1. sessionStorage
       2. localStorage
    */

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt_token");


    console.log("AUTH DEBUG:", {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenSource:
            sessionStorage.getItem("access_token") ? "sessionStorage.access_token" :
            sessionStorage.getItem("accessToken") ? "sessionStorage.accessToken" :
            sessionStorage.getItem("token") ? "sessionStorage.token" :
            sessionStorage.getItem("jwt_token") ? "sessionStorage.jwt_token" :
            localStorage.getItem("access_token") ? "localStorage.access_token" :
            localStorage.getItem("accessToken") ? "localStorage.accessToken" :
            localStorage.getItem("token") ? "localStorage.token" :
            localStorage.getItem("authToken") ? "localStorage.authToken" :
            localStorage.getItem("jwt_token") ? "localStorage.jwt_token" :
            "NONE"
    });


    /*
       Do NOT immediately redirect here.
       Throw a clean authentication error instead.
    */

    if (!token) {

        throw new Error(
            "Admin login session expired. Please log in again."
        );

    }


    const headers = {

        "Content-Type": "application/json",

        "Accept": "application/json",

        ...(options.headers || {})

    };


    headers["Authorization"] =
        `Bearer ${token}`;


    console.log("API Request:", {
        url,
        method: options.method || "GET",
        authenticated: true
    });


    let response;

    try {

        response = await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    }

    catch (networkError) {

        console.error(
            "NETWORK ERROR:",
            networkError
        );

        throw new Error(
            "Unable to connect to the VendorIQ server."
        );

    }


    let data = {};

    try {

        data = await response.json();

    }

    catch {

        data = {};

    }


    console.log(
        "API Response:",
        response.status,
        data
    );


    /* ======================================================
       401 - AUTHENTICATION
    ====================================================== */

    if (response.status === 401) {

        console.error(
            "ADMIN AUTHENTICATION FAILED:",
            data
        );

        throw new Error(
            data.detail ||
            "Admin login session expired. Please log in again."
        );

    }


    /* ======================================================
       403 - AUTHORIZATION
    ====================================================== */

    if (response.status === 403) {

        console.error(
            "ADMIN AUTHORIZATION FAILED:",
            data
        );

        throw new Error(
            data.detail ||
            "You do not have permission to manage vendors."
        );

    }


    /* ======================================================
       422 - VALIDATION
    ====================================================== */

    if (response.status === 422) {

        console.error(
            "FASTAPI VALIDATION ERROR:",
            data
        );


        if (Array.isArray(data.detail)) {

            const messages =
                data.detail.map(
                    error => {

                        const location =
                            Array.isArray(error.loc)
                                ? error.loc.join(" → ")
                                : "";

                        return location
                            ? `${location}: ${error.msg}`
                            : error.msg;

                    }
                );


            throw new Error(
                messages.join("\n")
            );

        }


        if (
            data.detail &&
            typeof data.detail === "object"
        ) {

            throw new Error(
                JSON.stringify(
                    data.detail,
                    null,
                    2
                )
            );

        }


        throw new Error(
            data.detail ||
            "Validation error. Check the submitted vendor data."
        );

    }


    /* ======================================================
       OTHER HTTP ERRORS
    ====================================================== */

    if (!response.ok) {

        let message =
            data.detail ||
            data.message ||
            `API ${response.status}: ${response.statusText}`;


        if (
            typeof message === "object"
        ) {

            message =
                JSON.stringify(
                    message,
                    null,
                    2
                );

        }


        throw new Error(message);

    }


    return data;

}


/* ==========================================================
   GET VENDOR ID FROM URL
==========================================================

   Expected URL:

   /admin/vendors/VND0000001/edit

   Result:

   VND0000001
========================================================== */

function getVendorId() {

    const pathParts =
        window.location.pathname
            .split("/")
            .filter(Boolean);


    console.log(
        "Current URL:",
        window.location.pathname
    );


    console.log(
        "Path parts:",
        pathParts
    );


    const vendorsIndex =
        pathParts.indexOf("vendors");


    if (
        vendorsIndex === -1 ||
        !pathParts[vendorsIndex + 1]
    ) {

        console.error(
            "Could not find vendor ID in URL."
        );

        return null;

    }


    const vendorId =
        decodeURIComponent(
            pathParts[vendorsIndex + 1]
        );


    console.log(
        "Detected Vendor ID:",
        vendorId
    );


    return vendorId;

}


/* ==========================================================
   TOAST
========================================================== */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById("toast");


    /*
       If toast element doesn't exist,
       use browser alert as fallback.
    */

    if (!toast) {

        alert(message);

        return;

    }


    toast.textContent =
        message;


    toast.className =
        `toast show ${type}`;


    setTimeout(
        () => {

            toast.className =
                "toast";

        },
        3000
    );

}


/* ==========================================================
   SET VALUE HELPER
========================================================== */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            `Element #${id} not found`
        );

        return;

    }


    element.value =
        value ?? "";

}


/* ==========================================================
   GET VALUE HELPER
========================================================== */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        console.warn(
            `Element #${id} not found`
        );

        return "";

    }


    return element.value;

}


/* ==========================================================
   NORMALIZE STATUS
==========================================================

   Converts database status values into the values
   expected by the HTML select.
========================================================== */

function normalizeStatusForSelect(status) {

    if (!status) {

        return "Pending";

    }


    const normalized =
        String(status)
            .trim()
            .toLowerCase();


    switch (normalized) {

        case "active":
            return "Active";


        case "pending":
            return "Pending";


        case "pending approval":
            return "Pending Approval";


        case "under review":
            return "Under Review";


        case "blacklisted":
            return "Blacklisted";


        case "inactive":
            return "Inactive";


        case "rejected":
            return "Rejected";


        default:
            return status;

    }

}


/* ==========================================================
   LOAD VENDOR
========================================================== */

async function loadVendor() {

    try {

        /*
           Get vendor ID from:

           /admin/vendors/VND0000001/edit
        */

        const vendorId =
            getVendorId();


        if (!vendorId) {

            throw new Error(
                "Vendor ID not found in URL."
            );

        }


        console.log(
            "Loading vendor:",
            vendorId
        );


        /*
           API:

           GET
           /api/admin/vendors/VND0000001

           getJSON() automatically adds:

           Authorization:
           Bearer <JWT>
        */

        const apiUrl =
            `/api/admin/vendors/${encodeURIComponent(vendorId)}`;


        console.log(
            "===================================="
        );

        console.log(
            "Vendor ID:",
            vendorId
        );

        console.log(
            "API URL:",
            apiUrl
        );

        console.log(
            "===================================="
        );


        const data =
            await getJSON(
                apiUrl
            );


        /*
           Support both:

           {
               "vendor": {...}
           }

           and:

           {
               "vendor_id": "...",
               ...
           }
        */

        const vendor =
            data.vendor ||
            data;


        if (
            !vendor ||
            !vendor.vendor_id
        ) {

            throw new Error(
                "Vendor data not found."
            );

        }


        /* ==================================================
           BASIC INFORMATION
        ================================================== */

        setValue(
            "vendor_id",
            vendor.vendor_id ||
            vendorId
        );


        setValue(
            "vendor_name",
            vendor.vendor_name
        );


        setValue(
            "category",
            vendor.category
        );


        setValue(
            "contact_person",
            vendor.contact_person
        );


        setValue(
            "email",
            vendor.email
        );


        setValue(
            "phone",
            vendor.phone
        );


        setValue(
            "country",
            vendor.country
        );


        setValue(
            "business_type",
            vendor.business_type
        );


        setValue(
            "address",
            vendor.address
        );


        /* ==================================================
           STATUS
        ================================================== */

        const status =
            normalizeStatusForSelect(
                vendor.status
            );


        setValue(
            "status",
            status
        );


        /* ==================================================
           PERFORMANCE
        ================================================== */

        setValue(
            "reliability_score",
            vendor.reliability_score ?? 0
        );


        setValue(
            "quality_score",
            vendor.quality_score ?? 0
        );


        setValue(
            "delivery_score",
            vendor.delivery_score ?? 0
        );


        setValue(
            "service_score",
            vendor.service_score ?? 0
        );


        setValue(
            "contract_count",
            vendor.contract_count ?? 0
        );


        /* ==================================================
           APPROVED BY
        ================================================== */

        setValue(
            "approved_by",
            vendor.approved_by || ""
        );


        /* ==================================================
           ACTIVE SWITCH
        ================================================== */

        const activeSwitch =
            document.getElementById(
                "vendor_active"
            );


        if (activeSwitch) {

            activeSwitch.checked =
                status === "Active";

        }


        /*
           Optional page title.
        */

        const vendorTitle =
            document.getElementById(
                "vendorTitle"
            );


        if (vendorTitle) {

            vendorTitle.textContent =
                vendor.vendor_name ||
                "Edit Vendor";

        }


        console.log(
            "Vendor loaded successfully:",
            vendor
        );


        showToast(
            "Vendor details loaded",
            "success"
        );

    }

    catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load vendor.",
            "error"
        );

    }

}


/* ==========================================================
   COLLECT FORM DATA
========================================================== */

function getFormData() {

    const data = {

        vendor_name:
            getValue("vendor_name").trim(),

        country:
            getValue("country").trim(),

        email:
            getValue("email").trim(),

        phone:
            getValue("phone").trim(),

        business_type:
            getValue("business_type").trim(),

        address:
            getValue("address").trim(),

        category:
            getValue("category").trim(),

        contact_person:
            getValue("contact_person").trim(),

        status:
            getValue("status").trim(),

        reliability_score:
            Number(
                getValue("reliability_score")
            ),

        quality_score:
            Number(
                getValue("quality_score")
            ),

        delivery_score:
            Number(
                getValue("delivery_score")
            ),

        service_score:
            Number(
                getValue("service_score")
            ),

        contract_count:
            Number(
                getValue("contract_count")
            ),

        approved_by:
            getValue("approved_by").trim()

    };


    /*
       Convert invalid/empty numeric values to 0.
    */

    if (
        !Number.isFinite(
            data.reliability_score
        )
    ) {

        data.reliability_score = 0;

    }


    if (
        !Number.isFinite(
            data.quality_score
        )
    ) {

        data.quality_score = 0;

    }


    if (
        !Number.isFinite(
            data.delivery_score
        )
    ) {

        data.delivery_score = 0;

    }


    if (
        !Number.isFinite(
            data.service_score
        )
    ) {

        data.service_score = 0;

    }


    if (
        !Number.isFinite(
            data.contract_count
        )
    ) {

        data.contract_count = 0;

    }


    console.log(
        "FORM DATA TO SEND:",
        data
    );


    return data;

}


/* ==========================================================
   VALIDATE FORM DATA
========================================================== */

function validateFormData(data) {

    if (!data.vendor_name) {

        showToast(
            "Vendor name is required.",
            "error"
        );

        return false;

    }


    if (!data.email) {

        showToast(
            "Vendor email is required.",
            "error"
        );

        return false;

    }


    if (!data.phone) {

        showToast(
            "Vendor phone number is required.",
            "error"
        );

        return false;

    }


    if (!data.country) {

        showToast(
            "Country is required.",
            "error"
        );

        return false;

    }


    return true;

}


/* ==========================================================
   UPDATE VENDOR
========================================================== */

async function updateVendor() {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        showToast(
            "Vendor ID not found.",
            "error"
        );

        return;

    }


    const button =
        document.getElementById(
            "updateButton"
        );


    const originalHTML =
        button
            ? button.innerHTML
            : "";


    try {

        if (button) {

            button.disabled =
                true;

            button.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Updating...
                `;

        }


        /* ==================================================
           COLLECT FORM DATA
        ================================================== */

        const data =
            getFormData();


        console.log(
            "===================================="
        );

        console.log(
            "VENDOR UPDATE"
        );

        console.log(
            "Vendor ID:",
            vendorId
        );

        console.log(
            "Payload:",
            data
        );

        console.log(
            "===================================="
        );


        /* ==================================================
           BASIC VALIDATION
        ================================================== */

        if (!data.vendor_name) {

            throw new Error(
                "Vendor name is required."
            );

        }


        if (!data.email) {

            throw new Error(
                "Vendor email is required."
            );

        }


        if (!data.phone) {

            throw new Error(
                "Vendor phone is required."
            );

        }


        if (!data.country) {

            throw new Error(
                "Country is required."
            );

        }


        if (!data.category) {

            throw new Error(
                "Category is required."
            );

        }


        /* ==================================================
           UPDATE API
        ================================================== */

        const result =
            await getJSON(
                `/api/admin/vendors/${encodeURIComponent(vendorId)}`,
                {

                    method: "PUT",

                    body:
                        JSON.stringify(data)

                }
            );


        console.log(
            "UPDATE RESPONSE:",
            result
        );


        /* ==================================================
           SUCCESS
        ================================================== */

        showToast(
            "Vendor updated successfully.",
            "success"
        );


        setTimeout(
            function() {

                window.location.href =
                    "/VendorManagement";

            },
            1200
        );

    }

    catch (error) {

        console.error(
            "Update vendor error:",
            error
        );


        showToast(
            error.message ||
            "Unable to update vendor.",
            "error"
        );

    }

    finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                originalHTML;

        }

    }

}


/* ==========================================================
   FORM SUBMIT
========================================================== */

function initializeForm() {

    const form =
        document.getElementById(
            "vendorForm"
        );


    if (!form) {

        console.warn(
            "Vendor form #vendorForm not found."
        );

        return;

    }


    /*
       Prevent normal HTML form submission.
    */

    form.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            updateVendor();

        }
    );

}


/* ==========================================================
   NOTES COUNTER
========================================================== */

function initializeNotesCounter() {

    const notes =
        document.getElementById(
            "notes"
        );


    const noteCount =
        document.getElementById(
            "noteCount"
        );


    if (
        !notes ||
        !noteCount
    ) {

        return;

    }


    /*
       Initial count.
    */

    noteCount.textContent =
        notes.value.length;


    /*
       Update count.
    */

    notes.addEventListener(
        "input",
        function() {

            noteCount.textContent =
                this.value.length;

        }
    );

}


/* ==========================================================
   STATUS / ACTIVE SWITCH
========================================================== */

function initializeStatusSwitch() {

    const activeSwitch =
        document.getElementById(
            "vendor_active"
        );


    const statusSelect =
        document.getElementById(
            "status"
        );


    if (
        !activeSwitch ||
        !statusSelect
    ) {

        return;

    }


    /*
       Switch → Status
    */

    activeSwitch.addEventListener(
        "change",
        function() {

            if (this.checked) {

                statusSelect.value =
                    "Active";

            }

            else {

                statusSelect.value =
                    "Under Review";

            }

        }
    );


    /*
       Status → Switch
    */

    statusSelect.addEventListener(
        "change",
        function() {

            activeSwitch.checked =
                this.value === "Active";

        }
    );

}


/* ==========================================================
   CANCEL / BACK
========================================================== */

function goBack() {

    window.location.href =
        "/VendorManagement";

}


/* ==========================================================
   CANCEL BUTTON SUPPORT
========================================================== */

function initializeCancelButton() {

    const cancelButton =
        document.getElementById(
            "cancelButton"
        );


    if (!cancelButton) {

        return;

    }


    cancelButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            goBack();

        }
    );

}


/* ==========================================================
   LOGOUT
========================================================== */

/* ==========================================================
   LOGOUT
========================================================== */

function logout() {

    const authKeys = [
        "access_token",
        "accessToken",
        "token",
        "authToken",
        "jwt_token"
    ];


    authKeys.forEach(key => {

        localStorage.removeItem(key);
        sessionStorage.removeItem(key);

    });


    window.location.href =
        "/login";

}


/* ==========================================================
   INITIALIZE PAGE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "Edit Vendor page initialized."
        );


        /*
           Initialize UI.
        */

        initializeForm();

        initializeNotesCounter();

        initializeStatusSwitch();

        initializeCancelButton();


        /*
           Load vendor from PostgreSQL
           through FastAPI.
        */

        await loadVendor();

    }
);