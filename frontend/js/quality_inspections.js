let editingQualityInspectionId = null;

let currentQualityInspectionPage = 1;

const qualityInspectionPageSize = 50;

let qualityInspectionTotalPages = 1;

let qualityInspectionTotalRecords = 0;


const modal =
    document.getElementById(
        "qualityInspectionModal"
    );


const form =
    document.getElementById(
        "qualityInspectionForm"
    );


const purchaseOrderSelect =
    document.getElementById(
        "qualityPurchaseOrderSelect"
    );


const vendorSelect =
    document.getElementById(
        "qualityVendorSelect"
    );



/* =========================================================
   ADD INSPECTION
========================================================= */

document
    .getElementById(
        "addQualityInspectionBtn"
    )
    .onclick = async () => {

        editingQualityInspectionId = null;

        form.reset();

        document.getElementById(
            "qualityInspectionModalTitle"
        ).textContent =
            "Add Quality Inspection";


        await loadPurchaseOrderDropdown();

        await loadVendorDropdown();


        modal.classList.add("show");
    };



/* =========================================================
   CLOSE MODAL
========================================================= */

document
    .getElementById(
        "closeQualityInspectionModal"
    )
    .onclick = () => {

        modal.classList.remove("show");

    };


document
    .getElementById(
        "cancelQualityInspection"
    )
    .onclick = () => {

        modal.classList.remove("show");

    };



/* =========================================================
   PURCHASE ORDER DROPDOWN
========================================================= */

async function loadPurchaseOrderDropdown() {

    try {

        /*
         * We only need purchase orders for the dropdown.
         *
         * The API pagination limit is 100.
         * Do NOT request 180,520 records here.
         */

        const response =
            await getPurchaseOrders(
                1,
                100
            );


        const orders =
            response.items || [];


        purchaseOrderSelect.innerHTML =
            `
            <option value="">
                Select Purchase Order
            </option>
            `;


        orders.forEach(
            (order) => {

                purchaseOrderSelect.innerHTML +=
                    `
                    <option value="${order.id}">
                        ${order.po_number}
                    </option>
                    `;

            }
        );

    }

    catch (error) {

        console.error(
            "Failed to load purchase orders:",
            error
        );

        showToast(
            "Failed to load Purchase Orders",
            "error"
        );

    }

}



/* =========================================================
   VENDOR DROPDOWN
========================================================= */

async function loadVendorDropdown() {

    try {

        const vendors =
            await getVendors();


        vendorSelect.innerHTML =
            `
            <option value="">
                Select Vendor
            </option>
            `;


        vendors.forEach(
            (vendor) => {

                vendorSelect.innerHTML +=
                    `
                    <option value="${vendor.id}">
                        ${vendor.vendor_name}
                    </option>
                    `;

            }
        );

    }

    catch (error) {

        console.error(
            "Failed to load vendors:",
            error
        );

        showToast(
            "Failed to load Vendors",
            "error"
        );

    }

}



/* =========================================================
   LOAD QUALITY INSPECTIONS
========================================================= */

async function loadQualityInspections(
    page = 1
) {

    try {

        const response =
            await getQualityInspections(
                page,
                qualityInspectionPageSize
            );


        const inspections =
            response.items || [];


        currentQualityInspectionPage =
            response.page || page;


        qualityInspectionTotalPages =
            response.total_pages || 1;


        qualityInspectionTotalRecords =
            response.total || 0;


        const tbody =
            document.getElementById(
                "qualityInspectionTableBody"
            );


        tbody.innerHTML = "";


        if (!inspections.length) {

            tbody.innerHTML =
                `
                <tr>

                    <td
                        colspan="9"
                        style="text-align:center;"
                    >

                        No Quality Inspections Found

                    </td>

                </tr>
                `;


            renderQualityInspectionPagination();

            return;
        }



        inspections.forEach(
            (inspection) => {

                tbody.innerHTML +=
                    `
                    <tr>

                        <td>
                            ${inspection.id}
                        </td>


                        <td>
                            ${inspection.purchase_order_number}
                        </td>


                        <td>
                            ${inspection.vendor_name}
                        </td>


                        <td>
                            ${inspection.inspection_date}
                        </td>


                        <td>
                            ${inspection.inspector}
                        </td>


                        <td>
                            ${Number(
                                inspection.quality_score || 0
                            ).toFixed(2)}
                        </td>


                        <td>
                            ${inspection.defects_found ?? 0}
                        </td>


                        <td>

                            <span
                                class="status-badge status-${String(
                                    inspection.status
                                ).toLowerCase()}"
                            >

                                ${inspection.status}

                            </span>

                        </td>


                        <td>

                            <button
                                class="edit-btn"
                                onclick="editQualityInspection(
                                    ${inspection.id}
                                )"
                            >
                                Edit
                            </button>


                            <button
                                class="delete-btn"
                                onclick="removeQualityInspection(
                                    ${inspection.id}
                                )"
                            >
                                Delete
                            </button>

                        </td>

                    </tr>
                    `;

            }
        );


        renderQualityInspectionPagination();

    }

    catch (error) {

        console.error(
            "Failed to load quality inspections:",
            error
        );

        const tbody =
            document.getElementById(
                "qualityInspectionTableBody"
            );


        tbody.innerHTML =
            `
            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >

                    Failed to load quality inspections

                </td>

            </tr>
            `;


        showToast(
            "Failed to load Quality Inspections",
            "error"
        );

    }

}



/* =========================================================
   PAGINATION
========================================================= */

