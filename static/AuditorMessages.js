/* ============================================================
   AUDITOR COMMUNICATION
============================================================ */

let contacts = [];
let currentFilter = "all";

let selectedTargetType = null;
let selectedTargetId = null;

let conversationTimer = null;


/* ============================================================
   AUTH
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("vendor_token")
    );
}


async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {

        let errorText = "";

        try {
            errorText = await response.text();
        } catch (e) {
            errorText = response.statusText;
        }

        throw new Error(
            `HTTP ${response.status}: ${errorText}`
        );
    }

    return response.json();
}


/* ============================================================
   LOAD CONTACTS
============================================================ */

async function loadContacts() {

    const tbody =
        document.getElementById("contactsTableBody");

    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="loading-cell">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading contacts...
            </td>
        </tr>
    `;

    try {

        contacts = await apiFetch(
            "/api/auditor/communication/contacts"
        );

        updateSummary();

        renderContacts();

    } catch (error) {

        console.error(
            "Contact loading error:",
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Unable to load contacts
                </td>
            </tr>
        `;
    }
}


/* ============================================================
   SUMMARY
============================================================ */

function updateSummary() {

    const vendors =
        contacts.filter(
            x => x.target_type === "vendor"
        ).length;

    const internal =
        contacts.filter(
            x => x.target_type !== "vendor"
        ).length;

    const unread =
        contacts.reduce(
            (total, item) =>
                total + Number(item.unread_count || 0),
            0
        );

    document.getElementById(
        "totalContacts"
    ).textContent = contacts.length;

    document.getElementById(
        "vendorCount"
    ).textContent = vendors;

    document.getElementById(
        "internalCount"
    ).textContent = internal;

    document.getElementById(
        "unreadCount"
    ).textContent = unread;
}


/* ============================================================
   FILTER
============================================================ */

document
    .querySelectorAll(".filter-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".filter-btn")
                    .forEach(btn =>
                        btn.classList.remove("active")
                    );

                button.classList.add("active");

                currentFilter =
                    button.dataset.filter;

                renderContacts();
            }
        );

    });


/* ============================================================
   SEARCH
============================================================ */

document
    .getElementById("searchInput")
    .addEventListener(
        "input",
        renderContacts
    );


/* ============================================================
   RENDER CONTACTS
============================================================ */

