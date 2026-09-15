/* ============================================================
   VENDORIQ
   FORGOT / RESET PASSWORD
   USERS + VENDORS
   ============================================================ */

"use strict";


/* ============================================================
   API
   ============================================================ */

const API_BASE = "";

const SEND_OTP_URL =
    `${API_BASE}/api/password-reset/send-otp`;

const VERIFY_OTP_URL =
    `${API_BASE}/api/password-reset/verify-otp`;

const RESET_PASSWORD_URL =
    `${API_BASE}/api/password-reset/reset-password`;


/* ============================================================
   STATE
   ============================================================ */

let resetAccountType = null;
let resetIdentifier = "";
let resetMobile = "";

let resendTimer = null;
let resendSeconds = 60;


/* ============================================================
   DOM HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    initializePasswordReset();

});


function initializePasswordReset() {

    setupAccountForm();
    setupOtpForm();
    setupPasswordForm();
    setupPasswordToggles();

    showStep(1);

}


/* ============================================================
   STEP CONTROL
   ============================================================ */

function showStep(stepNumber) {

    const steps = [
        "mobileStep",
        "otpStep",
        "passwordStep",
        "successStep"
    ];

    steps.forEach((stepId) => {

        const element = getElement(stepId);

        if (!element) {
            return;
        }

        element.classList.remove("active");

        element.style.display = "none";
    });


    let activeStepId = null;

    switch (stepNumber) {

        case 1:
            activeStepId = "mobileStep";
            break;

        case 2:
            activeStepId = "otpStep";
            break;

        case 3:
            activeStepId = "passwordStep";
            break;

        case 4:
            activeStepId = "successStep";
            break;

        default:
            activeStepId = "mobileStep";
    }


    const activeElement =
        getElement(activeStepId);

    if (activeElement) {

        activeElement.style.display = "block";

        requestAnimationFrame(() => {
            activeElement.classList.add("active");
        });
    }
}


/* ============================================================
   MESSAGE HANDLING
   ============================================================ */

function showMessage(
    elementId,
    message,
    type = "error"
) {

    const element = getElement(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className = `form-message ${type}`;

    element.style.display = "block";
}


function clearMessage(elementId) {

    const element = getElement(elementId);

    if (!element) {
        return;
    }

    element.textContent = "";

    element.className = "form-message";

    element.style.display = "none";
}


/* ============================================================
   API ERROR MESSAGE
   ============================================================ */

async function getErrorMessage(response) {

    try {

        const data = await response.json();

        if (typeof data.detail === "string") {
            return data.detail;
        }

        if (Array.isArray(data.detail)) {

            return data.detail
                .map(error => {

                    if (typeof error === "string") {
                        return error;
                    }

                    return (
                        error.msg ||
                        "Invalid request."
                    );
                })
                .join(", ");
        }

        if (data.message) {
            return data.message;
        }

    } catch (error) {

        console.error(
            "Unable to parse API error:",
            error
        );
    }


    return (
        `Request failed with status ${response.status}.`
    );
}


/* ============================================================
   DETERMINE ACCOUNT TYPE
   ============================================================ */

function detectAccountType(identifier) {

    const value =
        identifier.trim();

    if (!value) {
        return null;
    }


    /*
     * USER
     * users.email is the username.
     */

    if (
        value.includes("@") &&
        value.includes(".")
    ) {

        return "user";
    }


    /*
     * VENDOR
     * vendors.vendor_id is the username.
     *
     * Example:
     * VND0000001
     */

    if (
        /^VND\d+$/i.test(value)
    ) {

        return "vendor";
    }


    return null;
}


/* ============================================================
   NORMALIZE MOBILE
   ============================================================ */

function normalizeMobile(value) {

    return String(value || "")
        .replace(/\D/g, "");
}


/* ============================================================
   MASK MOBILE
   ============================================================ */

function maskMobile(mobile) {

    const normalized =
        normalizeMobile(mobile);

    if (normalized.length < 4) {
        return normalized;
    }

    return (
        "*".repeat(
            normalized.length - 4
        )
        + normalized.slice(-4)
    );
}


/* ============================================================
   STEP 1
   ACCOUNT + MOBILE
   ============================================================ */

function setupAccountForm() {

    const form =
        getElement("mobileForm");

    if (!form) {
        console.error(
            "mobileForm not found."
        );

        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await sendOtp();
        }
    );
}


/* ============================================================
   SEND OTP
   ============================================================ */

