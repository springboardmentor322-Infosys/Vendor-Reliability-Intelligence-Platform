"use strict";


/* ============================================================
   CONFIG
============================================================ */

const API_BASE = window.location.origin;

const DASHBOARD_API =
    `${API_BASE}/api/auditor/evidence-documents/dashboard`;

const UPLOAD_API =
    `${API_BASE}/api/documents/upload`;


/* ============================================================
   STATE
============================================================ */

const state = {

    page: 1,

    pageSize: 10,

    totalPages: 1,

    search: "",

    audit: "All Audits",

    documentType: "All Types",

    category: "All Categories",

    status: "All Statuses",

    dashboard: null

};


/* ============================================================
   AUTH
============================================================ */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        ""
    );

}


function authHeaders() {

    const token = getToken();

    const headers = {
        "Accept": "application/json"
    };

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }

    return headers;

}


/* ============================================================
   API REQUEST
============================================================ */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                ...options,

                headers: {
                    ...authHeaders(),
                    ...(options.headers || {})
                }
            }
        );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            message =
                error.detail ||
                message;

        } catch (_) {}

        throw new Error(message);

    }

    return response;

}


/* ============================================================
   LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    const params =
        new URLSearchParams();

    params.set(
        "page",
        state.page
    );

    params.set(
        "page_size",
        state.pageSize
    );

    if (state.search) {

        params.set(
            "search",
            state.search
        );

    }

    params.set(
        "audit",
        state.audit
    );

    params.set(
        "document_type",
        state.documentType
    );

    params.set(
        "category",
        state.category
    );

    params.set(
        "status",
        state.status
    );


    try {

        showLoading();

        const response =
            await apiRequest(
                `${DASHBOARD_API}?${params.toString()}`
            );

        const data =
            await response.json();

        state.dashboard = data;

        renderDashboard(data);

    } catch (error) {

        console.error(
            "Evidence dashboard error:",
            error
        );

        showError(
            error.message
        );

    }

}


/* ============================================================
   RENDER DASHBOARD
============================================================ */

function renderDashboard(data) {

    renderKpis(
        data.summary
    );

    renderFilters(
        data
    );

    renderDocuments(
        data.documents
    );

    renderPagination(
        data.pagination
    );

    renderDocumentTypes(
        data.document_types
    );

    renderCategories(
        data.categories
    );

    renderRecentUploads(
        data.recent_uploads
    );

    populateUploadAudits(
        data.audit_options
    );

}


/* ============================================================
   KPI
============================================================ */

function renderKpis(summary) {

    const total =
        Number(
            summary.total_documents || 0
        );

    const verified =
        Number(
            summary.verified_documents || 0
        );

    const review =
        Number(
            summary.under_review || 0
        );

    const missing =
        Number(
            summary.missing_evidence || 0
        );


    setText(
        "totalDocuments",
        total.toLocaleString()
    );

    setText(
        "verifiedDocuments",
        verified.toLocaleString()
    );

    setText(
        "underReview",
        review.toLocaleString()
    );

    setText(
        "missingEvidence",
        missing.toLocaleString()
    );


    const verifiedPercent =
        total
            ? Math.round(
                verified / total * 100
            )
            : 0;

    const reviewPercent =
        total
            ? Math.round(
                review / total * 100
            )
            : 0;

    const missingPercent =
        total
            ? Math.round(
                missing / total * 100
            )
            : 0;


    setText(
        "verifiedPercentage",
        `${verifiedPercent}% of total`
    );

    setText(
        "reviewPercentage",
        `${reviewPercent}% of total`
    );

    setText(
        "missingPercentage",
        `${missingPercent}% of total`
    );


    /* ========================================================
       STORAGE
    ======================================================== */

    const used =
        Number(
            summary.storage_used || 0
        );

    const limit =
        Number(
            summary.storage_limit ||
            10 * 1024 * 1024 * 1024
        );

    const available =
        Number(
            summary.storage_available || 0
        );


    const usedGB =
        used / 1024 / 1024 / 1024;

    const availableGB =
        available / 1024 / 1024 / 1024;

    const storagePercent =
        limit
            ? Math.min(
                100,
                used / limit * 100
            )
            : 0;


    setText(
        "storageUsed",
        `${usedGB.toFixed(2)} GB`
    );

    setText(
        "storageText",
        `${usedGB.toFixed(2)} GB`
    );

    setText(
        "storagePercent",
        `${Math.round(storagePercent)}%`
    );

    setText(
        "storagePercentage",
        `${Math.round(storagePercent)}% of 10 GB used`
    );

    setText(
        "freeStorage",
        `${availableGB.toFixed(2)} GB free`
    );


    const progress =
        document.getElementById(
            "storageProgress"
        );

    if (progress) {

        progress.style.width =
            `${storagePercent}%`;

    }

}


