// ============================================================
// ADMIN PROFILE JAVASCRIPT
// VendorIQ
// ============================================================


// ============================================================
// API CONFIGURATION
// ============================================================

const API = "http://127.0.0.1:8000";


// Main profile endpoint
const PROFILE_API = `${API}/adminprofile`;

// Legacy endpoint used by some older backend versions
const LEGACY_PROFILE_API = `${API}/api/admin/profile`;


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Initializing Admin Profile..."
        );


        // Load administrator profile
        loadAdminProfile();


        // Attach edit form submit event
        const editForm =
            document.getElementById(
                "editProfileForm"
            );


        if (editForm) {

            editForm.addEventListener(
                "submit",
                saveProfile
            );
        }


        // Close modal when clicking outside
        const editModal =
            document.getElementById(
                "editModal"
            );


        if (editModal) {

            editModal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        editModal
                    ) {

                        closeEditModal();
                    }
                }
            );
        }


        console.log(
            "Admin Profile initialized."
        );
    }
);


// ============================================================
// AUTHENTICATION
// ============================================================

function getAuthToken() {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken") ||
        null;


    return token;
}


// ============================================================
// AUTHORIZATION HEADERS
// ============================================================

function getAuthHeaders() {

    const token =
        getAuthToken();


    const headers = {

        "Content-Type":
            "application/json"
    };


    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }


    return headers;
}


// ============================================================
// CHECK LOGIN
// ============================================================

function checkAuthentication() {

    const token =
        getAuthToken();


    if (!token) {

        console.error(
            "No JWT token found."
        );


        showToast(
            "Session expired. Please login again."
        );


        return false;
    }


    return true;
}


// ============================================================
// LOAD ADMIN PROFILE
// ============================================================

