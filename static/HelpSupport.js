/* ==========================================================
   VENDORIQ
   HELP & SUPPORT JAVASCRIPT
========================================================== */


/* ==========================================================
   API
========================================================== */

const API =
    "http://127.0.0.1:8000";


/* ==========================================================
   AUTH TOKEN
========================================================== */

function getToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("token") ||

        localStorage.getItem("accessToken") ||

        localStorage.getItem("jwt_token") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("token") ||

        sessionStorage.getItem("accessToken") ||

        ""

    );

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getToken();

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers[
            "Authorization"
        ] =
            `Bearer ${token}`;

    }


    console.log(
        "API REQUEST:",
        API + url
    );


    const response =
        await fetch(
            API + url,
            {
                ...options,
                headers
            }
        );


    console.log(
        "API STATUS:",
        response.status
    );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    }

    catch {

        data = {
            detail: text
        };

    }


    if (!response.ok) {

        console.error(
            "API ERROR:",
            data
        );

        throw new Error(

            data.detail
                ? (
                    typeof data.detail === "string"
                        ? data.detail
                        : JSON.stringify(data.detail)
                )
                : `HTTP ${response.status}`

        );

    }


    return data;

}


/* ==========================================================
   LOAD STATISTICS
========================================================== */

async function loadStatistics() {

    try {

        const data =
            await apiFetch(
                "/api/support/statistics"
            );


        document.getElementById(
            "openTickets"
        ).textContent =
            data.open_tickets;


        document.getElementById(
            "resolvedTickets"
        ).textContent =
            data.resolved_tickets;


        document.getElementById(
            "responseTime"
        ).textContent =
            data.avg_response_time;


        document.getElementById(
            "satisfaction"
        ).textContent =
            data.customer_satisfaction;


        document.getElementById(
            "availability"
        ).textContent =
            data.support_availability;


    }

    catch (error) {

        console.error(
            "Unable to load support statistics:",
            error
        );

    }

}


/* ==========================================================
   LOAD FAQS
========================================================== */

async function loadFAQs(
    search = ""
) {

    const container =
        document.getElementById(
            "faqContainer"
        );


    try {

        container.innerHTML = `
            <div class="loading">
                Loading FAQs...
            </div>
        `;


        let url =
            "/api/support/faqs";


        if (search.trim()) {

            url +=
                "?search=" +
                encodeURIComponent(
                    search
                );

        }


        const faqs =
            await apiFetch(url);


        if (!faqs.length) {

            container.innerHTML = `
                <div class="loading">
                    No FAQs found.
                </div>
            `;

            return;

        }


        container.innerHTML =
            faqs.map(
                faq => `

                <div
                    class="faq-item"
                    data-id="${faq.id}"
                >

                    <div
                        class="faq-question"
                        onclick="toggleFAQ(this)"
                    >

                        <span>
                            ${escapeHtml(
                                faq.question
                            )}
                        </span>

                        <i class="
                            fa-solid
                            fa-chevron-down
                        "></i>

                    </div>

                    <div class="faq-answer">

                        ${escapeHtml(
                            faq.answer
                        )}

                    </div>

                </div>

            `
            ).join("");


    }

    catch (error) {

        console.error(
            "Unable to load FAQs:",
            error
        );


        container.innerHTML = `
            <div class="loading">
                Unable to load FAQs.
            </div>
        `;

    }

}


/* ==========================================================
   TOGGLE FAQ
========================================================== */

function toggleFAQ(element) {

    const item =
        element.closest(
            ".faq-item"
        );


    const allItems =
        document.querySelectorAll(
            ".faq-item"
        );


    allItems.forEach(
        other => {

            if (
                other !== item
            ) {

                other.classList.remove(
                    "open"
                );

            }

        }
    );


    item.classList.toggle(
        "open"
    );

}


/* ==========================================================
   LOAD QUICK LINKS
========================================================== */

async function loadQuickLinks() {

    const container =
        document.getElementById(
            "quickLinksContainer"
        );


    try {

        const links =
            await apiFetch(
                "/api/support/quick-links"
            );


        if (!links.length) {

            container.innerHTML = `
                <div class="loading">
                    No quick links available.
                </div>
            `;

            return;

        }


        container.innerHTML =
            links.map(
                link => `

                <div
                    class="quick-link"
                    onclick="openQuickLink('${escapeAttribute(link.url || "#")}')"
                >

                    <div class="quick-link-icon">

                        <i class="
                            ${escapeAttribute(
                                link.icon ||
                                "fa-solid fa-link"
                            )}
                        "></i>

                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                link.title
                            )}
                        </strong>

                        <p>
                            ${escapeHtml(
                                link.description || ""
                            )}
                        </p>

                    </div>

                </div>

            `
            ).join("");


    }

    catch (error) {

        console.error(
            "Unable to load quick links:",
            error
        );

    }

}


