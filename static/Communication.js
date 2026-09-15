/* ============================================================
   VENDORIQ ADMIN COMMUNICATION
============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = window.location.origin;

let currentTargetType = "all";

let contacts = [];

let selectedContact = null;


/* ============================================================
   AUTHENTICATION
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("vendor_token") ||
        ""
    );
}


function authHeaders(includeJson = true) {

    const headers = {};

    const token = getToken();

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    if (includeJson) {
        headers["Content-Type"] =
            "application/json";
    }

    return headers;
}


/* ============================================================
   API HELPER
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,

            headers: {
                ...authHeaders(
                    options.body !== undefined
                ),
                ...(options.headers || {})
            }
        }
    );

    if (response.status === 401) {

        showToast(
            "Your session has expired. Please login again."
        );

        setTimeout(() => {
            window.location.href = "/login";
        }, 1200);

        throw new Error(
            "Unauthorized"
        );
    }

    if (!response.ok) {

        let detail =
            `HTTP ${response.status}`;

        try {

            const errorData =
                await response.json();

            detail =
                errorData.detail ||
                detail;

        } catch (_) {}

        throw new Error(detail);
    }

    return response.json();
}


/* ============================================================
   PAGE INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupTabs();

        setupSearch();

        setupComposer();

        await loadAdminProfile();

        await loadContacts();
    }
);


/* ============================================================
   ADMIN PROFILE
============================================================ */

async function loadAdminProfile() {

    try {

        const profile =
            await apiFetch(
                "/api/auth/me"
            );

        const name =
            profile.name ||
            "Administrator";

        const topName =
            document.getElementById(
                "topAdminName"
            );

        const sidebarName =
            document.getElementById(
                "sidebarAdminName"
            );

        if (topName) {
            topName.textContent = name;
        }

        if (sidebarName) {
            sidebarName.textContent = name;
        }

    } catch (error) {

        console.warn(
            "Admin profile could not be loaded:",
            error.message
        );
    }
}


/* ============================================================
   TABS
============================================================ */

function setupTabs() {

    const tabs =
        document.querySelectorAll(
            ".category-tab"
        );

    tabs.forEach(tab => {

        tab.addEventListener(
            "click",
            async () => {

                tabs.forEach(item => {
                    item.classList.remove(
                        "active"
                    );
                });

                tab.classList.add(
                    "active"
                );

                currentTargetType =
                    tab.dataset.type ||
                    "all";

                await loadContacts();
            }
        );
    });
}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "contactSearch"
        );

    if (!searchInput) {
        return;
    }

    let timer = null;

    searchInput.addEventListener(
        "input",
        () => {

            clearTimeout(timer);

            timer = setTimeout(
                () => {
                    loadContacts();
                },
                300
            );
        }
    );
}


/* ============================================================
   LOAD CONTACTS
============================================================ */