async function loadAdminProfile() {

    console.log(
        "Loading admin profile..."
    );


    if (!checkAuthentication()) {

        return;
    }


    try {

        let response =
            await fetch(
                PROFILE_API,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        // ----------------------------------------------------
        // FALLBACK TO OLD ENDPOINT
        // ----------------------------------------------------

        if (response.status === 404) {

            console.warn(
                "Primary profile endpoint not found."
            );

            console.warn(
                "Trying legacy endpoint:",
                LEGACY_PROFILE_API
            );


            response =
                await fetch(
                    LEGACY_PROFILE_API,
                    {
                        method: "GET",

                        headers:
                            getAuthHeaders()
                    }
                );
        }


        // ----------------------------------------------------
        // UNAUTHORIZED
        // ----------------------------------------------------

        if (response.status === 401) {

            console.error(
                "401 Unauthorized"
            );


            console.error(
                "JWT token is missing, invalid, or expired."
            );


            showToast(
                "Session expired. Please login again."
            );


            return;
        }


        // ----------------------------------------------------
        // FORBIDDEN
        // ----------------------------------------------------

        if (response.status === 403) {

            console.error(
                "403 Forbidden"
            );


            showToast(
                "Administrator permission required."
            );


            return;
        }


        // ----------------------------------------------------
        // OTHER ERRORS
        // ----------------------------------------------------

        if (!response.ok) {

            let errorMessage =
                "Unable to load user profile";


            try {

                const errorData =
                    await response.json();


                errorMessage =
                    errorData.detail ||
                    errorData.message ||
                    errorMessage;

            }

            catch (jsonError) {

                console.warn(
                    "Could not parse error response."
                );
            }


            throw new Error(
                errorMessage
            );
        }


        // ----------------------------------------------------
        // READ JSON
        // ----------------------------------------------------

        const user =
            await response.json();


        console.log(
            "Profile loaded successfully:",
            user
        );


        // ----------------------------------------------------
        // DISPLAY PROFILE
        // ----------------------------------------------------

        displayProfile(
            user
        );

    }

    catch (error) {

        console.error(
            "Profile loading error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load profile"
        );
    }
}


// ============================================================
// DISPLAY PROFILE
// ============================================================

function displayProfile(user) {

    if (!user) {

        console.error(
            "Profile data is empty."
        );

        return;
    }


    console.log(
        "Displaying profile:",
        user
    );


    // --------------------------------------------------------
    // USER NAME
    // --------------------------------------------------------

    const name =
        user.name ||
        user.full_name ||
        user.username ||
        "Admin User";


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    const email =
        user.email ||
        "--";


    // --------------------------------------------------------
    // ROLE
    // --------------------------------------------------------

    const role =
        formatRole(
            user.role
        );


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const isActive =
        user.active !== undefined
            ? user.active
            : user.is_active !== undefined
                ? user.is_active
                : true;


    const status =
        isActive
            ? "Active"
            : "Inactive";


    // --------------------------------------------------------
    // AVATAR LETTER
    // --------------------------------------------------------

    const firstLetter =
        name
            .charAt(0)
            .toUpperCase();


    setText(
        "profileAvatar",
        firstLetter
    );


    setText(
        "sideAvatar",
        firstLetter
    );


    setText(
        "headerAvatar",
        firstLetter
    );


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    setText(
        "headerName",
        name
    );


    // --------------------------------------------------------
    // PROFILE SUMMARY
    // --------------------------------------------------------

    setText(
        "profileName",
        name
    );


    setText(
        "profileEmail",
        email
    );


    setText(
        "profileRole",
        role
    );


    setStatus(
        "profileStatus",
        status
    );


    // --------------------------------------------------------
    // TOP STATISTICS
    // --------------------------------------------------------

    setText(
        "lastLogin",
        formatDateTime(
            user.last_login ||
            user.lastLogin
        )
    );


    setText(
        "accountCreated",
        formatDateTime(
            user.created_at ||
            user.createdAt
        )
    );


    const totalLogins =
        user.total_logins !== undefined &&
        user.total_logins !== null
            ? user.total_logins
            : user.login_count !== undefined &&
              user.login_count !== null
                ? user.login_count
                : null;


    setText(
        "totalLogins",
        totalLogins !== null
            ? totalLogins
            : "N/A"
    );


    // --------------------------------------------------------
    // PERSONAL INFORMATION
    // --------------------------------------------------------

    setText(
        "fullName",
        name
    );


    setText(
        "emailAddress",
        email
    );


    setText(
        "mobileNumber",
        user.mobile ||
        user.phone ||
        "--"
    );


    setText(
        "gender",
        user.gender ||
        "--"
    );


    setText(
        "address",
        user.address ||
        "--"
    );


    // --------------------------------------------------------
    // ACCOUNT INFORMATION
    // --------------------------------------------------------

    setText(
        "accountRole",
        role
    );


    setStatus(
        "accountStatus",
        status
    );


    setText(
        "accountLastLogin",
        formatDateTime(
            user.last_login ||
            user.lastLogin
        )
    );


    setText(
        "accountCreatedDetail",
        formatDateTime(
            user.created_at ||
            user.createdAt
        )
    );


    // --------------------------------------------------------
    // SECURITY
    // --------------------------------------------------------

    setText(
        "securityLogins",
        totalLogins !== null
            ? totalLogins
            : "Not available"
    );


    // --------------------------------------------------------
    // SIDEBAR
    // --------------------------------------------------------

    setText(
        "sideName",
        name
    );


    setText(
        "sideEmail",
        email
    );


    // --------------------------------------------------------
    // ACTIVITY
    // --------------------------------------------------------

    setText(
        "activityLogin",
        user.last_login ||
        user.lastLogin
            ? formatDateTime(
                user.last_login ||
                user.lastLogin
            )
            : "No login recorded"
    );


    setText(
        "activityCreated",
        user.created_at ||
        user.createdAt
            ? formatDateTime(
                user.created_at ||
                user.createdAt
            )
            : "No date available"
    );


    // --------------------------------------------------------
    // EDIT FORM
    // --------------------------------------------------------

    const editName =
        document.getElementById(
            "editName"
        );


    if (editName) {

        editName.value =
            name === "Admin User"
                ? ""
                : name;
    }


    const editMobile =
        document.getElementById(
            "editMobile"
        );


    if (editMobile) {

        editMobile.value =
            user.mobile ||
            user.phone ||
            "";
    }


    const editGender =
        document.getElementById(
            "editGender"
        );


    if (editGender) {

        editGender.value =
            user.gender ||
            "";
    }


    const editAddress =
        document.getElementById(
            "editAddress"
        );


    if (editAddress) {

        editAddress.value =
            user.address ||
            "";
    }
}


// ============================================================
// UPDATE PROFILE
// ============================================================

async function saveProfile(event) {

    event.preventDefault();


    console.log(
        "Saving administrator profile..."
    );


    if (!checkAuthentication()) {

        return;
    }


    // --------------------------------------------------------
    // GET FORM VALUES
    // --------------------------------------------------------

    const editName =
        document.getElementById(
            "editName"
        );


    const editMobile =
        document.getElementById(
            "editMobile"
        );


    const editGender =
        document.getElementById(
            "editGender"
        );


    const editAddress =
        document.getElementById(
            "editAddress"
        );


    const updatedProfile = {

        name:
            editName
                ? editName.value.trim()
                : "",

        mobile:
            editMobile
                ? editMobile.value.trim()
                : "",

        gender:
            editGender
                ? editGender.value
                : "",

        address:
            editAddress
                ? editAddress.value.trim()
                : ""
    };


    console.log(
        "Updated profile:",
        updatedProfile
    );


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!updatedProfile.name) {

        showToast(
            "Name cannot be empty"
        );


        return;
    }


    try {

        let response =
            await fetch(
                PROFILE_API,
                {
                    method: "PUT",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify(
                            updatedProfile
                        )
                }
            );


        // ----------------------------------------------------
        // FALLBACK TO LEGACY ENDPOINT
        // ----------------------------------------------------

        if (response.status === 404) {

            console.warn(
                "Primary PUT endpoint not found."
            );


            response =
                await fetch(
                    LEGACY_PROFILE_API,
                    {
                        method: "PUT",

                        headers:
                            getAuthHeaders(),

                        body:
                            JSON.stringify(
                                updatedProfile
                            )
                    }
                );
        }


        // ----------------------------------------------------
        // 401
        // ----------------------------------------------------

        if (response.status === 401) {

            showToast(
                "Session expired. Please login again."
            );


            return;
        }


        // ----------------------------------------------------
        // 403
        // ----------------------------------------------------

        if (response.status === 403) {

            showToast(
                "Administrator permission required."
            );


            return;
        }


        // ----------------------------------------------------
        // READ RESPONSE
        // ----------------------------------------------------

        let data = {};


        try {

            data =
                await response.json();

        }

        catch (jsonError) {

            console.warn(
                "Response does not contain JSON."
            );
        }


        // ----------------------------------------------------
        // OTHER ERRORS
        // ----------------------------------------------------

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Profile update failed"
            );
        }


        console.log(
            "Profile updated:",
            data
        );


        // ----------------------------------------------------
        // SUCCESS
        // ----------------------------------------------------

        showToast(
            "Profile updated successfully"
        );


        closeEditModal();


        // Reload fresh data from PostgreSQL
        await loadAdminProfile();

    }

    catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showToast(
            error.message ||
            "Profile update failed"
        );
    }
}


