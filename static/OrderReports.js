const API = "";

const state = {
    page: 1,
    limit: 8,
    totalPages: 1,
    vendorId: "",
    data: null
};


const $ = id => document.getElementById(id);


const money = n =>
    new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(Number(n || 0));


const pct = n =>
    `${Number(n || 0).toFixed(1)}%`;


const fmtDate = d =>
    d
        ? new Date(d + "T00:00:00").toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        )
        : "—";


/* =========================================================
   DEFAULT DATE
========================================================= */

function defaultDates() {

    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    $("fromDate").value =
        start.toISOString().slice(0, 10);

    $("toDate").value =
        now.toISOString().slice(0, 10);
}


/* =========================================================
   GET VENDOR ID
========================================================= */

function getVendorId() {

    const params =
        new URLSearchParams(location.search);

    return (
        params.get("vendor_id") ||
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        ""
    );
}


/* =========================================================
   QUERY PARAMETERS
========================================================= */

function queryParams() {

    const p = new URLSearchParams();

    if ($("fromDate").value) {
        p.set(
            "from_date",
            $("fromDate").value
        );
    }

    if ($("toDate").value) {
        p.set(
            "to_date",
            $("toDate").value
        );
    }

    if ($("categoryFilter").value) {
        p.set(
            "category",
            $("categoryFilter").value
        );
    }

    if ($("statusFilter").value) {
        p.set(
            "status",
            $("statusFilter").value
        );
    }

    if (state.vendorId) {
        p.set(
            "vendor_id",
            state.vendorId
        );
    }

    const q =
        $("tableSearch").value.trim();

    if (q) {
        p.set("search", q);
    }

    p.set("page", state.page);
    p.set("limit", state.limit);

    return p;
}


/* =========================================================
   LOAD REPORT
========================================================= */

