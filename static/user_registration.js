document.addEventListener("DOMContentLoaded", function () {

    const registrationForm =
        document.getElementById("registrationForm");

    // ----------------------------------------
    // Make sure registration form exists
    // ----------------------------------------

    if (!registrationForm) {
        console.error(
            "registrationForm was not found."
        );
        return;
    }

    // ----------------------------------------
    // Registration submit
    // ----------------------------------------

    registrationForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const name =
                document
                    .getElementById("name")
                    .value
                    .trim();

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const mobile =
                document
                    .getElementById("mobile")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;

            const confirm_password =
                document
                    .getElementById("confirm_password")
                    .value;

            const role =
                document
                    .getElementById("role")
                    .value;

            const genderElement =
                document.querySelector(
                    'input[name="gender"]:checked'
                );

            const gender =
                genderElement
                    ? genderElement.value
                    : null;

            const addressElement =
                document.querySelector("textarea");

            const address =
                addressElement
                    ? addressElement.value.trim()
                    : null;

            // ----------------------------------------
            // Validation
            // ----------------------------------------

            if (password !== confirm_password) {

                alert(
                    "Passwords do not match."
                );

                return;
            }

            // ----------------------------------------
            // Data for FastAPI
            // ----------------------------------------

            const userData = {

                name: name,

                email: email,

                mobile: mobile,

                gender: gender,

                role: role,

                password: password,

                confirm_password: confirm_password,

                address: address
            };

            console.log(
                "Sending registration data:",
                userData
            );

            // ----------------------------------------
            // FastAPI request
            // ----------------------------------------

            try {

                const response =
                    await fetch( "/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    userData
                                )
                        }
                    );

                const result =
                    await response.json();

                console.log(
                    "Server response:",
                    result
                );

                // ----------------------------------------
                // FastAPI 422
                // ----------------------------------------

                if (response.status === 422) {

                    console.error(
                        "Validation error:",
                        result
                    );

                    if (
                        Array.isArray(
                            result.detail
                        )
                    ) {

                        const errors =
                            result.detail
                                .map(error => {

                                    const field =
                                        error.loc
                                            ? error.loc.join(".")
                                            : "unknown";

                                    return (
                                        field +
                                        ": " +
                                        error.msg
                                    );

                                })
                                .join("\n");

                        alert(
                            "Validation errors:\n\n" +
                            errors
                        );

                    } else {

                        alert(
                            "Invalid registration data."
                        );
                    }

                    return;
                }

                // ----------------------------------------
                // Other API errors
                // ----------------------------------------

                if (!response.ok) {

                    alert(
                        result.detail ||
                        "Registration failed."
                    );

                    return;
                }

                // ----------------------------------------
                // Successful registration
                // ----------------------------------------

                alert(
                    "Registration successful!"
                );

            }
            catch (error) {

                console.error(
                    "Registration error:",
                    error
                );

                alert(
                    "Unable to connect to the server."
                );
            }

        }
    );
});