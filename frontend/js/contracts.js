let editingContractId = null;

let currentContractPage = 1;

const contractPageSize = 50;

let contractTotalPages = 1;

let contractTotalRecords = 0;


const modal = document.getElementById(
    "contractModal"
);

const form = document.getElementById(
    "contractForm"
);

const vendorSelect = document.getElementById(
    "contractVendor"
);


/*
==================================================
INITIALIZATION
==================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadContracts(
            currentContractPage
        );

    }
);


/*
==================================================
ADD CONTRACT
==================================================
*/

document.getElementById(
    "addContractBtn"
).onclick = async () => {

    editingContractId = null;

    form.reset();

    document.getElementById(
        "contractModalTitle"
    ).textContent = "Add Contract";

    await loadVendorDropdown();

    modal.classList.add("show");
};


/*
==================================================
CLOSE MODAL
==================================================
*/

document.getElementById(
    "closeContractModal"
).onclick = () => {

    modal.classList.remove("show");

};


document.getElementById(
    "cancelContract"
).onclick = () => {

    modal.classList.remove("show");

};


/*
==================================================
VENDOR DROPDOWN
==================================================
*/

async function loadVendorDropdown() {

    try {

        const vendors = await getVendors();

        vendorSelect.innerHTML = `
            <option value="">
                Select Vendor
            </option>
        `;

        vendors.forEach(
            (vendor) => {

                vendorSelect.innerHTML += `
                    <option value="${vendor.id}">
                        ${vendor.vendor_name}
                    </option>
                `;

            }
        );

    } catch (error) {

        console.error(
            "Failed to load vendors:",
            error
        );

        showToast(
            "Failed to load vendors",
            "error"
        );

    }

}


/*
==================================================
LOAD CONTRACTS
==================================================
*/

async function loadContracts(
    page = 1
) {

    try {

        const response =
            await getContracts(
                page,
                contractPageSize
            );


        const contracts =
            response.items || [];


        currentContractPage =
            response.page || page;


        contractTotalPages =
            response.total_pages || 1;


        contractTotalRecords =
            response.total || 0;


        const tbody =
            document.getElementById(
                "contractTableBody"
            );


        tbody.innerHTML = "";


        if (!contracts.length) {

            tbody.innerHTML = `
                <tr>

                    <td
                        colspan="7"
                        style="text-align:center;"
                    >
                        No Contracts Found
                    </td>

                </tr>
            `;

            renderContractPagination();

            return;
        }


        contracts.forEach(
            (contract) => {

                tbody.innerHTML += `

                    <tr>

                        <td>
                            ${escapeHtml(
                                contract.contract_number
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                contract.vendor_name
                                ?? contract.vendor_id
                                ?? "-"
                            )}
                        </td>


                        <td>
                            ${contract.start_date ?? "-"}
                        </td>


                        <td>
                            ${contract.end_date ?? "-"}
                        </td>


                        <td>
                            ₹ ${Number(
                                contract.contract_value || 0
                            ).toLocaleString(
                                "en-IN",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}
                        </td>


                        <td>

                            <span
                                class="
                                    contract-status
                                    status-${String(
                                        contract.contract_status
                                    )
                                        .toLowerCase()
                                        .replace(
                                            /\s+/g,
                                            "-"
                                        )}
                                "
                            >
                                ${escapeHtml(
                                    contract.contract_status
                                    ?? "-"
                                )}
                            </span>

                        </td>


                        <td>

                            <button
                                class="edit-btn"
                                onclick="
                                    editContract(
                                        ${contract.id}
                                    )
                                "
                            >
                                Edit
                            </button>


                            <button
                                class="delete-btn"
                                onclick="
                                    removeContract(
                                        ${contract.id}
                                    )
                                "
                            >
                                Delete
                            </button>

                        </td>

                    </tr>

                `;

            }
        );


        renderContractPagination();

    } catch (error) {

        console.error(
            "Failed to load contracts:",
            error
        );

        const tbody =
            document.getElementById(
                "contractTableBody"
            );


        tbody.innerHTML = `
            <tr>

                <td
                    colspan="7"
                    style="text-align:center;"
                >
                    Failed to load contracts
                </td>

            </tr>
        `;

    }

}