// ============================================================
// EDIT PROFILE
// ============================================================

function editProfile() {

    window.location.href = "/admin/profile/edit"
}


// ============================================================
// CLOSE EDIT MODAL
// ============================================================

function closeEditModal() {

    const modal =
        document.getElementById(
            "editModal"
        );


    if (!modal) {

        return;
    }


    modal.classList.remove(
        "show"
    );
}


// ============================================================
// CHANGE PASSWORD
// ============================================================

function changePassword() {

    showToast(
        "Password change API is not connected yet."
    );
}


// ============================================================
// LOGIN HISTORY
// ============================================================

function viewLoginHistory() {

    showToast(
        "Login history API is not connected yet."
    );
}


// ============================================================
// RECENT ACTIVITY
// ============================================================

function viewAllActivity() {

    showToast(
        "Activity history API is not connected yet."
    );
}


// ============================================================
// DOWNLOAD PROFILE
// ============================================================

function downloadProfile() {

    const profileData = {

        name:
            getElementText(
                "profileName"
            ),

        email:
            getElementText(
                "profileEmail"
            ),

        mobile:
            getElementText(
                "mobileNumber"
            ),

        gender:
            getElementText(
                "gender"
            ),

        address:
            getElementText(
                "address"
            ),

        role:
            getElementText(
                "accountRole"
            ),

        status:
            getElementText(
                "accountStatus"
            ),

        last_login:
            getElementText(
                "lastLogin"
            ),

        account_created:
            getElementText(
                "accountCreated"
            )
    };


    const content =
        JSON.stringify(
            profileData,
            null,
            4
        );


    const blob =
        new Blob(
            [content],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "admin-profile.json";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );


    showToast(
        "Profile downloaded successfully"
    );
}


