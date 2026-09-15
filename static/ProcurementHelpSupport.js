"use strict";


const API_BASE = "http://127.0.0.1:8000";


/* =========================================================
   GLOBAL STATE
========================================================= */

let dashboardData = {
    vendor: null,
    categories: [],
    articles: [],
    contacts: [],
    services: []
};

let currentArticles = [];


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   AUTHENTICATION
========================================================= */

function getAccessToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


/* =========================================================
   API FETCH
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    const token =
        getAccessToken();


    if (!token) {

        console.error(
            "No JWT access token found."
        );

        throw new Error(
            "Not authenticated"
        );
    }


    const headers = {
        ...(options.headers || {}),

        "Authorization":
            `Bearer ${token}`
    };


    /*
     * Do not set application/json for FormData.
     * The browser must set multipart/form-data
     * automatically.
     */

    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";
    }


    const response =
        await fetch(
            url,
            {
                ...options,

                headers,

                credentials: "include"
            }
        );


    /* ================================================
       HANDLE 401
    ================================================ */

    if (response.status === 401) {

        console.error(
            "401 Unauthorized:",
            url
        );


        /*
         * Remove expired/invalid tokens.
         */

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "token"
        );

        localStorage.removeItem(
            "jwt_token"
        );


        throw new Error(
            "Session expired. Please login again."
        );
    }


    /* ================================================
       RESPONSE
    ================================================ */

    let data = null;

    try {

        data =
            await response.json();

    } catch (_) {

        data = null;

    }


    if (!response.ok) {

        const message =
            data?.detail ||
            "Request failed";

        throw new Error(
            message
        );
    }


    return data;
}


/* =========================================================
   LOAD CURRENT USER
========================================================= */

async function loadCurrentUser() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/procurement/profile/me`
            );


        if ($("headerUserName")) {
            $("headerUserName").textContent =
                data.user.name || "James Anderson";
        }


        if ($("headerUserRole")) {
            $("headerUserRole").textContent =
                data.user.role || "Procurement Manager";
        }


        if ($("sidebarUserName")) {
            $("sidebarUserName").textContent =
                data.user.name || "James Anderson";
        }


        if ($("sidebarUserRole")) {
            $("sidebarUserRole").textContent =
                data.user.role || "Procurement Manager";
        }


    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error
        );
    }
}


/* =========================================================
   LOAD SUPPORT DATA
========================================================= */

async function loadSupportData() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/api/procurement/support/dashboard`
            );


        dashboardData.categories =
            data.categories || [];


        dashboardData.articles =
            data.articles || [];


        dashboardData.contacts =
            data.contacts || [];


        dashboardData.services =
            data.services || [];


        currentArticles =
            [...dashboardData.articles];


        renderEverything();

    } catch (error) {

        console.error(
            "Support dashboard loading failed:",
            error
        );

        showToast(
            "Unable to load support dashboard."
        );
    }
}


/* =========================================================
   FALLBACK SUPPORT DATA
========================================================= */

