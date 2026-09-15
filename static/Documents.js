"use strict";

/* ==========================================================
   VENDORIQ DOCUMENTS
   Complete Documents Dashboard JavaScript
   ========================================================== */

const API_BASE = "/api/documents";

let allDocuments = [];


/* ==========================================================
   GENERIC API
   ========================================================== */

async function apiFetch(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        credentials: "include"
    });

    const contentType =
        response.headers.get("content-type") || "";

    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();

        if (text) {
            data = text;
        }
    }

    if (!response.ok) {

        let message = `Request failed: ${response.status}`;

        if (data) {

            if (typeof data === "object") {
                message =
                    data.detail ||
                    data.message ||
                    data.error ||
                    message;
            } else if (typeof data === "string") {
                message = data;
            }
        }

        throw new Error(message);
    }

    return data;
}


/* ==========================================================
   HTML ESCAPE
   ========================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================================
   ERROR MESSAGE
   ========================================================== */

function showError(message) {

    console.error("Documents Error:", message);

    const existing =
        document.getElementById("documentsError");

    if (existing) {
        existing.remove();
    }

    const errorBox =
        document.createElement("div");

    errorBox.id = "documentsError";

    errorBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        width: min(420px, calc(100vw - 40px));
        padding: 16px 18px;
        border-radius: 12px;
        background: #fff1f2;
        color: #991b1b;
        border: 1px solid #fecdd3;
        box-shadow: 0 15px 40px rgba(0,0,0,.18);
        font-family: Arial, sans-serif;
        font-size: 14px;
    `;

    errorBox.innerHTML = `
        <div style="
            display:flex;
            align-items:flex-start;
            gap:10px;
        ">

            <i
                class="fa-solid fa-circle-exclamation"
                style="margin-top:2px;"
            ></i>

            <div>

                <strong>
                    Documents Error
                </strong>

                <div style="
                    margin-top:6px;
                    line-height:1.5;
                ">
                    ${escapeHtml(
                        message ||
                        "Something went wrong."
                    )}
                </div>

            </div>

        </div>
    `;

    document.body.appendChild(errorBox);

    setTimeout(() => {

        if (errorBox.parentNode) {
            errorBox.remove();
        }

    }, 6000);
}


/* ==========================================================
   FORMAT FILE SIZE
   ========================================================== */

function formatBytes(bytes) {

    const numericBytes =
        Number(bytes) || 0;

    if (numericBytes <= 0) {
        return "0 KB";
    }

    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];

    let index = 0;
    let size = numericBytes;

    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size /= 1024;
        index++;
    }

    return `${size.toFixed(
        index === 0 ? 0 : 1
    )} ${units[index]}`;
}


/* ==========================================================
   DATE
   ========================================================== */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* ==========================================================
   DATE + TIME
   ========================================================== */

function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
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


/* ==========================================================
   FILE ICON
   ========================================================== */

function getFileIcon(type) {

    const extension =
        String(type || "")
            .toLowerCase()
            .replace(".", "")
            .trim();

    if (extension === "pdf") {

        return `
            <div class="file-icon pdf">
                <i class="fa-solid fa-file-pdf"></i>
            </div>
        `;
    }

    if (
        extension === "xls" ||
        extension === "xlsx" ||
        extension === "csv"
    ) {

        return `
            <div class="file-icon xls">
                <i class="fa-solid fa-file-excel"></i>
            </div>
        `;
    }

    if (
        extension === "doc" ||
        extension === "docx"
    ) {

        return `
            <div class="file-icon doc">
                <i class="fa-solid fa-file-word"></i>
            </div>
        `;
    }

    if (
        extension === "ppt" ||
        extension === "pptx"
    ) {

        return `
            <div class="file-icon ppt">
                <i class="fa-solid fa-file-powerpoint"></i>
            </div>
        `;
    }

    if (
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "png" ||
        extension === "gif" ||
        extension === "webp"
    ) {

        return `
            <div class="file-icon image">
                <i class="fa-solid fa-file-image"></i>
            </div>
        `;
    }

    if (
        extension === "zip" ||
        extension === "rar" ||
        extension === "7z"
    ) {

        return `
            <div class="file-icon archive">
                <i class="fa-solid fa-file-zipper"></i>
            </div>
        `;
    }

    return `
        <div class="file-icon doc">
            <i class="fa-solid fa-file"></i>
        </div>
    `;
}


/* ==========================================================
   STATUS CLASS
   ========================================================== */

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();

    if (
        value.includes("approved") ||
        value.includes("compliant")
    ) {
        return "approved";
    }

    if (
        value.includes("expired") ||
        value.includes("rejected") ||
        value.includes("non-compliant")
    ) {
        return "expired";
    }

    return "pending";
}


/* ==========================================================
   LOAD DASHBOARD
   ========================================================== */

async function loadDashboard() {

    try {

        const data =
            await apiFetch(
                `${API_BASE}/dashboard`
            );

        if (!data) {
            throw new Error(
                "No dashboard data was returned by the server."
            );
        }

        updateStatistics(data);

        allDocuments =
            Array.isArray(data.documents)
                ? data.documents
                : [];

        const categories =
            Array.isArray(data.categories)
                ? data.categories
                : [];

        const expiringDocuments =
            Array.isArray(data.expiring_documents)
                ? data.expiring_documents
                : [];

        const recentActivity =
            Array.isArray(data.recent_activity)
                ? data.recent_activity
                : [];

        const pendingDocuments =
            Array.isArray(data.pending_documents)
                ? data.pending_documents
                : [];

        populateCategoryFilter(
            categories
        );

        renderDocuments(
            allDocuments
        );

        renderCategories(
            categories
        );

        renderExpiringDocuments(
            expiringDocuments
        );

        renderActivity(
            recentActivity
        );

        renderPendingApprovals(
            pendingDocuments
        );

        renderStorage(
            data
        );

    } catch (error) {

        console.error(
            "loadDashboard failed:",
            error
        );

        showError(
            error.message ||
            "Unable to load documents dashboard."
        );
    }
}


/* ==========================================================
   STATISTICS
   ========================================================== */

function updateStatistics(data) {

    const totalDocuments =
        document.getElementById(
            "totalDocuments"
        );

    if (totalDocuments) {

        totalDocuments.textContent =
            Number(
                data.total_documents || 0
            ).toLocaleString();
    }


    const totalFolders =
        document.getElementById(
            "totalFolders"
        );

    if (totalFolders) {

        totalFolders.textContent =
            Number(
                data.total_folders || 0
            ).toLocaleString();
    }


    const recentlyAdded =
        document.getElementById(
            "recentlyAdded"
        );

    if (recentlyAdded) {

        recentlyAdded.textContent =
            Number(
                data.recently_added || 0
            ).toLocaleString();
    }


    const pendingApprovals =
        document.getElementById(
            "pendingApprovals"
        );

    if (pendingApprovals) {

        pendingApprovals.textContent =
            Number(
                data.pending_approvals || 0
            ).toLocaleString();
    }


    const expiringSoon =
        document.getElementById(
            "expiringSoon"
        );

    if (expiringSoon) {

        expiringSoon.textContent =
            Number(
                data.expiring_soon || 0
            ).toLocaleString();
    }
}


/* ==========================================================
   CATEGORY FILTER
   ========================================================== */

function populateCategoryFilter(categories) {

    const select =
        document.getElementById(
            "categoryFilter"
        );

    if (!select) {
        return;
    }

    const current =
        select.value || "All";

    select.innerHTML = `
        <option value="All">
            All Categories
        </option>
    `;

    categories.forEach(item => {

        const category =
            item?.category;

        if (!category) {
            return;
        }

        const option =
            document.createElement(
                "option"
            );

        option.value =
            category;

        option.textContent =
            category;

        select.appendChild(
            option
        );
    });

    const exists =
        Array.from(
            select.options
        ).some(
            option =>
                option.value === current
        );

    select.value =
        exists
            ? current
            : "All";
}


/* ==========================================================
   DOCUMENT TABLE
   ========================================================== */

function renderDocuments(documents) {

    const tbody =
        document.getElementById(
            "documentsTable"
        );

    if (!tbody) {

        console.error(
            "Element #documentsTable was not found."
        );

        return;
    }

    tbody.innerHTML = "";

    const safeDocuments =
        Array.isArray(documents)
            ? documents
            : [];

    if (!safeDocuments.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No documents found.
                </td>
            </tr>
        `;

        return;
    }

    safeDocuments.forEach(doc => {

        /*
         * IMPORTANT:
         * Do NOT call this variable "document".
         *
         * "document" is the browser DOM object.
         *
         * Using "doc" prevents:
         * document.createElement is not a function
         */

        const statusClass =
            getStatusClass(
                doc?.status
            );

        const row =
            document.createElement(
                "tr"
            );

        row.innerHTML = `

            <td>

                <div class="document-name">

                    ${getFileIcon(
                        doc?.file_type
                    )}

                    <div>

                        <strong>
                            ${escapeHtml(
                                doc?.document_name ||
                                "Untitled Document"
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                doc?.category ||
                                "-"
                            )}
                        </small>

                    </div>

                </div>

            </td>


            <td>

                <span class="category-badge">

                    ${escapeHtml(
                        doc?.category ||
                        "-"
                    )}

                </span>

            </td>


            <td>
                ${escapeHtml(
                    doc?.related_id ||
                    "-"
                )}
            </td>


            <td>
                ${escapeHtml(
                    doc?.uploaded_by_name ||
                    "-"
                )}
            </td>


            <td>
                ${formatDateTime(
                    doc?.uploaded_on
                )}
            </td>


            <td>
                ${formatBytes(
                    doc?.file_size
                )}
            </td>


            <td>

                <span
                    class="status ${statusClass}"
                >
                    ${escapeHtml(
                        doc?.status ||
                        "Pending"
                    )}
                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="action-btn"
                    title="Download"
                    onclick="downloadDocument(${Number(
                        doc?.id || 0
                    )})"
                >
                    <i class="fa-solid fa-download"></i>
                </button>

                <button
                    type="button"
                    class="action-btn"
                    title="View"
                    onclick="viewDocument(${Number(
                        doc?.id || 0
                    )})"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>

            </td>

        `;

        tbody.appendChild(
            row
        );
    });
}


