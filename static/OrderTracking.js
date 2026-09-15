const API_BASE = "http://127.0.0.1:8000";

let currentPage = 1;
let pageSize = 10;
let currentStatus = "All";
let currentDetailId = null;


// =========================================================
// API
// =========================================================

function getToken() {

    return (
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("jwt_token")
    );
}


async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();

    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            `${API_BASE}${url}`,
            {
                ...options,
                credentials: "include",
                headers
            }
        );

    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        try {

            const error =
                await response.json();

            console.error(
                "API Error:",
                error
            );

            if (typeof error.detail === "string") {

                message =
                    error.detail;

            } else if (
                Array.isArray(error.detail)
            ) {

                message =
                    error.detail
                        .map(item => {

                            const location =
                                item.loc
                                    ? item.loc.join(".")
                                    : "";

                            return `${location}: ${item.msg}`;

                        })
                        .join("\n");

            } else if (
                error.detail
            ) {

                message =
                    JSON.stringify(
                        error.detail
                    );
            }

        } catch (_) {}

        throw new Error(message);
    }

    return response.json();
}


async function getJSON(
    url,
    options = {}
) {
    return await apiFetch(
        url,
        options
    );
}


/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadDashboard() {

    const params = new URLSearchParams();

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim();

    const vendor =
        document
            .getElementById("vendorFilter")
            .value;

    const dateFrom =
        document
            .getElementById("dateFrom")
            .value;

    const dateTo =
        document
            .getElementById("dateTo")
            .value;

    params.set(
        "page",
        currentPage
    );

    params.set(
        "page_size",
        pageSize
    );

    params.set(
        "status",
        currentStatus
    );

    if (search) {
        params.set(
            "search",
            search
        );
    }

    if (vendor !== "All") {

        params.set(
            "vendor_id",
            vendor
        );
    }

    if (dateFrom) {

        params.set(
            "date_from",
            dateFrom
        );
    }

    if (dateTo) {

        params.set(
            "date_to",
            dateTo
        );
    }

    try {

        const data = await apiFetch(
            `/api/order-tracking/dashboard?${params.toString()}`
        );

        renderSummary(
            data.summary
        );

        renderVendors(
            data.vendors
        );

        renderOrders(
            data.orders
        );

        renderPagination(
            data.pagination
        );

    } catch (error) {

        console.error(
            "Order tracking error:",
            error
        );

        showTableMessage(
            error.message
        );
    }
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(summary) {

    document.getElementById(
        "totalOrders"
    ).textContent =
        summary.total_orders ?? 0;

    document.getElementById(
        "inTransit"
    ).textContent =
        summary.in_transit ?? 0;

    document.getElementById(
        "outForDelivery"
    ).textContent =
        summary.out_for_delivery ?? 0;

    document.getElementById(
        "delivered"
    ).textContent =
        summary.delivered ?? 0;

    document.getElementById(
        "delayed"
    ).textContent =
        summary.delayed ?? 0;

    document.getElementById(
        "exceptions"
    ).textContent =
        summary.exceptions ?? 0;
}


/* =========================================================
   VENDORS
========================================================= */

function renderVendors(vendors) {

    const select =
        document.getElementById(
            "vendorFilter"
        );

    const currentValue =
        select.value;

    select.innerHTML = `
        <option value="All">
            All Vendors
        </option>
    `;

    vendors.forEach(vendor => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            vendor.vendor_id;

        option.textContent =
            vendor.vendor_name ||
            vendor.vendor_id;

        select.appendChild(
            option
        );
    });

    select.value =
        currentValue || "All";
}


/* =========================================================
   ORDERS
========================================================= */

function renderOrders(orders) {

    const body =
        document.getElementById(
            "ordersBody"
        );

    if (!orders.length) {

        body.innerHTML = `
            <div class="empty-details">
                <div>
                    <i class="fa-solid fa-box-open"></i>
                    <p>No orders found.</p>
                </div>
            </div>
        `;

        return;
    }

    body.innerHTML =
        orders.map(
            order => createOrderRow(order)
        ).join("");

    document
        .querySelectorAll(
            ".view-order"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const id =
                        button.dataset.id;

                    loadOrderDetails(
                        id
                    );
                }
            );
        });
}


