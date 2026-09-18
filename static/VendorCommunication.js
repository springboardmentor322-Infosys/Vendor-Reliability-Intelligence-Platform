/* ============================================================
   VENDOR IQ - VENDOR COMMUNICATION CENTER
   Complete replacement for VendorCommunication.js

   Matched exactly to:
   VendorCommunication(3).html

   HTML IDs used:
   vendorCompany
   vendorIdDisplay
 
   procurementCount
   adminCount
   supplyCount
   financeCount
   auditCount

   searchInput
   contactCount
   contactsTableBody

   messageModal
   recipientAvatar
   recipientName
   recipientRole
   closeModal
   conversationContainer
   messageInput
   sendMessageBtn
   toast
============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
============================================================ */

const API_BASE = "";

const PROFILE_ENDPOINT =
    "/api/vendor/communication/profile";

const CONTACTS_ENDPOINT =
    "/api/vendor/communication/contacts";

const CONVERSATION_ENDPOINT =
    "/api/vendor/communication/conversation";

const POLLING_INTERVAL = 5000;


/* ============================================================
   APPLICATION STATE
============================================================ */

let contacts = [];

let currentFilter = "all";

let currentRecipient = {
    type: null,
    id: null,
    name: null,
    role: null
};

let conversationPolling = null;

let conversationLoading = false;

let sendingMessage = false;

let conversationRequestId = 0;


/* ============================================================
   DOM HELPERS
============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent =
            value !== null &&
            value !== undefined
                ? String(value)
                : "";
    }
}


function getModal() {
    return getElement("messageModal");
}


function getConversationContainer() {
    return getElement("conversationContainer");
}


function isModalOpen() {
    const modal = getModal();

    return Boolean(
        modal &&
        modal.classList.contains("show")
    );
}


/* ============================================================
   AUTH TOKEN
============================================================ */

function getToken() {

    const possibleTokens = [

        sessionStorage.getItem("access_token"),

        sessionStorage.getItem("token"),

        sessionStorage.getItem("jwt_token"),

        sessionStorage.getItem("vendor_token"),

        sessionStorage.getItem("vendorToken"),

        localStorage.getItem("access_token"),

        localStorage.getItem("token"),

        localStorage.getItem("jwt_token"),

        localStorage.getItem("vendor_token"),

        localStorage.getItem("vendorToken")

    ];

    for (const token of possibleTokens) {

        if (
            token &&
            String(token).trim() !== ""
        ) {
            return String(token).trim();
        }
    }

    return null;
}


/* ============================================================
   CURRENT USER / VENDOR INFORMATION
============================================================ */

function getCurrentUserId() {

    const ids = [

        sessionStorage.getItem("user_id"),

        sessionStorage.getItem("userId"),

        localStorage.getItem("user_id"),

        localStorage.getItem("userId")

    ];

    for (const id of ids) {

        if (
            id !== null &&
            id !== undefined &&
            String(id).trim() !== ""
        ) {
            return String(id);
        }
    }

    return null;
}


function getCurrentVendorId() {

    const ids = [

        sessionStorage.getItem("vendor_id"),

        sessionStorage.getItem("vendorId"),

        localStorage.getItem("vendor_id"),

        localStorage.getItem("vendorId"),

        sessionStorage.getItem("VENDOR_ID"),

        localStorage.getItem("VENDOR_ID")

    ];

    for (const id of ids) {

        if (
            id !== null &&
            id !== undefined &&
            String(id).trim() !== ""
        ) {
            return String(id);
        }
    }

    return null;
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Accept": "application/json"
    };


    /*
       Preserve any caller supplied headers.
    */

    if (options.headers) {

        Object.assign(
            headers,
            options.headers
        );
    }


    /*
       JSON body
    */

    if (
        options.body &&
        !(options.body instanceof FormData)
    ) {

        headers["Content-Type"] =
            "application/json";
    }


    /*
       Authorization
    */

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }


    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers: headers,
            credentials: "include"
        }
    );


    /*
       HTTP error
    */

    if (!response.ok) {

        let detail =
            `HTTP ${response.status}`;

        try {

            const contentType =
                response.headers.get(
                    "content-type"
                ) || "";

            if (
                contentType.includes(
                    "application/json"
                )
            ) {

                const data =
                    await response.json();

                if (
                    data &&
                    typeof data.detail === "string"
                ) {

                    detail =
                        data.detail;

                } else if (
                    data &&
                    data.detail
                ) {

                    detail =
                        JSON.stringify(
                            data.detail
                        );

                } else if (
                    data &&
                    data.message
                ) {

                    detail =
                        data.message;
                }

            } else {

                const text =
                    await response.text();

                if (text) {
                    detail = text;
                }
            }

        } catch (error) {

            console.warn(
                "Unable to parse API error:",
                error
            );
        }


        /*
           Authentication failure
        */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            console.error(
                "Vendor Communication authentication error:",
                detail
            );
        }

        throw new Error(detail);
    }


    /*
       Empty response
    */

    if (response.status === 204) {
        return null;
    }


    /*
       Parse response
    */

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


    return await response.text();
}


