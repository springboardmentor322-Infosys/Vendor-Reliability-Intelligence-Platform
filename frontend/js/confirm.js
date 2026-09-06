/* ======================================
   CONFIRM DIALOG
====================================== */

function showConfirm(message, onConfirm) {

    const modal = document.getElementById("confirmModal");

    const text = document.getElementById("confirmMessage");

    const yesBtn = document.getElementById("confirmYes");

    const noBtn = document.getElementById("confirmNo");

    text.innerHTML = message;

    modal.classList.add("show");

    yesBtn.onclick = () => {

        modal.classList.remove("show");

        onConfirm();

    };

    noBtn.onclick = () => {

        modal.classList.remove("show");

    };

}