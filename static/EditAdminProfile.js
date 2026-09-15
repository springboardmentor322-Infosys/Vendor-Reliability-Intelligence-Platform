/* ==========================================================
   VENDORIQ - ADMIN PROFILE JAVASCRIPT
   ========================================================== */

"use strict";


/* ==========================================================
   API CONFIGURATION
   ========================================================== */

const API = "http://127.0.0.1:8000";

const PROFILE_API =
    `${API}/api/admin/profile`;


/* ==========================================================
   DOM READY
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Admin Profile page initialized."
        );


        initializeSidebar();

        initializePasswordToggles();

        initializeForm();

        initializeCancelButton();

        initializePhotoButton();

        initializeLogout();


        await loadAdminProfile();

    }
);


/* ==========================================================
   AUTH TOKEN
   ========================================================== */

function getAuthToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("accessToken") ||

        localStorage.getItem("token") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("accessToken") ||

        sessionStorage.getItem("token") ||

        null

    );

}


/* ==========================================================
   AUTH HEADERS
   ========================================================== */

function getAuthHeaders() {

    const token =
        getAuthToken();

    const headers = {

        "Content-Type":
            "application/json"

    };


    if (token) {

        headers[
            "Authorization"
        ] =
            `Bearer ${token}`;

    }


    return headers;

}


/* ==========================================================
   API FETCH
   ========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const config = {

        ...options,

        headers: {

            ...getAuthHeaders(),

            ...(options.headers || {})

        }

    };


    const response =
        await fetch(
            url,
            config
        );


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        showToast(
            "Your session has expired. Please login again.",
            "error"
        );


        setTimeout(
            function () {

                window.location.href =
                    "/login";

            },
            1800
        );


        throw new Error(
            "Authentication failed."
        );

    }


    return response;

}


/* ==========================================================
   LOAD ADMIN PROFILE
   ========================================================== */

async function loadAdminProfile() {

    try {

        setPageLoading(true);


        const response =
            await apiFetch(
                `${API}/adminprofile`,
                {
                    method: "GET"
                }
            );


        if (!response.ok) {

            let errorMessage =
                "Unable to load profile.";

            try {

                const errorData =
                    await response.json();

                errorMessage =
                    errorData.detail ||
                    errorData.message ||
                    errorMessage;

            }
            catch (error) {

                console.warn(
                    "Could not parse error response.",
                    error
                );

            }


            throw new Error(
                errorMessage
            );

        }


        const data =
            await response.json();


        console.log(
            "Admin profile:",
            data
        );


        const user =
            normalizeProfileData(
                data
            );


        populateProfile(
            user
        );


        setPageLoading(false);

    }
    catch (error) {

        console.error(
            "Profile loading error:",
            error
        );


        setPageLoading(false);


        showToast(
            error.message ||
            "Failed to load profile.",
            "error"
        );

    }

}


/* ==========================================================
   NORMALIZE API RESPONSE
   ========================================================== */

function normalizeProfileData(data) {

    const user =
        data?.user ||
        data?.admin ||
        data?.profile ||
        data?.data ||
        data ||
        {};


    return {

        id:
            user.id ??
            user.user_id ??
            "",

        name:
            user.name ??
            user.full_name ??
            user.username ??
            "Admin User",

        email:
            user.email ??
            "",

        mobile:
            user.mobile ??
            user.phone ??
            user.phone_number ??
            "",

        gender:
            user.gender ??
            "",

        address:
            user.address ??
            "",

        role:
            user.role ??
            "Administrator",

        active:
            user.active ??
            user.is_active ??
            true,

        createdAt:
            user.created_at ??
            user.createdAt ??
            user.member_since ??
            "",

        lastLogin:
            user.last_login ??
            user.lastLogin ??
            "",

        status:
            user.status ??
            (
                user.active === false
                    ? "Inactive"
                    : "Active"
            )

    };

}


/* ==========================================================
   POPULATE PROFILE
   ========================================================== */

