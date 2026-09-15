// ============================================================
// FINANCE COMMUNICATION
// ============================================================

const state = {
    contacts: [],
    activeFilter: "all",
    currentTarget: null,
    refreshTimer: null
};


// ============================================================
// DOM
// ============================================================

const tableBody =
    document.getElementById("contactTableBody");

const emptyState =
    document.getElementById("emptyState");

const searchInput =
    document.getElementById("searchInput");

const resultCount =
    document.getElementById("resultCount");

const vendorCount =
    document.getElementById("vendorCount");

const internalCount =
    document.getElementById("internalCount");

const unreadCount =
    document.getElementById("unreadCount");

const modal =
    document.getElementById("messageModal");

const closeModalBtn =
    document.getElementById("closeModal");

const conversationArea =
    document.getElementById("conversationArea");

const recipientName =
    document.getElementById("recipientName");

const recipientRole =
    document.getElementById("recipientRole");

const recipientCompany =
    document.getElementById("recipientCompany");

const recipientAvatar =
    document.getElementById("recipientAvatar");

const messageInput =
    document.getElementById("messageInput");

const sendMessageBtn =
    document.getElementById("sendMessageBtn");

const refreshBtn =
    document.getElementById("refreshBtn");


// ============================================================
// TOKEN
// ============================================================

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


// ============================================================
// API FETCH
// ============================================================

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    if (
        options.body &&
        typeof options.body !== "string"
    ) {

        headers["Content-Type"] =
            "application/json";

        options.body =
            JSON.stringify(options.body);
    }

    const response =
        await fetch(url, {
            ...options,
            headers
        });

    if (!response.ok) {

        let detail =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            detail =
                data.detail ||
                detail;

        } catch (error) {}

        throw new Error(detail);
    }

    return response.json();
}


// ============================================================
// LOAD CONTACTS
// ============================================================

