// ============================================================
// VENDOR PROFILE JAVASCRIPT
// ============================================================

const API = "http://127.0.0.1:8000";


// ============================================================
// GET VENDOR ID
// ============================================================

// Your vendor login uses Vendor ID as username.
//
// Example:
// VND0000001

let vendorId =
    localStorage.getItem("vendor_id");


// ============================================================
// ELEMENT HELPER
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value ?? "-";

    }

}


// ============================================================
// LOAD VENDOR PROFILE
// ============================================================

async function loadVendorProfile() {

    try {

        const response =
            await fetch(
                `${API}/api/vendor/profile/${encodeURIComponent(vendorId)}`
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `API ${response.status}: ${errorText}`
            );

        }


        const vendor =
            await response.json();


        console.log(
            "Vendor profile:",
            vendor
        );


        // ====================================================
        // HEADER
        // ====================================================

        setText(
            "vendorName",
            vendor.vendor_name
        );

        setText(
            "vendorId",
            `Vendor ID: ${vendor.vendor_id}`
        );

        setText(
            "vendorEmail",
            vendor.email
        );

        setText(
            "vendorPhone",
            vendor.phone
        );

        setText(
            "vendorLocation",
            vendor.address
        );


        // ====================================================
        // COMPANY DETAILS
        // ====================================================

        setText(
            "businessType",
            vendor.business_type
        );

        setText(
            "category",
            vendor.category
        );

        setText(
            "contactPerson",
            vendor.contact_person
        );

        setText(
            "vendorStatus",
            vendor.status
        );


        // ====================================================
        // COMPANY INFORMATION
        // ====================================================

        setText(
            "infoVendorName",
            vendor.vendor_name
        );

        setText(
            "infoVendorId",
            vendor.vendor_id
        );

        setText(
            "infoBusinessType",
            vendor.business_type
        );

        setText(
            "infoCategory",
            vendor.category
        );

        setText(
            "infoCountry",
            vendor.country
        );

        setText(
            "infoAddress",
            vendor.address
        );

        setText(
            "infoEmail",
            vendor.email
        );

        setText(
            "infoPhone",
            vendor.phone
        );

        setText(
            "infoContactPerson",
            vendor.contact_person
        );


        // ====================================================
        // SIDEBAR
        // ====================================================

        setText(
            "sidebarVendorName",
            vendor.vendor_name
        );

        setText(
            "sidebarVendorId",
            `Vendor ID: ${vendor.vendor_id}`
        );


        // ====================================================
        // HEADER USER
        // ====================================================

        setText(
            "headerVendorName",
            vendor.vendor_name
        );


        // ====================================================
        // RELIABILITY
        // ====================================================

        const reliability =
            Number(
                vendor.reliability_score || 0
            );


        setText(
            "reliabilityScore",
            Math.round(reliability)
        );


        let reliabilityText =
            "Low Reliability";


        if (reliability >= 80) {

            reliabilityText =
                "High Reliability";

        }

        else if (reliability >= 60) {

            reliabilityText =
                "Moderate Reliability";

        }


        setText(
            "reliabilityText",
            reliabilityText
        );


        // ====================================================
        // PERFORMANCE
        // ====================================================

        const delivery =
            Number(
                vendor.delivery_score || 0
            );


        const quality =
            Number(
                vendor.quality_score || 0
            );


        const service =
            Number(
                vendor.service_score || 0
            );


        setText(
            "deliveryScore",
            `${delivery.toFixed(1)}%`
        );


        setText(
            "deliveryScore2",
            `${delivery.toFixed(1)}%`
        );


        setText(
            "qualityScore",
            `${quality.toFixed(1)} / 5`
        );


        setText(
            "serviceScore",
            `${service.toFixed(1)}%`
        );


        setText(
            "contractCount",
            vendor.contract_count || 0
        );


        setText(
            "contractCount2",
            vendor.contract_count || 0
        );


        setText(
            "contractTotal",
            vendor.contract_count || 0
        );


        // ====================================================
        // PROGRESS BARS
        // ====================================================

        const deliveryProgress =
            document.getElementById(
                "deliveryProgress"
            );


        const deliveryProgress2 =
            document.getElementById(
                "deliveryProgress2"
            );


        const qualityProgress =
            document.getElementById(
                "qualityProgress"
            );


        const serviceProgress =
            document.getElementById(
                "serviceProgress"
            );


        if (deliveryProgress) {

            deliveryProgress.style.width =
                `${Math.min(delivery, 100)}%`;

        }


        if (deliveryProgress2) {

            deliveryProgress2.style.width =
                `${Math.min(delivery, 100)}%`;

        }


        if (qualityProgress) {

            qualityProgress.style.width =
                `${Math.min(
                    (quality / 5) * 100,
                    100
                )}%`;

        }


        if (serviceProgress) {

            serviceProgress.style.width =
                `${Math.min(service, 100)}%`;

        }


        // ====================================================
        // PURCHASE ORDERS
        // ====================================================

        // Your current Vendor table does not contain
        // purchase-order count.

        setText(
            "purchaseOrders",
            "—"
        );

    }

    catch (error) {

        console.error(
            "Vendor profile loading error:",
            error
        );


        alert(
            "Unable to load vendor profile. Check the FastAPI server and Vendor ID."
        );

    }

}