function populateProfile(user) {

    /* --------------------------------------------
       FORM
    -------------------------------------------- */

    setValue(
        "name",
        user.name
    );

    setValue(
        "email",
        user.email
    );

    setValue(
        "mobile",
        user.mobile
    );

    setValue(
        "gender",
        user.gender
    );

    setValue(
        "address",
        user.address
    );

    setValue(
        "role",
        user.role
    );

    setValue(
        "createdAt",
        formatDateTime(
            user.createdAt
        )
    );

    setValue(
        "lastLogin",
        formatDateTime(
            user.lastLogin
        )
    );


    /* --------------------------------------------
       ACCOUNT STATUS
    -------------------------------------------- */

    const active =
        normalizeBoolean(
            user.active
        );


    setValue(
        "accountStatus",
        active
            ? "true"
            : "false"
    );


    /* --------------------------------------------
       HEADER
    -------------------------------------------- */

    setText(
        "headerAdminName",
        user.name
    );

    setText(
        "headerAdminRole",
        user.role
    );


    /* --------------------------------------------
       SIDEBAR
    -------------------------------------------- */

    setText(
        "sidebarAdminName",
        user.name
    );

    setText(
        "sidebarAdminEmail",
        user.email
    );


    /* --------------------------------------------
       PROFILE SUMMARY
    -------------------------------------------- */

    setText(
        "editProfileName",
        user.name
    );

    setText(
        "editProfileEmail",
        user.email
    );

    setText(
        "editProfileRole",
        user.role
    );


    updateStatusBadge(
        active
    );


    updateProfileCompletion(
        user
    );

}


/* ==========================================================
   PROFILE COMPLETION
   ========================================================== */

function updateProfileCompletion(user) {

    const fields = [

        user.name,

        user.email,

        user.mobile,

        user.gender,

        user.address,

        user.role

    ];


    const filled =
        fields.filter(
            value =>
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
        ).length;


    const percentage =
        Math.round(
            (filled / fields.length) *
            100
        );


    const progress =
        document.querySelector(
            ".progress-value"
        );


    const completionText =
        document.querySelector(
            ".completion-heading span"
        );


    if (progress) {

        progress.style.width =
            `${percentage}%`;

    }


    if (completionText) {

        completionText.textContent =
            `${percentage}%`;

    }

}


/* ==========================================================
   STATUS BADGE
   ========================================================== */

function updateStatusBadge(
    active
) {

    const badge =
        document.getElementById(
            "editProfileStatus"
        );


    if (!badge) {
        return;
    }


    badge.classList.remove(
        "active",
        "inactive"
    );


    if (active) {

        badge.classList.add(
            "active"
        );

        badge.textContent =
            "Active";

    }
    else {

        badge.classList.add(
            "inactive"
        );

        badge.textContent =
            "Inactive";

    }

}


/* ==========================================================
   FORM INITIALIZATION
   ========================================================== */

function initializeForm() {

    const form =
        document.getElementById(
            "editProfileForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        handleProfileSubmit
    );


    const accountStatus =
        document.getElementById(
            "accountStatus"
        );


    if (accountStatus) {

        accountStatus.addEventListener(
            "change",
            function () {

                updateStatusBadge(
                    this.value === "true"
                );

            }
        );

    }

}


/* ==========================================================
   SUBMIT PROFILE
   ========================================================== */

async function handleProfileSubmit(
    event
) {

    event.preventDefault();


    clearValidationErrors();


    if (
        !validateForm()
    ) {

        showToast(
            "Please correct the highlighted fields.",
            "error"
        );

        return;

    }


    const newPassword =
        document.getElementById(
            "newPassword"
        )?.value.trim() || "";


    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        )?.value.trim() || "";


    if (
        newPassword ||
        confirmPassword
    ) {

        if (
            newPassword.length < 8
        ) {

            markInvalid(
                "newPassword"
            );

            showToast(
                "Password must contain at least 8 characters.",
                "error"
            );

            return;

        }


        if (
            newPassword !==
            confirmPassword
        ) {

            markInvalid(
                "confirmPassword"
            );

            showToast(
                "Passwords do not match.",
                "error"
            );

            return;

        }

    }


    const payload =
        buildProfilePayload();


    console.log(
        "Profile update payload:",
        payload
    );


    const saveButton =
        document.getElementById(
            "saveButton"
        );


    setSaveButtonLoading(
        true
    );


    try {

        const response =
            await apiFetch(
                PROFILE_API,
                {

                    method: "PUT",

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const data =
            await parseResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                data?.detail ||
                data?.message ||
                "Profile update failed."
            );

        }


        console.log(
            "Profile update response:",
            data
        );


        showToast(
            "Profile updated successfully.",
            "success"
        );


        /* Clear password fields */

        setValue(
            "newPassword",
            ""
        );

        setValue(
            "confirmPassword",
            ""
        );


        /* Update displayed values */

        const updatedUser =
            normalizeProfileData(
                data
            );


        if (
            updatedUser.name ||
            updatedUser.email
        ) {

            populateProfile(
                updatedUser
            );

        }
        else {

            populateProfile(
                normalizeProfileData(
                    payload
                )
            );

        }


        setTimeout(
            function () {

                window.location.href =
                    "/admin/profile";

            },
            1200
        );

    }
    catch (error) {

        console.error(
            "Profile update error:",
            error
        );


        showToast(
            error.message ||
            "Unable to update profile.",
            "error"
        );

    }
    finally {

        setSaveButtonLoading(
            false
        );

    }

}


