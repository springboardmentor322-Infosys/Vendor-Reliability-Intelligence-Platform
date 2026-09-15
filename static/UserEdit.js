const API = "http://127.0.0.1:8000";


// ======================================================
// GLOBAL USER ID
// ======================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const userId =
    urlParams.get("user_id");


// ======================================================
// GET AUTHENTICATION TOKEN
// ======================================================

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        null
    );

}


// ======================================================
// AUTHENTICATED API REQUEST
// ======================================================

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAuthToken();


    // ==================================================
    // CHECK TOKEN
    // ==================================================

    if (!token) {

        console.error(
            "No authentication token found."
        );

        throw new Error(
            "Not authenticated. Please log in again."
        );

    }


    // ==================================================
    // CREATE HEADERS
    // ==================================================

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };


    // ==================================================
    // JSON CONTENT TYPE
    // ==================================================

    if (
        options.body &&
        !headers["Content-Type"] &&
        !headers["content-type"]
    ) {

        headers["Content-Type"] =
            "application/json";

    }


    // ==================================================
    // JWT AUTHORIZATION
    // ==================================================

    headers["Authorization"] =
        `Bearer ${token}`;


    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
        "Authenticated API Request:",
        options.method || "GET",
        url
    );


    // ==================================================
    // FETCH
    // ==================================================

    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    // ==================================================
    // 401
    // ==================================================

    if (response.status === 401) {

        console.error(
            "401 Unauthorized:",
            url
        );

        throw new Error(
            "Not authenticated. Your login session may have expired. Please log in again."
        );

    }


    return response;

}


// ======================================================
// PARSE API RESPONSE
// ======================================================

async function parseResponse(
    response
) {

    const text =
        await response.text();


    let data = {};


    // ==================================================
    // TRY JSON
    // ==================================================

    if (text) {

        try {

            data =
                JSON.parse(text);

        }

        catch {

            data = {
                message: text
            };

        }

    }


    // ==================================================
    // HANDLE ERROR
    // ==================================================

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;


        if (
            data &&
            typeof data === "object"
        ) {

            if (data.detail) {

                if (
                    typeof data.detail ===
                    "string"
                ) {

                    message =
                        data.detail;

                }

                else {

                    message =
                        JSON.stringify(
                            data.detail
                        );

                }

            }

            else if (data.message) {

                message =
                    data.message;

            }

        }


        throw new Error(
            message
        );

    }


    return data;

}


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "UserEdit page loaded."
        );


        console.log(
            "User ID:",
            userId
        );


        // ==================================================
        // CHECK USER ID
        // ==================================================

        if (!userId) {

            showMessage(
                "No user ID was provided.",
                "error"
            );

            disableForm();

            return;

        }


        // ==================================================
        // CHECK AUTHENTICATION
        // ==================================================

        const token =
            getAuthToken();


        if (!token) {

            console.error(
                "No JWT token found."
            );


            showMessage(
                "You are not authenticated. Please log in again.",
                "error"
            );


            disableForm();

            return;

        }


        // ==================================================
        // LOAD USER
        // ==================================================

        loadUser(userId);

    }
);


// ======================================================
// LOAD USER
// ======================================================