/* ============================================================
   INITIALIZATION
============================================================ */

function initializeVendorCommunication() {

    console.log(
        "Vendor Communication: initializing..."
    );


    /*
       Verify the important HTML elements.
    */

    verifyHTML();


    /*
       Setup controls.
    */

    setupFilters();

    setupSearch();

    setupModal();


    /*
       Load initial data.
    */

    loadVendorProfile();

    loadContacts();
}


/* ============================================================
   VERIFY HTML
============================================================ */

function verifyHTML() {

    const requiredElements = [

        "vendorCompany",
        "vendorIdDisplay",

        "procurementCount",
        "adminCount",
        "supplyCount",
        "financeCount",
        "auditCount",

        "searchInput",
        "contactCount",
        "contactsTableBody",

        "messageModal",
        "recipientAvatar",
        "recipientName",
        "recipientRole",
        "closeModal",
        "conversationContainer",
        "messageInput",
        "sendMessageBtn",
        "toast"

    ];


    const missing = [];


    requiredElements.forEach(id => {

        if (!getElement(id)) {
            missing.push(id);
        }

    });


    if (missing.length) {

        console.warn(
            "Vendor Communication: missing HTML elements:",
            missing
        );

    } else {

        console.log(
            "Vendor Communication: HTML verified."
        );
    }
}


/* ============================================================
   LOAD VENDOR PROFILE
============================================================ */

async function loadVendorProfile() {

    try {

        const data =
            await apiFetch(
                PROFILE_ENDPOINT
            );


        if (
            !data ||
            typeof data !== "object"
        ) {

            console.warn(
                "Vendor profile response is empty."
            );

            return;
        }


        const vendor =
            data.vendor &&
            typeof data.vendor === "object"
                ? data.vendor
                : data;


        const companyName =
            vendor.company_name ||
            vendor.company ||
            vendor.vendor_name ||
            vendor.name ||
            "-";


        const vendorId =
            vendor.vendor_id ||
            getCurrentVendorId() ||
            "-";


        setText(
            "vendorCompany",
            companyName
        );


        setText(
            "vendorIdDisplay",
            vendorId
        );


    } catch (error) {

        console.error(
            "Vendor profile loading error:",
            error
        );


        /*
           Do not stop the communication page
           if only the profile endpoint fails.
        */

        setText(
            "vendorCompany",
            "-"
        );

        setText(
            "vendorIdDisplay",
            getCurrentVendorId() || "-"
        );
    }
}


/* ============================================================
   LOAD CONTACTS
============================================================ */

