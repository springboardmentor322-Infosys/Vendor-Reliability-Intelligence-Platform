const API = "http://127.0.0.1:8000";

let selectedFile = null;


/* =========================================================
   ELEMENTS
========================================================= */

const form =
    document.getElementById("documentForm");

const category =
    document.getElementById("category");

const documentType =
    document.getElementById("documentType");

const relatedTo =
    document.getElementById("relatedTo");

const businessUnit =
    document.getElementById("businessUnit");

const fileInput =
    document.getElementById("fileInput");

const browseBtn =
    document.getElementById("browseBtn");

const dropZone =
    document.getElementById("dropZone");

const selectedFileContainer =
    document.getElementById("selectedFile");

const recentUploads =
    document.getElementById("recentUploads");


/* =========================================================
   DOCUMENT TYPES
========================================================= */

const documentTypes = {

    "Purchase Orders": [
        "PO (Purchase Order)",
        "PO Amendment",
        "PO Confirmation"
    ],

    "Contracts": [
        "Supplier Agreement",
        "Service Agreement",
        "NDA",
        "Contract Amendment"
    ],

    "Invoices": [
        "Invoice",
        "Credit Note",
        "Debit Note"
    ],

    "Reports": [
        "Inventory Report",
        "Procurement Report",
        "Performance Report"
    ],

    "Certificates": [
        "Quality Certificate",
        "Compliance Certificate",
        "ISO Certificate"
    ],

    "Shipping": [
        "Bill of Lading",
        "Packing List",
        "Shipping Invoice",
        "Delivery Note"
    ],

    "Other": [
        "General Document"
    ]

};


/* =========================================================
   CATEGORY CHANGE
========================================================= */

category.addEventListener(
    "change",
    function () {

        const value =
            category.value;

        documentType.innerHTML =
            `<option value="">
                Select type
            </option>`;

        if (!documentTypes[value]) {
            return;
        }

        documentTypes[value].forEach(
            type => {

                const option =
                    document.createElement("option");

                option.value = type;

                option.textContent = type;

                documentType.appendChild(option);

            }
        );

    }
);


/* =========================================================
   LOAD REFERENCE OPTIONS
========================================================= */

async function loadReferenceOptions() {

    try {

        const response =
            await fetch(
                `${API}/api/documents/reference-options`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();


        /* ============================================
           PURCHASE ORDERS
        ============================================ */

        relatedTo.innerHTML =
            `<option value="">
                Select
            </option>`;

        data.purchase_orders
            .forEach(po => {

                const option =
                    document.createElement("option");

                option.value =
                    `PurchaseOrder:${po.value}`;

                option.dataset.type =
                    "PurchaseOrder";

                option.dataset.id =
                    po.value;

                option.textContent =
                    po.label;

                relatedTo.appendChild(option);

            });


        /* ============================================
           BUSINESS UNIT
        ============================================ */

        businessUnit.innerHTML =
            `<option value="">
                Select entity
            </option>`;

        data.business_units
            .forEach(unit => {

                const option =
                    document.createElement("option");

                option.value =
                    unit.value;

                option.textContent =
                    unit.label;

                businessUnit.appendChild(option);

            });

    } catch (error) {

        console.error(
            "Reference options error:",
            error
        );

        relatedTo.innerHTML =
            `<option value="">
                Unable to load POs
            </option>`;

    }

}


/* =========================================================
   FILE VALIDATION
========================================================= */

function validateFile(file) {

    if (!file) {
        return false;
    }

    const maxSize =
        25 * 1024 * 1024;

    if (file.size > maxSize) {

        alert(
            "Maximum file size is 25 MB."
        );

        return false;
    }

    const allowed = [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "jpg",
        "jpeg",
        "png"
    ];

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    if (!allowed.includes(extension)) {

        alert(
            "Unsupported file type."
        );

        return false;
    }

    return true;
}


/* =========================================================
   FILE SELECTION
========================================================= */

browseBtn.addEventListener(
    "click",
    () => fileInput.click()
);


fileInput.addEventListener(
    "change",
    function () {

        if (!this.files.length) {
            return;
        }

        const file =
            this.files[0];

        if (!validateFile(file)) {

            this.value = "";

            return;
        }

        selectedFile = file;

        renderSelectedFile();

    }
);


/* =========================================================
   DRAG & DROP
========================================================= */

dropZone.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        dropZone.classList.add(
            "dragover"
        );

    }
);


