const API_BASE = "http://127.0.0.1:8000";


// ============================================================
// GET AUTH TOKEN
// ============================================================

function getAccessToken() {
    return sessionStorage.getItem("access_token");
}


// ============================================================
// API FETCH HELPER
// ============================================================

async function apiFetch(url, options = {}) {

    const token = getAccessToken();

    const headers = {
        ...(options.headers || {})
    };

    // --------------------------------------------------------
    // Add JWT Authorization header
    // --------------------------------------------------------

    if (token) {
        headers["Authorization"] =
            `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers: headers,
        credentials: "include"
    });
}


// ============================================================
// SET TEXT
// ============================================================

function setText(elementId, value) {

    const element =
        document.getElementById(elementId);

    if (element) {
        element.textContent =
            value ?? "";
    }
}


// ============================================================
// LOAD CURRENT USER
// ============================================================

async function loadCurrentUser() {

    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/auth/me`,
                {
                    method: "GET"
                }
            );


        // ----------------------------------------------------
        // Not authenticated
        // ----------------------------------------------------

        if (response.status === 401) {

            console.warn(
                "User is not authenticated."
            );

            setText(
                "sidebarName",
                "User"
            );

            setText(
                "sidebarRole",
                "Finance Officer"
            );

            return;
        }


        // ----------------------------------------------------
        // Other errors
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        // ----------------------------------------------------
        // User data
        // ----------------------------------------------------

        const user =
            await response.json();

        console.log(
            "Current user:",
            user
        );


        const name =
            user.name ||
            user.full_name ||
            user.username ||
            user.email ||
            "User";


        const role =
            user.role ||
            user.user_role ||
            "Finance Officer";


        setText(
            "sidebarName",
            name
        );

        setText(
            "sidebarRole",
            role
        );

        setText(
            "headerName",
            name
        );

        setText(
            "headerRole",
            role
        );


    } catch (error) {

        console.error(
            "Unable to load current user:",
            error
        );

        setText(
            "sidebarName",
            "User"
        );
    }
}


// ============================================================
// LOAD APPROVAL WORKFLOW
// ============================================================