async function loadContacts() {

    try {

        const params =
            new URLSearchParams();

        params.set(
            "target_type",
            state.activeFilter
        );

        const search =
            searchInput.value.trim();

        if (search) {

            params.set(
                "search",
                search
            );
        }

        const data =
            await apiFetch(
                `/api/finance/communication/contacts?${params.toString()}`
            );

        state.contacts =
            data.contacts || [];

        renderContacts();

        updateSummary();

    } catch (error) {

        console.error(
            "Communication contacts error:",
            error
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <h3>Unable to load communication contacts</h3>
                        <p>${escapeHtml(error.message)}</p>
                    </div>
                </td>
            </tr>
        `;
    }
}


// ============================================================
// RENDER CONTACTS
// ============================================================

function renderContacts() {

    tableBody.innerHTML = "";

    if (!state.contacts.length) {

        emptyState.hidden = false;

        resultCount.textContent =
            "0 contacts";

        return;
    }

    emptyState.hidden = true;

    resultCount.textContent =
        `${state.contacts.length} contact${
            state.contacts.length === 1
                ? ""
                : "s"
        }`;

    state.contacts.forEach(
        contact => {

            const row =
                document.createElement("tr");

            const targetInfo =
                getTargetInfo(
                    contact.target_type
                );

            const lastMessage =
                contact.last_message
                    ? escapeHtml(
                        contact.last_message
                    )
                    : `<span class="no-unread">
                        No conversation yet
                       </span>`;

            const unread =
                Number(contact.unread || 0);

            row.innerHTML = `

                <td>

                    <span class="
                        target-badge
                        ${targetInfo.className}
                    ">

                        <i class="${targetInfo.icon}"></i>

                        ${targetInfo.label}

                    </span>

                </td>


                <td>

                    <div class="contact-name">
                        ${escapeHtml(
                            contact.name || "-"
                        )}
                    </div>

                    <div class="contact-id">
                        ${escapeHtml(
                            String(
                                contact.target_id || ""
                            )
                        )}
                    </div>

                </td>


                <td>

                    ${
                        escapeHtml(
                            contact.company ||
                            contact.department ||
                            "-"
                        )
                    }

                </td>


                <td>
                    ${escapeHtml(
                        contact.email || "-"
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        contact.phone || "-"
                    )}
                </td>


                <td>

                    <div class="last-message">
                        ${lastMessage}
                    </div>

                </td>


                <td>

                    ${
                        unread > 0
                        ? `
                            <span class="unread-badge">
                                ${unread}
                            </span>
                          `
                        : `
                            <span class="no-unread">
                                Read
                            </span>
                          `
                    }

                </td>


                <td>

                    <button
                        class="message-btn"
                        data-target-type="${escapeHtml(
                            contact.target_type
                        )}"
                        data-target-id="${escapeHtml(
                            String(
                                contact.target_id
                            )
                        )}"
                    >

                        <i class="fa-solid fa-message"></i>

                        Message

                    </button>

                </td>
            `;

            tableBody.appendChild(row);
        }
    );
}


// ============================================================
// TARGET TYPE INFORMATION
// ============================================================

function getTargetInfo(type) {

    const map = {

        vendor: {
            label: "Vendor",
            icon: "fa-solid fa-truck-field",
            className: "target-vendor"
        },

        admin: {
            label: "Admin",
            icon: "fa-solid fa-user-shield",
            className: "target-admin"
        },

        supply_chain: {
            label: "Supply Chain",
            icon: "fa-solid fa-boxes-stacked",
            className: "target-supply"
        },

        procurement: {
            label: "Procurement",
            icon: "fa-solid fa-cart-shopping",
            className: "target-procurement"
        },

        audit: {
            label: "Audit",
            icon: "fa-solid fa-user-check",
            className: "target-audit"
        }
    };

    return (
        map[type] || {
            label: type,
            icon: "fa-solid fa-user",
            className: ""
        }
    );
}


// ============================================================
// SUMMARY
// ============================================================

function updateSummary() {

    const allContacts =
        state.contacts;

    const vendors =
        allContacts.filter(
            contact =>
                contact.target_type === "vendor"
        ).length;

    const internal =
        allContacts.filter(
            contact =>
                contact.target_type !== "vendor"
        ).length;

    const unread =
        allContacts.reduce(
            (total, contact) =>
                total +
                Number(contact.unread || 0),
            0
        );

    vendorCount.textContent =
        vendors;

    internalCount.textContent =
        internal;

    unreadCount.textContent =
        unread;
}


// ============================================================
// OPEN MODAL
// ============================================================

async function openConversation(
    targetType,
    targetId
) {

    const target =
        state.contacts.find(
            contact =>
                contact.target_type === targetType &&
                String(contact.target_id) ===
                String(targetId)
        );

    if (!target) {

        console.error(
            "Target not found:",
            targetType,
            targetId
        );

        return;
    }

    state.currentTarget = target;

    recipientName.textContent =
        target.name || "Conversation";

    recipientRole.textContent =
        target.role ||
        getTargetInfo(targetType).label;

    recipientCompany.textContent =
        target.company ||
        target.department ||
        "";

    recipientAvatar.innerHTML =
        getTargetInfo(targetType).icon
            ? `<i class="${getTargetInfo(targetType).icon}"></i>`
            : `<i class="fa-solid fa-user"></i>`;

    modal.hidden = false;

    document.body.style.overflow =
        "hidden";

    conversationArea.innerHTML = `
        <div class="conversation-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Loading conversation...</span>
        </div>
    `;

    messageInput.value = "";

    await loadConversation();

    messageInput.focus();

    startConversationPolling();
}


// ============================================================
// LOAD CONVERSATION
// ============================================================

async function loadConversation() {

    if (!state.currentTarget) {
        return;
    }

    const {
        target_type,
        target_id
    } = state.currentTarget;

    try {

        const data =
            await apiFetch(
                `/api/finance/communication/conversation/${encodeURIComponent(
                    target_type
                )}/${encodeURIComponent(
                    target_id
                )}`
            );

        renderConversation(
            data.messages || []
        );

    } catch (error) {

        console.error(
            "Conversation error:",
            error
        );

        conversationArea.innerHTML = `
            <div class="conversation-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Unable to load conversation
                </h3>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

            </div>
        `;
    }
}


// ============================================================
// RENDER CONVERSATION
// ============================================================

function renderConversation(messages) {

    if (!messages.length) {

        conversationArea.innerHTML = `
            <div class="conversation-empty">

                <i class="fa-regular fa-comments"></i>

                <h3>
                    No messages yet
                </h3>

                <p>
                    Start the conversation by sending a message.
                </p>

            </div>
        `;

        return;
    }

    conversationArea.innerHTML = "";

    messages.forEach(
        message => {

            const row =
                document.createElement("div");

            row.className =
                `message-row ${
                    message.is_mine
                        ? "mine"
                        : "theirs"
                }`;

            const bubble =
                document.createElement("div");

            bubble.className =
                "message-bubble";

            const time =
                formatDateTime(
                    message.created_at
                );

            bubble.innerHTML = `
                <div>
                    ${escapeHtml(
                        message.message || ""
                    )}
                </div>

                <span class="message-time">
                    ${time}
                </span>
            `;

            row.appendChild(bubble);

            conversationArea.appendChild(row);
        }
    );

    conversationArea.scrollTop =
        conversationArea.scrollHeight;
}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {

    if (!state.currentTarget) {
        return;
    }

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    const {
        target_type,
        target_id
    } = state.currentTarget;

    sendMessageBtn.disabled = true;

    try {

        await apiFetch(
            `/api/finance/communication/conversation/${encodeURIComponent(
                target_type
            )}/${encodeURIComponent(
                target_id
            )}`,
            {
                method: "POST",

                body: {
                    message: text
                }
            }
        );

        messageInput.value = "";

        await loadConversation();

        await loadContacts();

    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        alert(
            `Unable to send message: ${error.message}`
        );

    } finally {

        sendMessageBtn.disabled = false;

        messageInput.focus();
    }
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeConversation() {

    modal.hidden = true;

    document.body.style.overflow =
        "";

    state.currentTarget = null;

    stopConversationPolling();
}


// ============================================================
// POLLING
// ============================================================

function startConversationPolling() {

    stopConversationPolling();

    state.refreshTimer =
        setInterval(
            async () => {

                if (
                    !modal.hidden &&
                    state.currentTarget
                ) {

                    await loadConversation();
                }

            },
            5000
        );
}


function stopConversationPolling() {

    if (state.refreshTimer) {

        clearInterval(
            state.refreshTimer
        );

        state.refreshTimer = null;
    }
}


// ============================================================
// FILTER BUTTONS
// ============================================================

document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".filter-btn"
                    )
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
                    );

                button.classList.add(
                    "active"
                );

                state.activeFilter =
                    button.dataset.filter;

                loadContacts();
            }
        );
    });


// ============================================================
// MESSAGE BUTTON EVENT DELEGATION
// ============================================================

tableBody.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".message-btn"
            );

        if (!button) {
            return;
        }

        const targetType =
            button.dataset.targetType;

        const targetId =
            button.dataset.targetId;

        openConversation(
            targetType,
            targetId
        );
    }
);


// ============================================================
// SEARCH
// ============================================================

let searchTimeout;

searchInput.addEventListener(
    "input",
    () => {

        clearTimeout(
            searchTimeout
        );

        searchTimeout =
            setTimeout(
                () => {

                    loadContacts();

                },
                350
            );
    }
);


// ============================================================
// REFRESH
// ============================================================

refreshBtn.addEventListener(
    "click",
    async () => {

        refreshBtn.disabled = true;

        try {

            await loadContacts();

        } finally {

            refreshBtn.disabled = false;
        }
    }
);


// ============================================================
// SEND
// ============================================================

sendMessageBtn.addEventListener(
    "click",
    sendMessage
);


// ============================================================
// ENTER TO SEND
// ============================================================

messageInput.addEventListener(
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


// ============================================================
// CLOSE
// ============================================================

closeModalBtn.addEventListener(
    "click",
    closeConversation
);


modal.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {

            closeConversation();
        }
    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !modal.hidden
        ) {

            closeConversation();
        }
    }
);


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDateTime(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
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


// ============================================================
// INITIAL LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadContacts();
    }
);