async function loadReport() {

    try {

        const response =
            await fetch(
                `${API}/api/vendor/order-reports?${queryParams().toString()}`
            );

        if (!response.ok) {

            const error =
                await response.json();

            throw new Error(
                error.detail ||
                `HTTP ${response.status}`
            );
        }

        state.data =
            await response.json();

        state.totalPages =
            state.data.pagination.pages || 1;

        renderAll();

    }
    catch (error) {

        console.error(error);

        $("ordersBody").innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    Unable to load report:
                    ${esc(error.message)}
                </td>
            </tr>
        `;
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {

    const d = state.data;
    const k = d.kpis || {};


    $("totalOrders").textContent =
        k.total_orders ?? 0;

    $("completedOrders").textContent =
        k.completed_orders ?? 0;

    $("transitOrders").textContent =
        k.in_transit_orders ?? 0;

    $("pendingOrders").textContent =
        k.pending_orders ?? 0;

    $("cancelledOrders").textContent =
        k.cancelled_orders ?? 0;

    $("totalValue").textContent =
        money(k.total_order_value);


    setChange(
        "totalOrdersChange",
        k.changes?.total_orders,
        "up"
    );

    setChange(
        "completedChange",
        k.changes?.completed_orders,
        "up"
    );

    setChange(
        "transitChange",
        k.changes?.in_transit_orders,
        "down"
    );

    setChange(
        "pendingChange",
        k.changes?.pending_orders,
        "down"
    );

    setChange(
        "cancelledChange",
        k.changes?.cancelled_orders,
        "down"
    );

    setChange(
        "valueChange",
        k.changes?.total_order_value,
        "up"
    );


    $("sideVendorName").textContent =
        d.vendor?.vendor_name || "Vendor";

    $("topVendorName").textContent =
        d.vendor?.vendor_name || "Vendor";

    $("sideVendorId").textContent =
        `Vendor ID: ${
            d.vendor?.vendor_id ||
            state.vendorId ||
            "—"
        }`;


    renderCategories(
        d.categories || []
    );

    renderTrend(
        d.trend || []
    );

    renderDonut(
        d.status_distribution || []
    );

    renderValue(
        d.value_by_month || []
    );

    renderTable(
        d.orders || []
    );

    renderSummary(
        k,
        d.status_distribution || []
    );

    renderItems(
        d.top_items || []
    );

    renderInsights(
        d.insights || []
    );
}


/* =========================================================
   KPI CHANGE
========================================================= */

function setChange(id, val, dir) {

    const el = $(id);

    const n =
        Number(val || 0);

    el.textContent =
        `${n >= 0 ? "↑" : "↓"} ${
            Math.abs(n).toFixed(1)
        }% vs previous period`;

    el.className =
        n >= 0
            ? `up ${dir}`
            : `down ${dir}`;
}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function renderCategories(categories) {

    const current =
        $("categoryFilter").value;

    const options = [
        `<option value="">
            All Categories
        </option>`,

        ...categories.map(
            x => `
                <option value="${esc(x.category)}">
                    ${esc(x.category)}
                </option>
            `
        )
    ];

    $("categoryFilter").innerHTML =
        options.join("");

    if (
        categories.some(
            x => x.category === current
        )
    ) {
        $("categoryFilter").value =
            current;
    }


    $("vendorFilter").innerHTML = `
        <option value="${esc(state.vendorId)}">
            ${esc(
                state.data?.vendor?.vendor_name ||
                "All Vendors (You)"
            )}
        </option>
    `;
}


/* =========================================================
   TREND CHART
========================================================= */

function renderTrend(rows) {

    drawLineChart(
        $("trendChart"),

        rows.map(
            x => x.label
        ),

        [
            {
                key: "total",
                value: "Total Orders",
                stroke: "#1565ed"
            },

            {
                key: "completed",
                value: "Completed Orders",
                stroke: "#16aa6b"
            },

            {
                key: "cancelled",
                value: "Cancelled Orders",
                stroke: "#ef4444"
            }
        ],

        rows
    );
}


function drawLineChart(
    svg,
    labels,
    series,
    rows
) {

    const W = 700;
    const H = 250;

    const L = 38;
    const R = 10;
    const T = 15;
    const B = 32;

    svg.innerHTML = "";


    const vals =
        series.flatMap(
            s =>
                rows.map(
                    r =>
                        Number(
                            r[s.key] || 0
                        )
                )
        );


    const max =
        Math.max(
            10,
            ...vals
        );


    /* Grid */

    for (let i = 0; i <= 4; i++) {

        const y =
            T +
            (H - T - B) *
            i /
            4;

        const value =
            Math.round(
                max *
                (1 - i / 4)
            );

        svg.insertAdjacentHTML(
            "beforeend",
            `
            <line
                x1="${L}"
                y1="${y}"
                x2="${W - R}"
                y2="${y}"
                stroke="#edf1f7"
            />

            <text
                x="4"
                y="${y + 3}"
                font-size="9"
                fill="#7182a1"
            >
                ${value}
            </text>
            `
        );
    }


    /* Labels */

    labels.forEach(
        (label, i) => {

            const x =
                L +
                (W - L - R) *
                (
                    labels.length === 1
                        ? 0
                        : i /
                          (labels.length - 1)
                );

            svg.insertAdjacentHTML(
                "beforeend",
                `
                <text
                    x="${x}"
                    y="${H - 8}"
                    text-anchor="middle"
                    font-size="9"
                    fill="#7182a1"
                >
                    ${esc(label)}
                </text>
                `
            );
        }
    );


    /* Lines */

    series.forEach(
        s => {

            const points =
                rows.map(
                    (r, i) => {

                        const x =
                            L +
                            (W - L - R) *
                            (
                                rows.length === 1
                                    ? 0
                                    : i /
                                      (rows.length - 1)
                            );

                        const y =
                            T +
                            (H - T - B) *
                            (
                                1 -
                                Number(
                                    r[s.key] || 0
                                ) /
                                max
                            );

                        return [
                            x,
                            y
                        ];
                    }
                );


            svg.insertAdjacentHTML(
                "beforeend",
                `
                <polyline
                    fill="none"
                    stroke="${s.stroke}"
                    stroke-width="2.5"
                    points="${points
                        .map(p => p.join(","))
                        .join(" ")}"
                />
                `
            );


            points.forEach(
                p => {

                    svg.insertAdjacentHTML(
                        "beforeend",
                        `
                        <circle
                            cx="${p[0]}"
                            cy="${p[1]}"
                            r="3.5"
                            fill="${s.stroke}"
                        />
                        `
                    );

                }
            );

        }
    );
}


/* =========================================================
   DONUT CHART
========================================================= */

function renderDonut(items) {

    const svg =
        $("donutChart");

    const legend =
        $("statusLegend");

    svg.innerHTML = "";
    legend.innerHTML = "";


    const colors = {

        Completed: "#16aa6b",

        "In Transit": "#1565ed",

        Pending: "#f59e0b",

        Cancelled: "#ef4444",

        Delivered: "#10b981",

        Approved: "#7c5ce8",

        Ordered: "#5b8def"
    };


    const total =
        items.reduce(
            (a, b) =>
                a +
                Number(b.count || 0),
            0
        );


    let start =
        -Math.PI / 2;


    const cx = 120;
    const cy = 120;
    const r = 72;
    const inner = 48;


    items
        .slice(0, 7)
        .forEach(item => {

            const value =
                Number(
                    item.count || 0
                );

            const angle =
                total
                    ? value /
                      total *
                      Math.PI *
                      2
                    : 0;

            const end =
                start + angle;

            const large =
                angle > Math.PI
                    ? 1
                    : 0;


            const x1 =
                cx +
                r *
                Math.cos(start);

            const y1 =
                cy +
                r *
                Math.sin(start);

            const x2 =
                cx +
                r *
                Math.cos(end);

            const y2 =
                cy +
                r *
                Math.sin(end);


            const ix1 =
                cx +
                inner *
                Math.cos(end);

            const iy1 =
                cy +
                inner *
                Math.sin(end);

            const ix2 =
                cx +
                inner *
                Math.cos(start);

            const iy2 =
                cy +
                inner *
                Math.sin(start);


            const color =
                colors[item.status] ||
                "#8793aa";


            svg.insertAdjacentHTML(
                "beforeend",
                `
                <path
                    d="
                        M ${x1} ${y1}
                        A ${r} ${r}
                        0 ${large} 1
                        ${x2} ${y2}

                        L ${ix1} ${iy1}

                        A ${inner} ${inner}
                        0 ${large} 0
                        ${ix2} ${iy2}

                        Z
                    "
                    fill="${color}"
                />
                `
            );


            const percent =
                total
                    ? value /
                      total *
                      100
                    : 0;


            legend.insertAdjacentHTML(
                "beforeend",
                `
                <div class="status-row">

                    <i
                        class="swatch"
                        style="background:${color}"
                    ></i>

                    <span>
                        ${esc(item.status)}
                    </span>

                    <strong>
                        ${value}
                        (${percent.toFixed(1)}%)
                    </strong>

                </div>
                `
            );


            start = end;

        });


    svg.insertAdjacentHTML(
        "beforeend",
        `
        <text
            x="120"
            y="114"
            text-anchor="middle"
            font-size="22"
            font-weight="700"
            fill="#17346e"
        >
            ${total}
        </text>

        <text
            x="120"
            y="134"
            text-anchor="middle"
            font-size="10"
            fill="#7182a1"
        >
            Total Orders
        </text>
        `
    );
}


/* =========================================================
   VALUE CHART
========================================================= */

function renderValue(rows) {

    const svg =
        $("valueChart");

    const W = 700;
    const H = 250;

    const L = 38;
    const R = 10;
    const T = 15;
    const B = 32;

    svg.innerHTML = "";


    const max =
        Math.max(
            100,
            ...rows.map(
                x =>
                    Number(
                        x.value || 0
                    )
            )
        );


    const step =
        (W - L - R) /
        Math.max(
            rows.length,
            1
        );


    for (let i = 0; i <= 4; i++) {

        const y =
            T +
            (H - T - B) *
            i /
            4;

        const value =
            max *
            (1 - i / 4);


        svg.insertAdjacentHTML(
            "beforeend",
            `
            <line
                x1="${L}"
                y1="${y}"
                x2="${W - R}"
                y2="${y}"
                stroke="#edf1f7"
            />

            <text
                x="4"
                y="${y + 3}"
                font-size="9"
                fill="#7182a1"
            >
                ${moneyShort(value)}
            </text>
            `
        );
    }


    rows.forEach(
        (r, i) => {

            const h =
                (H - T - B) *
                (
                    Number(
                        r.value || 0
                    ) /
                    max
                );


            const x =
                L +
                i * step +
                step * .25;

            const y =
                H -
                B -
                h;

            const w =
                step * .5;


            svg.insertAdjacentHTML(
                "beforeend",
                `
                <rect
                    x="${x}"
                    y="${y}"
                    width="${w}"
                    height="${h}"
                    rx="4"
                    fill="#1565ed"
                />

                <text
                    x="${x + w / 2}"
                    y="${H - 8}"
                    text-anchor="middle"
                    font-size="9"
                    fill="#7182a1"
                >
                    ${esc(r.label)}
                </text>
                `
            );

        }
    );
}


/* =========================================================
   TABLE
========================================================= */

function renderTable(orders) {

    const body =
        $("ordersBody");


    if (!orders.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="empty"
                >
                    No orders found for the
                    selected filters.
                </td>
            </tr>
        `;

        return;
    }


    body.innerHTML =
        orders.map(
            o => `
            <tr>

                <td>
                    <strong>
                        ${esc(o.po_number)}
                    </strong>
                </td>

                <td>
                    ${fmtDate(o.order_date)}
                </td>

                <td
                    title="${esc(
                        o.item_description || ""
                    )}"
                >
                    ${esc(
                        o.item_description ||
                        "—"
                    )}
                </td>

                <td>
                    ${esc(
                        o.category ||
                        "Other"
                    )}
                </td>

                <td>
                    ${money(o.amount)}
                </td>

                <td>
                    ${statusPill(o.status)}
                </td>

                <td>
                    ${fmtDate(
                        o.expected_delivery
                    )}
                </td>

                <td>
                    ${fmtDate(
                        o.actual_delivery
                    )}
                </td>

                <td>

                    <button
                        class="action"
                        onclick="viewOrder(${o.id})"
                    >
                        •••
                    </button>

                </td>

            </tr>
            `
        )
        .join("");


    $("pageInfo").textContent =
        `Showing ${
            (state.page - 1) *
            state.limit +
            1
        } to ${
            Math.min(
                state.page *
                state.limit,
                state.data.pagination.total
            )
        } of ${
            state.data.pagination.total
        } orders`;


    renderPages();
}