/* =========================================================
   ORDER ROW
========================================================= */

function createOrderRow(order) {

    const status =
        order.status || "Pending";

    const statusClass =
        getStatusClass(status);

    const progress =
        Number(order.progress || 0);

    return `
        <div class="order-row">

            <div class="po-number">
                ${escapeHtml(
                    order.po_number
                )}
            </div>

            <div class="vendor-name">
                ${escapeHtml(
                    order.vendor?.vendor_name ||
                    order.vendor?.vendor_id ||
                    "-"
                )}
            </div>

            <div class="date">
                ${formatDate(
                    order.order_date
                )}
            </div>

            <div class="date">
                ${formatDate(
                    order.expected_delivery
                )}
            </div>

            <div>
                <span class="status ${statusClass}">
                    ${escapeHtml(status)}
                </span>
            </div>

            <div>
                ${escapeHtml(
                    order.current_location ||
                    "-"
                )}
            </div>

            <div class="progress">

                <span class="progress-value">
                    ${progress}%
                </span>

                <div class="progress-track">

                    <div
                        class="progress-fill ${getProgressClass(status)}"
                        style="width:${progress}%"
                    ></div>

                </div>

            </div>

            <div class="row-actions">

                <button
                    class="view-order"
                    data-id="${order.id}"
                    title="View"
                >
                    <i class="fa-regular fa-eye"></i>
                </button>

                <button
                    title="More"
                    onclick="showOrderMenu(${order.id})"
                >
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   ORDER DETAILS
========================================================= */

async function loadOrderDetails(id) {

    currentDetailId = id;

    try {

        const data =
            await apiFetch(
                `/api/order-tracking/orders/${id}`
            );

        renderOrderDetails(
            data
        );

    } catch (error) {

        console.error(error);

        document.getElementById(
            "detailsContent"
        ).innerHTML = `
            <div class="empty-details">
                <div>
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>${escapeHtml(
                        error.message
                    )}</p>
                </div>
            </div>
        `;
    }
}


/* =========================================================
   DETAILS RENDER
========================================================= */

function renderOrderDetails(data) {

    const order =
        data.order;

    const shipment =
        data.shipment;

    document.getElementById(
        "detailPo"
    ).textContent =
        order.po_number;

    const timeline =
        data.timeline || [];

    const items =
        data.items || [];

    document.getElementById(
        "detailsContent"
    ).innerHTML = `

        <div class="detail-meta">

            <div class="detail-meta-grid">

                <div>
                    <label>Vendor</label>
                    <strong>
                        ${escapeHtml(
                            order.vendor || "-"
                        )}
                    </strong>
                </div>

                <div>
                    <label>Status</label>
                    <span class="status ${getStatusClass(order.status)}">
                        ${escapeHtml(
                            order.status || "-"
                        )}
                    </span>
                </div>

                <div>
                    <label>Order Date</label>
                    <strong>
                        ${formatDate(
                            order.order_date
                        )}
                    </strong>
                </div>

                <div>
                    <label>Expected Delivery</label>
                    <strong>
                        ${formatDate(
                            order.expected_delivery
                        )}
                    </strong>
                </div>

            </div>

        </div>


        <div>

            <div class="section-title">
                <span>Shipment Progress</span>
            </div>

            <div class="timeline">

                ${
                    timeline.length
                    ? timeline
                        .map(
                            event =>
                                createTimelineItem(
                                    event,
                                    order.status
                                )
                        )
                        .join("")
                    : `
                        <p class="date">
                            No tracking events available.
                        </p>
                    `
                }

            </div>

        </div>


        <div>

            <div class="section-title">

                <span>
                    Items (${items.length})
                </span>

            </div>

            ${
                items.length
                ? items
                    .map(
                        item =>
                            createItem(
                                item
                            )
                    )
                    .join("")
                : `
                    <p class="date">
                        No items found.
                    </p>
                `
            }

        </div>


        <div class="tracking-box">

            <div class="section-title">
                <span>Tracking Number</span>
            </div>

            <div class="tracking-number">

                <strong>
                    ${escapeHtml(
                        shipment?.tracking_number ||
                        "Not assigned"
                    )}
                </strong>

                ${
                    shipment?.tracking_number
                    ? `
                        <button
                            class="copy-btn"
                            onclick="copyTrackingNumber('${escapeJs(
                                shipment.tracking_number
                            )}')"
                        >
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    `
                    : ""
                }

            </div>

            ${
                shipment?.tracking_number
                ? `
                    <button
                        class="track-carrier"
                        onclick"openCarrierTracking(
                            '${escapeJs(carrier)}',
                            '${escapeJs(trackingNumber)}'
                        )"

                    >
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        Track on Carrier Website
                    </button>
                `
                : ""
            }

        </div>
    `;
}


/* =========================================================
   TIMELINE ITEM
========================================================= */

function createTimelineItem(
    event,
    currentStatus
) {

    const isCurrent =
        event.event?.toLowerCase()
        === currentStatus?.toLowerCase();

    const classes =
        event.completed
        ? "completed"
        : isCurrent
            ? "current"
            : "";

    return `
        <div class="timeline-item ${classes}">

            <div class="timeline-dot"></div>

            <div class="timeline-title">
                ${escapeHtml(
                    event.event
                )}
            </div>

            <div class="timeline-time">
                ${formatDateTime(
                    event.time
                )}
            </div>

            ${
                event.location
                ? `
                    <div class="timeline-location">
                        ${escapeHtml(
                            event.location
                        )}
                    </div>
                `
                : ""
            }

        </div>
    `;
}


/* =========================================================
   ITEM
========================================================= */

function createItem(item) {

    const quantity =
        Number(item.quantity || 0);

    const delivered =
        Number(
            item.delivered_quantity || 0
        );

    const percent =
        quantity > 0
        ? Math.min(
            100,
            (delivered / quantity) * 100
        )
        : 0;

    return `
        <div class="item-card">

            <div class="item-name">
                ${escapeHtml(
                    item.item_description
                )}
            </div>

            <div class="item-quantity">

                Quantity:
                ${quantity}

                ${escapeHtml(
                    item.uom || ""
                )}

                ·

                ${delivered}
                Delivered

            </div>

            <div class="item-progress">

                <span>
                    ${Math.round(percent)}%
                </span>

                <div class="item-progress-track">

                    <div
                        class="item-progress-fill"
                        style="width:${percent}%"
                    ></div>

                </div>

            </div>

        </div>
    `;
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    pagination
) {

    const total =
        pagination.total || 0;

    const start =
        total === 0
        ? 0
        : ((pagination.page - 1) * pageSize) + 1;

    const end =
        Math.min(
            pagination.page * pageSize,
            total
        );

    document.getElementById(
        "paginationText"
    ).textContent =
        `Showing ${start} to ${end} of ${total} orders`;

    document.getElementById(
        "pageNumber"
    ).textContent =
        pagination.page;

    document.getElementById(
        "prevBtn"
    ).disabled =
        pagination.page <= 1;

    document.getElementById(
        "nextBtn"
    ).disabled =
        pagination.page >=
        pagination.total_pages;
}


/* =========================================================
   STATUS
========================================================= */

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .replace(/\s+/g, "-");

    if (value === "in-transit")
        return "in-transit";

    if (value === "out-for-delivery")
        return "out-for-delivery";

    if (value === "delivered")
        return "delivered";

    if (value === "delayed")
        return "delayed";

    if (
        value === "exception" ||
        value === "exceptions"
    )
        return "exception";

    return "pending";
}


function getProgressClass(status) {

    const value =
        String(status || "")
            .toLowerCase();

    if (value === "delivered")
        return "delivered";

    if (value === "out for delivery")
        return "delivery";

    if (value === "delayed")
        return "delayed";

    return "";
}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value)
        return "-";

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    ))
        return value;

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatDateTime(value) {

    if (!value)
        return "Time unavailable";

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    ))
        return value;

    return date.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   RESET
========================================================= */

function resetFilters() {

    document.getElementById(
        "searchInput"
    ).value = "";

    document.getElementById(
        "vendorFilter"
    ).value = "All";

    document.getElementById(
        "dateFrom"
    ).value = "";

    document.getElementById(
        "dateTo"
    ).value = "";

    currentStatus = "All";

    currentPage = 1;

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.status === "All"
            );
        });

    loadDashboard();
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    document
        .getElementById(
            "searchInput"
        )
        .addEventListener(
            "input",
            debounce(
                () => {

                    currentPage = 1;

                    loadDashboard();

                },
                350
            )
        );


    const exportBtn =
        document.getElementById("exportBtn");

    if (exportBtn) {

        exportBtn.addEventListener(
            "click",
            exportOrders
        );
    }


    const trackOrderBtn =
        document.getElementById("trackOrderBtn");

    if (trackOrderBtn) {

        trackOrderBtn.addEventListener(
            "click",
            trackSelectedOrder
        );
    }


    document
        .getElementById(
            "statusFilter"
        )
        .addEventListener(
            "change",
            event => {

                currentStatus =
                    event.target.value;

                currentPage = 1;

                updateTabs();

                loadDashboard();
            }
        );


    document
        .getElementById(
            "vendorFilter"
        )
        .addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadDashboard();
            }
        );


    document
        .getElementById(
            "dateFrom"
        )
        .addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadDashboard();
            }
        );


    document
        .getElementById(
            "dateTo"
        )
        .addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadDashboard();
            }
        );


    document
        .getElementById(
            "resetBtn"
        )
        .addEventListener(
            "click",
            resetFilters
        );


    document
        .getElementById(
            "prevBtn"
        )
        .addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    currentPage--;

                    loadDashboard();
                }
            }
        );


    document
        .getElementById(
            "nextBtn"
        )
        .addEventListener(
            "click",
            () => {

                currentPage++;

                loadDashboard();
            }
        );


    document
        .getElementById(
            "pageSize"
        )
        .addEventListener(
            "change",
            event => {

                pageSize =
                    Number(
                        event.target.value
                    );

                currentPage = 1;

                loadDashboard();
            }
        );


    document
        .querySelectorAll(
            ".tab"
        )
        .forEach(tab => {

            tab.addEventListener(
                "click",
                () => {

                    currentStatus =
                        tab.dataset.status;

                    document
                        .getElementById(
                            "statusFilter"
                        )
                        .value =
                        currentStatus;

                    currentPage = 1;

                    updateTabs();

                    loadDashboard();
                }
            );
        });


    document
        .getElementById(
            "closeDetails"
        )
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
                                <i class="fa-solid fa-box-open"></i>
                                <p>
                                    Select an order to view details.
                                </p>
                            </div>
                        </div>
                    `;
            }
        );

}