dropZone.addEventListener(
    "dragleave",
    function () {

        dropZone.classList.remove(
            "dragover"
        );

    }
);


dropZone.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        dropZone.classList.remove(
            "dragover"
        );

        const file =
            event.dataTransfer.files[0];

        if (!validateFile(file)) {
            return;
        }

        selectedFile = file;

        renderSelectedFile();

    }
);


/* =========================================================
   RENDER SELECTED FILE
========================================================= */

function renderSelectedFile() {

    if (!selectedFile) {

        selectedFileContainer.innerHTML =
            "";

        return;
    }

    const sizeMB =
        (
            selectedFile.size /
            1024 /
            1024
        ).toFixed(2);

    selectedFileContainer.innerHTML = `

        <div class="file-preview">

            <i class="fa-regular fa-file"></i>

            <div>

                <strong>
                    ${escapeHtml(
                        selectedFile.name
                    )}
                </strong>

                <small>
                    ${sizeMB} MB
                </small>

            </div>

            <button
                type="button"
                id="removeFile"
            >
                <i class="fa-solid fa-trash"></i>
            </button>

        </div>
    `;

    document
        .getElementById("removeFile")
        .addEventListener(
            "click",
            removeSelectedFile
        );

}


/* =========================================================
   REMOVE FILE
========================================================= */

function removeSelectedFile() {

    selectedFile = null;

    fileInput.value = "";

    selectedFileContainer.innerHTML =
        "";

}


/* =========================================================
   RELATED DOCUMENT
========================================================= */

relatedTo.addEventListener(
    "change",
    function () {

        const option =
            this.options[
                this.selectedIndex
            ];

        if (!option) {
            return;
        }

        if (
            option.dataset.type &&
            option.dataset.id
        ) {

            this.dataset.relatedType =
                option.dataset.type;

            this.dataset.relatedId =
                option.dataset.id;

        } else {

            this.dataset.relatedType =
                "";

            this.dataset.relatedId =
                "";

        }

    }
);


/* =========================================================
   UPLOAD DOCUMENT
========================================================= */

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        if (!selectedFile) {

            alert(
                "Please select a document."
            );

            return;
        }


        if (!form.checkValidity()) {

            form.reportValidity();

            return;
        }


        const submitBtn =
            document.getElementById(
                "submitBtn"
            );

        submitBtn.disabled = true;

        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Uploading...
        `;


        const formData =
            new FormData();


        formData.append(
            "file",
            selectedFile
        );

        formData.append(
            "category",
            category.value
        );

        formData.append(
            "document_type",
            documentType.value
        );

        formData.append(
            "document_title",
            document.getElementById(
                "documentTitle"
            ).value.trim()
        );

        formData.append(
            "document_description",
            document.getElementById(
                "documentDescription"
            ).value.trim()
        );

        formData.append(
            "related_type",
            relatedTo.dataset.relatedType || ""
        );

        formData.append(
            "related_id",
            relatedTo.dataset.relatedId || ""
        );

        formData.append(
            "business_unit",
            businessUnit.value
        );

        formData.append(
            "tags",
            document.getElementById(
                "tags"
            ).value.trim()
        );

        formData.append(
            "confidentiality_level",
            document.getElementById(
                "confidentiality"
            ).value
        );

        formData.append(
            "retention_period",
            document.getElementById(
                "retention"
            ).value
        );

        formData.append(
            "document_date",
            document.getElementById(
                "documentDate"
            ).value
        );

        formData.append(
            "uploaded_by",
            "1"
        );


        try {

            const response =
                await fetch(
                    `${API}/api/documents/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    result.detail ||
                    "Document upload failed"
                );

            }


            alert(
                "Document uploaded successfully."
            );


            window.location.href =
                "/documents";


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            alert(
                error.message ||
                "Unable to upload document."
            );

            submitBtn.disabled = false;

            submitBtn.innerHTML = `
                Next: Upload & Details
                <i class="fa-solid fa-arrow-right"></i>
            `;

        }

    }
);


/* =========================================================
   LOAD RECENT DOCUMENTS
========================================================= */