async function loadUser(id) {

    try {

        console.log(
            "Loading user:",
            id
        );


        // ==================================================
        // REQUEST
        // ==================================================

        const response =
            await apiFetch(
                `${API}/api/admin/users/${encodeURIComponent(id)}`,
                {
                    method: "GET"
                }
            );


        // ==================================================
        // PARSE
        // ==================================================

        const user =
            await parseResponse(
                response
            );


        console.log(
            "User API response:",
            user
        );


        // ==================================================
        // SUPPORT { user: {...} }
        // ==================================================

        const userData =
            user.user || user;


        // ==================================================
        // USER ID
        // ==================================================

        const displayUserId =
            document.getElementById(
                "displayUserId"
            );


        if (displayUserId) {

            displayUserId.textContent =
                `#${userData.id ?? id}`;

        }


        // ==================================================
        // NAME
        // ==================================================

        const userName =
            document.getElementById(
                "userName"
            );


        if (userName) {

            userName.value =
                userData.name ||
                "";

        }


        // ==================================================
        // EMAIL
        // ==================================================

        const userEmail =
            document.getElementById(
                "userEmail"
            );


        if (userEmail) {

            userEmail.value =
                userData.email ||
                "";

        }


        // ==================================================
        // MOBILE
        // ==================================================

        const userMobile =
            document.getElementById(
                "userMobile"
            );


        if (userMobile) {

            userMobile.value =
                userData.mobile ||
                userData.phone ||
                "";

        }


        // ==================================================
        // GENDER
        // ==================================================

        const userGender =
            document.getElementById(
                "userGender"
            );


        if (userGender) {

            userGender.value =
                userData.gender ||
                "";

        }


        // ==================================================
        // ROLE
        // ==================================================

        const userRole =
            document.getElementById(
                "userRole"
            );


        if (userRole) {

            userRole.value =
                userData.role ||
                "";

        }


        // ==================================================
        // ADDRESS
        // ==================================================

        const userAddress =
            document.getElementById(
                "userAddress"
            );


        if (userAddress) {

            userAddress.value =
                userData.address ||
                "";

        }


        // ==================================================
        // STATUS
        // ==================================================

        const status =
            getUserStatus(
                userData
            );


        const userStatus =
            document.getElementById(
                "userStatus"
            );


        if (userStatus) {

            userStatus.value =
                status;

        }


        // ==================================================
        // DISPLAY CURRENT STATUS
        // ==================================================

        updateStatusDisplay(
            status
        );


        // ==================================================
        // CREATED DATE
        // ==================================================

        const createdDate =
            document.getElementById(
                "createdDate"
            );


        if (createdDate) {

            createdDate.textContent =
                formatDate(
                    userData.created_at
                );

        }


        console.log(
            "User loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "User loading error:",
            error
        );


        showMessage(
            `Unable to load user: ${error.message}`,
            "error"
        );

    }

}


// ======================================================
// GET USER STATUS
// ======================================================

function getUserStatus(user) {

    // ==================================================
    // IF BACKEND RETURNS STATUS
    // ==================================================

    if (user.status) {

        const status =
            String(
                user.status
            ).toLowerCase();


        if (
            status === "active"
        ) {

            return "Active";

        }


        if (
            status === "inactive"
        ) {

            return "Inactive";

        }

    }


    // ==================================================
    // IF BACKEND RETURNS ACTIVE BOOLEAN
    // ==================================================

    if (
        user.active === true ||
        user.active === 1
    ) {

        return "Active";

    }


    return "Inactive";

}


// ======================================================
// UPDATE STATUS DISPLAY
// ======================================================

function updateStatusDisplay(
    status
) {

    const currentStatus =
        document.getElementById(
            "currentStatus"
        );


    if (!currentStatus) {

        return;

    }


    currentStatus.textContent =
        status;


    currentStatus.className =
        status === "Active"
            ? "status-badge active"
            : "status-badge inactive";

}


// ======================================================
// UPDATE USER
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const editUserForm =
            document.getElementById(
                "editUserForm"
            );


        if (!editUserForm) {

            console.error(
                "editUserForm not found."
            );

            return;

        }


        editUserForm.addEventListener(
            "submit",
            updateUser
        );

    }
);


// ======================================================
// UPDATE USER FUNCTION
// ======================================================