function renderQualityInspectionPagination() {

    const info =
        document.getElementById(
            "qualityInspectionPaginationInfo"
        );


    const pagination =
        document.getElementById(
            "qualityInspectionPagination"
        );


    if (!pagination) {

        return;

    }


    const start =
        qualityInspectionTotalRecords === 0
            ? 0
            : (
                (
                    currentQualityInspectionPage - 1
                )
                * qualityInspectionPageSize
            ) + 1;


    const end =
        Math.min(
            currentQualityInspectionPage
            * qualityInspectionPageSize,

            qualityInspectionTotalRecords
        );


    if (info) {

        info.textContent =
            `Showing ${start.toLocaleString("en-IN")} ` +
            `to ${end.toLocaleString("en-IN")} ` +
            `of ${qualityInspectionTotalRecords.toLocaleString("en-IN")} ` +
            `quality inspections`;

    }


    pagination.innerHTML = "";



    /* PREVIOUS */

    const previous =
        document.createElement("button");


    previous.textContent =
        "Previous";


    previous.disabled =
        currentQualityInspectionPage <= 1;


    previous.onclick = () => {

        if (
            currentQualityInspectionPage > 1
        ) {

            loadQualityInspections(
                currentQualityInspectionPage - 1
            );

        }

    };


    pagination.appendChild(
        previous
    );



    /* PAGE NUMBERS */

    const pages =
        getQualityInspectionVisiblePages();


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
                page ===
                currentQualityInspectionPage
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.onclick = () => {

                loadQualityInspections(
                    page
                );

            };


            pagination.appendChild(
                button
            );

        }
    );



    /* NEXT */

    const next =
        document.createElement(
            "button"
        );


    next.textContent =
        "Next";


    next.disabled =
        currentQualityInspectionPage
        >= qualityInspectionTotalPages;


    next.onclick = () => {

        if (
            currentQualityInspectionPage
            <
            qualityInspectionTotalPages
        ) {

            loadQualityInspections(
                currentQualityInspectionPage + 1
            );

        }

    };


    pagination.appendChild(
        next
    );

}



/* =========================================================
   VISIBLE PAGE NUMBERS
========================================================= */

function getQualityInspectionVisiblePages() {

    const pages = [];

    const total =
        qualityInspectionTotalPages;


    const current =
        currentQualityInspectionPage;


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



/* =========================================================
   CREATE / UPDATE
========================================================= */

form.onsubmit = async (e) => {

    e.preventDefault();


    const qualityInspection = {

        purchase_order_id:
            Number(
                purchaseOrderSelect.value
            ),

        vendor_id:
            Number(
                vendorSelect.value
            ),

        inspection_date:
            document.getElementById(
                "inspectionDate"
            ).value,

        inspector:
            document.getElementById(
                "inspector"
            ).value.trim(),

        quality_score:
            Number(
                document.getElementById(
                    "qualityScore"
                ).value
            ),

        defects_found:
            Number(
                document.getElementById(
                    "defectsFound"
                ).value || 0
            ),

        remarks:
            document.getElementById(
                "qualityRemarks"
            ).value.trim(),

        status:
            document.getElementById(
                "qualityStatus"
            ).value

    };


    try {

        if (
            editingQualityInspectionId
        ) {

            await updateQualityInspection(
                editingQualityInspectionId,
                qualityInspection
            );


            showToast(
                "Quality Inspection Updated",
                "success"
            );

        }

        else {

            await createQualityInspection(
                qualityInspection
            );


            showToast(
                "Quality Inspection Added",
                "success"
            );

        }


        modal.classList.remove(
            "show"
        );


        await loadQualityInspections(
            currentQualityInspectionPage
        );

    }

    catch (error) {

        console.error(
            "Quality inspection operation failed:",
            error
        );


        showToast(
            "Operation Failed",
            "error"
        );

    }

};



/* =========================================================
   EDIT
========================================================= */

async function editQualityInspection(
    id
) {

    try {

        const inspection =
            await apiRequest(
                `/quality-inspections/${id}`
            );


        if (!inspection) {

            return;

        }


        editingQualityInspectionId =
            id;


        document.getElementById(
            "qualityInspectionModalTitle"
        ).textContent =
            "Edit Quality Inspection";


        await loadPurchaseOrderDropdown();

        await loadVendorDropdown();



        purchaseOrderSelect.value =
            inspection.purchase_order_id;


        vendorSelect.value =
            inspection.vendor_id;



        document.getElementById(
            "inspectionDate"
        ).value =
            inspection.inspection_date;



        document.getElementById(
            "inspector"
        ).value =
            inspection.inspector;



        document.getElementById(
            "qualityScore"
        ).value =
            inspection.quality_score;



        document.getElementById(
            "defectsFound"
        ).value =
            inspection.defects_found ?? 0;



        document.getElementById(
            "qualityStatus"
        ).value =
            inspection.status;



        document.getElementById(
            "qualityRemarks"
        ).value =
            inspection.remarks || "";



        modal.classList.add(
            "show"
        );

    }

    catch (error) {

        console.error(
            "Failed to load quality inspection:",
            error
        );


        showToast(
            "Failed to load Quality Inspection",
            "error"
        );

    }

}



/* =========================================================
   DELETE
========================================================= */

async function removeQualityInspection(
    id
) {

    showConfirm(

        "Delete Quality Inspection?",

        async () => {

            try {

                await deleteQualityInspection(
                    id
                );


                showToast(
                    "Quality Inspection Deleted",
                    "success"
                );


                await loadQualityInspections(
                    currentQualityInspectionPage
                );

            }

            catch (error) {

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



/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadQualityInspections(
            currentQualityInspectionPage
        );

    }
);