async function loadWorkflow() {

    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/finance/approval-workflow`,
                {
                    method: "GET"
                }
            );


        // ----------------------------------------------------
        // Authentication error
        // ----------------------------------------------------

        if (response.status === 401) {

            console.error(
                "Workflow request failed: User is not authenticated."
            );

            showWorkflowMessage(
                "Please log in to load the approval workflow."
            );

            return;
        }


        // ----------------------------------------------------
        // Authorization error
        // ----------------------------------------------------

        if (response.status === 403) {

            console.error(
                "User does not have permission."
            );

            showWorkflowMessage(
                "You do not have permission to view this workflow."
            );

            return;
        }


        // ----------------------------------------------------
        // Other errors
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        // ----------------------------------------------------
        // Workflow data
        // ----------------------------------------------------

        const workflow =
            await response.json();

        console.log(
            "Workflow:",
            workflow
        );


        populateWorkflow(
            workflow
        );


    } catch (error) {

        console.error(
            "Workflow loading error:",
            error
        );

        showWorkflowMessage(
            "Unable to load approval workflow."
        );
    }
}


// ============================================================
// POPULATE WORKFLOW
// ============================================================

function populateWorkflow(workflow) {

    console.log("Workflow received:", workflow);

    if (!workflow) {
        return;
    }

    // --------------------------------------------------
    // Optional workflow information
    // --------------------------------------------------

    setText(
        "workflowReference",
        workflow.reference_number || ""
    );

    setText(
        "workflowTitle",
        workflow.title || ""
    );

    setText(
        "workflowAmount",
        workflow.amount ?? 0
    );

    setText(
        "workflowStatus",
        workflow.status || ""
    );

    // --------------------------------------------------
    // Steps
    // --------------------------------------------------

    if (Array.isArray(workflow.steps)) {

        renderWorkflowSteps(
            workflow.steps
        );

    } else {

        renderWorkflowSteps([]);
    }
}

// ============================================================
// RENDER WORKFLOW STEPS
// ============================================================

function renderWorkflowSteps(steps) {

    const workflow =
        document.getElementById(
            "workflow"
        );

    if (!workflow) {

        console.warn(
            "#workflow element not found."
        );

        return;
    }


    workflow.innerHTML = "";


    steps.forEach(
        (item, index) => {

            const stepNumber =
                item.step_number ||
                index + 1;


            const stepName =
                item.name ||
                `Approval Step ${stepNumber}`;


            const description =
                item.description ||
                "Configure this approval level";


            // ------------------------------------------------
            // Connector
            // ------------------------------------------------

            if (index > 0) {

                const connector =
                    document.createElement(
                        "div"
                    );

                connector.className =
                    "connector";

                workflow.appendChild(
                    connector
                );
            }


            // ------------------------------------------------
            // Step
            // ------------------------------------------------

            const step =
                document.createElement(
                    "div"
                );

            step.className =
                "step";


            step.innerHTML = `

                <div class="step-number">
                    ${stepNumber}
                </div>

                <div class="step-content">

                    <strong>
                        ${escapeHtml(stepName)}
                    </strong>

                    <span>
                        ${escapeHtml(description)}
                    </span>

                </div>

                <i class="fa-solid fa-grip-lines"></i>

            `;


            workflow.appendChild(
                step
            );
        }
    );
}


// ============================================================
// ADD WORKFLOW STEP
// ============================================================

function addWorkflowStep() {

    const workflow = document.getElementById("workflow");

    if (!workflow) {
        console.error("#workflow element not found.");
        return;
    }

    const existingSteps = workflow.querySelectorAll(".step");
    const count = existingSteps.length + 1;

    // Connector
    if (existingSteps.length > 0) {
        const connector = document.createElement("div");
        connector.className = "connector";
        workflow.appendChild(connector);
    }

    // Step
    const step = document.createElement("div");
    step.className = "step";

    step.innerHTML = `
        <div class="step-number">
            ${count}
        </div>

        <div class="step-content">

            <div class="form-group">
                <label>Step Name</label>
                <input
                    type="text"
                    class="step-name"
                    value="Approval Step ${count}"
                    placeholder="Enter step name"
                >
            </div>

            <div class="form-group">
                <label>Approver</label>
                <select class="step-approver">
                    <option value="">Select Approver</option>
                    <option value="manager">Manager</option>
                    <option value="procurement_manager">
                        Procurement Manager
                    </option>
                    <option value="finance_officer">
                        Finance Officer
                    </option>
                    <option value="admin">
                        Administrator
                    </option>
                </select>
            </div>

            <div class="form-group">
                <label>Description</label>
                <input
                    type="text"
                    class="step-description"
                    value="Configure this approval level"
                    placeholder="Enter description"
                >
            </div>

        </div>

        <button
            type="button"
            class="remove-step"
            onclick="removeWorkflowStep(this)"
            title="Remove step"
        >
            <i class="fa-solid fa-trash"></i>
        </button>

        <i class="fa-solid fa-grip-lines drag-handle"></i>
    `;

    workflow.appendChild(step);
}


function removeWorkflowStep(button) {

    const step = button.closest(".step");

    if (!step) return;

    // Remove connector before this step if present
    const previous = step.previousElementSibling;

    if (previous && previous.classList.contains("connector")) {
        previous.remove();
    }

    step.remove();

    renumberWorkflowSteps();
}


// ============================================================
// RENUMBER WORKFLOW STEPS
// ============================================================

function renumberWorkflowSteps() {

    const workflow = document.getElementById("workflow");

    if (!workflow) return;

    const steps = workflow.querySelectorAll(".step");

    steps.forEach((step, index) => {

        const number =
            step.querySelector(".step-number");

        if (number) {
            number.textContent = index + 1;
        }
    });
}


function getWorkflowSteps() {

    const steps = [];

    document.querySelectorAll("#workflow .step")
        .forEach((step, index) => {

            steps.push({
                step_number: index + 1,
                step_name:
                    step.querySelector(".step-name")?.value || "",
                approver:
                    step.querySelector(".step-approver")?.value || "",
                description:
                    step.querySelector(".step-description")?.value || ""
            });

        });

    return steps;
}


// ============================================================
// COLLECT WORKFLOW STEPS
// ============================================================

function collectWorkflowSteps() {

    const steps =
        [
            ...document.querySelectorAll(
                "#workflow .step"
            )
        ];


    return steps.map(
        (step, index) => {

            const nameElement =
                step.querySelector(
                    "strong"
                );


            const descriptionElement =
                step.querySelector(
                    "span"
                );


            return {

                step_number:
                    index + 1,

                name:
                    nameElement
                        ? nameElement.textContent.trim()
                        : `Approval Step ${index + 1}`,

                description:
                    descriptionElement
                        ? descriptionElement.textContent.trim()
                        : "Configure this approval level"
            };
        }
    );
}


// ============================================================
// SAVE WORKFLOW
// ============================================================

async function saveWorkflow() {

    const amountRule =
        document.getElementById(
            "amountRule"
        );


    const approvalLimit =
        document.getElementById(
            "approvalLimit"
        );


    const parallelApproval =
        document.getElementById(
            "parallelApproval"
        );


    const autoReject =
        document.getElementById(
            "autoReject"
        );


    const data = {

        steps:
            collectWorkflowSteps(),

        amount_rule:
            amountRule
                ? amountRule.checked
                : false,

        approval_limit:
            approvalLimit
                ? Number(
                    approvalLimit.value
                ) || 0
                : 0,

        parallel_approval:
            parallelApproval
                ? parallelApproval.checked
                : false,

        auto_reject:
            autoReject
                ? autoReject.checked
                : false
    };


    console.log(
        "Saving workflow:",
        data
    );


    try {

        const response =
            await apiFetch(
                `${API_BASE}/api/finance/approval-workflow`,
                {

                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(data)
                }
            );


        // ----------------------------------------------------
        // 401
        // ----------------------------------------------------

        if (response.status === 401) {

            alert(
                "Your session has expired. Please log in again."
            );

            return;
        }


        // ----------------------------------------------------
        // 403
        // ----------------------------------------------------

        if (response.status === 403) {

            alert(
                "You do not have permission to modify the approval workflow."
            );

            return;
        }


        // ----------------------------------------------------
        // Other error
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText}`
            );
        }


        // ----------------------------------------------------
        // Success
        // ----------------------------------------------------

        const result =
            await response.json();


        console.log(
            "Workflow saved:",
            result
        );


        alert(
            "Approval workflow saved successfully."
        );


        // Reload saved workflow
        await loadWorkflow();


    } catch (error) {

        console.error(
            "Workflow save error:",
            error
        );


        alert(
            "Unable to save approval workflow."
        );
    }
}


// ============================================================
// SHOW WORKFLOW MESSAGE
// ============================================================

function showWorkflowMessage(message) {

    const workflow =
        document.getElementById(
            "workflow"
        );

    if (!workflow) {
        return;
    }


    workflow.innerHTML = `

        <div class="workflow-message">

            <i class="fa-solid fa-circle-exclamation"></i>

            <span>
                ${escapeHtml(message)}
            </span>

        </div>

    `;
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// LOGOUT
// ============================================================

function logout() {

    localStorage.removeItem(
        "access_token"
    );

    window.location.href =
        "/login.html";
}


// ============================================================
// INITIALIZE PAGE
// ============================================================

async function initializeApprovalWorkflow() {

    console.log(
        "Initializing Approval Workflow..."
    );


    const token =
        getAccessToken();


    if (!token) {

        console.warn(
            "No access token found in localStorage."
        );

        showWorkflowMessage(
            "Please log in first."
        );

        setText(
            "sidebarName",
            "User"
        );

        return;
    }


    await Promise.all([
        loadCurrentUser(),
        loadWorkflow()
    ]);


    console.log(
        "Approval Workflow initialized."
    );
}


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeApprovalWorkflow
);