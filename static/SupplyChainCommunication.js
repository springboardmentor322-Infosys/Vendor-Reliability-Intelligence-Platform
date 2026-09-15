/* ============================================================
   SUPPLY CHAIN COMMUNICATION
============================================================ */

let contacts = {
    vendor: [],
    admin: [],
    procurement: [],
    finance: [],
    audit: []
};

let currentFilter = "all";

let currentConversation = {
    type: null,
    id: null,
    name: null
};

let conversationPolling = null;


/* ============================================================
   TOKEN
============================================================ */

function getToken() {

    const token =
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("vendor_token") ||
        sessionStorage.getItem("vendor_token");

    console.log(
        "Communication JWT:",
        token ? "TOKEN FOUND" : "NO TOKEN FOUND"
    );

    return token;
}


/* ============================================================
   API
============================================================ */

async function apiFetch(url, options = {}) {

    const token = getToken();

    if (!token) {
        console.error(
            "AUTHENTICATION ERROR: No JWT token found."
        );

        throw new Error(
            "You are not authenticated. Please login again."
        );
    }

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    headers["Authorization"] = `Bearer ${token}`;

    console.log(
        "API REQUEST:",
        url,
        "Authorization:",
        "Bearer [JWT]"
    );

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {

        let detail = `HTTP ${response.status}`;

        try {
            const data = await response.json();
            detail = data.detail || detail;
        } catch (error) {
            console.error(
                "Unable to parse API error:",
                error
            );
        }

        console.error(
            "API ERROR:",
            response.status,
            detail
        );

        throw new Error(detail);
    }

    return response.json();
}


/* ============================================================
   LOAD CONTACTS
============================================================ */

async function loadContacts() {

    try {

        const data = await apiFetch(
            "/api/supply-chain/communication/contacts"
        );

        contacts = {
            vendor: data.vendors || [],
            admin: data.admin || [],
            procurement: data.procurement || [],
            finance: data.finance || [],
            audit: data.audit || []
        };

        renderAllContacts();

        updateSummary();

    } catch (error) {

        console.error("Communication contacts error:", error);

        showLoadError();
    }
}


/* ============================================================
   RENDER ALL
============================================================ */

function renderAllContacts() {

    renderVendors();
    renderUsers("admin");
    renderUsers("procurement");
    renderUsers("finance");
    renderUsers("audit");

    applyCurrentFilter();
}


/* ============================================================
   VENDORS
============================================================ */