/* ==========================================================
   SEARCH + FILTER
   ========================================================== */

function filterDocuments() {

    const searchElement =
        document.getElementById(
            "documentSearch"
        );

    const categoryElement =
        document.getElementById(
            "categoryFilter"
        );

    const statusElement =
        document.getElementById(
            "statusFilter"
        );

    const search =
        String(
            searchElement?.value || ""
        )
            .toLowerCase()
            .trim();

    const category =
        categoryElement?.value ||
        "All";

    const status =
        statusElement?.value ||
        "All";

    const filtered =
        allDocuments.filter(doc => {

            const documentName =
                String(
                    doc?.document_name ||
                    ""
                )
                    .toLowerCase();

            const relatedId =
                String(
                    doc?.related_id ||
                    ""
                )
                    .toLowerCase();

            const uploadedBy =
                String(
                    doc?.uploaded_by_name ||
                    ""
                )
                    .toLowerCase();

            const docCategory =
                String(
                    doc?.category ||
                    ""
                );

            const docStatus =
                String(
                    doc?.status ||
                    ""
                );

            const matchesSearch =
                !search ||
                documentName.includes(search) ||
                relatedId.includes(search) ||
                uploadedBy.includes(search);

            const matchesCategory =
                category === "All" ||
                docCategory === category;

            const matchesStatus =
                status === "All" ||
                docStatus === status;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesStatus
            );
        });

    renderDocuments(
        filtered
    );
}


