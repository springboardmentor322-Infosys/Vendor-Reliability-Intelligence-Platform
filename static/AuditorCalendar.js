"use strict";

const API = "http://127.0.0.1:8000";

let currentDate = new Date();
let allEvents = [];
let audits = [];

const HOURS = [
    "8 AM",
    "9 AM",
    "10 AM",
    "11 AM",
    "12 PM",
    "1 PM",
    "2 PM",
    "3 PM",
    "4 PM",
    "5 PM",
    "6 PM"
];

const EVENT_TYPES = [
    "Audit",
    "Meeting",
    "Planning",
    "Review",
    "Compliance",
    "Reporting",
    "Other"
];


/* ============================================================
   AUTHENTICATION
============================================================ */

function getAccessToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt_token") ||
        sessionStorage.getItem("access_token") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("jwt_token") ||
        null
    );
}


function clearAuthentication() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("jwt_token");

    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("jwt_token");
}


/* ============================================================
   API FETCH
============================================================ */

async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    /*
     * JWT authentication.
     *
     * FastAPI expects:
     *
     * Authorization: Bearer <token>
     */

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;
    }

    /*
     * Accept both:
     *
     * "/api/auth/me"
     *
     * and
     *
     * "http://127.0.0.1:8000/api/auth/me"
     */

    const requestUrl =
        url.startsWith("http")
            ? url
            : `${API}${url}`;

    console.log(
        "API Request:",
        requestUrl
    );

    console.log(
        "JWT present:",
        Boolean(token)
    );


    const response =
        await fetch(
            requestUrl,
            {
                ...options,
                headers,
                credentials: "include"
            }
        );


    /*
     * Handle authentication failure globally.
     */

    if (response.status === 401) {

        console.error(
            "401 Unauthorized:",
            requestUrl
        );

        clearAuthentication();

        throw new Error(
            "Not authenticated. Please login again."
        );

        window.location.href = "/login";
    }


    if (response.status === 403) {

        console.error(
            "403 Forbidden:",
            requestUrl
        );

        throw new Error(
            "You do not have permission to access this resource."
        );
    }


    if (!response.ok) {

        let message =
            `Request failed (${response.status})`;

        try {

            const data =
                await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (error) {

            console.error(
                "Response parsing failed:",
                error
            );
        }

        throw new Error(message);
    }


    /*
     * Some DELETE endpoints may return 204.
     */

    if (response.status === 204) {
        return null;
    }


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        return response.json();
    }


    return response.text();
}



/* ============================================================
   HELPERS
============================================================ */

function pad(value) {
    return String(value).padStart(2, "0");
}


function dateKey(date) {

    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate())
    );
}