async function loadContacts() {

    const tbody =
        document.getElementById(
            "contactsBody"
        );

    if (!tbody) {
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="8">
                <div class="loading-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Loading contacts...
                </div>
            </td>
        </tr>
    `;

    try {

        const search =
            document.getElementById(
                "contactSearch"
            )?.value?.trim() || "";

        const params =
            new URLSearchParams();

        params.set(
            "target_type",
            currentTargetType
        );

        if (search) {
            params.set(
                "search",
                search
            );
        }

        const data =
            await apiFetch(
                `/api/admin/communication/contacts?${params.toString()}`
            );

        contacts =
            Array.isArray(data)
                ? data
                : [];

        updateSummary();

        renderContacts();

    } catch (error) {

        console.error(
            "Contact loading error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <strong>
                            Unable to load contacts
                        </strong>

                        <span>
                            ${escapeHtml(error.message)}
                        </span>
                    </div>
                </td>
            </tr>
        `;
    }
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSummary() {

    const total =
        contacts.length;

    const vendors =
        contacts.filter(
            item =>
                item.target_type === "vendor"
        ).length;

    const internal =
        total - vendors;

    const unread =
        contacts.reduce(
            (sum, item) =>
                sum + Number(
                    item.unread || 0
                ),
            0
        );

    setText(
        "totalContacts",
        total
    );

    setText(
        "vendorCount",
        vendors
    );

    setText(
        "internalCount",
        internal
    );

    setText(
        "unreadCount",
        unread
    );
}


/* ============================================================
   RENDER CONTACTS
============================================================ */

function renderContacts() {

    const tbody =
        document.getElementById(
            "contactsBody"
        );

    if (!tbody) {
        return;
    }

    if (!contacts.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="8">

                    <div class="empty-state">

                        <i class="fa-solid fa-comments"></i>

                        <strong>
                            No contacts found
                        </strong>

                        <span>
                            There are no contacts matching your search.
                        </span>

                    </div>

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        contacts.map(
            (contact, index) =>
                createContactRow(
                    contact,
                    index
                )
        ).join("");
}


/* ============================================================
   CONTACT ROW
============================================================ */

function createContactRow(
    contact,
    index
) {

    const type =
        contact.target_type ||
        "user";

    const typeLabel =
        getTypeLabel(type);

    const typeClass =
        `type-${type}`;

    const icon =
        getContactIcon(type);

    const lastMessage =
        contact.last_message ||
        "No messages yet";

    const lastTime =
        formatDateTime(
            contact.last_message_time
        );

    const unread =
        Number(
            contact.unread || 0
        );

    const status =
        contact.status ||
        "Offline";

    const active =
        status === "Active" ||
        contact.online === true;

    return `
        <tr>

            <td>

                <div class="contact-cell">

                    <div class="contact-avatar">
                        <i class="${icon}"></i>
                    </div>

                    <div>

                        <div class="contact-name">
                            ${escapeHtml(
                                contact.name ||
                                "Unknown"
                            )}
                        </div>

                        <div class="contact-email">
                            ${escapeHtml(
                                contact.email ||
                                ""
                            )}
                        </div>

                    </div>

                </div>

            </td>


            <td>

                <span
                    class="type-badge ${typeClass}"
                >
                    ${typeLabel}
                </span>

            </td>


            <td>
                ${escapeHtml(
                    contact.company ||
                    contact.department ||
                    contact.category ||
                    "-"
                )}
            </td>


            <td>

                <div class="last-message">
                    ${escapeHtml(
                        lastMessage
                    )}
                </div>

            </td>


            <td>
                ${escapeHtml(
                    lastTime
                )}
            </td>


            <td>

                <span
                    class="unread-badge ${
                        unread === 0
                            ? "zero"
                            : ""
                    }"
                >
                    ${unread}
                </span>

            </td>


            <td>

                <div class="status-cell">

                    <span
                        class="status-dot ${
                            active
                                ? "active"
                                : "offline"
                        }"
                    ></span>

                    <span>
                        ${
                            active
                                ? "Active"
                                : "Offline"
                        }
                    </span>

                </div>

            </td>


            <td>

                <button
                    class="message-btn"
                    onclick="openConversation(${index})"
                >
                    <i class="fa-regular fa-comment-dots"></i>
                    Message
                </button>

            </td>

        </tr>
    `;
}


/* ============================================================
   OPEN CONVERSATION
============================================================ */

async function openConversation(index) {

    selectedContact =
        contacts[index];

    if (!selectedContact) {
        return;
    }

    updateModalHeader();

    const modal =
        document.getElementById(
            "conversationModal"
        );

    modal.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";

    await loadConversation();
}


/* ============================================================
   MODAL HEADER
============================================================ */

function updateModalHeader() {

    if (!selectedContact) {
        return;
    }

    setText(
        "modalContactName",
        selectedContact.name ||
        "Contact"
    );

    setText(
        "modalContactRole",
        selectedContact.role ||
        getTypeLabel(
            selectedContact.target_type
        )
    );

    setText(
        "modalContactDepartment",
        selectedContact.department ||
        selectedContact.category ||
        "General"
    );

    setText(
        "modalContactEmail",
        selectedContact.email ||
        "No email"
    );

    setText(
        "modalContactId",
        `${getTypeLabel(
            selectedContact.target_type
        )} • ${selectedContact.target_id}`
    );

    const avatar =
        document.getElementById(
            "modalAvatar"
        );

    if (avatar) {

        avatar.innerHTML =
            `<i class="${getContactIcon(
                selectedContact.target_type
            )}"></i>`;
    }
}


/* ============================================================
   LOAD CONVERSATION
============================================================ */

async function loadConversation() {

    if (!selectedContact) {
        return;
    }

    const body =
        document.getElementById(
            "conversationBody"
        );

    body.innerHTML = `
        <div class="conversation-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Loading conversation...</span>
        </div>
    `;

    try {

        const targetType =
            encodeURIComponent(
                selectedContact.target_type
            );

        const targetId =
            encodeURIComponent(
                selectedContact.target_id
            );

        const data =
            await apiFetch(
                `/api/admin/communication/contacts/${targetType}/${targetId}`
            );

        renderConversation(
            data
        );

        // Refresh background unread count
        await loadContactsSilently();

    } catch (error) {

        console.error(
            "Conversation loading error:",
            error
        );

        body.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <strong>
                    Unable to load conversation
                </strong>

                <span>
                    ${escapeHtml(
                        error.message
                    )}
                </span>

            </div>
        `;
    }
}


/* ============================================================
   RENDER CONVERSATION
============================================================ */

function renderConversation(
    data
) {

    const body =
        document.getElementById(
            "conversationBody"
        );

    const messages =
        Array.isArray(data.messages)
            ? data.messages
            : [];

    if (!messages.length) {

        body.innerHTML = `
            <div class="no-messages">

                <i class="fa-regular fa-comments"></i>

                <strong>
                    No messages yet
                </strong>

                <span>
                    Start the conversation by sending a message.
                </span>

            </div>
        `;

        return;
    }

    body.innerHTML =
        messages.map(
            message =>
                createMessageBubble(
                    message
                )
        ).join("");

    scrollConversationToBottom();
}


/* ============================================================
   MESSAGE BUBBLE
============================================================ */

function createMessageBubble(
    message
) {

    const currentAdminId =
        getCurrentUserId();

    const senderId =
        message.sender_id;

    const isAdmin =
        message.sender_type === "admin" ||
        (
            senderId &&
            currentAdminId &&
            Number(senderId) ===
            Number(currentAdminId)
        );

    const rowClass =
        isAdmin
            ? "admin"
            : "user";

    return `
        <div class="message-row ${rowClass}">

            <div class="message-bubble">

                <div class="message-sender">
                    ${escapeHtml(
                        message.sender_name ||
                        (
                            isAdmin
                                ? "Admin"
                                : "Contact"
                        )
                    )}
                </div>

                <div>
                    ${formatMessage(
                        message.message
                    )}
                </div>

                <div class="message-time">
                    ${formatTime(
                        message.created_at
                    )}
                </div>

            </div>

        </div>
    `;
}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

    if (!selectedContact) {
        return;
    }

    const input =
        document.getElementById(
            "messageInput"
        );

    const button =
        document.getElementById(
            "sendMessageButton"
        );

    const message =
        input.value.trim();

    if (!message) {

        showToast(
            "Please enter a message."
        );

        input.focus();

        return;
    }

    button.disabled = true;

    try {

        const targetType =
            encodeURIComponent(
                selectedContact.target_type
            );

        const targetId =
            encodeURIComponent(
                selectedContact.target_id
            );

        await apiFetch(
            `/api/admin/communication/contacts/${targetType}/${targetId}/messages`,
            {
                method: "POST",

                body: JSON.stringify({
                    message: message
                })
            }
        );

        input.value = "";

        autoResizeTextarea(
            input
        );

        await loadConversation();

        showToast(
            "Message sent successfully."
        );

    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        showToast(
            error.message ||
            "Unable to send message."
        );

    } finally {

        button.disabled = false;

        input.focus();
    }
}


/* ============================================================
   COMPOSER
============================================================ */

function setupComposer() {

    const input =
        document.getElementById(
            "messageInput"
        );

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        () => {
            autoResizeTextarea(
                input
            );
        }
    );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


function autoResizeTextarea(
    textarea
) {

    textarea.style.height =
        "auto";

    textarea.style.height =
        `${Math.min(
            textarea.scrollHeight,
            100
        )}px`;
}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeConversation() {

    const modal =
        document.getElementById(
            "conversationModal"
        );

    modal.classList.remove(
        "show"
    );

    document.body.style.overflow =
        "";

    selectedContact = null;

    const input =
        document.getElementById(
            "messageInput"
        );

    if (input) {
        input.value = "";
        input.style.height = "";
    }
}


/* ============================================================
   CLOSE MODAL ON BACKGROUND CLICK
============================================================ */

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "conversationModal"
            );

        if (
            event.target === modal
        ) {
            closeConversation();
        }
    }
);


/* ============================================================
   ESCAPE KEY
============================================================ */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {
            closeConversation();
        }
    }
);


/* ============================================================
   SILENT CONTACT REFRESH
============================================================ */

async function loadContactsSilently() {

    try {

        const search =
            document.getElementById(
                "contactSearch"
            )?.value?.trim() || "";

        const params =
            new URLSearchParams();

        params.set(
            "target_type",
            currentTargetType
        );

        if (search) {
            params.set(
                "search",
                search
            );
        }

        const data =
            await apiFetch(
                `/api/admin/communication/contacts?${params.toString()}`
            );

        contacts =
            Array.isArray(data)
                ? data
                : [];

        updateSummary();

        renderContacts();

    } catch (error) {

        console.warn(
            "Silent contact refresh failed:",
            error.message
        );
    }
}


/* ============================================================
   LOGOUT
============================================================ */

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "jwt_token"
    );

    localStorage.removeItem(
        "vendor_token"
    );

    localStorage.removeItem(
        "vendor_id"
    );

    window.location.href =
        "/login";
}


/* ============================================================
   HELPERS
============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value;
    }
}


function getCurrentUserId() {

    return (
        localStorage.getItem(
            "user_id"
        ) ||
        localStorage.getItem(
            "admin_id"
        ) ||
        null
    );
}


function getTypeLabel(
    type
) {

    const labels = {

        vendor: "Vendor",

        procurement:
            "Procurement",

        supply_chain:
            "Supply Chain",

        finance:
            "Finance",

        audit:
            "Audit"

    };

    return (
        labels[type] ||
        "User"
    );
}


function getContactIcon(
    type
) {

    const icons = {

        vendor:
            "fa-solid fa-building",

        procurement:
            "fa-solid fa-cart-shopping",

        supply_chain:
            "fa-solid fa-truck-fast",

        finance:
            "fa-solid fa-coins",

        audit:
            "fa-solid fa-user-check"

    };

    return (
        icons[type] ||
        "fa-solid fa-user"
    );
}


function formatDateTime(
    value
) {

    if (!value) {
        return "No activity";
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
        [],
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatTime(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleString(
        [],
        {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatMessage(
    text
) {

    return escapeHtml(
        text || ""
    ).replace(
        /\n/g,
        "<br>"
    );
}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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


function scrollConversationToBottom() {

    const body =
        document.getElementById(
            "conversationBody"
        );

    if (!body) {
        return;
    }

    requestAnimationFrame(
        () => {
            body.scrollTop =
                body.scrollHeight;
        }
    );
}


/* ============================================================
   TOAST
============================================================ */

let toastTimer = null;

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2800
        );
}