/* ==========================================================
   SHOW ALL DOCUMENTS
   ========================================================== */

function showAllDocuments() {

    const searchElement =
        document.getElementById(
            "documentSearch"
        );

    const categoryElement =
        document.getElementById(
            "categoryFilter"
        );

    const statusElement =
        document.getElementById(
            "statusFilter"
        );


    if (searchElement) {
        searchElement.value = "";
    }


    if (categoryElement) {
        categoryElement.value = "All";
    }


    if (statusElement) {
        statusElement.value = "All";
    }


    renderDocuments(
        allDocuments
    );
}


/*
 * Required because your HTML uses:
 *
 * onclick="showAllDocuments()"
 */

window.showAllDocuments =
    showAllDocuments;


/* ==========================================================
   CATEGORIES
   ========================================================== */

function renderCategories(categories) {

    const container =
        document.getElementById(
            "categoriesList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const safeCategories =
        Array.isArray(categories)
            ? categories
            : [];

    safeCategories
        .slice(0, 10)
        .forEach(item => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "category-row";

            row.innerHTML = `

                <i
                    class="fa-solid fa-folder"
                ></i>

                <span>
                    ${escapeHtml(
                        item?.category ||
                        "Uncategorized"
                    )}
                </span>

                <strong>
                    ${Number(
                        item?.count || 0
                    ).toLocaleString()}
                </strong>

            `;

            container.appendChild(
                row
            );
        });

    if (!safeCategories.length) {

        container.innerHTML = `
            <div style="
                padding:15px;
                color:#7b879a;
                font-size:13px;
            ">
                No categories available.
            </div>
        `;
    }
}


