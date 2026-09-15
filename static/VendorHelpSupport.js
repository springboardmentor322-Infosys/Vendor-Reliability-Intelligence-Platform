// ==========================================================
// VendorIQ - Vendor Help & Support
// VendorHelpSupport.js
// ==========================================================

"use strict";

// ==========================================================
// API CONFIGURATION
// ==========================================================

const API_BASE = "http://127.0.0.1:8000";

// ==========================================================
// CURRENT VENDOR
// ==========================================================

const vendorId =
    localStorage.getItem("vendor_id") ||
    sessionStorage.getItem("vendor_id") ||
    null;

if (!vendorId) {
    console.error("❌ Vendor ID not found. Please login again.");

    // Do not immediately redirect if this page is being
    // loaded from a different frontend route.
    setTimeout(() => {
        window.location.href = "/login";
    }, 100);
}

let dashboardData = null;
let currentArticleId = null;

// ==========================================================
// AUTHENTICATION
// ==========================================================

function getAccessToken() {

    const tokenKeys = [
        "access_token",
        "token",
        "jwt_token",
        "vendor_token"
    ];

    // Then check sessionStorage
    for (const key of tokenKeys) {

        const token =
            sessionStorage.getItem(key);

        if (token && token.trim()) {
            return token.trim();
        }
    }

    return null;
}


// ==========================================================
// CLEAR INVALID AUTHENTICATION
// ==========================================================

function clearAuthentication() {

    const tokenKeys = [
        "access_token",
        "token",
        "jwt_token",
        "vendor_token"
    ];

    tokenKeys.forEach(key => {

        localStorage.removeItem(key);
        sessionStorage.removeItem(key);

    });
}


// ==========================================================
// REDIRECT TO LOGIN
// ==========================================================

function redirectToLogin() {

    clearAuthentication();

    /*
     * Prevent redirect loops if /login itself is already
     * the current page.
     */
    if (
        !window.location.pathname.endsWith("/login") &&
        window.location.pathname !== "/login"
    ) {

        setTimeout(() => {
            window.location.href = "/login";
        }, 500);
    }
}


// ==========================================================
// API HELPER
// ==========================================================

async function apiFetch(endpoint, options = {}) {

    const token = getAccessToken();

    const headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    /*
     * Only send JSON content type when a request has a body.
     */
    if (
        options.body &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";
    }

    /*
     * Add JWT authorization header.
     */
    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    console.log(
        `🌐 API Request: ${options.method || "GET"} ${endpoint}`
    );

    console.log(
        "🔐 JWT:",
        token ? "Available" : "Missing"
    );

    let response;

    try {

        response = await fetch(
            `${API_BASE}${endpoint}`,
            {
                ...options,
                credentials: "include",
                headers
            }
        );

    } catch (networkError) {

        console.error(
            "❌ Network error:",
            networkError
        );

        throw new Error(
            "Unable to connect to the server. Please make sure the FastAPI server is running."
        );
    }

    // ======================================================
    // RESPONSE BODY
    // ======================================================

    let responseData = null;

    const contentType =
        response.headers.get("content-type") || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            responseData =
                await response.json();

        } catch (error) {

            responseData = null;
        }

    } else {

        try {

            const text =
                await response.text();

            responseData =
                text || null;

        } catch (error) {

            responseData = null;
        }
    }

    // ======================================================
    // 401 UNAUTHORIZED
    // ======================================================

    if (response.status === 401) {

        console.error(
            "❌ 401 Unauthorized"
        );

        console.error(
            "Endpoint:",
            endpoint
        );

        console.error(
            "Token available:",
            token ? "YES" : "NO"
        );

        console.error(
            "FastAPI response:",
            responseData
        );

        /*
         * A 401 from FastAPI normally means:
         *
         * - expired JWT
         * - invalid JWT
         * - wrong SECRET_KEY
         * - wrong JWT algorithm
         * - malformed token
         * - token generated by another backend
         */

        clearAuthentication();

        redirectToLogin();

        throw new Error(
            responseData?.detail ||
            "Session expired or JWT token is invalid. Please login again."
        );
    }

    // ======================================================
    // FORBIDDEN
    // ======================================================

    if (response.status === 403) {

        console.error(
            "❌ 403 Forbidden:",
            responseData
        );

        throw new Error(
            responseData?.detail ||
            "You do not have permission to access this resource."
        );
    }

    // ======================================================
    // NOT FOUND
    // ======================================================

    if (response.status === 404) {

        console.error(
            "❌ 404 Not Found:",
            endpoint
        );

        throw new Error(
            responseData?.detail ||
            "The requested support resource was not found."
        );
    }

    // ======================================================
    // OTHER API ERRORS
    // ======================================================

    if (!response.ok) {

        console.error(
            `❌ API Error ${response.status}:`,
            responseData
        );

        throw new Error(
            responseData?.detail ||
            responseData?.message ||
            `Request failed with status ${response.status}`
        );
    }

    // ======================================================
    // SUCCESS
    // ======================================================

    return responseData;
}