/*
==================================================
PAGINATION
==================================================
*/

function renderContractPagination() {

    const paginationInfo =
        document.getElementById(
            "contractPaginationInfo"
        );


    const pagination =
        document.getElementById(
            "contractPagination"
        );


    if (!pagination) {

        return;

    }


    const start =
        contractTotalRecords === 0
            ? 0
            : (
                (
                    currentContractPage - 1
                )
                * contractPageSize
            ) + 1;


    const end =
        Math.min(
            currentContractPage
            * contractPageSize,

            contractTotalRecords
        );


    if (paginationInfo) {

        paginationInfo.textContent =
            `Showing ${start.toLocaleString(
                "en-IN"
            )} to ${end.toLocaleString(
                "en-IN"
            )} of ${contractTotalRecords.toLocaleString(
                "en-IN"
            )} contracts`;

    }


    pagination.innerHTML = "";


    /*
    Previous
    */

    const previousButton =
        document.createElement(
            "button"
        );


    previousButton.textContent =
        "Previous";


    previousButton.disabled =
        currentContractPage <= 1;


    previousButton.onclick = () => {

        if (
            currentContractPage > 1
        ) {

            loadContracts(
                currentContractPage - 1
            );

        }

    };


    pagination.appendChild(
        previousButton
    );


    /*
    Page Numbers
    */

    const pages =
        getContractVisiblePages();


    pages.forEach(
        (page) => {

            if (page === "...") {

                const span =
                    document.createElement(
                        "span"
                    );

                span.textContent =
                    "...";

                span.className =
                    "pagination-ellipsis";

                pagination.appendChild(
                    span
                );

                return;
            }


            const button =
                document.createElement(
                    "button"
                );


            button.textContent =
                page;


            button.className =
                "pagination-number";


            if (
                page === currentContractPage
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.onclick = () => {

                loadContracts(
                    page
                );

            };


            pagination.appendChild(
                button
            );

        }
    );


    /*
    Next
    */

    const nextButton =
        document.createElement(
            "button"
        );


    nextButton.textContent =
        "Next";


    nextButton.disabled =
        currentContractPage
        >= contractTotalPages;


    nextButton.onclick = () => {

        if (
            currentContractPage
            < contractTotalPages
        ) {

            loadContracts(
                currentContractPage + 1
            );

        }

    };


    pagination.appendChild(
        nextButton
    );

}


/*
==================================================
VISIBLE PAGE NUMBERS
==================================================
*/

function getContractVisiblePages() {

    const pages = [];

    const total =
        contractTotalPages;

    const current =
        currentContractPage;


    if (total <= 7) {

        for (
            let i = 1;
            i <= total;
            i++
        ) {

            pages.push(i);

        }

        return pages;

    }


    pages.push(1);


    if (current > 4) {

        pages.push("...");

    }


    const start =
        Math.max(
            2,
            current - 1
        );


    const end =
        Math.min(
            total - 1,
            current + 1
        );


    for (
        let i = start;
        i <= end;
        i++
    ) {

        pages.push(i);

    }


    if (
        current < total - 3
    ) {

        pages.push("...");

    }


    pages.push(total);


    return pages;

}


/*
==================================================
CREATE / UPDATE CONTRACT
==================================================
*/

form.onsubmit = async (
    e
) => {

    e.preventDefault();


    const contract = {

        contract_number:
            document.getElementById(
                "contractNumber"
            ).value.trim(),


        vendor_id:
            Number(
                vendorSelect.value
            ),


        start_date:
            document.getElementById(
                "contractStartDate"
            ).value,


        end_date:
            document.getElementById(
                "contractEndDate"
            ).value,


        contract_value:
            Number(
                document.getElementById(
                    "contractValue"
                ).value
            ),


        contract_status:
            document.getElementById(
                "contractStatus"
            ).value,


        terms:
            document.getElementById(
                "contractTerms"
            ).value.trim()

    };


    /*
    Basic validation
    */

    if (!contract.contract_number) {

        showToast(
            "Contract number is required",
            "error"
        );

        return;

    }


    if (!contract.vendor_id) {

        showToast(
            "Please select a vendor",
            "error"
        );

        return;

    }


    if (
        !contract.start_date
        ||
        !contract.end_date
    ) {

        showToast(
            "Start and end dates are required",
            "error"
        );

        return;

    }


    if (
        contract.end_date
        <
        contract.start_date
    ) {

        showToast(
            "End date cannot be before start date",
            "error"
        );

        return;

    }


    if (
        contract.contract_value < 0
    ) {

        showToast(
            "Contract value cannot be negative",
            "error"
        );

        return;

    }


    try {

        if (
            editingContractId
        ) {

            await updateContract(
                editingContractId,
                contract
            );


            showToast(
                "Contract Updated",
                "success"
            );

        } else {

            await createContract(
                contract
            );


            showToast(
                "Contract Added",
                "success"
            );

        }


        modal.classList.remove(
            "show"
        );


        await loadContracts(
            currentContractPage
        );


    } catch (error) {

        console.error(
            "Contract operation failed:",
            error
        );


        showToast(
            "Operation Failed",
            "error"
        );

    }

};


/*
==================================================
EDIT CONTRACT
==================================================
*/

async function editContract(
    id
) {

    try {

        const contract =
            await apiRequest(
                `/contracts/${id}`
            );


        if (!contract) {

            return;

        }


        editingContractId = id;


        document.getElementById(
            "contractModalTitle"
        ).textContent =
            "Edit Contract";


        await loadVendorDropdown();


        document.getElementById(
            "contractNumber"
        ).value =
            contract.contract_number
            ?? "";


        vendorSelect.value =
            contract.vendor_id
            ?? "";


        document.getElementById(
            "contractStartDate"
        ).value =
            contract.start_date
            ?? "";


        document.getElementById(
            "contractEndDate"
        ).value =
            contract.end_date
            ?? "";


        document.getElementById(
            "contractValue"
        ).value =
            contract.contract_value
            ?? "";


        document.getElementById(
            "contractStatus"
        ).value =
            contract.contract_status
            ?? "Active";


        document.getElementById(
            "contractTerms"
        ).value =
            contract.terms
            ?? "";


        modal.classList.add(
            "show"
        );


    } catch (error) {

        console.error(
            "Failed to load contract:",
            error
        );


        showToast(
            "Failed to load Contract",
            "error"
        );

    }

}


/*
==================================================
DELETE CONTRACT
==================================================
*/

async function removeContract(
    id
) {

    showConfirm(

        "Delete Contract?",

        async () => {

            try {

                await deleteContract(
                    id
                );


                showToast(
                    "Contract Deleted",
                    "success"
                );


                /*
                If the current page becomes
                empty after deletion, move
                to the previous page.
                */

                if (
                    currentContractPage
                    > 1
                    &&
                    contractTotalRecords
                    - 1
                    <= (
                        (
                            currentContractPage
                            - 1
                        )
                        * contractPageSize
                    )
                ) {

                    currentContractPage--;

                }


                await loadContracts(
                    currentContractPage
                );


            } catch (error) {

                console.error(
                    "Delete failed:",
                    error
                );


                showToast(
                    "Delete Failed",
                    "error"
                );

            }

        }

    );

}


/*
==================================================
ESCAPE HTML
==================================================
*/

function escapeHtml(
    value
) {

    if (
        value === null
        ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}