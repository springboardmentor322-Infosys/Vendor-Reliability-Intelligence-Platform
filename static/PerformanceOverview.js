/* ==========================================================
   VENDORIQ PERFORMANCE OVERVIEW
========================================================== */


/* ==========================================================
   API
========================================================== */

const API =
    "/api/performance/dashboard";


/* ==========================================================
   STATE
========================================================== */

let performanceChart = null;


/* ==========================================================
   GET VENDOR ID
========================================================== */

function getVendorId() {

    return (
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        sessionStorage.getItem("vendor_id") ||
        sessionStorage.getItem("vendorId") ||
        ""
    );

}


/* ==========================================================
   GET AUTH TOKEN
========================================================== */

function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        ""
    );

}


/* ==========================================================
   SAFE TEXT UPDATE
========================================================== */

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


/* ==========================================================
   LOAD PERFORMANCE DASHBOARD
========================================================== */

async function loadPerformanceDashboard() {

    try {

        const vendorId =
            getVendorId();


        console.log(
            "Vendor ID:",
            vendorId
        );


        if (!vendorId) {

            throw new Error(
                "Vendor ID not found. Please login again."
            );

        }


        const url =
            `${API}?vendor_id=${encodeURIComponent(
                vendorId
            )}`;


        console.log(
            "Performance API:",
            url
        );


        /* ==================================================
           REQUEST HEADERS
        ================================================== */

        const headers = {

            "Accept":
                "application/json"

        };


        const token =
            getToken();


        if (token) {

            headers["Authorization"] =
                `Bearer ${token}`;

        }


        /* ==================================================
           API REQUEST
        ================================================== */

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: headers
                }
            );


        /* ==================================================
           PARSE RESPONSE
        ================================================== */

        let data = null;


        try {

            data =
                await response.json();

        }
        catch (error) {

            throw new Error(
                `Invalid server response. HTTP ${response.status}`
            );

        }


        /* ==================================================
           HTTP ERROR
        ================================================== */

        if (!response.ok) {

            throw new Error(
                data?.detail ||
                `HTTP ${response.status}`
            );

        }


        console.log(
            "Performance Dashboard Response:",
            data
        );


        /* ==================================================
           VALIDATE RESPONSE
        ================================================== */

        if (!data) {

            throw new Error(
                "Empty response received from server."
            );

        }


        if (!data.vendor) {

            throw new Error(
                "Vendor information is missing from API response."
            );

        }


        /* ==================================================
           RENDER VENDOR
        ================================================== */

        renderVendor(
            data.vendor
        );


        /* ==================================================
           RENDER METRICS
        ================================================== */

        renderMetrics(
            data.metrics || {}
        );


        /* ==================================================
           RENDER CHART
        ================================================== */

        renderChart(
            data.history || []
        );


        /* ==================================================
           RENDER RANKING
        ================================================== */

        renderRanking(
            data.ranking || [],
            data.vendor.vendor_id
        );


        /* ==================================================
           RENDER HISTORY
        ================================================== */

        renderHistory(
            data.history || []
        );


        /* ==================================================
           RENDER CATEGORIES
        ================================================== */

        renderCategories(
            data.categories || []
        );


        /* ==================================================
           RENDER INSIGHTS
        ================================================== */

        renderInsights(
            data.insights || []
        );


        /* ==================================================
           CURRENT RANK
        ================================================== */

        if (
            data.current_rank !== null &&
            data.current_rank !== undefined
        ) {

            setText(
                "currentRank",
                `#${data.current_rank}`
            );

        }


        console.log(
            "Performance Dashboard loaded successfully."
        );

    }
    catch (error) {

        console.error(
            "Performance Dashboard Error:",
            error
        );


        showError(
            error.message ||
            "Unable to load performance data."
        );

    }

}


/* ==========================================================
   VENDOR
========================================================== */

function renderVendor(vendor) {

    setText(
        "headerVendorName",
        vendor.vendor_name ||
        "Vendor"
    );


    setText(
        "sidebarVendorName",
        vendor.vendor_name ||
        "Vendor"
    );


    setText(
        "sidebarVendorId",
        vendor.vendor_id ||
        "-"
    );


    /* ======================================================
       OPTIONAL VENDOR INFORMATION
    ====================================================== */

    setText(
        "vendorEmail",
        vendor.email ||
        "-"
    );


    setText(
        "vendorPhone",
        vendor.phone ||
        "-"
    );


    setText(
        "vendorCategory",
        vendor.category ||
        "-"
    );


    setText(
        "vendorStatus",
        vendor.status ||
        "-"
    );


    setText(
        "vendorContactPerson",
        vendor.contact_person ||
        "-"
    );

}


/* ==========================================================
   METRICS
========================================================== */