/* ==========================================================
   LOAD CONTACTS
========================================================== */

async function loadContacts() {

    try {

        const contacts =
            await apiFetch(
                "/api/support/contacts"
            );


        if (!contacts.length) {

            return;

        }


        const container =
            document.getElementById(
                "contactsContainer"
            );


        container.innerHTML =
            contacts.map(
                contact => `

                <div class="contact-row">

                    <div class="contact-icon">

                        <i class="
                            ${getContactIcon(
                                contact.contact_type
                            )}
                        "></i>

                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                contact.title
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                contact.value
                            )}
                        </span>

                    </div>

                    <small>
                        ${escapeHtml(
                            contact.description || ""
                        )}
                    </small>

                </div>

            `
            ).join("");

    }

    catch (error) {

        console.error(
            "Unable to load contacts:",
            error
        );

    }

}


/* ==========================================================
   CONTACT ICON
========================================================== */

function getContactIcon(
    type
) {

    const value =
        String(
            type || ""
        ).toLowerCase();


    if (
        value.includes("phone")
    ) {

        return "fa-solid fa-phone";

    }


    if (
        value.includes("hour")
    ) {

        return "fa-regular fa-clock";

    }


    return "fa-solid fa-envelope";

}


/* ==========================================================
   LOAD TICKETS
========================================================== */

async function loadTickets(
    page = 1
) {

    const tbody =
        document.getElementById(
            "ticketTableBody"
        );


    try {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    Loading tickets...
                </td>
            </tr>
        `;


        const tickets =
            await apiFetch(
                `/api/support/tickets?page=${page}&limit=10`
            );


        if (!tickets.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        style="text-align:center"
                    >
                        No support tickets found.
                    </td>
                </tr>
            `;

            return;

        }


        tbody.innerHTML =
            tickets.map(
                ticket => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                ticket.ticket_id
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            ticket.subject
                        )}
                    </td>

                    <td>
                        <span class="
                            priority
                            ${getPriorityClass(
                                ticket.priority
                            )}
                        ">
                            ${escapeHtml(
                                ticket.priority
                            )}
                        </span>
                    </td>

                    <td>
                        <span class="
                            status
                            ${getStatusClass(
                                ticket.status
                            )}
                        ">
                            ${escapeHtml(
                                ticket.status
                            )}
                        </span>
                    </td>

                    <td>
                        ${formatDate(
                            ticket.created_on
                        )}
                    </td>

                    <td>
                        ${formatDate(
                            ticket.updated_on
                        )}
                    </td>

                </tr>

            `
            ).join("");

    }

    catch (error) {

        console.error(
            "Unable to load tickets:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="text-align:center"
                >
                    Unable to load tickets.
                </td>
            </tr>
        `;

    }

}


/* ==========================================================
   CREATE SUPPORT TICKET
========================================================== */

async function createSupportTicket(
    event
) {

    event.preventDefault();


    const subject =
        document.getElementById(
            "ticketSubject"
        ).value.trim();


    const category =
        document.getElementById(
            "ticketCategory"
        ).value;


    const description =
        document.getElementById(
            "ticketDescription"
        ).value.trim();


    const priority =
        document.getElementById(
            "ticketPriority"
        ).value;


    if (
        !subject ||
        !category ||
        !description
    ) {

        showToast(
            "Please fill in all required fields.",
            "error"
        );

        return;

    }


    const button =
        document.querySelector(
            ".submit-ticket-btn"
        );


    button.disabled = true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Creating Ticket...
    `;


    try {

        const data =
            await apiFetch(
                "/api/support/tickets",
                {
                    method: "POST",

                    body: JSON.stringify({

                        subject,

                        category,

                        description,

                        priority,

                        created_by:
                            getCurrentUser()

                    })

                }
            );


        showToast(

            `Ticket ${data.ticket_id} created successfully.`,

            "success"

        );


        document.getElementById(
            "supportTicketForm"
        ).reset();


        await loadTickets();

        await loadStatistics();


    }

    catch (error) {

        console.error(
            "Ticket creation failed:",
            error
        );


        showToast(
            error.message ||
            "Unable to create ticket.",
            "error"
        );

    }

    finally {

        button.disabled = false;

        button.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            Submit Ticket
        `;

    }

}


/* ==========================================================
   CURRENT USER
========================================================== */

function getCurrentUser() {

    return (

        localStorage.getItem(
            "admin_email"
        ) ||

        localStorage.getItem(
            "email"
        ) ||

        "admin@vendoriq.com"

    );

}


/* ==========================================================
   PRIORITY CLASS
========================================================== */

function getPriorityClass(
    priority
) {

    switch (
        String(
            priority || ""
        ).toLowerCase()
    ) {

        case "high":
            return "priority-high";

        case "low":
            return "priority-low";

        default:
            return "priority-medium";

    }

}


