/* ============================================================
   VENDOR REGISTRATION JAVASCRIPT
   ============================================================ */


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const registrationForm =
    document.getElementById("registrationForm");


/* ============================================================
   VENDOR INFORMATION
   ============================================================ */

const companyName =
    document.getElementById("companyName");

const contactPerson =
    document.getElementById("contactPerson");

const country =
    document.getElementById("country");

const email =
    document.getElementById("email");

const phone =
    document.getElementById("phone");

const businessType =
    document.getElementById("businessType");

const category =
    document.getElementById("category");

const address =
    document.getElementById("address");


/* ============================================================
   VENDOR ID AND PASSWORD
   ============================================================ */

/*
   IMPORTANT:
   Use passwordInput instead of password.

   This prevents:
   "Identifier 'password' has already been declared"
*/

const vendorId =
    document.getElementById("vendorId");

const passwordInput =
    document.getElementById("password");

const passwordSection =
    document.getElementById("passwordSection");


/* ============================================================
   MESSAGES
   ============================================================ */

const vendorIdMessage =
    document.getElementById("vendorIdMessage");

const message =
    document.getElementById("message");


/* ============================================================
   BUTTONS
   ============================================================ */

const vendorLoginButton =
    document.getElementById("vendorLoginBtn");

const registerButton =
    document.getElementById("registerButton");

const createAccountButton =
    document.getElementById("createAccountButton");


/* ============================================================
   STATE
   ============================================================ */

let generatedVendorId = null;

let vendorIdGenerated = false;

let registrationCompleted = false;


/* ============================================================
   INITIAL PAGE STATE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           Vendor ID initially empty.
        */

        if (vendorId) {

            vendorId.value = "";

        }


        /*
           Password section hidden initially.
        */

        if (passwordSection) {

            passwordSection.style.display =
                "none";

        }


        /*
           Create Account button hidden initially.
        */

        if (createAccountButton) {

            createAccountButton.style.display =
                "none";

        }


        /*
           Login button hidden initially.
        */

        const loginContainer =
            document.querySelector(
                ".login-button"
            );

        if (loginContainer) {

            loginContainer.style.display =
                "none";

        }


        /*
           Clear messages.
        */

        if (vendorIdMessage) {

            vendorIdMessage.style.display =
                "none";

            vendorIdMessage.innerHTML =
                "";

        }


        if (message) {

            message.textContent =
                "";

        }

    }
);


/* ============================================================
   VALIDATE VENDOR DETAILS
   ============================================================ */

