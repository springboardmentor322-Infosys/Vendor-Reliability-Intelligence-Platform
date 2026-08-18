async function loadVendorReliabilityReport() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/reports/vendor-reliability"
        );

        console.log(
            "Report Response:",
            response.status
        );


        const data = await response.json();


        console.log(
            "Vendor Reliability Report:",
            data
        );


        if (!Array.isArray(data)) {

            console.error(
                "Expected array:",
                data
            );

            return;
        }


        const tableBody =
            document.getElementById(
                "reportTableBody"
            );


        tableBody.innerHTML = "";


        data.forEach((vendor, index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${vendor.vendor_name}
                </td>

                <td>
                    ${vendor.total_orders}
                </td>

                <td>
                    ${vendor.completed_orders}
                </td>

                <td>
                    ${vendor.pending_orders}
                </td>

                <td>
                    ${vendor.delivered_orders}
                </td>

                <td>
                    ${Number(
                        vendor.quality_score || 0
                    ).toFixed(2)}
                </td>

                <td>
                    ${Number(
                        vendor.delivery_rate || 0
                    ).toFixed(2)}%
                </td>

                <td>
                    ${Number(
                        vendor.reliability_score || 0
                    ).toFixed(2)}
                </td>

                <td>
                    ${vendor.performance}
                </td>

                <td>
                    ${vendor.risk}
                </td>

                <td>
                    ${vendor.recommendation}
                </td>

            `;


            tableBody.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Vendor Reliability Report Error:",
            error
        );

    }

}


// ==========================================
// LOAD REPORT WHEN PAGE OPENS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadVendorReliabilityReport();

    }
);