async function exportOrders() {

    try {

        const params =
            new URLSearchParams();

        const search =
            document
                .getElementById("searchInput")
                .value
                .trim();

        const vendor =
            document
                .getElementById("vendorFilter")
                .value;

        const dateFrom =
            document
                .getElementById("dateFrom")
                .value;

        const dateTo =
            document
                .getElementById("dateTo")
                .value;

        params.set("page", "1");
        params.set("page_size", "100");
        params.set("status", currentStatus);

        if (search) {
            params.set("search", search);
        }

        if (vendor && vendor !== "All") {
            params.set("vendor_id", vendor);
        }

        if (dateFrom) {
            params.set("date_from", dateFrom);
        }

        if (dateTo) {
            params.set("date_to", dateTo);
        }

        const data =
            await apiFetch(
                `/api/order-tracking/dashboard?${params.toString()}`
            );

        const orders =
            data.orders || [];

        if (!orders.length) {

            alert(
                "There are no orders to export."
            );

            return;
        }

        const header = [
            "PO Number",
            "Vendor",
            "Order Date",
            "Expected Delivery",
            "Status",
            "Current Location",
            "Progress"
        ];

        const rows = [
            header,

            ...orders.map(order => [

                order.po_number || "",

                order.vendor?.vendor_name ||
                order.vendor?.vendor_id ||
                "",

                order.order_date || "",

                order.expected_delivery || "",

                order.status || "",

                order.current_location || "",

                `${Number(order.progress || 0)}%`
            ])
        ];

        const csv =
            rows
                .map(row =>
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
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            "order_tracking.csv";

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(
            "Order export failed:",
            error
        );

        alert(
            `Export failed: ${error.message}`
        );
    }
}


function csvEscape(value) {

    return `"${String(
        value ?? ""
    ).replaceAll('"', '""')}"`;
}


async function trackSelectedOrder() {

    // -----------------------------------------------------
    // No order has been selected yet
    // -----------------------------------------------------

    if (!currentDetailId) {

        alert(
            "Please select an order first."
        );

        return;
    }


    try {

        // -------------------------------------------------
        // Load the selected order
        // -------------------------------------------------

        const data =
            await apiFetch(
                `/api/order-tracking/orders/${encodeURIComponent(
                    currentDetailId
                )}`
            );


        const shipment =
            data.shipment;


        const trackingNumber =
            shipment?.tracking_number;


        // -------------------------------------------------
        // Check tracking number
        // -------------------------------------------------

        if (!trackingNumber) {

            alert(
                "This order does not have a tracking number yet."
            );

            return;
        }


        // -------------------------------------------------
        // Open carrier tracking
        // -------------------------------------------------

        openCarrierTracking(
            shipment.carrier,
            trackingNumber
        );

    } catch (error) {

        console.error(
            "Unable to track order:",
            error
        );

        alert(
            `Unable to track order: ${error.message}`
        );
    }
}


function updateTabs() {

    document
        .querySelectorAll(
            ".tab"
        )
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.status
                === currentStatus
            );
        });
}


