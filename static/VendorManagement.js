// ============================================================
// VENDOR MANAGEMENT
// ============================================================

const API = "http://127.0.0.1:8000";

let currentPage = 1;
let searchTimer = null;


// ============================================================
// GET JSON
// ============================================================

async function getJSON(url, options = {}) {

    const token = sessionStorage.getItem("access_token");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const requestUrl =
        url.startsWith("http://") ||
        url.startsWith("https://")
            ? url
            : `${API}${url}`;

    console.log("API REQUEST:", requestUrl);

    const response = await fetch(requestUrl, {
        ...options,
        headers
    });

    // ========================================================
    // UNAUTHORIZED
    // ========================================================

    if (response.status === 401) {

        console.error("401 Unauthorized");

        sessionStorage.removeItem("access_token");

        alert(
            "Your session has expired. Please login again."
        );

        window.location.href = "/login";

        throw new Error(
            "API 401: Not authenticated"
        );
    }


    // ========================================================
    // OTHER API ERRORS
    // ========================================================

    if (!response.ok) {

        const text = await response.text();

        console.error(
            `API ${response.status}:`,
            text
        );

        throw new Error(
            `API ${response.status}: ${text}`
        );
    }


    // ========================================================
    // JSON RESPONSE
    // ========================================================

    return await response.json();
}


// ============================================================
// LOAD EVERYTHING
// ============================================================

async function loadAll() {

    try {

        await Promise.all([
            loadStatistics(),
            loadVendors()
        ]);

    }
    catch (error) {

        console.error(
            "Vendor Management Error:",
            error
        );

        alert(
            "Unable to load vendor management data."
        );
    }
}


// ============================================================
// LOAD STATISTICS
// ============================================================

async function loadStatistics() {

    try {

        const data = await getJSON(
            "/api/admin/vendors/statistics"
        );

        console.log(
            "Vendor statistics:",
            data
        );


        // ====================================================
        // STATISTICS
        // ====================================================

        const statistics =
            data.statistics || {};


        const total =
            Number(
                statistics.total_vendors || 0
            );


        const active =
            Number(
                statistics.active_vendors || 0
            );


        const pending =
            Number(
                statistics.pending_vendors || 0
            );


        const underReview =
            Number(
                statistics.under_review_vendors || 0
            );


        const blacklisted =
            Number(
                statistics.blacklisted_vendors || 0
            );


        const average =
            Number(
                statistics.average_reliability || 0
            );


        // ====================================================
        // UPDATE KPI CARDS
        // ====================================================

        setText(
            "totalVendors",
            total
        );

        setText(
            "activeVendors",
            active
        );

        setText(
            "pendingVendors",
            pending
        );

        setText(
            "blacklistedVendors",
            blacklisted
        );

        setText(
            "averageReliability",
            average.toFixed(1)
        );


        // ====================================================
        // STATUS DISTRIBUTION
        // ====================================================

        const distribution =
            data.status_distribution || {};


        const activeCount =
            Number(
                distribution.Active || 0
            );


        // Backend may return Pending OR Pending Approval
        const pendingCount =
            Number(
                distribution["Pending Approval"] ??
                distribution.Pending ??
                0
            );


        const reviewCount =
            Number(
                distribution["Under Review"] || 0
            );


        const blacklistCount =
            Number(
                distribution.Blacklisted || 0
            );


        // ====================================================
        // UPDATE LEGEND
        // ====================================================

        setText(
            "activeLegend",
            activeCount
        );

        setText(
            "pendingLegend",
            pendingCount
        );

        setText(
            "reviewLegend",
            reviewCount
        );

        setText(
            "blacklistLegend",
            blacklistCount
        );


        // ====================================================
        // DONUT TOTAL
        // ====================================================

        setText(
            "donutTotal",
            total
        );


        // ====================================================
        // TOP VENDORS
        // ====================================================

        const topVendors =
            Array.isArray(data.top_vendors)
                ? data.top_vendors
                : [];


        renderTopVendors(
            topVendors
        );


        // ====================================================
        // OPTIONAL RELIABILITY CHART
        // ====================================================

        if (
            typeof renderReliabilityDistribution ===
            "function"
        ) {

            renderReliabilityDistribution(
                data.reliability_distribution || {}
            );
        }


        // ====================================================
        // OPTIONAL CATEGORY CHART
        // ====================================================

        if (
            typeof renderCategoryReliability ===
            "function"
        ) {

            renderCategoryReliability(
                Array.isArray(
                    data.category_reliability
                )
                    ? data.category_reliability
                    : []
            );
        }


    }
    catch (error) {

        console.error(
            "Statistics loading error:",
            error
        );

        throw error;
    }
}


