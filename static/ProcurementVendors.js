const API_BASE = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 10;
let currentTab = "all";

const state = {
    search: "",
    status: "All",
    category: "All",
    location: "All",
    risk: "All"
};


// =========================================================
// AUTH
// =========================================================

function getToken() {
    return (
        sessionStorage.getItem("access_token") ||
        localStorage.getItem("token")
    );
}


async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${url}`,
        {
            ...options,
            headers
        }
    );

    if (!response.ok) {

        let message = `HTTP ${response.status}`;

        try {
            const data = await response.json();

            if (data.detail) {
                message = data.detail;
            }

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


async function getJSON(url, options = {}){
    return  await apiFetch(url, options);
}


// =========================================================
// DOM
// =========================================================

const tableBody =
    document.getElementById(
        "vendorTableBody"
    );

const loading =
    document.getElementById(
        "tableLoading"
    );


// =========================================================
// INIT
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupEvents();

        await Promise.all([
            loadFilters()
        ]);

        await loadVendors();

        await loadProfile();
    }
);


// =========================================================
// EVENTS
// =========================================================

function setupEvents() {

    document
        .getElementById("vendorSearch")
        .addEventListener(
            "input",
            debounce(
                event => {

                    state.search =
                        event.target.value.trim();

                    currentPage = 1;

                    loadVendors();

                },
                350
            )
        );


    document
        .getElementById("statusFilter")
        .addEventListener(
            "change",
            event => {

                state.status =
                    event.target.value;

                currentPage = 1;

                loadVendors();
            }
        );


    document
        .getElementById("categoryFilter")
        .addEventListener(
            "change",
            event => {

                state.category =
                    event.target.value;

                currentPage = 1;

                loadVendors();
            }
        );


    document
        .getElementById("locationFilter")
        .addEventListener(
            "change",
            event => {

                state.location =
                    event.target.value;

                currentPage = 1;

                loadVendors();
            }
        );


    document
        .getElementById("riskFilter")
        .addEventListener(
            "change",
            event => {

                state.risk =
                    event.target.value;

                currentPage = 1;

                loadVendors();
            }
        );


    document
        .getElementById("resetBtn")
        .addEventListener(
            "click",
            resetFilters
        );


    document
        .getElementById("pageSize")
        .addEventListener(
            "change",
            event => {

                pageSize =
                    Number(event.target.value);

                currentPage = 1;

                loadVendors();
            }
        );


    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".tab")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    tab.classList.add("active");

                    currentTab =
                        tab.dataset.tab;

                    currentPage = 1;

                    loadVendors();
                }
            );

        });


    document
        .getElementById("closeDetails")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "detailsContent"
                    )
                    .innerHTML = `
                        <div class="empty-details">
                            <div>
                                <i class="fa-solid fa-users"></i>
                                <p>Select a vendor to view details</p>
                            </div>
                        </div>
                    `;
            }
        );


    document
        .getElementById("exportBtn")
        .addEventListener(
            "click",
            exportVendors
        );

}


// =========================================================
// FILTERS
// =========================================================

async function loadFilters() {

    try {

        const data =
            await apiFetch(
                "/api/procurement/vendors/filters"
            );

        populateSelect(
            "categoryFilter",
            data.categories || []
        );

        populateSelect(
            "locationFilter",
            data.locations || []
        );

        populateSelect(
            "statusFilter",
            data.statuses || []
        );

    } catch (error) {

        console.error(
            "Filter loading failed:",
            error
        );
    }
}


function populateSelect(
    id,
    values
) {

    const select =
        document.getElementById(id);

    const current =
        select.value;

    values.forEach(value => {

        const option =
            document.createElement(
                "option"
            );

        option.value = value;
        option.textContent = value;

        select.appendChild(option);

    });

    if (
        values.includes(current)
    ) {
        select.value = current;
    }
}


// =========================================================
// LOAD VENDORS
// =========================================================

async function loadVendors() {

    loading.classList.remove(
        "hidden"
    );

    tableBody.innerHTML = "";

    const params =
        new URLSearchParams({

            search: state.search,

            status: state.status,

            category:
                state.category,

            location:
                state.location,

            risk_level:
                state.risk,

            tab:
                currentTab,

            page:
                currentPage,

            limit:
                pageSize
        });

    try {

        const data =
            await apiFetch(
                `/api/procurement/vendors/dashboard?${params}`
            );

        renderStatistics(
            data.statistics
        );

        renderVendors(
            data.vendors
        );

        renderPagination(
            data.pagination
        );

    } catch (error) {

        console.error(error);

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:50px;
                        color:#d9363e;
                    "
                >
                    Unable to load vendors.
                    <br>
                    <small>
                        ${escapeHtml(error.message)}
                    </small>
                </td>
            </tr>
        `;

    } finally {

        loading.classList.add(
            "hidden"
        );
    }
}