async function updateUser(
    event
) {

    event.preventDefault();


    // ==================================================
    // CHECK USER ID
    // ==================================================

    if (!userId) {

        showMessage(
            "User ID is missing.",
            "error"
        );

        return;

    }


    // ==================================================
    // GET SAVE BUTTON
    // ==================================================

    const saveButton =
        document.getElementById(
            "saveButton"
        );


    // ==================================================
    // GET FORM ELEMENTS
    // ==================================================

    const nameInput =
        document.getElementById(
            "userName"
        );


    const emailInput =
        document.getElementById(
            "userEmail"
        );


    const mobileInput =
        document.getElementById(
            "userMobile"
        );


    const genderInput =
        document.getElementById(
            "userGender"
        );


    const roleInput =
        document.getElementById(
            "userRole"
        );


    const addressInput =
        document.getElementById(
            "userAddress"
        );


    const statusInput =
        document.getElementById(
            "userStatus"
        );


    // ==================================================
    // READ VALUES
    // ==================================================

    const name =
        nameInput
            ? nameInput.value.trim()
            : "";


    const email =
        emailInput
            ? emailInput.value.trim()
            : "";


    const mobile =
        mobileInput
            ? mobileInput.value.trim()
            : "";


    const gender =
        genderInput
            ? genderInput.value
            : "";


    const role =
        roleInput
            ? roleInput.value
            : "";


    const address =
        addressInput
            ? addressInput.value.trim()
            : "";


    const status =
        statusInput
            ? statusInput.value
            : "Active";


    // ==================================================
    // VALIDATION
    // ==================================================

    if (!name) {

        showMessage(
            "Please enter the user's name.",
            "error"
        );

        if (nameInput) {

            nameInput.focus();

        }

        return;

    }


    if (!email) {

        showMessage(
            "Please enter the user's email.",
            "error"
        );

        if (emailInput) {

            emailInput.focus();

        }

        return;

    }


    if (!role) {

        showMessage(
            "Please select a user role.",
            "error"
        );

        if (roleInput) {

            roleInput.focus();

        }

        return;

    }


    // ==================================================
    // EMAIL VALIDATION
    // ==================================================

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
        !emailPattern.test(
            email
        )
    ) {

        showMessage(
            "Please enter a valid email address.",
            "error"
        );

        if (emailInput) {

            emailInput.focus();

        }

        return;

    }


    // ==================================================
    // REQUEST DATA
    // ==================================================

    /*
     * Keep this payload compatible with
     * your current backend update endpoint.
     *
     * Your existing endpoint was already
     * using name, email, role and status.
     */

    const userData = {

        name: name,

        email: email,

        role: role,

        status: status

    };


    console.log(
        "Updating user:",
        userId
    );


    console.log(
        "Update payload:",
        userData
    );


    try {

        // ==================================================
        // DISABLE BUTTON
        // ==================================================

        if (saveButton) {

            saveButton.disabled =
                true;


            saveButton.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
            `;

        }


        // ==================================================
        // PUT REQUEST
        // ==================================================

        const response =
            await apiFetch(
                `${API}/api/admin/users/${encodeURIComponent(userId)}`,
                {
                    method: "PUT",

                    body:
                        JSON.stringify(
                            userData
                        )
                }
            );


        // ==================================================
        // PARSE RESPONSE
        // ==================================================

        const data =
            await parseResponse(
                response
            );


        console.log(
            "Update user response:",
            data
        );


        // ==================================================
        // SUCCESS
        // ==================================================

        showMessage(
            "User updated successfully.",
            "success"
        );


        // ==================================================
        // UPDATE DISPLAYED STATUS
        // ==================================================

        updateStatusDisplay(
            status
        );


        // ==================================================
        // RETURN TO USER MANAGEMENT
        // ==================================================

        setTimeout(
            function () {

                window.location.href =
                    "/UserManagement";

            },
            1200
        );

    }

    catch (error) {

        console.error(
            "Update user error:",
            error
        );


        showMessage(
            error.message ||
            "Unable to update user.",
            "error"
        );

    }

    finally {

        // ==================================================
        // ENABLE BUTTON
        // ==================================================

        if (saveButton) {

            saveButton.disabled =
                false;


            saveButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                Save Changes
            `;

        }

    }

}


// ======================================================
// SHOW MESSAGE
// ======================================================

function showMessage(
    message,
    type
) {

    const messageBox =
        document.getElementById(
            "formMessage"
        );


    if (!messageBox) {

        console.error(
            message
        );

        return;

    }


    messageBox.textContent =
        message;


    messageBox.className =
        `form-message ${type}`;

}


// ======================================================
// FORMAT DATE
// ======================================================

function formatDate(
    dateString
) {

    if (!dateString) {

        return "-";

    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";

    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ======================================================
// DISABLE FORM
// ======================================================

function disableForm() {

    const form =
        document.getElementById(
            "editUserForm"
        );


    if (!form) {

        return;

    }


    const elements =
        form.querySelectorAll(
            "input, select, textarea, button"
        );


    elements.forEach(
        function (element) {

            element.disabled =
                true;

        }
    );

}