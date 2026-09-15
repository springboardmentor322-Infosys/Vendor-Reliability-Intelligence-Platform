const API_BASE = "http://127.0.0.1:8000";

let supportDashboard = null;


// ============================================================
// GET TOKEN
// ============================================================

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token")
    );

}


// ============================================================
// API FETCH
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
        API_BASE + url,
        {
            ...options,
            headers
        }
    );


    // --------------------------------------------------------
    // UNAUTHORIZED
    // --------------------------------------------------------

    if (response.status === 401) {

        localStorage.removeItem("access_token");
        localStorage.removeItem("token");

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("token");

        window.location.href = "/login";

        return null;
    }


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    const contentType =
        response.headers.get("content-type") || "";

    let data;


    if (contentType.includes("application/json")) {

        data = await response.json();

    } else {

        const text = await response.text();

        throw new Error(
            text || "Server returned an invalid response"
        );

    }


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            "Request failed"
        );

    }


    return data;

}


// ============================================================
// LOAD DASHBOARD
// ============================================================

async function loadSupportDashboard() {

    try {

        const data = await apiFetch(
            "/api/auditor/support/dashboard"
        );

        if (!data) {
            return;
        }

        supportDashboard = data;


        renderUser(
            data.user
        );


        renderCategories(
            data.categories
        );


        renderFAQs(
            data.faqs
        );


        renderResources(
            data.articles
        );


        renderContacts(
            data.contacts
        );


        renderTickets(
            data.tickets
        );


        renderGuides(
            data.articles
        );


    }

    catch (error) {

        console.error(
            "Support dashboard error:",
            error
        );

        showError(
            error.message
        );

    }

}


// ============================================================
// USER
// ============================================================

function renderUser(user) {

    if (!user) {
        return;
    }


    const name =
        user.name || "Auditor";

    const role =
        user.role || "Auditor";


    const sidebarName =
        document.getElementById("sidebarUserName");

    const sidebarRole =
        document.getElementById("sidebarUserRole");

    const headerName =
        document.getElementById("headerUserName");

    const headerRole =
        document.getElementById("headerUserRole");


    if (sidebarName) {
        sidebarName.textContent = name;
    }


    if (sidebarRole) {
        sidebarRole.textContent = role;
    }


    if (headerName) {
        headerName.textContent = name;
    }


    if (headerRole) {
        headerRole.textContent = role;
    }

}


// ============================================================
// ICON HELPER
// ============================================================

function getIcon(icon, fallbackIcon = "fa-solid fa-circle-question") {

    /*
     * Supported values:
     *
     * fa-book-open
     * fa-solid fa-book-open
     * book-open
     *
     * Invalid/empty values use fallbackIcon.
     */


    let iconValue = "";


    if (typeof icon === "string") {

        iconValue = icon.trim();

    }


    let fallbackValue = "";


    if (typeof fallbackIcon === "string") {

        fallbackValue = fallbackIcon.trim();

    }


    // --------------------------------------------------------
    // CLEAN FALLBACK
    // --------------------------------------------------------

    if (!fallbackValue) {

        fallbackValue =
            "fa-solid fa-circle-question";

    }


    if (!fallbackValue.includes("fa-solid")) {

        fallbackValue =
            "fa-solid " + fallbackValue;

    }


    // --------------------------------------------------------
    // INVALID ICON
    // --------------------------------------------------------

    if (!iconValue) {

        return `
            <i class="${escapeHTML(fallbackValue)}"></i>
        `;

    }


    /*
     * IMPORTANT:
     *
     * Do NOT use descriptions such as:
     *
     * "Step-by-step instructions"
     * "Find answers to common questions"
     *
     * as icons.
     *
     * Only accept actual Font Awesome style names.
     */


    const iconLooksValid =
        iconValue.startsWith("fa-") ||
        iconValue.includes("fa-");


    if (!iconLooksValid) {

        return `
            <i class="${escapeHTML(fallbackValue)}"></i>
        `;

    }


    // --------------------------------------------------------
    // NORMALIZE ICON CLASS
    // --------------------------------------------------------

    let classes = iconValue;


    if (!classes.includes("fa-solid") &&
        !classes.includes("fa-regular") &&
        !classes.includes("fa-brands") &&
        !classes.includes("fa-light") &&
        !classes.includes("fa-thin") &&
        !classes.includes("fa-duotone")) {

        classes =
            "fa-solid " + classes;

    }


    return `
        <i class="${escapeHTML(classes)}"></i>
    `;

}