/* =========================================================
   STATUS PILL
========================================================= */

function statusPill(status) {

    const s =
        String(status || "")
            .toLowerCase();


    let cls =
        "status-other";


    if (
        s.includes("complete") ||
        s.includes("deliver")
    ) {
        cls =
            "status-completed";
    }

    else if (
        s.includes("transit")
    ) {
        cls =
            "status-transit";
    }

    else if (
        s.includes("pending") ||
        s.includes("approved") ||
        s.includes("ordered")
    ) {
        cls =
            "status-pending";
    }

    else if (
        s.includes("cancel")
    ) {
        cls =
            "status-cancelled";
    }


    return `
        <span
            class="status-pill ${cls}"
        >
            ${esc(
                status ||
                "Pending"
            )}
        </span>
    `;
}


/* =========================================================
   PAGINATION
========================================================= */

function renderPages() {

    const el =
        $("pages");

    el.innerHTML = "";


    for (
        let i = 1;
        i <= Math.min(
            state.totalPages,
            8
        );
        i++
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.textContent = i;

        button.className =
            i === state.page
                ? "active"
                : "";


        button.onclick = () => {

            state.page = i;

            loadReport();

        };


        el.appendChild(button);
    }
}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(k) {

    const rows = [

        [
            "Total Orders",
            k.total_orders,
            ""
        ],

        [
            "Total Completed",
            k.completed_orders,
            pct(k.completed_orders_pct)
        ],

        [
            "Total In Transit",
            k.in_transit_orders,
            pct(k.in_transit_orders_pct)
        ],

        [
            "Total Pending",
            k.pending_orders,
            pct(k.pending_orders_pct)
        ],

        [
            "Total Cancelled",
            k.cancelled_orders,
            pct(k.cancelled_orders_pct)
        ],

        [
            "Total Order Value",
            money(k.total_order_value),
            ""
        ],

        [
            "Average Order Value",
            money(k.average_order_value),
            ""
        ]

    ];


    $("summary").innerHTML =
        rows.map(
            r => `
            <div class="sum-row">

                <span>
                    ${r[0]}
                </span>

                <strong>
                    ${r[1]}

                    ${
                        r[2]
                            ? `<small>
                                (${r[2]})
                               </small>`
                            : ""
                    }

                </strong>

            </div>
            `
        )
        .join("");
}


