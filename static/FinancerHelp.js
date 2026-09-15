const API = "/api";

const $ = (id) => document.getElementById(id);

let state = {
    user: null,
    categories: [],
    faqs: [],
    articles: [],
    contacts: [],
    services: [],
    quickLinks: [],
    currentArticleId: null
};


/* =========================================================
   API
========================================================= */

async function apiFetch(url, options = {}) {

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token");

    const headers = {
        ...(options.body instanceof FormData
            ? {}
            : {
                "Content-Type": "application/json"
            }),
        ...(options.headers || {})
    };

    // Add JWT authorization if available
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        if (response.status === 401) {

            console.error(
                "Authentication failed. Token:",
                token ? "Present" : "Missing"
            );

            throw new Error(
                data.detail || "Not authenticated"
            );
        }

        throw new Error(
            data.detail ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   ICON HELPERS
========================================================= */

function categoryIcon(icon, name = "") {

    if (icon) {

        if (icon.includes("fa-")) {
            return `<i class="${escapeHtml(icon)}"></i>`;
        }

        return `<i class="fa-solid fa-${escapeHtml(icon)}"></i>`;
    }

    const value = name.toLowerCase();

    if (value.includes("finance"))
        return `<i class="fa-solid fa-money-bill-wave"></i>`;

    if (value.includes("report"))
        return `<i class="fa-solid fa-file-lines"></i>`;

    if (value.includes("user"))
        return `<i class="fa-solid fa-users"></i>`;

    if (value.includes("setting"))
        return `<i class="fa-solid fa-gear"></i>`;

    if (value.includes("trouble"))
        return `<i class="fa-solid fa-life-ring"></i>`;

    return `<i class="fa-solid fa-circle-question"></i>`;
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const data = await apiFetch(
            `${API}/finance/support/dashboard`
        );

        state.user = data.user || {};
        state.categories = data.categories || [];
        state.faqs = data.faqs || [];
        state.articles = data.articles || [];
        state.contacts = data.contacts || [];
        state.services = data.services || [];
        state.quickLinks = data.quick_links || [];

        renderUser();
        renderCategories();
        renderFaqs();
        renderArticles();
        renderContacts();
        renderServices();
        renderQuickLinks();

    } catch (error) {

        console.error(
            "Help & Support load error:",
            error
        );

        showGlobalError(
            error.message
        );
    }
}


/* =========================================================
   USER
========================================================= */

function renderUser() {

    const name =
        state.user.name ||
        "Finance Officer";

    const role =
        state.user.role ||
        "Finance Officer";

    $("sidebarUserName").textContent = name;
    $("sidebarUserRole").textContent = role;

    $("headerUserName").textContent = name;
    $("headerUserRole").textContent = role;
}


/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories() {

    const container =
        $("categoriesContainer");

    if (!state.categories.length) {

        container.innerHTML = `
            <div class="loading">
                No help topics available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.categories
            .map(category => {

                const color =
                    category.color ||
                    "#eef5ff";

                return `
                    <div
                        class="category-card"
                        data-category="${escapeHtml(category.name)}"
                    >

                        <div
                            class="category-icon"
                            style="background:${escapeHtml(color)}"
                        >
                            ${categoryIcon(
                                category.icon,
                                category.name
                            )}
                        </div>

                        <h4>
                            ${escapeHtml(category.name)}
                        </h4>

                        <p>
                            ${escapeHtml(
                                category.description ||
                                "Find helpful information and guides."
                            )}
                        </p>

                    </div>
                `;
            })
            .join("");

    container
        .querySelectorAll(".category-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const category =
                        card.dataset.category;

                    searchArticles(
                        category
                    );
                }
            );
        });
}


/* =========================================================
   FAQ
========================================================= */

function renderFaqs() {

    const container =
        $("faqContainer");

    if (!state.faqs.length) {

        container.innerHTML = `
            <div class="loading">
                No FAQs available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.faqs
            .map(faq => {

                return `
                    <div
                        class="faq-item"
                        data-id="${faq.id}"
                    >

                        <button class="faq-question">

                            <span>
                                ${escapeHtml(
                                    faq.question
                                )}
                            </span>

                            <i class="fa-solid fa-chevron-down"></i>

                        </button>

                        <div class="faq-answer">
                            ${escapeHtml(
                                faq.answer
                            )}
                        </div>

                    </div>
                `;
            })
            .join("");

    container
        .querySelectorAll(".faq-question")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const item =
                        button.closest(".faq-item");

                    item.classList.toggle("open");
                }
            );
        });
}