// ============================================================
// EDIT PROFILE
// ============================================================

const editButton =
    document.getElementById(
        "editProfileBtn"
    );


const modal =
    document.getElementById(
        "editModal"
    );


const closeModal =
    document.getElementById(
        "closeModal"
    );


const cancelEdit =
    document.getElementById(
        "cancelEdit"
    );


if (editButton) {

    editButton.addEventListener(
        "click",
        openEditModal
    );

}


function openEditModal() {

    window.location.href="/EditVendorProfile"

}


function closeEditModal() {

    modal.classList.remove(
        "show"
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeEditModal
    );

}


if (cancelEdit) {

    cancelEdit.addEventListener(
        "click",
        closeEditModal
    );

}


// ============================================================
// UPDATE PROFILE
// ============================================================

const profileForm =
    document.getElementById(
        "profileForm"
    );


if (profileForm) {

    profileForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const updateData = {

                vendor_name:
                    document.getElementById(
                        "editVendorName"
                    ).value.trim(),

                country:
                    document.getElementById(
                        "editCountry"
                    ).value.trim(),

                email:
                    document.getElementById(
                        "editEmail"
                    ).value.trim(),

                phone:
                    document.getElementById(
                        "editPhone"
                    ).value.trim(),

                business_type:
                    document.getElementById(
                        "editBusinessType"
                    ).value.trim(),

                category:
                    document.getElementById(
                        "editCategory"
                    ).value.trim(),

                contact_person:
                    document.getElementById(
                        "editContactPerson"
                    ).value.trim(),

                address:
                    document.getElementById(
                        "editAddress"
                    ).value.trim()

            };


            try {

                const response =
                    await fetch(
                        `${API}/api/vendor/profile/${encodeURIComponent(vendorId)}`,
                        {

                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    updateData
                                )

                        }
                    );


                if (!response.ok) {

                    const error =
                        await response.json();

                    throw new Error(
                        JSON.stringify(
                            error
                        )
                    );

                }


                const updatedVendor =
                    await response.json();


                console.log(
                    "Updated vendor:",
                    updatedVendor
                );


                closeEditModal();


                await loadVendorProfile();


                alert(
                    "Vendor profile updated successfully."
                );

            }

            catch (error) {

                console.error(
                    "Vendor profile update error:",
                    error
                );


                alert(
                    "Failed to update vendor profile."
                );

            }

        }
    );

}


// ============================================================
// TABS
// ============================================================

document
    .querySelectorAll(".tab")
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                function() {

                    document
                        .querySelectorAll(".tab")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    this.classList.add(
                        "active"
                    );

                }
            );

        }
    );


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadVendorProfile();

    }
);