function renderVendors() {

    const tbody = document.getElementById("vendorsTableBody");

    if (!contacts.vendor.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    No vendors available
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = contacts.vendor.map(vendor => {

        return `
            <tr
                data-contact-type="vendor"
                data-search="${escapeHtml(
                    `${vendor.name || ""} ${vendor.vendor_id || ""} ${vendor.email || ""} ${vendor.category || ""}`
                )}"
            >

                <td>
                    <div class="contact-name">
                        ${escapeHtml(vendor.name || "Unknown Vendor")}
                    </div>

                    <div class="contact-sub">
                        ${escapeHtml(vendor.business_type || "Vendor")}
                    </div>
                </td>

                <td>
                    ${escapeHtml(vendor.vendor_id || "-")}
                </td>

                <td>
                    ${escapeHtml(vendor.category || "-")}
                </td>

                <td>
                    ${escapeHtml(vendor.contact_person || "-")}
                </td>

                <td>
                    ${escapeHtml(vendor.email || "-")}
                </td>

                <td>
                    <span class="status-badge">
                        ${escapeHtml(vendor.status || "Active")}
                    </span>
                </td>

                <td>

                    <button
                        class="message-btn"
                        onclick="openConversation('vendor', '${escapeJs(vendor.vendor_id)}', '${escapeJs(vendor.name || "Vendor")}')"
                    >
                        <i class="fa-regular fa-comment"></i>
                        Message
                    </button>

                </td>

            </tr>
        `;

    }).join("");
}


/* ============================================================
   INTERNAL USERS
============================================================ */

function renderUsers(type) {

    const map = {
        admin: "adminTableBody",
        procurement: "procurementTableBody",
        finance: "financeTableBody",
        audit: "auditTableBody"
    };

    const tbody = document.getElementById(map[type]);

    if (!tbody) return;

    const list = contacts[type] || [];

    if (!list.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    No ${capitalize(type)} users available
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = list.map(user => {

        return `
            <tr
                data-contact-type="${type}"
                data-search="${escapeHtml(
                    `${user.name || ""} ${user.email || ""} ${user.role || ""} ${user.mobile || ""}`
                )}"
            >

                <td>
                    <div class="contact-name">
                        ${escapeHtml(user.name || "Unknown")}
                    </div>
                </td>

                <td>
                    #${escapeHtml(String(user.id))}
                </td>

                <td>
                    ${escapeHtml(user.role || "-")}
                </td>

                <td>
                    ${escapeHtml(user.email || "-")}
                </td>

                <td>
                    ${escapeHtml(user.mobile || "-")}
                </td>

                <td>

                    <span class="status-badge">
                        ${user.active ? "Active" : "Inactive"}
                    </span>

                </td>

                <td>

                    <button
                        class="message-btn"
                        onclick="openConversation('${type}', '${escapeJs(String(user.id))}', '${escapeJs(user.name || "User")}')"
                    >
                        <i class="fa-regular fa-comment"></i>
                        Message
                    </button>

                </td>

            </tr>
        `;

    }).join("");
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSummary() {

    document.getElementById("vendorCount").textContent =
        contacts.vendor.length;

    document.getElementById("adminCount").textContent =
        contacts.admin.length;

    document.getElementById("procurementCount").textContent =
        contacts.procurement.length;

    document.getElementById("financeCount").textContent =
        contacts.finance.length;

    document.getElementById("auditCount").textContent =
        contacts.audit.length;

    document.getElementById("vendorSectionCount").textContent =
        contacts.vendor.length;

    document.getElementById("adminSectionCount").textContent =
        contacts.admin.length;

    document.getElementById("procurementSectionCount").textContent =
        contacts.procurement.length;

    document.getElementById("financeSectionCount").textContent =
        contacts.finance.length;

    document.getElementById("auditSectionCount").textContent =
        contacts.audit.length;
}


/* ============================================================
   FILTER
============================================================ */

document.querySelectorAll(".filter-btn").forEach(button => {

    button.addEventListener("click", function () {

        document
            .querySelectorAll(".filter-btn")
            .forEach(btn => btn.classList.remove("active"));

        this.classList.add("active");

        currentFilter = this.dataset.filter;

        applyCurrentFilter();
    });

});


function applyCurrentFilter() {

    document
        .querySelectorAll(".contact-group")
        .forEach(section => {

            const type = section.dataset.type;

            section.style.display =
                currentFilter === "all" ||
                currentFilter === type
                    ? ""
                    : "none";

        });

    applySearch();
}


/* ============================================================
   SEARCH
============================================================ */

document
    .getElementById("contactSearch")
    .addEventListener("input", applySearch);


function applySearch() {

    const searchValue =
        document
            .getElementById("contactSearch")
            .value
            .trim()
            .toLowerCase();

    document
        .querySelectorAll("tbody tr[data-contact-type]")
        .forEach(row => {

            const type = row.dataset.contactType;

            const matchesFilter =
                currentFilter === "all" ||
                currentFilter === type;

            const searchText =
                (row.dataset.search || "").toLowerCase();

            const matchesSearch =
                !searchValue ||
                searchText.includes(searchValue);

            row.style.display =
                matchesFilter && matchesSearch
                    ? ""
                    : "none";
        });
}


/* ============================================================
   OPEN CONVERSATION
============================================================ */

async function openConversation(type, id, name) {

    currentConversation = {
        type: type,
        id: id,
        name: name
    };

    document.getElementById("conversationName").textContent =
        name;

    document.getElementById("conversationRole").textContent =
        getDisplayType(type);

    document.getElementById("conversationInfo").textContent =
        `${getDisplayType(type)} • Conversation`;

    document.getElementById("messageInput").value = "";

    document
        .getElementById("conversationModal")
        .classList.add("show");

    document
        .getElementById("conversationModal")
        .setAttribute("aria-hidden", "false");

    document
        .getElementById("messagesContainer")
        .innerHTML = `
            <div class="empty-messages">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading conversation...</p>
            </div>
        `;

    await loadConversation();

    startConversationPolling();

    setTimeout(() => {
        document.getElementById("messageInput").focus();
    }, 100);
}


/* ============================================================
   LOAD CONVERSATION
============================================================ */

async function loadConversation() {

    if (!currentConversation.type) return;

    try {

        const url =
            `/api/supply-chain/communication/conversation/` +
            `${encodeURIComponent(currentConversation.type)}/` +
            `${encodeURIComponent(currentConversation.id)}`;

        const data = await apiFetch(url);

        renderConversation(data.messages || []);

    } catch (error) {

        console.error("Conversation loading error:", error);

        document.getElementById("messagesContainer").innerHTML = `
            <div class="empty-messages">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}


/* ============================================================
   RENDER MESSAGES
============================================================ */

function renderConversation(messages) {

    const container =
        document.getElementById("messagesContainer");

    if (!messages.length) {

        container.innerHTML = `
            <div class="empty-messages">

                <i class="fa-regular fa-comments"></i>

                <p>
                    No messages yet. Start the conversation.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML = messages.map(message => {

        const mine = Boolean(message.is_mine);

        return `
            <div class="message-row ${mine ? "mine" : "theirs"}">

                <div class="message-bubble">

                    <div class="message-sender">
                        ${escapeHtml(
                            mine
                                ? "You"
                                : message.sender_name || currentConversation.name
                        )}
                    </div>

                    <div>
                        ${formatMessage(message.message)}
                    </div>

                    <span class="message-time">
                        ${formatDateTime(message.created_at)}
                    </span>

                </div>

            </div>
        `;

    }).join("");

    container.scrollTop = container.scrollHeight;
}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

    const input =
        document.getElementById("messageInput");

    const button =
        document.getElementById("sendMessageBtn");

    const message =
        input.value.trim();

    if (!message) return;

    if (!currentConversation.type ||
        !currentConversation.id) {

        return;
    }

    button.disabled = true;

    try {

        await apiFetch(
            `/api/supply-chain/communication/conversation/` +
            `${encodeURIComponent(currentConversation.type)}/` +
            `${encodeURIComponent(currentConversation.id)}`,
            {
                method: "POST",
                body: JSON.stringify({
                    message: message
                })
            }
        );

        input.value = "";

        await loadConversation();

    } catch (error) {

        console.error("Send message error:", error);

        alert(error.message);

    } finally {

        button.disabled = false;

        input.focus();
    }
}


/* ============================================================
   POLLING
============================================================ */

function startConversationPolling() {

    stopConversationPolling();

    conversationPolling = setInterval(() => {

        if (
            document
                .getElementById("conversationModal")
                .classList
                .contains("show")
        ) {

            loadConversation();
        }

    }, 5000);
}


function stopConversationPolling() {

    if (conversationPolling) {

        clearInterval(conversationPolling);

        conversationPolling = null;
    }
}


/* ============================================================
   CLOSE
============================================================ */

function closeConversation() {

    document
        .getElementById("conversationModal")
        .classList.remove("show");

    document
        .getElementById("conversationModal")
        .setAttribute("aria-hidden", "true");

    stopConversationPolling();

    currentConversation = {
        type: null,
        id: null,
        name: null
    };
}


/* ============================================================
   MODAL EVENTS
============================================================ */

document
    .getElementById("conversationModal")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeConversation();
        }

    });


