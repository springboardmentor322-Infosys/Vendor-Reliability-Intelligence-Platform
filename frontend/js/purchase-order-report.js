async function loadPurchaseOrderReport() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/reports/purchase-orders"
        );

        console.log(
            "Purchase Report Status:",
            response.status
        );


        const data = await response.json();


        console.log(
            "Purchase Order Report:",
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
                "purchaseReportBody"
            );


        tableBody.innerHTML = "";


        data.forEach(order => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${order.id}
                </td>

                <td>
                    ${order.vendor_name}
                </td>

                <td>
                    ${order.product_name}
                </td>

                <td>
                    ${order.quantity}
                </td>

                <td>
                    ₹${Number(
                        order.unit_price || 0
                    ).toFixed(2)}
                </td>

                <td>
                    ₹${Number(
                        order.total_amount || 0
                    ).toFixed(2)}
                </td>

                <td>
                    ${order.order_date}
                </td>

                <td>
                    ${order.expected_delivery}
                </td>

                <td>
                    ${order.status}
                </td>

            `;


            tableBody.appendChild(row);

        });

    }

    catch (error) {

        console.error(
            "Purchase Order Report Error:",
            error
        );

    }

}


// ==========================================
// LOAD REPORT
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadPurchaseOrderReport();

    }
);