/* =========================================================
   ARTICLES
========================================================= */

function renderArticles() {

    const container =
        $("recentArticles");

    if (!state.articles.length) {

        container.innerHTML = `
            <div class="loading">
                No help articles available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.articles
            .slice(0, 5)
            .map(article => {

                return `
                    <div
                        class="article-row"
                        data-id="${article.id}"
                    >

                        <div class="article-icon">
                            <i class="fa-regular fa-file-lines"></i>
                        </div>

                        <div class="article-info">

                            <strong>
                                ${escapeHtml(
                                    article.title
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    article.category ||
                                    "Help"
                                )}
                            </span>

                        </div>

                        <span class="article-date">
                            ${formatDate(
                                article.created_at
                            )}
                        </span>

                    </div>
                `;
            })
            .join("");

    container
        .querySelectorAll(".article-row")
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    openArticle(
                        Number(row.dataset.id)
                    );
                }
            );
        });
}


/* =========================================================
   CONTACTS
========================================================= */

function renderContacts() {

    const container =
        $("contactsContainer");

    if (!state.contacts.length) {

        container.innerHTML = `
            <div class="loading">
                No support contacts available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.contacts
            .map(contact => {

                const type =
                    String(
                        contact.contact_type ||
                        ""
                    ).toLowerCase();

                let icon =
                    "fa-headset";

                if (type.includes("email"))
                    icon = "fa-envelope";

                if (type.includes("phone"))
                    icon = "fa-phone";

                if (type.includes("chat"))
                    icon = "fa-comment";

                if (type.includes("ticket"))
                    icon = "fa-ticket";

                return `
                    <div
                        class="contact-item"
                        data-type="${escapeHtml(type)}"
                        data-value="${escapeHtml(contact.value)}"
                    >

                        <div class="contact-icon">
                            <i class="fa-solid ${icon}"></i>
                        </div>

                        <div class="contact-info">

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

                            <small>
                                ${escapeHtml(
                                    contact.description ||
                                    ""
                                )}
                            </small>

                        </div>

                        <i class="fa-solid fa-chevron-right"></i>

                    </div>
                `;
            })
            .join("");

    container
        .querySelectorAll(".contact-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const type =
                        item.dataset.type;

                    const value =
                        item.dataset.value;

                    handleContact(
                        type,
                        value
                    );
                }
            );
        });
}


/* =========================================================
   CONTACT ACTION
========================================================= */

function handleContact(type, value) {

    if (type.includes("email")) {

        window.location.href =
            `mailto:${value}`;

        return;
    }

    if (type.includes("phone")) {

        window.location.href =
            `tel:${value}`;

        return;
    }

    if (type.includes("ticket")) {

        openTicketModal();

        return;
    }

    if (type.includes("chat")) {

        alert(
            "Live chat support will be available shortly."
        );

        return;
    }

    openTicketModal();
}


/* =========================================================
   SERVICES
========================================================= */