/* ==========================================================
   BUILD UPDATE PAYLOAD
   ========================================================== */

function buildProfilePayload() {

    const name =
        getValue("name");

    const email =
        getValue("email");

    const mobile =
        getValue("mobile");

    const gender =
        getValue("gender");

    const address =
        getValue("address");

    const active =
        getValue(
            "accountStatus"
        ) === "true";

    const newPassword =
        getValue(
            "newPassword"
        );


    const payload = {

        name:
            name,

        email:
            email,

        mobile:
            mobile,

        gender:
            gender,

        address:
            address,

        active:
            active

    };


    /*
       Only send password when the
       administrator entered one.
    */

    if (newPassword) {

        payload.password =
            newPassword;

    }


    return payload;

}


/* ==========================================================
   FORM VALIDATION
   ========================================================== */

function validateForm() {

    let valid = true;


    const name =
        document.getElementById(
            "name"
        );

    const email =
        document.getElementById(
            "email"
        );


    if (
        !name ||
        !name.value.trim()
    ) {

        markInvalid(
            "name"
        );

        valid = false;

    }


    if (
        !email ||
        !email.value.trim()
    ) {

        markInvalid(
            "email"
        );

        valid = false;

    }
    else if (
        !isValidEmail(
            email.value.trim()
        )
    ) {

        markInvalid(
            "email"
        );

        valid = false;

    }


    return valid;

}


/* ==========================================================
   EMAIL VALIDATION
   ========================================================== */

function isValidEmail(
    email
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* ==========================================================
   PASSWORD TOGGLES
   ========================================================== */

function initializePasswordToggles() {

    const buttons =
        document.querySelectorAll(
            ".password-toggle"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                function () {

                    const targetId =
                        this.dataset.target;

                    const input =
                        document.getElementById(
                            targetId
                        );

                    const icon =
                        this.querySelector(
                            "i"
                        );


                    if (
                        !input
                    ) {
                        return;
                    }


                    if (
                        input.type ===
                        "password"
                    ) {

                        input.type =
                            "text";


                        if (icon) {

                            icon.classList.remove(
                                "fa-eye"
                            );

                            icon.classList.add(
                                "fa-eye-slash"
                            );

                        }

                    }
                    else {

                        input.type =
                            "password";


                        if (icon) {

                            icon.classList.remove(
                                "fa-eye-slash"
                            );

                            icon.classList.add(
                                "fa-eye"
                            );

                        }

                    }

                }
            );

        }
    );

}


/* ==========================================================
   CANCEL BUTTON
   ========================================================== */

function initializeCancelButton() {

    const cancelButton =
        document.querySelector(
            ".cancel-button"
        );


    if (!cancelButton) {
        return;
    }


    cancelButton.addEventListener(
        "click",
        function () {

            const confirmed =
                window.confirm(
                    "Discard your changes?"
                );


            if (
                confirmed
            ) {

                window.location.href =
                    "/admin/profile";

            }

        }
    );

}


/* ==========================================================
   PHOTO BUTTON
   ========================================================== */

function initializePhotoButton() {

    const photoButton =
        document.getElementById(
            "photoButton"
        );


    if (!photoButton) {
        return;
    }


    photoButton.addEventListener(
        "click",
        function () {

            showToast(
                "Profile photo upload is not configured yet.",
                "error"
            );

        }
    );

}


/* ==========================================================
   SIDEBAR ACTIVE LINK
   ========================================================== */

function initializeSidebar() {

    const currentPath =
        window.location.pathname
            .toLowerCase();


    const links =
        document.querySelectorAll(
            ".sidebar-link"
        );


    links.forEach(
        link => {

            const href =
                link.getAttribute(
                    "href"
                );


            if (
                !href ||
                href === "#"
            ) {
                return;
            }


            const normalizedHref =
                href
                    .toLowerCase()
                    .replace(
                        /\/$/,
                        ""
                    );


            const normalizedPath =
                currentPath
                    .replace(
                        /\/$/,
                        ""
                    );


            if (
                normalizedPath ===
                normalizedHref
            ) {

                link.classList.add(
                    "active"
                );

            }

        }
    );

}