/* ============================================================
   FILTER OPTIONS
============================================================ */

function renderFilters(data) {

    const auditSelect =
        document.getElementById(
            "auditFilter"
        );

    const typeSelect =
        document.getElementById(
            "documentTypeFilter"
        );

    const categorySelect =
        document.getElementById(
            "categoryFilter"
        );


    const currentAudit =
        state.audit;

    const currentType =
        state.documentType;

    const currentCategory =
        state.category;


    auditSelect.innerHTML =
        `<option value="All Audits">
            All Audits
        </option>`;


    (data.audit_options || [])
        .forEach(audit => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                audit.audit_number;

            option.textContent =
                audit.label;

            auditSelect.appendChild(
                option
            );

        });


    auditSelect.value =
        currentAudit;


    typeSelect.innerHTML =
        `<option value="All Types">
            All Types
        </option>`;


    (data.document_types || [])
        .forEach(item => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.type;

            option.textContent =
                item.type;

            typeSelect.appendChild(
                option
            );

        });


    typeSelect.value =
        currentType;


    categorySelect.innerHTML =
        `<option value="All Categories">
            All Categories
        </option>`;


    (data.categories || [])
        .forEach(item => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                item.category;

            option.textContent =
                item.category;

            categorySelect.appendChild(
                option
            );

        });


    categorySelect.value =
        currentCategory;

}


/* ============================================================
   DOCUMENT TABLE
============================================================ */

function renderDocuments(documents) {

    const body =
        document.getElementById(
            "documentTableBody"
        );

    const count =
        document.getElementById(
            "documentCount"
        );


    count.textContent =
        documents.length;


    if (!documents.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    No documents found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        documents
            .map(document =>
                createDocumentRow(
                    document
                )
            )
            .join("");

}


function createDocumentRow(document) {

    const icon =
        getFileIcon(
            document.document_name,
            document.mime_type
        );


    const statusClass =
        getStatusClass(
            document.status
        );


    const uploadedDate =
        formatDateTime(
            document.uploaded_on
        );


    return `
        <tr>

            <td>

                <div class="document-cell">

                    <span class="file-icon ${icon.class}">
                        <i class="${icon.icon}"></i>
                    </span>

                    <div>

                        <span class="document-name">
                            ${escapeHtml(
                                document.document_name
                            )}
                        </span>

                        <span class="document-id">
                            ${escapeHtml(
                                document.audit_number || ""
                            )}
                        </span>

                    </div>

                </div>

            </td>


            <td>

                <span class="audit-name">
                    ${escapeHtml(
                        document.audit_name || "—"
                    )}
                </span>

                ${
                    document.audit_number
                    ? `
                        <span class="audit-number">
                            ${escapeHtml(
                                document.audit_number
                            )}
                        </span>
                    `
                    : ""
                }

            </td>


            <td>
                ${escapeHtml(
                    document.document_type || "Other"
                )}
            </td>


            <td>
                ${escapeHtml(
                    document.category || "Other"
                )}
            </td>


            <td>

                <div class="uploader">

                    <span class="avatar">
                        <i class="fa-solid fa-user"></i>
                    </span>

                    <span>
                        ${escapeHtml(
                            document.uploaded_by_name ||
                            "Unknown"
                        )}
                    </span>

                </div>

            </td>


            <td>
                ${uploadedDate}
            </td>


            <td>

                <span class="status ${statusClass}">
                    ${escapeHtml(
                        document.status
                    )}
                </span>

            </td>


            <td>

                <div class="action-buttons">

                    <button
                        class="action-btn"
                        title="View"
                        onclick="viewDocument(${document.id})"
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>

                    <button
                        class="action-btn"
                        title="Download"
                        onclick="downloadDocument(${document.id})"
                    >
                        <i class="fa-solid fa-download"></i>
                    </button>

                    <button
                        class="action-btn"
                        title="More"
                        onclick="documentMenu(${document.id})"
                    >
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                </div>

            </td>

        </tr>
    `;

}


/* ============================================================
   FILE ICON
============================================================ */

function getFileIcon(
    fileName,
    mimeType
) {

    const name =
        String(fileName || "")
            .toLowerCase();


    if (
        name.endsWith(".pdf") ||
        mimeType === "application/pdf"
    ) {

        return {
            class: "pdf",
            icon: "fa-solid fa-file-pdf"
        };

    }


    if (
        name.endsWith(".xlsx") ||
        name.endsWith(".xls") ||
        String(mimeType || "").includes(
            "spreadsheet"
        )
    ) {

        return {
            class: "excel",
            icon: "fa-solid fa-file-excel"
        };

    }


    if (
        name.endsWith(".doc") ||
        name.endsWith(".docx")
    ) {

        return {
            class: "word",
            icon: "fa-solid fa-file-word"
        };

    }


    if (
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".png")
    ) {

        return {
            class: "image",
            icon: "fa-solid fa-file-image"
        };

    }


    return {
        class: "other",
        icon: "fa-solid fa-file"
    };

}


