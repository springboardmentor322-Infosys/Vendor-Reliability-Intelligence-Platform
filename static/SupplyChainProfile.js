const API = "http://127.0.0.1:8000";

let profileData = null;


/* ==========================================================
   HELPERS
========================================================== */

function token() {

    return sessionStorage.getItem("access_token");

}


function authHeaders() {

    const accessToken = token();

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
    };

}


function showToast(message, success = true) {

    const toast = document.getElementById("toast");
    const text = document.getElementById("toastMessage");

    text.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);

}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
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


function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

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


function setValue(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.value = value ?? "";
    }

}


function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "-";
    }

}


/* ==========================================================
   LOAD PROFILE
========================================================== */

async function loadProfile() {

    const accessToken = token();

    if (!accessToken) {

        alert(
            "Your session has expired. Please login again."
        );

        window.location.href =
            "/login";

        return;

    }


    try {

        const response = await fetch(
            `${API}/api/profile/me`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${accessToken}`
                }
            }
        );


        if (response.status === 401) {

            localStorage.removeItem(
                "access_token"
            );

            window.location.href =
                "/login";

            return;

        }


        if (!response.ok) {

            const error =
                await response.json();

            throw new Error(
                error.detail ||
                "Unable to load profile."
            );

        }


        profileData =
            await response.json();


        renderProfile(
            profileData
        );

    }
    catch (error) {

        console.error(
            "Profile error:",
            error
        );

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   RENDER PROFILE
========================================================== */

function renderProfile(data) {

    const user =
        data.user || data;

    const preferences =
        data.preferences || {};


    /* PERSONAL */

    setValue(
        "fullName",
        user.name
    );

    setValue(
        "employeeIdInput",
        user.employee_id
    );

    setValue(
        "email",
        user.email
    );

    setValue(
        "alternateEmail",
        user.alternate_email
    );

    setValue(
        "phone",
        user.mobile
    );

    setValue(
        "location",
        user.location
    );

    setValue(
        "jobTitle",
        user.job_title
    );

    setValue(
        "address",
        user.address
    );

    setValue(
        "dateOfJoining",
        user.date_of_joining
    );


    const department =
        document.getElementById(
            "department"
        );

    if (department) {

        department.value =
            user.department || "";

    }


    /* SIDEBAR */

    setText(
        "profileName",
        user.name
    );

    setText(
        "profileRole",
        user.role
    );

    setText(
        "sidebarName",
        user.name
    );

    setText(
        "sidebarRole",
        user.role
    );

    setText(
        "employeeId",
        user.employee_id
    );

    setText(
        "departmentSide",
        user.department
    );

    setText(
        "locationSide",
        user.location
    );

    setText(
        "emailSide",
        user.email
    );

    setText(
        "phoneSide",
        user.mobile
    );

    setText(
        "managerSide",
        user.reporting_manager_name
    );

    setText(
        "joiningSide",
        formatDate(
            user.date_of_joining
        )
    );

    setText(
        "roleSide",
        user.role
    );


    /* SECURITY */

    const twoFactor =
        document.getElementById(
            "twoFactor"
        );

    if (twoFactor) {

        twoFactor.checked =
            Boolean(
                user.two_factor_enabled
            );

    }


    const loginNotifications =
        document.getElementById(
            "loginNotifications"
        );

    if (loginNotifications) {

        loginNotifications.checked =
            Boolean(
                user.login_email_notifications
            );

    }


    setText(
        "lastLogin",
        formatDateTime(
            user.last_login
        )
    );

    setText(
        "passwordChanged",
        formatDateTime(
            user.password_changed_at
        )
    );


    /* PHOTO */

    if (user.profile_image) {

        const image =
            `${API}/${user.profile_image}`;

        document.getElementById(
            "profileImage"
        ).src = image;

        document.getElementById(
            "sidebarAvatar"
        ).src = image;

    }


    /* PREFERENCES */

    setValue(
        "language",
        preferences.language
    );

    setValue(
        "timezone",
        preferences.timezone
    );

    setValue(
        "dateFormat",
        preferences.date_format
    );

    setValue(
        "timeFormat",
        preferences.time_format
    );

    setValue(
        "currency",
        preferences.currency
    );


    setText(
        "summaryLanguage",
        preferences.language
    );

    setText(
        "summaryTimezone",
        preferences.timezone
    );

    setText(
        "summaryDateFormat",
        preferences.date_format
    );

    setText(
        "summaryTimeFormat",
        preferences.time_format
    );

    setText(
        "summaryCurrency",
        preferences.currency
    );


    loadManagers(
        user.reporting_manager_id
    );

    calculateCompletion(
        user,
        preferences
    );

}


/* ==========================================================
   UPDATE PROFILE
========================================================== */

async function updateProfile(event) {

    event.preventDefault();


    const payload = {

        name:
            document.getElementById(
                "fullName"
            ).value.trim(),

        email:
            document.getElementById(
                "email"
            ).value.trim(),

        alternate_email:
            document.getElementById(
                "alternateEmail"
            ).value.trim() || null,

        mobile:
            document.getElementById(
                "phone"
            ).value.trim(),

        department:
            document.getElementById(
                "department"
            ).value,

        job_title:
            document.getElementById(
                "jobTitle"
            ).value.trim(),

        location:
            document.getElementById(
                "location"
            ).value.trim(),

        reporting_manager_id:
            document.getElementById(
                "reportingManager"
            ).value
                ? Number(
                    document.getElementById(
                        "reportingManager"
                    ).value
                )
                : null,

        date_of_joining:
            document.getElementById(
                "dateOfJoining"
            ).value || null,

        address:
            document.getElementById(
                "address"
            ).value.trim()

    };


    try {

        const response =
            await fetch(
                `${API}/api/profile/me`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Unable to update profile."
            );

        }


        showToast(
            "Profile updated successfully."
        );


        await loadProfile();

    }
    catch (error) {

        console.error(error);

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   PASSWORD UPDATE
========================================================== */

async function updatePassword(event) {

    event.preventDefault();


    const currentPassword =
        document.getElementById(
            "currentPassword"
        ).value;

    const newPassword =
        document.getElementById(
            "newPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "New passwords do not match.",
            false
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API}/api/profile/password`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({

                        current_password:
                            currentPassword,

                        new_password:
                            newPassword,

                        confirm_password:
                            confirmPassword

                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Password update failed."
            );

        }


        document
            .getElementById(
                "passwordForm"
            )
            .reset();


        showToast(
            "Password updated successfully."
        );

    }
    catch (error) {

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   TWO FACTOR
========================================================== */

async function updateTwoFactor() {

    const enabled =
        document.getElementById(
            "twoFactor"
        ).checked;


    try {

        const response =
            await fetch(
                `${API}/api/profile/security/2fa`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        enabled
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Unable to update 2FA."
            );

        }


        showToast(
            enabled
                ? "Two-factor authentication enabled."
                : "Two-factor authentication disabled."
        );


        calculateCompletion(
            profileData.user,
            profileData.preferences
        );

    }
    catch (error) {

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   LOGIN NOTIFICATIONS
========================================================== */

async function updateLoginNotifications() {

    const enabled =
        document.getElementById(
            "loginNotifications"
        ).checked;


    try {

        const response =
            await fetch(
                `${API}/api/profile/security/login-notifications`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body: JSON.stringify({
                        enabled
                    })
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Unable to update notification setting."
            );

        }


        showToast(
            "Login notification preference updated."
        );

    }
    catch (error) {

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   PREFERENCES
========================================================== */

async function updatePreferences(event) {

    event.preventDefault();


    const payload = {

        language:
            document.getElementById(
                "language"
            ).value,

        timezone:
            document.getElementById(
                "timezone"
            ).value,

        date_format:
            document.getElementById(
                "dateFormat"
            ).value,

        time_format:
            document.getElementById(
                "timeFormat"
            ).value,

        currency:
            document.getElementById(
                "currency"
            ).value

    };


    try {

        const response =
            await fetch(
                `${API}/api/profile/preferences`,
                {
                    method: "PUT",
                    headers: authHeaders(),
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Unable to update preferences."
            );

        }


        showToast(
            "Preferences saved successfully."
        );


        await loadProfile();

    }
    catch (error) {

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   PROFILE PHOTO
========================================================== */

async function uploadProfileImage() {

    const input =
        document.getElementById(
            "profileUpload"
        );


    if (!input.files.length) {

        return;

    }


    const formData =
        new FormData();

    formData.append(
        "file",
        input.files[0]
    );


    try {

        const response =
            await fetch(
                `${API}/api/profile/photo`,
                {
                    method: "POST",
                    headers: {
                        "Authorization":
                            `Bearer ${token()}`
                    },
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Photo upload failed."
            );

        }


        showToast(
            "Profile photo updated."
        );


        await loadProfile();

    }
    catch (error) {

        showToast(
            error.message,
            false
        );

    }

}


/* ==========================================================
   LOAD MANAGERS
========================================================== */

async function loadManagers(
    selectedId
) {

    try {

        const response =
            await fetch(
                `${API}/api/profile/managers`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token()}`
                    }
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const select =
            document.getElementById(
                "reportingManager"
            );


        select.innerHTML =
            `<option value="">
                Select manager
            </option>`;


        data.managers.forEach(
            manager => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    manager.id;

                option.textContent =
                    manager.name;

                if (
                    Number(manager.id) ===
                    Number(selectedId)
                ) {

                    option.selected =
                        true;

                }

                select.appendChild(
                    option
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Manager loading failed:",
            error
        );

    }

}


/* ==========================================================
   ACTIVITY
========================================================== */

async function loadActivity() {

    try {

        const response =
            await fetch(
                `${API}/api/profile/activity?limit=10`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${token()}`
                    }
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        const body =
            document.getElementById(
                "activityBody"
            );


        body.innerHTML = "";


        data.items.forEach(
            item => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            item.action
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.description || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            item.ip_address || "-"
                        )}
                    </td>

                    <td class="${
                        item.status === "Success"
                            ? "status-success"
                            : "status-failed"
                    }">
                        ${escapeHTML(
                            item.status || "-"
                        )}
                    </td>

                    <td>
                        ${formatDateTime(
                            item.created_at
                        )}
                    </td>

                `;


                body.appendChild(
                    row
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Activity loading failed:",
            error
        );

    }

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* ==========================================================
   PROFILE COMPLETION
========================================================== */

function calculateCompletion(
    user,
    preferences
) {

    const checks = [

        Boolean(user.name),

        Boolean(user.email),

        Boolean(user.mobile),

        Boolean(user.department),

        Boolean(user.job_title),

        Boolean(user.location),

        Boolean(user.profile_image),

        Boolean(
            user.two_factor_enabled
        ),

        Boolean(
            preferences.language
        ),

        Boolean(
            preferences.timezone
        )

    ];


    const completed =
        checks.filter(Boolean).length;


    const percentage =
        Math.round(
            completed /
            checks.length *
            100
        );


    setText(
        "completionPercent",
        `${percentage}%`
    );


    const circle =
        document.getElementById(
            "completionCircle"
        );


    const circumference =
        2 * Math.PI * 50;


    circle.style.strokeDasharray =
        circumference;


    circle.style.strokeDashoffset =
        circumference -
        (
            percentage /
            100 *
            circumference
        );

}


/* ==========================================================
   TABS
========================================================== */

function setupTabs() {

    const tabs =
        document.querySelectorAll(
            ".tab"
        );


    const panels =
        document.querySelectorAll(
            ".tab-panel"
        );


    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            () => {

                const target =
                    tab.dataset.tab;


                tabs.forEach(
                    t =>
                        t.classList.remove(
                            "active"
                        )
                );


                panels.forEach(
                    panel =>
                        panel.classList.remove(
                            "active"
                        )
                );


                tab.classList.add(
                    "active"
                );


                document
                    .getElementById(
                        target
                    )
                    .classList.add(
                        "active"
                    );


                if (
                    target === "activity"
                ) {

                    loadActivity();

                }

            }
        );

    });

}


/* ==========================================================
   PASSWORD EYE
========================================================== */

function setupPasswordEyes() {

    document
        .querySelectorAll(
            ".show-password"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        document.getElementById(
                            button.dataset.target
                        );


                    if (
                        target.type ===
                        "password"
                    ) {

                        target.type =
                            "text";

                        button.innerHTML =
                            '<i class="fa-regular fa-eye-slash"></i>';

                    }
                    else {

                        target.type =
                            "password";

                        button.innerHTML =
                            '<i class="fa-regular fa-eye"></i>';

                    }

                }
            );

        });

}


/* ==========================================================
   PROFILE PHOTO BUTTON
========================================================== */

function setupPhotoUpload() {

    const button =
        document.getElementById(
            "photoButton"
        );

    const input =
        document.getElementById(
            "profileUpload"
        );


    button.addEventListener(
        "click",
        () => input.click()
    );


    input.addEventListener(
        "change",
        uploadProfileImage
    );

}


/* ==========================================================
   CLOCK
========================================================== */

function startClock() {

    function update() {

        const now =
            new Date();


        document.getElementById(
            "currentDate"
        ).textContent =
            now.toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                }
            );


        document.getElementById(
            "currentTime"
        ).textContent =
            now.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

    }


    update();

    setInterval(
        update,
        30000
    );

}


/* ==========================================================
   EVENTS
========================================================== */

function setupEvents() {

    document
        .getElementById(
            "profileForm"
        )
        .addEventListener(
            "submit",
            updateProfile
        );


    document
        .getElementById(
            "passwordForm"
        )
        .addEventListener(
            "submit",
            updatePassword
        );


    document
        .getElementById(
            "preferencesForm"
        )
        .addEventListener(
            "submit",
            updatePreferences
        );


    document
        .getElementById(
            "twoFactor"
        )
        .addEventListener(
            "change",
            updateTwoFactor
        );


    document
        .getElementById(
            "loginNotifications"
        )
        .addEventListener(
            "change",
            updateLoginNotifications
        );


    document
        .getElementById(
            "managePreferences"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .querySelector(
                        '[data-tab="preferences"]'
                    )
                    .click();

            }
        );

}


/* ==========================================================
   INITIALIZATION
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupTabs();

        setupPasswordEyes();

        setupPhotoUpload();

        setupEvents();

        startClock();

        await loadProfile();

    }
);