async function loadRecentDocuments() {

    try {

        const response =
            await fetch(
                `${API}/api/documents/dashboard`
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        renderRecentDocuments(
            data.documents || []
        );

        renderStorage(
            data.storage_used || 0,
            data.storage_available || 0
        );

    } catch (error) {

        console.error(
            "Document dashboard error:",
            error
        );

        recentUploads.innerHTML = `
            <div class="loading">
                Unable to load recent uploads.
            </div>
        `;

    }

}


/* =========================================================
   RENDER RECENT DOCUMENTS
========================================================= */

function renderRecentDocuments(
    documents
) {

    if (!documents.length) {

        recentUploads.innerHTML = `
            <div class="loading">
                No documents uploaded yet.
            </div>
        `;

        return;
    }


    recentUploads.innerHTML = "";


    documents
        .slice(0, 5)
        .forEach(documentItem => {

            const extension =
                (
                    documentItem.file_type ||
                    "file"
                ).toLowerCase();


            const icon =
                getFileIcon(extension);


            const date =
                formatDate(
                    documentItem.uploaded_on
                );


            const size =
                formatBytes(
                    documentItem.file_size
                );


            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "recent-document";


            row.innerHTML = `

                <div class="file-icon">

                    <i class="${icon}"></i>

                </div>

                <div class="document-info">

                    <strong>
                        ${escapeHtml(
                            documentItem.document_name
                        )}
                    </strong>

                    <small>
                        ${date}
                        &nbsp; • &nbsp;
                        ${size}
                    </small>

                </div>

                <span class="status">
                    ${escapeHtml(
                        documentItem.status ||
                        "Pending Review"
                    )}
                </span>

            `;


            recentUploads.appendChild(
                row
            );

        });

}


/* =========================================================
   STORAGE
========================================================= */

function renderStorage(
    used,
    available
) {

    document.getElementById(
        "storageUsed"
    ).textContent =
        formatGB(used);


    document.getElementById(
        "storageAvailable"
    ).textContent =
        `Available: ${formatGB(
            available
        )}`;

}


function formatGB(bytes) {

    if (!bytes) {
        return "0 GB";
    }

    return (
        bytes /
        1024 /
        1024 /
        1024
    ).toFixed(2) + " GB";

}


/* =========================================================
   UTILITIES
========================================================= */

function formatBytes(bytes) {

    if (!bytes) {
        return "0 KB";
    }

    if (bytes < 1024 * 1024) {

        return (
            bytes /
            1024
        ).toFixed(0) + " KB";

    }

    return (
        bytes /
        1024 /
        1024
    ).toFixed(2) + " MB";

}


function formatDate(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function getFileIcon(extension) {

    if (extension === "pdf") {
        return "fa-solid fa-file-pdf";
    }

    if (
        ["doc", "docx"].includes(
            extension
        )
    ) {
        return "fa-solid fa-file-word";
    }

    if (
        ["xls", "xlsx"].includes(
            extension
        )
    ) {
        return "fa-solid fa-file-excel";
    }

    if (
        ["ppt", "pptx"].includes(
            extension
        )
    ) {
        return "fa-solid fa-file-powerpoint";
    }

    if (
        ["jpg", "jpeg", "png"].includes(
            extension
        )
    ) {
        return "fa-solid fa-file-image";
    }

    return "fa-regular fa-file";

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   CANCEL
========================================================= */

document
    .getElementById("cancelBtn")
    .addEventListener(
        "click",
        function () {

            if (
                confirm(
                    "Cancel document upload?"
                )
            ) {

                window.location.href =
                    "/documents";

            }

        }
    );


/* =========================================================
   DRAFT
========================================================= */

document
    .getElementById("draftBtn")
    .addEventListener(
        "click",
        function () {

            /*
             * You can create a separate
             * /api/documents/draft endpoint
             * if draft persistence is required.
             */

            alert(
                "Draft functionality can be connected to a dedicated document draft endpoint."
            );

        }
    );


/* =========================================================
   CURRENT DATE/TIME
========================================================= */

function updateClock() {

    const now =
        new Date();

    document.getElementById(
        "currentDate"
    ).textContent =
        now.toLocaleDateString(
            "en-IN",
            {
                month: "short",
                day: "numeric",
                year: "numeric"
            }
        );

    document.getElementById(
        "currentTime"
    ).textContent =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        document.getElementById(
            "documentDate"
        ).value = today;

        await loadReferenceOptions();

        await loadRecentDocuments();

        updateClock();

        setInterval(
            updateClock,
            30000
        );

    }
);