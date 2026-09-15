"use strict";


const API =
    "http://127.0.0.1:8000";


function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        localStorage.getItem("accessToken") ||
        null
    );
}


function getVendorId() {

    return (
        localStorage.getItem("vendor_id") ||
        localStorage.getItem("vendorId") ||
        null
    );
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatCurrency(value) {

    return Number(value || 0).toLocaleString(
        "en-US",
        {
            style: "currency",
            currency: "USD"
        }
    );
}


function formatDate(value) {

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
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


async function apiFetch(url) {

    const token =
        getToken();

    const headers = {
        "Content-Type":
            "application/json"
    };

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    const response =
        await fetch(
            url,
            {
                headers
            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data.detail ||
            "API request failed."
        );
    }

    return data;
}


async function loadHistory() {

    const vendorId =
        getVendorId();

    if (!vendorId) {

        alert(
            "Vendor ID is missing. Please login again."
        );

        return;
    }

    try {

        const dashboard =
            await apiFetch(
                `${API}/api/vendor/invoices/dashboard/${encodeURIComponent(vendorId)}`
            );

        renderHistory(
            dashboard.payment_history
        );

        updateProfile();

    }
    catch (error) {

        console.error(error);

        document.getElementById(
            "historyBody"
        ).innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;color:#dc2626;"
                >
                    ${escapeHtml(error.message)}
                </td>

            </tr>

        `;
    }
}


function renderHistory(payments) {

    const tbody =
        document.getElementById(
            "historyBody"
        );

    tbody.innerHTML = "";

    if (
        !Array.isArray(payments) ||
        payments.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="loading"
                >
                    No payment history found.
                </td>

            </tr>

        `;

        return;
    }


    payments.forEach(
        payment => {

            const row =
                document.createElement("tr");

            row.innerHTML = `

                <td>
                    ${formatDate(
                        payment.payment_date
                    )}
                </td>

                <td>
                    INV-${escapeHtml(
                        payment.invoice_id
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        payment.payment_method ||
                        "Bank Transfer"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        payment.amount
                    )}
                </td>

                <td>

                    <span class="status paid">
                        Completed
                    </span>

                </td>

            `;

            tbody.appendChild(row);
        }
    );
}


function updateProfile() {

    const vendorId =
        getVendorId();

    const element =
        document.getElementById(
            "vendorId"
        );

    if (element) {

        element.textContent =
            `Vendor ID: ${vendorId}`;
    }
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadHistory();


        const search =
            document.getElementById(
                "paymentSearch"
            );

        search.addEventListener(
            "input",
            function() {

                const value =
                    this.value
                        .toLowerCase()
                        .trim();

                document
                    .querySelectorAll(
                        "#historyBody tr"
                    )
                    .forEach(
                        row => {

                            row.style.display =
                                row.textContent
                                    .toLowerCase()
                                    .includes(value)
                                    ? ""
                                    : "none";
                        }
                    );
            }
        );

    }
);