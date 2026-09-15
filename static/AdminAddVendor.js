/* ============================================================
   ADMIN ADD VENDOR
   3-STEP VENDOR REGISTRATION
   ============================================================ */


/* ============================================================
   API CONFIGURATION
   ============================================================ */

const API = window.location.origin;


/*
    STEP 2:
    Register vendor details and generate Vendor ID.

    STEP 3:
    Create password for generated Vendor ID.
*/

const REGISTER_VENDOR_API =
    `${API}/api/admin/vendors/register`;

const CREATE_ACCOUNT_API =
    `${API}/api/admin/vendors/create-account`;



/* ============================================================
   GLOBAL VARIABLES
   ============================================================ */

let currentStep = 1;

let generatedVendorId = null;

let vendorRegistered = false;


function getAuthHeaders() {

    /*
       VendorIQ supports multiple authentication
       storage keys across the different dashboards.
    */

    const token =
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt_token");


    if (!token) {

        console.error(
            "No Admin JWT found in sessionStorage or localStorage."
        );

        throw new Error(
            "Admin login session expired. Please log in again."
        );

    }


    console.log(
        "Admin JWT found. Length:",
        token.length
    );


    return {

        "Content-Type":
            "application/json",

        "Accept":
            "application/json",

        "Authorization":
            `Bearer ${token}`

    };

}


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const form =
    document.getElementById("adminVendorForm");

const step1 =
    document.getElementById("step1");

const step2 =
    document.getElementById("step2");

const step3 =
    document.getElementById("step3");

const stepIndicator1 =
    document.getElementById("stepIndicator1");

const stepIndicator2 =
    document.getElementById("stepIndicator2");

const stepIndicator3 =
    document.getElementById("stepIndicator3");

const nextStepBtn =
    document.getElementById("nextStepBtn");

const backStepBtn =
    document.getElementById("backStepBtn");

const backToReviewBtn =
    document.getElementById("backToReviewBtn");

const registerVendorBtn =
    document.getElementById("registerVendorBtn");

const createAccountBtn =
    document.getElementById("createAccountBtn");

const message =
    document.getElementById("message");

const accountMessage =
    document.getElementById("accountMessage");



/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupPasswordToggle(
            "password",
            "togglePassword"
        );

        setupPasswordToggle(
            "confirm_password",
            "toggleConfirmPassword"
        );

        setupEventListeners();

        updateSteps();

    }
);



/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupEventListeners() {

    /*
        STEP 1 -> STEP 2
    */

    if (nextStepBtn) {

        nextStepBtn.addEventListener(
            "click",
            function () {

                if (!validateStep1()) {

                    return;

                }

                populateReview();

                showStep(2);

            }
        );

    }


    /*
        STEP 2 -> STEP 1
    */

    if (backStepBtn) {

        backStepBtn.addEventListener(
            "click",
            function () {

                showStep(1);

            }
        );

    }


    /*
        REGISTER VENDOR
    */

    if (registerVendorBtn) {

        registerVendorBtn.addEventListener(
            "click",
            registerVendor
        );

    }


    /*
        STEP 3 -> STEP 2
    */

    if (backToReviewBtn) {

        backToReviewBtn.addEventListener(
            "click",
            function () {

                if (vendorRegistered) {

                    /*
                        Vendor has already been registered.

                        We allow going back to review,
                        but do not register it again.
                    */

                    showStep(2);

                } else {

                    showStep(2);

                }

            }
        );

    }


    /*
        CREATE ACCOUNT
    */

    if (form) {

        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                createAccount();

            }
        );

    }

}



/* ============================================================
   SHOW STEP
   ============================================================ */

function showStep(stepNumber) {

    currentStep = stepNumber;


    /*
        Hide all steps
    */

    if (step1) {

        step1.classList.remove("active");

    }

    if (step2) {

        step2.classList.remove("active");

    }

    if (step3) {

        step3.classList.remove("active");

    }


    /*
        Show selected step
    */

    if (stepNumber === 1 && step1) {

        step1.classList.add("active");

    }

    if (stepNumber === 2 && step2) {

        step2.classList.add("active");

    }

    if (stepNumber === 3 && step3) {

        step3.classList.add("active");

    }


    updateSteps();


    /*
        Scroll to top of form
    */

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}



