let editingId = null;

const modal = document.getElementById("productModal");

const vendorId = document.getElementById("vendorId");
const productName = document.getElementById("productName");
const category = document.getElementById("category");
const price = document.getElementById("price");
const stock = document.getElementById("stock");
const leadTime = document.getElementById("leadTime");
const warranty = document.getElementById("warranty");

/* ===========================
   INITIAL LOAD
=========================== */

window.onload = () => {
  loadProducts();

  loadVendorDropdown();
};

/* ===========================
   OPEN ADD MODAL
=========================== */

document.getElementById("addProductBtn").onclick = () => {
  editingId = null;

  document.getElementById("modalTitle").innerHTML = "Add Product";

  clearForm();

  modal.classList.add("show");
};

/* ===========================
   CLOSE MODAL
=========================== */

document.getElementById("cancelProduct").onclick = () => {
  modal.classList.remove("show");
};

/* ===========================
   LOAD PRODUCTS
=========================== */

async function loadProducts() {
  try {
    const products = await getProducts();

    const vendors = await getVendors();

    const vendorMap = {};

    vendors.forEach((vendor) => {
      vendorMap[vendor.id] = vendor.vendor_name;
    });

    renderProducts(products, vendorMap);
  } catch (error) {
    console.error(error);
  }
}

/* ===========================
   RENDER TABLE
=========================== */

function renderProducts(products, vendorMap = {}) {
  const tbody = document.getElementById("productTableBody");

  tbody.innerHTML = "";

  products.forEach((product) => {
    tbody.innerHTML += `

<tr>

<td>${product.id}</td>

<td>${product.product_name}</td>

<td>${product.category}</td>

<td>${vendorMap[product.vendor_id] || "Unknown Vendor"}</td>

<td>₹${product.unit_price}</td>

<td>${product.stock_unit}</td>

<td>${product.lead_time_days} Days</td>

<td>${product.warranty_months} Months</td>

<td>

<button
class="action-btn edit"
onclick="editProduct(${product.id})">

Edit

</button>

<button
class="action-btn delete"
onclick="removeProduct(${product.id})">

Delete

</button>

</td>

</tr>

`;
  });
}

/* ===========================
   SAVE PRODUCT
=========================== */

document.getElementById("saveProduct").onclick = async () => {
  const product = {
    vendor_id: Number(vendorId.value),

    product_name: productName.value,

    category: category.value,

    unit_price: Number(price.value),

    stock_unit: Number(stock.value),

    lead_time_days: Number(leadTime.value),

    warranty_months: Number(warranty.value),
  };

  if (
    !product.vendor_id ||
    product.product_name === "" ||
    product.category === ""
  ) {
    alert("Please fill all required fields.");

    return;
  }

  try {
    if (editingId == null) {
      await createProduct(product);

      showToast("Product Added Successfully");
    } else {
      await updateProduct(
        editingId,

        product,
      );

      showToast("Product Updated Successfully");
    }

    modal.classList.remove("show");

    clearForm();

    loadProducts();
  } catch (error) {
    console.error(error);
    

    showToast("Operation Failed");
  }
};

/* ===========================
   EDIT PRODUCT
=========================== */

async function editProduct(id) {
  try {
    const product = await getProduct(id);

    editingId = id;

    document.getElementById("modalTitle").innerHTML = "Edit Product";

    vendorId.value = product.vendor_id;

    productName.value = product.product_name;

    category.value = product.category;

    price.value = product.unit_price;

    stock.value = product.stock_unit;

    leadTime.value = product.lead_time_days;

    warranty.value = product.warranty_months;

    modal.classList.add("show");
  } catch (error) {
    console.error(error);
    showToast("Unable to load product.", false);
  }
}

/* ===========================
   DELETE PRODUCT
=========================== */

async function removeProduct(id) {

    showConfirm(

        "Are you sure you want to delete this product?",

        async () => {

            try {

                await deleteProduct(id);

                showToast("Product Deleted Successfully");

                loadProducts();

            }

            catch (error) {

                console.error(error);

                showToast("Delete Failed", false);

            }

        }

    );

}

/* ===========================
   SEARCH PRODUCT
=========================== */

document
.getElementById("searchProduct")
.addEventListener("keyup", async function () {

    try {

        const keyword = this.value.toLowerCase().trim();

        const products = await getProducts();

        const vendors = await getVendors();

        const vendorMap = {};

        vendors.forEach(vendor => {

            vendorMap[vendor.id] = vendor.vendor_name;

        });

        const filtered = products.filter(product => {

            const vendorName =
                (vendorMap[product.vendor_id] || "").toLowerCase();

            return (

                product.product_name.toLowerCase().includes(keyword)

                ||

                product.category.toLowerCase().includes(keyword)

                ||

                vendorName.includes(keyword)

            );

        });

        renderProducts(filtered, vendorMap);

    }

    catch (error) {

        console.error(error);

    }

});

/* ===========================
   CLEAR FORM
=========================== */

function clearForm() {
  vendorId.value = "";

  productName.value = "";

  category.value = "";

  price.value = "";

  stock.value = "";

  leadTime.value = "";

  warranty.value = "";
}

/* ===========================
   LOAD VENDORS
=========================== */

async function loadVendorDropdown() {
  try {
    const vendors = await getVendors();

    const select = document.getElementById("vendorId");

    select.innerHTML = `
            <option value="">Select Vendor</option>
        `;

    vendors.forEach((vendor) => {
      select.innerHTML += `
                <option value="${vendor.id}">
                    ${vendor.vendor_name}
                </option>
            `;
    });
  } catch (error) {
    console.error(error);
  }
}
