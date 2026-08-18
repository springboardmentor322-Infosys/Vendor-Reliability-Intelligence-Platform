const API_BASE_URL = "http://127.0.0.1:8000";


// ==================================================
// LOAD COMMUNICATIONS
// ==================================================

async function loadCommunications() {

    try {

        console.log("Loading communications...");

        const response = await fetch(
            `${API_BASE_URL}/communications`
        );

        console.log(
            "Communication Status:",
            response.status
        );

        const data = await response.json();

        console.log(
            "Communication Data:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error || `API Error: ${response.status}`
            );

        }


        if (!Array.isArray(data)) {

            throw new Error(
                "Communication API did not return an array."
            );

        }


        const tableBody =
            document.getElementById(
                "communicationBody"
            );


        tableBody.innerHTML = "";


        if (data.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        No communications available.
                    </td>
                </tr>
            `;

            return;
        }


        data.forEach(communication => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${communication.id}
                </td>

                <td>
                    ${communication.vendor_name ?? "N/A"}
                </td>

                <td>
                    ${communication.purchase_order_id ?? "N/A"}
                </td>

                <td>
                    ${communication.contract_id ?? "N/A"}
                </td>

                <td>
                    ${communication.message ?? ""}
                </td>

                <td>
                    ${communication.created_at ?? "N/A"}
                </td>

                <td>

                    <button
                        onclick="deleteCommunication(${communication.id})"
                    >
                        Delete
                    </button>

                </td>

            `;


            tableBody.appendChild(row);

        });


        console.log(
            "Communications loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "Communication Load Error:",
            error
        );


        const tableBody =
            document.getElementById(
                "communicationBody"
            );


        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="7">

                        Failed to load communications.

                        <br>

                        ${error.message}

                    </td>

                </tr>

            `;

        }

    }

}



// ==================================================
// SEND MESSAGE
// ==================================================

async function sendCommunication(event) {

    event.preventDefault();


    try {

        const formData =
            new FormData();


        formData.append(
            "user_id",
            document.getElementById(
                "userId"
            ).value
        );


        const vendorId =
            document.getElementById(
                "vendorId"
            ).value;


        const purchaseOrderId =
            document.getElementById(
                "purchaseOrderId"
            ).value;


        const contractId =
            document.getElementById(
                "contractId"
            ).value;


        const message =
            document.getElementById(
                "message"
            ).value;


        formData.append(
            "vendor_id",
            vendorId || ""
        );


        formData.append(
            "purchase_order_id",
            purchaseOrderId || ""
        );


        formData.append(
            "contract_id",
            contractId || ""
        );


        formData.append(
            "message",
            message
        );


        const response =
            await fetch(
                `${API_BASE_URL}/communications`,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        console.log(
            "Send Message Response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        if (data.error) {

            throw new Error(
                data.error
            );

        }


        document.getElementById(
            "messageResult"
        ).textContent =
            "Message sent successfully.";


        document.getElementById(
            "communicationForm"
        ).reset();


        // Reload table

        loadCommunications();

    }

    catch (error) {

        console.error(
            "Send Communication Error:",
            error
        );


        document.getElementById(
            "messageResult"
        ).textContent =
            "Failed to send message: " +
            error.message;

    }

}



// ==================================================
// DELETE COMMUNICATION
// ==================================================

async function deleteCommunication(id) {

    if (
        !confirm(
            "Are you sure you want to delete this message?"
        )
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/communications/${id}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        console.log(
            "Delete Response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                `API Error: ${response.status}`
            );

        }


        loadCommunications();

    }

    catch (error) {

        console.error(
            "Delete Communication Error:",
            error
        );

        alert(
            "Failed to delete communication: " +
            error.message
        );

    }

}



// ==================================================
// PAGE LOAD
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Communication page loaded."
        );


        loadCommunications();


        document
            .getElementById(
                "communicationForm"
            )
            .addEventListener(
                "submit",
                sendCommunication
            );

    }
);