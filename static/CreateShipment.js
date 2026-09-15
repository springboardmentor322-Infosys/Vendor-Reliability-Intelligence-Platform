const API_BASE = "http://127.0.0.1:8000";

let shipmentItems = [];

document.addEventListener("DOMContentLoaded", async () => {

    setToday();

    setupEvents();

    await loadPurchaseOrders();

    addItem();

    updateUI();

});


/* =====================================================
   DATE
===================================================== */

function setToday() {

    const input = document.getElementById(
        "shipmentDate"
    );

    if (!input) return;

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    input.value =
        `${year}-${month}-${day}`;
}


/* =====================================================
   EVENTS
===================================================== */

function setupEvents() {

    const form =
        document.getElementById("shipmentForm");

    if (form) {

        form.addEventListener(
            "submit",
            submitShipment
        );

    }


    const addItemBtn =
        document.getElementById("addItemBtn");

    if (addItemBtn) {

        addItemBtn.addEventListener(
            "click",
            addItem
        );

    }


    const quickAddItem =
        document.getElementById("quickAddItem");

    if (quickAddItem) {

        quickAddItem.addEventListener(
            "click",
            addItem
        );

    }


    const cancelBtn =
        document.getElementById("cancelBtn");

    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            () => {

                if (
                    confirm(
                        "Cancel shipment creation?"
                    )
                ) {
                    window.location.reload();
                }

            }
        );

    }


    const draftBtn =
        document.getElementById("draftBtn");

    if (draftBtn) {

        draftBtn.addEventListener(
            "click",
            () => saveShipment("Draft")
        );

    }


    document
        .querySelectorAll(
            "#shipmentType, #origin, #destination, #requestedDelivery"
        )
        .forEach(element => {

            element.addEventListener(
                "input",
                updateSummary
            );

            element.addEventListener(
                "change",
                updateSummary
            );

        });

}


/* =====================================================
   PURCHASE ORDERS
===================================================== */

async function loadPurchaseOrders() {

    const select =
        document.getElementById("poId");

    if (!select) return;

    try {

        const response = await fetch(
            `${API_BASE}/api/shipments/purchase-orders`
        );

        if (!response.ok) {

            throw new Error(
                "Unable to load purchase orders"
            );

        }

        const orders =
            await response.json();

        select.innerHTML =
            `<option value="">
                Select purchase order
            </option>`;

        orders.forEach(order => {

            const option =
                document.createElement("option");

            option.value = order.id;

            option.textContent =
                order.label;

            select.appendChild(option);

        });

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to load purchase orders",
            "error"
        );

    }

}


/* =====================================================
   ITEMS
===================================================== */

function addItem() {

    const item = {

        inventory_item_id: null,

        purchase_order_item_id: null,

        item_code: "",

        item_description: "",

        quantity: 1,

        uom: "PCS",

        total_weight: 0,

        weight_unit: "kg",

        total_volume: 0,

        volume_unit: "m3"

    };

    shipmentItems.push(item);

    renderItems();

    updateUI();

}


function removeItem(index) {

    shipmentItems.splice(index, 1);

    renderItems();

    updateUI();

}


function updateItem(
    index,
    field,
    value
) {

    if (!shipmentItems[index]) return;

    shipmentItems[index][field] = value;

    updateUI();

}