// ============================================================
// CHANGE PHOTO
// ============================================================

function changePhoto() {

    showToast(
        "Profile photo upload can be added separately."
    );
}


// ============================================================
// PASSWORD MESSAGE
// ============================================================

function showPasswordMessage() {

    showToast(
        "Password is stored securely and cannot be displayed."
    );
}


// ============================================================
// STATUS
// ============================================================

function setStatus(
    elementId,
    status
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;
    }


    const normalizedStatus =
        String(
            status || ""
        ).toLowerCase();


    // --------------------------------------------------------
    // Clear existing content
    // --------------------------------------------------------

    element.innerHTML = "";


    // --------------------------------------------------------
    // Status dot
    // --------------------------------------------------------

    const dot =
        document.createElement(
            "span"
        );


    element.appendChild(
        dot
    );


    // --------------------------------------------------------
    // Status text
    // --------------------------------------------------------

    const text =
        document.createTextNode(
            status || "--"
        );


    element.appendChild(
        text
    );


    // --------------------------------------------------------
    // ACTIVE
    // --------------------------------------------------------

    if (
        normalizedStatus ===
        "active"
    ) {

        element.style.color =
            "#06954c";
    }


    // --------------------------------------------------------
    // INACTIVE
    // --------------------------------------------------------

    else {

        element.style.color =
            "#d12b2b";
    }
}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return;
    }


    element.textContent =
        value !== undefined &&
        value !== null &&
        value !== ""
            ? value
            : "--";
}


// ============================================================
// GET ELEMENT TEXT
// ============================================================

function getElementText(
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        return "--";
    }


    return (
        element.textContent ||
        "--"
    ).trim();
}


// ============================================================
// FORMAT ROLE
// ============================================================

function formatRole(role) {

    if (!role) {

        return "--";
    }


    let roleText =
        String(
            role
        );


    roleText =
        roleText.replace(
            /_/g,
            " "
        );


    roleText =
        roleText.replace(
            /\b\w/g,
            function (char) {

                return char.toUpperCase();
            }
        );


    return roleText;
}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
    dateString
) {

    if (!dateString) {

        return "--";
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

        return "--";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );
}


// ============================================================
// FORMAT DATE + TIME
// ============================================================

function formatDateTime(
    dateString
) {

    if (!dateString) {

        return "Not available";
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

        return "Not available";
    }


    return date.toLocaleString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


// ============================================================
// TOAST
// ============================================================

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.warn(
            "Toast element not found:",
            message
        );


        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    // Clear previous timeout
    if (
        window.adminProfileToastTimer
    ) {

        clearTimeout(
            window.adminProfileToastTimer
        );
    }


    window.adminProfileToastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}


// ============================================================
// LOGOUT HELPER
// ============================================================

function logoutAdmin() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "accessToken"
    );


    sessionStorage.removeItem(
        "access_token"
    );

    sessionStorage.removeItem(
        "token"
    );

    sessionStorage.removeItem(
        "accessToken"
    );


    window.location.href =
        "/login";
}