// ==========================================================
// INITIALIZE PAGE
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "🚀 Vendor Help & Support initializing..."
        );

        setupEvents();

        /*
         * If no vendor ID exists, don't make API calls.
         */
        if (!vendorId) {

            showEmptyState(
                "Vendor information is unavailable. Please login again."
            );

            return;
        }

        /*
         * Check authentication before loading the page.
         */
        const token = getAccessToken();

        if (!token) {

            console.error(
                "❌ Access token not found."
            );

            showEmptyState(
                "Your session has expired. Please login again."
            );

            redirectToLogin();

            return;
        }

        /*
         * Load profile first.
         */
        await loadVendorProfile();

        /*
         * Load support dashboard.
         */
        await loadDashboard();

        /*
         * Load system status.
         */
        await loadSystemStatus();

    }
);


// ==========================================================
// LOAD VENDOR PROFILE
// ==========================================================

async function loadVendorProfile() {

    try {

        const vendor =
            await apiFetch(
                `/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );

        if (!vendor) {
            return;
        }

        const name =
            vendor.vendor_name ||
            vendor.name ||
            "Vendor";

        // Sidebar vendor name
        const sidebarVendorName =
            document.getElementById(
                "sidebarVendorName"
            );

        if (sidebarVendorName) {

            sidebarVendorName.textContent =
                name;
        }

        // Header vendor name
        const headerVendorName =
            document.getElementById(
                "headerVendorName"
            );

        if (headerVendorName) {

            headerVendorName.textContent =
                name;
        }

        // Hero vendor name
        const heroVendorName =
            document.getElementById(
                "heroVendorName"
            );

        if (heroVendorName) {

            heroVendorName.textContent =
                name;
        }

        // Vendor ID
        const sidebarVendorId =
            document.getElementById(
                "sidebarVendorId"
            );

        if (sidebarVendorId) {

            sidebarVendorId.textContent =
                vendor.vendor_id ||
                vendorId;
        }

        // Callback name
        const callbackName =
            document.getElementById(
                "callbackName"
            );

        if (callbackName) {

            callbackName.value =
                name;
        }

        // Callback phone
        const callbackPhone =
            document.getElementById(
                "callbackPhone"
            );

        if (
            callbackPhone &&
            vendor.phone
        ) {

            callbackPhone.value =
                vendor.phone;
        }

    } catch (error) {

        console.error(
            "❌ Vendor profile error:",
            error
        );

        const heroVendorName =
            document.getElementById(
                "heroVendorName"
            );

        if (heroVendorName) {

            heroVendorName.textContent =
                "Vendor";
        }
    }
}


// ==========================================================
// LOAD SUPPORT DASHBOARD
// ==========================================================

async function loadDashboard() {

    try {

        console.log(
            "📊 Loading support dashboard for:",
            vendorId
        );

        dashboardData =
            await apiFetch(
                `/api/vendor/support/dashboard/${encodeURIComponent(vendorId)}`
            );

        console.log(
            "✅ Support dashboard:",
            dashboardData
        );

        if (!dashboardData) {

            showEmptyState(
                "No support information available."
            );

            return;
        }

        renderCategories(
            Array.isArray(
                dashboardData.categories
            )
                ? dashboardData.categories
                : []
        );

        renderArticles(
            Array.isArray(
                dashboardData.articles
            )
                ? dashboardData.articles
                : []
        );

        renderContacts(
            Array.isArray(
                dashboardData.contacts
            )
                ? dashboardData.contacts
                : []
        );

    } catch (error) {

        console.error(
            "❌ Support dashboard error:",
            error
        );

        showEmptyState(
            error.message ||
            "Unable to load support information."
        );
    }
}


// ==========================================================
// CATEGORIES
// ==========================================================

function renderCategories(categories) {

    const container =
        document.getElementById(
            "categoryGrid"
        );

    if (!container) {

        console.warn(
            "#categoryGrid not found."
        );

        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        container.innerHTML = `
            <div
                class="card"
                style="
                    padding:20px;
                    grid-column:1/-1;
                    text-align:center;
                "
            >
                No help topics available.
            </div>
        `;

        return;
    }

    categories.forEach(
        (category, index) => {

            const card =
                document.createElement("div");

            card.className =
                "category-card";

            const name =
                category.name ||
                "General";

            const description =
                category.description ||
                "Find useful guides and answers.";

            const icon =
                category.icon ||
                getCategoryIcon(
                    name,
                    index
                );

            card.innerHTML = `

                <div class="category-icon">
                    ${escapeHtml(icon)}
                </div>

                <h3>
                    ${escapeHtml(name)}
                </h3>

                <p>
                    ${escapeHtml(description)}
                </p>

                <button
                    type="button"
                    data-category="${escapeHtml(name)}"
                    class="category-button"
                >
                    View Articles →
                </button>
            `;

            container.appendChild(card);
        }
    );

    container
        .querySelectorAll(
            ".category-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset.category ||
                        "";

                    searchArticles(
                        "",
                        category
                    );
                }
            );
        });
}


// ==========================================================
// CATEGORY ICON
// ==========================================================

function getCategoryIcon(
    category,
    index = 0
) {

    const icons = {

        "Getting Started":
            "▣",

        "Account & Profile":
            "♙",

        "Orders & Operations":
            "▤",

        "Invoices & Payments":
            "▥",

        "Compliance & Documents":
            "✓",

        "Performance":
            "▥",

        "Security":
            "🔒",

        "General":
            "▣"
    };

    return (
        icons[category] ||
        [
            "▣",
            "♙",
            "▤",
            "▥",
            "✓"
        ][
            index %
            5
        ]
    );
}


// ==========================================================
// ARTICLES
// ==========================================================

function renderArticles(articles) {

    const container =
        document.getElementById(
            "articleList"
        );

    if (!container) {

        console.warn(
            "#articleList not found."
        );

        return;
    }

    container.innerHTML = "";

    if (
        !Array.isArray(articles) ||
        articles.length === 0
    ) {

        container.innerHTML = `
            <div
                style="
                    padding:25px;
                    text-align:center;
                    color:#667399;
                "
            >
                No articles available.
            </div>
        `;

        return;
    }

    articles
        .slice(0, 5)
        .forEach(article => {

            const row =
                document.createElement("div");

            row.className =
                "article-row";

            const articleId =
                article.id ??
                article.article_id ??
                "";

            const title =
                article.title ||
                "Untitled Article";

            const category =
                article.category ||
                "General";

            const views =
                article.views ??
                0;

            const helpfulPercent =
                article.helpful_percent ??
                article.helpful_percentage ??
                0;

            row.innerHTML = `

                <div class="article-icon">
                    ${escapeHtml(
                        article.icon ||
                        "▧"
                    )}
                </div>

                <div
                    class="article-title"
                    data-id="${escapeHtml(articleId)}"
                    style="cursor:pointer;"
                >
                    ${escapeHtml(title)}
                </div>

                <div>
                    <span class="article-category">
                        ${escapeHtml(category)}
                    </span>
                </div>

                <div class="article-stat">
                    ◉ ${formatNumber(views)}
                </div>

                <div class="article-stat">
                    ♡ ${Number(helpfulPercent) || 0}%
                </div>
            `;

            container.appendChild(row);
        });

    container
        .querySelectorAll(
            ".article-title"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    const id =
                        Number(
                            item.dataset.id
                        );

                    if (
                        Number.isNaN(id) ||
                        id <= 0
                    ) {

                        console.error(
                            "Invalid article ID:",
                            item.dataset.id
                        );

                        return;
                    }

                    openArticle(id);
                }
            );
        });
}


// ==========================================================
// SEARCH ARTICLES
// ==========================================================

async function searchArticles(
    search = "",
    category = ""
) {

    try {

        const params =
            new URLSearchParams();

        if (search) {

            params.set(
                "search",
                search
            );
        }

        if (category) {

            params.set(
                "category",
                category
            );
        }

        const query =
            params.toString();

        const endpoint =
            query
                ? `/api/vendor/support/articles?${query}`
                : `/api/vendor/support/articles`;

        console.log(
            "🔎 Searching articles:",
            endpoint
        );

        const articles =
            await apiFetch(endpoint);

        renderArticles(
            Array.isArray(articles)
                ? articles
                : []
        );

        const articleList =
            document.getElementById(
                "articleList"
            );

        if (articleList) {

            articleList.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

    } catch (error) {

        console.error(
            "❌ Article search failed:",
            error
        );

        showArticleError(
            error.message ||
            "Unable to search articles."
        );
    }
}


// ==========================================================
// ARTICLE SEARCH ERROR
// ==========================================================

function showArticleError(message) {

    const container =
        document.getElementById(
            "articleList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div
            style="
                padding:25px;
                text-align:center;
                color:#b42318;
            "
        >
            ${escapeHtml(message)}
        </div>
    `;
}


// ==========================================================
// OPEN ARTICLE
// ==========================================================

async function openArticle(articleId) {

    try {

        const article =
            await apiFetch(
                `/api/vendor/support/articles/${encodeURIComponent(articleId)}`
            );

        if (!article) {

            throw new Error(
                "Article was not found."
            );
        }

        currentArticleId =
            article.id ??
            article.article_id ??
            articleId;

        const categoryElement =
            document.getElementById(
                "articleCategory"
            );

        const titleElement =
            document.getElementById(
                "articleTitle"
            );

        const contentElement =
            document.getElementById(
                "articleContent"
            );

        if (categoryElement) {

            categoryElement.textContent =
                article.category ||
                "General";
        }

        if (titleElement) {

            titleElement.textContent =
                article.title ||
                "Untitled Article";
        }

        if (contentElement) {

            contentElement.textContent =
                article.content ||
                "No content available.";
        }

        const modal =
            document.getElementById(
                "articleModal"
            );

        if (modal) {

            modal.classList.remove(
                "hidden"
            );
        }

    } catch (error) {

        console.error(
            "❌ Open article error:",
            error
        );

        alert(
            error.message ||
            "Unable to open article."
        );
    }
}


// ==========================================================
// CONTACTS
// ==========================================================

function renderContacts(contacts) {

    const container =
        document.getElementById(
            "contactList"
        );

    if (!container) {

        console.warn(
            "#contactList not found."
        );

        return;
    }

    container.innerHTML = "";

    const defaults = [

        {
            contact_type: "ticket",
            title:
                "Submit a Support Ticket",
            value:
                "Raise a ticket with our support team",
            description:
                ""
        },

        {
            contact_type: "chat",
            title:
                "Live Chat",
            value:
                "Chat with our support executive",
            description:
                "Online"
        },

        {
            contact_type: "phone",
            title:
                "Call Us",
            value:
                "+1 987 654 3210",
            description:
                "Mon - Fri, 9:00 AM - 6:00 PM IST"
        },

        {
            contact_type: "email",
            title:
                "Email Us",
            value:
                "support@vendorirq.com",
            description:
                "We typically reply within 24 hours"
        }
    ];

    const items =
        Array.isArray(contacts) &&
        contacts.length
            ? contacts
            : defaults;

    items.forEach(contact => {

        const item =
            document.createElement("div");

        item.className =
            "contact-item";

        const type =
            contact.contact_type ||
            "support";

        item.innerHTML = `

            <div class="contact-icon">
                ${getContactIcon(type)}
            </div>

            <div class="contact-info">

                <strong>
                    ${escapeHtml(
                        contact.title ||
                        "Support"
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        contact.value ||
                        ""
                    )}
                </span>

                <small>
                    ${escapeHtml(
                        contact.description ||
                        ""
                    )}
                </small>

            </div>
        `;

        item.addEventListener(
            "click",
            () => {

                handleContact(
                    contact
                );
            }
        );

        container.appendChild(item);
    });
}


// ==========================================================
// CONTACT ICON
// ==========================================================

function getContactIcon(type) {

    const icons = {

        ticket:
            "▤",

        support:
            "▤",

        chat:
            "▣",

        phone:
            "☎",

        email:
            "✉"
    };

    return (
        icons[
            String(
                type || ""
            ).toLowerCase()
        ] ||
        "?"
    );
}


// ==========================================================
// CONTACT ACTION
// ==========================================================

function handleContact(contact) {

    const type =
        String(
            contact.contact_type ||
            ""
        ).toLowerCase();

    const value =
        contact.value ||
        "";

    // Phone
    if (type === "phone") {

        window.location.href =
            `tel:${value}`;

        return;
    }

    // Email
    if (type === "email") {

        window.location.href =
            `mailto:${value}`;

        return;
    }

    // Ticket
    if (
        type === "ticket" ||
        type === "support"
    ) {

        openTicketModal();

        return;
    }

    // Chat
    if (type === "chat") {

        alert(
            "Live chat support will open shortly."
        );

        return;
    }
}


// ==========================================================
// TICKET MODAL
// ==========================================================

function openTicketModal() {

    /*
     * If an existing ticket modal exists,
     * open it.
     */
    const modal =
        document.getElementById(
            "ticketModal"
        );

    if (modal) {

        modal.classList.remove(
            "hidden"
        );

        return;
    }

    /*
     * Fallback.
     */
    alert(
        "Connect this button to your existing Support Ticket page or ticket modal."
    );
}


// ==========================================================
// SYSTEM STATUS
// ==========================================================

async function loadSystemStatus() {

    try {

        console.log(
            "🔄 Loading system status..."
        );

        const data =
            await apiFetch(
                "/api/vendor/support/status"
            );

        if (!data) {
            return;
        }

        const overall =
            document.getElementById(
                "overallStatus"
            );

        if (overall) {

            overall.textContent =
                data.overall_status ||
                "Operational";
        }

        const services =
            Array.isArray(data.services)
                ? data.services
                : [];

        const platform =
            services.find(
                service =>
                    String(
                        service.name || ""
                    )
                        .toLowerCase()
                        .includes("platform")
            );

        const service =
            services.find(
                service =>
                    String(
                        service.name || ""
                    )
                        .toLowerCase()
                        .includes("service")
            );

        const support =
            services.find(
                service =>
                    String(
                        service.name || ""
                    )
                        .toLowerCase()
                        .includes("support")
            );

        const platformStatus =
            document.getElementById(
                "platformStatus"
            );

        if (platformStatus) {

            platformStatus.textContent =
                platform?.status ||
                "Operational";
        }

        const servicesStatus =
            document.getElementById(
                "servicesStatus"
            );

        if (servicesStatus) {

            servicesStatus.textContent =
                service?.status ||
                "Operational";
        }

        const supportStatus =
            document.getElementById(
                "supportStatus"
            );

        if (supportStatus) {

            supportStatus.textContent =
                support?.status ||
                "Operational";
        }

        const statusBox =
            document.getElementById(
                "systemStatus"
            );

        if (
            statusBox &&
            data.overall_status &&
            data.overall_status !==
                "Operational"
        ) {

            statusBox.style.background =
                "#fff8eb";

            statusBox.style.borderColor =
                "#f5c76b";
        }

    } catch (error) {

        console.error(
            "❌ System status error:",
            error
        );

        const overall =
            document.getElementById(
                "overallStatus"
            );

        if (overall) {

            overall.textContent =
                "Operational";
        }
    }
}


// ==========================================================
// CALLBACK MODAL
// ==========================================================

function openCallbackModal() {

    const modal =
        document.getElementById(
            "callbackModal"
        );

    if (!modal) {

        console.warn(
            "#callbackModal not found."
        );

        return;
    }

    modal.classList.remove(
        "hidden"
    );
}


// ==========================================================
// SUBMIT CALLBACK
// ==========================================================

async function submitCallback(event) {

    event.preventDefault();

    if (!vendorId) {

        alert(
            "Vendor ID is missing. Please login again."
        );

        return;
    }

    const nameElement =
        document.getElementById(
            "callbackName"
        );

    const phoneElement =
        document.getElementById(
            "callbackPhone"
        );

    const dateElement =
        document.getElementById(
            "callbackDate"
        );

    const timeElement =
        document.getElementById(
            "callbackTime"
        );

    const notesElement =
        document.getElementById(
            "callbackNotes"
        );

    const payload = {

        vendor_id:
            vendorId,

        name:
            nameElement?.value.trim() ||
            "",

        phone:
            phoneElement?.value.trim() ||
            "",

        preferred_date:
            dateElement?.value ||
            null,

        preferred_time:
            timeElement?.value ||
            null,

        notes:
            notesElement?.value.trim() ||
            null
    };

    if (!payload.name) {

        alert(
            "Please enter your name."
        );

        return;
    }

    if (!payload.phone) {

        alert(
            "Please enter your phone number."
        );

        return;
    }

    try {

        await apiFetch(
            "/api/vendor/support/callback",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        );

        alert(
            "Callback request submitted successfully."
        );

        const form =
            document.getElementById(
                "callbackForm"
            );

        if (form) {
            form.reset();
        }

        closeModal(
            "callbackModal"
        );

    } catch (error) {

        console.error(
            "❌ Callback submission error:",
            error
        );

        alert(
            error.message ||
            "Unable to submit callback request."
        );
    }
}


// ==========================================================
// FEEDBACK MODAL
// ==========================================================

function openFeedbackModal() {

    const modal =
        document.getElementById(
            "feedbackModal"
        );

    if (!modal) {

        console.warn(
            "#feedbackModal not found."
        );

        return;
    }

    modal.classList.remove(
        "hidden"
    );
}


// ==========================================================
// SUBMIT FEEDBACK
// ==========================================================

async function submitFeedback(event) {

    event.preventDefault();

    const ratingElement =
        document.getElementById(
            "feedbackRating"
        );

    const categoryElement =
        document.getElementById(
            "feedbackCategory"
        );

    const subjectElement =
        document.getElementById(
            "feedbackSubject"
        );

    const messageElement =
        document.getElementById(
            "feedbackMessage"
        );

    const rating =
        Number(
            ratingElement?.value || 0
        );

    const payload = {

        user_id:
            null,

        vendor_id:
            vendorId,

        rating:
            rating,

        category:
            categoryElement?.value ||
            "",

        subject:
            subjectElement?.value.trim() ||
            "",

        message:
            messageElement?.value.trim() ||
            ""
    };

    if (
        rating < 1 ||
        rating > 5
    ) {

        alert(
            "Please select a rating between 1 and 5."
        );

        return;
    }

    if (!payload.subject) {

        alert(
            "Please enter a feedback subject."
        );

        return;
    }

    if (!payload.message) {

        alert(
            "Please enter your feedback."
        );

        return;
    }

    try {

        await apiFetch(
            "/api/feedback",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        );

        alert(
            "Thank you for your feedback!"
        );

        const form =
            document.getElementById(
                "feedbackForm"
            );

        if (form) {
            form.reset();
        }

        closeModal(
            "feedbackModal"
        );

    } catch (error) {

        console.error(
            "❌ Feedback error:",
            error
        );

        alert(
            error.message ||
            "Unable to submit feedback."
        );
    }
}


// ==========================================================
// ARTICLE VOTE
// ==========================================================

async function voteArticle(helpful) {

    if (!currentArticleId) {

        console.warn(
            "No article selected."
        );

        return;
    }

    try {

        await apiFetch(
            `/api/vendor/support/articles/${encodeURIComponent(currentArticleId)}/helpful?helpful=${encodeURIComponent(helpful)}`,
            {
                method: "POST"
            }
        );

        alert(
            "Thank you for your feedback."
        );

        closeModal(
            "articleModal"
        );

    } catch (error) {

        console.error(
            "❌ Article vote error:",
            error
        );

        alert(
            error.message ||
            "Unable to submit vote."
        );
    }
}


// ==========================================================
// SEARCH EVENTS
// ==========================================================

function setupEvents() {

    // ======================================================
    // HELP SEARCH
    // ======================================================

    const helpSearch =
        document.getElementById(
            "helpSearch"
        );

    if (helpSearch) {

        let timeout = null;

        helpSearch.addEventListener(
            "input",
            () => {

                clearTimeout(timeout);

                timeout =
                    setTimeout(
                        () => {

                            searchArticles(
                                helpSearch.value.trim()
                            );

                        },
                        350
                    );
            }
        );

        /*
         * Search on Enter immediately.
         */
        helpSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    clearTimeout(timeout);

                    searchArticles(
                        helpSearch.value.trim()
                    );
                }
            }
        );
    }


    // ======================================================
    // GLOBAL SEARCH
    // ======================================================

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    if (globalSearch) {

        globalSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                const value =
                    globalSearch.value.trim();

                if (!value) {
                    return;
                }

                const helpSearchElement =
                    document.getElementById(
                        "helpSearch"
                    );

                if (helpSearchElement) {

                    helpSearchElement.value =
                        value;
                }

                searchArticles(value);
            }
        );
    }


    // ======================================================
    // CALLBACK BUTTON
    // ======================================================

    const callbackBtn =
        document.getElementById(
            "callbackBtn"
        );

    if (callbackBtn) {

        callbackBtn.addEventListener(
            "click",
            openCallbackModal
        );
    }


    // ======================================================
    // FEEDBACK BUTTON
    // ======================================================

    const feedbackBtn =
        document.getElementById(
            "feedbackBtn"
        );

    if (feedbackBtn) {

        feedbackBtn.addEventListener(
            "click",
            openFeedbackModal
        );
    }


    // ======================================================
    // CALLBACK FORM
    // ======================================================

    const callbackForm =
        document.getElementById(
            "callbackForm"
        );

    if (callbackForm) {

        callbackForm.addEventListener(
            "submit",
            submitCallback
        );
    }


    // ======================================================
    // FEEDBACK FORM
    // ======================================================

    const feedbackForm =
        document.getElementById(
            "feedbackForm"
        );

    if (feedbackForm) {

        feedbackForm.addEventListener(
            "submit",
            submitFeedback
        );
    }


    // ======================================================
    // ARTICLE YES
    // ======================================================

    const articleYes =
        document.getElementById(
            "articleYes"
        );

    if (articleYes) {

        articleYes.addEventListener(
            "click",
            () => {

                voteArticle(true);
            }
        );
    }


    // ======================================================
    // ARTICLE NO
    // ======================================================

    const articleNo =
        document.getElementById(
            "articleNo"
        );

    if (articleNo) {

        articleNo.addEventListener(
            "click",
            () => {

                voteArticle(false);
            }
        );
    }


    // ======================================================
    // CLOSE MODALS
    // ======================================================

    document
        .querySelectorAll(
            "[data-close]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    closeModal(
                        button.dataset.close
                    );
                }
            );
        });


    // ======================================================
    // VIEW ALL ARTICLES
    // ======================================================

    const viewAllArticles =
        document.getElementById(
            "viewAllArticles"
        );

    if (viewAllArticles) {

        viewAllArticles.addEventListener(
            "click",
            () => {

                searchArticles("");
            }
        );
    }


    // ======================================================
    // VIEW ARTICLES BOTTOM
    // ======================================================

    const viewArticlesBottom =
        document.getElementById(
            "viewArticlesBottom"
        );

    if (viewArticlesBottom) {

        viewArticlesBottom.addEventListener(
            "click",
            () => {

                searchArticles("");
            }
        );
    }


    // ======================================================
    // VIEW STATUS
    // ======================================================

    const viewStatus =
        document.getElementById(
            "viewStatus"
        );

    if (viewStatus) {

        viewStatus.addEventListener(
            "click",
            () => {

                loadSystemStatus();
            }
        );
    }


    // ======================================================
    // ESC KEY - CLOSE MODALS
    // ======================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Escape"
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".modal:not(.hidden)"
                )
                .forEach(modal => {

                    modal.classList.add(
                        "hidden"
                    );
                });
        }
    );
}