/* ============================================================
   STATUS
============================================================ */

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase();


    if (value.includes("verified")) {
        return "verified";
    }

    if (value.includes("review")) {
        return "review";
    }

    if (value.includes("missing")) {
        return "missing";
    }

    if (value.includes("rejected")) {
        return "rejected";
    }

    return "review";

}


/* ============================================================
   DOCUMENT TYPES
============================================================ */

function renderDocumentTypes(types) {

    const donut =
        document.getElementById(
            "documentTypeDonut"
        );

    const legend =
        document.getElementById(
            "documentTypeLegend"
        );

    const total =
        types.reduce(
            (sum, item) =>
                sum + Number(item.count || 0),
            0
        );


    setText(
        "donutTotal",
        total
    );


    if (!types.length) {

        donut.style.background =
            "#e5eaf1";

        legend.innerHTML =
            "<p>No document type data.</p>";

        return;

    }


    const colors = [
        "#ef4444",
        "#16a34a",
        "#7c4dff",
        "#f59e0b",
        "#cbd5e1"
    ];


    let current = 0;

    const gradient =
        types
            .map((item, index) => {

                const value =
                    Number(
                        item.count || 0
                    );

                const percent =
                    total
                        ? value / total * 100
                        : 0;

                const start =
                    current;

                current += percent;

                const color =
                    colors[
                        index % colors.length
                    ];

                return `
                    ${color}
                    ${start}%
                    ${current}%
                `;

            })
            .join(",");


    donut.style.background =
        `conic-gradient(${gradient})`;


    legend.innerHTML =
        types
            .map((item, index) => {

                const value =
                    Number(
                        item.count || 0
                    );

                const percent =
                    total
                        ? Math.round(
                            value / total * 100
                        )
                        : 0;

                return `
                    <div class="legend-row">

                        <span
                            class="legend-dot"
                            style="
                                background:
                                ${colors[
                                    index %
                                    colors.length
                                ]};
                            "
                        ></span>

                        <span>
                            ${escapeHtml(
                                item.type
                            )}
                        </span>

                        <strong>
                            ${value}
                            (${percent}%)
                        </strong>

                    </div>
                `;

            })
            .join("");

}


/* ============================================================
   CATEGORY DISTRIBUTION
============================================================ */

