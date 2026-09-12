/* ==========================================
   Vendor Reliability Platform
   home.js
========================================== */

// ================================
// Sticky Navbar Shadow
// ================================

window.addEventListener("scroll", () => {

    const header = document.querySelector("header");

    if (window.scrollY > 40) {

        header.style.boxShadow = "0 5px 20px rgba(0,0,0,0.15)";

    }

    else {

        header.style.boxShadow = "0 2px 15px rgba(0,0,0,0.08)";

    }

});


// ================================
// Animated Statistics Counter
// ================================

const counters = document.querySelectorAll(".counter");

const speed = 50;

const startCounter = () => {

    counters.forEach(counter => {

        const target = +counter.dataset.target;

        let count = 0;

        const updateCounter = () => {

            const increment = Math.ceil(target / speed);

            if (count < target) {

                count += increment;

                if (count > target) {

                    count = target;

                }

                counter.innerText = count;

                setTimeout(updateCounter, 30);

            }

            else {

                counter.innerText = target;

            }

        };

        updateCounter();

    });

};


// ================================
// Counter Starts Only When Visible
// ================================

const statSection = document.querySelector(".stats");

let counterStarted = false;

const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting && !counterStarted) {

            counterStarted = true;

            startCounter();

        }

    });

}, {

    threshold: 0.4

});

if (statSection) {

    observer.observe(statSection);

}


// ================================
// Smooth Scroll
// ================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

    anchor.addEventListener("click", function(e) {

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {

            target.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});


// ================================
// Scroll Reveal Animation
// ================================

const revealElements = document.querySelectorAll(

".card,.hero-text,.hero-image,.step,.stat,.about,.contact"

);

const reveal = () => {

    revealElements.forEach(el => {

        const windowHeight = window.innerHeight;

        const top = el.getBoundingClientRect().top;

        const revealPoint = 100;

        if (top < windowHeight - revealPoint) {

            el.style.opacity = "1";

            el.style.transform = "translateY(0)";

        }

    });

};

revealElements.forEach(el => {

    el.style.opacity = "0";

    el.style.transform = "translateY(40px)";

    el.style.transition = "all 0.8s ease";

});

window.addEventListener("scroll", reveal);

window.addEventListener("load", reveal);


// ================================
// Feature Card Hover Effect
// ================================

document.querySelectorAll(".card").forEach(card => {

    card.addEventListener("mouseenter", () => {

        card.style.boxShadow =

        "0 20px 40px rgba(37,99,235,.25)";

    });

    card.addEventListener("mouseleave", () => {

        card.style.boxShadow =

        "0 8px 30px rgba(0,0,0,.08)";

    });

});


// ================================
// Contact Form Validation
// ================================

const form = document.querySelector("form");

if (form) {

    form.addEventListener("submit", function(e) {

        e.preventDefault();

        const name = form.querySelector("input[type='text']").value.trim();

        const email = form.querySelector("input[type='email']").value.trim();

        const message = form.querySelector("textarea").value.trim();

        if (name === "" || email === "" || message === "") {

            alert("Please fill all fields.");

            return;

        }

        alert("Thank you! Your message has been submitted.");

        form.reset();

    });

}


// ================================
// Hero Button Animation
// ================================

const primaryBtn = document.querySelector(".primary-btn");

if (primaryBtn) {

    setInterval(() => {

        primaryBtn.classList.toggle("pulse");

    }, 1500);

}


// ================================
// Back To Top Button
// ================================

const topButton = document.createElement("button");

topButton.innerHTML = "↑";

topButton.id = "topButton";

document.body.appendChild(topButton);

topButton.style.position = "fixed";
topButton.style.bottom = "30px";
topButton.style.right = "30px";
topButton.style.width = "50px";
topButton.style.height = "50px";
topButton.style.border = "none";
topButton.style.borderRadius = "50%";
topButton.style.background = "#2563EB";
topButton.style.color = "#fff";
topButton.style.fontSize = "22px";
topButton.style.cursor = "pointer";
topButton.style.display = "none";
topButton.style.zIndex = "999";
topButton.style.boxShadow = "0 5px 15px rgba(0,0,0,.3)";

window.addEventListener("scroll", () => {

    if (window.scrollY > 500) {

        topButton.style.display = "block";

    }

    else {

        topButton.style.display = "none";

    }

});

topButton.onclick = () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

};


