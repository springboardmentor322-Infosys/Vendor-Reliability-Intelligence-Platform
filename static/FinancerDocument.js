"use strict";

let dashboardData = null;
let allDocuments = [];
let filteredDocuments = [];
let currentPage = 1;

const PAGE_SIZE = 5;

let categoryChart = null;


/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE = window.location.origin;


/* =========================================================
   AUTHENTICATION
========================================================= */

function getAccessToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        null
    );
}


/* =========================================================
   API
========================================================= */

async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = new Headers(
        options.headers || {}
    );

    /*
     * Send JWT when available.
     */
    if (token) {

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );
    }

    /*
     * Do NOT manually set Content-Type for FormData.
     * Browser automatically creates multipart/form-data
     * boundary for file uploads.
     */

    const response = await fetch(url, {

        ...options,

        headers,

        credentials: "include"

    });


    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const data =
                await response.json();

            if (data.detail) {
                message = data.detail;
            }

        } catch (_) {}

        if (response.status === 401) {

            console.error(
                "401 Unauthorized:",
                url
            );

            console.error(
                "JWT token available:",
                !!token
            );

            /*
             * Do not automatically redirect if the
             * application has its own login handling.
             */

            throw new Error(
                "Not authenticated"
            );
        }


        throw new Error(message);
    }


    return response;
}


async function getJSON(url) {

    const response =
        await apiFetch(url);

    return await response.json();
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    setupEvents();

    await loadCurrentUser();

    await loadDashboard();

    await loadDocuments();

    await loadFolders();

});


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    const tableSearch =
        document.getElementById("tableSearch");

    const globalSearch =
        document.getElementById("globalSearch");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const typeFilter =
        document.getElementById("typeFilter");

    const dateFilter =
        document.getElementById("dateFilter");

    const uploadForm =
        document.getElementById("uploadForm");

    const folderForm =
        document.getElementById("folderForm");

    const dropZone =
        document.getElementById("dropZone");

    const documentFile =
        document.getElementById("documentFile");


    tableSearch?.addEventListener(
        "input",
        applyFilters
    );

    globalSearch?.addEventListener(
        "input",
        () => {

            tableSearch.value =
                globalSearch.value;

            applyFilters();
        }
    );

    categoryFilter?.addEventListener(
        "change",
        applyFilters
    );

    typeFilter?.addEventListener(
        "change",
        applyFilters
    );

    dateFilter?.addEventListener(
        "change",
        applyFilters
    );


    uploadForm?.addEventListener(
        "submit",
        handleUpload
    );

    folderForm?.addEventListener(
        "submit",
        handleCreateFolder
    );


    dropZone?.addEventListener(
        "click",
        () => documentFile.click()
    );


    documentFile?.addEventListener(
        "change",
        () => {

            if (documentFile.files.length) {

                const file =
                    documentFile.files[0];

                dropZone.querySelector("h3")
                    .textContent =
                    file.name;

                dropZone.querySelector("p")
                    .textContent =
                    formatBytes(file.size);
            }
        }
    );


    dropZone?.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            dropZone.classList.add("dragover");
        }
    );


    dropZone?.addEventListener(
        "dragleave",
        () => {

            dropZone.classList.remove("dragover");
        }
    );


    dropZone?.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            dropZone.classList.remove("dragover");

            if (!event.dataTransfer.files.length) {
                return;
            }

            documentFile.files =
                event.dataTransfer.files;

            const file =
                event.dataTransfer.files[0];

            dropZone.querySelector("h3")
                .textContent =
                file.name;

            dropZone.querySelector("p")
                .textContent =
                formatBytes(file.size);
        }
    );
}


/* =========================================================
   CURRENT USER
========================================================= */

async function loadCurrentUser() {

    try {

        const user =
            await getJSON(
                `${API_BASE}/api/auth/me`
            );

        const name =
            user.name || "User";

        const role =
            user.role || "";

        setText(
            "sidebarUserName",
            name
        );

        setText(
            "sidebarUserRole",
            role
        );

        setText(
            "topUserName",
            name
        );

        setText(
            "topUserRole",
            role
        );


        const initials =
            name
                .split(/\s+/)
                .map(part => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();


        setText(
            "sidebarAvatar",
            initials
        );

        setText(
            "topAvatar",
            initials
        );

    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error.message
        );
    }
}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        dashboardData =
            await getJSON(
                `${API_BASE}/api/documents/dashboard`
            );


        renderKPIs();

        renderCategories();

        renderRecentDocuments();

        renderStorage();

        renderExpiringDocuments();

    } catch (error) {

        console.error(
            "Dashboard load error:",
            error
        );

        showToast(
            "Unable to load document dashboard"
        );
    }
}