function renderCategories(categories) {

    const container =
        document.getElementById(
            "categoryGrid"
        );


    const total =
        categories.reduce(
            (sum, item) =>
                sum + Number(item.count || 0),
            0
        );


    container.innerHTML =
        categories
            .slice(0, 5)
            .map(item => {

                const count =
                    Number(
                        item.count || 0
                    );

                const percent =
                    total
                        ? Math.round(
                            count / total * 100
                        )
                        : 0;

                return `
                    <div class="category-item">

                        <div class="category-icon">
                            <i class="fa-regular fa-folder"></i>
                        </div>

                        <span>
                            ${escapeHtml(
                                item.category
                            )}
                        </span>

                        <strong>
                            ${count}
                        </strong>

                        <span class="category-percent">
                            ${percent}%
                        </span>

                    </div>
                `;

            })
            .join("");

}


/* ============================================================
   RECENT UPLOADS
============================================================ */

function renderRecentUploads(
    uploads
) {

    const container =
        document.getElementById(
            "recentUploads"
        );


    if (!uploads.length) {

        container.innerHTML =
            `<div class="loading">
                No recent uploads.
            </div>`;

        return;

    }


    container.innerHTML =
        uploads
            .map(upload => {

                const icon =
                    getFileIcon(
                        upload.document_name
                    );


                return `
                    <div class="recent-item">

                        <span class="recent-file-icon">
                            <i class="${icon.icon}"></i>
                        </span>

                        <div class="recent-info">

                            <strong>
                                ${escapeHtml(
                                    upload.document_name
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    upload.category || ""
                                )}
                            </span>

                            <span>
                                ${formatDateTime(
                                    upload.uploaded_on
                                )}
                            </span>

                        </div>

                    </div>
                `;

            })
            .join("");

}


/* ============================================================
   PAGINATION
============================================================ */

function renderPagination(
    pagination
) {

    const container =
        document.getElementById(
            "pagination"
        );


    const info =
        document.getElementById(
            "paginationInfo"
        );


    state.totalPages =
        pagination.total_pages || 1;


    const total =
        pagination.total || 0;

    const page =
        pagination.page || 1;

    const pageSize =
        pagination.page_size || 10;


    const start =
        total
            ? ((page - 1) * pageSize) + 1
            : 0;

    const end =
        Math.min(
            page * pageSize,
            total
        );


    info.textContent =
        `Showing ${start} to ${end} of ${total} documents`;


    let html = "";


    html += `
        <button
            class="page-btn"
            ${page <= 1 ? "disabled" : ""}
            onclick="changePage(${page - 1})"
        >
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;


    const startPage =
        Math.max(
            1,
            page - 2
        );

    const endPage =
        Math.min(
            state.totalPages,
            page + 2
        );


    for (
        let current = startPage;
        current <= endPage;
        current++
    ) {

        html += `
            <button
                class="page-btn ${
                    current === page
                        ? "active"
                        : ""
                }"
                onclick="changePage(${current})"
            >
                ${current}
            </button>
        `;

    }


    html += `
        <button
            class="page-btn"
            ${
                page >= state.totalPages
                    ? "disabled"
                    : ""
            }
            onclick="changePage(${page + 1})"
        >
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;


    container.innerHTML =
        html;

}


/* ============================================================
   CHANGE PAGE
============================================================ */

function changePage(page) {

    if (
        page < 1 ||
        page > state.totalPages
    ) {
        return;
    }

    state.page = page;

    loadDashboard();

}


/* ============================================================
   DOCUMENT VIEW
============================================================ */

function viewDocument(id) {

    const url =
        `${API_BASE}/api/documents/${id}/download`;

    window.open(
        url,
        "_blank"
    );

}


/* ============================================================
   DOWNLOAD
============================================================ */