/* ==========================================================
   STATUS CLASS
========================================================== */

function getStatusClass(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();


    if (
        value === "resolved" ||
        value === "closed"
    ) {

        return "status-resolved";

    }


    if (
        value.includes("progress")
    ) {

        return "status-progress";

    }


    return "status-open";

}


/* ==========================================================
   DATE FORMAT
========================================================== */

function formatDate(
    value
) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(value);


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


/* ==========================================================
   ESCAPE HTML
========================================================== */

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


/* ==========================================================
   ESCAPE ATTRIBUTE
========================================================== */

function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )

    .replace(
        /\\/g,
        "\\\\"
    )

    .replace(
        /'/g,
        "\\'"
    );

}


/* ==========================================================
   KNOWLEDGE BASE
========================================================== */

function openKnowledgeBase() {

    showToast(
        "Knowledge Base opened.",
        "info"
    );

}


/* ==========================================================
   SCROLL TO TICKET
========================================================== */

function scrollToTicketForm() {

    const element =
        document.getElementById(
            "ticketForm"
        );


    element.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    setTimeout(
        () => {

            document.getElementById(
                "ticketSubject"
            ).focus();

        },
        500
    );

}


/* ==========================================================
   LIVE CHAT
========================================================== */

function startLiveChat() {

    showToast(
        "A support agent will connect with you shortly.",
        "success"
    );

}


/* ==========================================================
   QUICK LINK
========================================================== */

function openQuickLink(
    url
) {

    if (
        !url ||
        url === "#"
    ) {

        showToast(
            "This resource is not configured yet.",
            "info"
        );

        return;

    }


    window.open(
        url,
        "_blank"
    );

}


/* ==========================================================
   TOAST
========================================================== */

function showToast(
    message,
    type = "info"
) {

    let toast =
        document.getElementById(
            "supportToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "supportToast";

        toast.style.position =
            "fixed";

        toast.style.right =
            "25px";

        toast.style.bottom =
            "25px";

        toast.style.zIndex =
            "99999";

        toast.style.padding =
            "13px 18px";

        toast.style.borderRadius =
            "8px";

        toast.style.color =
            "white";

        toast.style.fontSize =
            "12px";

        toast.style.boxShadow =
            "0 8px 25px rgba(0,0,0,.15)";

        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    if (
        type === "success"
    ) {

        toast.style.background =
            "#149967";

    }

    else if (
        type === "error"
    ) {

        toast.style.background =
            "#e54848";

    }

    else {

        toast.style.background =
            "#5220e8";

    }


    toast.style.display =
        "block";


    clearTimeout(
        window.supportToastTimer
    );


    window.supportToastTimer =
        setTimeout(
            () => {

                toast.style.display =
                    "none";

            },
            3500
        );

}


/* ==========================================================
   FAQ SEARCH
========================================================== */

let faqSearchTimer = null;


function setupFAQSearch() {

    const input =
        document.getElementById(
            "faqSearch"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "input",
        function () {

            clearTimeout(
                faqSearchTimer
            );


            faqSearchTimer =
                setTimeout(
                    () => {

                        loadFAQs(
                            input.value
                        );

                    },
                    300
                );

        }
    );

}


/* ==========================================================
   GLOBAL SEARCH
========================================================== */

function setupGlobalSearch() {

    const input =
        document.getElementById(
            "globalSearch"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                const search =
                    input.value.trim();


                if (!search) {

                    return;

                }


                document.getElementById(
                    "faqSearch"
                ).value =
                    search;


                loadFAQs(
                    search
                );


                document.getElementById(
                    "faqContainer"
                ).scrollIntoView({
                    behavior: "smooth"
                });

            }

        }
    );

}


/* ==========================================================
   INITIALIZE
========================================================== */

async function initializeHelpSupport() {

    console.log(
        "Initializing Help & Support..."
    );


    await Promise.allSettled([

        loadStatistics(),

        loadFAQs(),

        loadQuickLinks(),

        loadContacts(),

        loadTickets(),

        loadAdminProfile()

    ]);


    setupFAQSearch();

    setupGlobalSearch();


    const form =
        document.getElementById(
            "supportTicketForm"
        );


    if (form) {

        form.addEventListener(
            "submit",
            createSupportTicket
        );

    }


    console.log(
        "Help & Support initialized."
    );

}


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeHelpSupport
);


function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function openAdminProfile() {

    window.location.href =
        "/admin/profile";

}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


    setText(
        "headerName",
        name
    );

    setText(
        "headerRole",
        role
    );


    setText(
        "sidebarName",
        name
    );

    setText(
        "sidebarEmail",
        email
    );
}


async function loadAdminProfile() {

    try {

        const data = await apiFetch(
            "/adminprofile"
        );

        console.log(
            "Admin profile:",
            data
        );

        // If API returns:
        // { name, email, role }
        updateHeader(data);

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }
}