function renderMetrics(metrics) {

    /* ======================================================
       ON-TIME DELIVERY
    ====================================================== */

    setText(
        "onTime",
        `${formatNumber(
            metrics.on_time_deliveries
        )}%`
    );


    /* ======================================================
       DELAYED DELIVERY
    ====================================================== */

    setText(
        "delayed",
        `${formatNumber(
            metrics.delayed_deliveries
        )}%`
    );


    /* ======================================================
       QUALITY
    ====================================================== */

    setText(
        "quality",
        `${formatNumber(
            metrics.quality_rating
        )} /5`
    );


    /* ======================================================
       RESPONSE TIME
    ====================================================== */

    setText(
        "response",
        `${formatNumber(
            metrics.response_time
        )} hrs`
    );


    /* ======================================================
       ISSUE RESOLUTION
    ====================================================== */

    setText(
        "resolution",
        `${formatNumber(
            metrics.issue_resolution_time
        )} days`
    );


    /* ======================================================
       ORDER COMPLETION
    ====================================================== */

    setText(
        "completion",
        `${formatNumber(
            metrics.order_completion_rate
        )}%`
    );


    /* ======================================================
       OVERALL SCORE
    ====================================================== */

    setText(
        "overallScore",
        formatNumber(
            metrics.overall_score
        )
    );


    /* ======================================================
       ADDITIONAL PERFORMANCE VALUES
    ====================================================== */

    setText(
        "reliabilityScore",
        formatNumber(
            metrics.reliability_score
        )
    );


    setText(
        "deliveryScore",
        formatNumber(
            metrics.delivery_score
        )
    );


    setText(
        "qualityScore",
        formatNumber(
            metrics.quality_score
        )
    );


    setText(
        "serviceScore",
        formatNumber(
            metrics.service_score
        )
    );


    setText(
        "contractCount",
        formatNumber(
            metrics.contract_count
        )
    );

}


/* ==========================================================
   PERFORMANCE CHART
========================================================== */

