console.log("register.js loaded");

document
.getElementById("registerForm")
.addEventListener("submit", registerUser);

async function registerUser(event)
{
    event.preventDefault();

    console.log("registerUser called");

    const formData = new FormData();

    formData.append(
        "name",
        document.getElementById("name").value
    );

    formData.append(
        "email",
        document.getElementById("email").value
    );

    formData.append(
        "password",
        document.getElementById("password").value
    );

    formData.append(
        "role",
        document.getElementById("role").value
    );

    try {

        console.log("Sending request to FastAPI...");

        const response = await fetch(
            "http://127.0.0.1:8000/register",
            {
                method: "POST",
                body: formData
            }
        );

        console.log("Status:", response.status);

        const text = await response.text();

        console.log("Server response:", text);

        let result;

        try {
            result = JSON.parse(text);
        }
        catch {
            alert("Server returned invalid response");
            return;
        }

        if (!response.ok) {
            alert(result.detail || result.message || "Registration failed");
            return;
        }

        alert(result.message);

        if (
            result.message &&
            result.message.includes("Registration Successful")
        ) {
            window.location.href = "login.html";
        }

    }
    catch (error) {

        console.error("Registration error:", error);

        alert("Unable to connect to server");

    }
}