// ============================================================
// LOAD VENDORS
// ============================================================

async function loadVendors() {

    try {

        // ====================================================
        // GET HTML ELEMENTS
        // ====================================================

        const searchElement =
            document.getElementById(
                "vendorSearch"
            );

        const statusElement =
            document.getElementById(
                "statusFilter"
            );

        const categoryElement =
            document.getElementById(
                "categoryFilter"
            );

        const ratingElement =
            document.getElementById(
                "ratingFilter"
            );

        const pageSizeElement =
            document.getElementById(
                "pageSize"
            );


        // ====================================================
        // GET VALUES
        // ====================================================

        const search =
            searchElement
                ? searchElement.value.trim()
                : "";


        let status =
            statusElement
                ? statusElement.value
                : "All";


        const category =
            categoryElement
                ? categoryElement.value
                : "All";


        const rating =
            ratingElement
                ? ratingElement.value
                : "All";


        const limit =
            pageSizeElement
                ? Number(
                    pageSizeElement.value
                )
                : 10;


        // ====================================================
        // IMPORTANT:
        // Backend counts "Pending"
        // while HTML displays "Pending Approval"
        //
        // Convert frontend value to backend value.
        // ====================================================

        if (
            status === "Pending Approval"
        ) {

            status = "Pending";
        }


        // ====================================================
        // BUILD QUERY
        // ====================================================

        const params =
            new URLSearchParams();


        params.set(
            "search",
            search
        );


        params.set(
            "status",
            status
        );


        params.set(
            "category",
            category
        );


        params.set(
            "rating",
            rating
        );


        params.set(
            "page",
            currentPage
        );


        params.set(
            "limit",
            limit
        );


        const url =
            `/api/admin/vendors?${params.toString()}`;


        console.log(
            "Loading vendors:",
            url
        );


        // ====================================================
        // REQUEST
        // ====================================================

        const data =
            await getJSON(url);


        console.log(
            "Vendor API response:",
            data
        );


        // ====================================================
        // GET VENDORS
        // ====================================================

        const vendors =
            Array.isArray(data.vendors)
                ? data.vendors
                : [];


        console.log(
            "Vendors received:",
            vendors
        );


        // ====================================================
        // RENDER TABLE
        // ====================================================

        renderVendors(
            vendors
        );


        // ====================================================
        // RENDER PAGINATION
        // ====================================================

        renderPagination(
            data.pagination || {
                total: vendors.length,
                page: currentPage,
                limit: limit,
                pages: 1
            }
        );

    }
    catch (error) {

        console.error(
            "Vendor loading error:",
            error
        );


        const tbody =
            document.getElementById(
                "vendorTable"
            );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        style="
                            text-align:center;
                            padding:30px;
                            color:#dc2626;
                        "
                    >
                        Unable to load vendors
                    </td>
                </tr>
            `;
        }
    }
}


// ============================================================
// RENDER VENDORS
// ============================================================

function renderVendors(vendors) {

    const tbody =
        document.getElementById(
            "vendorTable"
        );


    if (!tbody) {

        console.error(
            "tbody#vendorTable not found."
        );

        return;
    }


    // ========================================================
    // CLEAR TABLE
    // ========================================================

    tbody.innerHTML = "";


    // ========================================================
    // NO DATA
    // ========================================================

    if (
        !Array.isArray(vendors) ||
        vendors.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:30px;
                    "
                >
                    No vendors found
                </td>
            </tr>
        `;

        return;
    }


    // ========================================================
    // CREATE EACH ROW
    // ========================================================

    vendors.forEach(
        vendor => {

            const row =
                document.createElement(
                    "tr"
                );


            // =================================================
            // DATA FROM YOUR API
            // =================================================

            const vendorId =
                vendor.vendor_id ??
                vendor.id ??
                "-";


            const vendorName =
                vendor.vendor_name ??
                "-";


            const category =
                vendor.category ??
                "-";


            const contactPerson =
                vendor.contact_person ??
                "-";


            const email =
                vendor.email ??
                "-";


            const reliability =
                Number(
                    vendor.reliability_score ?? 0
                );


            const status =
                vendor.status ??
                "Pending";


            // IMPORTANT:
            // Your API returns contract_count
            const contractCount =
                vendor.contract_count ?? 0;


            // =================================================
            // STATUS CLASS
            // =================================================

            const statusClass =
                getStatusClass(
                    status
                );


            // =================================================
            // TABLE ROW
            // =================================================

            row.innerHTML = `

                <td>
                    ${escapeHTML(vendorId)}
                </td>


                <td>
                    <strong>
                        ${escapeHTML(vendorName)}
                    </strong>
                </td>


                <td>
                    ${escapeHTML(category)}
                </td>


                <td>
                    ${escapeHTML(contactPerson)}
                </td>


                <td>
                    ${escapeHTML(email)}
                </td>


                <td>
                    <span class="reliability-score">
                        ${reliability.toFixed(1)}
                    </span>
                </td>


                <td>
                    <span
                        class="status-badge ${statusClass}"
                    >
                        ${escapeHTML(
                            displayStatus(status)
                        )}
                    </span>
                </td>


                <td>
                    ${contractCount}
                </td>


                <td class="action-buttons">

                    <button
                        type="button"
                        class="view-btn"
                        onclick="viewVendor('${escapeAttribute(vendorId)}')"
                        title="View Vendor"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>


                    <button
                        type="button"
                        class="edit-btn"
                        onclick="editVendor('${escapeAttribute(vendorId)}')"
                        title="Edit Vendor"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>


                    <button
                        type="button"
                        class="delete-btn"
                        onclick="deleteVendor('${escapeAttribute(vendorId)}')"
                        title="Delete Vendor"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );
        }
    );


    console.log(
        `Rendered ${vendors.length} vendor(s).`
    );
}


// ============================================================
// DISPLAY STATUS
// ============================================================

function displayStatus(status) {

    if (
        String(status).toLowerCase() ===
        "pending"
    ) {

        return "Pending Approval";
    }


    return status;
}


// ============================================================
// STATUS CLASS
// ============================================================

function getStatusClass(status) {

    const value =
        String(status)
            .toLowerCase()
            .trim();


    switch (value) {

        case "active":
        case "approved":
            return "status-active";


        case "pending":
        case "pending approval":
            return "status-pending";


        case "under review":
            return "status-review";


        case "rejected":
            return "status-rejected";


        case "blacklisted":
            return "status-blacklisted";


        default:
            return "status-active";
    }
}


// ============================================================
// RENDER TOP VENDORS
// ============================================================

function renderTopVendors(vendors) {

    const container =
        document.getElementById(
            "topVendors"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    if (
        !Array.isArray(vendors) ||
        vendors.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No vendor performance data available.
            </div>
        `;

        return;
    }


    vendors.forEach(
        (vendor, index) => {

            const name =
                vendor.vendor_name ??
                vendor.company_name ??
                "Unknown Vendor";


            const category =
                vendor.category ??
                "Uncategorized";


            const score =
                Number(
                    vendor.reliability_score ?? 0
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "top-vendor";


            row.innerHTML = `

                <div class="rank">
                    ${index + 1}
                </div>


                <div class="vendor-info">

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    <small>
                        ${escapeHTML(category)}
                    </small>

                </div>


                <div class="vendor-score">

                    <strong>
                        ${score.toFixed(1)}
                    </strong>

                    <span>
                        Reliability
                    </span>

                </div>


                <div class="top-bar">

                    <div
                        style="
                            width:${Math.min(
                                Math.max(
                                    score,
                                    0
                                ),
                                100
                            )}%
                        "
                    ></div>

                </div>

            `;


            container.appendChild(
                row
            );
        }
    );
}


// ============================================================
// PAGINATION
// ============================================================

function renderPagination(pagination) {

    const total =
        Number(
            pagination.total || 0
        );


    const page =
        Number(
            pagination.page || 1
        );


    const limit =
        Number(
            pagination.limit || 10
        );


    const pages =
        Number(
            pagination.pages || 1
        );


    // ========================================================
    // TEXT
    // ========================================================

    const start =
        total === 0
            ? 0
            : ((page - 1) * limit) + 1;


    const end =
        Math.min(
            page * limit,
            total
        );


    const text =
        document.getElementById(
            "paginationText"
        );


    if (text) {

        text.textContent =
            `Showing ${start} to ${end} of ${total} vendors`;
    }


    // ========================================================
    // BUTTON CONTAINER
    // ========================================================

    const container =
        document.getElementById(
            "paginationButtons"
        );


    if (!container) {

        return;
    }


    container.innerHTML = "";


    // ========================================================
    // CREATE PAGE BUTTONS
    // ========================================================

    for (
        let i = 1;
        i <= pages;
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "page-btn";


        if (
            i === page
        ) {

            button.classList.add(
                "active"
            );
        }


        button.textContent =
            i;


        button.addEventListener(
            "click",
            function() {

                currentPage =
                    i;

                loadVendors();
            }
        );


        container.appendChild(
            button
        );
    }
}


// ============================================================
// LOAD CATEGORIES
// ============================================================

async function loadCategories() {

    try {

        const data =
            await getJSON(
                "/api/admin/vendors/categories"
            );


        console.log(
            "Category response:",
            data
        );


        const select =
            document.getElementById(
                "categoryFilter"
            );


        if (!select) {

            return;
        }


        const categories =
            Array.isArray(
                data.categories
            )
                ? data.categories
                : [];


        // ====================================================
        // REMOVE OLD OPTIONS
        // ====================================================

        while (
            select.options.length > 1
        ) {

            select.remove(1);
        }


        // ====================================================
        // ADD CATEGORIES
        // ====================================================

        categories.forEach(
            category => {

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
            }
        );

    }
    catch (error) {

        console.error(
            "Category loading error:",
            error
        );
    }
}


// ============================================================
// VIEW VENDOR
// ============================================================

async function viewVendor(vendorId) {

    try {

        const data =
            await getJSON(
                `/api/admin/vendors/${encodeURIComponent(vendorId)}`
            );


        // ====================================================
        // IMPORTANT:
        // API returns:
        //
        // {
        //     success: true,
        //     vendor: {...}
        // }
        // ====================================================

        const vendor =
            data.vendor;


        if (!vendor) {

            throw new Error(
                "Vendor data not found."
            );
        }


        const name =
            vendor.vendor_name ??
            "-";


        const category =
            vendor.category ??
            "-";


        const contact =
            vendor.contact_person ??
            "-";


        const email =
            vendor.email ??
            "-";


        const reliability =
            Number(
                vendor.reliability_score ?? 0
            );


        const status =
            vendor.status ??
            "Pending";


        const contracts =
            vendor.contract_count ??
            0;


        alert(

            `Vendor Details\n\n` +

            `Vendor ID: ${
                vendor.vendor_id ?? vendorId
            }\n` +

            `Vendor: ${name}\n` +

            `Category: ${category}\n` +

            `Contact: ${contact}\n` +

            `Email: ${email}\n` +

            `Reliability: ${reliability}/100\n` +

            `Status: ${
                displayStatus(status)
            }\n` +

            `Contracts: ${contracts}`

        );

    }
    catch (error) {

        console.error(
            "View vendor error:",
            error
        );

        alert(
            "Unable to load vendor details."
        );
    }
}


// ============================================================
// EDIT VENDOR
// ============================================================

async function editVendor(vendorId) {

    try {

        // ====================================================
        // VALIDATE VENDOR ID
        // ====================================================

        if (!vendorId) {

            console.error(
                "Vendor ID is missing:",
                vendorId
            );

            alert(
                "Vendor ID is missing."
            );

            return;

        }


        // ====================================================
        // CLEAN VENDOR ID
        // ====================================================

        vendorId =
            String(vendorId).trim();


        console.log(
            "Editing Vendor ID:",
            vendorId
        );


        // ====================================================
        // CREATE EDIT URL
        // ====================================================

        const editUrl =
            `/admin/vendors/${encodeURIComponent(vendorId)}/edit`;


        console.log(
            "Edit Vendor URL:",
            editUrl
        );


        // ====================================================
        // REDIRECT
        // ====================================================

        window.location.href =
            editUrl;

    }

    catch (error) {

        console.error(
            "Edit vendor error:",
            error
        );

        alert(
            "Unable to open Edit Vendor page."
        );

    }

}


// ============================================================
// SAVE VENDOR
// ============================================================

const vendorForm =
    document.getElementById(
        "vendorForm"
    );


if (vendorForm) {

    vendorForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            try {

                const vendorId =
                    document.getElementById(
                        "vendorId"
                    )?.value.trim();


                // =================================================
                // FORM DATA
                // =================================================

                const vendorName =
                    document.getElementById(
                        "vendorName"
                    )?.value.trim();


                const category =
                    document.getElementById(
                        "vendorCategory"
                    )?.value.trim();


                const contactPerson =
                    document.getElementById(
                        "contactPerson"
                    )?.value.trim();


                const email =
                    document.getElementById(
                        "vendorEmail"
                    )?.value.trim();


                const reliabilityScore =
                    Number(
                        document.getElementById(
                            "reliabilityScore"
                        )?.value || 0
                    );


                let status =
                    document.getElementById(
                        "vendorStatus"
                    )?.value;


                const contractCount =
                    Number(
                        document.getElementById(
                            "vendorContracts"
                        )?.value || 0
                    );


                // =================================================
                // HTML USES "Pending Approval"
                // DATABASE/API USES "Pending"
                // =================================================

                if (
                    status ===
                    "Pending Approval"
                ) {

                    status = "Pending";
                }


                // =================================================
                // PAYLOAD
                // =================================================

                const payload = {

                    vendor_name:
                        vendorName || "",

                    category:
                        category || "",

                    contact_person:
                        contactPerson || "",

                    email:
                        email || "",

                    reliability_score:
                        reliabilityScore,

                    status:
                        status || "Active",

                    contract_count:
                        contractCount
                };


                console.log(
                    "Saving vendor:",
                    payload
                );


                // =================================================
                // CREATE OR UPDATE
                // =================================================

                let url;
                let method;


                if (vendorId) {

                    url =
                        `/api/admin/vendors/${encodeURIComponent(
                            vendorId
                        )}`;

                    method =
                        "PUT";

                }
                else {

                    url =
                        "/api/admin/vendors";

                    method =
                        "POST";
                }


                // =================================================
                // SEND REQUEST
                // =================================================

                await getJSON(
                    url,
                    {
                        method: method,
                        body: JSON.stringify(
                            payload
                        )
                    }
                );


                // =================================================
                // CLOSE MODAL
                // =================================================

                closeVendorModal();


                // =================================================
                // RELOAD
                // =================================================

                currentPage =
                    1;


                await loadAll();


                alert(
                    vendorId
                        ? "Vendor updated successfully."
                        : "Vendor added successfully."
                );

            }
            catch (error) {

                console.error(
                    "Save vendor error:",
                    error
                );

                alert(
                    "Unable to save vendor."
                );
            }
        }
    );
}