async function sendOtp() {

    clearMessage("mobileMessage");


    const identifierElement =
        getElement("username") ||
        getElement("email");

    const mobileElement =
        getElement("mobileNumber");


    if (!identifierElement) {

        showMessage(
            "mobileMessage",
            "Account identifier field is missing.",
            "error"
        );

        return;
    }


    if (!mobileElement) {

        showMessage(
            "mobileMessage",
            "Mobile number field is missing.",
            "error"
        );

        return;
    }


    const identifier =
        identifierElement.value.trim();

    const mobile =
        normalizeMobile(
            mobileElement.value
        );


    /* --------------------------------------------------------
       VALIDATE IDENTIFIER
       -------------------------------------------------------- */

    if (!identifier) {

        showMessage(
            "mobileMessage",
            "Please enter your email or Vendor ID.",
            "error"
        );

        identifierElement.focus();

        return;
    }


    const accountType =
        detectAccountType(identifier);


    if (!accountType) {

        showMessage(
            "mobileMessage",
            "Enter a valid user email or Vendor ID such as VND0000001.",
            "error"
        );

        identifierElement.focus();

        return;
    }


    /* --------------------------------------------------------
       VALIDATE MOBILE
       -------------------------------------------------------- */

    if (!/^\d{10}$/.test(mobile)) {

        showMessage(
            "mobileMessage",
            "Please enter a valid 10-digit mobile number.",
            "error"
        );

        mobileElement.focus();

        return;
    }


    resetAccountType =
        accountType;

    resetIdentifier =
        identifier;

    resetMobile =
        mobile;


    /* --------------------------------------------------------
       BUTTON
       -------------------------------------------------------- */

    const button =
        getElement("sendOtpButton");

    const originalText =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>
             Sending OTP...`;
    }


    try {

        const response =
            await fetch(
                SEND_OTP_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        account_type:
                            resetAccountType,

                        identifier:
                            resetIdentifier,

                        mobile:
                            resetMobile
                    })
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);
        }


        const data =
            await response.json();


        /* ----------------------------------------------------
           MASKED MOBILE
           ---------------------------------------------------- */

        const maskedMobileElement =
            getElement("maskedMobile");

        if (maskedMobileElement) {

            maskedMobileElement.textContent =
                data.masked_mobile ||
                maskMobile(resetMobile);
        }


        showMessage(
            "mobileMessage",
            data.message ||
                "OTP has been sent to your registered mobile number.",
            "success"
        );


        /* ----------------------------------------------------
           MOVE TO OTP STEP
           ---------------------------------------------------- */

        showStep(2);

        startResendTimer();


        const otpInput =
            getElement("otp");

        if (otpInput) {

            otpInput.value = "";

            setTimeout(() => {
                otpInput.focus();
            }, 150);
        }


    } catch (error) {

        console.error(
            "Send OTP error:",
            error
        );

        showMessage(
            "mobileMessage",
            error.message ||
                "Unable to send OTP. Please try again.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                originalText ||
                `<i class="fa-solid fa-paper-plane"></i>
                 Send OTP`;
        }
    }
}


/* ============================================================
   STEP 2
   OTP FORM
   ============================================================ */

function setupOtpForm() {

    const form =
        getElement("otpForm");

    if (!form) {
        console.warn(
            "otpForm not found."
        );

        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await verifyOtp();
        }
    );


    const resendButton =
        getElement("resendButton");

    if (resendButton) {

        resendButton.addEventListener(
            "click",
            async () => {

                if (
                    resendButton.disabled
                ) {
                    return;
                }

                await resendOtp();
            }
        );
    }
}


/* ============================================================
   VERIFY OTP
   ============================================================ */

async function verifyOtp() {

    clearMessage("otpMessage");


    if (
        !resetAccountType ||
        !resetIdentifier ||
        !resetMobile
    ) {

        showMessage(
            "otpMessage",
            "Your reset session has expired. Please start again.",
            "error"
        );

        showStep(1);

        return;
    }


    const otpElement =
        getElement("otp");

    if (!otpElement) {

        showMessage(
            "otpMessage",
            "OTP input field is missing.",
            "error"
        );

        return;
    }


    const otp =
        otpElement.value
            .trim()
            .replace(/\D/g, "");


    if (!/^\d{6}$/.test(otp)) {

        showMessage(
            "otpMessage",
            "Please enter the 6-digit OTP.",
            "error"
        );

        otpElement.focus();

        return;
    }


    const button =
        getElement("verifyOtpButton");

    const originalText =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>
             Verifying...`;
    }


    try {

        const response =
            await fetch(
                VERIFY_OTP_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        account_type:
                            resetAccountType,

                        identifier:
                            resetIdentifier,

                        mobile:
                            resetMobile,

                        otp:
                            otp
                    })
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);
        }


        const data =
            await response.json();


        showMessage(
            "otpMessage",
            data.message ||
                "OTP verified successfully.",
            "success"
        );


        stopResendTimer();


        /* ----------------------------------------------------
           PASSWORD STEP
           ---------------------------------------------------- */

        showStep(3);


        const newPassword =
            getElement("newPassword");

        if (newPassword) {

            newPassword.value = "";

            setTimeout(() => {
                newPassword.focus();
            }, 150);
        }


    } catch (error) {

        console.error(
            "OTP verification error:",
            error
        );

        showMessage(
            "otpMessage",
            error.message ||
                "Invalid OTP. Please try again.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                originalText ||
                `<i class="fa-solid fa-check"></i>
                 Verify OTP`;
        }
    }
}


