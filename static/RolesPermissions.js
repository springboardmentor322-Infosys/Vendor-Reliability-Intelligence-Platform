/* ==========================================================
   VENDORIQ
   ROLES & PERMISSIONS
========================================================== */


const API = "http://127.0.0.1:8000";


let roles = [];

let selectedRoleId = null;

let selectedRole = null;

let allPermissions = [];

let editMode = false;


/* ==========================================================
   AUTH TOKEN
========================================================== */

function getToken() {

    return (

        localStorage.getItem("access_token") ||

        localStorage.getItem("token") ||

        localStorage.getItem("jwt_token") ||

        sessionStorage.getItem("access_token") ||

        sessionStorage.getItem("token") ||

        ""

    );

}


/* ==========================================================
   API FETCH
========================================================== */

async function apiFetch(
    url,
    options = {}
) {

    const token = getToken();


    const headers = {

        "Content-Type":
            "application/json",

        ...(options.headers || {})

    };


    if (token) {

        headers[
            "Authorization"
        ] =
            `Bearer ${token}`;
    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    if (!response.ok) {

        let errorData = null;

        try {

            errorData =
                await response.json();

        } catch {

            errorData = null;
        }


        throw new Error(

            errorData?.detail ||

            `HTTP ${response.status}`

        );
    }


    return response;
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await loadAdminProfile();

            await loadRoles();

        } catch (error) {

            console.error(
                "Roles page initialization failed:",
                error
            );

        }

    }
);


/* ==========================================================
   LOAD ROLES
========================================================== */

async function loadRoles() {

    const response =
        await apiFetch(
            `${API}/api/roles`
        );


    roles =
        await response.json();


    renderRoles();


    if (roles.length > 0) {

        selectRole(
            roles[0].id
        );
    }

}


/* ==========================================================
   RENDER ROLES
========================================================== */

