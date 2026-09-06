let editingId = null;

const modal = document.getElementById("communicationModal");

const tbody = document.getElementById("communicationTableBody");

const vendorSelect = document.getElementById("vendorSelect");

document
    .getElementById("addCommunicationBtn")
    .onclick = openAddModal;

document
    .getElementById("cancelCommunication")
    .onclick = closeModal;

document
    .getElementById("communicationForm")
    .addEventListener("submit", saveCommunication);

document
    .getElementById("searchCommunication")
    .addEventListener("input", loadCommunications);

document
    .getElementById("typeFilter")
    .addEventListener("change", loadCommunications);

initialize();

async function initialize() {

    await loadVendorDropdown();

    await loadCommunications();

}

async function loadVendorDropdown() {

    const vendors = await getVendors();

    vendorSelect.innerHTML = "";

    vendors.forEach(vendor => {

        vendorSelect.innerHTML += `
            <option value="${vendor.id}">
                ${vendor.vendor_name}
            </option>
        `;

    });

}

async function loadCommunications() {

    const communications = await getCommunicationHistory();

    const vendors = await getVendors();

    const keyword = document
        .getElementById("searchCommunication")
        .value
        .toLowerCase();

    const type = document
        .getElementById("typeFilter")
        .value;

    tbody.innerHTML = "";

    communications

        .filter(item => {

            const vendor = vendors.find(
                v => v.id === item.vendor_id
            );

            const matchSearch =

                item.subject
                    .toLowerCase()
                    .includes(keyword)

                ||

                item.sender
                    .toLowerCase()
                    .includes(keyword)

                ||

                item.receiver
                    .toLowerCase()
                    .includes(keyword)

                ||

                vendor?.vendor_name
                    .toLowerCase()
                    .includes(keyword);

            const matchType =

                type === ""

                ||

                item.communication_type === type;

            return matchSearch && matchType;

        })

        .forEach(item => {

            const vendor = vendors.find(
                v => v.id === item.vendor_id
            );

            tbody.innerHTML += `

            <tr>

                <td>

                    ${vendor ? vendor.vendor_name : "-"}

                </td>

                <td>

                    ${item.subject}

                </td>

                <td>

                    <span class="status ${item.communication_type.toLowerCase()}">

                        ${item.communication_type}

                    </span>

                </td>

                <td>

                    ${item.sender}

                </td>

                <td>

                    ${item.receiver}

                </td>

                <td>

                    ${new Date(item.communication_date)
                        .toLocaleString()}

                </td>

                <td>

                    <button
                        class="action-btn edit-btn"
                        onclick="editCommunication(${item.id})">

                        Edit

                    </button>

                    <button
                        class="action-btn delete-btn"
                        onclick="deleteCommunicationHandler(${item.id})">

                        Delete

                    </button>

                </td>

            </tr>

            `;

        });

}

function openAddModal() {

    editingId = null;

    document
        .getElementById("modalTitle")
        .innerHTML = "Add Communication";

    document
        .getElementById("communicationForm")
        .reset();

    modal.classList.add("show");

}

function closeModal() {

    modal.classList.remove("show");

}

async function saveCommunication(e) {

    e.preventDefault();

    const data = {

        vendor_id: Number(
            vendorSelect.value
        ),

        subject: document
            .getElementById("subject")
            .value,

        communication_type: document
            .getElementById("communicationType")
            .value,

        sender: document
            .getElementById("sender")
            .value,

        receiver: document
            .getElementById("receiver")
            .value,

        message: document
            .getElementById("message")
            .value

    };

    try {

        if (editingId) {

            await updateCommunication(
                editingId,
                data
            );

            showToast(
                "Communication Updated",
                "success"
            );

        }

        else {

            await createCommunication(
                data
            );

            showToast(
                "Communication Added",
                "success"
            );

        }

        closeModal();

        loadCommunications();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Operation Failed",
            "error"
        );

    }

}

async function editCommunication(id) {

    const item = await getCommunication(id);

    editingId = id;

    document
        .getElementById("modalTitle")
        .innerHTML = "Edit Communication";

    vendorSelect.value = item.vendor_id;

    document
        .getElementById("subject")
        .value = item.subject;

    document
        .getElementById("communicationType")
        .value = item.communication_type;

    document
        .getElementById("sender")
        .value = item.sender;

    document
        .getElementById("receiver")
        .value = item.receiver;

    document
        .getElementById("message")
        .value = item.message;

    modal.classList.add("show");

}

async function deleteCommunicationHandler(id) {

    showConfirm(

        "Delete Communication",

        "Do you really want to delete this communication?",

        async () => {

            try {

                await deleteCommunication(id);

                showToast(
                    "Communication Deleted",
                    "success"
                );

                loadCommunications();

            }

            catch (error) {

                console.error(error);

                showToast(
                    "Delete Failed",
                    "error"
                );

            }

        }

    );

}