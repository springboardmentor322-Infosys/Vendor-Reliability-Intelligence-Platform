let editingPurchaseOrderId = null;

let currentPurchaseOrderPage = 1;

const purchaseOrderPageSize = 50;

let purchaseOrderTotalPages = 1;
let purchaseOrderTotalRecords = 0;


// =====================================================
// DOM ELEMENTS
// =====================================================

const modal = document.getElementById(
    "purchaseOrderModal"
);

const form = document.getElementById(
    "purchaseOrderForm"
);

const vendorSelect = document.getElementById(
    "vendorSelect"
);

const productSelect = document.getElementById(
    "productSelect"
);

const addPurchaseOrderBtn = document.getElementById(
    "addPurchaseOrderBtn"
);

const cancelPurchaseOrderBtn = document.getElementById(
    "cancelPurchaseOrder"
);


// =====================================================
// ADD PURCHASE ORDER
// =====================================================

if (addPurchaseOrderBtn) {

    addPurchaseOrderBtn.onclick = async () => {

        editingPurchaseOrderId = null;

        form.reset();

        document.getElementById(
            "purchaseOrderModalTitle"
        ).innerHTML = "Add Purchase Order";

        try {

            await loadVendorDropdown();

            await loadProductDropdown();

            modal.classList.add("show");

        } catch (error) {

            console.error(
                "Failed to load dropdown data:",
                error
            );

            showToast(
                "Failed to load vendor/product data",
                "error"
            );

        }

    };

}


// =====================================================
// CANCEL MODAL
// =====================================================

if (cancelPurchaseOrderBtn) {

    cancelPurchaseOrderBtn.onclick = () => {

        modal.classList.remove("show");

    };

}


// =====================================================
// LOAD VENDOR DROPDOWN
// =====================================================

async function loadVendorDropdown() {

    try {

        const vendors = await getVendors();

        vendorSelect.innerHTML =
            '<option value="">Select Vendor</option>';


        vendors.forEach((vendor) => {

            vendorSelect.innerHTML += `

                <option value="${vendor.id}">
                    ${vendor.vendor_name}
                </option>

            `;

        });

    } catch (error) {

        console.error(
            "Failed to load vendors:",
            error
        );

        throw error;

    }

}


// =====================================================
// LOAD PRODUCT DROPDOWN
// =====================================================

async function loadProductDropdown() {

    try {

        const products = await getProducts();

        productSelect.innerHTML =
            '<option value="">Select Product</option>';


        products.forEach((product) => {

            productSelect.innerHTML += `

                <option value="${product.id}">
                    ${product.product_name}
                </option>

            `;

        });

    } catch (error) {

        console.error(
            "Failed to load products:",
            error
        );

        throw error;

    }

}


// =====================================================
// LOAD PURCHASE ORDERS
// =====================================================