/* ==========================================================
   EXPIRING DOCUMENTS
   ========================================================== */

function renderExpiringDocuments(documents) {

    const container =
        document.getElementById(
            "expiringList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const safeDocuments =
        Array.isArray(documents)
            ? documents
            : [];

    safeDocuments.forEach(doc => {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "expiring-row";

        const days =
            daysUntil(
                doc?.expiry_date
            );

        row.innerHTML = `

            ${getFileIcon(
                doc?.file_type
            )}

            <div class="expiring-info">

                <strong>
                    ${escapeHtml(
                        doc?.document_name ||
                        "Untitled Document"
                    )}
                </strong>

                <small>
                    ${escapeHtml(
                        doc?.related_id ||
                        doc?.category ||
                        "-"
                    )}
                </small>

            </div>

            <span class="expiry-days">
                ${days} days left
            </span>

        `;

        container.appendChild(
            row
        );
    });


    if (!safeDocuments.length) {

        container.innerHTML = `
            <div style="
                padding:15px;
                font-size:13px;
                color:#7b879a;
            ">
                No documents expiring soon.
            </div>
        `;
    }
}


/* ==========================================================
   DAYS UNTIL EXPIRY
   ========================================================== */

function daysUntil(value) {

    if (!value) {
        return 0;
    }

    const expiry =
        new Date(value);

    if (Number.isNaN(
        expiry.getTime()
    )) {
        return 0;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return Math.max(
        0,
        Math.ceil(
            (
                expiry - today
            ) / 86400000
        )
    );
}


/* ==========================================================
   RECENT ACTIVITY
   ========================================================== */

function renderActivity(activities) {

    const container =
        document.getElementById(
            "recentActivity"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const safeActivities =
        Array.isArray(activities)
            ? activities
            : [];

    safeActivities.forEach(activity => {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "activity-row";

        row.innerHTML = `

            <div class="activity-icon">

                <i class="fa-solid fa-file"></i>

            </div>

            <div class="activity-text">

                <strong>
                    ${escapeHtml(
                        activity?.message ||
                        "Document activity"
                    )}
                </strong>

                <small>

                    ${escapeHtml(
                        activity?.user_name ||
                        "System"
                    )}

                    ·

                    ${formatDateTime(
                        activity?.created_at
                    )}

                </small>

            </div>

        `;

        container.appendChild(
            row
        );
    });


    if (!safeActivities.length) {

        container.innerHTML = `
            <div style="
                padding:15px;
                color:#7b879a;
                font-size:13px;
            ">
                No recent activity.
            </div>
        `;
    }
}


/* ==========================================================
   PENDING APPROVALS
   ========================================================== */

function renderPendingApprovals(approvals) {

    const container =
        document.getElementById(
            "pendingList"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const safeApprovals =
        Array.isArray(approvals)
            ? approvals
            : [];

    safeApprovals.forEach(approval => {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "pending-row";

        row.innerHTML = `

            ${getFileIcon("pdf")}

            <div class="pending-text">

                <strong>
                    ${escapeHtml(
                        approval?.document_name ||
                        "Untitled Document"
                    )}
                </strong>

                <small>

                    Uploaded by
                    ${escapeHtml(
                        approval?.reviewer_name ||
                        "Manager"
                    )}

                    ·

                    ${formatDate(
                        approval?.requested_at
                    )}

                </small>

            </div>

            <button
                type="button"
                class="review-button"
                onclick="reviewApproval(${Number(
                    approval?.id || 0
                )})"
            >
                Review
            </button>

        `;

        container.appendChild(
            row
        );
    });


    if (!safeApprovals.length) {

        container.innerHTML = `
            <div style="
                padding:15px;
                color:#7b879a;
                font-size:13px;
            ">
                No pending approvals.
            </div>
        `;
    }
}


/* ==========================================================
   STORAGE
   ========================================================== */

function renderStorage(data) {

    const used =
        Number(
            data?.storage_used || 0
        );

    const limit =
        Number(
            data?.storage_limit || 1
        );

    const available =
        Number(
            data?.storage_available || 0
        );

    const percentage =
        Math.min(
            100,
            Math.max(
                0,
                (used / limit) * 100
            )
        );


    const storageUsed =
        document.getElementById(
            "storageUsed"
        );

    if (storageUsed) {

        storageUsed.textContent =
            formatBytes(used);
    }


    const storageAvailable =
        document.getElementById(
            "storageAvailable"
        );

    if (storageAvailable) {

        storageAvailable.textContent =
            formatBytes(available);
    }


    const storageRing =
        document.getElementById(
            "storageRing"
        );

    if (storageRing) {

        storageRing.style.background = `
            conic-gradient(
                #2563eb 0% ${percentage}%,
                #e5e7eb ${percentage}% 100%
            )
        `;
    }
}


/* ==========================================================
   DOWNLOAD DOCUMENT
   ========================================================== */

function downloadDocument(documentId) {

    if (!documentId) {

        showError(
            "Invalid document ID."
        );

        return;
    }

    window.open(
        `${API_BASE}/${encodeURIComponent(
            documentId
        )}/download`,
        "_blank"
    );
}

window.downloadDocument =
    downloadDocument;


/* ==========================================================
   VIEW DOCUMENT
   ========================================================== */

function viewDocument(documentId) {

    const doc =
        allDocuments.find(
            item =>
                Number(item?.id) ===
                Number(documentId)
        );

    if (!doc) {

        showError(
            "Document could not be found."
        );

        return;
    }

    alert(
        `Document: ${
            doc.document_name || "-"
        }\n\n` +

        `Category: ${
            doc.category || "-"
        }\n` +

        `Related To: ${
            doc.related_id || "-"
        }\n` +

        `Uploaded By: ${
            doc.uploaded_by_name || "-"
        }\n` +

        `Status: ${
            doc.status || "-"
        }\n` +

        `Size: ${
            formatBytes(doc.file_size)
        }`
    );
}

window.viewDocument =
    viewDocument;


/* ==========================================================
   REVIEW / APPROVAL
   ========================================================== */

async function reviewApproval(approvalId) {

    if (!approvalId) {

        showError(
            "Invalid approval ID."
        );

        return;
    }

    const confirmed =
        window.confirm(
            "Approve this document?"
        );

    if (!confirmed) {
        return;
    }

    try {

        await apiFetch(
            `${API_BASE}/approvals/${encodeURIComponent(
                approvalId
            )}?status=Approved&reviewer_id=1`,
            {
                method: "PATCH"
            }
        );

        await loadDashboard();

        window.alert(
            "Document approved successfully."
        );

    } catch (error) {

        console.error(
            "Approval failed:",
            error
        );

        showError(
            error.message ||
            "Unable to approve document."
        );
    }
}

window.reviewApproval =
    reviewApproval;


/* ==========================================================
   UPLOAD MODAL
   ========================================================== */

function openUploadModal() {

    const modal =
        document.getElementById(
            "uploadModal"
        );

    if (modal) {

        modal.classList.add(
            "show"
        );
    }
}

window.openUploadModal =
    openUploadModal;


function closeUploadModal() {

    const modal =
        document.getElementById(
            "uploadModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}

window.closeUploadModal =
    closeUploadModal;


/* ==========================================================
   UPLOAD DOCUMENT
   ========================================================== */

async function handleUpload(event) {

    event.preventDefault();

    const fileInput =
        document.getElementById(
            "uploadFile"
        );

    const categoryInput =
        document.getElementById(
            "uploadCategory"
        );

    const relatedInput =
        document.getElementById(
            "relatedId"
        );

    const expiryInput =
        document.getElementById(
            "expiryDate"
        );

    const file =
        fileInput?.files?.[0];

    if (!file) {

        showError(
            "Please select a file."
        );

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "category",
        categoryInput?.value || ""
    );

    formData.append(
        "related_id",
        relatedInput?.value || ""
    );

    formData.append(
        "expiry_date",
        expiryInput?.value || ""
    );

    formData.append(
        "uploaded_by",
        "1"
    );

    try {

        await apiFetch(
            `${API_BASE}/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        closeUploadModal();

        const form =
            document.getElementById(
                "uploadForm"
            );

        if (form) {
            form.reset();
        }

        await loadDashboard();

        window.alert(
            "Document uploaded successfully."
        );

    } catch (error) {

        console.error(
            "Document upload failed:",
            error
        );

        showError(
            error.message ||
            "Unable to upload document."
        );
    }
}


/* ==========================================================
   FOLDER MODAL
   ========================================================== */

function openFolderModal() {

    const modal =
        document.getElementById(
            "folderModal"
        );

    if (modal) {

        modal.classList.add(
            "show"
        );
    }
}

window.openFolderModal =
    openFolderModal;


function closeFolderModal() {

    const modal =
        document.getElementById(
            "folderModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}

window.closeFolderModal =
    closeFolderModal;


/* ==========================================================
   CREATE FOLDER
   ========================================================== */

async function handleFolderCreation(event) {

    event.preventDefault();

    const folderName =
        document.getElementById(
            "folderName"
        );

    const folderCategory =
        document.getElementById(
            "folderCategory"
        );

    const formData =
        new FormData();

    formData.append(
        "folder_name",
        folderName?.value || ""
    );

    formData.append(
        "category",
        folderCategory?.value || ""
    );

    formData.append(
        "created_by",
        "1"
    );

    try {

        await apiFetch(
            `${API_BASE}/folders`,
            {
                method: "POST",
                body: formData
            }
        );

        closeFolderModal();

        const form =
            document.getElementById(
                "folderForm"
            );

        if (form) {
            form.reset();
        }

        await loadDashboard();

        window.alert(
            "Folder created successfully."
        );

    } catch (error) {

        console.error(
            "Folder creation failed:",
            error
        );

        showError(
            error.message ||
            "Unable to create folder."
        );
    }
}


/* ==========================================================
   SUPPLY CHAIN PROFILE
   ========================================================== */

function openSupplyChainProfile() {

    window.location.href =
        "/SupplyChainProfile";
}

window.openSupplyChainProfile =
    openSupplyChainProfile;


/* ==========================================================
   CLOCK
   ========================================================== */

function updateClock() {

    const now =
        new Date();


    const currentDate =
        document.getElementById(
            "currentDate"
        );

    if (currentDate) {

        currentDate.textContent =
            now.toLocaleDateString(
                "en-IN",
                {
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                }
            );
    }


    const currentTime =
        document.getElementById(
            "currentTime"
        );

    if (currentTime) {

        currentTime.textContent =
            now.toLocaleTimeString(
                "en-IN",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }
}


/* ==========================================================
   EVENT INITIALIZATION
   ========================================================== */

function initializeDocumentEvents() {


    /* ------------------------------------------
       Upload form
       ------------------------------------------ */

    const uploadForm =
        document.getElementById(
            "uploadForm"
        );

    if (uploadForm) {

        uploadForm.addEventListener(
            "submit",
            handleUpload
        );
    }


    /* ------------------------------------------
       Folder form
       ------------------------------------------ */

    const folderForm =
        document.getElementById(
            "folderForm"
        );

    if (folderForm) {

        folderForm.addEventListener(
            "submit",
            handleFolderCreation
        );
    }


    /* ------------------------------------------
       Document search
       ------------------------------------------ */

    const documentSearch =
        document.getElementById(
            "documentSearch"
        );

    if (documentSearch) {

        documentSearch.addEventListener(
            "input",
            filterDocuments
        );
    }


    /* ------------------------------------------
       Category filter
       ------------------------------------------ */

    const categoryFilter =
        document.getElementById(
            "categoryFilter"
        );

    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            filterDocuments
        );
    }


    /* ------------------------------------------
       Status filter
       ------------------------------------------ */

    const statusFilter =
        document.getElementById(
            "statusFilter"
        );

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            filterDocuments
        );
    }


    /* ------------------------------------------
       Global search
       ------------------------------------------ */

    const globalSearch =
        document.getElementById(
            "globalSearch"
        );

    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            function () {

                const search =
                    document.getElementById(
                        "documentSearch"
                    );

                if (search) {

                    search.value =
                        this.value;

                    filterDocuments();
                }
            }
        );
    }


    /* ------------------------------------------
       Close modals when clicking outside
       ------------------------------------------ */

    const uploadModal =
        document.getElementById(
            "uploadModal"
        );

    if (uploadModal) {

        uploadModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    uploadModal
                ) {

                    closeUploadModal();
                }
            }
        );
    }


    const folderModal =
        document.getElementById(
            "folderModal"
        );

    if (folderModal) {

        folderModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    folderModal
                ) {

                    closeFolderModal();
                }
            }
        );
    }
}


/* ==========================================================
   AUTO REFRESH
   ========================================================== */

let dashboardRefreshTimer = null;

function startDashboardRefresh() {

    if (dashboardRefreshTimer) {

        clearInterval(
            dashboardRefreshTimer
        );
    }

    dashboardRefreshTimer =
        setInterval(
            loadDashboard,
            60000
        );
}


/* ==========================================================
   INITIALIZE
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeDocumentEvents();

        updateClock();

        setInterval(
            updateClock,
            1000
        );

        loadDashboard();

        startDashboardRefresh();
    }
);


/* ==========================================================
   GLOBAL EXPORTS
   ========================================================== */

window.loadDashboard =
    loadDashboard;

window.filterDocuments =
    filterDocuments;

window.showError =
    showError;