function formatDate(date) {

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


function formatTime(date) {

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function startOfWeek(date) {

    const d = new Date(date);

    const day = d.getDay();

    d.setDate(
        d.getDate() - day
    );

    d.setHours(
        0,
        0,
        0,
        0
    );

    return d;
}


function endOfWeek(date) {

    const d = startOfWeek(date);

    d.setDate(
        d.getDate() + 6
    );

    d.setHours(
        23,
        59,
        59,
        999
    );

    return d;
}


function typeClass(type) {

    return String(type || "Other")
        .toLowerCase()
        .replace(/\s+/g, "-");
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ============================================================
   LOAD USER
============================================================ */

async function loadCurrentUser() {

    try {

        const user =
            await apiFetch(
                "/api/auth/me"
            );

        document.getElementById(
            "sidebarName"
        ).textContent =
            user.name || "Auditor";

        document.getElementById(
            "headerName"
        ).textContent =
            user.name || "Auditor";

        document.getElementById(
            "sidebarRole"
        ).textContent =
            user.role || "Auditor";

        document.getElementById(
            "headerRole"
        ).textContent =
            user.role || "Auditor";

    } catch (error) {

        console.error(
            "User load failed:",
            error
        );
    }
}


/* ============================================================
   LOAD AUDITS
============================================================ */

async function loadAudits() {

    try {

        const response =
            await apiFetch(
                "/api/auditor/calendar/audits"
            );

        audits =
            response.items || [];

        populateAuditFilters();

    } catch (error) {

        console.error(
            "Audit loading failed:",
            error
        );
    }
}


function populateAuditFilters() {

    const filter =
        document.getElementById(
            "auditFilter"
        );

    const modalSelect =
        document.getElementById(
            "eventAudit"
        );

    filter.innerHTML =
        `<option value="">
            All Audits/Assignments
        </option>`;

    modalSelect.innerHTML =
        `<option value="">
            No linked audit
        </option>`;

    audits.forEach(
        audit => {

            const text =
                `${audit.audit_number} - ${audit.title}`;

            filter.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${audit.id}">
                    ${escapeHtml(text)}
                </option>
                `
            );

            modalSelect.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${audit.id}">
                    ${escapeHtml(text)}
                </option>
                `
            );
        }
    );
}


/* ============================================================
   LOAD CALENDAR
============================================================ */

async function loadEvents() {

    const start =
        startOfWeek(currentDate);

    const end =
        endOfWeek(currentDate);

    const type =
        document.getElementById(
            "eventTypeFilter"
        ).value;

    const audit =
        document.getElementById(
            "auditFilter"
        ).value;

    const completed =
        document.getElementById(
            "completedFilter"
        ).checked;


    const params =
        new URLSearchParams();

    params.set(
        "start",
        localDateTime(start)
    );

    params.set(
        "end",
        localDateTime(end)
    );

    params.set(
        "include_completed",
        completed
    );

    if (
        type &&
        type !== "All Event Types"
    ) {

        params.set(
            "event_type",
            type
        );
    }

    if (audit) {

        params.set(
            "audit_id",
            audit
        );
    }


    try {

        const response =
            await apiFetch(
                `/api/auditor/calendar/events?${params}`
            );

        allEvents =
            response.items || [];

        renderCalendar();

        renderUpcomingEvents();

        renderTodaySchedule();

    } catch (error) {

        console.error(
            "Calendar loading failed:",
            error
        );

        allEvents = [];

        renderCalendar();
    }
}


/* ============================================================
   LOCAL DATETIME
============================================================ */

function localDateTime(date) {

    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes())
    );
}


/* ============================================================
   RENDER WEEK HEADER
============================================================ */

function renderWeekHeader() {

    const start =
        startOfWeek(currentDate);

    const end =
        endOfWeek(currentDate);

    let title;

    if (
        start.getMonth() ===
        end.getMonth()
    ) {

        title =
            `${start.toLocaleDateString(
                "en-US",
                { month: "long" }
            )} ${start.getDate()} – ` +
            `${end.getDate()}, ` +
            `${start.getFullYear()}`;

    } else {

        title =
            `${formatDate(start)} – ` +
            `${formatDate(end)}`;
    }

    document.getElementById(
        "weekTitle"
    ).textContent = title;


    document.querySelectorAll(
        ".day-column strong"
    ).forEach(
        (element, index) => {

            const date =
                new Date(start);

            date.setDate(
                date.getDate() + index
            );

            element.textContent =
                date.getDate();

            element.parentElement
                .classList.toggle(
                    "today",
                    dateKey(date) ===
                    dateKey(new Date())
                );
        }
    );
}


/* ============================================================
   RENDER TIME COLUMN
============================================================ */

function renderTimeColumn() {

    const column =
        document.getElementById(
            "timeColumn"
        );

    column.innerHTML = "";

    HOURS.forEach(
        hour => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "time-label";

            div.textContent = hour;

            column.appendChild(div);
        }
    );
}


/* ============================================================
   RENDER CALENDAR
============================================================ */

function renderCalendar() {

    renderWeekHeader();

    renderTimeColumn();

    const daysContainer =
        document.querySelector(
            ".calendar-days"
        );

    daysContainer.innerHTML = "";

    const start =
        startOfWeek(currentDate);


    for (
        let dayIndex = 0;
        dayIndex < 7;
        dayIndex++
    ) {

        const date =
            new Date(start);

        date.setDate(
            date.getDate() + dayIndex
        );

        const day =
            document.createElement(
                "div"
            );

        day.className =
            "calendar-day";

        day.dataset.date =
            dateKey(date);

        daysContainer.appendChild(day);
    }


    allEvents.forEach(
        event => {

            renderEvent(
                event,
                daysContainer
            );
        }
    );


    renderMiniCalendar();
}


/* ============================================================
   RENDER EVENT
============================================================ */