function renderContacts() {

    const tbody =
        document.getElementById(
            "contactsTableBody"
        );

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();


    let filtered = contacts.filter(contact => {

        const filterMatch =
            currentFilter === "all" ||
            contact.target_type === currentFilter;

        const text =
            `${contact.name || ""}
             ${contact.email || ""}
             ${contact.department || ""}
             ${contact.company || ""}`
            .toLowerCase();

        return filterMatch &&
               (!search || text.includes(search));
    });


    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell">
                    No contacts found
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        filtered.map(contact => {

            const icon =
                getContactIcon(
                    contact.target_type
                );

            const typeLabel =
                getTypeLabel(
                    contact.target_type
                );

            const department =
                contact.target_type === "vendor"
                    ? (contact.company || "Vendor")
                    : (contact.department || typeLabel);


            return `

                <tr>

                    <td>

                        <div class="person-cell">

                            <div class="person-avatar">
                                <i class="${icon}"></i>
                            </div>

                            <div>

                                <div class="person-name">
                                    ${escapeHtml(
                                        contact.name || "Unknown"
                                    )}
                                </div>

                                <div class="person-id">
                                    ${escapeHtml(
                                        String(
                                            contact.target_id
                                        )
                                    )}
                                </div>

                            </div>

                        </div>

                    </td>


                    <td>

                        <span class="type-badge">
                            ${typeLabel}
                        </span>

                    </td>


                    <td>
                        ${escapeHtml(
                            contact.email || "-"
                        )}
                    </td>


                    <td>
                        ${escapeHtml(
                            department
                        )}
                    </td>


                    <td>

                        <span class="status-badge">
                            <i class="fa-solid fa-circle"></i>
                            Active
                        </span>

                    </td>


                    <td>

                        <button
                            class="message-action"
                            onclick="openConversation(
                                '${escapeJs(contact.target_type)}',
                                '${escapeJs(String(contact.target_id))}',
                                '${escapeJs(contact.name || "Contact")}',
                                '${escapeJs(typeLabel)}'
                            )"
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
   OPEN CONVERSATION
============================================================ */

async function openConversation(
    targetType,
    targetId,
    targetName,
    targetLabel
) {

    selectedTargetType = targetType;
    selectedTargetId = targetId;


    document.getElementById(
        "recipientName"
    ).textContent = targetName;

    document.getElementById(
        "recipientType"
    ).textContent = targetLabel;


    document.getElementById(
        "messageModal"
    ).classList.add("show");


    document.getElementById(
        "messageInput"
    ).focus();


    await loadConversation();


    startConversationPolling();
}


/* ============================================================
   LOAD CONVERSATION
============================================================ */

async function loadConversation() {

    if (
        !selectedTargetType ||
        !selectedTargetId
    ) {
        return;
    }


    const container =
        document.getElementById(
            "conversationContainer"
        );


    try {

        const result =
            await apiFetch(
                `/api/auditor/communication/conversation/${encodeURIComponent(
                    selectedTargetType
                )}/${encodeURIComponent(
                    selectedTargetId
                )}`
            );


        renderConversation(
            result.messages || []
        );

    } catch (error) {

        console.error(
            "Conversation loading error:",
            error
        );

        container.innerHTML = `
            <div class="empty-conversation">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Unable to load conversation
                </p>

            </div>
        `;
    }
}


/* ============================================================
   RENDER CONVERSATION
============================================================ */

function renderConversation(messages) {

    const container =
        document.getElementById(
            "conversationContainer"
        );


    if (!messages.length) {

        container.innerHTML = `
            <div class="empty-conversation">

                <i class="fa-regular fa-comments"></i>

                <p>
                    No messages yet.
                </p>

                <small>
                    Start the conversation below.
                </small>

            </div>
        `;

        return;
    }


    container.innerHTML =
        messages.map(message => {

            const mine =
                Boolean(message.is_mine);

            const rowClass =
                mine
                    ? "mine"
                    : "theirs";


            return `

                <div class="message-row ${rowClass}">

                    <div class="message-bubble">

                        <div class="message-sender">
                            ${escapeHtml(
                                message.sender_name ||
                                (mine ? "You" : "Contact")
                            )}
                        </div>

                        <div>
                            ${formatMessage(
                                message.message
                            )}
                        </div>

                        <div class="message-time">
                            ${formatDate(
                                message.created_at
                            )}
                        </div>

                    </div>

                </div>
            `;

        }).join("");


    container.scrollTop =
        container.scrollHeight;
}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );

    const button =
        document.getElementById(
            "sendMessageBtn"
        );

    const message =
        input.value.trim();


    if (!message) {
        return;
    }


    if (
        !selectedTargetType ||
        !selectedTargetId
    ) {
        return;
    }


    button.disabled = true;


    try {

        await apiFetch(
            `/api/auditor/communication/conversation/${encodeURIComponent(
                selectedTargetType
            )}/${encodeURIComponent(
                selectedTargetId
            )}`,
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

        console.error(
            "Send message error:",
            error
        );

        alert(
            "Unable to send message."
        );

    } finally {

        button.disabled = false;

        input.focus();
    }
}


/* ============================================================
   ENTER TO SEND
============================================================ */

document
    .getElementById("messageInput")
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );


/* ============================================================
   POLLING
============================================================ */

function startConversationPolling() {

    stopConversationPolling();

    conversationTimer =
        setInterval(
            () => {

                if (
                    document
                        .getElementById(
                            "messageModal"
                        )
                        .classList
                        .contains("show")
                ) {

                    loadConversation();
                }

            },
            5000
        );
}


function stopConversationPolling() {

    if (conversationTimer) {

        clearInterval(
            conversationTimer
        );

        conversationTimer = null;
    }
}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeMessageModal() {

    document
        .getElementById(
            "messageModal"
        )
        .classList
        .remove("show");


    stopConversationPolling();


    selectedTargetType = null;
    selectedTargetId = null;


    document.getElementById(
        "messageInput"
    ).value = "";
}


/* ============================================================
   ESCAPE / OVERLAY CLOSE
============================================================ */

document
    .getElementById("messageModal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target === this
            ) {

                closeMessageModal();
            }
        }
    );


document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            closeMessageModal();
        }
    }
);


/* ============================================================
   HELPERS
============================================================ */

function getTypeLabel(type) {

    const labels = {

        vendor: "Vendor",

        admin: "Admin",

        supply_chain: "Supply Chain",

        finance: "Finance",

        procurement: "Procurement"

    };

    return labels[type] || type;
}


function getContactIcon(type) {

    const icons = {

        vendor:
            "fa-solid fa-building",

        admin:
            "fa-solid fa-user-shield",

        supply_chain:
            "fa-solid fa-truck-fast",

        finance:
            "fa-solid fa-coins",

        procurement:
            "fa-solid fa-cart-shopping"

    };

    return icons[type] ||
        "fa-solid fa-user";
}


function formatMessage(text) {

    if (!text) {
        return "";
    }

    return escapeHtml(text)
        .replace(/\n/g, "<br>");
}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

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
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


/* ============================================================
   INITIAL LOAD
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadContacts();

    }
);