// Get Vendors
function loadVendors() {

    fetch("http://127.0.0.1:8000/vendors")
        .then(response => response.json())
        .then(data => {

            const tableBody = document.getElementById("vendorTableBody");

            if (!tableBody) return;

            tableBody.innerHTML = "";

            data.forEach(vendor => {

                tableBody.innerHTML += `
                    <tr>
                        <td>${vendor.name}</td>
                        <td>${vendor.delivery}</td>
                        <td>${vendor.score}</td>
                    </tr>
                `;

            });

        })
        .catch(error => {
            console.log("Error:", error);
        });

}

loadVendors();


// Login
document.getElementById("loginForm")?.addEventListener("submit", function (e) {

    e.preventDefault();

    fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        window.location.href = "dashboard.html";
    })
    .catch(error => {
        alert("Login Failed");
        console.log(error);
    });

});


// Register
document.getElementById("registerForm")?.addEventListener("submit", function (e) {

    e.preventDefault();

    alert("Register Successful");

});


// Show Vendor Form
document.getElementById("addVendorBtn")?.addEventListener("click", function () {

    document.getElementById("vendorForm").style.display = "block";

});


// Save Vendor
document.getElementById("saveVendorBtn")?.addEventListener("click", function () {

    fetch("http://127.0.0.1:8000/vendors", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: document.getElementById("vendorName").value,
            delivery: document.getElementById("delivery").value,
            score: Number(document.getElementById("score").value)
        })
    })
    .then(response => response.json())
    .then(data => {

        alert(data.message);

        loadVendors();

        document.getElementById("vendorName").value = "";
        document.getElementById("delivery").value = "";
        document.getElementById("score").value = "";

    })
    .catch(error => {

        alert("Failed to save vendor");
        console.log(error);

    });

});