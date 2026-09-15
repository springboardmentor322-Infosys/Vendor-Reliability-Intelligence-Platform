/* ============================================================
   PROCUREMENT COMMUNICATION CENTER
============================================================ */

const API_BASE = "";

let contacts = [];
let activeFilter = "all";
let currentTarget = null;
let currentUser = null;


/* ============================================================
   TOKEN
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (!response.ok) {

        let errorMessage =
            `HTTP ${response.status}`;

        try {

            const errorData =
                await response.json();

            errorMessage =
                errorData.detail ||
                errorData.message ||
                errorMessage;

        } catch (_) {}

        throw new Error(
            errorMessage
        );
    }

    return response.json();
}


/* ============================================================
   LOAD CURRENT USER
============================================================ */

async function loadCurrentUser() {

    try {

        currentUser =
            await apiFetch(
                "/api/auth/me"
            );

    } catch (error) {

        console.error(
            "Current user error:",
            error
        );
    }
}


/* ============================================================
   LOAD CONTACTS
============================================================ */

async function loadContacts() {

    const tbody =
        document.getElementById(
            "contactsTableBody"
        );

    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="loading-row">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading contacts...
            </td>
        </tr>
    `;

    try {

        const search =
            document.getElementById(
                "searchInput"
            ).value.trim();

        const params =
            new URLSearchParams();

        params.set(
            "target_type",
            activeFilter
        );

        if (search) {
            params.set(
                "search",
                search
            );
        }

        contacts =
            await apiFetch(
                `/api/procurement/communication/contacts?${params.toString()}`
            );

        renderSummary();

        renderContacts();

    } catch (error) {

        console.error(
            "Contacts error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="loading-row"
                >
                    <i class="fa-solid fa-circle-exclamation"></i>
                    ${escapeHtml(error.message)}
                </td>
            </tr>
        `;
    }
}


/* ============================================================
   SUMMARY
============================================================ */

async function renderSummary() {

    let allContacts = contacts;

    if (activeFilter !== "all") {

        try {

            allContacts =
                await apiFetch(
                    "/api/procurement/communication/contacts?target_type=all"
                );

        } catch (error) {

            console.error(
                "Summary error:",
                error
            );
        }
    }

    const count = type =>
        allContacts.filter(
            item =>
                item.target_type === type
        ).length;

    document.getElementById(
        "vendorCount"
    ).textContent = count("vendor");

    document.getElementById(
        "adminCount"
    ).textContent = count("admin");

    document.getElementById(
        "supplyCount"
    ).textContent = count("supply_chain");

    document.getElementById(
        "financeCount"
    ).textContent = count("finance");

    document.getElementById(
        "auditCount"
    ).textContent = count("audit");
}


/* ============================================================
   RENDER CONTACTS
============================================================ */

function renderContacts() {

    const tbody =
        document.getElementById(
            "contactsTableBody"
        );

    const countElement =
        document.getElementById(
            "contactCount"
        );

    countElement.textContent =
        `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`;

    if (!contacts.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="loading-row"
                >
                    <i class="fa-solid fa-inbox"></i>
                    No communication contacts found.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML =
        contacts.map(
            contact =>
                createContactRow(contact)
        ).join("");

    document
        .querySelectorAll(".message-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    openConversation(
                        contacts[index]
                    );
                }
            );

        });
}


/* ============================================================
   CONTACT ROW
============================================================ */