/* =========================================================
   TOP ITEMS
========================================================= */

function renderItems(items) {

    $("topItems").innerHTML =
        items
            .slice(0, 5)
            .map(
                x => `
                <li>

                    ${esc(
                        x.item_description
                    )}

                    <span>

                        ${
                            Number(
                                x.quantity || 0
                            )
                            .toLocaleString(
                                "en-IN"
                            )
                        }

                        ${esc(
                            x.uom || ""
                        )}

                    </span>

                </li>
                `
            )
            .join("")
        ||
        "<li>No item data</li>";
}


/* =========================================================
   INSIGHTS
========================================================= */

function renderInsights(items) {

    $("insights").innerHTML =
        items
            .map(
                x => `
                <div class="insight">

                    <b>
                        ${
                            x.type === "warning"
                                ? "⚠"
                                : "●"
                        }
                    </b>

                    <span>
                        ${esc(x.text)}
                    </span>

                </div>
                `
            )
            .join("")
        ||
        `
        <div class="insight">
            No insights available
            for this period.
        </div>
        `;
}


/* =========================================================
   VIEW INDIVIDUAL ORDER
========================================================= */

async function viewOrder(id) {

    try {

        const response =
            await fetch(
                `${API}/api/vendor/purchase-orders/${id}`
            );

        const data =
            await response.json();


        alert(
            JSON.stringify(
                data.purchase_order ||
                data,
                null,
                2
            )
        );

    }
    catch (error) {

        alert(
            error.message
        );

    }
}