// ============================================================
// DELETE VENDOR
// ============================================================

async function deleteVendor(vendorId) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this vendor?"
        );


    if (!confirmed) {

        return;
    }


    try {

        await getJSON(
            `/api/admin/vendors/${encodeURIComponent(
                vendorId
            )}`,
            {
                method: "DELETE"
            }
        );


        // ====================================================
        // RELOAD TABLE
        // ====================================================

        await loadAll();


        alert(
            "Vendor deleted successfully."
        );

    }
    catch (error) {

        console.error(
            "Delete vendor error:",
            error
        );

        alert(
            "Unable to delete vendor."
        );
    }
}


// ============================================================
// ADD VENDOR
// ============================================================

function openAddVendor() {
    window.location.href="/admin/add-vendor"
}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeVendorModal() {

    const modal =
        document.getElementById(
            "vendorModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }


    resetVendorForm();
}


// ============================================================
// RESET FORM
// ============================================================

function resetVendorForm() {

    const form =
        document.getElementById(
            "vendorForm"
        );


    if (!form) {

        return;
    }


    form.reset();


    setValue(
        "vendorId",
        ""
    );


    setValue(
        "reliabilityScore",
        0
    );


    setValue(
        "vendorContracts",
        0
    );


    setValue(
        "vendorStatus",
        "Active"
    );
}


// ============================================================
// SEARCH
// ============================================================

const vendorSearch =
    document.getElementById(
        "vendorSearch"
    );


if (vendorSearch) {

    vendorSearch.addEventListener(
        "input",
        function() {

            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    function() {

                        currentPage =
                            1;

                        loadVendors();

                    },
                    350
                );
        }
    );
}