function renderServices() {

    const container =
        $("servicesContainer");

    if (!state.services.length) {

        $("overallStatus").innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>No service status available</span>
        `;

        container.innerHTML = "";

        return;
    }

    const operational =
        state.services.every(
            service =>
                String(service.status)
                    .toLowerCase()
                    === "operational"
        );

    $("overallStatus").innerHTML = `
        <i class="fa-solid ${
            operational
                ? "fa-check"
                : "fa-triangle-exclamation"
        }"></i>

        <span>
            ${
                operational
                    ? "All systems operational"
                    : "Some systems are experiencing issues"
            }
        </span>
    `;

    container.innerHTML =
        state.services
            .map(service => {

                const status =
                    String(
                        service.status || ""
                    ).toLowerCase();

                const good =
                    status === "operational";

                return `
                    <div class="service-row">

                        <div class="service-name">

                            <i class="fa-solid ${
                                good
                                    ? "fa-database"
                                    : "fa-triangle-exclamation"
                            }"></i>

                            <span>
                                ${escapeHtml(
                                    service.name
                                )}
                            </span>

                        </div>

                        <span class="service-status">
                            ${escapeHtml(
                                service.status
                            )}
                        </span>

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   QUICK LINKS
========================================================= */

function renderQuickLinks() {

    const container =
        $("quickLinksContainer");

    if (!state.quickLinks.length) {

        container.innerHTML = `
            <div class="loading">
                No quick links available.
            </div>
        `;

        return;
    }

    container.innerHTML =
        state.quickLinks
            .map(link => {

                return `
                    <a
                        class="quick-link"
                        href="${escapeHtml(
                            link.url || "#"
                        )}"
                    >

                        <div class="quick-link-icon">

                            ${categoryIcon(
                                link.icon,
                                link.title
                            )}

                        </div>

                        <span>
                            ${escapeHtml(
                                link.title
                            )}
                        </span>

                        <i class="fa-solid fa-chevron-right"></i>

                    </a>
                `;
            })
            .join("");
}


/* =========================================================
   SEARCH
========================================================= */

async function searchArticles(searchValue) {

    const search =
        String(searchValue || "").trim();

    $("articleSearch").value = search;

    try {

        const params =
            new URLSearchParams();

        if (search)
            params.set("search", search);

        const data =
            await apiFetch(
                `${API}/finance/support/articles?${params}`
            );

        state.articles =
            Array.isArray(data)
                ? data
                : [];

        renderArticles();

    } catch (error) {

        console.error(
            "Article search error:",
            error
        );
    }
}


/* =========================================================
   OPEN ARTICLE
========================================================= */