/* ============================================================
   UPDATE PROGRESS INDICATORS
   ============================================================ */

function updateSteps() {

    const indicators = [
        stepIndicator1,
        stepIndicator2,
        stepIndicator3
    ];


    indicators.forEach(
        function (indicator, index) {

            if (!indicator) {

                return;

            }

            const stepNumber = index + 1;

            indicator.classList.remove(
                "active",
                "completed"
            );


            if (stepNumber < currentStep) {

                indicator.classList.add(
                    "completed"
                );

            }


            if (stepNumber === currentStep) {

                indicator.classList.add(
                    "active"
                );

            }

        }
    );


    /*
        Update connecting lines
    */

    const lines =
        document.querySelectorAll(
            ".step-line"
        );


    lines.forEach(
        function (line, index) {

            line.classList.remove(
                "completed"
            );


            if (index < currentStep - 1) {

                line.classList.add(
                    "completed"
                );

            }

        }
    );

}



/* ============================================================
   STEP 1 VALIDATION
   ============================================================ */

function validateStep1() {

    const fields = [
        "vendor_name",
        "country",
        "business_type",
        "category",
        "email",
        "phone",
        "address"
    ];


    let valid = true;


    fields.forEach(
        function (fieldId) {

            const field =
                document.getElementById(fieldId);

            if (!field) {

                return;

            }


            field.classList.remove(
                "invalid"
            );


            if (!field.value.trim()) {

                field.classList.add(
                    "invalid"
                );

                valid = false;

            }

        }
    );


    /*
        Validate email
    */

    const email =
        document.getElementById("email");


    if (
        email &&
        email.value.trim()
    ) {

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
            !emailPattern.test(
                email.value.trim()
            )
        ) {

            email.classList.add(
                "invalid"
            );

            valid = false;

        }

    }


    if (!valid) {

        showMessage(
            message,
            "Please complete all required vendor details.",
            "error"
        );

        return false;

    }


    hideMessage(message);

    return true;

}



/* ============================================================
   POPULATE REVIEW
   ============================================================ */

function populateReview() {

    setReviewValue(
        "reviewVendorName",
        getValue("vendor_name")
    );

    setReviewValue(
        "reviewCountry",
        getValue("country")
    );

    setReviewValue(
        "reviewBusinessType",
        getSelectedText("business_type")
    );

    setReviewValue(
        "reviewCategory",
        getSelectedText("category")
    );

    setReviewValue(
        "reviewContactPerson",
        getValue("contact_person") || "Not provided"
    );

    setReviewValue(
        "reviewEmail",
        getValue("email")
    );

    setReviewValue(
        "reviewPhone",
        getValue("phone")
    );

    setReviewValue(
        "reviewAddress",
        getValue("address")
    );

}



/* ============================================================
   GET INPUT VALUE
   ============================================================ */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        return "";

    }


    return element.value.trim();

}



/* ============================================================
   GET SELECTED OPTION TEXT
   ============================================================ */

function getSelectedText(id) {

    const select =
        document.getElementById(id);


    if (!select) {

        return "";

    }


    const option =
        select.options[
            select.selectedIndex
        ];


    if (!option) {

        return "";

    }


    return option.text.trim();

}



/* ============================================================
   SET REVIEW VALUE
   ============================================================ */

function setReviewValue(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {

        return;

    }


    element.textContent =
        value || "—";

}



/* ============================================================
   COLLECT VENDOR DETAILS
   ============================================================ */

function collectVendorDetails() {

    return {
        vendor_name:
            document.getElementById("vendor_name").value.trim(),

        country:
            document.getElementById("country").value,

        business_type:
            document.getElementById("business_type").value,

        category:
            document.getElementById("category").value,

        contact_person:
            document.getElementById("contact_person").value.trim(),

        email:
            document.getElementById("email").value.trim(),

        phone:
            document.getElementById("phone").value.trim(),

        address:
            document.getElementById("address").value.trim()
    };
}