async function downloadDocument(id) {

    try {

        const response =
            await apiRequest(
                `${API_BASE}/api/documents/${id}/download`
            );

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                "a"
            );

        anchor.href =
            url;

        anchor.download =
            getDownloadName(
                response,
                `document-${id}`
            );

        document.body.appendChild(
            anchor
        );

        anchor.click();

        anchor.remove();

        URL.revokeObjectURL(
            url
        );

    } catch (error) {

        console.error(
            "Download failed:",
            error
        );

        alert(
            error.message ||
            "Unable to download document."
        );

    }

}


function getDownloadName(
    response,
    fallback
) {

    const disposition =
        response.headers.get(
            "content-disposition"
        );


    if (!disposition) {
        return fallback;
    }


    const match =
        disposition.match(
            /filename="?([^"]+)"?/i
        );


    return match
        ? match[1]
        : fallback;

}


/* ============================================================
   DOCUMENT MENU
============================================================ */

function documentMenu(id) {

    const action =
        prompt(
            "Enter action:\n\n" +
            "1 = Download\n" +
            "2 = View"
        );


    if (action === "1") {

        downloadDocument(id);

    } else if (action === "2") {

        viewDocument(id);

    }

}


/* ============================================================
   UPLOAD MODAL
============================================================ */

function openUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.add("show");

}


function closeUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.remove("show");

}


/* ============================================================
   UPLOAD
============================================================ */

async function uploadDocument(
    event
) {

    event.preventDefault();


    const fileInput =
        document.getElementById(
            "uploadFile"
        );

    const category =
        document.getElementById(
            "uploadCategory"
        ).value;

    const documentType =
        document.getElementById(
            "uploadType"
        ).value;

    const audit =
        document.getElementById(
            "uploadAudit"
        ).value;

    const description =
        document.getElementById(
            "uploadDescription"
        ).value;


    if (
        !fileInput.files.length
    ) {

        alert(
            "Please select a file."
        );

        return;

    }


    if (!category) {

        alert(
            "Please select a category."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        fileInput.files[0]
    );

    formData.append(
        "category",
        category
    );

    formData.append(
        "document_type",
        documentType
    );

    formData.append(
        "related_type",
        "Audit"
    );

    formData.append(
        "related_id",
        audit
    );

    formData.append(
        "document_description",
        description
    );


    try {

        const response =
            await apiRequest(
                UPLOAD_API,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        alert(
            result.message ||
            "Document uploaded successfully."
        );


        closeUploadModal();


        document
            .getElementById(
                "uploadForm"
            )
            .reset();


        state.page = 1;

        await loadDashboard();


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );

        alert(
            error.message ||
            "Unable to upload document."
        );

    }

}


/* ============================================================
   POPULATE UPLOAD AUDITS
============================================================ */

function populateUploadAudits(
    audits
) {

    const select =
        document.getElementById(
            "uploadAudit"
        );


    const current =
        select.value;


    select.innerHTML =
        `
        <option value="">
            Select audit
        </option>
        `;


    (audits || [])
        .forEach(audit => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                audit.audit_number;

            option.textContent =
                audit.label;

            select.appendChild(
                option
            );

        });


    if (current) {
        select.value = current;
    }

}


/* ============================================================
   FILTER EVENTS
============================================================ */

function setupFilters() {

    const search =
        document.getElementById(
            "documentSearch"
        );

    const audit =
        document.getElementById(
            "auditFilter"
        );

    const type =
        document.getElementById(
            "documentTypeFilter"
        );

    const category =
        document.getElementById(
            "categoryFilter"
        );

    const status =
        document.getElementById(
            "statusFilter"
        );


    let timer;


    search.addEventListener(
        "input",
        () => {

            clearTimeout(timer);

            timer =
                setTimeout(
                    () => {

                        state.search =
                            search.value.trim();

                        state.page = 1;

                        loadDashboard();

                    },
                    350
                );

        }
    );


    audit.addEventListener(
        "change",
        () => {

            state.audit =
                audit.value;

            state.page = 1;

            loadDashboard();

        }
    );


    type.addEventListener(
        "change",
        () => {

            state.documentType =
                type.value;

            state.page = 1;

            loadDashboard();

        }
    );


    category.addEventListener(
        "change",
        () => {

            state.category =
                category.value;

            state.page = 1;

            loadDashboard();

        }
    );


    status.addEventListener(
        "change",
        () => {

            state.status =
                status.value;

            state.page = 1;

            loadDashboard();

        }
    );

}