// =========================================================
// STATISTICS
// =========================================================

function renderStatistics(stats) {

    document
        .getElementById(
            "totalVendors"
        )
        .textContent =
            stats.total_vendors ?? 0;

    document
        .getElementById(
            "activeVendors"
        )
        .textContent =
            stats.active_vendors ?? 0;

    document
        .getElementById(
            "preferredVendors"
        )
        .textContent =
            stats.preferred_vendors ?? 0;

    document
        .getElementById(
            "blacklistedVendors"
        )
        .textContent =
            stats.blacklisted_vendors ?? 0;

    document
        .getElementById(
            "newVendors"
        )
        .textContent =
            stats.new_this_month ?? 0;

    document
        .getElementById(
            "averageScore"
        )
        .textContent =
            Number(
                stats.average_score || 0
            ).toFixed(1);
}


// =========================================================
// RENDER TABLE
// =========================================================

function renderVendors(vendors) {

    if (!vendors.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:50px;
                        color:#68749a;
                    "
                >
                    No vendors found.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        vendors
            .map(
                vendorRow
            )
            .join("");
}


function vendorRow(vendor) {

    const initials =
        getInitials(
            vendor.vendor_name
        );

    const score =
        Number(
            vendor.display_score || 0
        ).toFixed(1);

    const risk =
        (vendor.risk_level || "High")
            .toLowerCase();

    const status =
        normalizeStatus(
            vendor.status
        );

    const location =
        vendor.country ||
        "Unknown";

    return `
        <tr>

            <td>

                <div class="vendor-cell">

                    <div class="vendor-logo">
                        ${escapeHtml(initials)}
                    </div>

                    <div>

                        <div class="vendor-name">
                            ${escapeHtml(
                                vendor.vendor_name
                            )}
                        </div>

                        <span class="vendor-id">
                            ${escapeHtml(
                                vendor.vendor_id
                            )}
                        </span>

                    </div>

                </div>

            </td>


            <td>
                <span class="category">
                    ${escapeHtml(
                        vendor.category ||
                        "General"
                    )}
                </span>
            </td>


            <td>

                <div class="contact">

                    <strong>
                        ${escapeHtml(
                            vendor.contact_person ||
                            "-"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            vendor.email ||
                            "-"
                        )}
                    </span>

                </div>

            </td>


            <td>

                <span class="location">

                    <i class="fa-solid fa-location-dot"></i>

                    ${escapeHtml(
                        location
                    )}

                </span>

            </td>


            <td>

                <span class="status ${status.className}">
                    ${escapeHtml(
                        vendor.status ||
                        "Unknown"
                    )}
                </span>

            </td>


            <td>

                <div class="performance">

                    <strong>
                        ${score}
                        <span class="star">★</span>
                    </strong>

                    <small>
                        ${Math.round(
                            Number(
                                vendor.reliability_score ||
                                0
                            )
                        )}%
                    </small>

                </div>

            </td>


            <td>

                <span class="risk ${risk}">
                    ${escapeHtml(
                        vendor.risk_level ||
                        "High"
                    )}
                </span>

            </td>


            <td>

                <div class="actions">

                    <button
                        class="action-btn"
                        title="View"
                        onclick="viewVendor(
                            '${escapeJs(
                                vendor.vendor_id
                            )}'
                        )"
                    >
                        <i class="fa-regular fa-eye"></i>
                    </button>

                    <button
                        class="action-btn"
                        title="More"
                        onclick="showVendorMenu(
                            '${escapeJs(
                                vendor.vendor_id
                            )}'
                        )"
                    >
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>

                </div>

            </td>

        </tr>
    `;
}


// =========================================================
// DETAILS
// =========================================================

async function viewVendor(
    vendorId
) {

    const details =
        document.getElementById(
            "detailsContent"
        );

    details.innerHTML = `
        <div class="empty-details">
            <div>
                <i class="fa-solid fa-spinner fa-spin"></i>
                <p>Loading vendor...</p>
            </div>
        </div>
    `;

    try {

        const data =
            await apiFetch(
                `/api/procurement/vendors/${encodeURIComponent(
                    vendorId
                )}`
            );

        renderVendorDetails(
            data
        );

    } catch (error) {

        details.innerHTML = `
            <div class="empty-details">
                <div>
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>
                </div>
            </div>
        `;
    }
}


function renderVendorDetails(data) {

    const v =
        data.vendor;

    const initials =
        getInitials(
            v.vendor_name
        );

    const location =
        v.location || {};

    const address =
        [
            location.address,
            location.city,
            location.state,
            location.country
        ]
        .filter(Boolean)
        .join(", ");

    const contracts =
        data.contracts || [];

    const documents =
        data.documents || [];

    document
        .getElementById(
            "detailsContent"
        )
        .innerHTML = `

            <div class="vendor-summary">

                <div class="big-logo">
                    ${escapeHtml(initials)}
                </div>

                <div class="summary-name">

                    <strong>
                        ${escapeHtml(
                            v.vendor_name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            v.vendor_id
                        )}
                        &nbsp; • &nbsp;
                        ${escapeHtml(
                            v.category ||
                            "General"
                        )}
                    </small>

                </div>

                <div class="detail-badges">

                    ${
                        v.is_preferred
                        ? `
                            <span class="detail-badge">
                                Preferred
                            </span>
                        `
                        : ""
                    }

                    <span class="detail-badge green">
                        ${escapeHtml(
                            v.status
                        )}
                    </span>

                </div>

            </div>


            <div class="detail-tabs">

                <button
                    class="detail-tab active"
                >
                    Overview
                </button>

                <button
                    class="detail-tab"
                >
                    Performance
                </button>

                <button
                    class="detail-tab"
                >
                    Documents
                </button>

                <button
                    class="detail-tab"
                >
                    Contracts
                </button>

            </div>


            <div class="detail-list">

                ${detailRow(
                    "fa-user",
                    "Contact Person",
                    `
                        ${escapeHtml(
                            v.contact_person ||
                            "-"
                        )}
                        <br>
                        ${escapeHtml(
                            v.contact_email ||
                            v.email ||
                            "-"
                        )}
                        <br>
                        ${escapeHtml(
                            v.contact_phone ||
                            v.phone ||
                            "-"
                        )}
                    `
                )}


                ${detailRow(
                    "fa-location-dot",
                    "Registered Address",
                    address || "-"
                )}


                ${detailRow(
                    "fa-id-card",
                    "GST Number",
                    v.gst_vat_number || "-"
                )}


                ${detailRow(
                    "fa-id-card",
                    "PAN Number",
                    v.pan_number || "-"
                )}


                ${detailRow(
                    "fa-credit-card",
                    "Payment Terms",
                    v.payment_terms || "-"
                )}


                ${detailRow(
                    "fa-clock",
                    "Average Delivery",
                    v.average_delivery_time
                        ? `${v.average_delivery_time} days`
                        : "-"
                )}


                ${detailRow(
                    "fa-calendar",
                    "Onboarded On",
                    formatDate(
                        v.member_since ||
                        v.created_at
                    )
                )}


                ${detailRow(
                    "fa-shield-halved",
                    "Risk Level",
                    `<span class="risk ${(
                        v.risk_level ||
                        "High"
                    ).toLowerCase()}">
                        ${escapeHtml(
                            v.risk_level ||
                            "High"
                        )}
                    </span>`
                )}


                ${detailRow(
                    "fa-star",
                    "Performance",
                    `${Number(
                        v.display_score || 0
                    ).toFixed(1)} / 5`
                )}


                ${detailRow(
                    "fa-note-sticky",
                    "Notes",
                    v.notes || "-"
                )}

            </div>

            </div>

            <div style="
                margin-top:18px;
                font-size:10px;
                color:#69749a;
            ">
                Contracts: ${contracts.length}
                &nbsp; • &nbsp;
                Documents: ${documents.length}
            </div>
        `;
}


