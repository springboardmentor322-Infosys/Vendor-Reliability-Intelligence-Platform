let editingId = null;

const modal = document.getElementById("notificationModal");

const tbody = document.getElementById("notificationTableBody");

document
    .getElementById("addNotificationBtn")
    .onclick = openAddModal;

document
    .getElementById("cancelNotification")
    .onclick = closeModal;

document
    .getElementById("notificationForm")
    .addEventListener("submit", saveNotification);

document
    .getElementById("searchNotification")
    .addEventListener("input", loadNotifications);

document
    .getElementById("typeFilter")
    .addEventListener("change", loadNotifications);

initialize();

async function initialize(){

    await loadNotifications();

}

async function loadNotifications(){

    try{

        const notifications = await getNotifications();

        const keyword = document
            .getElementById("searchNotification")
            .value
            .toLowerCase();

        const type = document
            .getElementById("typeFilter")
            .value;

        tbody.innerHTML = "";

        notifications

        .filter(item=>{

            const searchMatch =

                item.title.toLowerCase().includes(keyword)

                ||

                item.message.toLowerCase().includes(keyword);

            const typeMatch =

                type===""

                ||

                item.notification_type===type;

            return searchMatch && typeMatch;

        })

        .forEach(item=>{

            tbody.innerHTML += `

            <tr>

                <td>${item.title}</td>

                <td>

                    <span class="status ${item.notification_type.toLowerCase()}">

                        ${item.notification_type}

                    </span>

                </td>

                <td>

                    ${item.is_read

                        ? '<span style="color:green;font-weight:600;">Read</span>'

                        : '<span style="color:red;font-weight:600;">Unread</span>'}

                </td>

                <td>

                    ${new Date(item.created_at).toLocaleString()}

                </td>

                <td>

                    <button

                        class="action-btn edit-btn"

                        onclick="editNotification(${item.id})">

                        Edit

                    </button>

                    <button

                        class="action-btn delete-btn"

                        onclick="deleteNotificationHandler(${item.id})">

                        Delete

                    </button>

                </td>

            </tr>

            `;

        });

    }

    catch(error){

        console.error(error);

        showToast(

            "Unable to load notifications",

            "error"

        );

    }

}

function openAddModal(){

    editingId = null;

    document
        .getElementById("modalTitle")
        .innerHTML = "Add Notification";

    document
        .getElementById("notificationForm")
        .reset();

    document
        .getElementById("isRead")
        .value = "false";

    modal.classList.add("show");

}

function closeModal(){

    modal.classList.remove("show");

}

async function saveNotification(e){

    e.preventDefault();

    const data={

        title:

            document
            .getElementById("title")
            .value,

        message:

            document
            .getElementById("message")
            .value,

        notification_type:

            document
            .getElementById("notificationType")
            .value,

        is_read:

            document
            .getElementById("isRead")
            .value==="true"

    };

    try{

        if(editingId){

            await updateNotification(

                editingId,

                data

            );

            showToast(

                "Notification Updated",

                "success"

            );

        }

        else{

            await createNotification(data);

            showToast(

                "Notification Added",

                "success"

            );

        }

        closeModal();

        loadNotifications();

    }

    catch(error){

        console.error(error);

        showToast(

            "Operation Failed",

            "error"

        );

    }

}

async function editNotification(id){

    try{

        const notification =

            await getNotification(id);

        editingId = id;

        document
            .getElementById("modalTitle")
            .innerHTML = "Edit Notification";

        document
            .getElementById("title")
            .value = notification.title;

        document
            .getElementById("message")
            .value = notification.message;

        document
            .getElementById("notificationType")
            .value = notification.notification_type;

        document
            .getElementById("isRead")
            .value = notification.is_read.toString();

        modal.classList.add("show");

    }

    catch(error){

        console.error(error);

        showToast(

            "Unable to load notification",

            "error"

        );

    }

}

async function deleteNotificationHandler(id){

    showConfirm(

        "Delete Notification",

        "Are you sure you want to delete this notification?",

        async()=>{

            try{

                await deleteNotification(id);

                showToast(

                    "Notification Deleted",

                    "success"

                );

                loadNotifications();

            }

            catch(error){

                console.error(error);

                showToast(

                    "Delete Failed",

                    "error"

                );

            }

        }

    );

}