let editingDeliveryId = null;

let currentDeliveryPage = 1;

const deliveryPageSize = 50;

let deliveryTotalPages = 1;

let deliveryTotalRecords = 0;


/* ================================
   DOM ELEMENTS
================================ */

const modal =
    document.getElementById(
        "deliveryModal"
    );

const form =
    document.getElementById(
        "deliveryForm"
    );

const vendorSelect =
    document.getElementById(
        "deliveryVendorSelect"
    );

const purchaseOrderSelect =
    document.getElementById(
        "deliveryPurchaseOrderSelect"
    );


/* ================================
   ADD DELIVERY
================================ */

const addDeliveryBtn =
    document.getElementById(
        "addDeliveryBtn"
    );

if (addDeliveryBtn) {

    addDeliveryBtn.onclick =
        async () => {

            editingDeliveryId = null;

            form.reset();

            document.getElementById(
                "deliveryModalTitle"
            ).textContent =
                "Add Delivery";


            /* Reset Vendor */

            vendorSelect.innerHTML = `
                <option value="">
                    Select Purchase Order First
                </option>
            `;

            vendorSelect.disabled = true;


            /* Load Purchase Orders */

            await loadDeliveryPurchaseOrderDropdown();


            modal.classList.add(
                "show"
            );
        };
}


/* ================================
   PURCHASE ORDER CHANGE
================================ */

if (purchaseOrderSelect) {

    purchaseOrderSelect.addEventListener(
        "change",
        async () => {

            const purchaseOrderId =
                purchaseOrderSelect.value;


            /* Reset vendor */

            vendorSelect.innerHTML = `
                <option value="">
                    Loading Vendor...
                </option>
            `;

            vendorSelect.disabled = true;


            if (!purchaseOrderId) {

                vendorSelect.innerHTML = `
                    <option value="">
                        Select Purchase Order First
                    </option>
                `;

                return;
            }


            try {

                /*
                 * Get the selected Purchase Order.
                 *
                 * The Purchase Order contains
                 * the assigned vendor_id.
                 */

                const purchaseOrder =
                    await getPurchaseOrder(
                        purchaseOrderId
                    );


                if (
                    !purchaseOrder ||
                    !purchaseOrder.vendor_id
                ) {

                    vendorSelect.innerHTML = `
                        <option value="">
                            Vendor Not Assigned
                        </option>
                    `;

                    showToast(
                        "This Purchase Order has no assigned vendor",
                        "error"
                    );

                    return;
                }


                const vendorId =
                    purchaseOrder.vendor_id;


                let vendorName =
                    purchaseOrder.vendor_name ||
                    purchaseOrder.vendor ||
                    "";


                /*
                 * If Purchase Order does not
                 * contain vendor_name, get the
                 * vendor directly.
                 */

                if (!vendorName) {

                    try {

                        const vendor =
                            await getVendor(
                                vendorId
                            );

                        if (vendor) {

                            vendorName =
                                vendor.vendor_name ||
                                vendor.name ||
                                `Vendor ${vendorId}`;

                        }

                    }

                    catch (vendorError) {

                        console.warn(
                            "Could not load vendor details:",
                            vendorError
                        );

                        vendorName =
                            `Vendor ${vendorId}`;

                    }
                }


                /*
                 * Put the assigned vendor into
                 * the dropdown.
                 */

                vendorSelect.innerHTML = `
                    <option value="${vendorId}">
                        ${escapeHtmlSafe(
                            vendorName
                        )}
                    </option>
                `;


                vendorSelect.value =
                    String(vendorId);


                /*
                 * Vendor should not be changed
                 * manually because it belongs
                 * to the selected Purchase Order.
                 */

                vendorSelect.disabled = true;

            }

            catch (error) {

                console.error(
                    "Failed to load vendor for Purchase Order:",
                    error
                );


                vendorSelect.innerHTML = `
                    <option value="">
                        Failed to Load Vendor
                    </option>
                `;


                showToast(
                    "Failed to load vendor for Purchase Order",
                    "error"
                );

            }

        }
    );

}


/* ================================
   SAFE HTML HELPER
================================ */