function validateStep2() {

    const vendorName =
        document.getElementById(
            "vendor_name"
        ).value.trim();

    const country =
        document.getElementById(
            "country"
        ).value;

    const businessType =
        document.getElementById(
            "business_type"
        ).value;

    const category =
        document.getElementById(
            "category"
        ).value;

    const email =
        document.getElementById(
            "email"
        ).value.trim();

    const phone =
        document.getElementById(
            "phone"
        ).value.trim();

    const address =
        document.getElementById(
            "address"
        ).value.trim();


    if (!vendorName) {

        showMessage(
            "Vendor name is required.",
            "error"
        );

        return false;

    }


    if (!country) {

        showMessage(
            "Country is required.",
            "error"
        );

        return false;

    }


    if (!businessType) {

        showMessage(
            "Business type is required.",
            "error"
        );

        return false;

    }


    if (!category) {

        showMessage(
            "Category is required.",
            "error"
        );

        return false;

    }


    if (!email) {

        showMessage(
            "Email address is required.",
            "error"
        );

        return false;

    }


    if (!phone) {

        showMessage(
            "Phone number is required.",
            "error"
        );

        return false;

    }


    if (!address) {

        showMessage(
            "Address is required.",
            "error"
        );

        return false;

    }


    return true;
}


/* ============================================================
   REGISTER VENDOR
   ============================================================ */

