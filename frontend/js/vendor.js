// ==================================================
// VENDOR REGISTRATION & ONBOARDING JAVASCRIPT
// ==================================================

const API_BASE_URL = "http://127.0.0.1:8000";

let isCorrectionMode = false;
let editingVendorId = null;

document.addEventListener("DOMContentLoaded", () => {
    initOnboardingForm();
    checkEditOrCorrectionMode();
});

function initOnboardingForm() {
    const form = document.getElementById("vendorRegistrationForm");
    if (!form) return;

    form.addEventListener("submit", handleFormSubmit);

    // Auto-uppercase inputs
    const panInput = document.getElementById("pan");
    if (panInput) {
        panInput.addEventListener("input", e => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    const gstinInput = document.getElementById("gstin");
    if (gstinInput) {
        gstinInput.addEventListener("input", e => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    const ifscInput = document.getElementById("bank_ifsc");
    if (ifscInput) {
        ifscInput.addEventListener("input", e => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

async function checkEditOrCorrectionMode() {
    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get("id") || params.get("vendor_id");
    if (!vendorId) return;

    editingVendorId = parseInt(vendorId, 10);
    if (isNaN(editingVendorId)) return;

    try {
        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        const res = await fetch(`${API_BASE_URL}/vendors/${editingVendorId}`, { headers });
        if (!res.ok) return;

        const vendor = await res.json();
        if (!vendor || vendor.error) return;

        isCorrectionMode = vendor.status === "Correction Requested" || vendor.status === "Pending Verification";
        document.getElementById("vendor_id_input").value = vendor.id;

        // Populate fields
        document.getElementById("vendor_name").value = vendor.vendor_name || "";
        document.getElementById("company_type").value = vendor.company_type || "";
        document.getElementById("pan").value = vendor.pan || "";
        document.getElementById("gstin").value = vendor.gstin || "";
        document.getElementById("cin").value = vendor.cin || "";
        document.getElementById("msme_number").value = vendor.msme_number || "";

        document.getElementById("address").value = vendor.address || "";
        document.getElementById("city").value = vendor.city || "";
        document.getElementById("state").value = vendor.state || "";
        document.getElementById("pin_code").value = vendor.pin_code || "";
        document.getElementById("contact_person").value = vendor.contact_person || vendor.contact_name || "";
        document.getElementById("email").value = vendor.email || "";
        document.getElementById("phone").value = vendor.phone || "";

        if (vendor.category) {
            const catSelect = document.getElementById("category");
            catSelect.value = vendor.category;
        }
        document.getElementById("products_services").value = vendor.products_services || "";
        document.getElementById("business_description").value = vendor.business_description || "";

        document.getElementById("bank_account_name").value = vendor.bank_account_name || "";
        document.getElementById("bank_name").value = vendor.bank_name || "";
        document.getElementById("bank_account_number").value = vendor.bank_account_number || "";
        document.getElementById("bank_ifsc").value = vendor.bank_ifsc || "";
        document.getElementById("bank_branch").value = vendor.bank_branch || "";

        // Display existing document indicators
        if (vendor.doc_pan) {
            const h = document.getElementById("existing_doc_pan_hint");
            h.textContent = `Current file on record: ${vendor.doc_pan}`;
            h.style.display = "block";
            document.getElementById("doc_pan").removeAttribute("required");
        }
        if (vendor.doc_cancelled_cheque) {
            const h = document.getElementById("existing_doc_cheque_hint");
            h.textContent = `Current file on record: ${vendor.doc_cancelled_cheque}`;
            h.style.display = "block";
            document.getElementById("doc_cancelled_cheque").removeAttribute("required");
        }
        if (vendor.doc_gst) {
            const h = document.getElementById("existing_doc_gst_hint");
            h.textContent = `Current file on record: ${vendor.doc_gst}`;
            h.style.display = "block";
        }
        if (vendor.doc_incorporation) {
            const h = document.getElementById("existing_doc_incorp_hint");
            h.textContent = `Current file on record: ${vendor.doc_incorporation}`;
            h.style.display = "block";
        }
        if (vendor.doc_msme) {
            const h = document.getElementById("existing_doc_msme_hint");
            h.textContent = `Current file on record: ${vendor.doc_msme}`;
            h.style.display = "block";
        }

        // Show correction alert if applicable
        if (vendor.status === "Correction Requested" && vendor.correction_reason) {
            const banner = document.getElementById("correctionBanner");
            const text = document.getElementById("correctionMessageText");
            if (banner && text) {
                text.textContent = `Procurement Reviewer Note: "${vendor.correction_reason}". Please update the required fields or documents and click Resubmit.`;
                banner.style.display = "flex";
            }
            document.getElementById("btnSubmitForm").innerHTML = "<span>Resubmit Registration</span>";
            document.getElementById("pageTitle").textContent = "Resubmit Vendor Application";
            document.getElementById("formHeaderTitle").textContent = `Update Application - #${vendor.vendor_code || vendor.id}`;
        }
    } catch (e) {
        console.error("Error loading vendor for correction:", e);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("btnSubmitForm");
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Submitting application...</span>`;

    try {
        const form = document.getElementById("vendorRegistrationForm");
        const formData = new FormData(form);

        // Client-side quick checks
        const pan = (document.getElementById("pan").value || "").trim().toUpperCase();
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(pan)) {
            showToast("Invalid PAN format. Standard format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
            return;
        }

        const ifsc = (document.getElementById("bank_ifsc").value || "").trim().toUpperCase();
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) {
            showToast("Invalid IFSC format. Standard format: 4 letters, '0', 6 alphanumeric characters (e.g. SBIN0001234)", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
            return;
        }

        const token = typeof getToken === "function" ? getToken() : localStorage.getItem("access_token");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        let url = `${API_BASE_URL}/vendors/register`;
        let method = "POST";

        if (isCorrectionMode && editingVendorId) {
            url = `${API_BASE_URL}/vendors/${editingVendorId}/resubmit`;
            method = "PUT";
        }

        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: formData
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = result.detail || result.error || result.message || "Failed to submit vendor registration.";
            showToast(errorMsg, "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
            return;
        }

        // Show confirmation view
        document.getElementById("formWrapper").style.display = "none";
        const banner = document.getElementById("onboardingBanner");
        if (banner) banner.style.display = "none";
        const corrBanner = document.getElementById("correctionBanner");
        if (corrBanner) corrBanner.style.display = "none";

        const confCard = document.getElementById("confirmationCard");
        document.getElementById("confVendorName").textContent = document.getElementById("vendor_name").value;
        document.getElementById("confRefId").textContent = `#${result.vendor_id || result.id || "APP-REC"}`;
        document.getElementById("confEmail").textContent = document.getElementById("email").value;
        document.getElementById("confPan").textContent = pan;

        confCard.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        showToast("Vendor registration submitted! Status: Pending Verification.", "success");

    } catch (err) {
        console.error("Submission error:", err);
        showToast("Failed to connect to the server. Please check your connection.", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
}