/* =========================================================
   KPI
========================================================= */

function renderKPIs() {

    const data = dashboardData;

    setText(
        "totalDocuments",
        formatNumber(data.total_documents)
    );

    setText(
        "totalFolders",
        formatNumber(data.total_folders)
    );

    setText(
        "recentDocuments",
        formatNumber(data.recently_added)
    );

    setText(
        "expiringDocuments",
        formatNumber(data.expiring_soon)
    );


    const used =
        Number(data.storage_used || 0);

    const limit =
        Number(data.storage_limit || 0);

    const percentage =
        limit
            ? Math.min(
                100,
                (used / limit) * 100
            )
            : 0;


    const usedText =
        formatBytes(used);

    const limitText =
        formatBytes(limit);


    setText(
        "storageUsed",
        usedText
    );

    setText(
        "storageText",
        `of ${limitText} used`
    );

    setText(
        "storagePercentage",
        `${percentage.toFixed(0)}%`
    );


    document.getElementById(
        "storageProgress"
    ).style.width =
        `${percentage}%`;
}


/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories() {

    const categories =
        dashboardData.categories || [];

    const total =
        dashboardData.total_documents || 0;


    setText(
        "categoryTotal",
        formatNumber(total)
    );


    const colors = [
        "#1264e8",
        "#12a76a",
        "#f99b1d",
        "#7b43d6",
        "#ef3e4a",
        "#b6c0d0"
    ];


    const labels =
        categories.map(
            item =>
                item.category || "Others"
        );

    const values =
        categories.map(
            item =>
                Number(item.count || 0)
        );


    const ctx =
        document.getElementById(
            "categoryChart"
        );


    if (categoryChart) {
        categoryChart.destroy();
    }


    categoryChart =
        new Chart(ctx, {

            type: "doughnut",

            data: {

                labels,

                datasets: [{

                    data: values,

                    backgroundColor: colors,

                    borderColor: "#ffffff",

                    borderWidth: 2
                }]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                cutout: "64%",

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {

                            label: context => {

                                const value =
                                    context.raw;

                                const percentage =
                                    total
                                        ? (
                                            value /
                                            total *
                                            100
                                        ).toFixed(1)
                                        : 0;

                                return `${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });


    const legend =
        document.getElementById(
            "categoryLegend"
        );


    legend.innerHTML =
        categories
            .slice(0, 6)
            .map((item, index) => {

                const percentage =
                    total
                        ? (
                            Number(item.count) /
                            total *
                            100
                        ).toFixed(1)
                        : 0;

                return `
                    <div class="legend-row">

                        <span
                            class="legend-dot"
                            style="background:${colors[index]}"
                        ></span>

                        <span class="legend-name">
                            ${escapeHTML(
                                item.category ||
                                "Others"
                            )}
                        </span>

                        <span class="legend-value">
                            ${item.count}
                            (${percentage}%)
                        </span>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   RECENT DOCUMENTS
========================================================= */

function renderRecentDocuments() {

    const container =
        document.getElementById(
            "recentDocumentsList"
        );


    const documents =
        dashboardData.documents || [];


    const recent =
        [...documents]
            .sort(
                (a,b) =>
                    new Date(b.uploaded_on) -
                    new Date(a.uploaded_on)
            )
            .slice(0, 5);


    if (!recent.length) {

        container.innerHTML =
            emptyState(
                "No documents uploaded yet"
            );

        return;
    }


    container.innerHTML =
        recent.map(document => {

            const type =
                getDocumentType(document);


            return `

                <div class="recent-item">

                    <div class="file-icon ${fileClass(type)}">

                        <i class="${fileIcon(type)}"></i>

                    </div>

                    <div class="file-details">

                        <strong>
                            ${escapeHTML(
                                document.document_name
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                document.category ||
                                "Other"
                            )}
                            •
                            Uploaded
                            ${timeAgo(
                                document.uploaded_on
                            )}
                        </small>

                    </div>

                    <span class="file-size">
                        ${formatBytes(
                            document.file_size
                        )}
                    </span>

                    <button
                        title="Download"
                        onclick="downloadDocument(
                            ${document.id}
                        )">

                        <i class="fa-solid fa-ellipsis-vertical"></i>

                    </button>

                </div>
            `;

        })
        .join("");
}


/* =========================================================
   STORAGE
========================================================= */

function renderStorage() {

    const used =
        Number(
            dashboardData.storage_used || 0
        );

    const limit =
        Number(
            dashboardData.storage_limit || 0
        );

    const percentage =
        limit
            ? Math.min(
                100,
                used / limit * 100
            )
            : 0;


    setText(
        "storageUsedLarge",
        formatBytes(used)
    );

    setText(
        "storagePercentageLarge",
        `${percentage.toFixed(0)}%`
    );


    document.getElementById(
        "storageBarLarge"
    ).style.width =
        `${percentage}%`;


    const documents =
        dashboardData.documents || [];


    const types = {};


    documents.forEach(document => {

        const type =
            getDocumentType(document);

        types[type] =
            (types[type] || 0) +
            Number(document.file_size || 0);
    });


    const total =
        Object.values(types)
            .reduce(
                (a,b) => a + b,
                0
            );


    const container =
        document.getElementById(
            "storageTypes"
        );


    const colors = [
        "#f99b1d",
        "#12a76a",
        "#1264e8",
        "#7b43d6",
        "#ef3e4a"
    ];


    container.innerHTML =
        Object.entries(types)
            .slice(0,5)
            .map(
                ([type,size],index) => {

                    const percent =
                        total
                            ? size / total * 100
                            : 0;

                    return `

                        <div class="storage-type">

                            <span>
                                ${escapeHTML(type)}
                            </span>

                            <div class="storage-type-bar">

                                <div
                                    style="
                                        width:${percent}%;
                                        background:${colors[index]};
                                    ">
                                </div>

                            </div>

                            <strong>
                                ${formatBytes(size)}
                            </strong>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   EXPIRING
========================================================= */

function renderExpiringDocuments() {

    const container =
        document.getElementById(
            "expiringList"
        );


    const documents =
        dashboardData.expiring_documents || [];


    if (!documents.length) {

        container.innerHTML =
            emptyState(
                "No documents expiring within 30 days"
            );

        return;
    }


    container.innerHTML =
        documents
            .slice(0,5)
            .map(document => {

                const days =
                    daysUntil(
                        document.expiry_date
                    );


                return `

                    <div class="expiring-item">

                        <div class="expiring-icon">

                            <i class="fa-regular fa-calendar-xmark"></i>

                        </div>

                        <div class="expiring-details">

                            <strong>
                                ${escapeHTML(
                                    document.document_name
                                )}
                            </strong>

                            <small>
                                Expires on
                                ${formatDate(
                                    document.expiry_date
                                )}
                            </small>

                        </div>

                        <span class="expiring-days">
                            ${days} day${days === 1 ? "" : "s"} left
                        </span>

                    </div>
                `;

            })
            .join("");
}


/* =========================================================
   DOCUMENTS
========================================================= */

async function loadDocuments() {

    try {

        allDocuments =
            await getJSON(
                `${API_BASE}/api/documents`
            );


        populateCategoryFilter();

        applyFilters();

    } catch (error) {

        console.error(
            "Documents load error:",
            error
        );

        showToast(
            "Unable to load documents"
        );
    }
}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function populateCategoryFilter() {

    const select =
        document.getElementById(
            "categoryFilter"
        );


    const categories =
        dashboardData?.categories || [];


    select.innerHTML = `
        <option value="All">
            All Categories
        </option>
    `;


    categories.forEach(item => {

        const option =
            document.createElement("option");

        option.value =
            item.category;

        option.textContent =
            item.category;

        select.appendChild(option);
    });
}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

    const search =
        (
            document.getElementById(
                "tableSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    const category =
        document.getElementById(
            "categoryFilter"
        )?.value || "All";


    const type =
        document.getElementById(
            "typeFilter"
        )?.value || "All";


    const dateRange =
        document.getElementById(
            "dateFilter"
        )?.value || "All";


    const now =
        new Date();


    filteredDocuments =
        allDocuments.filter(document => {

            const name =
                String(
                    document.document_name || ""
                ).toLowerCase();

            const documentCategory =
                String(
                    document.category || ""
                );


            const documentType =
                getDocumentType(document);


            if (
                search &&
                !name.includes(search) &&
                !documentCategory
                    .toLowerCase()
                    .includes(search)
            ) {
                return false;
            }


            if (
                category !== "All" &&
                documentCategory !== category
            ) {
                return false;
            }


            if (
                type !== "All" &&
                documentType !== type
            ) {
                return false;
            }


            if (dateRange !== "All") {

                const days =
                    Number(dateRange);

                const uploadDate =
                    new Date(
                        document.uploaded_on
                    );

                const diff =
                    (
                        now -
                        uploadDate
                    ) /
                    (1000 * 60 * 60 * 24);

                if (diff > days) {
                    return false;
                }
            }


            return true;
        });


    currentPage = 1;

    renderTable();
}


/* =========================================================
   TABLE
========================================================= */

function renderTable() {

    const body =
        document.getElementById(
            "documentsTableBody"
        );


    const total =
        filteredDocuments.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(total / PAGE_SIZE)
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const start =
        (currentPage - 1) *
        PAGE_SIZE;


    const pageDocuments =
        filteredDocuments.slice(
            start,
            start + PAGE_SIZE
        );


    if (!pageDocuments.length) {

        body.innerHTML = `

            <tr>

                <td colspan="8">

                    ${emptyState(
                        "No documents match your filters"
                    )}

                </td>

            </tr>
        `;

    } else {

        body.innerHTML =
            pageDocuments
                .map(renderDocumentRow)
                .join("");
    }


    const first =
        total
            ? start + 1
            : 0;

    const last =
        Math.min(
            start + PAGE_SIZE,
            total
        );


    setText(
        "tableSummary",
        `Showing ${first} to ${last} of ${total} documents`
    );


    renderPagination(totalPages);
}


/* =========================================================
   TABLE ROW
========================================================= */

function renderDocumentRow(document) {

    const type =
        getDocumentType(document);


    const status =
        String(
            document.status || "Active"
        );


    let statusClass = "";

    if (
        status.toLowerCase()
            .includes("pending")
    ) {
        statusClass = "pending";
    }

    if (
        status.toLowerCase()
            .includes("reject")
    ) {
        statusClass = "rejected";
    }


    return `

        <tr>

            <td>

                <div class="document-name-cell">

                    <div class="file-icon ${fileClass(type)}">

                        <i class="${fileIcon(type)}"></i>

                    </div>

                    <strong
                        title="${escapeHTML(
                            document.document_name
                        )}">

                        ${escapeHTML(
                            document.document_name
                        )}

                    </strong>

                </div>

            </td>


            <td>

                <span class="category-pill">

                    ${escapeHTML(
                        document.category ||
                        "Others"
                    )}

                </span>

            </td>


            <td>
                ${escapeHTML(type)}
            </td>


            <td>
                ${escapeHTML(
                    document.uploaded_by_name ||
                    "Unknown"
                )}
            </td>


            <td>
                ${formatDate(
                    document.uploaded_on
                )}
            </td>


            <td>
                ${formatBytes(
                    document.file_size
                )}
            </td>


            <td>

                <span
                    class="status-pill ${statusClass}">

                    ${escapeHTML(status)}

                </span>

            </td>


            <td>

                <div class="row-actions">

                    <button
                        title="Download"
                        onclick="downloadDocument(
                            ${document.id}
                        )">

                        <i class="fa-solid fa-download"></i>

                    </button>

                    <button
                        title="More"
                        onclick="documentActions(
                            ${document.id}
                        )">

                        <i class="fa-solid fa-ellipsis-vertical"></i>

                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(totalPages) {

    const container =
        document.getElementById(
            "pagination"
        );


    let html = "";


    html += `
        <button
            ${currentPage === 1 ? "disabled" : ""}
            onclick="changePage(${currentPage - 1})">

            <i class="fa-solid fa-chevron-left"></i>

        </button>
    `;


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        if (
            totalPages > 7 &&
            page > 3 &&
            page < totalPages - 2
        ) {

            if (page === 4) {

                html += `
                    <button disabled>
                        ...
                    </button>
                `;
            }

            continue;
        }


        html += `
            <button
                class="${page === currentPage ? "active" : ""}"
                onclick="changePage(${page})">

                ${page}

            </button>
        `;
    }


    html += `
        <button
            ${currentPage === totalPages ? "disabled" : ""}
            onclick="changePage(${currentPage + 1})">

            <i class="fa-solid fa-chevron-right"></i>

        </button>
    `;


    container.innerHTML = html;
}


function changePage(page) {

    if (
        page < 1 ||
        page >
        Math.ceil(
            filteredDocuments.length /
            PAGE_SIZE
        )
    ) {
        return;
    }

    currentPage = page;

    renderTable();
}


/* =========================================================
   DOWNLOAD
========================================================= */

function downloadDocument(documentId) {

    window.open(
        `${API_BASE}/api/documents/${documentId}/download`,
        "_blank"
    );
}


/* =========================================================
   UPLOAD MODAL
========================================================= */

async function openUploadModal() {

    document
        .getElementById("uploadModal")
        .classList.add("show");

    await loadFolders();
}


function closeUploadModal() {

    document
        .getElementById("uploadModal")
        .classList.remove("show");
}


/* =========================================================
   UPLOAD
========================================================= */

async function handleUpload(event) {

    event.preventDefault();


    const file =
        document.getElementById(
            "documentFile"
        ).files[0];


    if (!file) {

        showToast(
            "Please select a document"
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
        document.getElementById(
            "uploadCategory"
        ).value
    );


    formData.append(
        "document_type",
        document.getElementById(
            "uploadType"
        ).value
    );


    formData.append(
        "document_title",
        document.getElementById(
            "uploadTitle"
        ).value
    );


    formData.append(
        "document_description",
        document.getElementById(
            "uploadDescription"
        ).value
    );


    formData.append(
        "folder_id",
        document.getElementById(
            "uploadFolder"
        ).value
    );


    formData.append(
        "expiry_date",
        document.getElementById(
            "uploadExpiry"
        ).value
    );


    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/documents/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        closeUploadModal();

        event.target.reset();

        resetDropZone();

        showToast(
            result.message ||
            "Document uploaded successfully"
        );


        await loadDashboard();

        await loadDocuments();

    } catch (error) {

        console.error(
            "Upload error:",
            error
        );

        showToast(
            error.message ||
            "Upload failed"
        );
    }
}


/* =========================================================
   FOLDERS
========================================================= */

async function loadFolders() {

    try {

        const folders =
            await getJSON(
                `${API_BASE}/api/documents/folders`
            );


        const select =
            document.getElementById(
                "uploadFolder"
            );


        if (!select) {
            return;
        }


        select.innerHTML = `
            <option value="">
                Root folder
            </option>
        `;


        folders.forEach(folder => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                folder.id;

            option.textContent =
                folder.folder_name;

            select.appendChild(option);
        });

    } catch (error) {

        console.warn(
            "Folders endpoint unavailable:",
            error.message
        );
    }
}


function openFolderModal() {

    document
        .getElementById("folderModal")
        .classList.add("show");
}


function closeFolderModal() {

    document
        .getElementById("folderModal")
        .classList.remove("show");
}


async function handleCreateFolder(event) {

    event.preventDefault();


    const formData =
        new FormData();


    formData.append(
        "folder_name",
        document.getElementById(
            "folderName"
        ).value.trim()
    );


    formData.append(
        "category",
        document.getElementById(
            "folderCategory"
        ).value
    );


    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/documents/folders`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        closeFolderModal();

        event.target.reset();

        showToast(
            result.message ||
            "Folder created successfully"
        );


        await loadDashboard();

        await loadFolders();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to create folder"
        );
    }
}


/* =========================================================
   VIEW ACTIONS
========================================================= */

function scrollToDocuments() {

    document
        .querySelector(".documents-panel")
        ?.scrollIntoView({
            behavior: "smooth"
        });
}


function showRecent() {

    document.getElementById(
        "dateFilter"
    ).value = "7";

    scrollToDocuments();

    applyFilters();
}


function showExpiring() {

    const list =
        dashboardData?.expiring_documents || [];


    if (!list.length) {

        showToast(
            "No documents are expiring soon"
        );

        return;
    }


    scrollToDocuments();

    const ids =
        new Set(
            list.map(
                document =>
                    document.id
            )
        );


    filteredDocuments =
        allDocuments.filter(
            document =>
                ids.has(document.id)
        );

    currentPage = 1;

    renderTable();
}


function showFolders() {

    showToast(
        `${dashboardData?.total_folders || 0} folders available`
    );
}


function showAllCategories() {

    showToast(
        "Use the category filter to view documents by category"
    );
}


function showStorageDetails() {

    const used =
        formatBytes(
            dashboardData?.storage_used || 0
        );

    const limit =
        formatBytes(
            dashboardData?.storage_limit || 0
        );

    showToast(
        `Storage: ${used} of ${limit}`
    );
}


function shareDocument() {

    showToast(
        "Select a document from the table to share it"
    );
}


function requestDocument() {

    showToast(
        "Document request workflow can be added here"
    );
}


function showTemplates() {

    showToast(
        "Document templates can be connected to a template table"
    );
}


function showRecycleBin() {

    showToast(
        "Recycle Bin requires a soft-delete field/table"
    );
}


function documentActions(documentId) {

    const document =
        allDocuments.find(
            item =>
                item.id === documentId
        );


    if (!document) {
        return;
    }


    const action =
        confirm(
            `Download "${document.document_name}"?`
        );


    if (action) {
        downloadDocument(documentId);
    }
}


/* =========================================================
   UTILITIES
========================================================= */

function getDocumentType(document) {

    let type =
        String(
            document.file_type ||
            ""
        ).toUpperCase();


    if (type) {
        return type;
    }


    const name =
        String(
            document.document_name ||
            ""
        );


    const extension =
        name.includes(".")
            ? name
                .split(".")
                .pop()
                .toUpperCase()
            : "FILE";


    return extension;
}


function fileClass(type) {

    type =
        String(type)
            .toUpperCase();


    if (
        ["PDF"].includes(type)
    ) {
        return "pdf";
    }


    if (
        ["XLS", "XLSX", "CSV"].includes(type)
    ) {
        return "excel";
    }


    if (
        ["DOC", "DOCX"].includes(type)
    ) {
        return "word";
    }


    return "word";
}


function fileIcon(type) {

    type =
        String(type)
            .toUpperCase();


    if (type === "PDF") {
        return "fa-regular fa-file-pdf";
    }


    if (
        ["XLS", "XLSX", "CSV"]
            .includes(type)
    ) {
        return "fa-regular fa-file-excel";
    }


    if (
        ["DOC", "DOCX"]
            .includes(type)
    ) {
        return "fa-regular fa-file-word";
    }


    return "fa-regular fa-file";
}


function formatBytes(bytes) {

    bytes =
        Number(bytes || 0);


    if (!bytes) {
        return "0 KB";
    }


    const units =
        ["B", "KB", "MB", "GB", "TB"];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return `${(
        bytes /
        Math.pow(1024,index)
    ).toFixed(index >= 3 ? 2 : 1)}
    ${units[index]}`.replace(/\s+/g," ");
}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();
}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return "—";
    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


function daysUntil(value) {

    if (!value) {
        return 0;
    }


    const target =
        new Date(value);

    const today =
        new Date();

    today.setHours(
        0,0,0,0
    );

    target.setHours(
        0,0,0,0
    );


    return Math.max(
        0,
        Math.ceil(
            (
                target -
                today
            ) /
            86400000
        )
    );
}


function timeAgo(value) {

    const date =
        new Date(value);

    const seconds =
        Math.floor(
            (
                new Date() -
                date
            ) / 1000
        );


    if (seconds < 60) {
        return "just now";
    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    if (minutes < 60) {
        return `${minutes} min ago`;
    }


    const hours =
        Math.floor(
            minutes / 60
        );


    if (hours < 24) {
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }


    const days =
        Math.floor(
            hours / 24
        );


    if (days < 30) {
        return `${days} day${days === 1 ? "" : "s"} ago`;
    }


    return formatDate(value);
}


function emptyState(message) {

    return `
        <div style="
            text-align:center;
            padding:25px;
            color:#73809a;
            font-size:9px;
        ">
            ${escapeHTML(message)}
        </div>
    `;
}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function setText(id,value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "";
    }
}


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add("show");


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    "show"
                );
            },
            3000
        );
}


function resetDropZone() {

    const dropZone =
        document.getElementById(
            "dropZone"
        );


    if (!dropZone) {
        return;
    }


    dropZone.querySelector("h3")
        .textContent =
        "Drop your document here";


    dropZone.querySelector("p")
        .textContent =
        "or click to browse";
}


/* =========================================================
   GLOBAL MODAL CLOSE
========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            event.target.classList.contains(
                "modal-overlay"
            )
        ) {

            event.target.classList.remove(
                "show"
            );
        }
    }
);