const API_BASE = window.location.origin;

let vendorId =
    sessionStorage.getItem("vendor_id") ||
    "";

let currentPage = 1;

const pageSize = 8;

let totalPages = 1;


/* =========================================================
   AUTH
========================================================= */

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
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


/* =========================================================
   FETCH
========================================================= */

async function apiFetch(
    url,
    options = {}
) {

    options.headers = {
        ...authHeaders(),
        ...(options.headers || {})
    };

    const response =
        await fetch(
            `${API_BASE}${url}`,
            options
        );

    if (!response.ok) {

        let message =
            `Request failed: ${response.status}`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


/* =========================================================
   VENDOR PROFILE
========================================================= */

async function loadVendorProfile() {

    if (!vendorId) {

        console.warn(
            "vendor_id not found in localStorage"
        );

        return;
    }

    try {

        const vendor =
            await apiFetch(
                `/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );

        const name =
            vendor.vendor_name ||
            "Vendor";

        document.getElementById(
            "headerVendorName"
        ).textContent = name;

        document.getElementById(
            "sidebarVendorName"
        ).textContent = name;

        document.getElementById(
            "sidebarVendorId"
        ).textContent =
            vendor.vendor_id || vendorId;

    } catch (error) {

        console.error(
            "Vendor profile error:",
            error
        );
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    if (!vendorId) {
        return;
    }

    try {

        const data =
            await apiFetch(
                `/api/vendor/documents/dashboard/${encodeURIComponent(vendorId)}`
            );

        updateKPIs(data);

        updateStorage(data);

        updateCategories(
            data.categories || []
        );

        updateRecentUploads(
            data.recent_uploads || []
        );

        populateCategoryFilter(
            data.categories || []
        );

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}


/* =========================================================
   KPI
========================================================= */

function updateKPIs(data) {

    document.getElementById(
        "totalDocuments"
    ).textContent =
        data.total_documents || 0;

    document.getElementById(
        "uploadedThisYear"
    ).textContent =
        data.uploaded_this_year || 0;

    document.getElementById(
        "pendingReview"
    ).textContent =
        data.pending_review || 0;

    document.getElementById(
        "expiringSoon"
    ).textContent =
        data.expiring_soon || 0;

    document.getElementById(
        "verifiedDocuments"
    ).textContent =
        data.verified_documents || 0;

    document.getElementById(
        "currentYear"
    ).textContent =
        new Date().getFullYear();
}


/* =========================================================
   STORAGE
========================================================= */

function formatBytes(bytes) {

    if (!bytes || bytes <= 0) {
        return "0 GB";
    }

    return (
        bytes /
        (1024 ** 3)
    ).toFixed(2) + " GB";
}


function updateStorage(data) {

    const used =
        Number(data.storage_used || 0);

    const limit =
        Number(data.storage_limit || 0);

    const available =
        Number(data.storage_available || 0);

    const percentage =
        limit > 0
            ? Math.min(
                100,
                (used / limit) * 100
            )
            : 0;

    document.getElementById(
        "storageUsed"
    ).textContent =
        formatBytes(used);

    document.getElementById(
        "storageLimit"
    ).textContent =
        formatBytes(limit);

    document.getElementById(
        "storageAvailable"
    ).textContent =
        `Available: ${formatBytes(available)}`;

    document.getElementById(
        "storagePercentage"
    ).textContent =
        `${Math.round(percentage)}%`;

    document.getElementById(
        "storageProgress"
    ).style.width =
        `${percentage}%`;
}


/* =========================================================
   CATEGORY
========================================================= */

function categoryClass(category) {

    return (
        String(category || "General")
            .toLowerCase()
            .replace(/\s+/g, "-")
    );
}


function categoryIconClass(category) {

    const value =
        String(category || "")
            .toLowerCase();

    if (
        value === "legal" ||
        value === "contract"
    ) {
        return "purple";
    }

    if (
        value === "tax" ||
        value === "financial"
    ) {
        return "green";
    }

    if (
        value === "insurance"
    ) {
        return "blue";
    }

    return "orange";
}


function updateCategories(categories) {

    const container =
        document.getElementById(
            "categoryList"
        );

    container.innerHTML = "";

    if (!categories.length) {

        container.innerHTML =
            `<div class="empty-state">
                No categories found
             </div>`;

        return;
    }

    categories
        .slice(0, 7)
        .forEach(item => {

            const iconClass =
                categoryIconClass(
                    item.category
                );

            container.insertAdjacentHTML(
                "beforeend",
                `
                <div class="category-row">

                    <div class="category-left">

                        <span
                            class="category-icon ${iconClass}"
                        >
                            ▤
                        </span>

                        ${escapeHtml(
                            item.category
                        )}

                    </div>

                    <span class="category-count">
                        ${item.count}
                    </span>

                </div>
                `
            );
        });
}


function populateCategoryFilter(categories) {

    const select =
        document.getElementById(
            "categoryFilter"
        );

    const current =
        select.value;

    select.innerHTML =
        `<option value="All">
            All Categories
         </option>`;

    categories.forEach(item => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            item.category;

        option.textContent =
            item.category;

        select.appendChild(option);
    });

    if (
        categories.some(
            x => x.category === current
        )
    ) {
        select.value = current;
    }
}


/* =========================================================
   DOCUMENTS
========================================================= */

async function loadDocuments() {

    if (!vendorId) {
        return;
    }

    const search =
        document.getElementById(
            "documentSearch"
        ).value.trim();

    const category =
        document.getElementById(
            "categoryFilter"
        ).value;

    const status =
        document.getElementById(
            "statusFilter"
        ).value;

    const params =
        new URLSearchParams();

    params.set(
        "page",
        currentPage
    );

    params.set(
        "limit",
        pageSize
    );

    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (category !== "All") {
        params.set(
            "category",
            category
        );
    }

    if (status !== "All") {
        params.set(
            "status",
            normalizeBackendStatus(status)
        );
    }

    try {

        const data =
            await apiFetch(
                `/api/vendor/documents/${encodeURIComponent(vendorId)}?${params.toString()}`
            );

        renderDocuments(
            data.items || []
        );

        renderPagination(
            data.pagination || {}
        );

    } catch (error) {

        console.error(
            "Document loading error:",
            error
        );

        document.getElementById(
            "documentTableBody"
        ).innerHTML =
            `
            <tr>
                <td colspan="7"
                    style="text-align:center;padding:30px;color:#d33">
                    ${escapeHtml(error.message)}
                </td>
            </tr>
            `;
    }
}


function normalizeBackendStatus(status) {

    if (status === "Verified") {
        return "Verified";
    }

    if (status === "Under Review") {
        return "Under Review";
    }

    if (status === "Pending") {
        return "Pending Review";
    }

    return status;
}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderDocuments(documents) {

    const body =
        document.getElementById(
            "documentTableBody"
        );

    body.innerHTML = "";

    if (!documents.length) {

        body.innerHTML =
            `
            <tr>
                <td colspan="7"
                    style="
                    text-align:center;
                    padding:40px;
                    color:#71809c;
                    ">
                    No documents found.
                </td>
            </tr>
            `;

        return;
    }

    documents.forEach(document => {

        body.insertAdjacentHTML(
            "beforeend",
            createDocumentRow(document)
        );
    });

    document.querySelectorAll(
        ".action-button"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                const id =
                    button.dataset.id;

                showActionMenu(
                    button,
                    id
                );
            }
        );
    });
}


function createDocumentRow(document) {

    const extension =
        String(
            document.file_type ||
            getExtension(
                document.document_name
            )
        ).toLowerCase();

    const fileClass =
        getFileClass(extension);

    const category =
        categoryClass(
            document.category
        );

    const status =
        getStatusDisplay(
            document.status
        );

    const expiry =
        getExpiryDisplay(
            document.expiry_date
        );

    const uploadedDate =
        formatDateTime(
            document.uploaded_on
        );

    const uploadedBy =
        document.uploaded_by_name ||
        "You";

    return `
        <tr>

            <td>

                <div class="document-name">

                    <div
                        class="file-icon ${fileClass}"
                    >
                        ${extension.toUpperCase()}
                    </div>

                    <div>

                        <strong>
                            ${escapeHtml(
                                document.document_name
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                document.document_name
                            )}
                        </small>

                    </div>

                </div>

            </td>


            <td>

                <span
                    class="category-tag ${category}"
                >
                    ${escapeHtml(
                        document.category ||
                        "General"
                    )}
                </span>

            </td>


            <td>

                <div class="uploaded-by">

                    <strong>
                        ${escapeHtml(
                            uploadedBy
                        )}
                    </strong>

                    <small>
                        Vendor
                    </small>

                </div>

            </td>


            <td>

                ${uploadedDate.date}

                <div
                    style="
                    margin-top:3px;
                    color:#7b8aa7;
                    font-size:9px;
                    "
                >
                    ${uploadedDate.time}
                </div>

            </td>


            <td>

                <span
                    class="status ${status.className}"
                >
                    ${status.text}
                </span>

            </td>


            <td>

                <div
                    class="expiry-date ${expiry.className}"
                >

                    <strong>
                        ${expiry.date}
                    </strong>

                    <small>
                        ${expiry.message}
                    </small>

                </div>

            </td>


            <td>

                <button
                    class="action-button"
                    data-id="${document.id}"
                    title="Actions"
                >
                    •••
                </button>

            </td>

        </tr>
    `;
}


/* =========================================================
   STATUS
========================================================= */

function getStatusDisplay(status) {

    const value =
        String(status || "")
            .toLowerCase();

    if (
        value === "verified" ||
        value === "approved"
    ) {
        return {
            text: "Verified",
            className: "verified"
        };
    }

    if (
        value.includes("review")
    ) {
        return {
            text: "Under Review",
            className: "review"
        };
    }

    if (
        value === "pending"
    ) {
        return {
            text: "Pending",
            className: "pending"
        };
    }

    if (
        value === "rejected"
    ) {
        return {
            text: "Rejected",
            className: "rejected"
        };
    }

    return {
        text: status || "Pending",
        className: "pending"
    };
}


/* =========================================================
   EXPIRY
========================================================= */

function getExpiryDisplay(dateValue) {

    if (!dateValue) {

        return {
            date: "—",
            message: "",
            className: ""
        };
    }

    const expiry =
        new Date(dateValue);

    const today =
        new Date();

    today.setHours(
        0, 0, 0, 0
    );

    expiry.setHours(
        0, 0, 0, 0
    );

    const difference =
        Math.ceil(
            (
                expiry - today
            ) /
            (1000 * 60 * 60 * 24)
        );

    if (difference < 0) {

        return {
            date: formatDate(
                dateValue
            ),
            message: "Expired",
            className: "expired"
        };
    }

    return {
        date: formatDate(
            dateValue
        ),
        message:
            difference === 0
                ? "Expires today"
                : `In ${difference} days`,
        className: "good"
    };
}


/* =========================================================
   RECENT UPLOADS
========================================================= */

function updateRecentUploads(
    documents
) {

    const container =
        document.getElementById(
            "recentUploads"
        );

    container.innerHTML = "";

    documents
        .slice(0, 3)
        .forEach(document => {

            const extension =
                String(
                    document.file_type ||
                    getExtension(
                        document.document_name
                    )
                ).toLowerCase();

            const fileClass =
                getFileClass(
                    extension
                );

            container.insertAdjacentHTML(
                "beforeend",
                `
                <div class="recent-item">

                    <div
                        class="
                        recent-file-icon
                        ${fileClass}
                        "
                    >
                        ${extension.toUpperCase()}
                    </div>

                    <div class="recent-info">

                        <strong>
                            ${escapeHtml(
                                document.document_name
                            )}
                        </strong>

                        <small>
                            ${formatDate(
                                document.uploaded_on
                            )}
                        </small>

                    </div>

                </div>
                `
            );
        });
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    pagination
) {

    const container =
        document.getElementById(
            "pagination"
        );

    container.innerHTML = "";

    currentPage =
        pagination.page || 1;

    totalPages =
        pagination.total_pages || 1;

    const total =
        pagination.total || 0;

    const start =
        total === 0
            ? 0
            : (
                (currentPage - 1)
                * pageSize
            ) + 1;

    const end =
        Math.min(
            currentPage * pageSize,
            total
        );

    document.getElementById(
        "tableSummary"
    ).textContent =
        `Showing ${start} to ${end} of ${total} documents`;

    if (currentPage > 1) {

        container.appendChild(
            paginationButton(
                "‹",
                currentPage - 1
            )
        );
    }

    const startPage =
        Math.max(
            1,
            currentPage - 2
        );

    const endPage =
        Math.min(
            totalPages,
            startPage + 4
        );

    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

        container.appendChild(
            paginationButton(
                page,
                page,
                page === currentPage
            )
        );
    }

    if (currentPage < totalPages) {

        container.appendChild(
            paginationButton(
                "›",
                currentPage + 1
            )
        );
    }
}


function paginationButton(
    text,
    page,
    active = false
) {

    const button =
        document.createElement(
            "button"
        );

    button.textContent =
        text;

    if (active) {
        button.classList.add(
            "active"
        );
    }

    button.addEventListener(
        "click",
        () => {

            currentPage = page;

            loadDocuments();
        }
    );

    return button;
}


/* =========================================================
   ACTION MENU
========================================================= */

function showActionMenu(
    button,
    documentId
) {

    closeActionMenus();

    const menu =
        document.createElement(
            "div"
        );

    menu.className =
        "document-action-menu";

    menu.innerHTML =
        `
        <button
            data-action="download"
        >
            Download
        </button>

        <button
            data-action="delete"
        >
            Delete
        </button>
        `;

    Object.assign(
        menu.style,
        {
            position: "fixed",
            background: "white",
            border: "1px solid #e1e7f0",
            borderRadius: "7px",
            boxShadow:
                "0 8px 25px rgba(0,0,0,.12)",
            padding: "5px",
            zIndex: "5000"
        }
    );

    document.body.appendChild(
        menu
    );

    const rect =
        button.getBoundingClientRect();

    menu.style.top =
        `${rect.bottom + 5}px`;

    menu.style.left =
        `${rect.right - 120}px`;

    menu.querySelectorAll(
        "button"
    ).forEach(item => {

        item.style.display =
            "block";

        item.style.width =
            "110px";

        item.style.padding =
            "8px";

        item.style.border =
            "0";

        item.style.background =
            "white";

        item.style.textAlign =
            "left";

        item.style.fontSize =
            "11px";

        item.addEventListener(
            "click",
            () => {

                const action =
                    item.dataset.action;

                if (
                    action === "download"
                ) {
                    downloadDocument(
                        documentId
                    );
                }

                if (
                    action === "delete"
                ) {
                    deleteDocument(
                        documentId
                    );
                }

                closeActionMenus();
            }
        );
    });

    setTimeout(
        () => {

            document.addEventListener(
                "click",
                closeActionMenus,
                {
                    once: true
                }
            );

        },
        0
    );
}


function closeActionMenus() {

    document
        .querySelectorAll(
            ".document-action-menu"
        )
        .forEach(
            element => element.remove()
        );
}


/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadDocument(
    documentId
) {

    if (!vendorId) {
        return;
    }

    try {

        const token =
            getToken();

        const response =
            await fetch(
                `${API_BASE}/api/vendor/documents/` +
                `${encodeURIComponent(vendorId)}/` +
                `${documentId}/download`,
                {
                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {}
                }
            );

        if (!response.ok) {

            throw new Error(
                "Unable to download document."
            );
        }

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "document";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

    } catch (error) {

        alert(error.message);
    }
}


/* =========================================================
   DELETE
========================================================= */

async function deleteDocument(
    documentId
) {

    if (
        !confirm(
            "Delete this document?"
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            `/api/vendor/documents/` +
            `${encodeURIComponent(vendorId)}/` +
            `${documentId}`,
            {
                method: "DELETE"
            }
        );

        await Promise.all([
            loadDashboard(),
            loadDocuments()
        ]);

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* =========================================================
   UPLOAD MODAL
========================================================= */

function openUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.add(
            "show"
        );
}


function closeUploadModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList.remove(
            "show"
        );

    document
        .getElementById(
            "uploadForm"
        )
        .reset();

    document
        .getElementById(
            "uploadMessage"
        ).textContent = "";
}


async function uploadDocument(
    event
) {

    event.preventDefault();

    if (!vendorId) {

        showUploadMessage(
            "Vendor ID is missing.",
            true
        );

        return;
    }

    const form =
        document.getElementById(
            "uploadForm"
        );

    const formData =
        new FormData(form);

    const button =
        document.getElementById(
            "submitUpload"
        );

    button.disabled = true;

    button.textContent =
        "Uploading...";

    try {

        const token =
            getToken();

        const response =
            await fetch(
                `${API_BASE}/api/vendor/documents/upload`,
                {
                    method: "POST",

                    headers: token
                        ? {
                            Authorization:
                                `Bearer ${token}`
                        }
                        : {},

                    body: formData
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed."
            );
        }

        showUploadMessage(
            "Document uploaded successfully.",
            false
        );

        await Promise.all([
            loadDashboard(),
            loadDocuments()
        ]);

        setTimeout(
            closeUploadModal,
            800
        );

    } catch (error) {

        showUploadMessage(
            error.message,
            true
        );

    } finally {

        button.disabled =
            false;

        button.textContent =
            "Upload Document";
    }
}


function showUploadMessage(
    message,
    error
) {

    const element =
        document.getElementById(
            "uploadMessage"
        );

    element.textContent =
        message;

    element.className =
        `upload-message ${
            error
                ? "error"
                : "success"
        }`;
}


/* =========================================================
   HELPERS
========================================================= */

function getExtension(
    filename
) {

    const parts =
        String(filename || "")
            .split(".");

    return (
        parts.length > 1
            ? parts.pop()
            : "file"
    );
}


function getFileClass(
    extension
) {

    extension =
        String(
            extension || ""
        ).toLowerCase();

    if (extension === "pdf") {
        return "pdf";
    }

    if (
        extension === "xls" ||
        extension === "xlsx"
    ) {
        return "xls";
    }

    if (
        extension === "doc" ||
        extension === "docx"
    ) {
        return "doc";
    }

    if (
        extension === "ppt" ||
        extension === "pptx"
    ) {
        return "ppt";
    }

    return "doc";
}


function formatDate(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
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


function formatDateTime(
    value
) {

    if (!value) {

        return {
            date: "—",
            time: ""
        };
    }

    const date =
        new Date(value);

    return {
        date:
            date.toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            ),

        time:
            date.toLocaleTimeString(
                "en-US",
                {
                    hour: "numeric",
                    minute: "2-digit"
                }
            )
    };
}


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


/* =========================================================
   SEARCH / FILTER EVENTS
========================================================= */

let searchTimer;

document
    .getElementById(
        "documentSearch"
    )
    .addEventListener(
        "input",
        () => {

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        currentPage = 1;

                        loadDocuments();

                    },
                    350
                );
        }
    );


document
    .getElementById(
        "globalSearch"
    )
    .addEventListener(
        "input",
        event => {

            document
                .getElementById(
                    "documentSearch"
                )
                .value =
                event.target.value;

            clearTimeout(
                searchTimer
            );

            searchTimer =
                setTimeout(
                    () => {

                        currentPage = 1;

                        loadDocuments();

                    },
                    350
                );
        }
    );


document
    .getElementById(
        "categoryFilter"
    )
    .addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadDocuments();
        }
    );


document
    .getElementById(
        "statusFilter"
    )
    .addEventListener(
        "change",
        () => {

            currentPage = 1;

            loadDocuments();
        }
    );


/* =========================================================
   MODAL EVENTS
========================================================= */

document
    .getElementById(
        "uploadDocumentButton"
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
        "uploadModal"
    )
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id ===
                "uploadModal"
            ) {
                closeUploadModal();
            }
        }
    );


/* =========================================================
   LOGOUT
========================================================= */

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        event => {

            event.preventDefault();

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "jwt_token"
            );

            localStorage.removeItem(
                "vendor_id"
            );

            localStorage.removeItem(
                "vendorId"
            );

            window.location.href =
                "/login";
        }
    );


/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadVendorProfile();

        await loadDashboard();

        await loadDocuments();

    }
);