function renderItems() {

    const tbody =
        document.getElementById(
            "itemsBody"
        );

    if (!tbody) return;

    tbody.innerHTML = "";

    shipmentItems.forEach(
        (item, index) => {

            const tr =
                document.createElement("tr");

            tr.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <input
                        class="item-input"
                        value="${escapeHTML(
                            item.item_description
                        )}"
                        placeholder="Item description"
                        data-index="${index}"
                        data-field="item_description"
                    >
                </td>

                <td>
                    <input
                        class="item-input"
                        value="${escapeHTML(
                            item.item_code
                        )}"
                        placeholder="SKU / Code"
                        data-index="${index}"
                        data-field="item_code"
                    >
                </td>

                <td>
                    <input
                        class="item-input"
                        type="number"
                        min="0"
                        step="0.001"
                        value="${item.quantity}"
                        data-index="${index}"
                        data-field="quantity"
                    >
                </td>

                <td>
                    <input
                        class="item-input"
                        value="${escapeHTML(
                            item.uom
                        )}"
                        data-index="${index}"
                        data-field="uom"
                    >
                </td>

                <td>
                    <input
                        class="item-input"
                        type="number"
                        min="0"
                        step="0.001"
                        value="${item.total_weight}"
                        data-index="${index}"
                        data-field="total_weight"
                    >
                </td>

                <td>
                    <input
                        class="item-input"
                        type="number"
                        min="0"
                        step="0.001"
                        value="${item.total_volume}"
                        data-index="${index}"
                        data-field="total_volume"
                    >
                </td>

                <td>

                    <button
                        type="button"
                        class="action-btn delete"
                        onclick="removeItem(${index})"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </td>

            `;

            tbody.appendChild(tr);

        }
    );


    tbody
        .querySelectorAll(
            "input[data-index]"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                event => {

                    const index =
                        Number(
                            event.target.dataset.index
                        );

                    const field =
                        event.target.dataset.field;

                    let value =
                        event.target.value;

                    if (
                        [
                            "quantity",
                            "total_weight",
                            "total_volume"
                        ].includes(field)
                    ) {

                        value =
                            Number(value) || 0;

                    }

                    updateItem(
                        index,
                        field,
                        value
                    );

                }
            );

        });

}


/* =====================================================
   TOTALS
===================================================== */

function calculateTotals() {

    let totalItems = 0;

    let totalWeight = 0;

    let totalVolume = 0;

    shipmentItems.forEach(item => {

        totalItems +=
            Number(item.quantity) || 0;

        totalWeight +=
            Number(item.total_weight) || 0;

        totalVolume +=
            Number(item.total_volume) || 0;

    });

    return {
        totalItems,
        totalWeight,
        totalVolume
    };

}


function updateUI() {

    const totals =
        calculateTotals();

    const totalItems =
        document.getElementById(
            "totalItems"
        );

    const totalWeight =
        document.getElementById(
            "totalWeight"
        );

    const totalVolume =
        document.getElementById(
            "totalVolume"
        );

    if (totalItems) {

        totalItems.textContent =
            totals.totalItems;

    }

    if (totalWeight) {

        totalWeight.textContent =
            `${totals.totalWeight.toFixed(2)} kg`;

    }

    if (totalVolume) {

        totalVolume.textContent =
            `${totals.totalVolume.toFixed(2)} m³`;

    }

    updateSummary();

    updateChecklist();

}


/* =====================================================
   SUMMARY
===================================================== */

function updateSummary() {

    const type =
        document.getElementById(
            "shipmentType"
        )?.value || "Outbound";

    const origin =
        document.getElementById(
            "origin"
        )?.value || "—";

    const destination =
        document.getElementById(
            "destination"
        )?.value || "—";

    const delivery =
        document.getElementById(
            "requestedDelivery"
        )?.value || "—";

    const totals =
        calculateTotals();


    setText(
        "summaryType",
        type
    );

    setText(
        "summaryFrom",
        origin
    );

    setText(
        "summaryTo",
        destination
    );

    setText(
        "summaryDelivery",
        delivery
    );

    setText(
        "summaryItems",
        totals.totalItems
    );

    setText(
        "summaryWeight",
        totals.totalWeight.toFixed(2)
    );

    setText(
        "summaryVolume",
        totals.totalVolume.toFixed(2)
    );

}


function updateChecklist() {

    const shipmentDate =
        document.getElementById(
            "shipmentDate"
        )?.value;

    const po =
        document.getElementById(
            "poId"
        )?.value;

    const origin =
        document.getElementById(
            "origin"
        )?.value;

    const destination =
        document.getElementById(
            "destination"
        )?.value;


    const completed = [

        Boolean(
            shipmentDate && po
        ),

        Boolean(
            origin && destination
        ),

        shipmentItems.length > 0,

        false,

        false

    ];


    document
        .querySelectorAll(
            ".check"
        )
        .forEach(
            (element, index) => {

                const icon =
                    element.querySelector("i");

                if (
                    completed[index]
                ) {

                    element.classList.add(
                        "completed"
                    );

                    element.classList.remove(
                        "pending"
                    );

                    icon.className =
                        "fa-solid fa-circle-check";

                } else {

                    element.classList.remove(
                        "completed"
                    );

                    element.classList.add(
                        "pending"
                    );

                    icon.className =
                        "fa-regular fa-circle";

                }

            }
        );

}


/* =====================================================
   SUBMIT
===================================================== */

async function submitShipment(event) {

    event.preventDefault();

    await saveShipment("Pending");

}


async function saveShipment(status) {

    const poId =
        document.getElementById(
            "poId"
        ).value;

    const shipmentDate =
        document.getElementById(
            "shipmentDate"
        ).value;

    const origin =
        document.getElementById(
            "origin"
        ).value.trim();

    const destination =
        document.getElementById(
            "destination"
        ).value.trim();


    if (!poId) {

        showMessage(
            "Please select a purchase order.",
            "error"
        );

        return;

    }


    if (!shipmentDate) {

        showMessage(
            "Please select shipment date.",
            "error"
        );

        return;

    }


    if (!origin || !destination) {

        showMessage(
            "Please enter origin and destination.",
            "error"
        );

        return;

    }


    if (shipmentItems.length === 0) {

        showMessage(
            "Please add at least one item.",
            "error"
        );

        return;

    }


    for (const item of shipmentItems) {

        if (!item.item_code) {

            showMessage(
                "Every item needs an item code.",
                "error"
            );

            return;

        }

        if (!item.item_description) {

            showMessage(
                "Every item needs a description.",
                "error"
            );

            return;

        }

    }


    const payload = {

        po_id: Number(poId),

        shipment_date: shipmentDate,

        shipment_type:
            document.getElementById(
                "shipmentType"
            ).value,

        priority:
            document.getElementById(
                "priority"
            ).value,

        reference_number:
            document.getElementById(
                "referenceNumber"
            ).value || null,

        related_document:
            document.getElementById(
                "relatedDocument"
            ).value || null,

        incoterms:
            document.getElementById(
                "incoterms"
            ).value || null,

        payment_terms:
            document.getElementById(
                "paymentTerms"
            ).value || null,

        status: status,

        origin: origin,

        destination: destination,

        details: {

            requested_delivery:
                valueOrNull(
                    "requestedDelivery"
                ),

            promised_delivery:
                valueOrNull(
                    "promisedDelivery"
                ),

            earliest_pickup:
                valueOrNull(
                    "earliestPickup"
                ),

            latest_delivery:
                valueOrNull(
                    "latestDelivery"
                ),

            pickup_time_window:
                valueOrNull(
                    "pickupTimeWindow"
                ),

            delivery_time_window:
                valueOrNull(
                    "deliveryTimeWindow"
                ),

            timezone:
                valueOrNull(
                    "timezone"
                ),

            origin_contact_person:
                valueOrNull(
                    "originContact"
                ),

            origin_phone:
                valueOrNull(
                    "originPhone"
                ),

            origin_address:
                valueOrNull(
                    "originAddress"
                ),

            destination_contact_person:
                valueOrNull(
                    "destinationContact"
                ),

            destination_phone:
                valueOrNull(
                    "destinationPhone"
                ),

            destination_address:
                valueOrNull(
                    "destinationAddress"
                ),

            special_instructions:
                valueOrNull(
                    "specialInstructions"
                ),

            internal_notes:
                valueOrNull(
                    "internalNotes"
                )

        },

        items: shipmentItems.map(item => ({

            inventory_item_id:
                item.inventory_item_id,

            purchase_order_item_id:
                item.purchase_order_item_id,

            item_code:
                item.item_code,

            item_description:
                item.item_description,

            quantity:
                Number(item.quantity) || 0,

            uom:
                item.uom || "PCS",

            total_weight:
                Number(item.total_weight) || 0,

            weight_unit:
                item.weight_unit || "kg",

            total_volume:
                Number(item.total_volume) || 0,

            volume_unit:
                item.volume_unit || "m3"

        }))

    };


    try {

        const response =
            await fetch(
                `${API_BASE}/api/shipments`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(payload)
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.detail ||
                "Failed to create shipment"
            );

        }


        showMessage(
            `Shipment ${result.shipment.shipment_number} created successfully.`,
            "success"
        );


        document.getElementById(
            "shipmentNumber"
        ).value =
            result.shipment.shipment_number;

        document.getElementById(
            "summaryNumber"
        ).textContent =
            result.shipment.shipment_number;


        setTimeout(() => {

            // Change this to your review page.
            window.location.href =
                `/shipment-review.html?id=${result.shipment.id}`;

        }, 1200);


    } catch (error) {

        console.error(
            "Create shipment error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

    }

}


/* =====================================================
   HELPERS
===================================================== */

function valueOrNull(id) {

    const element =
        document.getElementById(id);

    if (!element) return null;

    return element.value || null;

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function openSupplyChainProfile(){
    window.location.href="/SupplyChainProfile"
}


function showMessage(
    message,
    type = "success"
) {

    const old =
        document.querySelector(
            ".toast"
        );

    if (old) old.remove();


    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `toast ${type}`;

    toast.textContent =
        message;

    document.body.appendChild(
        toast
    );


    setTimeout(() => {

        toast.remove();

    }, 4000);

}