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


async function apiFetch(
    url,
    options = {}
) {

    const token =
        getToken();

    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})
    };


    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    let data;


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        data =
            await response.json();

    }
    else {

        data =
            await response.text();
    }


    if (!response.ok) {

        throw new Error(
            typeof data === "object"
                ? (
                    data.detail ||
                    "API request failed."
                )
                : data
        );
    }


    return data;
}


async function loadPaymentMethods() {

    const vendorId =
        getVendorId();


    if (!vendorId) {

        alert(
            "Vendor ID is missing. Please login again."
        );

        return;
    }


    try {

        const methods =
            await apiFetch(
                `${API}/api/vendor/payments/methods` +
                `?vendor_id=${encodeURIComponent(vendorId)}`
            );


        renderPaymentMethods(
            methods
        );

    }
    catch (error) {

        console.error(
            error
        );


        document.getElementById(
            "methodsContainer"
        ).innerHTML = `

            <div
                style="
                    color:#dc2626;
                    padding:20px;
                "
            >

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;
    }
}


function renderPaymentMethods(
    methods
) {

    const container =
        document.getElementById(
            "methodsContainer"
        );


    container.innerHTML = "";


    if (
        !Array.isArray(methods) ||
        methods.length === 0
    ) {

        container.innerHTML = `

            <div
                class="loading-box"
                style="grid-column:1/-1;"
            >

                No payment methods found.

                <br><br>

                Add your first payment method.

            </div>

        `;

        return;
    }


    methods.forEach(
        method => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "method-card";


            const maskedAccount =
                maskAccount(
                    method.account_number
                );


            card.innerHTML = `

                <div class="method-header">

                    <div class="method-icon">

                        <i class="fa-solid fa-building-columns"></i>

                    </div>

                    ${
                        method.is_default
                            ? `
                                <span class="default-badge">
                                    DEFAULT
                                </span>
                              `
                            : ""
                    }

                </div>


                <h3>
                    ${escapeHtml(
                        method.method_type
                    )}
                </h3>


                <p>
                    Account:
                    ${escapeHtml(
                        maskedAccount
                    )}
                </p>


                <p>
                    Account Name:
                    ${escapeHtml(
                        method.account_name
                    )}
                </p>


                <p>
                    Bank:
                    ${escapeHtml(
                        method.bank_name ||
                        "-"
                    )}
                </p>


                <p>
                    IFSC:
                    ${escapeHtml(
                        method.ifsc_code ||
                        "-"
                    )}
                </p>


                <div class="method-actions">

                    ${
                        !method.is_default
                            ? `
                                <button
                                    class="default-btn"
                                    onclick="setDefaultMethod(${method.id})"
                                >
                                    Set Default
                                </button>
                              `
                            : ""
                    }


                    <button
                        class="danger-btn"
                        onclick="deletePaymentMethod(${method.id})"
                    >
                        Delete
                    </button>

                </div>

            `;


            container.appendChild(
                card
            );
        }
    );
}


function maskAccount(
    account
) {

    const value =
        String(account || "");

    if (
        value.length <= 4
    ) {

        return value;
    }

    return (
        "•••• " +
        value.slice(-4)
    );
}


function openPaymentModal() {

    document
        .getElementById(
            "paymentModal"
        )
        .classList.add(
            "show"
        );
}


function closePaymentModal() {

    document
        .getElementById(
            "paymentModal"
        )
        .classList.remove(
            "show"
        );

    document
        .getElementById(
            "paymentMethodForm"
        )
        .reset();
}


async function savePaymentMethod(
    event
) {

    event.preventDefault();


    const vendorId =
        getVendorId();


    if (!vendorId) {

        alert(
            "Vendor ID is missing."
        );

        return;
    }


    const payload = {

        method_type:
            document.getElementById(
                "methodType"
            ).value,

        account_name:
            document.getElementById(
                "accountName"
            ).value.trim(),

        account_number:
            document.getElementById(
                "accountNumber"
            ).value.trim(),

        bank_name:
            document.getElementById(
                "bankName"
            ).value.trim() || null,

        branch_name:
            document.getElementById(
                "branchName"
            ).value.trim() || null,

        ifsc_code:
            document.getElementById(
                "ifscCode"
            ).value.trim() || null,

        is_default:
            document.getElementById(
                "isDefault"
            ).checked
    };


    try {

        await apiFetch(

            `${API}/api/vendor/payments/methods` +
            `?vendor_id=${encodeURIComponent(vendorId)}`,

            {

                method:
                    "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


        alert(
            "Payment method saved successfully."
        );


        closePaymentModal();

        await loadPaymentMethods();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message
        );
    }
}


async function deletePaymentMethod(
    methodId
) {

    const vendorId =
        getVendorId();


    if (!confirm(
        "Delete this payment method?"
    )) {

        return;
    }


    try {

        await apiFetch(

            `${API}/api/vendor/payments/methods/` +
            `${methodId}` +
            `?vendor_id=${encodeURIComponent(vendorId)}`,

            {
                method:
                    "DELETE"
            }
        );


        await loadPaymentMethods();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message
        );
    }
}


async function setDefaultMethod(
    methodId
) {

    const vendorId =
        getVendorId();


    try {

        await apiFetch(

            `${API}/api/vendor/payments/methods/` +
            `${methodId}/default` +
            `?vendor_id=${encodeURIComponent(vendorId)}`,

            {

                method:
                    "PATCH"
            }
        );


        await loadPaymentMethods();

    }
    catch (error) {

        console.error(
            error
        );

        alert(
            error.message
        );
    }
}


function logout() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "jwt_token"
    );

    localStorage.removeItem(
        "accessToken"
    );

    localStorage.removeItem(
        "vendor_id"
    );

    localStorage.removeItem(
        "vendorId"
    );

    window.location.href =
        "/login";
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadPaymentMethods();


        document
            .getElementById(
                "paymentMethodForm"
            )
            .addEventListener(
                "submit",
                savePaymentMethod
            );

    }
);


window.openPaymentModal =
    openPaymentModal;

window.closePaymentModal =
    closePaymentModal;

window.deletePaymentMethod =
    deletePaymentMethod;

window.setDefaultMethod =
    setDefaultMethod;

window.logout =
    logout;