function escapeHtmlSafe(value) {

    if (
        value === null ||
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


/* ================================
   CANCEL
================================ */

const cancelDeliveryBtn =
    document.getElementById(
        "cancelDelivery"
    );

if (cancelDeliveryBtn) {

    cancelDeliveryBtn.onclick =
        () => {

            modal.classList.remove(
                "show"
            );

        };
}


const closeDeliveryModalBtn =
    document.getElementById(
        "closeDeliveryModal"
    );

if (closeDeliveryModalBtn) {

    closeDeliveryModalBtn.onclick =
        () => {

            modal.classList.remove(
                "show"
            );

        };
}


/* ================================
   INITIAL LOAD
================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadDeliveries(
            currentDeliveryPage
        );

    }
);


/* ================================
   LOAD PURCHASE ORDERS
================================ */

async function loadDeliveryPurchaseOrderDropdown() {

    try {

        /*
         * Do not load all Purchase Orders.
         *
         * Currently we load the first 100.
         * Later this can become searchable.
         */

        const response =
            await getPurchaseOrders(
                1,
                100
            );


        const purchaseOrders =
            Array.isArray(response)
                ? response
                : (
                    response?.items ||
                    response?.data ||
                    []
                );


        purchaseOrderSelect.innerHTML = `
            <option value="">
                Select Purchase Order
            </option>
        `;


        purchaseOrders.forEach(
            (po) => {

                if (!po || !po.id) {
                    return;
                }


                purchaseOrderSelect.innerHTML += `
                    <option
                        value="${po.id}"
                        data-vendor-id="${po.vendor_id || ""}"
                        data-vendor-name="${escapeHtmlSafe(
                            po.vendor_name ||
                            po.vendor ||
                            ""
                        )}"
                    >
                        ${escapeHtmlSafe(
                            po.po_number ||
                            `PO-${po.id}`
                        )}
                    </option>
                `;

            }
        );


        /*
         * If no Purchase Orders exist,
         * show a clear message.
         */

        if (
            purchaseOrders.length === 0
        ) {

            purchaseOrderSelect.innerHTML = `
                <option value="">
                    No Purchase Orders Available
                </option>
            `;

            vendorSelect.innerHTML = `
                <option value="">
                    No Purchase Order Selected
                </option>
            `;

            vendorSelect.disabled = true;

        }

    }

    catch (error) {

        console.error(
            "Failed to load purchase orders:",
            error
        );


        purchaseOrderSelect.innerHTML = `
            <option value="">
                Failed to Load Purchase Orders
            </option>
        `;


        vendorSelect.innerHTML = `
            <option value="">
                Select Purchase Order First
            </option>
        `;


        vendorSelect.disabled = true;


        showToast(
            "Failed to load Purchase Orders",
            "error"
        );

    }
}


/* ================================
   LOAD DELIVERIES
================================ */

async function loadDeliveries(
    page = 1
) {

    try {

        const response =
            await getDeliveries(
                page,
                deliveryPageSize
            );


        const deliveries =
            response.items || [];


        currentDeliveryPage =
            response.page || page;


        deliveryTotalPages =
            response.total_pages || 1;


        deliveryTotalRecords =
            response.total || 0;


        const tbody =
            document.getElementById(
                "deliveryTableBody"
            );


        if (!tbody) {

            console.error(
                "deliveryTableBody not found"
            );

            return;
        }


        tbody.innerHTML = "";


        if (
            deliveries.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        style="text-align:center;"
                    >
                        No Deliveries Found
                    </td>
                </tr>
            `;


            renderDeliveryPagination();

            return;
        }


        deliveries.forEach(
            (delivery) => {

                tbody.innerHTML += `

                    <tr>

                        <td>
                            ${delivery.id}
                        </td>

                        <td>
                            ${
                                delivery.purchase_order_number
                                ??
                                delivery.purchase_order_id
                            }
                        </td>

                        <td>
                            ${
                                delivery.vendor_name
                                ??
                                delivery.vendor_id
                            }
                        </td>

                        <td>
                            ${
                                delivery.delivery_date
                                ?? "-"
                            }
                        </td>

                        <td>
                            ${
                                delivery.expected_delivery_date
                                ?? "-"
                            }
                        </td>

                        <td>
                            ${
                                delivery.delay_days
                                ?? 0
                            }
                        </td>

                        <td>
                            ${
                                delivery.delivery_status
                                ?? "-"
                            }
                        </td>

                        <td>
                            ${
                                delivery.damaged_goods
                                ?? 0
                            }
                        </td>

                        <td>

                            <button
                                class="edit-btn"
                                onclick="
                                    editDelivery(
                                        ${delivery.id}
                                    )
                                "
                            >
                                Edit
                            </button>

                            <button
                                class="delete-btn"
                                onclick="
                                    removeDelivery(
                                        ${delivery.id}
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


        renderDeliveryPagination();

    }

    catch (error) {

        console.error(
            "Failed to load deliveries:",
            error
        );


        showToast(
            "Failed to load Deliveries",
            "error"
        );

    }
}


/* ================================
   PAGINATION
================================ */

function renderDeliveryPagination() {

    const paginationInfo =
        document.getElementById(
            "deliveryPaginationInfo"
        );

    const pagination =
        document.getElementById(
            "deliveryPagination"
        );


    if (!pagination) {
        return;
    }


    const start =
        deliveryTotalRecords === 0
            ? 0
            : (
                (
                    currentDeliveryPage - 1
                )
                *
                deliveryPageSize
            ) + 1;


    const end =
        Math.min(
            currentDeliveryPage
            *
            deliveryPageSize,

            deliveryTotalRecords
        );


    if (paginationInfo) {

        paginationInfo.textContent =
            `Showing ${start.toLocaleString("en-IN")} ` +
            `to ${end.toLocaleString("en-IN")} ` +
            `of ${deliveryTotalRecords.toLocaleString("en-IN")} ` +
            `deliveries`;

    }


    pagination.innerHTML = "";


    /* Previous */

    const previousButton =
        document.createElement(
            "button"
        );

    previousButton.textContent =
        "Previous";

    previousButton.disabled =
        currentDeliveryPage <= 1;


    previousButton.onclick =
        () => {

            if (
                currentDeliveryPage > 1
            ) {

                loadDeliveries(
                    currentDeliveryPage - 1
                );

            }

        };


    pagination.appendChild(
        previousButton
    );


    /* Page Numbers */

    const pages =
        getDeliveryVisiblePages();


    pages.forEach(
        (page) => {

            if (
                page === "..."
            ) {

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
                page === currentDeliveryPage
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.onclick =
                () => {

                    loadDeliveries(
                        page
                    );

                };


            pagination.appendChild(
                button
            );

        }
    );


    /* Next */

    const nextButton =
        document.createElement(
            "button"
        );

    nextButton.textContent =
        "Next";


    nextButton.disabled =
        currentDeliveryPage
        >= deliveryTotalPages;


    nextButton.onclick =
        () => {

            if (
                currentDeliveryPage
                <
                deliveryTotalPages
            ) {

                loadDeliveries(
                    currentDeliveryPage + 1
                );

            }

        };


    pagination.appendChild(
        nextButton
    );
}


/* ================================
   VISIBLE PAGE NUMBERS
================================ */

function getDeliveryVisiblePages() {

    const pages = [];

    const total =
        deliveryTotalPages;

    const current =
        currentDeliveryPage;


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


/* ================================
   FORM SUBMIT
================================ */

if (form) {

    form.onsubmit =
        async (e) => {

            e.preventDefault();


            const purchaseOrderId =
                Number(
                    purchaseOrderSelect.value
                );


            const vendorId =
                Number(
                    vendorSelect.value
                );


            /*
             * Validate Purchase Order
             */

            if (!purchaseOrderId) {

                showToast(
                    "Please select a Purchase Order",
                    "error"
                );

                return;
            }


            /*
             * Validate Vendor
             */

            if (!vendorId) {

                showToast(
                    "Vendor could not be determined from the Purchase Order",
                    "error"
                );

                return;
            }


            const delivery = {

                purchase_order_id:
                    purchaseOrderId,

                vendor_id:
                    vendorId,

                delivery_date:
                    document.getElementById(
                        "deliveryDate"
                    ).value,

                expected_delivery_date:
                    document.getElementById(
                        "expectedDeliveryDate"
                    ).value,

                delay_days:
                    Number(
                        document.getElementById(
                            "delayDays"
                        ).value || 0
                    ),

                delivery_status:
                    document.getElementById(
                        "deliveryStatus"
                    ).value,

                damaged_goods:
                    Number(
                        document.getElementById(
                            "damagedGoods"
                        ).value || 0
                    ),

                delivery_notes:
                    document.getElementById(
                        "deliveryNotes"
                    ).value

            };


            try {

                if (
                    editingDeliveryId
                ) {

                    await updateDelivery(
                        editingDeliveryId,
                        delivery
                    );


                    showToast(
                        "Delivery Updated",
                        "success"
                    );

                }

                else {

                    await createDelivery(
                        delivery
                    );


                    showToast(
                        "Delivery Added",
                        "success"
                    );

                }


                modal.classList.remove(
                    "show"
                );


                await loadDeliveries(
                    currentDeliveryPage
                );

            }

            catch (error) {

                console.error(
                    "Delivery operation failed:",
                    error
                );


                showToast(
                    error?.message ||
                    "Operation Failed",
                    "error"
                );

            }

        };

}


/* ================================
   EDIT DELIVERY
================================ */

async function editDelivery(
    id
) {

    try {

        const delivery =
            await apiRequest(
                `/deliveries/${id}`
            );


        if (!delivery) {
            return;
        }


        editingDeliveryId =
            id;


        document.getElementById(
            "deliveryModalTitle"
        ).textContent =
            "Edit Delivery";


        /*
         * Load Purchase Orders
         */

        await loadDeliveryPurchaseOrderDropdown();


        /*
         * Select Purchase Order
         */

        purchaseOrderSelect.value =
            String(
                delivery.purchase_order_id
            );


        /*
         * Trigger automatic vendor loading.
         */

        if (
            purchaseOrderSelect.value
        ) {

            purchaseOrderSelect.dispatchEvent(
                new Event(
                    "change"
                )
            );

        }


        /*
         * Wait briefly for vendor
         * lookup to complete.
         */

        await waitForVendorSelection(
            delivery.vendor_id
        );


        document.getElementById(
            "deliveryDate"
        ).value =
            delivery.delivery_date || "";


        document.getElementById(
            "expectedDeliveryDate"
        ).value =
            delivery.expected_delivery_date || "";


        document.getElementById(
            "delayDays"
        ).value =
            delivery.delay_days ?? 0;


        document.getElementById(
            "deliveryStatus"
        ).value =
            delivery.delivery_status || "";


        document.getElementById(
            "damagedGoods"
        ).value =
            delivery.damaged_goods ?? 0;


        document.getElementById(
            "deliveryNotes"
        ).value =
            delivery.delivery_notes || "";


        modal.classList.add(
            "show"
        );

    }

    catch (error) {

        console.error(
            "Failed to load delivery:",
            error
        );


        showToast(
            "Failed to load Delivery",
            "error"
        );

    }
}


/* ================================
   WAIT FOR VENDOR
================================ */

async function waitForVendorSelection(
    vendorId
) {

    /*
     * If the vendor is already loaded,
     * nothing else is required.
     */

    if (
        vendorSelect.value ===
        String(vendorId)
    ) {

        return;
    }


    /*
     * Fallback.
     *
     * This handles older Purchase Orders
     * where the vendor name is not returned.
     */

    try {

        const vendor =
            await getVendor(
                vendorId
            );


        const vendorName =
            vendor?.vendor_name ||
            vendor?.name ||
            `Vendor ${vendorId}`;


        vendorSelect.innerHTML = `
            <option value="${vendorId}">
                ${escapeHtmlSafe(
                    vendorName
                )}
            </option>
        `;


        vendorSelect.value =
            String(vendorId);


        vendorSelect.disabled =
            true;

    }

    catch (error) {

        console.error(
            "Failed to load vendor:",
            error
        );


        vendorSelect.innerHTML = `
            <option value="${vendorId}">
                Vendor ${vendorId}
            </option>
        `;


        vendorSelect.value =
            String(vendorId);


        vendorSelect.disabled =
            true;

    }
}


/* ================================
   DELETE DELIVERY
================================ */

async function removeDelivery(
    id
) {

    showConfirm(

        "Delete Delivery?",

        async () => {

            try {

                await deleteDelivery(
                    id
                );


                showToast(
                    "Delivery Deleted",
                    "success"
                );


                await loadDeliveries(
                    currentDeliveryPage
                );

            }

            catch (error) {

                console.error(
                    "Delete failed:",
                    error
                );


                showToast(
                    error?.message ||
                    "Delete Failed",
                    "error"
                );

            }

        }

    );
}