// ================================
// DYNAMIC PLATFORM STATISTICS
// ================================

const HOME_API_BASE = window.API_BASE_URL || (window.location.port === "8000" ? "" : "http://127.0.0.1:8000");

async function loadPlatformStats() {
    try {
        const res = await fetch(`${HOME_API_BASE}/api/public/platform-stats`);
        if (!res.ok) throw new Error(`Stats fetch failed with status ${res.status}`);
        const data = await res.json();

        // Update data-target attributes in HTML
        const counters = document.querySelectorAll(".counter");
        counters.forEach(counter => {
            const labelEl = counter.nextElementSibling;
            if (!labelEl) return;
            const text = labelEl.innerText.trim().toLowerCase();
            let targetVal = 0;
            if (text.includes("vendors")) {
                targetVal = data.total_vendors || 0;
            } else if (text.includes("purchase orders") || text.includes("orders")) {
                targetVal = data.total_purchase_orders || 0;
            } else if (text.includes("contracts")) {
                targetVal = data.total_contracts || 0;
            } else if (text.includes("reliability")) {
                targetVal = Math.round(data.average_reliability || 0);
            }
            counter.dataset.target = targetVal;
            if (counterStarted) {
                counter.innerText = Number(targetVal).toLocaleString();
            }
        });
        if (!counterStarted) {
            startCounter();
            counterStarted = true;
        }
    } catch (err) {
        console.error("Failed to load platform stats:", err);
        const statsSection = document.querySelector(".stats");
        if (statsSection && !statsSection.querySelector(".stats-unavailable-note")) {
            const note = document.createElement("p");
            note.className = "stats-unavailable-note";
            note.style.textAlign = "center";
            note.style.width = "100%";
            note.style.color = "#ef4444";
            note.style.marginTop = "10px";
            note.innerText = "Live platform statistics are temporarily unavailable.";
            statsSection.appendChild(note);
        }
    }
}


// ================================
// AUTHENTICATED USER NAVIGATION UI
// ================================

function updateAuthUI() {
    const token = getToken();
    const role = getUserRole();
    const name = getUserName();

    const buttonsDiv = document.querySelector(".navbar .buttons");
    if (!buttonsDiv) return;

    if (token && role) {
        let dashboardPage = "login.html";
        switch (role) {
            case "Admin":
            case "Administrator": dashboardPage = "admin_dashboard.html"; break;
            case "Procurement Manager": dashboardPage = "procurement_dashboard.html"; break;
            case "Supply Chain Manager": dashboardPage = "supplychain_dashboard.html"; break;
            case "Vendor": dashboardPage = "vendor_dashboard.html"; break;
            case "Finance Officer": dashboardPage = "finance_dashboard.html"; break;
            case "Auditor": dashboardPage = "auditor_dashboard.html"; break;
        }

        buttonsDiv.innerHTML = `
            <span class="welcome-msg" style="margin-right: 15px; font-weight: 500; color: #1e293b;">Welcome, ${name || 'User'}</span>
            <a href="${dashboardPage}" class="btn login">Dashboard</a>
            <a href="profile.html" class="btn login" style="margin-left: 10px;">Profile</a>
            <button onclick="handleHomeLogout()" class="btn register" style="margin-left: 10px; border: none; cursor: pointer;">Logout</button>
        `;
    }
}

function handleHomeLogout() {
    logout();
}

window.handleHomeLogout = handleHomeLogout;

// Trigger load on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    loadPlatformStats();
    updateAuthUI();
});