// ==========================================================
// CLOSE MODAL
// ==========================================================

function closeModal(id) {

    if (!id) {
        return;
    }

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.classList.add(
            "hidden"
        );
    }
}


// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ==========================================================
// NUMBER FORMAT
// ==========================================================

function formatNumber(value) {

    const number =
        Number(value || 0);

    if (
        !Number.isFinite(number)
    ) {

        return "0";
    }

    if (
        number >= 1000000
    ) {

        return (
            number / 1000000
        ).toFixed(1) + "M";
    }

    if (
        number >= 1000
    ) {

        return (
            number / 1000
        ).toFixed(1) + "K";
    }

    return number.toString();
}


// ==========================================================
// EMPTY STATE
// ==========================================================

function showEmptyState(message) {

    const categoryGrid =
        document.getElementById(
            "categoryGrid"
        );

    if (categoryGrid) {

        categoryGrid.innerHTML = `

            <div
                style="
                    grid-column:1/-1;
                    background:white;
                    border:1px solid #e5ebf5;
                    border-radius:8px;
                    padding:25px;
                    text-align:center;
                    color:#667399;
                "
            >
                ${escapeHtml(message)}
            </div>
        `;
    }

    const articleList =
        document.getElementById(
            "articleList"
        );

    if (articleList) {

        articleList.innerHTML = `

            <div
                style="
                    padding:25px;
                    text-align:center;
                    color:#667399;
                "
            >
                ${escapeHtml(message)}
            </div>
        `;
    }
}


// ==========================================================
// PAGE VISIBILITY - OPTIONAL TOKEN CHECK
// ==========================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            const token =
                getAccessToken();

            if (!token) {

                console.warn(
                    "⚠️ No JWT token available."
                );
            }
        }
    }
);


// ==========================================================
// DEBUG HELPERS
// ==========================================================

window.VendorHelpSupport = {

    getAccessToken,

    clearAuthentication,

    loadDashboard,

    loadVendorProfile,

    loadSystemStatus,

    searchArticles,

    openArticle,

    voteArticle,

    openCallbackModal,

    openFeedbackModal,

    closeModal
};

console.log(
    "✅ VendorHelpSupport.js loaded successfully."
);