/* ==========================================================
   LOGOUT
   ========================================================== */

function initializeLogout() {

    const logoutLinks =
        document.querySelectorAll(
            'a[href="/login"]'
        );


    logoutLinks.forEach(
        link => {

            link.addEventListener(
                "click",
                function () {

                    localStorage.removeItem(
                        "access_token"
                    );

                    localStorage.removeItem(
                        "accessToken"
                    );

                    localStorage.removeItem(
                        "token"
                    );

                    localStorage.removeItem(
                        "user_id"
                    );

                    localStorage.removeItem(
                        "admin_id"
                    );

                    sessionStorage.removeItem(
                        "access_token"
                    );

                    sessionStorage.removeItem(
                        "accessToken"
                    );

                    sessionStorage.removeItem(
                        "token"
                    );

                }
            );

        }
    );

}


/* ==========================================================
   SAVE BUTTON LOADING
   ========================================================== */

function setSaveButtonLoading(
    loading
) {

    const button =
        document.getElementById(
            "saveButton"
        );


    if (!button) {
        return;
    }


    if (loading) {

        button.disabled =
            true;

        button.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
            `;

    }
    else {

        button.disabled =
            false;

        button.innerHTML =
            `
            <i class="fa-regular fa-floppy-disk"></i>
            Save Changes
            `;

    }

}


/* ==========================================================
   PAGE LOADING
   ========================================================== */

function setPageLoading(
    loading
) {

    const main =
        document.querySelector(
            ".main-content"
        );


    if (!main) {
        return;
    }


    if (loading) {

        main.classList.add(
            "page-loading"
        );

    }
    else {

        main.classList.remove(
            "page-loading"
        );

    }

}


/* ==========================================================
   RESPONSE PARSER
   ========================================================== */

async function parseResponse(
    response
) {

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        return await response.json();

    }


    const text =
        await response.text();


    return {
        message: text
    };

}


/* ==========================================================
   TOAST
   ========================================================== */

function showToast(
    message,
    type = "success"
) {

    const oldToast =
        document.querySelector(
            ".profile-toast"
        );


    if (oldToast) {

        oldToast.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `profile-toast ${type}`;


    const icon =
        type === "success"
            ? "fa-circle-check"
            : "fa-circle-exclamation";


    toast.innerHTML =
        `
        <i class="fa-solid ${icon}"></i>
        <span>${escapeHtml(message)}</span>
        `;


    document.body.appendChild(
        toast
    );


    setTimeout(
        function () {

            toast.style.opacity =
                "0";

            toast.style.transform =
                "translateY(-10px)";

            toast.style.transition =
                "0.25s ease";


            setTimeout(
                function () {

                    toast.remove();

                },
                250
            );

        },
        3500
    );

}


/* ==========================================================
   GET VALUE
   ========================================================== */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value.trim()
        : "";

}


/* ==========================================================
   SET VALUE
   ========================================================== */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value ??
        "";

}


/* ==========================================================
   SET TEXT
   ========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value ??
        "";

}


/* ==========================================================
   MARK INVALID
   ========================================================== */

function markInvalid(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.classList.add(
        "invalid"
    );


    element.focus();

}


/* ==========================================================
   CLEAR VALIDATION
   ========================================================== */

function clearValidationErrors() {

    document
        .querySelectorAll(
            ".invalid"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "invalid"
                );

            }
        );

}


/* ==========================================================
   BOOLEAN NORMALIZATION
   ========================================================== */

function normalizeBoolean(
    value
) {

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "True"
    ) {

        return true;

    }


    return false;

}


/* ==========================================================
   DATE FORMAT
   ========================================================== */

function formatDateTime(
    value
) {

    if (
        !value
    ) {

        return "Not available";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* ==========================================================
   HTML ESCAPE
   ========================================================== */

function escapeHtml(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ==========================================================
   CLEAR PASSWORD WHEN LEAVING PAGE
   ========================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        const newPassword =
            document.getElementById(
                "newPassword"
            );

        const confirmPassword =
            document.getElementById(
                "confirmPassword"
            );


        if (newPassword) {

            newPassword.value =
                "";

        }


        if (confirmPassword) {

            confirmPassword.value =
                "";

        }

    }
);