function renderEvent(
    event,
    container
) {

    const start =
        new Date(
            event.start_datetime
        );

    const dayKey =
        dateKey(start);

    const dayElement =
        container.querySelector(
            `[data-date="${dayKey}"]`
        );

    if (!dayElement) {
        return;
    }


    const eventElement =
        document.createElement(
            "div"
        );

    const type =
        typeClass(
            event.event_type
        );

    eventElement.className =
        `calendar-event ${type}`;

    eventElement.dataset.id =
        event.id;


    if (event.all_day) {

        eventElement.style.top =
            "5px";

        eventElement.style.height =
            "42px";

    } else {

        const hour =
            start.getHours();

        const minute =
            start.getMinutes();

        /*
         * Calendar begins at 8 AM.
         * Each hour = 50px.
         */

        const top =
            ((hour - 8) * 50) +
            ((minute / 60) * 50) +
            5;

        let height = 80;

        if (event.end_datetime) {

            const end =
                new Date(
                    event.end_datetime
                );

            const minutes =
                (
                    end.getTime() -
                    start.getTime()
                ) / 60000;

            height =
                Math.max(
                    45,
                    (minutes / 60) * 50 - 5
                );
        }

        eventElement.style.top =
            `${top}px`;

        eventElement.style.height =
            `${height}px`;
    }


    const timeText =
        event.all_day
            ? "All Day"
            : `${formatTime(start)} – ${
                event.end_datetime
                    ? formatTime(
                        new Date(
                            event.end_datetime
                        )
                    )
                    : ""
            }`;


    eventElement.innerHTML = `
        <strong>
            <span class="event-dot ${type}"></span>
            ${escapeHtml(event.title)}
        </strong>

        <small>
            ${escapeHtml(timeText)}
        </small>
    `;


    eventElement.addEventListener(
        "click",
        () => {

            if (
                String(event.id)
                    .startsWith("audit-") ||
                String(event.id)
                    .startsWith("due-")
            ) {

                alert(
                    `${event.title}\n\n` +
                    `${event.description || ""}`
                );

                return;
            }

            openEditModal(event);
        }
    );


    dayElement.appendChild(
        eventElement
    );
}


/* ============================================================
   UPCOMING EVENTS
============================================================ */

function renderUpcomingEvents() {

    const container =
        document.getElementById(
            "upcomingEvents"
        );

    container.innerHTML = "";

    const now =
        new Date();

    const upcoming =
        allEvents
            .filter(
                event =>
                    new Date(
                        event.start_datetime
                    ) >= now
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.start_datetime
                    ) -
                    new Date(
                        b.start_datetime
                    )
            )
            .slice(0, 6);


    if (!upcoming.length) {

        container.innerHTML =
            `<p class="empty-message">
                No upcoming events
            </p>`;

        return;
    }


    upcoming.forEach(
        event => {

            const type =
                typeClass(
                    event.event_type
                );

            const date =
                new Date(
                    event.start_datetime
                );

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "upcoming-item";

            div.innerHTML = `

                <span
                    class="upcoming-dot ${type}"
                    style="
                        background:
                        var(--${type});
                    "
                ></span>

                <div>

                    <strong>
                        ${escapeHtml(
                            event.title
                        )}
                    </strong>

                    <span>
                        ${formatDate(date)}
                        &nbsp;
                        ${
                            event.all_day
                                ? "All Day"
                                : formatTime(date)
                        }
                    </span>

                </div>
            `;

            container.appendChild(div);
        }
    );
}


/* ============================================================
   TODAY SCHEDULE
============================================================ */

function renderTodaySchedule() {

    const container =
        document.getElementById(
            "scheduleItems"
        );

    container.innerHTML = "";

    const today =
        dateKey(new Date());

    const todayEvents =
        allEvents
            .filter(
                event =>
                    dateKey(
                        new Date(
                            event.start_datetime
                        )
                    ) === today
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.start_datetime
                    ) -
                    new Date(
                        b.start_datetime
                    )
            )
            .slice(0, 4);


    document.getElementById(
        "scheduleTitle"
    ).textContent =
        `Today's Schedule - ${
            new Date().toLocaleDateString(
                "en-US",
                {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                }
            )
        }`;


    if (!todayEvents.length) {

        container.innerHTML =
            `<div class="empty-message" style="font-size:9px;">
                No events scheduled for today.
            </div>`;

        return;
    }


    todayEvents.forEach(
        event => {

            const type =
                typeClass(
                    event.event_type
                );

            const date =
                new Date(
                    event.start_datetime
                );

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                `schedule-item ${type}`;

            div.innerHTML = `

                <div class="schedule-time">

                    ${
                        event.all_day
                            ? "All Day"
                            : formatTime(date)
                    }

                </div>

                <strong>
                    ${escapeHtml(
                        event.title
                    )}
                </strong>

                <p>
                    ${escapeHtml(
                        event.description ||
                        event.location ||
                        "Calendar event"
                    )}
                </p>
            `;

            container.appendChild(div);
        }
    );
}