document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {

        const modal =
            document.getElementById("conversationModal");

        if (modal.classList.contains("show")) {
            closeConversation();
        }
    }

});


/* ============================================================
   ENTER TO SEND
============================================================ */

document
    .getElementById("messageInput")
    .addEventListener("keydown", function(event) {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            sendMessage();
        }

    });


/* ============================================================
   HELPERS
============================================================ */

function getDisplayType(type) {

    const names = {
        vendor: "Vendor",
        admin: "Administrator",
        procurement: "Procurement Manager",
        finance: "Finance Officer",
        audit: "Auditor"
    };

    return names[type] || "Contact";
}


function capitalize(value) {

    return value.charAt(0).toUpperCase() +
           value.slice(1);
}


function formatDateTime(value) {

    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(
        [],
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function formatMessage(value) {

    if (!value) return "";

    return escapeHtml(value)
        .replace(/\n/g, "<br>");
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeJs(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n");
}


/* ============================================================
   LOAD ERROR
============================================================ */

function showLoadError() {

    const bodies = [
        "vendorsTableBody",
        "adminTableBody",
        "procurementTableBody",
        "financeTableBody",
        "auditTableBody"
    ];

    bodies.forEach(id => {

        const tbody = document.getElementById(id);

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Unable to load contacts.
                    </td>
                </tr>
            `;
        }

    });
}


/* ============================================================
   PROFILE
============================================================ */

function openSupplyChainProfile() {

    if (typeof window.openProfile === "function") {

        window.openProfile();

    } else {

        window.location.href = "/supplychainsettings";
    }
}


/* ============================================================
   INITIAL LOAD
============================================================ */

document.addEventListener("DOMContentLoaded", function() {

    loadContacts();

});