/* =========================================================
   EXPORT
========================================================= */

async function exportReport() {

    const p =
        queryParams();

    p.delete("page");
    p.delete("limit");


    const response =
        await fetch(
            `${API}/api/vendor/order-reports/export?${p.toString()}`
        );


    if (!response.ok) {

        alert(
            "Export failed"
        );

        return;
    }


    const blob =
        await response.blob();


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
        "order-report.csv";

    a.click();


    URL.revokeObjectURL(
        url
    );
}


/* =========================================================
   SCHEDULE REPORT
========================================================= */

async function scheduleReport() {

    if (!state.vendorId) {

        alert(
            "Vendor ID is required."
        );

        return;
    }


    const payload = {

        vendor_id:
            state.vendorId,

        report_name:
            "Order Report",

        schedule:
            $("scheduleFrequency").value,

        next_run:
            $("nextRun").value ||
            null,

        recipients:
            $("recipients")
                .value
                .trim(),

        format:
            $("scheduleFormat").value,

        filters: {

            from_date:
                $("fromDate").value,

            to_date:
                $("toDate").value,

            category:
                $("categoryFilter").value,

            status:
                $("statusFilter").value

        }

    };


    const response =
        await fetch(
            `${API}/api/vendor/order-reports/schedule`,
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


    const data =
        await response.json();


    if (!response.ok) {

        alert(
            data.detail ||
            "Unable to schedule report"
        );

        return;
    }


    $("scheduleModal")
        .classList
        .add("hidden");


    alert(
        "Report schedule saved."
    );
}


/* =========================================================
   HELPERS
========================================================= */

function moneyShort(n) {

    n =
        Number(n || 0);


    if (n >= 1000000) {

        return `₹${
            (n / 1000000)
                .toFixed(1)
        }M`;
    }


    if (n >= 1000) {

        return `₹${
            (n / 1000)
                .toFixed(0)
        }K`;
    }


    return `₹${Math.round(n)}`;
}


function esc(s) {

    return String(
        s ?? ""
    )
    .replace(
        /[&<>"']/g,
        c =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[c]
    );
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        defaultDates();

        state.vendorId =
            getVendorId();


        $("filterBtn").onclick =
            () => {

                state.page = 1;

                loadReport();

            };


        $("exportBtn").onclick =
            exportReport;


        $("downloadBtn").onclick =
            exportReport;


        $("globalSearch").oninput =
            e => {

                $("tableSearch").value =
                    e.target.value;

                state.page = 1;

                loadReport();

            };


        $("tableSearch").oninput =
            () => {

                clearTimeout(
                    window.__searchTimer
                );


                window.__searchTimer =
                    setTimeout(
                        () => {

                            state.page = 1;

                            loadReport();

                        },
                        300
                    );
            };


        [
            "fromDate",
            "toDate",
            "categoryFilter",
            "statusFilter"
        ]
        .forEach(
            id => {

                $(id).onchange =
                    () => {

                        state.page = 1;

                        loadReport();

                    };

            }
        );


        $("trendRange").onchange =
            loadReport;


        $("scheduleBtn").onclick =
            () => {

                $("scheduleModal")
                    .classList
                    .remove("hidden");

            };


        $("closeModal").onclick =
            () => {

                $("scheduleModal")
                    .classList
                    .add("hidden");

            };


        $("saveSchedule").onclick =
            scheduleReport;


        loadReport();

    }
);