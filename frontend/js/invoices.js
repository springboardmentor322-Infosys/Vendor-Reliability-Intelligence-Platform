let editingInvoiceId = null;

let currentInvoicePage = 1;

const invoicePageSize = 50;

let invoiceTotalPages = 1;

let invoiceTotalRecords = 0;


const modal =
  document.getElementById("invoiceModal");

const form =
  document.getElementById("invoiceForm");

const purchaseOrderSelect =
  document.getElementById(
    "invoicePurchaseOrder"
  );

const vendorSelect =
  document.getElementById(
    "invoiceVendor"
  );


document.getElementById(
  "addInvoiceBtn"
).onclick = async () => {

  editingInvoiceId = null;

  form.reset();

  document.getElementById(
    "invoiceModalTitle"
  ).textContent = "Add Invoice";

  await loadPurchaseOrderDropdown();

  await loadVendorDropdown();

  modal.classList.add("show");
};


document.getElementById(
  "closeInvoiceModal"
).onclick = () => {

  modal.classList.remove("show");

};


document.getElementById(
  "cancelInvoice"
).onclick = () => {

  modal.classList.remove("show");

};


async function loadVendorDropdown() {

  try {

    const vendors = await getVendors();

    vendorSelect.innerHTML = `
      <option value="">
        Select Vendor
      </option>
    `;


    vendors.forEach((vendor) => {

      vendorSelect.innerHTML += `
        <option value="${vendor.id}">
          ${vendor.vendor_name}
        </option>
      `;

    });

  } catch (error) {

    console.error(
      "Failed to load vendors:",
      error
    );

  }

}


async function loadPurchaseOrderDropdown() {

  try {

    /*
      We do NOT call getPurchaseOrders()
      without pagination.

      The database contains about
      180,520 purchase orders.
    */

    const response =
      await getPurchaseOrders(
        1,
        100
      );


    const orders =
      response.items || [];


    purchaseOrderSelect.innerHTML = `
      <option value="">
        Select Purchase Order
      </option>
    `;


    orders.forEach((order) => {

      purchaseOrderSelect.innerHTML += `
        <option value="${order.id}">
          ${order.po_number}
        </option>
      `;

    });

  } catch (error) {

    console.error(
      "Failed to load purchase orders:",
      error
    );

  }

}


async function loadInvoices(
  page = 1
) {

  try {

    const response =
      await getInvoices(
        page,
        invoicePageSize
      );


    const invoices =
      response.items || [];


    currentInvoicePage =
      response.page || page;


    invoiceTotalPages =
      response.total_pages || 1;


    invoiceTotalRecords =
      response.total || 0;


    const tbody =
      document.getElementById(
        "invoiceTableBody"
      );


    tbody.innerHTML = "";


    if (!invoices.length) {

      tbody.innerHTML = `
        <tr>

          <td
            colspan="8"
            style="text-align:center;"
          >
            No Invoices Found
          </td>

        </tr>
      `;

      renderInvoicePagination();

      return;

    }


    invoices.forEach((invoice) => {

      tbody.innerHTML += `

        <tr>

          <td>
            ${invoice.invoice_number}
          </td>


          <td>
            ${
              invoice.purchase_order_number
              ?? invoice.purchase_order_id
            }
          </td>


          <td>
            ${
              invoice.vendor_name
              ?? invoice.vendor_id
            }
          </td>


          <td>
            ${invoice.invoice_date ?? "-"}
          </td>


          <td>
            ${invoice.due_date ?? "-"}
          </td>


          <td>
            ₹ ${
              Number(
                invoice.amount || 0
              ).toLocaleString("en-IN")
            }
          </td>


          <td>

            <span
              class="invoice-status ${getInvoiceStatusClass(
                invoice.payment_status
              )}"
            >
              ${invoice.payment_status}
            </span>

          </td>


          <td>

            <button
              class="edit-btn"
              onclick="editInvoice(${invoice.id})"
            >
              Edit
            </button>


            <button
              class="delete-btn"
              onclick="removeInvoice(${invoice.id})"
            >
              Delete
            </button>

          </td>

        </tr>

      `;

    });


    renderInvoicePagination();

  } catch (error) {

    console.error(
      "Failed to load invoices:",
      error
    );


    const tbody =
      document.getElementById(
        "invoiceTableBody"
      );


    tbody.innerHTML = `
      <tr>

        <td
          colspan="8"
          style="text-align:center;"
        >
          Failed to load invoices
        </td>

      </tr>
    `;

  }

}


function getInvoiceStatusClass(
  status
) {

  if (!status) {
    return "";
  }


  return status
    .toLowerCase()
    .replace(/\s+/g, "-");

}