// ============================================================
// STATUS FILTER
// ============================================================

const statusFilter =
    document.getElementById(
        "statusFilter"
    );


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        function() {

            currentPage =
                1;

            loadVendors();
        }
    );
}


// ============================================================
// CATEGORY FILTER
// ============================================================

const categoryFilter =
    document.getElementById(
        "categoryFilter"
    );


if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        function() {

            currentPage =
                1;

            loadVendors();
        }
    );
}


// ============================================================
// RATING FILTER
// ============================================================

const ratingFilter =
    document.getElementById(
        "ratingFilter"
    );


if (ratingFilter) {

    ratingFilter.addEventListener(
        "change",
        function() {

            currentPage =
                1;

            loadVendors();
        }
    );
}


// ============================================================
// PAGE SIZE
// ============================================================

const pageSize =
    document.getElementById(
        "pageSize"
    );


if (pageSize) {

    pageSize.addEventListener(
        "change",
        function() {

            currentPage =
                1;

            loadVendors();
        }
    );
}


// ============================================================
// REFRESH BUTTON
// ============================================================

// The HTML uses onclick="loadAll()"
// so no extra event listener is required.


// ============================================================
// GLOBAL SEARCH
// ============================================================

// The header contains globalSearch.
// We connect it to the vendor search field.