async function openArticle(articleId) {

    try {

        const article =
            await apiFetch(
                `${API}/finance/support/articles/${articleId}`
            );

        state.currentArticleId =
            article.id;

        $("articleCategory")
            .textContent =
            article.category ||
            "Help Article";

        $("articleTitle")
            .textContent =
            article.title;

        $("articleContent")
            .innerHTML =
            `
                <p>
                    ${escapeHtml(
                        article.summary || ""
                    )}
                </p>

                <div>
                    ${escapeHtml(
                        article.content || ""
                    ).replaceAll(
                        "\n",
                        "<br>"
                    )}
                </div>
            `;

        $("articleModal")
            .classList.remove("hidden");

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   TICKET MODAL
========================================================= */

function openTicketModal() {

    $("ticketModal")
        .classList.remove("hidden");

    $("ticketMessage").textContent = "";

    $("ticketMessage")
        .className =
        "form-message";
}

function closeTicketModal() {

    $("ticketModal")
        .classList.add("hidden");
}

async function submitTicket(event) {

    event.preventDefault();

    const message =
        $("ticketMessage");

    message.textContent =
        "Submitting your ticket...";

    message.className =
        "form-message";

    const payload = {

        subject:
            $("ticketSubject")
                .value
                .trim(),

        description:
            $("ticketDescription")
                .value
                .trim(),

        category:
            $("ticketCategory")
                .value,

        priority:
            $("ticketPriority")
                .value

    };

    try {

        const ticket =
            await apiFetch(
                `${API}/finance/support/tickets`,
                {
                    method: "POST",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

        const file =
            $("ticketAttachment").files[0];

        if (file && ticket.id) {

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            await apiFetch(
                `${API}/finance/support/tickets/${ticket.id}/attachments`,
                {
                    method: "POST",
                    body: formData
                }
            );
        }

        message.textContent =
            `Ticket ${ticket.ticket_id} created successfully.`;

        message.className =
            "form-message success";

        $("ticketForm").reset();

        setTimeout(() => {

            closeTicketModal();

        }, 1800);

    } catch (error) {

        console.error(
            "Ticket creation error:",
            error
        );

        message.textContent =
            error.message;

        message.className =
            "form-message error";
    }
}


/* =========================================================
   ARTICLE FEEDBACK
========================================================= */

async function submitArticleFeedback(
    helpful
) {

    if (!state.currentArticleId)
        return;

    try {

        await apiFetch(
            `${API}/finance/support/articles/${state.currentArticleId}/helpful?helpful=${helpful}`,
            {
                method: "POST"
            }
        );

        alert(
            "Thank you for your feedback."
        );

    } catch (error) {

        console.error(
            "Feedback error:",
            error
        );
    }
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value)
        return "";

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    ))
        return "";

    return new Intl.DateTimeFormat(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(date);
}


/* =========================================================
   GLOBAL ERROR
========================================================= */

function showGlobalError(message) {

    console.error(
        "Help Support:",
        message
    );

    const containers = [
        "categoriesContainer",
        "faqContainer",
        "recentArticles",
        "contactsContainer",
        "servicesContainer",
        "quickLinksContainer"
    ];

    containers.forEach(id => {

        const element = $(id);

        if (element) {

            element.innerHTML = `
                <div class="loading">
                    Unable to load data.
                    Please refresh the page.
                </div>
            `;
        }
    });
}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDashboard();

        $("searchButton")
            .addEventListener(
                "click",
                () => {

                    searchArticles(
                        $("articleSearch")
                            .value
                    );
                }
            );

        $("articleSearch")
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        searchArticles(
                            event.target.value
                        );
                    }
                }
            );

        $("globalSearch")
            .addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter"
                    ) {

                        $("articleSearch")
                            .value =
                            event.target.value;

                        searchArticles(
                            event.target.value
                        );
                    }
                }
            );

        document
            .querySelectorAll(
                ".popular-searches button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        searchArticles(
                            button.dataset.search
                        );
                    }
                );
            });

        $("contactSupportButton")
            .addEventListener(
                "click",
                openTicketModal
            );

        $("closeTicketModal")
            .addEventListener(
                "click",
                closeTicketModal
            );

        $("cancelTicket")
            .addEventListener(
                "click",
                closeTicketModal
            );

        $("ticketForm")
            .addEventListener(
                "submit",
                submitTicket
            );

        $("closeArticleModal")
            .addEventListener(
                "click",
                () => {

                    $("articleModal")
                        .classList.add("hidden");
                }
            );

        $("articleYes")
            .addEventListener(
                "click",
                () => {

                    submitArticleFeedback(
                        true
                    );
                }
            );

        $("articleNo")
            .addEventListener(
                "click",
                () => {

                    submitArticleFeedback(
                        false
                    );
                }
            );

        $("statusPageButton")
            .addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            ".right-column"
                        )
                        .scrollIntoView({
                            behavior: "smooth"
                        });
                }
            );

        $("viewAllFaqs")
            .addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            "#faqContainer"
                        )
                        .scrollIntoView({
                            behavior: "smooth"
                        });
                }
            );

        $("viewAllArticles")
            .addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            "#recentArticles"
                        )
                        .scrollIntoView({
                            behavior: "smooth"
                        });
                }
            );

        $("ticketModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("ticketModal")
                    ) {
                        closeTicketModal();
                    }
                }
            );

        $("articleModal")
            .addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        $("articleModal")
                    ) {
                        $("articleModal")
                            .classList.add("hidden");
                    }
                }
            );
    }
);