async function loadContacts() {

    const tbody =
        getElement(
            "contactsTableBody"
        );


    /*
       IMPORTANT:
       The uploaded HTML uses:

       <tbody id="contactsTableBody">

       Therefore we never search for:
       contactsList
       contactList
       contactsContainer
       communicationContacts
    */

    if (!tbody) {

        console.error(
            "Vendor Communication: #contactsTableBody not found."
        );

        return;
    }


    showContactsLoading();


    try {

        const response =
            await apiFetch(
                CONTACTS_ENDPOINT
            );


        contacts =
            extractContacts(response);


        console.log(
            "Vendor Communication contacts:",
            contacts
        );


        updateDepartmentCounts();

        renderContacts();


    } catch (error) {

        console.error(
            "Vendor Communication contacts error:",
            error
        );


        contacts = [];

        updateDepartmentCounts();


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-row"
                >
                    <i class="fa-solid fa-circle-exclamation"></i>
                    Unable to load contacts
                </td>
            </tr>
        `;


        setText(
            "contactCount",
            "0 contacts"
        );


        if (
            error &&
            error.message
        ) {

            showToast(
                error.message
            );
        }
    }
}


/* ============================================================
   CONTACT LOADING STATE
============================================================ */

function showContactsLoading() {

    const tbody =
        getElement(
            "contactsTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr>
            <td
                colspan="6"
                class="loading-row"
            >
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading contacts...
            </td>
        </tr>
    `;
}


/* ============================================================
   EXTRACT CONTACTS
============================================================ */

function extractContacts(response) {

    /*
       Direct array
    */

    if (Array.isArray(response)) {
        return response;
    }


    if (
        !response ||
        typeof response !== "object"
    ) {

        return [];
    }


    /*
       Common response formats
    */

    const possibleArrays = [

        response.contacts,

        response.data,

        response.items,

        response.results,

        response.users

    ];


    for (
        const value of possibleArrays
    ) {

        if (Array.isArray(value)) {
            return value;
        }
    }


    return [];
}


/* ============================================================
   DEPARTMENT NORMALIZATION
============================================================ */

function normalizeType(type) {

    if (
        type === null ||
        type === undefined
    ) {

        return "";
    }


    const value =
        String(type)
            .toLowerCase()
            .trim()
            .replace(/-/g, "_")
            .replace(/\s+/g, "_");


    if (
        value.includes("procurement")
    ) {

        return "procurement";
    }


    if (
        value.includes("admin")
    ) {

        return "admin";
    }


    if (
        value.includes("supply_chain") ||
        value.includes("supplychain")
    ) {

        return "supply_chain";
    }


    if (
        value.includes("finance")
    ) {

        return "finance";
    }


    if (
        value.includes("audit") ||
        value.includes("auditor")
    ) {

        return "audit";
    }


    return value;
}


/* ============================================================
   DEPARTMENT LABEL
============================================================ */

function formatType(type) {

    const normalized =
        normalizeType(type);


    const labels = {

        procurement:
            "Procurement",

        admin:
            "Admin",

        supply_chain:
            "Supply Chain",

        finance:
            "Finance",

        audit:
            "Audit"

    };


    return (
        labels[normalized] ||
        type ||
        "Organization"
    );
}


/* ============================================================
   DEPARTMENT ICON
============================================================ */

function getTypeIcon(type) {

    const normalized =
        normalizeType(type);


    const icons = {

        procurement:
            "fa-solid fa-cart-shopping",

        admin:
            "fa-solid fa-user-shield",

        supply_chain:
            "fa-solid fa-truck",

        finance:
            "fa-solid fa-coins",

        audit:
            "fa-solid fa-shield-halved"

    };


    return (
        icons[normalized] ||
        "fa-solid fa-user"
    );
}


/* ============================================================
   UPDATE SUMMARY COUNTS
============================================================ */

function updateDepartmentCounts() {

    const countByType =
        type => {

            return contacts.filter(
                contact => {

                    const contactType =
                        normalizeType(
                            contact.department_type ||
                            contact.department ||
                            contact.type
                        );

                    return (
                        contactType === type
                    );
                }
            ).length;
        };


    setText(
        "procurementCount",
        countByType(
            "procurement"
        )
    );


    setText(
        "adminCount",
        countByType(
            "admin"
        )
    );


    setText(
        "supplyCount",
        countByType(
            "supply_chain"
        )
    );


    setText(
        "financeCount",
        countByType(
            "finance"
        )
    );


    setText(
        "auditCount",
        countByType(
            "audit"
        )
    );
}


/* ============================================================
   RENDER CONTACTS
============================================================ */

function renderContacts() {

    /*
       EXACT HTML ELEMENT:
       <tbody id="contactsTableBody">
    */

    const tbody =
        getElement(
            "contactsTableBody"
        );


    if (!tbody) {

        console.error(
            "Vendor Communication: #contactsTableBody not found."
        );

        return;
    }


    const searchInput =
        getElement(
            "searchInput"
        );


    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";


    /*
       Filter contacts
    */

    const filtered =
        contacts.filter(
            contact => {

                const type =
                    normalizeType(
                        contact.department_type ||
                        contact.department ||
                        contact.type
                    );


                /*
                   Department filter
                */

                const matchesFilter =
                    currentFilter === "all" ||
                    type === currentFilter;


                /*
                   Search fields
                */

                const searchable = [

                    contact.name,

                    contact.full_name,

                    contact.username,

                    contact.email,

                    contact.role,

                    contact.department,

                    contact.department_type,

                    contact.company_name,

                    contact.employee_id,

                    contact.user_id

                ]
                    .filter(
                        value =>
                            value !== null &&
                            value !== undefined
                    )
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(
                        search
                    );


                return (
                    matchesFilter &&
                    matchesSearch
                );
            }
        );


    /*
       Update contact count
    */

    setText(
        "contactCount",
        `${filtered.length} contact${
            filtered.length === 1
                ? ""
                : "s"
        }`
    );


    /*
       Empty result
    */

    if (!filtered.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="empty-row"
                >
                    <i class="fa-regular fa-face-frown"></i>
                    No contacts found
                </td>
            </tr>
        `;

        return;
    }


    /*
       Build table rows
    */

    tbody.innerHTML =
        filtered.map(
            contact => {

                const type =
                    normalizeType(
                        contact.department_type ||
                        contact.department ||
                        contact.type
                    );


                const typeLabel =
                    formatType(type);


                const icon =
                    getTypeIcon(type);


                /*
                   IMPORTANT:
                   Backend contact schema uses user_id.

                   Prefer user_id over id.
                */

                const recipientId =
                    contact.user_id ??
                    contact.id;


                const name =
                    contact.name ||
                    contact.full_name ||
                    contact.username ||
                    "Unknown";


                const role =
                    contact.role ||
                    typeLabel;


                const email =
                    contact.email ||
                    "-";


                const employeeId =
                    contact.employee_id ||
                    contact.user_id ||
                    "";


                const status =
                    contact.status ||
                    "Active";


                const unreadCount =
                    Number(
                        contact.unread_count || 0
                    );


                const contactIndex =
                    contacts.indexOf(
                        contact
                    );


                return `

                    <tr>

                        <!-- PERSON -->

                        <td>

                            <div class="person-cell">

                                <div class="person-avatar">

                                    <i
                                        class="${escapeHtml(icon)}"
                                    ></i>

                                </div>

                                <div>

                                    <div class="person-name">

                                        ${escapeHtml(name)}

                                    </div>

                                    ${
                                        employeeId
                                            ? `
                                                <div class="person-id">
                                                    ${escapeHtml(employeeId)}
                                                </div>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>

                        </td>


                        <!-- DEPARTMENT -->

                        <td>

                            <span
                                class="department-badge ${escapeHtml(type)}"
                            >
                                ${escapeHtml(typeLabel)}
                            </span>

                        </td>


                        <!-- ROLE -->

                        <td>

                            ${escapeHtml(role)}

                        </td>


                        <!-- EMAIL -->

                        <td>

                            ${
                                email !== "-"
                                    ? `
                                        <a
                                            href="mailto:${escapeHtml(email)}"
                                        >
                                            ${escapeHtml(email)}
                                        </a>
                                    `
                                    : "-"
                            }

                        </td>


                        <!-- STATUS -->

                        <td>

                            <span class="status">

                                <span class="status-dot"></span>

                                ${escapeHtml(status)}

                                ${
                                    unreadCount > 0
                                        ? `
                                            <span class="unread-badge">
                                                ${unreadCount}
                                            </span>
                                        `
                                        : ""
                                }

                            </span>

                        </td>


                        <!-- ACTION -->

                        <td>

                            <button
                                type="button"
                                class="message-button"
                                data-contact-index="${contactIndex}"
                            >

                                <i
                                    class="fa-regular fa-comment"
                                ></i>

                                Message

                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join("");


    /*
       Attach message button events.
    */

    tbody
        .querySelectorAll(
            ".message-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                button.dataset.contactIndex
                            );


                        const contact =
                            contacts[index];


                        if (!contact) {

                            showToast(
                                "Contact not found."
                            );

                            return;
                        }


                        openContactConversation(
                            contact
                        );
                    }
                );
            }
        );
}


/* ============================================================
   FILTER BUTTONS
============================================================ */

function setupFilters() {

    const buttons =
        document.querySelectorAll(
            ".filter-btn"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    /*
                       Remove active from all
                    */

                    buttons.forEach(
                        btn =>
                            btn.classList.remove(
                                "active"
                            )
                    );


                    /*
                       Activate clicked button
                    */

                    button.classList.add(
                        "active"
                    );


                    currentFilter =
                        normalizeType(
                            button.dataset.filter ||
                            "all"
                        );


                    if (
                        button.dataset.filter ===
                        "all"
                    ) {

                        currentFilter =
                            "all";
                    }


                    renderContacts();
                }
            );
        }
    );
}


/* ============================================================
   SEARCH
============================================================ */

function setupSearch() {

    const input =
        getElement(
            "searchInput"
        );


    if (!input) {

        console.warn(
            "Vendor Communication: #searchInput not found."
        );

        return;
    }


    input.addEventListener(
        "input",
        () => {
            renderContacts();
        }
    );
}


/* ============================================================
   OPEN CONTACT CONVERSATION
============================================================ */

function openContactConversation(
    contact
) {

    /*
       Determine department.
    */

    const type =
        normalizeType(
            contact.department_type ||
            contact.department ||
            contact.type
        );


    /*
       IMPORTANT:
       CommunicationMessage uses users.id,
       so recipient ID must be user_id.

       We prefer user_id and only fall
       back to id for compatibility.
    */

    const recipientId =
        contact.user_id ??
        contact.id;


    if (
        recipientId === null ||
        recipientId === undefined ||
        String(recipientId).trim() === ""
    ) {

        showToast(
            "Contact user ID is missing."
        );

        return;
    }


    const name =
        contact.name ||
        contact.full_name ||
        contact.username ||
        "Contact";


    const role =
        contact.role ||
        formatType(type);


    openConversation(
        type,
        String(recipientId),
        name,
        role
    );
}


/* ============================================================
   OPEN CONVERSATION MODAL
============================================================ */

async function openConversation(
    type,
    id,
    name,
    role
) {

    if (
        type === null ||
        type === undefined ||
        String(type).trim() === ""
    ) {

        showToast(
            "Recipient department is missing."
        );

        return;
    }


    if (
        id === null ||
        id === undefined ||
        String(id).trim() === ""
    ) {

        showToast(
            "Recipient user ID is missing."
        );

        return;
    }


    /*
       Stop previous polling.
    */

    stopConversationPolling();


    /*
       Invalidate previous requests.
    */

    conversationRequestId++;


    /*
       Store recipient.
    */

    currentRecipient = {

        type:
            String(type),

        id:
            String(id),

        name:
            String(
                name ||
                "Contact"
            ),

        role:
            String(
                role ||
                formatType(type)
            )

    };


    /*
       Update modal header.
    */

    setText(
        "recipientName",
        currentRecipient.name
    );


    setText(
        "recipientRole",
        currentRecipient.role
    );


    /*
       Update avatar icon.
    */

    const avatar =
        getElement(
            "recipientAvatar"
        );


    if (avatar) {

        avatar.innerHTML = `
            <i
                class="${escapeHtml(
                    getTypeIcon(
                        currentRecipient.type
                    )
                )}"
            ></i>
        `;
    }


    /*
       Open modal.
    */

    const modal =
        getModal();


    if (!modal) {

        console.error(
            "Vendor Communication: #messageModal not found."
        );

        return;
    }


    modal.classList.add(
        "show"
    );


    /*
       Reset conversation area.
    */

    const container =
        getConversationContainer();


    if (container) {

        container.innerHTML = `
            <div class="conversation-loading">

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Loading conversation...

            </div>
        `;
    }


    /*
       Load conversation.
    */

    await loadConversation();


    /*
       Start polling only if modal
       is still open.
    */

    if (
        isModalOpen() &&
        currentRecipient.id
    ) {

        startConversationPolling();
    }


    /*
       Focus message input.
    */

    const input =
        getElement(
            "messageInput"
        );


    if (input) {

        setTimeout(
            () => input.focus(),
            100
        );
    }
}


/* ============================================================
   LOAD CONVERSATION
============================================================ */

async function loadConversation() {

    if (
        conversationLoading ||
        !currentRecipient.type ||
        !currentRecipient.id
    ) {

        return;
    }


    const container =
        getConversationContainer();


    if (!container) {

        console.error(
            "Vendor Communication: #conversationContainer not found."
        );

        return;
    }


    conversationLoading = true;


    const requestId =
        conversationRequestId;


    const recipientType =
        currentRecipient.type;


    const recipientId =
        currentRecipient.id;


    try {

        /*
           Do not show the loading spinner
           during polling when messages already
           exist.
        */

        if (
            !container.children.length ||
            container.textContent.includes(
                "No messages yet"
            ) ||
            container.textContent.includes(
                "Unable to load conversation"
            )
        ) {

            container.innerHTML = `
                <div class="conversation-loading">

                    <i
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    Loading conversation...

                </div>
            `;
        }


        const url =
            `${CONVERSATION_ENDPOINT}/` +
            `${encodeURIComponent(
                recipientType
            )}/` +
            `${encodeURIComponent(
                recipientId
            )}`;


        console.log(
            "Loading conversation:",
            url
        );


        const response =
            await apiFetch(url);


        /*
           Ignore stale request.
        */

        if (
            requestId !==
                conversationRequestId ||

            recipientType !==
                currentRecipient.type ||

            recipientId !==
                currentRecipient.id
        ) {

            return;
        }


        const messages =
            extractMessages(
                response
            );


        renderConversation(
            messages
        );


    } catch (error) {

        console.error(
            "Conversation loading error:",
            error
        );


        if (
            requestId !==
            conversationRequestId
        ) {

            return;
        }


        container.innerHTML = `
            <div class="no-messages">

                <i
                    class="fa-solid fa-circle-exclamation"
                ></i>

                <span>
                    Unable to load conversation
                </span>

                <small>
                    ${escapeHtml(
                        error.message ||
                        "Please try again."
                    )}
                </small>

            </div>
        `;


    } finally {

        conversationLoading = false;
    }
}


/* ============================================================
   EXTRACT MESSAGES
============================================================ */

function extractMessages(
    response
) {

    if (Array.isArray(response)) {
        return response;
    }


    if (
        !response ||
        typeof response !== "object"
    ) {

        return [];
    }


    const possibleArrays = [

        response.messages,

        response.data,

        response.items,

        response.results

    ];


    for (
        const value of possibleArrays
    ) {

        if (Array.isArray(value)) {

            return value;
        }
    }


    return [];
}


/* ============================================================
   RENDER CONVERSATION
============================================================ */

function renderConversation(
    messages
) {

    const container =
        getConversationContainer();


    if (!container) {

        console.error(
            "Vendor Communication: #conversationContainer not found."
        );

        return;
    }


    /*
       No messages
    */

    if (
        !Array.isArray(messages) ||
        messages.length === 0
    ) {

        container.innerHTML = `

            <div class="no-messages">

                <i
                    class="fa-regular fa-comments"
                ></i>

                <span>
                    No messages yet
                </span>

                <small>
                    Start the conversation below.
                </small>

            </div>
        `;

        return;
    }


    /*
       Sort oldest -> newest.
    */

    const sortedMessages =
        [...messages].sort(
            (a, b) => {

                const dateA =
                    getMessageTimestamp(
                        a
                    );

                const dateB =
                    getMessageTimestamp(
                        b
                    );


                const timeA =
                    dateA
                        ? new Date(
                            dateA
                        ).getTime()
                        : 0;


                const timeB =
                    dateB
                        ? new Date(
                            dateB
                        ).getTime()
                        : 0;


                return (
                    timeA -
                    timeB
                );
            }
        );


    /*
       Render messages.
    */

    container.innerHTML =
        sortedMessages
            .map(
                message =>
                    renderMessage(
                        message
                    )
            )
            .join("");


    /*
       Scroll to latest message.
    */

    requestAnimationFrame(
        () => {

            container.scrollTop =
                container.scrollHeight;
        }
    );
}


/* ============================================================
   RENDER ONE MESSAGE
============================================================ */

function renderMessage(
    message
) {

    const mine =
        isMine(
            message
        );


    const sender =
        message.sender_name ||

        (
            message.sender &&
            message.sender.name
        ) ||

        (
            message.sender &&
            message.sender.username
        ) ||

        (
            mine
                ? "You"
                : currentRecipient.name ||
                  "Contact"
        );


    const text =
        message.message ??
        message.content ??
        message.text ??
        "";


    const timestamp =
        getMessageTimestamp(
            message
        );


    const senderType =
        normalizeType(
            message.sender_type ||
            ""
        );


    return `

        <div
            class="
                message-row
                ${mine ? "mine" : "theirs"}
            "
        >

            <div
                class="message-bubble"
            >

                <div
                    class="message-sender"
                >
                    ${escapeHtml(sender)}
                </div>


                <div
                    class="message-content"
                >
                    ${escapeHtml(
                        text
                    ).replace(
                        /\n/g,
                        "<br>"
                    )}
                </div>


                <div
                    class="message-time"
                >
                    ${escapeHtml(
                        formatDateTime(
                            timestamp
                        )
                    )}
                </div>

            </div>

        </div>
    `;
}


/* ============================================================
   MESSAGE TIMESTAMP
============================================================ */

function getMessageTimestamp(
    message
) {

    if (!message) {
        return null;
    }


    return (
        message.created_at ||

        message.timestamp ||

        message.sent_at ||

        message.date ||

        null
    );
}


/* ============================================================
   DETERMINE MESSAGE OWNERSHIP
============================================================ */

function isMine(
    message
) {

    /*
       Best option:
       Backend explicitly tells frontend.
    */

    if (
        message.is_mine !== undefined &&
        message.is_mine !== null
    ) {

        return (
            Boolean(
                message.is_mine
            )
        );
    }


    if (
        message.mine !== undefined &&
        message.mine !== null
    ) {

        return (
            Boolean(
                message.mine
            )
        );
    }


    /*
       Vendor messages are sent by
       sender_type = "vendor".
    */

    const senderType =
        String(
            message.sender_type ||
            ""
        ).toLowerCase();


    if (
        senderType === "vendor"
    ) {

        return true;
    }


    /*
       If backend returns sender_user_id,
       compare it with current user.
    */

    const currentUserId =
        getCurrentUserId();


    const senderUserId =
        message.sender_user_id ??
        message.sender_id;


    if (
        currentUserId !== null &&
        senderUserId !== undefined &&
        senderUserId !== null
    ) {

        return (
            String(
                senderUserId
            ) ===
            String(
                currentUserId
            )
        );
    }


    /*
       If backend sends recipient_user_id,
       a message addressed to the current user
       is not mine.
    */

    return false;
}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

    /*
       Prevent duplicate submissions.
    */

    if (sendingMessage) {
        return;
    }


    const input =
        getElement(
            "messageInput"
        );


    const button =
        getElement(
            "sendMessageBtn"
        );


    if (!input) {

        showToast(
            "Message input is missing."
        );

        return;
    }


    const message =
        input.value.trim();


    if (!message) {

        input.focus();

        return;
    }


    if (
        !currentRecipient.type ||
        !currentRecipient.id
    ) {

        showToast(
            "Please select a recipient."
        );

        return;
    }


    /*
       Maximum length matches the
       backend Pydantic schema.
    */

    if (
        message.length > 5000
    ) {

        showToast(
            "Message cannot exceed 5000 characters."
        );

        return;
    }


    sendingMessage = true;


    if (button) {

        button.disabled = true;

        button.dataset.originalText =
            button.innerHTML;

        button.innerHTML = `
            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>
            Sending...
        `;
    }


    const recipientType =
        currentRecipient.type;


    const recipientId =
        currentRecipient.id;


    try {

        const url =
            `${CONVERSATION_ENDPOINT}/` +
            `${encodeURIComponent(
                recipientType
            )}/` +
            `${encodeURIComponent(
                recipientId
            )}`;


        console.log(
            "Sending message:",
            {
                recipientType,
                recipientId
            }
        );


        await apiFetch(
            url,
            {
                method: "POST",

                body: JSON.stringify({
                    message: message
                })
            }
        );


        /*
           Clear input after successful send.
        */

        input.value = "";


        /*
           Invalidate previous request.
        */

        conversationRequestId++;


        /*
           Immediately reload conversation.
        */

        await loadConversation();


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

        sendingMessage = false;


        if (button) {

            button.disabled = false;


            button.innerHTML =
                button.dataset.originalText ||
                `
                    <i
                        class="fa-solid fa-paper-plane"
                    ></i>
                    Send
                `;
        }


        input.focus();
    }
}


/* ============================================================
   MODAL SETUP
============================================================ */

function setupModal() {

    const modal =
        getElement(
            "messageModal"
        );


    const closeButton =
        getElement(
            "closeModal"
        );


    const sendButton =
        getElement(
            "sendMessageBtn"
        );


    const input =
        getElement(
            "messageInput"
        );


    if (!modal) {

        console.error(
            "Vendor Communication: #messageModal not found."
        );

        return;
    }


    /*
       Close button.
    */

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeConversation
        );
    }


    /*
       Click outside modal.
    */

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


    /*
       Send button.
    */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );
    }


    /*
       Enter = send
       Shift + Enter = new line
    */

    if (input) {

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


    /*
       Escape = close modal.
    */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                isModalOpen()
            ) {

                closeConversation();
            }
        }
    );
}


/* ============================================================
   CLOSE CONVERSATION
============================================================ */

function closeConversation() {

    /*
       Stop polling.
    */

    stopConversationPolling();


    /*
       Invalidate active requests.
    */

    conversationRequestId++;


    conversationLoading = false;

    sendingMessage = false;


    /*
       Hide modal.
    */

    const modal =
        getModal();


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }


    /*
       Clear state.
    */

    currentRecipient = {

        type: null,

        id: null,

        name: null,

        role: null

    };


    /*
       Clear input.
    */

    const input =
        getElement(
            "messageInput"
        );


    if (input) {
        input.value = "";
    }


    /*
       Reset conversation.
    */

    const container =
        getConversationContainer();


    if (container) {

        container.innerHTML = `
            <div class="conversation-loading">

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Loading conversation...

            </div>
        `;
    }


    /*
       Reset recipient header.
    */

    setText(
        "recipientName",
        "-"
    );


    setText(
        "recipientRole",
        "-"
    );


    const avatar =
        getElement(
            "recipientAvatar"
        );


    if (avatar) {

        avatar.innerHTML = `
            <i
                class="fa-solid fa-user"
            ></i>
        `;
    }
}


/* ============================================================
   START POLLING
============================================================ */

function startConversationPolling() {

    stopConversationPolling();


    conversationPolling =
        setInterval(
            async () => {

                /*
                   Stop when modal is closed.
                */

                if (
                    !isModalOpen() ||
                    !currentRecipient.type ||
                    !currentRecipient.id
                ) {

                    stopConversationPolling();

                    return;
                }


                /*
                   Do not overlap requests.
                */

                if (
                    conversationLoading ||
                    sendingMessage
                ) {

                    return;
                }


                await loadConversation();

            },

            POLLING_INTERVAL
        );
}


/* ============================================================
   STOP POLLING
============================================================ */

function stopConversationPolling() {

    if (
        conversationPolling !== null
    ) {

        clearInterval(
            conversationPolling
        );


        conversationPolling = null;
    }
}


/* ============================================================
   DATE / TIME FORMAT
============================================================ */

function formatDateTime(
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

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit"
        }
    );
}


/* ============================================================
   HTML ESCAPING
============================================================ */

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


/* ============================================================
   TOAST
============================================================ */

let toastTimer = null;


function showToast(
    message
) {

    const toast =
        getElement(
            "toast"
        );


    if (!toast) {

        console.warn(
            "Vendor Communication toast:",
            message
        );

        return;
    }


    toast.textContent =
        String(
            message ?? ""
        );


    toast.classList.add(
        "show"
    );


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );
    }


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}


/* ============================================================
   GLOBAL ERROR HANDLING
============================================================ */

window.addEventListener(
    "error",
    event => {

        console.error(
            "VendorCommunication JavaScript error:",
            event.error ||
            event.message
        );
    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "VendorCommunication promise error:",
            event.reason
        );
    }
);


/* ============================================================
   PAGE VISIBILITY
   Stop unnecessary polling when the browser
   tab is hidden.
============================================================ */

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            stopConversationPolling();

            return;
        }


        if (
            isModalOpen() &&
            currentRecipient.type &&
            currentRecipient.id
        ) {

            startConversationPolling();
        }
    }
);


/* ============================================================
   APPLICATION START
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeVendorCommunication,
        {
            once: true
        }
    );

} else {

    initializeVendorCommunication();
}


/* ============================================================
   OPTIONAL GLOBAL FUNCTIONS
   Kept available in case another script
   or existing HTML calls them.
============================================================ */

window.openConversation =
    openConversation;


window.closeConversation =
    closeConversation;


window.sendMessage =
    sendMessage;


window.loadContacts =
    loadContacts;


window.renderContacts =
    renderContacts;