function detailRow(
    icon,
    label,
    value
) {

    return `
        <div class="detail-row">

            <i class="fa-solid ${icon}"></i>

            <span class="detail-label">
                ${label}
            </span>

            <span class="detail-value">
                ${value}
            </span>

        </div>
    `;
}


// =========================================================
// PAGINATION
// =========================================================

function renderPagination(
    pagination
) {

    const container =
        document.getElementById(
            "pagination"
        );

    const total =
        pagination.total || 0;

    const page =
        pagination.page || 1;

    const pages =
        pagination.pages || 1;

    if (!total) {

        document
            .getElementById(
                "paginationText"
            )
            .textContent =
                "Showing 0 vendors";

        container.innerHTML = "";

        return;
    }

    const start =
        ((page - 1) * pageSize) + 1;

    const end =
        Math.min(
            page * pageSize,
            total
        );

    document
        .getElementById(
            "paginationText"
        )
        .textContent =
            `Showing ${start} to ${end} of ${total} vendors`;

    let html = "";

    if (page > 1) {

        html += `
            <button
                class="page-btn"
                onclick="goToPage(
                    ${page - 1}
                )"
            >
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `;
    }

    const startPage =
        Math.max(
            1,
            page - 2
        );

    const endPage =
        Math.min(
            pages,
            page + 2
        );

    for (
        let p = startPage;
        p <= endPage;
        p++
    ) {

        html += `
            <button
                class="page-btn ${
                    p === page
                        ? "active"
                        : ""
                }"
                onclick="goToPage(${p})"
            >
                ${p}
            </button>
        `;
    }

    if (page < pages) {

        html += `
            <button
                class="page-btn"
                onclick="goToPage(
                    ${page + 1}
                )"
            >
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;
    }

    container.innerHTML = html;
}


function goToPage(page) {

    currentPage = page;

    loadVendors();
}


// =========================================================
// RESET
// =========================================================

function resetFilters() {

    state.search = "";
    state.status = "All";
    state.category = "All";
    state.location = "All";
    state.risk = "All";

    currentPage = 1;

    document
        .getElementById(
            "vendorSearch"
        )
        .value = "";

    document
        .getElementById(
            "statusFilter"
        )
        .value = "All";

    document
        .getElementById(
            "categoryFilter"
        )
        .value = "All";

    document
        .getElementById(
            "locationFilter"
        )
        .value = "All";

    document
        .getElementById(
            "riskFilter"
        )
        .value = "All";

    loadVendors();
}


// =========================================================
// CREATE VENDOR
// =========================================================

async function createVendor(event) {

    event.preventDefault();

    const form =
        event.target;

    const formData =
        new FormData(form);

    const payload = {

        vendor_name:
            formData.get(
                "vendor_name"
            ),

        country:
            formData.get(
                "country"
            ),

        email:
            formData.get(
                "email"
            ),

        phone:
            formData.get(
                "phone"
            ),

        business_type:
            formData.get(
                "business_type"
            ),

        category:
            formData.get(
                "category"
            ),

        contact_person:
            formData.get(
                "contact_person"
            ),

        address:
            formData.get(
                "address"
            ),

        password:
            formData.get(
                "password"
            ),

        status: "Active"
    };

    try {

        await apiFetch(
            "/api/vendors",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

        alert(
            "Vendor created successfully."
        );

        closeModal();

        form.reset();

        await loadFilters();

        await loadVendors();

    } catch (error) {

        alert(
            `Unable to create vendor: ${
                error.message
            }`
        );
    }
}


function closeModal() {

    document
        .getElementById(
            "vendorModal"
        )
        .classList.add("hidden");
}


// =========================================================
// EXPORT
// =========================================================

async function exportVendors() {

    try {

        const params =
            new URLSearchParams({

                search:
                    state.search,

                status:
                    state.status,

                category:
                    state.category,

                location:
                    state.location,

                risk_level:
                    state.risk,

                tab:
                    currentTab,

                page: 1,

                limit: 1000
            });

        const data =
            await apiFetch(
                `/api/procurement/vendors/dashboard?${params}`
            );

        const rows =
            data.vendors || [];

        if (!rows.length) {

            alert(
                "There are no vendors to export."
            );

            return;
        }

        const header = [
            "Vendor ID",
            "Vendor Name",
            "Category",
            "Contact Person",
            "Email",
            "Country",
            "Status",
            "Performance",
            "Risk"
        ];

        const csvRows = [
            header,

            ...rows.map(v => [
                v.vendor_id,
                v.vendor_name,
                v.category,
                v.contact_person,
                v.email,
                v.country,
                v.status,
                v.display_score,
                v.risk_level
            ])
        ];

        const csv =
            csvRows
                .map(
                    row =>
                        row
                            .map(csvEscape)
                            .join(",")
                )
                .join("\n");

        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                "a"
            );

        a.href = url;
        a.download =
            "vendors.csv";

        a.click();

        URL.revokeObjectURL(url);

    } catch (error) {

        alert(
            `Export failed: ${
                error.message
            }`
        );
    }
}


// =========================================================
// PLACEHOLDER ACTIONS
// =========================================================

function editVendor(vendorId) {

    window.location.href =
        `/VendorEdit.html?vendor_id=${
            encodeURIComponent(
                vendorId
            )
        }`;
}


function viewFullProfile(
    vendorId
) {

    window.location.href =
        `/VendorProfile.html?vendor_id=${
            encodeURIComponent(
                vendorId
            )
        }`;
}


function showVendorMenu(
    vendorId
) {

    const action =
        confirm(
            `Open vendor ${vendorId}?`
        );

    if (action) {
        viewVendor(vendorId);
    }
}


// =========================================================
// HELPERS
// =========================================================

function normalizeStatus(
    status
) {

    const value =
        String(
            status || ""
        ).toLowerCase();

    if (
        value === "active"
    ) {
        return {
            className: "active"
        };
    }

    if (
        value.includes("approved")
    ) {
        return {
            className: "approved"
        };
    }

    if (
        value.includes("pending")
    ) {
        return {
            className: "pending"
        };
    }

    if (
        value.includes("review")
    ) {
        return {
            className: "review"
        };
    }

    if (
        value.includes("blacklist")
    ) {
        return {
            className: "blacklisted"
        };
    }

    return {
        className: "rejected"
    };
}


function getInitials(
    name
) {

    return String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .map(x => x[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
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


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeJs(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}


function csvEscape(
    value
) {

    return `"${String(
        value ?? ""
    ).replaceAll('"', '""')}"`;
}


function debounce(
    fn,
    delay
) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => fn(...args),
                delay
            );
    };
}


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

function openProfile(){
    window.location.href="/ProcurementProfile";
}

function loadUser(user){

    const name = user.name || "Manager";

    setText( "sidebarName", name );

    setText( "topUserName", name );

}

async function loadProfile(){

    try{
        const data = await getJSON("/api/procurement/profile/me");

        console.log("Manager Profile:",data);

        loadUser(data.user);
    }

    catch(error){
        console.error("Unable to load manager profile:",error);
    }
}