function renderRoles() {

    const container =
        document.getElementById(
            "roleList"
        );


    const search =
        document.getElementById(
            "roleSearch"
        ).value
        .trim()
        .toLowerCase();


    const filtered =
        roles.filter(
            role =>
                role.name
                    .toLowerCase()
                    .includes(search)
        );


    container.innerHTML = "";


    filtered.forEach(
        role => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "role-item";


            if (
                role.id ===
                selectedRoleId
            ) {

                item.classList.add(
                    "selected"
                );
            }


            item.onclick = () =>
                selectRole(
                    role.id
                );


            const icon =
                getRoleIcon(
                    role.name
                );


            item.innerHTML = `

                <div class="role-item-icon">

                    <i class="${icon}"></i>

                </div>


                <div class="role-item-content">

                    <div class="role-item-title">

                        ${escapeHtml(role.name)}

                        <span class="system-badge">
                            ${escapeHtml(role.role_type)}
                        </span>

                    </div>


                    <div class="role-item-description">

                        ${escapeHtml(
                            role.description || ""
                        )}

                    </div>

                </div>


                <div class="role-users">

                    <strong>
                        ${role.user_count || 0}
                    </strong>

                    Users

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );


    document.getElementById(
        "roleCount"
    ).textContent =
        `Showing ${filtered.length} of ${roles.length} roles`;
}


/* ==========================================================
   FILTER ROLES
========================================================== */

function filterRoles() {

    renderRoles();

}


/* ==========================================================
   SELECT ROLE
========================================================== */

async function selectRole(
    roleId
) {

    selectedRoleId =
        roleId;


    selectedRole =
        roles.find(
            role =>
                role.id === roleId
        );


    renderRoles();


    if (!selectedRole) {

        return;
    }


    document.getElementById(
        "selectedRoleName"
    ).textContent =
        selectedRole.name;


    document.getElementById(
        "selectedRoleDescription"
    ).textContent =
        selectedRole.description ||
        "";


    document.getElementById(
        "selectedUserCount"
    ).textContent =
        selectedRole.user_count || 0;


    updateRoleIcon(
        selectedRole.name
    );


    await loadPermissions();

}


/* ==========================================================
   ROLE ICON
========================================================== */

function getRoleIcon(
    roleName
) {

    if (
        roleName ===
        "Procurement Manager"
    ) {

        return "fa-solid fa-briefcase";
    }


    if (
        roleName ===
        "Finance Officer"
    ) {

        return "fa-solid fa-file-invoice-dollar";
    }


    if (
        roleName ===
        "Vendor"
    ) {

        return "fa-solid fa-store";
    }


    if ( roleName === "Supply Chain Manager" ){
        return "fa-solid fa-truck";
    }


    if ( roleName === "Auditor" ){
        return "fa-solid fa-file-shield";
    }


    return "fa-solid fa-user-shield";
}


function updateRoleIcon(
    roleName
) {

    const icon =
        document.querySelector(
            "#roleIcon i"
        );


    icon.className =
        getRoleIcon(
            roleName
        );
}


/* ==========================================================
   LOAD PERMISSIONS
========================================================== */

async function loadPermissions() {

    if (!selectedRoleId) {

        return;
    }


    const response =
        await apiFetch(

            `${API}/api/roles/` +
            `${selectedRoleId}/permissions`

        );


    allPermissions =
        await response.json();


    populateModuleFilter();

    renderPermissions();

}


/* ==========================================================
   MODULE FILTER
========================================================== */

function populateModuleFilter() {

    const select =
        document.getElementById(
            "moduleFilter"
        );


    const modules =
        [
            ...new Set(
                allPermissions.map(
                    p => p.module
                )
            )
        ];


    select.innerHTML = `

        <option value="all">
            All Modules
        </option>

    `;


    modules.forEach(
        module => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                module;

            option.textContent =
                module;

            select.appendChild(
                option
            );

        }
    );
}


/* ==========================================================
   RENDER PERMISSIONS
========================================================== */

function renderPermissions() {

    const tbody =
        document.getElementById(
            "permissionTable"
        );


    const moduleFilter =
        document.getElementById(
            "moduleFilter"
        ).value;


    const search =
        document.getElementById(
            "permissionSearch"
        ).value
        .trim()
        .toLowerCase();


    let filtered =
        allPermissions;


    if (
        moduleFilter !==
        "all"
    ) {

        filtered =
            filtered.filter(
                item =>
                    item.module ===
                    moduleFilter
            );
    }


    if (search) {

        filtered =
            filtered.filter(
                item =>

                    item.permission
                        .toLowerCase()
                        .includes(search)

                    ||

                    item.module
                        .toLowerCase()
                        .includes(search)
            );
    }


    const modules = {};


    filtered.forEach(
        item => {

            if (!modules[item.module]) {

                modules[item.module] =
                    [];
            }


            modules[item.module]
                .push(item);

        }
    );


    tbody.innerHTML = "";


    Object.entries(modules)
        .forEach(
            (
                [module, permissions]
            ) => {


                const moduleRow =
                    document.createElement(
                        "tr"
                    );


                moduleRow.className =
                    "module-row";


                moduleRow.innerHTML = `

                    <td colspan="6">

                        <i class="fa-solid fa-chevron-down"></i>

                        ${escapeHtml(module)}

                    </td>

                `;


                tbody.appendChild(
                    moduleRow
                );


                permissions.forEach(
                    permission => {

                        const row =
                            document.createElement(
                                "tr"
                            );


                        row.innerHTML = `

                            <td>

                                <span class="permission-name">

                                    ${escapeHtml(
                                        permission.permission
                                    )}

                                </span>

                            </td>


                            <td>

                                ${renderAccess(
                                    permission,
                                    "Procurement Manager"
                                )}

                            </td>


                            <td>

                                ${renderAccess(
                                    permission,
                                    "Finance Officer"
                                )}

                            </td>


                            <td>

                                ${renderAccess(
                                    permission,
                                    "Supply Chain Manager"
                                )}

                            </td>


                            <td>

                                ${renderAccess(
                                    permission,
                                    "Auditor"
                                )}

                            </td>


                            <td>

                                ${renderAccess(
                                    permission,
                                    "Vendor"
                                )}

                            </td>

                        `;


                        tbody.appendChild(
                            row
                        );

                    }
                );

            }
        );
}


/* ==========================================================
   ACCESS
========================================================== */

function renderAccess(
    permission,
    roleName
) {

    /*
       The API currently returns permissions
       for the selected role.

       We therefore calculate the comparison
       values from the seeded matrix below.
    */


    const access =
        getComparisonAccess(
            roleName,
            permission.module,
            permission.permission
        );


    if (
        editMode &&
        roleName ===
        selectedRole?.name
    ) {

        return `

            <select
                class="access-select"
                onchange="changePermission(
                    '${escapeJs(permission.module)}',
                    '${escapeJs(permission.permission)}',
                    this.value
                )"
            >

                <option
                    value="full"
                    ${access === "full"
                        ? "selected"
                        : ""}
                >
                    Full
                </option>

                <option
                    value="partial"
                    ${access === "partial"
                        ? "selected"
                        : ""}
                >
                    Partial
                </option>

                <option
                    value="none"
                    ${access === "none"
                        ? "selected"
                        : ""}
                >
                    None
                </option>

            </select>

        `;
    }


    return `

        <span class="
            access-icon
            ${access}
        ">

            ${getAccessSymbol(access)}

        </span>

    `;
}


/* ==========================================================
   COMPARISON ACCESS
========================================================== */

function getComparisonAccess(
    roleName,
    module,
    permission
) {

    const selected =
        allPermissions.find(
            p =>
                p.module === module &&
                p.permission === permission
        );


    /*
       For the selected role,
       use the PostgreSQL value.
    */

    if (
        selectedRole &&
        roleName ===
        selectedRole.name
    ) {

        return (
            selected?.access ||
            "none"
        );
    }


    /*
       Comparison values.
       These correspond to the seeded
       PostgreSQL permission configuration.
    */

    const rules = {

        "Procurement Manager": {

            "Dashboard & Overview":
                "full",

            "Procurement & Purchase Orders":
                "full",

            "Vendor Management":
                "full",

            "Invoices & Payments":
                "partial",

            "Contracts & Compliance":
                "full",

            "Reports & Exports":
                "full",

            "Communication":
                "full"
        },


        "Finance Officer": {

            "Dashboard & Overview":
                "full",

            "Procurement & Purchase Orders":
                "partial",

            "Vendor Management":
                "partial",

            "Invoices & Payments":
                "full",

            "Contracts & Compliance":
                "partial",

            "Reports & Exports":
                "full",

            "Communication":
                "partial"
        },


        "Vendor": {

            "Dashboard & Overview":
                "partial",

            "Procurement & Purchase Orders":
                "partial",

            "Vendor Management":
                "partial",

            "Invoices & Payments":
                "partial",

            "Contracts & Compliance":
                "partial",

            "Reports & Exports":
                "none",

            "Communication":
                "full"
        }

    };


    return (
        rules[roleName]?.[module] ||
        "none"
    );
}


/* ==========================================================
   ACCESS SYMBOL
========================================================== */

function getAccessSymbol(
    access
) {

    if (
        access === "full"
    ) {

        return "✓";
    }


    if (
        access === "partial"
    ) {

        return "−";
    }


    return "×";
}


/* ==========================================================
   EDIT MODE
========================================================== */

function toggleEditMode() {

    editMode =
        !editMode;


    const button =
        document.querySelector(
            ".edit-button"
        );


    if (editMode) {

        button.innerHTML = `

            <i class="fa-solid fa-save"></i>

            Save Permissions

        `;

    } else {

        button.innerHTML = `

            <i class="fa-solid fa-pen"></i>

            Edit Role

        `;

    }


    renderPermissions();


    if (!editMode) {

        savePermissions();

    }
}


/* ==========================================================
   CHANGE PERMISSION
========================================================== */

function changePermission(
    module,
    permission,
    access
) {

    const item =
        allPermissions.find(
            p =>
                p.module === module &&
                p.permission === permission
        );


    if (item) {

        item.access =
            access;
    }
}


/* ==========================================================
   SAVE PERMISSIONS
========================================================== */

async function savePermissions() {

    if (!selectedRoleId) {

        return;
    }


    try {

        const response =
            await apiFetch(

                `${API}/api/roles/` +
                `${selectedRoleId}/permissions`,

                {

                    method: "PUT",

                    body: JSON.stringify({

                        permissions:
                            allPermissions.map(
                                p => ({

                                    module:
                                        p.module,

                                    permission:
                                        p.permission,

                                    access:
                                        p.access

                                })
                            )

                    })

                }

            );


        const data =
            await response.json();


        console.log(
            "Permissions saved:",
            data
        );


        alert(
            "Permissions updated successfully."
        );


    } catch (error) {

        console.error(
            "Unable to save permissions:",
            error
        );


        alert(
            "Unable to save permissions."
        );
    }
}


/* ==========================================================
   CREATE ROLE MODAL
========================================================== */

function openCreateRoleModal() {

    document
        .getElementById(
            "roleModal"
        )
        .classList.add(
            "show"
        );
}


function closeRoleModal() {

    document
        .getElementById(
            "roleModal"
        )
        .classList.remove(
            "show"
        );
}


/* ==========================================================
   CREATE ROLE
========================================================== */

async function createRole() {

    const name =
        document.getElementById(
            "newRoleName"
        ).value.trim();


    const description =
        document.getElementById(
            "newRoleDescription"
        ).value.trim();


    if (!name) {

        alert(
            "Please enter a role name."
        );

        return;
    }


    try {

        await apiFetch(

            `${API}/api/roles`,

            {

                method: "POST",

                body: JSON.stringify({

                    name,
                    description,

                    role_type:
                        "Custom"

                })

            }

        );


        closeRoleModal();


        document.getElementById(
            "newRoleName"
        ).value = "";


        document.getElementById(
            "newRoleDescription"
        ).value = "";


        await loadRoles();


        alert(
            "Role created successfully."
        );


    } catch (error) {

        console.error(
            "Create role error:",
            error
        );


        alert(
            error.message
        );
    }
}


/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


function escapeJs(
    value
) {

    return String(value)
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        );
}


function openAdminProfile(){
    window.location.href = "/admin/profile";
}


// ============================================================
// HELPER: SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {

        element.textContent =
            value ?? "";

    }
}


function updateHeader(user) {

    const name =
        user.name || "Admin User";

    const email =
        user.email || "";

    const role =
        user.role || "Administrator";


    setText(
        "headerAdminName",
        name
    );

    setText(
        "headerAdminRole",
        role
    );


    setText(
        "sidebarAdminName",
        name
    );

    setText(
        "sidebarAdminEmail",
        email
    );
}


async function loadAdminProfile() {

    try {

        const response = await apiFetch(
            `${API}/adminprofile`
        );

        const data = await response.json();

        console.log(
            "Admin profile:",
            data
        );

        // If API returns:
        // { name, email, role }

        updateHeader(data);

    }
    catch (error) {

        console.error(
            "Unable to load admin profile:",
            error
        );

    }
}