async function loadPurchaseOrders(page = 1) {

    try {

        console.log(
            "Loading Purchase Orders, page:",
            page
        );


        const response = await getPurchaseOrders(
            page,
            purchaseOrderPageSize
        );


        console.log(
            "Purchase Order API response:",
            response
        );


        /*
         * Expected backend response:
         *
         * {
         *     items: [],
         *     total: 180520,
         *     page: 1,
         *     limit: 50,
         *     total_pages: 3611
         * }
         */


        const orders =
            response.items || [];


        currentPurchaseOrderPage =
            response.page || page;


        purchaseOrderTotalPages =
            response.total_pages || 1;


        purchaseOrderTotalRecords =
            response.total || 0;


        const tbody =
            document.getElementById(
                "purchaseOrderTableBody"
            );


        if (!tbody) {

            console.error(
                "purchaseOrderTableBody not found"
            );

            return;

        }


        tbody.innerHTML = "";


        // =================================================
        // NO DATA
        // =================================================

        if (!orders.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        style="text-align:center;"
                    >
                        No Purchase Orders Found
                    </td>

                </tr>

            `;


            renderPurchaseOrderPagination();

            return;

        }


        // =================================================
        // RENDER DATA
        // =================================================

        orders.forEach((order) => {

            tbody.innerHTML += `

                <tr>

                    <td>
                        ${order.po_number ?? "-"}
                    </td>


                    <td>
                        ${
                            order.vendor_name
                            ?? order.vendor_id
                            ?? "-"
                        }
                    </td>


                    <td>
                        ${
                            order.product_name
                            ?? order.product_id
                            ?? "-"
                        }
                    </td>


                    <td>
                        ₹ ${
                            Number(
                                order.amount || 0
                            ).toLocaleString(
                                "en-IN"
                            )
                        }
                    </td>


                    <td>
                        ${order.status ?? "-"}
                    </td>


                    <td>
                        ${
                            order.delivery_date
                            ?? "-"
                        }
                    </td>


                    <td>

                        <button
                            type="button"
                            class="edit-btn"
                            onclick="
                                editPurchaseOrder(
                                    ${order.id}
                                )
                            "
                        >
                            Edit
                        </button>


                        <button
                            type="button"
                            class="delete-btn"
                            onclick="
                                removePurchaseOrder(
                                    ${order.id}
                                )
                            "
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        });


        renderPurchaseOrderPagination();


    } catch (error) {

        console.error(
            "Failed to load purchase orders:",
            error
        );


        const tbody =
            document.getElementById(
                "purchaseOrderTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        style="text-align:center;"
                    >
                        Failed to load Purchase Orders
                    </td>

                </tr>

            `;

        }

    }

}


// =====================================================
// PAGINATION
// =====================================================

function renderPurchaseOrderPagination() {

    const paginationInfo =
        document.getElementById(
            "purchaseOrderPaginationInfo"
        );


    const pagination =
        document.getElementById(
            "purchaseOrderPagination"
        );


    if (!pagination) {

        return;

    }


    const start =
        purchaseOrderTotalRecords === 0

            ? 0

            : (
                (
                    currentPurchaseOrderPage - 1
                )
                * purchaseOrderPageSize
            ) + 1;


    const end =
        Math.min(

            currentPurchaseOrderPage
            * purchaseOrderPageSize,

            purchaseOrderTotalRecords

        );


    if (paginationInfo) {

        paginationInfo.textContent =

            `Showing ${
                start.toLocaleString("en-IN")
            } to ${
                end.toLocaleString("en-IN")
            } of ${
                purchaseOrderTotalRecords.toLocaleString(
                    "en-IN"
                )
            } purchase orders`;

    }


    pagination.innerHTML = "";


    // =================================================
    // PREVIOUS
    // =================================================

    const previousButton =
        document.createElement("button");


    previousButton.type = "button";


    previousButton.textContent =
        "Previous";


    previousButton.disabled =
        currentPurchaseOrderPage <= 1;


    previousButton.onclick = () => {

        if (
            currentPurchaseOrderPage > 1
        ) {

            loadPurchaseOrders(
                currentPurchaseOrderPage - 1
            );

        }

    };


    pagination.appendChild(
        previousButton
    );


    // =================================================
    // PAGE NUMBERS
    // =================================================

    const pages =
        getPurchaseOrderVisiblePages();


    pages.forEach((page) => {

        if (page === "...") {

            const span =
                document.createElement("span");


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
            document.createElement("button");


        button.type = "button";


        button.textContent =
            page;


        button.className =
            "pagination-number";


        if (
            page === currentPurchaseOrderPage
        ) {

            button.classList.add(
                "active"
            );

        }


        button.onclick = () => {

            loadPurchaseOrders(
                page
            );

        };


        pagination.appendChild(
            button
        );

    });


    // =================================================
    // NEXT
    // =================================================

    const nextButton =
        document.createElement("button");


    nextButton.type = "button";


    nextButton.textContent =
        "Next";


    nextButton.disabled =

        currentPurchaseOrderPage
        >= purchaseOrderTotalPages;


    nextButton.onclick = () => {

        if (
            currentPurchaseOrderPage
            < purchaseOrderTotalPages
        ) {

            loadPurchaseOrders(
                currentPurchaseOrderPage + 1
            );

        }

    };


    pagination.appendChild(
        nextButton
    );

}


// =====================================================
// VISIBLE PAGE NUMBERS
// =====================================================

function getPurchaseOrderVisiblePages() {

    const pages = [];


    const total =
        purchaseOrderTotalPages;


    const current =
        currentPurchaseOrderPage;


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


// =====================================================
// CREATE / UPDATE PURCHASE ORDER
// =====================================================

if (form) {

    form.onsubmit = async (e) => {

        e.preventDefault();


        const purchaseOrder = {

            po_number:
                document.getElementById(
                    "poNumber"
                ).value,


            vendor_id:
                Number(
                    vendorSelect.value
                ),


            product_id:
                Number(
                    productSelect.value
                ),


            amount:
                Number(
                    document.getElementById(
                        "amount"
                    ).value
                ),


            order_date:
                document.getElementById(
                    "orderDate"
                ).value,


            delivery_date:
                document.getElementById(
                    "deliveryDate"
                ).value || null,


            status:
                document.getElementById(
                    "status"
                ).value,


            description:
                document.getElementById(
                    "description"
                ).value || null

        };


        try {


            // =============================================
            // UPDATE
            // =============================================

            if (editingPurchaseOrderId) {

                await updatePurchaseOrder(

                    editingPurchaseOrderId,

                    purchaseOrder

                );


                showToast(
                    "Purchase Order Updated",
                    "success"
                );

            }


            // =============================================
            // CREATE
            // =============================================

            else {

                await createPurchaseOrder(
                    purchaseOrder
                );


                showToast(
                    "Purchase Order Added",
                    "success"
                );

            }


            modal.classList.remove(
                "show"
            );


            await loadPurchaseOrders(
                currentPurchaseOrderPage
            );


        } catch (error) {

            console.error(
                "Purchase Order operation failed:",
                error
            );


            showToast(
                "Operation Failed",
                "error"
            );

        }

    };

}


// =====================================================
// EDIT PURCHASE ORDER
// =====================================================

async function editPurchaseOrder(id) {

    try {


        const po =
            await apiRequest(
                `/purchase-orders/${id}`
            );


        if (!po) {

            showToast(
                "Purchase Order not found",
                "error"
            );

            return;

        }


        editingPurchaseOrderId =
            id;


        document.getElementById(
            "purchaseOrderModalTitle"
        ).innerHTML =
            "Edit Purchase Order";


        await loadVendorDropdown();

        await loadProductDropdown();


        document.getElementById(
            "poNumber"
        ).value =
            po.po_number || "";


        vendorSelect.value =
            po.vendor_id || "";


        productSelect.value =
            po.product_id || "";


        document.getElementById(
            "amount"
        ).value =
            po.amount ?? "";


        document.getElementById(
            "orderDate"
        ).value =
            po.order_date || "";


        document.getElementById(
            "deliveryDate"
        ).value =
            po.delivery_date || "";


        document.getElementById(
            "status"
        ).value =
            po.status || "Pending";


        document.getElementById(
            "description"
        ).value =
            po.description || "";


        modal.classList.add(
            "show"
        );


    } catch (error) {

        console.error(
            "Failed to load purchase order:",
            error
        );


        showToast(
            "Failed to load Purchase Order",
            "error"
        );

    }

}


// =====================================================
// DELETE PURCHASE ORDER
// =====================================================

async function removePurchaseOrder(id) {

    showConfirm(

        "Delete Purchase Order?",

        async () => {

            try {


                await deletePurchaseOrder(
                    id
                );


                showToast(
                    "Purchase Order Deleted",
                    "success"
                );


                /*
                 * If the current page becomes empty
                 * after deletion, move back one page.
                 */

                if (
                    currentPurchaseOrderPage > 1
                    &&
                    (
                        purchaseOrderTotalRecords - 1
                    )
                    <=
                    (
                        (
                            currentPurchaseOrderPage - 1
                        )
                        * purchaseOrderPageSize
                    )
                ) {

                    currentPurchaseOrderPage--;

                }


                await loadPurchaseOrders(
                    currentPurchaseOrderPage
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


// =====================================================
// INITIAL LOAD
// =====================================================

loadPurchaseOrders();