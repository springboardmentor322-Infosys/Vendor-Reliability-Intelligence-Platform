loadRequests();

let allRequests = [];

/* ===========================
   LOAD REQUESTS
=========================== */

async function loadRequests() {

    try {

        allRequests = await apiRequest(
            "/procurement-requests"
        );

        renderRequests(allRequests);

    }

    catch (error) {

        console.error(error);

    }

}

/* ===========================
   RENDER TABLE
=========================== */

function renderRequests(requests) {

    const tableBody =
        document.getElementById(
            "requestTableBody"
        );

    tableBody.innerHTML = "";

    requests.forEach(request => {

        tableBody.innerHTML += `

        <tr>

            <td>${request.id}</td>

            <td>${request.request_number}</td>

            <td>${request.department}</td>

            <td>${request.requested_by}</td>

            <td>${request.item_name}</td>

            <td>${request.quantity}</td>

            <td>₹${request.estimated_cost}</td>

            <td>

                <span class="status ${request.status.toLowerCase().replace(" ", "-")}">

                    ${request.status}

                </span>

            </td>

            <td>

                <button
                    class="action-btn edit"
                    onclick="editRequest(${request.id})">

                    Edit

                </button>

                <button
                    class="action-btn delete"
                    onclick="deleteRequest(${request.id})">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

}

/* ===========================
   SEARCH
=========================== */

document
.getElementById("searchRequest")
.addEventListener(
    "keyup",
    filterRequests
);

document
.getElementById("statusFilter")
.addEventListener(
    "change",
    filterRequests
);

function filterRequests() {

    const search =
        document
        .getElementById("searchRequest")
        .value
        .toLowerCase();

    const status =
        document
        .getElementById("statusFilter")
        .value;

    const filtered = allRequests.filter(request => {

        const matchesSearch =

            request.request_number.toLowerCase().includes(search)

            ||

            request.item_name.toLowerCase().includes(search)

            ||

            request.department.toLowerCase().includes(search);

        const matchesStatus =

            status === ""

            ||

            request.status === status;

        return matchesSearch && matchesStatus;

    });

    renderRequests(filtered);

}

/* ===========================
   DELETE
=========================== */

async function deleteRequest(id) {

    if (!confirm("Delete this request?")) {

        return;

    }

    try {

        await apiRequest(

            `/procurement-requests/${id}`,

            "DELETE"

        );

        loadRequests();

    }

    catch (error) {

        console.error(error);

    }

}

/* ===========================
   EDIT
=========================== */

async function editRequest(id) {

    const request =
        allRequests.find(r => r.id === id);

    if (!request) {

        return;

    }

    const department =
        prompt(
            "Department",
            request.department
        );

    if (department === null) {

        return;

    }

    request.department = department;

    try {

        await apiRequest(

            `/procurement-requests/${id}`,

            "PUT",

            request

        );

        loadRequests();

    }

    catch (error) {

        console.error(error);

    }

}

/* ===========================
   ADD REQUEST
=========================== */

document
.getElementById("addRequestBtn")
.addEventListener(
    "click",
    addRequest
);

async function addRequest() {

    const request_number =
        prompt("Request Number");

    if (!request_number) {

        return;

    }

    const department =
        prompt("Department");

    const requested_by =
        prompt("Requested By");

    const item_name =
        prompt("Item Name");

    const quantity =
        prompt("Quantity");

    const estimated_cost =
        prompt("Estimated Cost");

    const request_date =
        prompt(
            "Request Date (YYYY-MM-DD)"
        );

    const status =
        prompt(
            "Status",
            "Pending"
        );

    try {

        await apiRequest(

            "/procurement-requests",

            "POST",

            {

                request_number,

                department,

                requested_by,

                item_name,

                quantity: Number(quantity),

                estimated_cost: Number(estimated_cost),

                request_date,

                status

            }

        );

        loadRequests();

    }

    catch (error) {

        console.error(error);

    }

}