function createContactRow(
    contact
) {

    const typeClass =
        getTypeClass(
            contact.target_type
        );

    const typeLabel =
        getTypeLabel(
            contact.target_type
        );

    const typeIcon =
        getTypeIcon(
            contact.target_type
        );

    const lastMessage =
        contact.last_message ||
        "No conversation yet";

    const lastTime =
        contact.last_message_time
            ? formatDateTime(
                contact.last_message_time
            )
            : "-";

    const unread =
        contact.unread > 0
            ? `
                <span class="unread-badge">
                    ${contact.unread}
                </span>
              `
            : "";

    return `
        <tr>

            <td>
                <span class="type-badge ${typeClass}">
                    <i class="${typeIcon}"></i>
                    ${escapeHtml(typeLabel)}
                </span>
            </td>


            <td>

                <div class="person-name">
                    ${escapeHtml(
                        contact.name || "-"
                    )}
                </div>

                <div class="person-secondary">
                    ${escapeHtml(
                        contact.company || ""
                    )}
                </div>

            </td>


            <td>

                <div class="person-name">
                    ${escapeHtml(
                        String(
                            contact.display_id || "-"
                        )
                    )}
                </div>

                <div class="person-secondary">
                    ${escapeHtml(
                        contact.role || ""
                    )}
                </div>

            </td>


            <td>
                ${escapeHtml(
                    contact.department || "-"
                )}
            </td>


            <td>

                <div>
                    ${escapeHtml(
                        contact.email || "-"
                    )}
                </div>

                ${
                    contact.phone
                        ? `
                            <div class="person-secondary">
                                ${escapeHtml(
                                    contact.phone
                                )}
                            </div>
                          `
                        : ""
                }

            </td>


            <td>

                <div class="last-message">
                    ${escapeHtml(
                        lastMessage
                    )}
                </div>

                <div class="person-secondary">
                    ${lastTime}
                </div>

            </td>


            <td>

                <span class="status">
                    ${escapeHtml(
                        contact.status || "Active"
                    )}
                </span>

            </td>


            <td>

                <button
                    class="message-btn"
                    data-index="${contacts.indexOf(contact)}"
                >

                    <i class="fa-solid fa-comment"></i>

                    Message

                    ${unread}

                </button>

            </td>

        </tr>
    `;
}


/* ============================================================
   TYPE HELPERS
============================================================ */

function getTypeLabel(type) {

    const labels = {
        vendor: "Vendor",
        admin: "Admin",
        supply_chain: "Supply Chain",
        finance: "Finance",
        audit: "Audit"
    };

    return labels[type] || type;
}


function getTypeClass(type) {

    const classes = {
        vendor: "type-vendor",
        admin: "type-admin",
        supply_chain: "type-supply",
        finance: "type-finance",
        audit: "type-audit"
    };

    return classes[type] || "";
}


function getTypeIcon(type) {

    const icons = {
        vendor:
            "fa-solid fa-truck",

        admin:
            "fa-solid fa-user-shield",

        supply_chain:
            "fa-solid fa-boxes-stacked",

        finance:
            "fa-solid fa-coins",

        audit:
            "fa-solid fa-user-check"
    };

    return icons[type] ||
        "fa-solid fa-user";
}


/* ============================================================
   OPEN CONVERSATION
============================================================ */

async function openConversation(
    target
) {

    currentTarget = target;

    const modal =
        document.getElementById(
            "messageModal"
        );

    modal.classList.add("show");

    document.getElementById(
        "modalRecipientName"
    ).textContent =
        target.name || "Conversation";

    document.getElementById(
        "modalRecipientMeta"
    ).textContent =
        `${getTypeLabel(target.target_type)} • ${target.display_id || target.target_id}`;

    const avatar =
        document.getElementById(
            "modalAvatar"
        );

    avatar.innerHTML =
        `<i class="${getTypeIcon(target.target_type)}"></i>`;

    const body =
        document.getElementById(
            "conversationBody"
        );

    body.innerHTML = `
        <div class="conversation-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading conversation...
        </div>
    `;

    document.getElementById(
        "messageInput"
    ).focus();

    try {

        const result =
            await apiFetch(
                `/api/procurement/communication/conversation/${encodeURIComponent(target.target_type)}/${encodeURIComponent(target.target_id)}`
            );

        renderConversation(
            result.messages || []
        );

    } catch (error) {

        console.error(
            "Conversation error:",
            error
        );

        body.innerHTML = `
            <div class="empty-conversation">
                <i class="fa-solid fa-circle-exclamation"></i>
                <strong>
                    Unable to load conversation
                </strong>
                <span>
                    ${escapeHtml(error.message)}
                </span>
            </div>
        `;
    }
}


