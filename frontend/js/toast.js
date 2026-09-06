/* ======================================
   TOAST NOTIFICATION
====================================== */

function showToast(message, success = true) {

    const toast = document.getElementById("toast");

    if (!toast) {
        return;
    }

    toast.innerHTML = message;

    toast.className = "toast";

    if (!success) {

        toast.classList.add("error");

    }

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}