// ============================================================
// CATEGORIES
// ============================================================

function renderCategories(categories) {

    const container =
        document.getElementById(
            "quickHelpGrid"
        );


    if (!container) {

        console.error(
            "quickHelpGrid element not found"
        );

        return;

    }


    container.innerHTML = "";


    const fallbackIcons = [

        "fa-solid fa-book-open",

        "fa-solid fa-circle-question",

        "fa-solid fa-circle-play",

        "fa-solid fa-file-lines",

        "fa-solid fa-download",

        "fa-solid fa-lightbulb"

    ];


    const defaults = [

        {
            name: "User Guides",
            description: "Step-by-step instructions",
            icon: "fa-solid fa-book-open"
        },

        {
            name: "FAQs",
            description: "Find answers to common questions",
            icon: "fa-solid fa-circle-question"
        },

        {
            name: "Video Tutorials",
            description: "Watch short tutorial videos",
            icon: "fa-solid fa-circle-play"
        },

        {
            name: "Release Notes",
            description: "What's new in AuditPro",
            icon: "fa-solid fa-file-lines"
        },

        {
            name: "Downloads",
            description: "Forms, templates and resources",
            icon: "fa-solid fa-download"
        },

        {
            name: "Best Practices",
            description: "Audit tips and best practices",
            icon: "fa-solid fa-lightbulb"
        }

    ];


    const items =
        Array.isArray(categories) &&
        categories.length
            ? categories
            : defaults;


    items
        .slice(0, 6)
        .forEach(
            (item, index) => {

                const card =
                    document.createElement("div");


                card.className =
                    "quick-help-card";


                // ------------------------------------------------
                // IMPORTANT ICON FIX
                // ------------------------------------------------

                const icon =
                    getIcon(
                        item.icon,
                        fallbackIcons[index]
                    );


                card.innerHTML = `

                    <div class="quick-help-icon">

                        ${icon}

                    </div>


                    <h4>
                        ${escapeHTML(
                            item.name || "Help"
                        )}
                    </h4>


                    <p>
                        ${escapeHTML(
                            item.description || ""
                        )}
                    </p>

                `;


                card.addEventListener(
                    "click",
                    () => {

                        searchArticles(
                            item.name
                        );

                    }
                );


                container.appendChild(
                    card
                );

            }
        );

}


// ============================================================
// FAQ
// ============================================================

function renderFAQs(faqs) {

    const container =
        document.getElementById(
            "faqList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(faqs) || !faqs.length) {

        container.innerHTML = `
            <div class="empty-state" style="font-size:11px;">
                No FAQs available.
            </div>
        `;

        return;

    }


    faqs
        .slice(0, 5)
        .forEach(
            faq => {

                const item =
                    document.createElement("div");


                item.className =
                    "faq-item";


                item.innerHTML = `

                    <div class="faq-question">

                        <span>
                            ${escapeHTML(
                                faq.question || ""
                            )}
                        </span>


                        <i class="fa-solid fa-chevron-down"></i>

                    </div>


                    <div class="faq-answer">

                        ${escapeHTML(
                            faq.answer || ""
                        )}

                    </div>

                `;


                const question =
                    item.querySelector(
                        ".faq-question"
                    );


                if (question) {

                    question.addEventListener(
                        "click",
                        () => {

                            item.classList.toggle(
                                "open"
                            );

                        }
                    );

                }


                container.appendChild(
                    item
                );

            }
        );

}


// ============================================================
// RESOURCES
// ============================================================