async function loadSupportFallback() {

    try {

        const [
            articles,
            contacts,
            services
        ] = await Promise.all([

            apiFetch(
                `${API_BASE}/api/vendor/support/articles`
            ),

            apiFetch(
                `${API_BASE}/api/support/contacts`
            ),

            apiFetch(
                `${API_BASE}/api/vendor/support/status`
            )
            .then(data =>
                data.services || []
            )
        ]);


        dashboardData.articles =
            articles;

        dashboardData.contacts =
            contacts;

        dashboardData.services =
            services;


        currentArticles =
            [...articles];


        /*
         * Categories are fetched independently
         * if vendor dashboard isn't available.
         */

        const categories =
            await apiFetch(
                `${API_BASE}/api/vendor/support/dashboard?vendor_id=VND0000001`
            )
            .catch(() => []);


        dashboardData.categories =
            categories.categories || [];


        renderEverything();

    } catch (error) {

        console.error(
            "Support fallback failed:",
            error
        );
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {

    renderTopics();

    renderRecommendedArticles();

    renderPopularArticles();

    renderContacts();

    renderSystemStatus();

    renderTicketCategories();

}


/* =========================================================
   RENDER HELP TOPICS
========================================================= */

function renderTopics() {

    const container =
        $("helpTopics");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!dashboardData.categories.length) {

        container.innerHTML = `
            <div class="empty-state" style = "font-size:9px;">
                No help topics available.
            </div>
        `;

        return;
    }


    const topicIcons = [
        "fa-book-open",
        "fa-clipboard-check",
        "fa-cart-shopping",
        "fa-file-invoice",
        "fa-users"
    ];


    const topicColors = [
        "purple",
        "green",
        "orange",
        "blue",
        "pink"
    ];


    dashboardData.categories
        .slice(0, 5)
        .forEach(
            (category, index) => {

                const icon =
                    category.icon ||
                    topicIcons[index % topicIcons.length];


                const color =
                    category.color ||
                    topicColors[index % topicColors.length];


                const articleCount =
                    dashboardData.articles
                        .filter(
                            article =>
                                String(article.category)
                                    .toLowerCase() ===
                                String(category.name)
                                    .toLowerCase()
                        )
                        .length;


                const div =
                    document.createElement("div");


                div.className =
                    "topic-card";


                div.innerHTML = `

                    <div
                        class="topic-icon ${color}"
                    >
                        <i class="fa-solid ${escapeHtml(icon)}"></i>
                    </div>

                    <strong>
                        ${escapeHtml(category.name)}
                    </strong>

                    <p>
                        ${escapeHtml(
                            category.description ||
                            "Browse helpful guides and articles."
                        )}
                    </p>

                    <span class="topic-count">
                        ${articleCount} Articles
                    </span>
                `;


                div.addEventListener(
                    "click",
                    () => {

                        $("helpSearch").value =
                            category.name;

                        searchArticles(
                            category.name,
                            category.name
                        );

                    }
                );


                container.appendChild(div);
            }
        );
}


/* =========================================================
   RECOMMENDED ARTICLES
========================================================= */

function renderRecommendedArticles() {

    const container =
        $("recommendedArticles");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    /*
     * Prefer popular articles.
     */

    const articles =
        [...dashboardData.articles]
            .sort(
                (a, b) =>
                    Number(b.views || 0) -
                    Number(a.views || 0)
            )
            .slice(0, 5);


    articles.forEach(
        article => {

            const row =
                document.createElement("div");


            row.className =
                "article-row";


            row.innerHTML = `

                <div class="article-icon">

                    <i class="fa-solid
                        ${escapeHtml(
                            article.icon ||
                            "fa-file-lines"
                        )}">
                    </i>

                </div>


                <div class="article-info">

                    <strong>
                        ${escapeHtml(article.title)}
                    </strong>

                    <span>
                        ${escapeHtml(
                            article.summary ||
                            "Helpful VendorIQ guide"
                        )}
                    </span>

                </div>


                <span class="article-badge">
                    Guide
                </span>

            `;


            row.addEventListener(
                "click",
                () =>
                    openArticle(article.id)
            );


            container.appendChild(row);

        }
    );
}


/* =========================================================
   POPULAR ARTICLES
========================================================= */

function renderPopularArticles() {

    const container =
        $("popularArticles");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    const popular =
        [...dashboardData.articles]
            .sort(
                (a, b) => {

                    if (
                        Boolean(b.is_popular) !==
                        Boolean(a.is_popular)
                    ) {

                        return Boolean(b.is_popular)
                            ? 1
                            : -1;
                    }


                    return Number(b.views || 0) -
                           Number(a.views || 0);
                }
            )
            .slice(0, 5);


    popular.forEach(
        article => {

            const item =
                document.createElement("div");


            item.className =
                "popular-item";


            item.innerHTML = `

                <div class="popular-icon">

                    <i class="fa-regular fa-file-lines"></i>

                </div>


                <div class="popular-info">

                    <strong>
                        ${escapeHtml(article.title)}
                    </strong>

                    <span>
                        ${formatArticleDate(article)}
                    </span>

                </div>


                <i class="fa-solid fa-chevron-right"></i>

            `;


            item.addEventListener(
                "click",
                () =>
                    openArticle(article.id)
            );


            container.appendChild(item);

        }
    );
}


/* =========================================================
   CONTACTS
========================================================= */

function renderContacts() {

    let email = null;
    let phone = null;
    let chat = null;


    dashboardData.contacts
        .forEach(
            contact => {

                const type =
                    String(
                        contact.contact_type || ""
                    )
                    .toLowerCase();


                if (
                    type.includes("email")
                ) {
                    email = contact;
                }


                if (
                    type.includes("phone") ||
                    type.includes("call")
                ) {
                    phone = contact;
                }


                if (
                    type.includes("chat")
                ) {
                    chat = contact;
                }

            }
        );


    if (email) {

        const address =
            email.value;

        $("emailSupportLink").href =
            `mailto:${address}`;

        $("bottomEmailLink").href =
            `mailto:${address}`;
    }


    if (phone) {

        const phoneValue =
            phone.value;


        $("callSupportLink").href =
            `tel:${phoneValue}`;


        $("callSupportLink").textContent =
            phoneValue;


        $("bottomCallLink").href =
            `tel:${phoneValue}`;


        $("bottomCallLink").textContent =
            phoneValue;


        if (
            phone.description &&
            $("supportHours")
        ) {

            $("supportHours").textContent =
                phone.description;
        }
    }


    if (chat) {

        window.chatSupportUrl =
            chat.value;

    }

}


/* =========================================================
   SYSTEM STATUS
========================================================= */

function renderSystemStatus() {

    const services =
        dashboardData.services || [];


    const allOperational =
        services.length === 0 ||
        services.every(
            service =>
                String(
                    service.status || ""
                ).toLowerCase() ===
                "operational"
        );


    const statusIcon =
        $("statusIcon");


    if (allOperational) {

        $("systemStatusText").textContent =
            "All Systems Operational";


        $("systemStatusMessage").textContent =
            "All services are running smoothly.";


        statusIcon.classList.remove(
            "degraded"
        );


        statusIcon.innerHTML =
            `<i class="fa-solid fa-check"></i>`;

    } else {

        $("systemStatusText").textContent =
            "Some Systems Need Attention";


        const degraded =
            services.find(
                service =>
                    String(
                        service.status || ""
                    ).toLowerCase() !==
                    "operational"
            );


        $("systemStatusMessage").textContent =
            degraded?.message ||
            "Some services may be experiencing issues.";


        statusIcon.classList.add(
            "degraded"
        );


        statusIcon.innerHTML =
            `<i class="fa-solid fa-exclamation"></i>`;
    }
}


/* =========================================================
   TICKET CATEGORIES
========================================================= */

function renderTicketCategories() {

    const select =
        $("ticketCategory");


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select a category
        </option>
    `;


    dashboardData.categories
        .forEach(
            category => {

                const option =
                    document.createElement("option");


                option.value =
                    category.name;


                option.textContent =
                    category.name;


                select.appendChild(option);

            }
        );
}


/* =========================================================
   SEARCH
========================================================= */

async function searchArticles(
    search = "",
    category = ""
) {

    try {

        let url =
            `${API_BASE}/api/vendor/support/articles`;


        const params =
            new URLSearchParams();


        if (search.trim()) {

            params.set(
                "search",
                search.trim()
            );
        }


        if (category.trim()) {

            params.set(
                "category",
                category.trim()
            );
        }


        const query =
            params.toString();


        if (query) {
            url += `?${query}`;
        }


        const articles =
            await apiFetch(url);


        currentArticles =
            articles;


        renderSearchResults(
            articles
        );


    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Article search failed."
        );
    }
}


/* =========================================================
   SEARCH RESULT RENDERING
========================================================= */

function renderSearchResults(
    articles
) {

    const container =
        $("recommendedArticles");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!articles.length) {

        container.innerHTML = `
            <div
                style="
                    padding:20px;
                    text-align:center;
                    font-size:11px;
                    color:#66718e;
                "
            >
                No matching articles found.
            </div>
        `;

        return;
    }


    articles
        .slice(0, 10)
        .forEach(
            article => {

                const row =
                    document.createElement("div");


                row.className =
                    "article-row";


                row.innerHTML = `

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
                                article.summary ||
                                article.category ||
                                ""
                            )}
                        </span>

                    </div>

                `;


                row.addEventListener(
                    "click",
                    () =>
                        openArticle(article.id)
                );


                container.appendChild(row);

            }
        );
}


/* =========================================================
   ARTICLE DETAILS
========================================================= */

async function openArticle(
    articleId
) {

    try {

        const article =
            await apiFetch(
                `${API_BASE}/api/vendor/support/articles/${articleId}`
            );


        const modal =
            $("articleModal");


        const content =
            $("articleModalContent");


        content.innerHTML = `

            <h2>
                ${escapeHtml(article.title)}
            </h2>

            <div class="article-category">
                ${escapeHtml(
                    article.category || "Help"
                )}
            </div>

            <div class="article-body">
                ${escapeHtml(
                    article.content || ""
                )}
            </div>

            <div
                style="
                    margin-top:20px;
                    display:flex;
                    gap:10px;
                "
            >

                <button
                    class="primary-button"
                    onclick="
                        voteArticle(
                            ${article.id},
                            true
                        )
                    "
                >
                    Helpful
                </button>

                <button
                    class="attach-button"
                    onclick="
                        voteArticle(
                            ${article.id},
                            false
                        )
                    "
                >
                    Not Helpful
                </button>

            </div>
        `;


        modal.classList.add("show");


    } catch (error) {

        console.error(error);

        showToast(
            "Unable to open article."
        );
    }
}


/* =========================================================
   ARTICLE VOTE
========================================================= */

async function voteArticle(
    articleId,
    helpful
) {

    try {

        await apiFetch(
            `${API_BASE}/api/vendor/support/articles/${articleId}/helpful?helpful=${helpful}`,
            {
                method: "POST"
            }
        );


        showToast(
            "Thank you for your feedback."
        );


    } catch (error) {

        showToast(
            "Unable to submit feedback."
        );
    }
}


/* =========================================================
   SUBMIT TICKET
========================================================= */

async function submitTicket( event ) {

    event.preventDefault();

    const subject = $("ticketSubject").value.trim();

    const description = $("ticketDescription").value.trim();

    const category = $("ticketCategory").value;

    const priority = $("ticketPriority").value;


    if (!subject) {
        showToast( "Please enter a subject." );
        return;
    }


    if (!category) {
        showToast( "Please select a category." );
        return;
    }


    if (!description) {
        showToast( "Please describe the issue." );
        return;
    }


    /*
     * created_by should ideally be assigned
     * by FastAPI from the authenticated user.
     *
     * This value is included for compatibility
     * with your current SupportTicketCreate schema.
     */

    const payload = { subject, description, category, priority, vendor_id: null };

    try {

        const button = event.target.querySelector( "button[type='submit']" );

        if (button) {
            button.disabled = true;
            button.textContent = "Submitting...";
        }


        const result = await apiFetch( `${API_BASE}/api/procurement/support/tickets`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

        showToast( `Ticket ${result.ticket_id} created successfully.` );

        event.target.reset();


        /*
         * File upload is intentionally not sent here
         * because your current database does not contain
         * a SupportTicketAttachment model.
         */

        const files = $("ticketFiles")?.files;

        if ( files && files.length > 0 ) {
            showToast( "Ticket created. File attachment storage requires the attachment table/API." );
        }


    } catch (error) {

        console.error( error );

        showToast( error.message || "Unable to submit ticket." );

    } finally {

        const button = event.target.querySelector( "button[type='submit']" );

        if (button) {
            button.disabled = false;
            button.textContent = "Submit Ticket";
        }
    }
}


/* =========================================================
   LIVE CHAT
========================================================= */

function startLiveChat() {

    if ( window.chatSupportUrl ) {

        window.open( window.chatSupportUrl, "_blank" );

        return;
    }

    showToast( "Live chat support will open during business hours." );
}


/* =========================================================
   SEARCH EVENTS
========================================================= */

let searchTimer = null;

function setupSearch() {

    const input = $("helpSearch");

    if (!input) { return; }

    input.addEventListener( "input", function () {

            clearTimeout( searchTimer );

            searchTimer = setTimeout( () => { searchArticles( input.value ); }, 300 );
        }
    );


    input.addEventListener( "keydown", event => {
            if ( event.key === "Enter" ) {
                event.preventDefault();
                searchArticles( input.value );
            }
        }
    );

    const button = $("searchHelpBtn");

    if (button) {

        button.addEventListener( "click", () =>
                searchArticles( input.value )
        );
    }
}


/* =========================================================
   GLOBAL SEARCH
========================================================= */

function setupGlobalSearch() {

    const search = $("globalSearch");

    if (!search) { return; }

    search.addEventListener( "keydown", event => {

            if ( event.key === "Enter" ) {

                const value = search.value.trim();


                if (value) {

                    $("helpSearch").value = value;

                    searchArticles( value );

                    $("helpSearch") .scrollIntoView({ behavior: "smooth" });
                }
            }
        }
    );
}


/* =========================================================
   FAQ
========================================================= */

async function loadFAQs() {

    const container = $("faqList");

    if (!container) { return; }

    try {

        const faqs = await apiFetch( `${API_BASE}/api/support/faqs` );

        container.innerHTML = "";

        faqs .slice(0, 6) .forEach( faq => {

                    const item = document.createElement( "div" );

                    item.className = "faq-item";

                    item.innerHTML = `

                        <button class="faq-question" >

                            <span>
                                ${escapeHtml( faq.question )}
                            </span>

                            <i class=" fa-solid fa-chevron-down "></i>

                        </button>

                        <div class="faq-answer">
                            ${escapeHtml( faq.answer )}
                        </div>
                    `;

                    const question = item.querySelector( ".faq-question" );

                    question.addEventListener( "click", () => {
                            item.classList.toggle( "open" );
                        }
                    );

                    container.appendChild( item );
                }
            );


    } catch (error) {

        console.warn( "FAQ loading failed:", error );

        container.innerHTML = `
            <div
                style="
                    padding:15px 0;
                    font-size:10px;
                    color:#66718e;
                "
            >
                FAQ information is currently unavailable.
            </div>
        `;
    }
}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {
    const liveChat = $("liveChatBtn");

    if (liveChat) {
        liveChat.addEventListener( "click", startLiveChat );
    }

    const closeModal = $("closeArticleModal");

    if (closeModal) {
        closeModal.addEventListener( "click", () => {
                $("articleModal") .classList.remove( "show" );
            }
        );
    }


    const modal = $("articleModal");

    if (modal) {
        modal.addEventListener( "click", event => {
                if ( event.target === modal ) { modal.classList.remove( "show" ); }
            }
        );
    }


    const ticketForm = $("supportTicketForm");

    if (ticketForm) {
        ticketForm.addEventListener( "submit", submitTicket );
    }

    const files = $("ticketFiles");

    if (files) {
        files.addEventListener( "change", () => {
                if ( files.files.length ) { showToast( `${files.files.length} file(s) selected.` ); }
            }
        );
    }


    const viewAll = $("viewAllArticlesBtn");

    if (viewAll) {
        viewAll.addEventListener( "click", () => { searchArticles(""); } );
    }

    const viewPopular = $("viewPopularBtn");

    if (viewPopular) {
        viewPopular.addEventListener( "click", () => {

                const articles = [...dashboardData.articles]
                        .sort( (a, b) => Number(b.views || 0) - Number(a.views || 0) );

                renderSearchResults( articles );

                $("recommendedArticles") .scrollIntoView({ behavior: "smooth" });
            }
        );
    }

    const statusBtn = $("viewStatusBtn");

    if (statusBtn) {
        statusBtn.addEventListener( "click", () => { showToast( "System status information is shown above." ); } );
    }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast( message ) {

    const toast = $("toast");

    if (!toast) { return; }

    toast.textContent = message;

    toast.classList.add( "show" );

    clearTimeout( toastTimer );

    toastTimer = setTimeout( () => { toast.classList.remove( "show" ); }, 3500 );
}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatArticleDate( article ) {

    if ( article.updated_at ) {

        const date = new Date( article.updated_at );

        if (!Number.isNaN( date.getTime() )) {

            return `Updated ${date.toLocaleDateString()}`;
        }
    }

    if ( article.created_at ) {

        const date = new Date( article.created_at );

        if (!Number.isNaN( date.getTime() )) { 
            return `Updated ${date.toLocaleDateString()}`; 
        }
    }

    return "Helpful VendorIQ guide";
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml( value ) {
    return String( value ?? "" )
        .replace( /&/g, "&amp;" )
        .replace( /</g, "&lt;" )
        .replace( />/g, "&gt;" )
        .replace( /"/g, "&quot;" )
        .replace( /'/g, "&#039;" );
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeHelpSupport() {

    console.log( "Initializing Help & Support..." );

    setupSearch();

    setupGlobalSearch();

    setupButtons();

    await Promise.all([ loadCurrentUser(), loadFAQs(), loadSupportData() ]);

    console.log( "Help & Support initialized." );
}


document.addEventListener( "DOMContentLoaded", initializeHelpSupport );

window.startLiveChat = startLiveChat;

window.openArticle = openArticle;

window.voteArticle = voteArticle;

function openProfile(){
    window.location.href="/ProcurementProfile";
}