const globalSearch =
    document.getElementById(
        "globalSearch"
    );


if (globalSearch) {

    globalSearch.addEventListener(
        "input",
        function() {

            const vendorSearchInput =
                document.getElementById(
                    "vendorSearch"
                );


            if (vendorSearchInput) {

                vendorSearchInput.value =
                    globalSearch.value;
            }


            clearTimeout(
                searchTimer
            );


            searchTimer =
                setTimeout(
                    function() {

                        currentPage =
                            1;

                        loadVendors();

                    },
                    350
                );
        }
    );
}


// ============================================================
// HELPER: SET TEXT
// ============================================================

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;
    }
}


// ============================================================
// HELPER: SET VALUE
// ============================================================

function setValue(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.value =
            value;
    }
}


// ============================================================
// NORMALIZE STATUS FOR HTML SELECT
// ============================================================

function normalizeStatusForSelect(status) {

    if (
        String(status).toLowerCase() ===
        "pending"
    ) {

        return "Pending Approval";
    }


    return status || "Active";
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

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


// ============================================================
// ESCAPE ATTRIBUTE
// ============================================================

function escapeAttribute(value) {

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


// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "Vendor Management initialized."
        );


        try {

            await loadAdminProfile();

            await loadCategories();

            await loadAll();

        }
        catch (error) {

            console.error(
                "Vendor Management initialization error:",
                error
            );
        }
    }
);


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
        "headerAdminName",
        name
    );

    setText(
        "headerAdminRole",
        role
    );


    setText(
        "sidebarAdminName",
        name
    );

    setText(
        "sidebarAdminEmail",
        email
    );
}


async function loadAdminProfile() {

    try {

        const data = await getJSON(
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