async function registerVendor() {

    const registerButton =
        document.getElementById(
            "registerVendorBtn"
        );


    try {

        /* ======================================================
           VALIDATE STEP 2
        ====================================================== */

        if (!validateStep2()) {

            return;

        }


        /* ======================================================
           COLLECT VENDOR DETAILS
        ====================================================== */

        const vendorData =
            collectVendorDetails();


        console.log(
            "=========================================="
        );

        console.log(
            "ADMIN VENDOR REGISTRATION"
        );

        console.log(
            "Vendor data:",
            vendorData
        );

        console.log(
            "API:",
            REGISTER_VENDOR_API
        );

        console.log(
            "=========================================="
        );


        /* ======================================================
           SHOW LOADING
        ====================================================== */

        if (registerButton) {

            registerButton.disabled =
                true;

            registerButton.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Registering...
                `;

        }


        /* ======================================================
           GET ADMIN JWT
           IMPORTANT:
           Use the centralized authentication function.
        ====================================================== */

        const headers =
            getAuthHeaders();


        console.log(
            "Authorization header prepared:",
            !!headers.Authorization
        );


        /* ======================================================
           REGISTER VENDOR
        ====================================================== */

        const response =
            await fetch(
                REGISTER_VENDOR_API,
                {

                    method: "POST",

                    headers: headers,

                    body:
                        JSON.stringify(
                            vendorData
                        )

                }
            );


        /* ======================================================
           PARSE RESPONSE SAFELY
        ====================================================== */

        const data =
            await parseResponse(
                response
            );


        console.log(
            "Register vendor response:",
            response.status,
            data
        );


        /* ======================================================
           401 - ADMIN AUTHENTICATION
        ====================================================== */

        if (response.status === 401) {

            console.error(
                "Admin JWT rejected by FastAPI:",
                data
            );

            throw new Error(
                data.detail ||
                "Admin login session expired. Please log in again."
            );

        }


        /* ======================================================
           403 - ADMIN AUTHORIZATION
        ====================================================== */

        if (response.status === 403) {

            console.error(
                "Admin authorization failed:",
                data
            );

            throw new Error(
                data.detail ||
                "You do not have permission to register vendors."
            );

        }


        /* ======================================================
           422 - VALIDATION ERROR
        ====================================================== */

        if (response.status === 422) {

            console.error(
                "Vendor registration validation error:",
                data
            );

            throw new Error(
                getApiErrorMessage(data)
            );

        }


        /* ======================================================
           OTHER ERRORS
        ====================================================== */

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(data)
            );

        }


        /* ======================================================
           GET PYTHON-GENERATED VENDOR ID
        ====================================================== */

        if (!data.vendor_id) {

            console.error(
                "Vendor registration response does not contain vendor_id:",
                data
            );

            throw new Error(
                "Vendor ID was not returned by the server."
            );

        }


        generatedVendorId =
            data.vendor_id;


        console.log(
            "Generated Vendor ID:",
            generatedVendorId
        );


        /* ======================================================
           DISPLAY GENERATED VENDOR ID
        ====================================================== */

        const generatedIdElement =
            document.getElementById(
                "generatedVendorId"
            );


        if (generatedIdElement) {

            generatedIdElement.textContent =
                generatedVendorId;

        }


        /* ======================================================
           DISPLAY LOGIN VENDOR ID
        ====================================================== */

        const loginVendorId =
            document.getElementById(
                "loginVendorId"
            );


        if (loginVendorId) {

            loginVendorId.textContent =
                generatedVendorId;

        }


        /* ======================================================
           MARK REGISTRATION COMPLETE
        ====================================================== */

        vendorRegistered =
            true;


        /* ======================================================
           MOVE TO STEP 3
        ====================================================== */

        showStep(3);


        /* ======================================================
           SUCCESS MESSAGE
        ====================================================== */

        showMessage(
            message,
            `Vendor ${generatedVendorId} registered successfully.`,
            "success"
        );


        console.log(
            "Vendor registered successfully:",
            generatedVendorId
        );

    }

    catch (error) {

        console.error(
            "Vendor registration error:",
            error
        );


        showMessage(
            message,
            error.message ||
            "Unable to register vendor.",
            "error"
        );

    }

    finally {

        if (registerButton) {

            registerButton.disabled =
                false;

            registerButton.innerHTML =
                `
                <i class="fa-solid fa-check"></i>
                Register Vendor
                `;

        }

    }

}



/* ============================================================
   CREATE ACCOUNT
   ============================================================ */

async function createAccount() {

    /*
        Vendor must already be registered
    */

    if (!vendorRegistered ||
        !generatedVendorId) {

        showMessage(
            accountMessage,
            "Please register the vendor first.",
            "error"
        );

        showStep(2);

        return;

    }


    const password =
        getValue("password");

    const confirmPassword =
        getValue("confirm_password");


    /*
        Clear previous invalid state
    */

    const passwordField =
        document.getElementById(
            "password"
        );

    const confirmPasswordField =
        document.getElementById(
            "confirm_password"
        );


    passwordField.classList.remove(
        "invalid"
    );

    confirmPasswordField.classList.remove(
        "invalid"
    );


    /*
        Password required
    */

    if (!password) {

        passwordField.classList.add(
            "invalid"
        );

        showMessage(
            accountMessage,
            "Please enter a password.",
            "error"
        );

        return;

    }


    /*
        Minimum password length
    */

    if (password.length < 8) {

        passwordField.classList.add(
            "invalid"
        );

        showMessage(
            accountMessage,
            "Password must contain at least 8 characters.",
            "error"
        );

        return;

    }


    /*
        Confirm password
    */

    if (!confirmPassword) {

        confirmPasswordField.classList.add(
            "invalid"
        );

        showMessage(
            accountMessage,
            "Please confirm the password.",
            "error"
        );

        return;

    }


    /*
        Compare passwords
    */

    if (password !== confirmPassword) {

        passwordField.classList.add(
            "invalid"
        );

        confirmPasswordField.classList.add(
            "invalid"
        );

        showMessage(
            accountMessage,
            "Passwords do not match.",
            "error"
        );

        return;

    }


    /*
        Prepare account data
    */

    const accountData = {

        vendor_id:
            generatedVendorId,

        password:
            password

    };


    /*
        Disable button
    */

    setButtonLoading(
        createAccountBtn,
        true,
        "Creating Account..."
    );


    hideMessage(accountMessage);


    try {

        const response =
            await fetch(
                CREATE_ACCOUNT_API,
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify(accountData)
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(data)
            );

        }


        /*
            Account created successfully
        */

        showMessage(
            accountMessage,
            "Vendor account created successfully. Vendor ID: " +
                generatedVendorId,
            "success"
        );


        /*
            Disable account creation
        */

        createAccountBtn.disabled =
            true;


        /*
            Clear passwords
        */

        passwordField.value = "";

        confirmPasswordField.value = "";


        /*
            Optional redirect after success
        */

        setTimeout(
            function () {

                window.location.href =
                    "/VendorManagement";

            },
            1800
        );


    } catch (error) {

        console.error(
            "Account creation error:",
            error
        );


        showMessage(
            accountMessage,
            error.message ||
                "Unable to create vendor account.",
            "error"
        );

    } finally {

        if (
            createAccountBtn &&
            !createAccountBtn.disabled
        ) {

            setButtonLoading(
                createAccountBtn,
                false,
                "Create Account"
            );

        }

    }

}



/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

function setupPasswordToggle(
    inputId,
    buttonId
) {

    const input =
        document.getElementById(
            inputId
        );

    const button =
        document.getElementById(
            buttonId
        );


    if (!input || !button) {

        return;

    }


    button.addEventListener(
        "click",
        function () {

            const icon =
                button.querySelector("i");


            if (
                input.type ===
                "password"
            ) {

                input.type = "text";


                if (icon) {

                    icon.classList.remove(
                        "fa-eye"
                    );

                    icon.classList.add(
                        "fa-eye-slash"
                    );

                }

            } else {

                input.type =
                    "password";


                if (icon) {

                    icon.classList.remove(
                        "fa-eye-slash"
                    );

                    icon.classList.add(
                        "fa-eye"
                    );

                }

            }

        }
    );

}



/* ============================================================
   API RESPONSE PARSER
   ============================================================ */

async function parseResponse(response) {

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        return await response.json();

    }


    const text =
        await response.text();


    /*
        This helps identify the common
        FastAPI/HTML response problem.
    */

    if (
        text.trim().startsWith(
            "<!"
        ) ||
        text.trim().startsWith(
            "<html"
        )
    ) {

        throw new Error(
            `Server returned HTML instead of JSON (HTTP ${response.status}). Check the API URL.`
        );

    }


    return {

        detail:
            text ||
            `HTTP ${response.status}`

    };

}



/* ============================================================
   API ERROR MESSAGE
   ============================================================ */

function getApiErrorMessage(data) {

    if (!data) {

        return "Unknown server error.";

    }


    /*
        FastAPI validation errors
    */

    if (
        Array.isArray(
            data.detail
        )
    ) {

        return data.detail
            .map(
                function (error) {

                    if (
                        typeof error ===
                        "string"
                    ) {

                        return error;

                    }

                    return (
                        error.msg ||
                        "Validation error"
                    );

                }
            )
            .join(", ");

    }


    if (
        typeof data.detail ===
        "string"
    ) {

        return data.detail;

    }


    if (
        typeof data.message ===
        "string"
    ) {

        return data.message;

    }


    return "Request failed.";

}



/* ============================================================
   MESSAGE DISPLAY
   ============================================================ */

function showMessage(
    element,
    text,
    type
) {

    if (!element) {

        return;

    }


    element.textContent =
        text;


    element.className =
        "message show " + type;

}



/* ============================================================
   HIDE MESSAGE
   ============================================================ */

function hideMessage(element) {

    if (!element) {

        return;

    }


    element.textContent = "";

    element.className =
        "message";

}



/* ============================================================
   BUTTON LOADING
   ============================================================ */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button) {

        return;

    }


    if (loading) {

        button.disabled = true;

        button.dataset.originalText =
            button.innerHTML;


        button.innerHTML =
            `
                <span class="spinner"></span>
                ${text}
            `;

    } else {

        button.disabled = false;

        button.innerHTML =
            button.dataset.originalText ||
            text;

    }

}



/* ============================================================
   GO BACK TO VENDOR MANAGEMENT
   ============================================================ */

function goBack() {

    /*
        Ask for confirmation if
        the user has entered data.
    */

    const vendorName =
        getValue("vendor_name");


    const email =
        getValue("email");


    if (
        vendorName ||
        email ||
        vendorRegistered
    ) {

        const confirmed =
            window.confirm(
                "Are you sure you want to leave? Unsaved vendor information will be lost."
            );


        if (!confirmed) {

            return;

        }

    }


    window.location.href =
        "/VendorManagement";

}



/* ============================================================
   CLEAR INVALID STATE WHILE TYPING
   ============================================================ */

document.addEventListener(
    "input",
    function (event) {

        const target =
            event.target;


        if (
            target.matches(
                "input, textarea, select"
            )
        ) {

            target.classList.remove(
                "invalid"
            );

        }

    }
);