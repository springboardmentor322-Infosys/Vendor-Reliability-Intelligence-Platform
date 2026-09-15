const API_BASE = "http://127.0.0.1:8000";

/* --------------------------------------------------
   Helper: GET JSON
-------------------------------------------------- */
async function getJSON(url) {

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token");

    const headers = {
        "Accept": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: headers
    });

    if (!response.ok) {

        let message = "Request failed";

        try {

            const errorData = await response.json();

            message =
                errorData.detail ||
                errorData.message ||
                JSON.stringify(errorData);

        } catch {

            message = await response.text();
        }

        throw new Error(message);
    }

    return await response.json();
}


/* --------------------------------------------------
   Helper: Set text safely
-------------------------------------------------- */
function setText(elementId, value) {

    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = value ?? "";
    }
}


/* --------------------------------------------------
   Submit Finance Request
-------------------------------------------------- */
async function submitFinanceRequest(event) {

    event.preventDefault();

    const form = document.getElementById("financeRequestForm");

    if (!form) {
        console.error("financeRequestForm not found.");
        alert("Finance request form was not found.");
        return;
    }

    const requestType =
        document.getElementById("requestType")?.value.trim();

    const department =
        document.getElementById("department")?.value.trim();

    const amountValue =
        document.getElementById("amount")?.value;

    const requiredDate =
        document.getElementById("requiredDate")?.value;

    const title =
        document.getElementById("requestTitle")?.value.trim();

    const description =
        document.getElementById("description")?.value.trim();


    /* --------------------------------------------------
       Basic validation
    -------------------------------------------------- */

    if (!requestType) {
        alert("Please select a request type.");
        return;
    }

    if (!department) {
        alert("Please select a department.");
        return;
    }

    if (!amountValue || Number(amountValue) <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    if (!requiredDate) {
        alert("Please select the required date.");
        return;
    }

    if (!title) {
        alert("Please enter the request title.");
        return;
    }


    const data = {
        request_type: requestType,
        department: department,
        amount: Number(amountValue),
        required_date: requiredDate,
        title: title,
        description: description || ""
    };


    console.log(
        "Submitting finance request:",
        data
    );


    try {

        const response = await fetch(
            `${API_BASE}/api/finance/approval-requests`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                credentials: "include",

                body: JSON.stringify(data)
            }
        );


        if (!response.ok) {

            let errorMessage = "Unable to submit request.";

            try {

                const errorData =
                    await response.json();

                console.error(
                    "Backend error:",
                    errorData
                );

                if (Array.isArray(errorData.detail)) {

                    errorMessage =
                        errorData.detail
                            .map(error =>
                                error.msg || JSON.stringify(error)
                            )
                            .join("\n");

                } else {

                    errorMessage =
                        errorData.detail ||
                        errorData.message ||
                        errorMessage;
                }

            } catch {

                errorMessage =
                    await response.text();
            }

            throw new Error(errorMessage);
        }


        const result =
            await response.json();


        console.log(
            "Finance request created:",
            result
        );


        const requestId =
            result.id ??
            result.request_id ??
            result.approval_request_id ??
            "N/A";


        alert(
            `Request submitted successfully.\n\nRequest ID: ${requestId}`
        );


        window.location.href =
            "/FinanceApprovalRequests";


    } catch (error) {

        console.error(
            "Finance request submission error:",
            error
        );

        alert(
            `Unable to submit finance request.\n\n${error.message}`
        );
    }
}


/* --------------------------------------------------
   Save Draft
-------------------------------------------------- */
async function saveDraft() {

    const requestType =
        document.getElementById("requestType")?.value.trim();

    const department =
        document.getElementById("department")?.value.trim();

    const amountValue =
        document.getElementById("amount")?.value;

    const requiredDate =
        document.getElementById("requiredDate")?.value;

    const title =
        document.getElementById("requestTitle")?.value.trim();

    const description =
        document.getElementById("description")?.value.trim();


    const data = {
        request_type: requestType || "",
        department: department || "",
        amount: amountValue
            ? Number(amountValue)
            : 0,
        required_date: requiredDate || null,
        title: title || "",
        description: description || "",
        status: "Draft"
    };


    console.log(
        "Saving draft:",
        data
    );


    try {

        const response = await fetch(
            `${API_BASE}/api/finance/approval-requests/draft`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                credentials: "include",

                body: JSON.stringify(data)
            }
        );


        if (!response.ok) {

            let errorMessage =
                "Unable to save draft.";

            try {

                const errorData =
                    await response.json();

                console.error(
                    "Draft backend error:",
                    errorData
                );

                errorMessage =
                    errorData.detail ||
                    errorData.message ||
                    errorMessage;

            } catch {

                errorMessage =
                    await response.text();
            }

            throw new Error(errorMessage);
        }


        const result =
            await response.json();


        console.log(
            "Draft saved:",
            result
        );


        alert(
            "Request saved as draft successfully."
        );


    } catch (error) {

        console.error(
            "Save draft error:",
            error
        );

        alert(
            `Unable to save draft.\n\n${error.message}`
        );
    }
}


/* --------------------------------------------------
   Load Current User
-------------------------------------------------- */
async function loadCurrentUser() {

    try {

        const user =
            await getJSON(
                `${API_BASE}/api/auth/me`
            );


        console.log(
            "Current user:",
            user
        );


        const name =
            user.name ||
            user.full_name ||
            user.username ||
            "User";


        setText(
            "sidebarName",
            name
        );

        setText(
            "headerName",
            name
        );


        if (user.role) {

            setText(
                "sidebarRole",
                user.role
            );

            setText(
                "headerRole",
                user.role
            );
        }


    } catch (error) {

        console.warn(
            "Unable to load current user:",
            error.message
        );
    }
}


/* --------------------------------------------------
   Initialize page
-------------------------------------------------- */
document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Finance Request page initialized."
        );


        const form =
            document.getElementById(
                "financeRequestForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                submitFinanceRequest
            );

        } else {

            console.error(
                "financeRequestForm element not found."
            );
        }


        loadCurrentUser();
    }
);