function validateVendorDetails() {

    /* --------------------------------------------------------
       COMPANY NAME
       -------------------------------------------------------- */

    const company =
        companyName
            ? companyName.value.trim()
            : "";


    if (company.length < 2) {

        showError(
            "Please enter a valid company name."
        );

        if (companyName) {

            companyName.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       CONTACT PERSON
       -------------------------------------------------------- */

    const contact =
        contactPerson
            ? contactPerson.value.trim()
            : "";


    if (
        contact.length > 0 &&
        contact.length < 2
    ) {

        showError(
            "Please enter a valid contact person name."
        );

        if (contactPerson) {

            contactPerson.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       COUNTRY
       -------------------------------------------------------- */

    const selectedCountry =
        country
            ? country.value.trim()
            : "";


    if (selectedCountry.length < 2) {

        showError(
            "Please select a country."
        );

        if (country) {

            country.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       EMAIL
       -------------------------------------------------------- */

    const vendorEmail =
        email
            ? email.value.trim()
            : "";


    if (vendorEmail.length === 0) {

        showError(
            "Please enter your email address."
        );

        if (email) {

            email.focus();

        }

        return false;

    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(vendorEmail)) {

        showError(
            "Please enter a valid email address."
        );

        if (email) {

            email.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       PHONE
       -------------------------------------------------------- */

    const vendorPhone =
        phone
            ? phone.value.trim()
            : "";


    if (vendorPhone.length < 5) {

        showError(
            "Please enter a valid phone number."
        );

        if (phone) {

            phone.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       BUSINESS TYPE
       -------------------------------------------------------- */

    const type =
        businessType
            ? businessType.value.trim()
            : "";


    if (type.length < 2) {

        showError(
            "Please select a business type."
        );

        if (businessType) {

            businessType.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       CATEGORY
       -------------------------------------------------------- */

    const vendorCategory =
        category
            ? category.value.trim()
            : "";


    if (vendorCategory.length > 100) {

        showError(
            "Vendor category cannot exceed 100 characters."
        );

        if (category) {

            category.focus();

        }

        return false;

    }


    /* --------------------------------------------------------
       ADDRESS
       -------------------------------------------------------- */

    const vendorAddress =
        address
            ? address.value.trim()
            : "";


    if (vendorAddress.length < 2) {

        showError(
            "Please enter the business address."
        );

        if (address) {

            address.focus();

        }

        return false;

    }


    return true;

}


/* ============================================================
   STEP 1
   GENERATE VENDOR ID
   ============================================================ */

async function generateVendorId() {

    /*
       Prevent duplicate generation.
    */

    if (vendorIdGenerated) {

        showError(
            "Vendor ID has already been generated."
        );

        return;

    }


    /*
       Validate all vendor details.
    */

    if (!validateVendorDetails()) {

        return;

    }


    /*
       Disable Register button.
    */

    if (registerButton) {

        registerButton.disabled =
            true;

        registerButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> ' +
            'Generating Vendor ID...';

    }


    clearMessages();


    try {

        /* ----------------------------------------------------
           BUILD REGISTRATION DATA
           ---------------------------------------------------- */

        const registrationData = {

            vendor_name:
                companyName.value.trim(),

            contact_person:
                contactPerson
                    ? contactPerson.value.trim()
                    : "",

            country:
                country.value.trim(),

            email:
                email.value.trim(),

            phone:
                phone.value.trim(),

            business_type:
                businessType.value.trim(),

            category:
                category
                    ? category.value.trim()
                    : "",

            address:
                address.value.trim()

        };


        console.log(
            "Generating Vendor ID with:",
            registrationData
        );


        /* ----------------------------------------------------
           CALL FASTAPI
           ---------------------------------------------------- */

        const response =
            await fetch(
                "/api/vendor/generate-id",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            registrationData
                        )
                }
            );


        /* ----------------------------------------------------
           READ RESPONSE
           ---------------------------------------------------- */

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            console.error(
                "Server returned non-JSON response:",
                text
            );

            throw new Error(
                "Server returned an unexpected response. " +
                "Please check the FastAPI route."
            );

        }


        /* ----------------------------------------------------
           HANDLE ERROR
           ---------------------------------------------------- */

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Unable to generate Vendor ID."
                )
            );

        }


        /* ----------------------------------------------------
           CHECK VENDOR ID
           ---------------------------------------------------- */

        if (!data.vendor_id) {

            throw new Error(
                "Server did not return a Vendor ID."
            );

        }


        /* ====================================================
           SUCCESS
           ==================================================== */

        generatedVendorId =
            data.vendor_id;

        vendorIdGenerated =
            true;


        /* ----------------------------------------------------
           DISPLAY VENDOR ID
           ---------------------------------------------------- */

        if (vendorId) {

            vendorId.value =
                generatedVendorId;

        }


        /* ----------------------------------------------------
           SUCCESS MESSAGE
           ---------------------------------------------------- */

        if (vendorIdMessage) {

            vendorIdMessage.style.display =
                "block";

            vendorIdMessage.innerHTML =
                "✅ <strong>Vendor ID Generated!</strong><br>" +
                "Your Vendor ID: <strong>" +
                escapeHtml(
                    generatedVendorId
                ) +
                "</strong>";

        }


        /* ----------------------------------------------------
           SHOW PASSWORD SECTION
           ---------------------------------------------------- */

        if (passwordSection) {

            passwordSection.style.display =
                "flex";

        }


        /* ----------------------------------------------------
           SHOW CREATE ACCOUNT BUTTON
           ---------------------------------------------------- */

        if (createAccountButton) {

            createAccountButton.style.display =
                "block";

            createAccountButton.disabled =
                false;

            createAccountButton.innerHTML =
                '<i class="fa-solid fa-circle-check"></i> ' +
                'Create Vendor Account';

        }


        /* ----------------------------------------------------
           UPDATE REGISTER BUTTON
           ---------------------------------------------------- */

        if (registerButton) {

            registerButton.innerHTML =
                '<i class="fa-solid fa-check"></i> ' +
                'Vendor ID Generated';

            registerButton.disabled =
                true;

        }


        /* ----------------------------------------------------
           FOCUS PASSWORD
           ---------------------------------------------------- */

        if (passwordInput) {

            setTimeout(
                function () {

                    passwordInput.focus();

                },
                300
            );

        }


        showSuccess(
            "Vendor ID generated successfully."
        );


    } catch (error) {

        console.error(
            "Vendor ID generation error:",
            error
        );


        showError(
            error.message ||
            "Unable to generate Vendor ID."
        );


        /* ----------------------------------------------------
           ALLOW RETRY
           ---------------------------------------------------- */

        if (registerButton) {

            registerButton.disabled =
                false;

            registerButton.innerHTML =
                '<i class="fa-solid fa-user-plus"></i> ' +
                'Register Vendor';

        }

    }

}


/* ============================================================
   STEP 2
   CREATE VENDOR ACCOUNT
   ============================================================ */

async function createVendorAccount() {

    /* --------------------------------------------------------
       CHECK VENDOR ID
       -------------------------------------------------------- */

    if (
        !vendorIdGenerated ||
        !generatedVendorId
    ) {

        showError(
            "Please generate your Vendor ID first."
        );

        return;

    }


    /* --------------------------------------------------------
       GET PASSWORD
       -------------------------------------------------------- */

    const vendorPassword =
        passwordInput
            ? passwordInput.value
            : "";


    /* --------------------------------------------------------
       PASSWORD VALIDATION
       -------------------------------------------------------- */

    if (!vendorPassword) {

        showError(
            "Please create a password."
        );

        if (passwordInput) {

            passwordInput.focus();

        }

        return;

    }


    if (vendorPassword.length < 6) {

        showError(
            "Password must contain at least 6 characters."
        );

        if (passwordInput) {

            passwordInput.focus();

        }

        return;

    }


    if (vendorPassword.length > 100) {

        showError(
            "Password cannot exceed 100 characters."
        );

        if (passwordInput) {

            passwordInput.focus();

        }

        return;

    }


    /* --------------------------------------------------------
       DISABLE CREATE ACCOUNT BUTTON
       -------------------------------------------------------- */

    if (createAccountButton) {

        createAccountButton.disabled =
            true;

        createAccountButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> ' +
            'Creating Account...';

    }


    clearMessages();


    try {

        /* ====================================================
           BUILD COMPLETE REGISTRATION DATA
           ==================================================== */

        /*
           IMPORTANT CHANGE:

           Your FastAPI error was:

               vendor_name: Field required

           Therefore the registration endpoint must receive
           vendor_name, not company_name.

           company_name is converted to vendor_name here.
        */

        const registrationData = {

            vendor_id:
                generatedVendorId,

            vendor_name:
                companyName.value.trim(),

            contact_person:
                contactPerson
                    ? contactPerson.value.trim()
                    : "",

            country:
                country.value.trim(),

            email:
                email.value.trim(),

            phone:
                phone.value.trim(),

            business_type:
                businessType.value.trim(),

            category:
                category
                    ? category.value.trim()
                    : "",

            address:
                address.value.trim(),

            password:
                vendorPassword

        };


        console.log(
            "Creating vendor account:",
            {
                ...registrationData,

                password:
                    "***"
            }
        );


        /* ====================================================
           SEND REQUEST TO FASTAPI
           ==================================================== */

        const response =
            await fetch(
                "/api/vendor/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            registrationData
                        )
                }
            );


        /* ====================================================
           READ RESPONSE
           ==================================================== */

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();

            console.error(
                "Server returned non-JSON response:",
                text
            );

            throw new Error(
                "Server returned an unexpected response. " +
                "Please check the FastAPI registration route."
            );

        }


        /* ====================================================
           HANDLE API ERRORS
           ==================================================== */

        if (!response.ok) {

            throw new Error(
                getApiErrorMessage(
                    data,
                    "Vendor registration failed."
                )
            );

        }


        /* ====================================================
           REGISTRATION SUCCESSFUL
           ==================================================== */

        registrationCompleted =
            true;


        const successVendorId =
            data.vendor_id ||
            generatedVendorId;


        /* ----------------------------------------------------
           KEEP VENDOR ID VISIBLE
           ---------------------------------------------------- */

        if (vendorId) {

            vendorId.value =
                successVendorId;

        }


        /* ----------------------------------------------------
           DISPLAY SUCCESS
           ---------------------------------------------------- */

        if (vendorIdMessage) {

            vendorIdMessage.style.display =
                "block";

            vendorIdMessage.innerHTML =
                "✅ <strong>Registration Successful!</strong><br><br>" +

                "Your Vendor ID: <strong>" +

                escapeHtml(
                    successVendorId
                ) +

                "</strong><br><br>" +

                "Your vendor account has been created successfully.";

        }


        /* ----------------------------------------------------
           HIDE PASSWORD
           ---------------------------------------------------- */

        if (passwordSection) {

            passwordSection.style.display =
                "none";

        }


        /* ----------------------------------------------------
           HIDE CREATE ACCOUNT BUTTON
           ---------------------------------------------------- */

        if (createAccountButton) {

            createAccountButton.style.display =
                "none";

        }


        /* ----------------------------------------------------
           SHOW LOGIN BUTTON
           ---------------------------------------------------- */

        const loginContainer =
            document.querySelector(
                ".login-button"
            );


        if (loginContainer) {

            loginContainer.style.display =
                "block";

        }


        /* ----------------------------------------------------
           DISABLE VENDOR FIELDS
           ---------------------------------------------------- */

        disableVendorFields();


        /* ----------------------------------------------------
           CLEAR PASSWORD
           ---------------------------------------------------- */

        if (passwordInput) {

            passwordInput.value =
                "";

        }


        showSuccess(
            "Vendor account created successfully."
        );


    } catch (error) {

        console.error(
            "Vendor registration error:",
            error
        );


        showError(
            error.message ||
            "Unable to create vendor account."
        );


        /* ----------------------------------------------------
           ALLOW RETRY
           ---------------------------------------------------- */

        if (createAccountButton) {

            createAccountButton.disabled =
                false;

            createAccountButton.innerHTML =
                '<i class="fa-solid fa-circle-check"></i> ' +
                'Create Vendor Account';

        }

    }

}


/* ============================================================
   DISABLE VENDOR FIELDS
   ============================================================ */

function disableVendorFields() {

    const fields = [

        companyName,

        contactPerson,

        country,

        email,

        phone,

        businessType,

        category,

        address

    ];


    fields.forEach(
        function (field) {

            if (field) {

                field.disabled =
                    true;

            }

        }
    );


    /*
       Vendor ID remains readable.
    */

    if (vendorId) {

        vendorId.disabled =
            false;

        vendorId.readOnly =
            true;

    }

}


/* ============================================================
   API ERROR HANDLER
   ============================================================ */

function getApiErrorMessage(
    data,
    defaultMessage
) {

    if (
        !data ||
        !data.detail
    ) {

        return defaultMessage;

    }


    /* --------------------------------------------------------
       FASTAPI VALIDATION ERRORS
       -------------------------------------------------------- */

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


                    if (
                        error.msg &&
                        error.loc
                    ) {

                        const location =
                            error.loc
                                .filter(
                                    function (item) {

                                        return (
                                            item !==
                                            "body"
                                        );

                                    }
                                )
                                .join(" → ");


                        return location
                            ? location +
                              ": " +
                              error.msg
                            : error.msg;

                    }


                    return (
                        error.msg ||
                        "Validation error."
                    );

                }
            )
            .join("\n");

    }


    /* --------------------------------------------------------
       NORMAL HTTP EXCEPTION
       -------------------------------------------------------- */

    if (
        typeof data.detail ===
        "string"
    ) {

        return data.detail;

    }


    /* --------------------------------------------------------
       OBJECT DETAIL
       -------------------------------------------------------- */

    if (
        typeof data.detail ===
        "object"
    ) {

        try {

            return JSON.stringify(
                data.detail
            );

        } catch (error) {

            return defaultMessage;

        }

    }


    return defaultMessage;

}