/* =========================================================
   HELPERS
========================================================= */

function debounce(
    callback,
    delay
) {

    let timer;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => callback(...args),
            delay
        );
    };
}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    )
        return "";

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeJs(value) {

    return String(value || "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'");
}


/* =========================================================
   TRACKING
========================================================= */

function copyTrackingNumber(number) {

    navigator.clipboard
        .writeText(number)
        .then(() => {

            alert(
                "Tracking number copied."
            );

        });
}


function openCarrierTracking(carrier, trackingNumber) {

    if (!trackingNumber) {
        alert("Tracking number is not available.");
        return;
    }

    const normalizedCarrier =
        String(carrier || "")
            .toLowerCase()
            .trim();

    let url = null;


    if (normalizedCarrier.includes("dhl")) {

        url =
            `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(
                trackingNumber
            )}`;

    }

    else if (
        normalizedCarrier.includes("fedex")
    ) {

        url =
            `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(
                trackingNumber
            )}`;

    }

    else if (
        normalizedCarrier.includes("ups")
    ) {

        url =
            `https://www.ups.com/track?tracknum=${encodeURIComponent(
                trackingNumber
            )}`;

    }

    else {

        // Unknown carrier
        url =
            `https://www.google.com/search?q=${encodeURIComponent(
                carrier + " " + trackingNumber
            )}`;
    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


function showOrderMenu(id) {

    console.log(
        "Order menu:",
        id
    );
}


/* =========================================================
   TABLE ERROR
========================================================= */

function showTableMessage(message) {

    document.getElementById(
        "ordersBody"
    ).innerHTML = `
        <div class="empty-details">
            <div>
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>
                    ${escapeHtml(message)}
                </p>
            </div>
        </div>
    `;
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupEvents();

        loadDashboard();

        loadProfile();

    }
);


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

    const role = user.role || "Procurement Manager";

    setText( "sidebarName", name );

    setText( "sidebarRole", role );

    setText( "headerName", name );

    setText( "headerRole", role );

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