/* ============================================================
   MINI CALENDAR
============================================================ */

function renderMiniCalendar() {

    const container =
        document.getElementById(
            "miniCalendar"
        );

    container.innerHTML = "";

    const year =
        currentDate.getFullYear();

    const month =
        currentDate.getMonth();

    document.getElementById(
        "miniMonth"
    ).textContent =
        new Date(
            year,
            month,
            1
        ).toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );


    const names =
        [
            "Su",
            "Mo",
            "Tu",
            "We",
            "Th",
            "Fr",
            "Sa"
        ];

    names.forEach(
        name => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "mini-day-name";

            div.textContent =
                name;

            container.appendChild(div);
        }
    );


    const first =
        new Date(
            year,
            month,
            1
        );

    const last =
        new Date(
            year,
            month + 1,
            0
        );

    const previousLast =
        new Date(
            year,
            month,
            0
        ).getDate();


    for (
        let i = 0;
        i < first.getDay();
        i++
    ) {

        const date =
            previousLast -
            first.getDay() +
            i +
            1;

        addMiniDay(
            container,
            new Date(
                year,
                month - 1,
                date
            ),
            true
        );
    }


    for (
        let day = 1;
        day <= last.getDate();
        day++
    ) {

        addMiniDay(
            container,
            new Date(
                year,
                month,
                day
            ),
            false
        );
    }
}


function addMiniDay(
    container,
    date,
    muted
) {

    const div =
        document.createElement(
            "div"
        );

    div.className =
        "mini-day";

    if (muted) {
        div.classList.add("muted");
    }

    if (
        dateKey(date) ===
        dateKey(currentDate)
    ) {

        div.classList.add(
            "selected"
        );
    }

    div.textContent =
        date.getDate();

    div.addEventListener(
        "click",
        () => {

            currentDate =
                new Date(date);

            loadEvents();
        }
    );

    container.appendChild(div);
}


/* ============================================================
   MODAL
============================================================ */

function openAddModal() {

    document.getElementById(
        "modalTitle"
    ).textContent =
        "Add Event";

    document.getElementById(
        "eventForm"
    ).reset();

    document.getElementById(
        "eventId"
    ).value = "";

    const start =
        new Date();

    start.setMinutes(
        Math.ceil(
            start.getMinutes() / 30
        ) * 30
    );

    const end =
        new Date(start);

    end.setHours(
        end.getHours() + 1
    );

    document.getElementById(
        "eventStart"
    ).value =
        localDateTime(start);

    document.getElementById(
        "eventEnd"
    ).value =
        localDateTime(end);

    document.getElementById(
        "eventModal"
    ).classList.remove(
        "hidden"
    );
}


function openEditModal(event) {

    document.getElementById(
        "modalTitle"
    ).textContent =
        "Edit Event";

    document.getElementById(
        "eventId"
    ).value =
        event.id;

    document.getElementById(
        "eventTitle"
    ).value =
        event.title || "";

    document.getElementById(
        "eventType"
    ).value =
        event.event_type || "Other";

    document.getElementById(
        "eventAudit"
    ).value =
        event.audit_id || "";

    document.getElementById(
        "eventStart"
    ).value =
        event.start_datetime
            ? event.start_datetime.slice(
                0,
                16
            )
            : "";

    document.getElementById(
        "eventEnd"
    ).value =
        event.end_datetime
            ? event.end_datetime.slice(
                0,
                16
            )
            : "";

    document.getElementById(
        "eventAllDay"
    ).checked =
        Boolean(event.all_day);

    document.getElementById(
        "eventLocation"
    ).value =
        event.location || "";

    document.getElementById(
        "eventDescription"
    ).value =
        event.description || "";

    document.getElementById(
        "eventModal"
    ).classList.remove(
        "hidden"
    );
}


function closeModal() {

    document.getElementById(
        "eventModal"
    ).classList.add(
        "hidden"
    );
}


/* ============================================================
   SAVE EVENT
============================================================ */

