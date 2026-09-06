let editingUserId = null;


const modal =
  document.getElementById("userModal");

const form =
  document.getElementById("userForm");

const tableBody =
  document.getElementById("userTableBody");

const addUserBtn =
  document.getElementById("addUserBtn");

const cancelUserBtn =
  document.getElementById("cancelUser");

const closeUserModal =
  document.getElementById("closeUserModal");

const roleSelect =
  document.getElementById("role");



/* =========================================================
   INITIAL LOAD
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    await loadUsers();

  }
);



/* =========================================================
   ADD USER
========================================================= */

addUserBtn.onclick = () => {

  editingUserId = null;

  form.reset();

  document.getElementById(
    "userModalTitle"
  ).textContent = "Add User";


  document.getElementById(
    "passwordHelp"
  ).textContent =
    "Required when creating a user";


  document.getElementById(
    "password"
  ).required = true;


  modal.classList.add("show");

};



/* =========================================================
   CLOSE MODAL
========================================================= */

cancelUserBtn.onclick = () => {

  modal.classList.remove("show");

};


closeUserModal.onclick = () => {

  modal.classList.remove("show");

};



/* =========================================================
   LOAD USERS
========================================================= */

async function loadUsers() {
    try {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    Loading users...
                </td>
            </tr>
        `;

        const response = await getUsers();

        const users = Array.isArray(response)
            ? response
            : response?.items
            || response?.users
            || response?.data
            || [];

        tableBody.innerHTML = "";

        if (!users.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        No users found
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.id ?? "-"}</td>

                <td>
                    ${escapeHtml(user.full_name)}
                </td>

                <td>
                    ${escapeHtml(user.email)}
                </td>

                <td>
                    <span class="role-badge">
                        ${escapeHtml(user.role)}
                    </span>
                </td>

                <td>
                    ${formatDate(user.created_at)}
                </td>

                <td>
                    <button
                        class="edit-btn"
                        onclick="editUser(${user.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="removeUser(${user.id})"
                    >
                        Delete
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Failed to load users:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    Failed to load users
                </td>
            </tr>
        `;
    }
}



/* =========================================================
   EDIT USER
========================================================= */

async function editUser(id) {

  try {

    const user =
      await apiRequest(
        `/users/${id}`,
        "GET",
        null,
        getToken()
      );


    if (!user) {

      showToast(
        "User not found",
        "error"
      );

      return;

    }


    editingUserId = id;


    document.getElementById(
      "userModalTitle"
    ).textContent =
      "Edit User";


    document.getElementById(
      "fullName"
    ).value =
      user.full_name || "";


    document.getElementById(
      "email"
    ).value =
      user.email || "";


    roleSelect.value =
      user.role || "Vendor";


    document.getElementById(
      "password"
    ).value = "";


    document.getElementById(
      "password"
    ).required = false;


    document.getElementById(
      "passwordHelp"
    ).textContent =
      "Leave blank to keep the current password";


    modal.classList.add("show");

  }

  catch (error) {

    console.error(
      "Failed to load user:",
      error
    );


    showToast(
      "Failed to load user",
      "error"
    );

  }

}



/* =========================================================
   CREATE / UPDATE USER
========================================================= */

form.onsubmit =
  async (event) => {

    event.preventDefault();


    const fullName =
      document.getElementById(
        "fullName"
      ).value.trim();


    const email =
      document.getElementById(
        "email"
      ).value.trim();


    const password =
      document.getElementById(
        "password"
      ).value;


    const role =
      roleSelect.value;


    if (!fullName) {

      showToast(
        "Full name is required",
        "error"
      );

      return;

    }


    if (!email) {

      showToast(
        "Email is required",
        "error"
      );

      return;

    }


    if (
      !editingUserId &&
      !password
    ) {

      showToast(
        "Password is required",
        "error"
      );

      return;

    }


    try {

      if (editingUserId) {

        const updateData = {

          full_name: fullName,

          email: email,

          role: role

        };


        if (password) {

          updateData.password =
            password;

        }


        await apiRequest(
            `/users/${editingUserId}`,
            "PUT",
            updateData,
            getToken()
        );

        showToast(
          "User updated successfully",
          "success"
        );

      }

      else {

        const createData = {

          full_name: fullName,

          email: email,

          password: password

        };


        await apiRequest(
            "/users/",
            "POST",
            createData,
            getToken()
        );

        showToast(
          "User created successfully",
          "success"
        );

      }


      modal.classList.remove(
        "show"
      );


      await loadUsers();

    }

    catch (error) {

      console.error(
        "User operation failed:",
        error
      );


      showToast(
        getErrorMessage(error),
        "error"
      );

    }

  };



/* =========================================================
   DELETE USER
========================================================= */

async function removeUser(id) {

  showConfirm(

    "Delete this user?",

    async () => {

      try {

        await apiRequest(
            `/users/${id}`,
            "DELETE",
            null,
            getToken()
        );


        showToast(
          "User deleted successfully",
          "success"
        );


        await loadUsers();

      }

      catch (error) {

        console.error(
          "Delete user failed:",
          error
        );


        showToast(
          getErrorMessage(error),
          "error"
        );

      }

    }

  );

}



/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(value) {

  if (!value) {

    return "-";

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}



/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
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



/* =========================================================
   ERROR MESSAGE
========================================================= */

function getErrorMessage(error) {

  if (
    error?.response?.detail
  ) {

    return error.response.detail;

  }


  if (error?.detail) {

    return error.detail;

  }


  if (error?.message) {

    return error.message;

  }


  return "Operation failed";

}