/* ============================================================
   CLEAR MESSAGES
   ============================================================ */

function clearMessages() {

    if (message) {

        message.textContent =
            "";

        message.style.color =
            "";

    }

}


/* ============================================================
   SUCCESS MESSAGE
   ============================================================ */

function showSuccess(text) {

    if (!message) {

        return;

    }


    message.textContent =
        text;

    message.style.color =
        "#16a34a";

}


/* ============================================================
   ERROR MESSAGE
   ============================================================ */

function showError(text) {

    if (!message) {

        alert(text);

        return;

    }


    message.textContent =
        text;

    message.style.color =
        "#dc2626";


    message.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value;


    return div.innerHTML;

}


/* ============================================================
   FORM SUBMIT
   ============================================================ */

if (registrationForm) {

    registrationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* ------------------------------------------------
               STEP 1
               ------------------------------------------------ */

            if (!vendorIdGenerated) {

                await generateVendorId();

                return;

            }


            /* ------------------------------------------------
               STEP 2
               ------------------------------------------------ */

            if (!registrationCompleted) {

                await createVendorAccount();

                return;

            }

        }
    );

}


/* ============================================================
   CREATE ACCOUNT BUTTON
   ============================================================ */

if (createAccountButton) {

    createAccountButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();

            await createVendorAccount();

        }
    );

}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

const togglePassword =
    document.getElementById("togglePassword");

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            const showing =
                passwordInput.type === "text";


            if (showing) {

                passwordInput.type =
                    "password";

                togglePassword.innerHTML =
                    '<i class="fa-solid fa-eye"></i>';

                togglePassword.setAttribute(
                    "aria-label",
                    "Show password"
                );

            } else {

                passwordInput.type =
                    "text";

                togglePassword.innerHTML =
                    '<i class="fa-solid fa-eye-slash"></i>';

                togglePassword.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            }

        }
    );

}


/* ============================================================
   LOGIN
   ============================================================ */

function goToLogin() {

    window.location.href =
        "/login";

}


/* ============================================================
   MAKE LOGIN AVAILABLE
   ============================================================ */

window.goToLogin =
    goToLogin;