/* ============================================================
   RENDER CONVERSATION
============================================================ */

function renderConversation(
    messages
) {

    const body =
        document.getElementById(
            "conversationBody"
        );

    if (!messages.length) {

        body.innerHTML = `
            <div class="empty-conversation">

                <i class="fa-regular fa-comments"></i>

                <strong>
                    No messages yet
                </strong>

                <span>
                    Start the conversation below.
                </span>

            </div>
        `;

        return;
    }

    body.innerHTML =
        messages.map(
            message => {

                const mine =
                    message.sender_type ===
                    "procurement";

                return `
                    <div class="message-row ${
                        mine
                            ? "mine"
                            : "theirs"
                    }">

                        <div class="message-content">

                            <div class="message-name">
                                ${escapeHtml(
                                    message.sender_name ||
                                    (
                                        mine
                                            ? "Procurement"
                                            : "Recipient"
                                    )
                                )}
                            </div>

                            <div class="message-bubble">
                                ${escapeHtml(
                                    message.message || ""
                                )}
                            </div>

                            <div class="message-time">
                                ${formatDateTime(
                                    message.created_at
                                )}
                            </div>

                        </div>

                    </div>
                `;
            }
        ).join("");

    body.scrollTop =
        body.scrollHeight;
}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

    if (!currentTarget) {
        return;
    }

    const input =
        document.getElementById(
            "messageInput"
        );

    const message =
        input.value.trim();

    if (!message) {
        return;
    }

    const sendButton =
        document.getElementById(
            "sendMessageButton"
        );

    sendButton.disabled = true;

    try {

        await apiFetch(
            `/api/procurement/communication/conversation/${encodeURIComponent(currentTarget.target_type)}/${encodeURIComponent(currentTarget.target_id)}`,
            {
                method: "POST",

                body: JSON.stringify({
                    message: message
                })
            }
        );

        input.value = "";

        await openConversation(
            currentTarget
        );

        await loadContacts();

    } catch (error) {

        console.error(
            "Send message error:",
            error
        );

        alert(
            error.message ||
            "Unable to send message."
        );

    } finally {

        sendButton.disabled = false;
    }
}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeConversation() {

    document
        .getElementById(
            "messageModal"
        )
        .classList.remove("show");

    currentTarget = null;

    document.getElementById(
        "messageInput"
    ).value = "";
}


/* ============================================================
   DATE
============================================================ */

function formatDateTime(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
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


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   FILTER EVENTS
============================================================ */

function setupFilters() {

    document
        .querySelectorAll(".category-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    document
                        .querySelectorAll(
                            ".category-btn"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    activeFilter =
                        button.dataset.filter;

                    await loadContacts();
                }
            );

        });
}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    let timer = null;

    document
        .getElementById(
            "searchInput"
        )
        .addEventListener(
            "input",
            () => {

                clearTimeout(timer);

                timer =
                    setTimeout(
                        () => {
                            loadContacts();
                        },
                        300
                    );
            }
        );
}


/* ============================================================
   ENTER TO SEND
============================================================ */

function setupMessageInput() {

    document
        .getElementById(
            "messageInput"
        )
        .addEventListener(
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


/* ============================================================
   MODAL EVENTS
============================================================ */

function setupModal() {

    document
        .getElementById(
            "closeModal"
        )
        .addEventListener(
            "click",
            closeConversation
        );


    document
        .getElementById(
            "sendMessageButton"
        )
        .addEventListener(
            "click",
            sendMessage
        );


    document
        .getElementById(
            "messageModal"
        )
        .addEventListener(
            "click",
            event => {

                if (
                    event.target.id ===
                    "messageModal"
                ) {
                    closeConversation();
                }
            }
        );


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
}


/* ============================================================
   REFRESH
============================================================ */

function setupRefresh() {

    document
        .getElementById(
            "refreshButton"
        )
        .addEventListener(
            "click",
            loadContacts
        );
}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadCurrentUser();

        setupFilters();

        setupSearch();

        setupMessageInput();

        setupModal();

        setupRefresh();

        await loadContacts();
    }
);