/* ============================================================
   RESEND OTP
   ============================================================ */

async function resendOtp() {

    clearMessage("otpMessage");


    if (
        !resetAccountType ||
        !resetIdentifier ||
        !resetMobile
    ) {

        showMessage(
            "otpMessage",
            "Your reset session has expired. Please start again.",
            "error"
        );

        showStep(1);

        return;
    }


    const button =
        getElement("resendButton");

    const originalText =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>
             Sending...`;
    }


    try {

        const response =
            await fetch(
                SEND_OTP_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        account_type:
                            resetAccountType,

                        identifier:
                            resetIdentifier,

                        mobile:
                            resetMobile
                    })
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);
        }


        const data =
            await response.json();


        showMessage(
            "otpMessage",
            data.message ||
                "A new OTP has been sent.",
            "success"
        );


        const otpElement =
            getElement("otp");

        if (otpElement) {
            otpElement.value = "";
            otpElement.focus();
        }


        startResendTimer();


    } catch (error) {

        console.error(
            "Resend OTP error:",
            error
        );

        showMessage(
            "otpMessage",
            error.message ||
                "Unable to resend OTP.",
            "error"
        );


        const resendButton =
            getElement("resendButton");

        if (resendButton) {
            resendButton.disabled = false;
        }

    } finally {

        if (button) {

            button.innerHTML =
                originalText ||
                `<i class="fa-solid fa-rotate-right"></i>
                 Resend OTP`;
        }
    }
}


/* ============================================================
   RESEND TIMER
   ============================================================ */

function startResendTimer() {

    stopResendTimer();


    resendSeconds = 60;


    const timerElement =
        getElement("resendTimer");

    const resendButton =
        getElement("resendButton");


    if (resendButton) {
        resendButton.disabled = true;
    }


    updateResendTimer();


    resendTimer =
        setInterval(() => {

            resendSeconds--;

            updateResendTimer();


            if (resendSeconds <= 0) {

                stopResendTimer();

                if (resendButton) {
                    resendButton.disabled = false;
                }
            }

        }, 1000);
}


function updateResendTimer() {

    const timerElement =
        getElement("resendTimer");

    if (!timerElement) {
        return;
    }


    if (resendSeconds > 0) {

        timerElement.textContent =
            `Resend available in ${resendSeconds}s`;

    } else {

        timerElement.textContent =
            "You can request a new OTP now.";
    }
}


function stopResendTimer() {

    if (resendTimer) {

        clearInterval(
            resendTimer
        );

        resendTimer = null;
    }


    const resendButton =
        getElement("resendButton");

    if (resendButton) {
        resendButton.disabled = false;
    }
}


/* ============================================================
   STEP 3
   PASSWORD FORM
   ============================================================ */

function setupPasswordForm() {

    const form =
        getElement("passwordForm");

    if (!form) {

        console.warn(
            "passwordForm not found."
        );

        return;
    }


    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await resetPassword();
        }
    );


    const passwordInput =
        getElement("newPassword");

    if (passwordInput) {

        passwordInput.addEventListener(
            "input",
            updatePasswordRules
        );
    }
}


/* ============================================================
   PASSWORD RULES
   ============================================================ */

function getPasswordState(password) {

    return {

        length:
            password.length >= 8,

        upper:
            /[A-Z]/.test(password),

        lower:
            /[a-z]/.test(password),

        number:
            /\d/.test(password)
    };
}


function updatePasswordRules() {

    const passwordInput =
        getElement("newPassword");

    if (!passwordInput) {
        return;
    }


    const password =
        passwordInput.value;

    const rules =
        getPasswordState(password);


    updateRule(
        "ruleLength",
        rules.length
    );

    updateRule(
        "ruleUpper",
        rules.upper
    );

    updateRule(
        "ruleLower",
        rules.lower
    );

    updateRule(
        "ruleNumber",
        rules.number
    );
}


function updateRule(
    elementId,
    passed
) {

    const element =
        getElement(elementId);

    if (!element) {
        return;
    }


    const icon =
        element.querySelector("i");


    if (passed) {

        element.classList.add("valid");

        if (icon) {

            icon.className =
                "fa-solid fa-circle-check";
        }

    } else {

        element.classList.remove(
            "valid"
        );

        if (icon) {

            icon.className =
                "fa-solid fa-circle-xmark";
        }
    }
}


/* ============================================================
   RESET PASSWORD
   ============================================================ */

async function resetPassword() {

    clearMessage("passwordMessage");


    if (
        !resetAccountType ||
        !resetIdentifier ||
        !resetMobile
    ) {

        showMessage(
            "passwordMessage",
            "Your reset session has expired. Please start again.",
            "error"
        );

        showStep(1);

        return;
    }


    const newPasswordElement =
        getElement("newPassword");

    const confirmPasswordElement =
        getElement("confirmPassword");


    if (
        !newPasswordElement ||
        !confirmPasswordElement
    ) {

        showMessage(
            "passwordMessage",
            "Password fields are missing.",
            "error"
        );

        return;
    }


    const newPassword =
        newPasswordElement.value;

    const confirmPassword =
        confirmPasswordElement.value;


    /* --------------------------------------------------------
       VALIDATE PASSWORD
       -------------------------------------------------------- */

    const rules =
        getPasswordState(
            newPassword
        );


    if (
        !rules.length ||
        !rules.upper ||
        !rules.lower ||
        !rules.number
    ) {

        showMessage(
            "passwordMessage",
            "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.",
            "error"
        );

        updatePasswordRules();

        return;
    }


    /* --------------------------------------------------------
       CONFIRM PASSWORD
       -------------------------------------------------------- */

    if (
        newPassword !==
        confirmPassword
    ) {

        showMessage(
            "passwordMessage",
            "Passwords do not match.",
            "error"
        );

        confirmPasswordElement.focus();

        return;
    }


    const button =
        getElement("resetPasswordButton");

    const originalText =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled = true;

        button.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i>
             Updating Password...`;
    }


    try {

        const response =
            await fetch(
                RESET_PASSWORD_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        account_type:
                            resetAccountType,

                        identifier:
                            resetIdentifier,

                        mobile:
                            resetMobile,

                        new_password:
                            newPassword
                    })
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(
                    response
                );

            throw new Error(message);
        }


        const data =
            await response.json();


        /* ----------------------------------------------------
           SUCCESS
           ---------------------------------------------------- */

        stopResendTimer();


        showStep(4);


        const successMessage =
            getElement("successMessage");

        if (successMessage) {

            successMessage.textContent =
                data.message ||
                "Password reset successfully. You can now log in.";
        }


        /*
         * Clear password fields.
         */

        newPasswordElement.value = "";

        confirmPasswordElement.value = "";


    } catch (error) {

        console.error(
            "Password reset error:",
            error
        );

        showMessage(
            "passwordMessage",
            error.message ||
                "Unable to reset password. Please try again.",
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                originalText ||
                `<i class="fa-solid fa-key"></i>
                 Reset Password`;
        }
    }
}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

