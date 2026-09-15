const API = "http://127.0.0.1:8000";



/* =========================================================
   HELPER
========================================================= */

async function getHomeData() {

    const response = await fetch(
        `${API}/api/home`
    );

    if (!response.ok) {

        throw new Error(
            `Home API returned HTTP ${response.status}`
        );

    }

    return response.json();

}



/* =========================================================
   MONEY FORMAT
========================================================= */

function formatMoney(value) {

    value = Number(value || 0);

    if (value >= 1000000000) {

        return "$" +
            (value / 1000000000)
                .toFixed(1) +
            "B";

    }

    if (value >= 1000000) {

        return "$" +
            (value / 1000000)
                .toFixed(2) +
            "M";

    }

    if (value >= 1000) {

        return "$" +
            (value / 1000)
                .toFixed(1) +
            "K";

    }

    return "$" + value.toFixed(0);

}



/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString();

}



/* =========================================================
   LOAD DASHBOARD
========================================================= */

async function loadHomePage() {

    try {

        const data =
            await getHomeData();


        /* ================================================
           MAIN KPIs
        ================================================= */

        document.getElementById(
            "totalVendors"
        ).textContent =
            formatNumber(
                data.total_vendors
            );


        document.getElementById(
            "totalOrders"
        ).textContent =
            formatNumber(
                data.total_purchase_orders
            );


        document.getElementById(
            "totalSpend"
        ).textContent =
            formatMoney(
                data.total_spend
            );


        document.getElementById(
            "reliabilityCircle"
        ).textContent =
            Math.round(
                data.average_reliability
            );


        document.getElementById(
            "donutTotal"
        ).textContent =
            formatNumber(
                data.total_vendors
            );


        /* ================================================
           HERO
        ================================================= */

        document.getElementById(
            "heroVendors"
        ).textContent =
            formatNumber(
                data.total_vendors
            ) + "+";


        document.getElementById(
            "heroReliability"
        ).textContent =
            Number(
                data.average_reliability
            ).toFixed(1) + "%";


        document.getElementById(
            "heroSpend"
        ).textContent =
            formatMoney(
                data.total_spend
            ) + "+";


        /* ================================================
           OTHER KPIs
        ================================================= */

        document.getElementById(
            "contractAlerts"
        ).textContent =
            data.contract_alerts;


        document.getElementById(
            "pendingApprovals"
        ).textContent =
            data.pending_approvals;


        document.getElementById(
            "complianceScore"
        ).textContent =
            Number(
                data.compliance_score
            ).toFixed(0) + "%";


        /* ================================================
           DONUT
        ================================================= */

        updateReliabilityDonut(
            data.reliability_distribution
        );


        /* ================================================
           SPEND CHART
        ================================================= */

        createSpendChart(
            data.spend_trend
        );


    }

    catch (error) {

        console.error(
            "VendorIQ homepage error:",
            error
        );

    }

}



/* =========================================================
   RELIABILITY DONUT
========================================================= */

function updateReliabilityDonut(
    distribution
) {

    const total =
        Object.values(
            distribution
        ).reduce(
            (a,b) => a + b,
            0
        );

    if (!total) {
        return;
    }


    const excellent =
        distribution.excellent || 0;

    const good =
        distribution.good || 0;

    const average =
        distribution.average || 0;

    const poor =
        distribution.poor || 0;

    const critical =
        distribution.critical || 0;


    const excellentDeg =
        excellent / total * 360;

    const goodDeg =
        good / total * 360;

    const averageDeg =
        average / total * 360;

    const poorDeg =
        poor / total * 360;


    const first =
        excellentDeg;

    const second =
        first + goodDeg;

    const third =
        second + averageDeg;

    const fourth =
        third + poorDeg;


    const donut =
        document.getElementById(
            "reliabilityDonut"
        );


    donut.style.background =
        `conic-gradient(
            #10b981 0deg ${first}deg,
            #3b82f6 ${first}deg ${second}deg,
            #f59e0b ${second}deg ${third}deg,
            #f97316 ${third}deg ${fourth}deg,
            #ef4444 ${fourth}deg 360deg
        )`;


    document.getElementById(
        "donutTotal"
    ).textContent =
        formatNumber(total);

}



/* =========================================================
   SPEND CHART
========================================================= */

let spendChart = null;


function createSpendChart(
    trend
) {

    const canvas =
        document.getElementById(
            "spendChart"
        );

    if (!canvas) {
        return;
    }


    if (spendChart) {

        spendChart.destroy();

    }


    const labels =
        trend.map(
            item => item.month
        );


    const actual =
        trend.map(
            item => item.actual
        );


    const budget =
        trend.map(
            item => item.budget
        );


    spendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Actual Spend",

                            data:
                                actual,

                            borderColor:
                                "#7956ff",

                            backgroundColor:
                                "rgba(121,86,255,.10)",

                            fill: true,

                            tension: .35,

                            pointRadius: 3

                        },

                        {

                            label:
                                "Budget",

                            data:
                                budget,

                            borderColor:
                                "#14b889",

                            backgroundColor:
                                "rgba(20,184,137,.05)",

                            fill: true,

                            tension: .35,

                            pointRadius: 3

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            labels: {

                                color:
                                    "#9cabc9",

                                font: {

                                    size: 9

                                }

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                color:
                                    "#7f90b3",

                                font: {

                                    size: 8

                                }

                            },

                            grid: {

                                display: false

                            }

                        },


                        y: {

                            ticks: {

                                color:
                                    "#7f90b3",

                                font: {

                                    size: 8

                                },

                                callback:
                                    function(value) {

                                        if (
                                            value >=
                                            1000000
                                        ) {

                                            return "$" +
                                                (
                                                    value /
                                                    1000000
                                                ).toFixed(1) +
                                                "M";

                                        }

                                        return "$" +
                                            (
                                                value /
                                                1000
                                            ).toFixed(0) +
                                            "K";

                                    }

                            },

                            grid: {

                                color:
                                    "rgba(120,145,206,.10)"

                            }

                        }

                    }

                }

            }

        );

}



/* =========================================================
   MOBILE MENU
========================================================= */

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );


if (mobileMenu) {

    mobileMenu.addEventListener(
        "click",
        function() {

            const nav =
                document.querySelector(
                    ".main-nav"
                );

            if (
                nav.style.display ===
                "flex"
            ) {

                nav.style.display =
                    "none";

            }
            else {

                nav.style.display =
                    "flex";

                nav.style.position =
                    "absolute";

                nav.style.top =
                    "70px";

                nav.style.left =
                    "20px";

                nav.style.right =
                    "20px";

                nav.style.padding =
                    "20px";

                nav.style.flexDirection =
                    "column";

                nav.style.background =
                    "#07183b";

                nav.style.borderRadius =
                    "12px";

            }

        }
    );

}



/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    loadHomePage
);