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


function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "message"
        );

    element.textContent =
        message;

    element.className =
        `message ${type}`;
}


async function submitInvoice(
    event
) {

    event.preventDefault();


    const vendorId =
        getVendorId();


    if (!vendorId) {

        showMessage(
            "Vendor ID is missing. Please login again.",
            "error"
        );

        return;
    }


    const invoiceNumber =
        document.getElementById(
            "invoiceNumber"
        ).value.trim();


    const poIdValue =
        document.getElementById(
            "poId"
        ).value;


    const amount =
        Number(
            document.getElementById(
                "amount"
            ).value
        );


    const invoiceDate =
        document.getElementById(
            "invoiceDate"
        ).value;


    const dueDate =
        document.getElementById(
            "dueDate"
        ).value;


    if (!invoiceNumber) {

        showMessage(
            "Invoice number is required.",
            "error"
        );

        return;
    }


    if (!amount || amount <= 0) {

        showMessage(
            "Enter a valid invoice amount.",
            "error"
        );

        return;
    }


    if (!invoiceDate) {

        showMessage(
            "Invoice date is required.",
            "error"
        );

        return;
    }


    const payload = {

        invoice_number:
            invoiceNumber,

        po_id:
            poIdValue
                ? Number(poIdValue)
                : null,

        amount:
            amount,

        invoice_date:
            `${invoiceDate}T00:00:00`,

        due_date:
            dueDate
                ? `${dueDate}T00:00:00`
                : null
    };


    const token =
        getToken();


    try {

        const response =
            await fetch(
                `${API}/api/vendor/invoices` +
                `?vendor_id=${encodeURIComponent(vendorId)}`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...(token
                            ? {
                                Authorization:
                                    `Bearer ${token}`
                            }
                            : {})
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

            throw new Error(
                data.detail ||
                "Invoice upload failed."
            );
        }


        showMessage(
            "Invoice uploaded successfully.",
            "success"
        );


        document
            .getElementById(
                "invoiceForm"
            )
            .reset();


        setTimeout(
            function() {

                window.location.href =
                    "/VendorInvoices";

            },
            1200
        );

    }
    catch (error) {

        console.error(
            error
        );

        showMessage(
            error.message,
            "error"
        );
    }
}


function logout() {

    localStorage.clear();

    window.location.href =
        "/login";
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        document
            .getElementById(
                "invoiceForm"
            )
            .addEventListener(
                "submit",
                submitInvoice
            );

    }
);