if (!isLoggedIn()) {

    window.location.href = "login.html";

}

async function loadUser() {

    try {

        const user = await getCurrentUser();

        document.getElementById("username").textContent =
            user.full_name;

        document.getElementById("profileName").textContent =
            user.full_name;

        document.getElementById("menuName").textContent =
            user.full_name;

        document.getElementById("menuEmail").textContent =
            user.email;

        document.getElementById("menuRole").textContent =
            user.role;

    }

    catch {

        removeToken();

        window.location.href = "login.html";

    }

}

loadUser();

const profileBtn = document.getElementById("profileBtn");

const profileMenu = document.getElementById("profileMenu");

profileBtn.addEventListener("click", () => {

    profileMenu.classList.toggle("active");

});

document.addEventListener("click", function(event) {

    if (
        !profileBtn.contains(event.target) &&
        !profileMenu.contains(event.target)
    ) {

        profileMenu.classList.remove("active");

    }

});

document.getElementById("logoutBtn").addEventListener("click", () => {

    removeToken();

    window.location.href = "login.html";

});