function renderInvoicePagination() {

  const paginationInfo =
    document.getElementById(
      "invoicePaginationInfo"
    );


  const pagination =
    document.getElementById(
      "invoicePagination"
    );


  if (!pagination) {
    return;
  }


  const start =
    invoiceTotalRecords === 0
      ? 0
      : (
          (
            currentInvoicePage - 1
          ) * invoicePageSize
        ) + 1;


  const end =
    Math.min(
      currentInvoicePage *
        invoicePageSize,

      invoiceTotalRecords
    );


  if (paginationInfo) {

    paginationInfo.textContent =
      `Showing ${start.toLocaleString(
        "en-IN"
      )} to ${end.toLocaleString(
        "en-IN"
      )} of ${invoiceTotalRecords.toLocaleString(
        "en-IN"
      )} invoices`;

  }


  pagination.innerHTML = "";


  const previousButton =
    document.createElement(
      "button"
    );


  previousButton.textContent =
    "Previous";


  previousButton.disabled =
    currentInvoicePage <= 1;


  previousButton.onclick = () => {

    if (
      currentInvoicePage > 1
    ) {

      loadInvoices(
        currentInvoicePage - 1
      );

    }

  };


  pagination.appendChild(
    previousButton
  );


  const pages =
    getInvoiceVisiblePages();


  pages.forEach((page) => {

    if (page === "...") {

      const span =
        document.createElement(
          "span"
        );


      span.textContent =
        "...";


      span.className =
        "pagination-ellipsis";


      pagination.appendChild(
        span
      );


      return;

    }


    const button =
      document.createElement(
        "button"
      );


    button.textContent =
      page;


    button.className =
      "pagination-number";


    if (
      page === currentInvoicePage
    ) {

      button.classList.add(
        "active"
      );

    }


    button.onclick = () => {

      loadInvoices(
        page
      );

    };


    pagination.appendChild(
      button
    );

  });


  const nextButton =
    document.createElement(
      "button"
    );


  nextButton.textContent =
    "Next";


  nextButton.disabled =
    currentInvoicePage >=
    invoiceTotalPages;


  nextButton.onclick = () => {

    if (
      currentInvoicePage <
      invoiceTotalPages
    ) {

      loadInvoices(
        currentInvoicePage + 1
      );

    }

  };


  pagination.appendChild(
    nextButton
  );

}


function getInvoiceVisiblePages() {

  const pages = [];

  const total =
    invoiceTotalPages;

  const current =
    currentInvoicePage;


  if (total <= 7) {

    for (
      let i = 1;
      i <= total;
      i++
    ) {

      pages.push(i);

    }

    return pages;

  }


  pages.push(1);


  if (current > 4) {

    pages.push("...");

  }


  const start =
    Math.max(
      2,
      current - 1
    );


  const end =
    Math.min(
      total - 1,
      current + 1
    );


  for (
    let i = start;
    i <= end;
    i++
  ) {

    pages.push(i);

  }


  if (
    current <
    total - 3
  ) {

    pages.push("...");

  }


  pages.push(total);


  return pages;

}


form.onsubmit = async (e) => {

  e.preventDefault();


  const invoice = {

    purchase_order_id:
      Number(
        purchaseOrderSelect.value
      ),

    vendor_id:
      Number(
        vendorSelect.value
      ),

    invoice_date:
      document.getElementById(
        "invoiceDate"
      ).value,

    due_date:
      document.getElementById(
        "invoiceDueDate"
      ).value,

    amount:
      Number(
        document.getElementById(
          "invoiceAmount"
        ).value
      ),

    payment_status:
      document.getElementById(
        "invoicePaymentStatus"
      ).value,

    notes:
      document.getElementById(
        "invoiceNotes"
      ).value

  };


  try {

    if (editingInvoiceId) {

      await updateInvoice(
        editingInvoiceId,
        invoice
      );


      showToast(
        "Invoice Updated",
        "success"
      );

    } else {

      await createInvoice(
        invoice
      );


      showToast(
        "Invoice Added",
        "success"
      );

    }


    modal.classList.remove(
      "show"
    );


    await loadInvoices(
      currentInvoicePage
    );

  } catch (error) {

    console.error(
      "Invoice operation failed:",
      error
    );


    showToast(
      "Operation Failed",
      "error"
    );

  }

};


async function editInvoice(
  id
) {

  try {

    const invoice =
      await apiRequest(
        `/invoices/${id}`
      );


    if (!invoice) {
      return;
    }


    editingInvoiceId =
      id;


    document.getElementById(
      "invoiceModalTitle"
    ).textContent =
      "Edit Invoice";


    await loadPurchaseOrderDropdown();

    await loadVendorDropdown();


    purchaseOrderSelect.value =
      invoice.purchase_order_id;


    vendorSelect.value =
      invoice.vendor_id;


    document.getElementById(
      "invoiceDate"
    ).value =
      invoice.invoice_date;


    document.getElementById(
      "invoiceDueDate"
    ).value =
      invoice.due_date;


    document.getElementById(
      "invoiceAmount"
    ).value =
      invoice.amount;


    document.getElementById(
      "invoicePaymentStatus"
    ).value =
      invoice.payment_status;


    document.getElementById(
      "invoiceNotes"
    ).value =
      invoice.notes || "";


    modal.classList.add(
      "show"
    );

  } catch (error) {

    console.error(
      "Failed to load invoice:",
      error
    );


    showToast(
      "Failed to load Invoice",
      "error"
    );

  }

}


async function removeInvoice(
  id
) {

  showConfirm(

    "Delete Invoice?",

    async () => {

      try {

        await deleteInvoice(
          id
        );


        showToast(
          "Invoice Deleted",
          "success"
        );


        await loadInvoices(
          currentInvoicePage
        );

      } catch (error) {

        console.error(
          "Delete invoice failed:",
          error
        );


        showToast(
          "Delete Failed",
          "error"
        );

      }

    }

  );

}


/*
  Initial page load.

  IMPORTANT:
  Do not use:

      await loadInvoices();

  at top level.

  This file is a normal JavaScript file,
  not type="module".
*/

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadInvoices(1);

  }
);