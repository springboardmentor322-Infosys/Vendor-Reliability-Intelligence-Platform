const API = "http://127.0.0.1:8000";

let logs = [];


function getToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        ""
    );

}


async function apiFetch(url, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    const response = await fetch(
        url,
        {
            ...options,
            headers
        }
    );


    if (!response.ok) {

        let error;

        try {
            error = await response.json();
        } catch {
            error = {
                detail: `HTTP ${response.status}`
            };
        }

        throw new Error(
            error.detail ||
            `HTTP ${response.status}`
        );
    }


    return response;

}


async function loadLogs() {

    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/logs`
            );


        logs =
            await response.json();


        renderLogs(logs);

        await loadStatistics();

    } catch (error) {

        console.error(
            "Unable to load notification logs:",
            error
        );

        alert(
            error.message
        );

    }

}


async function loadStatistics() {

    try {

        const response =
            await apiFetch(
                `${API}/api/notifications/logs/statistics`
            );


        const statistics =
            await response.json();


        document.getElementById(
            "totalSent"
        ).textContent =
            statistics.total_sent || 0;


        document.getElementById(
            "successful"
        ).textContent =
            statistics.successful || 0;


        document.getElementById(
            "failed"
        ).textContent =
            statistics.failed || 0;

    } catch (error) {

        console.error(
            "Unable to load log statistics:",
            error
        );

    }

}


function renderLogs(data) {

    const table =
        document.getElementById(
            "logsTable"
        );


    table.innerHTML = "";


    if (data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="6" style="color:#9ca3af; text-align:center;">
                    No notification logs found.
                </td>
            </tr>
        `;

        return;
    }


    data.forEach(
        log => {

            const date =
                log.sent_at
                    ? new Date(
                        log.sent_at
                    ).toLocaleString()
                    : "-";


            table.innerHTML += `

                <tr>

                    <td>
                        #${log.id}
                    </td>

                    <td>
                        ${escapeHtml(
                            log.recipient
                        )}
                    </td>

                    <td>

                        <span class="type">
                            ${escapeHtml(
                                log.notification_type
                            )}
                        </span>

                    </td>

                    <td>
                        ${escapeHtml(
                            log.subject || "-"
                        )}
                    </td>

                    <td>
                        ${date}
                    </td>

                    <td>

                        <span class="status ${
                            log.status
                                .toLowerCase()
                        }">

                            ${escapeHtml(
                                log.status
                            )}

                        </span>

                    </td>

                </tr>

            `;

        }
    );

}


function filterLogs() {

    const search =
        document.getElementById(
            "searchInput"
        ).value
        .toLowerCase();


    const type =
        document.getElementById(
            "typeFilter"
        ).value;


    const status =
        document.getElementById(
            "statusFilter"
        ).value;


    const filtered =
        logs.filter(
            log => {

                const recipient =
                    (
                        log.recipient || ""
                    ).toLowerCase();


                const subject =
                    (
                        log.subject || ""
                    ).toLowerCase();


                const matchesSearch =
                    recipient.includes(
                        search
                    ) ||
                    subject.includes(
                        search
                    );


                const matchesType =
                    type === "All" ||
                    log.notification_type === type;


                const matchesStatus =
                    status === "All" ||
                    log.status === status;


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesStatus
                );

            }
        );


    renderLogs(filtered);

}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;
}


document.addEventListener(
    "DOMContentLoaded",
    loadLogs
);


/* ==========================================================
   NOTIFICATIONS DROPDOWN
========================================================== */

function toggleNotificationMenu(event) {

    event.stopPropagation();

    const menu =
        document.querySelector(
            ".notification-menu"
        );

    if (!menu) {
        return;
    }

    menu.classList.toggle("open");
}


/* ==========================================================
   KEEP NOTIFICATION MENU OPEN
========================================================== */

function initializeNotificationDropdown() {

    const currentPath =
        window.location.pathname.toLowerCase();


    const notificationPages = [
        "/notifications",
        "/notificationsettings",
        "/emailtemplates",
        "/smstemplates",
        "/notificationlogs"
    ];


    const isNotificationPage =
        notificationPages.includes(
            currentPath
        );


    const menu =
        document.querySelector(
            ".notification-menu"
        );


    if (
        menu &&
        isNotificationPage
    ) {

        menu.classList.add(
            "open"
        );

    }


    /* Highlight current submenu */

    const submenuLinks =
        document.querySelectorAll(
            ".notification-submenu-item"
        );


    submenuLinks.forEach(
        link => {

            const linkPath =
                new URL(
                    link.href,
                    window.location.origin
                ).pathname
                .toLowerCase();


            if (
                linkPath ===
                currentPath
            ) {

                link.classList.add(
                    "active"
                );

            }

        }
    );

}


/* ==========================================================
   INITIALIZE DROPDOWN
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeNotificationDropdown
);


/* ==========================================================
   GLOBAL DROPDOWN FUNCTION
========================================================== */

window.toggleNotificationMenu =
    toggleNotificationMenu;