/* ============================================================
   CLEAR FILTERS
============================================================ */

function clearFilters() {

    state.search = "";

    state.audit =
        "All Audits";

    state.documentType =
        "All Types";

    state.category =
        "All Categories";

    state.status =
        "All Statuses";

    state.page = 1;


    document.getElementById(
        "documentSearch"
    ).value = "";

    document.getElementById(
        "auditFilter"
    ).value =
        "All Audits";

    document.getElementById(
        "documentTypeFilter"
    ).value =
        "All Types";

    document.getElementById(
        "categoryFilter"
    ).value =
        "All Categories";

    document.getElementById(
        "statusFilter"
    ).value =
        "All Statuses";


    loadDashboard();

}


/* ============================================================
   USER PROFILE
============================================================ */

async function loadCurrentUser() {

    try {

        const response =
            await apiRequest(
                `${API_BASE}/api/auth/me`
            );

        const user =
            await response.json();


        setText(
            "sidebarUserName",
            user.name || "Auditor"
        );

        setText(
            "sidebarUserRole",
            user.role || "Auditor"
        );

        setText(
            "topUserName",
            user.name || "Auditor"
        );

        setText(
            "topUserRole",
            user.role || "Auditor"
        );


    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error
        );

    }

}


/* ============================================================
   GLOBAL SEARCH
============================================================ */

function setupGlobalSearch() {

    const input =
        document.getElementById(
            "globalSearch"
        );

    input.addEventListener(
        "keydown",
        event => {

            if (
                event.key !== "Enter"
            ) {
                return;
            }

            const value =
                input.value.trim();

            state.search =
                value;

            document.getElementById(
                "documentSearch"
            ).value =
                value;

            state.page = 1;

            loadDashboard();

        }
    );

}


/* ============================================================
   HELPERS
============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


function formatDateTime(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return value;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );

}


function escapeHtml(
    value
) {

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


/* ============================================================
   LOADING / ERROR
============================================================ */

function showLoading() {

    const body =
        document.getElementById(
            "documentTableBody"
        );

    body.innerHTML = `
        <tr>
            <td colspan="8" class="loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading documents...
            </td>
        </tr>
    `;

}


function showError(
    message
) {

    const body =
        document.getElementById(
            "documentTableBody"
        );

    body.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="loading"
            >
                <i class="fa-solid fa-circle-exclamation"></i>
                ${escapeHtml(
                    message ||
                    "Unable to load documents."
                )}
            </td>
        </tr>
    `;

}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupFilters();

        setupGlobalSearch();


        document
            .getElementById(
                "clearFilters"
            )
            .addEventListener(
                "click",
                clearFilters
            );


        document
            .getElementById(
                "uploadButton"
            )
            .addEventListener(
                "click",
                openUploadModal
            );


        document
            .getElementById(
                "closeUploadModal"
            )
            .addEventListener(
                "click",
                closeUploadModal
            );


        document
            .getElementById(
                "cancelUpload"
            )
            .addEventListener(
                "click",
                closeUploadModal
            );


        document
            .getElementById(
                "uploadForm"
            )
            .addEventListener(
                "submit",
                uploadDocument
            );


        document
            .getElementById(
                "pageSize"
            )
            .addEventListener(
                "change",
                event => {

                    state.pageSize =
                        Number(
                            event.target.value
                        );

                    state.page = 1;

                    loadDashboard();

                }
            );


        document
            .getElementById(
                "filterButton"
            )
            .addEventListener(
                "click",
                () => {

                    document
                        .getElementById(
                            "filterPanel"
                        )
                        .classList.toggle(
                            "hidden"
                        );

                }
            );


        document
            .getElementById(
                "viewAllDocuments"
            )
            .addEventListener(
                "click",
                () => {

                    clearFilters();

                }
            );


        await loadCurrentUser();

        await loadDashboard();

    }
);