function renderChart(history) {

    const canvas =
        document.getElementById(
            "performanceChart"
        );


    if (!canvas) {

        console.warn(
            "performanceChart element not found."
        );

        return;

    }


    /* ======================================================
       DESTROY OLD CHART
    ====================================================== */

    if (performanceChart) {

        performanceChart.destroy();

        performanceChart = null;

    }


    /* ======================================================
       EMPTY HISTORY
    ====================================================== */

    if (
        !Array.isArray(history) ||
        history.length === 0
    ) {

        const parent =
            canvas.parentElement;


        if (parent) {

            const existingMessage =
                parent.querySelector(
                    ".chart-empty-message"
                );


            if (!existingMessage) {

                const message =
                    document.createElement(
                        "div"
                    );


                message.className =
                    "chart-empty-message";


                message.style.cssText = `
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    height:100%;
                    min-height:220px;
                    color:#7b8494;
                    font-size:13px;
                `;


                message.textContent =
                    "No performance history available.";


                parent.appendChild(
                    message
                );

            }

        }


        return;

    }


    /* ======================================================
       REMOVE EMPTY MESSAGE
    ====================================================== */

    const parent =
        canvas.parentElement;


    if (parent) {

        const emptyMessage =
            parent.querySelector(
                ".chart-empty-message"
            );


        if (emptyMessage) {

            emptyMessage.remove();

        }

    }


    /* ======================================================
       LABELS
    ====================================================== */

    const labels =
        history.map(
            item => {

                const month =
                    item.month ||
                    "";

                const year =
                    item.year ||
                    "";

                return `${month} ${year}`.trim();

            }
        );


    /* ======================================================
       OVERALL SCORE
    ====================================================== */

    const overallScore =
        history.map(
            item =>
                safeNumber(
                    item.overall_score
                )
        );


    /* ======================================================
       ON-TIME DELIVERY
    ====================================================== */

    const onTime =
        history.map(
            item =>
                safeNumber(
                    item.on_time_deliveries
                )
        );


    /* ======================================================
       QUALITY
       
       Database:
       
       0 - 5
       
       Chart:
       
       0 - 100
       
       Therefore:
       
       4.5 × 20 = 90
    ====================================================== */

    const quality =
        history.map(
            item =>
                safeNumber(
                    item.quality_rating
                ) * 20
        );


    /* ======================================================
       ORDER COMPLETION
    ====================================================== */

    const completion =
        history.map(
            item =>
                safeNumber(
                    item.order_completion_rate
                )
        );


    /* ======================================================
       CREATE CHART
    ====================================================== */

    performanceChart =
        new Chart(
            canvas,
            {

                type: "line",


                data: {

                    labels: labels,


                    datasets: [

                        /* ==================================
                           OVERALL SCORE
                        ================================== */

                        {

                            label:
                                "Overall Score",

                            data:
                                overallScore,

                            borderColor:
                                "#16ad70",

                            backgroundColor:
                                "rgba(22,173,112,.08)",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: false

                        },


                        /* ==================================
                           ON-TIME DELIVERY
                        ================================== */

                        {

                            label:
                                "On-Time Delivery (%)",

                            data:
                                onTime,

                            borderColor:
                                "#2877ee",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: false

                        },


                        /* ==================================
                           QUALITY
                        ================================== */

                        {

                            label:
                                "Quality Rating (%)",

                            data:
                                quality,

                            borderColor:
                                "#7547e9",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: false

                        },


                        /* ==================================
                           ORDER COMPLETION
                        ================================== */

                        {

                            label:
                                "Order Completion (%)",

                            data:
                                completion,

                            borderColor:
                                "#f18b16",

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5,

                            fill: false

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    interaction: {

                        mode: "index",

                        intersect: false

                    },


                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                boxWidth: 10,

                                boxHeight: 10,

                                padding: 12,

                                font: {

                                    size: 9

                                }

                            }

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function (
                                        context
                                    ) {

                                        let value =
                                            context.raw;


                                        if (
                                            value ===
                                            null ||
                                            value ===
                                            undefined
                                        ) {

                                            value = 0;

                                        }


                                        return (
                                            `${context.dataset.label}: ` +
                                            `${Number(value).toFixed(1)}%`
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero: true,

                            min: 0,

                            max: 100,

                            ticks: {

                                stepSize: 20,

                                callback:
                                    function (
                                        value
                                    ) {

                                        return `${value}%`;

                                    },

                                font: {

                                    size: 9

                                }

                            },

                            grid: {

                                color:
                                    "#edf0f5"

                            }

                        },


                        x: {

                            ticks: {

                                font: {

                                    size: 9

                                }

                            },

                            grid: {

                                display: false

                            }

                        }

                    }

                }

            }
        );

}


/* ==========================================================
   VENDOR RANKING
========================================================== */

function renderRanking(
    ranking,
    currentVendorId
) {

    const tbody =
        document.getElementById(
            "rankingBody"
        );


    if (!tbody) {

        console.warn(
            "rankingBody element not found."
        );

        return;

    }


    tbody.innerHTML = "";


    /* ======================================================
       EMPTY RANKING
    ====================================================== */

    if (
        !Array.isArray(ranking) ||
        ranking.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    style="
                        text-align:center;
                        padding:20px;
                        color:#7b8494;
                    "
                >
                    No vendor ranking data available.
                </td>

            </tr>

        `;

        return;

    }


    /* ======================================================
       RANKING ROWS
    ====================================================== */

    ranking.forEach(
        item => {

            const row =
                document.createElement(
                    "tr"
                );


            /* ==============================================
               CURRENT VENDOR
            ============================================== */

            if (
                String(item.vendor_id) ===
                String(currentVendorId)
            ) {

                row.classList.add(
                    "current"
                );

            }


            /* ==============================================
               TREND
            ============================================== */

            let trendHtml =
                `<span>-</span>`;


            const trend =
                String(
                    item.trend || ""
                ).toLowerCase();


            if (
                trend.includes("up") ||
                trend.includes("increase") ||
                trend.includes("improv") ||
                trend === "positive"
            ) {

                trendHtml = `

                    <span class="positive">
                        ↑
                    </span>

                `;

            }
            else if (
                trend.includes("down") ||
                trend.includes("decrease") ||
                trend.includes("declin") ||
                trend === "negative"
            ) {

                trendHtml = `

                    <span
                        style="
                            color:#ef4f50;
                            font-weight:700;
                        "
                    >
                        ↓
                    </span>

                `;

            }


            /* ==============================================
               ROW HTML
            ============================================== */

            row.innerHTML = `

                <td>
                    ${formatNumber(
                        item.rank
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.vendor_name ||
                        "-"
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.score
                    )}
                </td>

                <td>
                    ${trendHtml}
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* ==========================================================
   PERFORMANCE HISTORY
========================================================== */

function renderHistory(history) {

    const tbody =
        document.getElementById(
            "historyBody"
        );


    if (!tbody) {

        console.warn(
            "historyBody element not found."
        );

        return;

    }


    tbody.innerHTML = "";


    /* ======================================================
       EMPTY HISTORY
    ====================================================== */

    if (
        !Array.isArray(history) ||
        history.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:20px;
                        color:#7b8494;
                    "
                >
                    No performance history available.
                </td>

            </tr>

        `;

        return;

    }


    /* ======================================================
       DISPLAY LATEST FIRST
    ====================================================== */

    [...history]
        .reverse()
        .forEach(
            item => {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>

                        ${escapeHtml(
                            item.month ||
                            ""
                        )}

                        ${formatNumber(
                            item.year
                        )}

                    </td>


                    <td>

                        ${formatNumber(
                            item.on_time_deliveries
                        )}%

                    </td>


                    <td>

                        ${formatNumber(
                            item.delayed_deliveries
                        )}%

                    </td>


                    <td>

                        ${formatNumber(
                            item.quality_rating
                        )}

                    </td>


                    <td>

                        ${formatNumber(
                            item.response_time
                        )} hrs

                    </td>


                    <td>

                        ${formatNumber(
                            item.issue_resolution_time
                        )} days

                    </td>


                    <td>

                        ${formatNumber(
                            item.order_completion_rate
                        )}%

                    </td>

                `;


                tbody.appendChild(
                    row
                );

            }
        );

}


/* ==========================================================
   CATEGORY BREAKDOWN
========================================================== */

function renderCategories(
    categories
) {

    const container =
        document.getElementById(
            "categoryLegend"
        );


    if (!container) {

        console.warn(
            "categoryLegend element not found."
        );

        return;

    }


    container.innerHTML = "";


    /* ======================================================
       EMPTY CATEGORIES
    ====================================================== */

    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        container.innerHTML = `

            <div
                style="
                    color:#7b8494;
                    padding:10px;
                "
            >
                No category data available.
            </div>

        `;

        return;

    }


    /* ======================================================
       COLORS
    ====================================================== */

    const colors = [

        "#2374ed",

        "#7446e8",

        "#12aeb7",

        "#f39a14",

        "#15ad6a"

    ];


    /* ======================================================
       RENDER
    ====================================================== */

    categories.forEach(
        (category, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "legend-item";


            const color =
                colors[
                    index %
                    colors.length
                ];


            item.innerHTML = `

                <span
                    class="legend-dot"
                    style="
                        background:${color};
                    "
                ></span>


                <span>

                    ${escapeHtml(
                        category.name ||
                        "-"
                    )}

                </span>


                <strong>

                    ${formatNumber(
                        category.value
                    )}%

                </strong>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* ==========================================================
   INSIGHTS
========================================================== */

function renderInsights(
    insights
) {

    const container =
        document.getElementById(
            "insights"
        );


    if (!container) {

        console.warn(
            "insights element not found."
        );

        return;

    }


    container.innerHTML = "";


    /* ======================================================
       EMPTY INSIGHTS
    ====================================================== */

    if (
        !Array.isArray(insights) ||
        insights.length === 0
    ) {

        container.innerHTML = `

            <div class="insight">

                <div class="insight-icon">
                    i
                </div>


                <div>

                    <strong>
                        No insights available
                    </strong>


                    <p>
                        Performance insights will appear here.
                    </p>

                </div>

            </div>

        `;

        return;

    }


    /* ======================================================
       ICONS
    ====================================================== */

    const icons = [

        "↗",

        "★",

        "◷",

        "◉"

    ];


    /* ======================================================
       RENDER INSIGHTS
    ====================================================== */

    insights.forEach(
        (item, index) => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "insight";


            element.innerHTML = `

                <div class="insight-icon">

                    ${
                        icons[index] ||
                        "•"
                    }

                </div>


                <div>

                    <strong>

                        ${escapeHtml(
                            item.title ||
                            "Performance Insight"
                        )}

                    </strong>


                    <p>

                        ${escapeHtml(
                            item.description ||
                            ""
                        )}

                    </p>

                </div>

            `;


            container.appendChild(
                element
            );

        }
    );

}


/* ==========================================================
   FORMAT NUMBER
========================================================== */

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(
            Number(value)
        )
    ) {

        return "0";

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }


    if (
        Number.isInteger(number)
    ) {

        return number.toString();

    }


    return number.toFixed(1);

}


/* ==========================================================
   SAFE NUMBER
========================================================== */

function safeNumber(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return 0;

    }


    return number;

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

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


/* ==========================================================
   ERROR
========================================================== */

function showError(message) {

    console.error(
        "Performance Dashboard:",
        message
    );


    const container =
        document.getElementById(
            "insights"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div
            class="insight"
            style="
                background:#fff1f1;
                padding:14px;
                border-radius:8px;
                border:1px solid #ffd5d5;
            "
        >

            <div
                class="insight-icon"
                style="
                    color:#ef4f50;
                    font-weight:700;
                "
            >
                !
            </div>


            <div>

                <strong>
                    Unable to load performance data
                </strong>


                <p>
                    ${escapeHtml(
                        message ||
                        "Please try again later."
                    )}
                </p>

            </div>

        </div>

    `;

}


/* ==========================================================
   OPTIONAL REFRESH FUNCTION
========================================================== */

async function refreshPerformanceDashboard() {

    await loadPerformanceDashboard();

}


/* ==========================================================
   PAGE LOAD
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "VendorIQ Performance Overview initialized."
        );


        loadPerformanceDashboard();

    }
);