function renderResources(articles) {

    const container =
        document.getElementById(
            "resourcesGrid"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(articles) || !articles.length) {

        container.innerHTML = `
            <p style="font-size:11px;">No resources available.</p>
        `;

        return;

    }


    articles
        .slice(0, 4)
        .forEach(
            article => {

                const card =
                    document.createElement("div");


                card.className =
                    "resource-card";


                card.innerHTML = `

                    <div class="resource-icon">

                        ${getIcon(
                            article.icon,
                            "fa-solid fa-file-lines"
                        )}

                    </div>


                    <h4>
                        ${escapeHTML(
                            article.title || "Untitled"
                        )}
                    </h4>


                    <p>
                        ${escapeHTML(
                            article.summary || ""
                        )}
                    </p>


                    <div class="resource-footer">

                        <span>
                            Help Article
                        </span>


                        <i class="fa-solid fa-arrow-up-right-from-square"></i>

                    </div>

                `;


                card.addEventListener(
                    "click",
                    () => {

                        openArticle(
                            article.id
                        );

                    }
                );


                container.appendChild(
                    card
                );

            }
        );

}


// ============================================================
// CONTACTS
// ============================================================

function renderContacts(contacts) {

    const container =
        document.getElementById(
            "contactList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(contacts) || !contacts.length) {

        contacts = [

            {
                contact_type: "Ticket",
                title: "Raise a Support Ticket",
                value: "Submit your issue and get help"
            },

            {
                contact_type: "Chat",
                title: "Live Chat",
                value: "Chat with our support team"
            },

            {
                contact_type: "Phone",
                title: "Call Us",
                value: "Mon - Fri, 9:00 AM - 6:00 PM IST"
            },

            {
                contact_type: "Email",
                title: "Email Support",
                value: "We'll respond within 24 hours"
            }

        ];

    }


    contacts.forEach(
        contact => {

            const item =
                document.createElement("div");


            item.className =
                "contact-item";


            const icon =
                getContactIcon(
                    contact.contact_type
                );


            item.innerHTML = `

                <div class="contact-icon">

                    <i class="fa-solid ${icon}"></i>

                </div>


                <div class="contact-info">

                    <strong>
                        ${escapeHTML(
                            contact.title || ""
                        )}
                    </strong>


                    <small>
                        ${escapeHTML(
                            contact.value || ""
                        )}
                    </small>

                </div>


                <i class="fa-solid fa-chevron-right"></i>

            `;


            item.addEventListener(
                "click",
                () => {

                    handleContact(
                        contact
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


// ============================================================
// TICKETS
// ============================================================

function renderTickets(tickets) {

    const openTickets =
        document.getElementById(
            "openTickets"
        );


    const progressTickets =
        document.getElementById(
            "progressTickets"
        );


    const resolvedTickets =
        document.getElementById(
            "resolvedTickets"
        );


    if (openTickets) {

        openTickets.textContent =
            tickets?.open || 0;

    }


    if (progressTickets) {

        progressTickets.textContent =
            tickets?.in_progress || 0;

    }


    if (resolvedTickets) {

        resolvedTickets.textContent =
            tickets?.resolved || 0;

    }


    const container =
        document.getElementById(
            "recentTickets"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !tickets?.recent ||
        !tickets.recent.length
    ) {

        container.innerHTML = `

            <div class="recent-ticket">

                <p>
                    No support tickets found.
                </p>

            </div>

        `;

        return;

    }


    tickets.recent
        .slice(0, 2)
        .forEach(
            ticket => {

                const item =
                    document.createElement("div");


                item.className =
                    "recent-ticket";


                item.innerHTML = `

                    <div class="ticket-top">

                        <strong>
                            #${escapeHTML(
                                ticket.ticket_id
                            )}
                        </strong>


                        <span class="ticket-status">

                            ${escapeHTML(
                                ticket.status || ""
                            )}

                        </span>

                    </div>


                    <p>

                        ${escapeHTML(
                            ticket.subject || ""
                        )}

                    </p>


                    <small>

                        ${formatDate(
                            ticket.created_on
                        )}

                    </small>

                `;


                container.appendChild(
                    item
                );

            }
        );

}


// ============================================================
// GUIDES
// ============================================================

function renderGuides(articles) {

    const container =
        document.getElementById(
            "guidesList"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!Array.isArray(articles) || !articles.length) {

        container.innerHTML = `
            <p style="font-size:10px; margin-top:15px;">No guides available.</p>
        `;

        return;

    }


    articles
        .slice(0, 4)
        .forEach(
            article => {

                const item =
                    document.createElement("div");


                item.className =
                    "guide-item";


                item.innerHTML = `

                    <div class="guide-icon">

                        ${getIcon(
                            article.icon,
                            "fa-solid fa-book"
                        )}

                    </div>


                    <div>

                        <strong>

                            ${escapeHTML(
                                article.title || ""
                            )}

                        </strong>


                        <small>

                            ${escapeHTML(
                                article.summary ||
                                "Step-by-step guide"
                            )}

                        </small>

                    </div>

                `;


                item.addEventListener(
                    "click",
                    () => {

                        openArticle(
                            article.id
                        );

                    }
                );


                container.appendChild(
                    item
                );

            }
        );

}


// ============================================================
// SEARCH ARTICLES
// ============================================================

async function searchArticles(query) {

    if (!query) {
        return;
    }


    try {

        const articles =
            await apiFetch(
                `/api/auditor/support/articles?search=${encodeURIComponent(
                    query
                )}`
            );


        renderResources(
            articles
        );


        const resourcesGrid =
            document.getElementById(
                "resourcesGrid"
            );


        if (resourcesGrid) {

            resourcesGrid.scrollIntoView({
                behavior: "smooth"
            });

        }

    }

    catch (error) {

        console.error(
            "Article search error:",
            error
        );

        alert(
            error.message
        );

    }

}


// ============================================================
// ARTICLE
// ============================================================

async function openArticle(articleId) {

    if (!articleId) {
        return;
    }


    try {

        const article =
            await apiFetch(
                `/api/auditor/support/articles/${articleId}`
            );


        if (!article) {
            return;
        }


        alert(
            `${article.title || "Article"}\n\n${article.content || ""}`
        );

    }

    catch (error) {

        console.error(
            "Open article error:",
            error
        );

    }

}


// ============================================================
// CREATE TICKET
// ============================================================

async function submitSupportTicket(event) {

    event.preventDefault();


    const subjectElement =
        document.getElementById(
            "ticketSubject"
        );


    const categoryElement =
        document.getElementById(
            "ticketCategory"
        );


    const priorityElement =
        document.getElementById(
            "ticketPriority"
        );


    const descriptionElement =
        document.getElementById(
            "ticketDescription"
        );


    if (
        !subjectElement ||
        !categoryElement ||
        !priorityElement ||
        !descriptionElement
    ) {

        alert(
            "Support ticket form elements are missing."
        );

        return;

    }


    const payload = {

        subject:
            subjectElement.value.trim(),

        category:
            categoryElement.value,

        priority:
            priorityElement.value,

        description:
            descriptionElement.value.trim()

    };


    if (!payload.subject) {

        alert(
            "Please enter a subject."
        );

        return;

    }


    if (!payload.description) {

        alert(
            "Please enter a description."
        );

        return;

    }


    try {

        const result =
            await apiFetch(

                "/api/auditor/support/tickets",

                {

                    method: "POST",

                    body: JSON.stringify(
                        payload
                    )

                }

            );


        alert(
            `Support ticket ${
                result?.ticket_id || ""
            } created successfully`
        );


        const form =
            document.getElementById(
                "supportTicketForm"
            );


        if (form) {
            form.reset();
        }


        closeSupportModal();


        await loadSupportDashboard();

    }

    catch (error) {

        console.error(
            "Ticket creation error:",
            error
        );

        alert(
            error.message
        );

    }

}


// ============================================================
// MODAL
// ============================================================

function openSupportModal() {

    const modal =
        document.getElementById(
            "supportModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


function closeSupportModal() {

    const modal =
        document.getElementById(
            "supportModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// ============================================================
// CONTACT ACTION
// ============================================================

function handleContact(contact) {

    const type =
        String(
            contact?.contact_type || ""
        ).toLowerCase();


    if (type.includes("ticket")) {

        openSupportModal();

        return;

    }


    if (type.includes("email")) {

        const email =
            contact?.email ||
            contact?.value ||
            "";


        if (email.includes("@")) {

            window.location.href =
                `mailto:${email}`;

        } else {

            openSupportModal();

        }

        return;

    }


    if (
        type.includes("phone") ||
        type.includes("call")
    ) {

        const phone =
            contact?.phone ||
            contact?.value ||
            "";


        window.location.href =
            `tel:${phone}`;

        return;

    }


    // Chat or unknown contact

    openSupportModal();

}


// ============================================================
// CONTACT ICON
// ============================================================

function getContactIcon(type) {

    const value =
        String(type || "")
            .toLowerCase();


    if (
        value.includes("ticket")
    ) {

        return "fa-ticket";

    }


    if (
        value.includes("chat")
    ) {

        return "fa-comments";

    }


    if (
        value.includes("phone") ||
        value.includes("call")
    ) {

        return "fa-phone";

    }


    if (
        value.includes("email")
    ) {

        return "fa-envelope";

    }


    return "fa-headset";

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "";
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value == null
            ? ""
            : String(value);


    return div.innerHTML;

}


// ============================================================
// ERROR
// ============================================================

function showError(message) {

    console.error(
        "Help & Support:",
        message
    );


    const container =
        document.getElementById(
            "quickHelpGrid"
        );


    if (container) {

        container.innerHTML = `

            <div class="empty-state">

                Unable to load Help & Support.

                <br>

                <small>
                    ${escapeHTML(message || "")}
                </small>

            </div>

        `;

    }

}


// ============================================================
// SAFE EVENT LISTENER
// ============================================================

function addClickListener(
    elementId,
    callback
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        console.warn(
            `Element #${elementId} not found`
        );

        return;

    }


    element.addEventListener(
        "click",
        callback
    );

}


// ============================================================
// EVENTS
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        // ----------------------------------------------------
        // LOAD DASHBOARD
        // ----------------------------------------------------

        loadSupportDashboard();


        // ----------------------------------------------------
        // SEARCH BUTTON
        // ----------------------------------------------------

        addClickListener(
            "helpSearchBtn",
            () => {

                const input =
                    document.getElementById(
                        "helpSearchInput"
                    );


                if (!input) {
                    return;
                }


                const query =
                    input.value.trim();


                if (query) {

                    searchArticles(
                        query
                    );

                }

            }
        );


        // ----------------------------------------------------
        // SEARCH ENTER
        // ----------------------------------------------------

        const searchInput =
            document.getElementById(
                "helpSearchInput"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "keypress",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        event.preventDefault();

                        const button =
                            document.getElementById(
                                "helpSearchBtn"
                            );


                        if (button) {

                            button.click();

                        }

                    }

                }
            );

        }


        // ----------------------------------------------------
        // CONTACT SUPPORT
        // ----------------------------------------------------

        addClickListener(
            "contactSupportBtn",
            openSupportModal
        );


        // ----------------------------------------------------
        // CLOSE MODAL
        // ----------------------------------------------------

        addClickListener(
            "closeModal",
            closeSupportModal
        );


        // ----------------------------------------------------
        // SUPPORT TICKET FORM
        // ----------------------------------------------------

        const supportForm =
            document.getElementById(
                "supportTicketForm"
            );


        if (supportForm) {

            supportForm.addEventListener(
                "submit",
                submitSupportTicket
            );

        }


        // ----------------------------------------------------
        // VIEW ALL TICKETS
        // ----------------------------------------------------

       /* addClickListener(
            "viewAllTickets",
            () => {

                window.location.href =
                    "/support-tickets";

            }
        );*/


        // ----------------------------------------------------
        // VIEW ALL FAQS
        // ----------------------------------------------------

        addClickListener(
            "viewAllFaqs",
            () => {

                const faqList =
                    document.getElementById(
                        "faqList"
                    );


                if (faqList) {

                    faqList.scrollIntoView({
                        behavior: "smooth"
                    });

                }

            }
        );


        // ----------------------------------------------------
        // CLOSE MODAL WHEN CLICKING OUTSIDE
        // ----------------------------------------------------

        const modal =
            document.getElementById(
                "supportModal"
            );


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        closeSupportModal();

                    }

                }
            );

        }

    }
);