function setupPasswordToggles() {

    setupPasswordToggle(
        "toggleNewPassword",
        "newPassword"
    );

    setupPasswordToggle(
        "toggleConfirmPassword",
        "confirmPassword"
    );
}


function setupPasswordToggle(
    toggleId,
    inputId
) {

    const toggle =
        getElement(toggleId);

    const input =
        getElement(inputId);


    if (!toggle || !input) {
        return;
    }


    toggle.addEventListener(
        "click",
        () => {

            const isPassword =
                input.type === "password";


            input.type =
                isPassword
                    ? "text"
                    : "password";


            const icon =
                toggle.querySelector("i");


            if (icon) {

                icon.className =
                    isPassword
                        ? "fa-solid fa-eye-slash"
                        : "fa-solid fa-eye";
            }
        }
    );
}


/* ============================================================
   OPTIONAL: ALLOW ONLY NUMBERS IN OTP
   ============================================================ */

const otpInput =
    getElement("otp");

if (otpInput) {

    otpInput.addEventListener(
        "input",
        () => {

            otpInput.value =
                otpInput.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
        }
    );
}


/* ============================================================
   OPTIONAL: ALLOW ONLY DIGITS IN MOBILE
   ============================================================ */

const mobileInput =
    getElement("mobileNumber");

if (mobileInput) {

    mobileInput.addEventListener(
        "input",
        () => {

            mobileInput.value =
                mobileInput.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
        }
    );
}