async function saveEvent(event) {

    event.preventDefault();

    const id =
        document.getElementById(
            "eventId"
        ).value;


    const auditId =
        document.getElementById(
            "eventAudit"
        ).value;


    const payload = {

        title:
            document.getElementById(
                "eventTitle"
            ).value.trim(),

        event_type:
            document.getElementById(
                "eventType"
            ).value,

        audit_id:
            auditId
                ? Number(auditId)
                : null,

        start_datetime:
            document.getElementById(
                "eventStart"
            ).value,

        end_datetime:
            document.getElementById(
                "eventEnd"
            ).value || null,

        all_day:
            document.getElementById(
                "eventAllDay"
            ).checked,

        location:
            document.getElementById(
                "eventLocation"
            ).value.trim() || null,

        description:
            document.getElementById(
                "eventDescription"
            ).value.trim() || null,

        status: "Scheduled"
    };


    try {

        if (id) {

            await apiFetch(
                `/api/auditor/calendar/events/${id}`,
                {
                    method: "PATCH",
                    body: JSON.stringify(
                        payload
                    )
                }
            );

        } else {

            await apiFetch(
                "/api/auditor/calendar/events",
                {
                    method: "POST",
                    body: JSON.stringify(
                        payload
                    )
                }
            );
        }


        closeModal();

        await loadEvents();

    } catch (error) {

        alert(
            error.message ||
            "Unable to save event."
        );
    }
}


/* ============================================================
   DELETE EVENT
============================================================ */

async function deleteEvent(id) {

    if (
        !confirm(
            "Delete this calendar event?"
        )
    ) {
        return;
    }

    try {

        await apiFetch(
            `/api/auditor/calendar/events/${id}`,
            {
                method: "DELETE"
            }
        );

        await loadEvents();

    } catch (error) {

        alert(
            error.message
        );
    }
}


/* ============================================================
   EVENTS
============================================================ */

function setupEvents() {

    document.getElementById(
        "previousWeek"
    ).addEventListener(
        "click",
        () => {

            currentDate.setDate(
                currentDate.getDate() - 7
            );

            loadEvents();
        }
    );


    document.getElementById(
        "nextWeek"
    ).addEventListener(
        "click",
        () => {

            currentDate.setDate(
                currentDate.getDate() + 7
            );

            loadEvents();
        }
    );


    document.getElementById(
        "todayButton"
    ).addEventListener(
        "click",
        () => {

            currentDate =
                new Date();

            loadEvents();
        }
    );


    document.getElementById(
        "addEventButton"
    ).addEventListener(
        "click",
        openAddModal
    );


    document.getElementById(
        "closeModal"
    ).addEventListener(
        "click",
        closeModal
    );


    document.getElementById(
        "cancelEvent"
    ).addEventListener(
        "click",
        closeModal
    );


    document.getElementById(
        "eventForm"
    ).addEventListener(
        "submit",
        saveEvent
    );


    document.getElementById(
        "filterButton"
    ).addEventListener(
        "click",
        () => {

            document.getElementById(
                "filterPanel"
            ).classList.toggle(
                "hidden"
            );
        }
    );


    document.getElementById(
        "eventTypeFilter"
    ).addEventListener(
        "change",
        loadEvents
    );


    document.getElementById(
        "auditFilter"
    ).addEventListener(
        "change",
        loadEvents
    );


    document.getElementById(
        "completedFilter"
    ).addEventListener(
        "change",
        loadEvents
    );


    document.getElementById(
        "miniPrevious"
    ).addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );

            loadEvents();
        }
    );


    document.getElementById(
        "miniNext"
    ).addEventListener(
        "click",
        () => {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );

            loadEvents();
        }
    );


    document.getElementById(
        "globalSearch"
    ).addEventListener(
        "input",
        searchCalendar
    );
}


/* ============================================================
   SEARCH
============================================================ */

function searchCalendar(event) {

    const value =
        event.target.value
            .trim()
            .toLowerCase();

    document.querySelectorAll(
        ".calendar-event"
    ).forEach(
        element => {

            element.style.display =
                !value ||
                element.textContent
                    .toLowerCase()
                    .includes(value)
                    ? ""
                    : "none";
        }
    );
}


/* ============================================================
   INITIALIZATION
============================================================ */

async function initCalendar() {

    setupEvents();

    await loadCurrentUser();

    await loadAudits();

    await loadEvents();
}


document.addEventListener(
    "DOMContentLoaded",
    initCalendar
);