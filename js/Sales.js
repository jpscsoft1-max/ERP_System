

import { db } from '../firebase-init.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  orderBy
}
  from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
console.log("✅ Sales.js loaded");
// CHANGE: Cache Firestore customers for dropdowns and detail display
let customersCache = [];

// ------- Safe searchable dropdown for Sales Orders -------

(function() {
  // Avoid adding listeners multiple times
  let orderDropdownInitialized = false;

  function populateOrderCustomerDropdownSafe() {
    const customers = JSON.parse(localStorage.getItem("customers") || "[]");
    const list = document.getElementById("orderCustomerList");
    const searchInput = document.getElementById("orderCustomerSearch");
    const toggleBtn = document.getElementById("orderCustomerToggle");
    const menu = document.getElementById("orderCustomerMenu");
    const wrapper = document.getElementById("orderCustomerWrapper");
    const labelSpan = document.getElementById("orderCustomerLabel");
    const hiddenInput = document.getElementById("orderCustomerIndex");

    if (!list || !searchInput || !toggleBtn || !menu || !hiddenInput) return;

    // Populate list
    list.innerHTML = "";
    searchInput.value = "";
    labelSpan.textContent = "-- Select Customer --";
    hiddenInput.value = "";

    customers.forEach((cust, index) => {
      const li = document.createElement("li");
      li.textContent = cust.name || "(No name)";
      li.dataset.index = index;
      li.style.padding = "6px 8px";
      li.style.cursor = "pointer";
      li.addEventListener("mouseenter", () => li.style.background = "#f0f0f0");
      li.addEventListener("mouseleave", () => li.style.background = "");
      list.appendChild(li);
    });

    // Toggle menu (idempotent attach)
    if (!orderDropdownInitialized) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === "block" ? "none" : "block";
        if (menu.style.display === "block") searchInput.focus();
      });

      // Close on outside click
      document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) {
          menu.style.display = "none";
        }
      });

      // Click to select an item
      list.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const idx = li.dataset.index;
        const selected = customers[idx];

        hiddenInput.value = idx;
        hiddenInput.dispatchEvent(new Event("change")); // will call showOrderCustomerDetailsFromIndex

        labelSpan.textContent = selected?.name || "(No name)";
        menu.style.display = "none";
      });

      // Filter while typing
      searchInput.addEventListener("input", () => {
        const term = searchInput.value.toLowerCase().trim();
        list.querySelectorAll("li").forEach(li => {
          const text = li.textContent.toLowerCase();
          li.style.display = text.includes(term) ? "" : "none";
        });
      });

      orderDropdownInitialized = true;
    }
  }

  // Publicize
  window.populateOrderCustomerDropdown = populateOrderCustomerDropdownSafe;

  // show details function that reads from the safe hidden index
  window.showOrderCustomerDetailsFromIndex = function() {
    const idx = document.getElementById("orderCustomerIndex")?.value;
    const customers = JSON.parse(localStorage.getItem("customers") || "[]");
    const infoBox = document.getElementById("orderCustomerInfo");
    if (!idx) {
      if (infoBox) infoBox.style.display = "none";
      return;
    }
    const cust = customers[idx];
    if (!cust) {
      if (infoBox) infoBox.style.display = "none";
      return;
    }
    document.getElementById("orderCustName").textContent = cust.name || "-";
    document.getElementById("orderCustAddress").textContent = cust.billingAddress || "-";
    document.getElementById("orderCustId").textContent = cust.gstPan || "-";
    document.getElementById("orderCustMob").textContent = cust.mobile || "-";
    if (infoBox) infoBox.style.display = "block";
  };

  // Optionally: auto-populate when orders section shown (this is safe because it checks elements)
  document.addEventListener("DOMContentLoaded", () => {
    // if orders tab is default:
    const salesSel = document.getElementById("salesSelector");
    if (salesSel && salesSel.value === "orders") {
      populateOrderCustomerDropdownSafe();
    }
  });

})(); // IIFE end


function goBack() {
  window.history.back();
}

function goHome() {
  window.location.href = "index.html";
}

// ===============================================
// CHANGE: Auto-grow Item Description textareas
// ===============================================
function autoResizeTextarea(el) {
  if (!el) return;
  // First reset to the base height, then set according to scrollHeight
  el.style.height = "38px";                 // Base height equals the input height
  el.style.height = el.scrollHeight + "px"; // Grow based on the amount of content
}

//For Existing / initial textareas 
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".invoice-desc, .desc").forEach(autoResizeTextarea);
});

// Runs every time the user types (handles both removing and adding rows)
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("invoice-desc") ||
    e.target.classList.contains("desc")) {
    autoResizeTextarea(e.target);
  }
});
document.addEventListener("DOMContentLoaded", () => {
  // ===== Invoice customer searchable dropdown =====
  const wrapper = document.getElementById("invoiceCustomerWrapper");
  const toggleBtn = document.getElementById("invoiceCustomerToggle");
  const menu = document.getElementById("invoiceCustomerMenu");
  const searchInput = document.getElementById("invoiceCustomerSearch");

  if (wrapper && toggleBtn && menu && searchInput) {
    // Button click → menu open/close
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("open");
      if (menu.classList.contains("open")) {
        searchInput.focus();
      }
    });

    //  menu close
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        menu.classList.remove("open");
      }
    });
  }
});

// CHANGE: Textarea Auto expand helper
function attachAutoResize(textarea) {
  if (!textarea) return;

  const baseHeight = 38; // same height as CSS

  // First initial adjust
  textarea.style.height = baseHeight + "px";
  textarea.style.height = textarea.scrollHeight + "px";

  // whenever user types
  textarea.addEventListener("input", () => {
    textarea.style.height = baseHeight + "px";
    textarea.style.height = textarea.scrollHeight + "px";
  });
}

const currentPage = window.location.pathname.split("/").pop();
const sidebarLinks = document.querySelectorAll(".sidebar ul li a");
sidebarLinks.forEach(link => {
  if (link.getAttribute("href") === currentPage) {
    link.classList.add("active");
  }
}
);
let editMode = false;
let editingCustomerId = null;

// Handle form submit
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customerForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const shippingAddresses = formData.getAll("shippingAddress[]");

    const idType = form.querySelector('input[name="idType"]:checked')?.value || '';
    const idNumber = form.querySelector('#idInputContainer input')?.value || '';

    const customer = {
      name: formData.get("customerName"),
      email: formData.get("email"),
      mobile: formData.get("mobile"),
      idType: idType,
      idNumber: idNumber,
      billingAddress: formData.get("billingAddress"),
      shippingAddresses: shippingAddresses,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editMode && editingCustomerId) {
        // Update existing customer
        await updateDoc(doc(db, "customers", editingCustomerId), customer);
        alert("✅ Customer updated!");
      } else {
        // Add new customer
        customer.createdAt = new Date().toISOString();
        await addDoc(collection(db, "customers"), customer);
        alert("✅ Customer saved!");
      }

      // Reset form
      form.reset();
      editMode = false;
      editingCustomerId = null;
      document.getElementById("shippingAddresses").innerHTML = `
        <div class="shipping-group">
          <textarea name="shippingAddress[]" placeholder="Shipping Address" required></textarea>
          <div class="same-as-billing-container">
            <label>
              <input type="checkbox" class="same-as-billing" onchange="copyBillingAddress(this)">
              Same as billing address
            </label>
          </div>
        </div>
      `;

      renderCustomers();
    } catch (error) {
      console.error("❌ Error:", error);
      alert("Something went wrong.");
    }
  });
});




async function renderCustomers() {
  const tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = "";

  try {
    const querySnapshot = await getDocs(collection(db, "customers"));

    // CHANGE: also build an array to sync with localStorage for dropdowns
    const customersArray = [];

    if (querySnapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="7">No customers yet.</td></tr>`;
      // Clear Local Storage
      localStorage.setItem("customers", JSON.stringify([])); // CHANGE: sync empty
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const customer = docSnap.data();

      // CHANGE: push to array for localStorage sync
      customersArray.push({
        name: customer.name || "",
        email: customer.email || "",
        mobile: customer.mobile || "",
        gstPan: customer.idNumber || customer.gstPan || "",
        billingAddress: customer.billingAddress || "",
        shippingAddresses: customer.shippingAddresses || []
      });

      const shippingAddressesHtml = (customer.shippingAddresses || [])
        .map(addr => `<li>${addr}</li>`)
        .join("");

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${customer.name || "-"}</td>
        <td>${customer.email || "-"}</td>
        <td>${customer.mobile || "-"}</td>
        <td>${customer.idNumber || "-"}</td>
        <td>${customer.billingAddress || "-"}</td>
        <td><ul>${shippingAddressesHtml}</ul></td>
        <td>
          <button class="edit-btn" onclick="editCustomer('${docSnap.id}')">Edit</button>
          <button class="delete-btn" onclick="confirmDeleteCustomer('${docSnap.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // ✅ CHANGE: Sync Firestore customers into localStorage so old dropdown code works
    localStorage.setItem("customers", JSON.stringify(customersArray));

  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    tbody.innerHTML = `<tr><td colspan="7">Failed to load customers.</td></tr>`;
  }
}

function confirmDeleteCustomer(customerId) {
  const confirmDelete = confirm("Are you sure you want to delete this customer?");
  if (confirmDelete) {
    deleteCustomer(customerId);
  }
}
window.confirmDeleteCustomer = confirmDeleteCustomer; // ✅ expose globally


async function deleteCustomer(docId) {

  try {
    await deleteDoc(doc(db, "customers", docId));
    renderCustomers(); // Refresh table
  } catch (error) {
    console.error("❌ Error deleting customer:", error);
    alert("Failed to delete customer.");
  }
}

async function editCustomer(customerId) {
  const docRef = doc(db, "customers", customerId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Customer not found");
    return;
  }

  const customer = docSnap.data();
  const form = document.getElementById("customerForm");

  // Set form fields
  form.customerName.value = customer.name || '';
  form.customerEmail.value = customer.email || '';
  form.customerMobile.value = customer.mobile || '';
  form.billingAddress.value = customer.billingAddress || '';

  // Set ID type and number
  if (customer.idType) {
    const idTypeInput = form.querySelector(`input[name="idType"][value="${customer.idType}"]`);
    if (idTypeInput) idTypeInput.checked = true;
    toggleIdInput();
    const idInputField = document.querySelector("#idInputContainer input");
    if (idInputField) idInputField.value = customer.idNumber || '';
  }

  // Set shipping addresses
  const container = document.getElementById("shippingAddresses");
  container.innerHTML = '';
  (customer.shippingAddresses || []).forEach(address => {
    const group = document.createElement('div');
    group.className = "shipping-group";
    group.innerHTML = `
      <textarea name="shippingAddress[]" placeholder="Shipping Address" required>${address}</textarea>
      <div class="same-as-billing-container">
        <label>
          <input type="checkbox" class="same-as-billing" onchange="copyBillingAddress(this)">
          Same as billing address
        </label>
      </div>
    `;
    container.appendChild(group);
  });

  // Enable edit mode
  editMode = true;
  editingCustomerId = customerId;

  // Scroll to the form (optional)
  form.scrollIntoView({ behavior: "smooth" });
}

window.editCustomer = editCustomer; // ✅ expose globally


let maxShippingAddresses = 3;

async function saveEditedCustomer(docId) {
  const name = document.getElementById(`editName-${docId}`).value.trim();
  const email = document.getElementById(`editEmail-${docId}`).value.trim();
  const mobile = document.getElementById(`editMobile-${docId}`).value.trim();
  const idNumber = document.getElementById(`editIdNumber-${docId}`).value.trim();
  const billingAddress = document.getElementById(`editBilling-${docId}`).value.trim();
  const shippingRaw = document.getElementById(`editShipping-${docId}`).value.trim();
  const shippingAddresses = shippingRaw.split("\n").map(addr => addr.trim()).filter(Boolean);

  try {
    await updateDoc(doc(db, "customers", docId), {
      name,
      email,
      mobile,
      idNumber,
      billingAddress,
      shippingAddresses
    });
    renderCustomers(); // Refresh table
  } catch (error) {
    console.error("❌ Error saving customer:", error);
    alert("Failed to save changes.");
  }
}

function addShippingAddress() {
  const container = document.getElementById("shippingAddresses");
  const currentCount = container.querySelectorAll(".shipping-group").length;

  if (currentCount >= maxShippingAddresses) {
    alert("Maximum 3 shipping addresses allowed.");
    return;
  }

  const shippingDiv = document.createElement("div");
  shippingDiv.className = "shipping-group";

  // For additional addresses:
  shippingDiv.innerHTML = `
    <button type="button" class="remove-btn" onclick="removeShippingAddress(this)">✖</button>
    <textarea name="shippingAddress[]" placeholder="Shipping Address" required></textarea>
  `;

  container.appendChild(shippingDiv);
}

function removeShippingAddress(button) {
  const shippingGroup = button.closest(".shipping-group");
  if (shippingGroup) {
    shippingGroup.remove();
  }
}

function copyBillingAddress(checkbox) {
  const billingAddress = document.querySelector("textarea[name='billingAddress']").value;
  const shippingTextarea = checkbox.closest(".shipping-group").querySelector("textarea[name='shippingAddress[]']");

  if (checkbox.checked) {
    shippingTextarea.value = billingAddress;
    shippingTextarea.readOnly = true;
  } else {
    shippingTextarea.value = "";
    shippingTextarea.readOnly = false;
  }
}

function toggleIdInput() {
  const selected = document.querySelector('input[name="idType"]:checked');
  const container = document.getElementById('idInputContainer');

  if (!selected) return;

  const currentValue = document.querySelector('input[name="gstPan"]')?.value || "";

  if (selected.value === "GST") {
    container.innerHTML = `
      <input 
        type="text" 
        name="gstPan" 
        maxlength="15" 
        placeholder="Enter GST No." 
        class="form-control" 
        required 
        value="${currentValue}"
        oninput="this.value = this.value.toUpperCase()" 
      />
    `;
  } else if (selected.value === "PAN") {
    container.innerHTML = `
      <input 
        type="text" 
        name="gstPan" 
        maxlength="10" 
        placeholder="Enter PAN No." 
        class="form-control" 
        required 
        value="${currentValue}"
        oninput="this.value = this.value.toUpperCase()" 
      />
    `;
  }
}
window.toggleIdInput = toggleIdInput; // expose for inline HTML use



function filterCustomers() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#customerTableBody tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(search) ? "" : "none";
  });
}


async function populateCustomerDropdown() {
  const listEl = document.getElementById("customerList");   // <datalist>
  const inputEl = document.getElementById("customerSelect"); // <input>

  if (!listEl || !inputEl) return;

  listEl.innerHTML = "";        // clear old options
  customersCache = [];          // clear cache

  try {
    const snapshot = await getDocs(collection(db, "customers"));

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const customer = {
        id: docSnap.id,
        name: data.name || "",
        billingAddress: data.billingAddress || "",
        idNumber: data.idNumber || "",
        mobile: data.mobile || ""
      };

      customersCache.push(customer);

      // datalist option
      const opt = document.createElement("option");
      opt.value = customer.name;          // text that user types
      listEl.appendChild(opt);
    });

  } catch (err) {
    console.error("❌ Error loading customers for dropdown:", err);
    alert("Failed to load customers.");
  }
}



function showCustomerDetails() {
  const inputEl = document.getElementById("customerSelect");
  const name = inputEl ? inputEl.value.trim() : "";

  const infoBox = document.getElementById("customerInfo");
  if (!name) {
    if (infoBox) infoBox.style.display = "none";
    return;
  }

  // Find customer name from cache
  const cust = customersCache.find(c => c.name === name);

  if (!cust) {
    // If name did not matched then hides the name
    if (infoBox) infoBox.style.display = "none";
    return;
  }

  document.getElementById("custName").textContent = cust.name || "-";
  document.getElementById("custAddress").textContent = cust.billingAddress || "-";
  document.getElementById("custId").textContent = cust.idNumber || "-";
  document.getElementById("custMob").textContent = cust.mobile || "-";

  if (infoBox) infoBox.style.display = "block";
}

// Helper to render the list inside a <ul>
function renderCustomerOptions(list) {
  const optionsUl = document.getElementById("customerOptions");
  if (!optionsUl) return;

  optionsUl.innerHTML = "";

  list.forEach((cust) => {
    const li = document.createElement("li");
    li.textContent = cust.name || "(No name)";
    li.dataset.id = cust.id;

    li.addEventListener("click", () => {
      selectCustomerFromDropdown(cust);
    });

    optionsUl.appendChild(li);
  });
}

// User click on someone name
function selectCustomerFromDropdown(cust) {
  const searchInput = document.getElementById("customerSearchInput");
  const selectEl = document.getElementById("customerSelect");

  if (searchInput) {
    searchInput.value = cust.name || "";
  }

  if (selectEl) {
    selectEl.value = cust.id;   // hidden <select> value set
    showCustomerDetails();      // existing function
  }

  const optionsUl = document.getElementById("customerOptions");
  if (optionsUl) {
    optionsUl.style.display = "none"; // list hide
  }
}

function generateQuotationNumber() {
  let counter = parseInt(localStorage.getItem("quotationCounter") || "0", 10);
  counter++;
  localStorage.setItem("quotationCounter", counter);
  return `SQ-${String(counter).padStart(3, "0")}`;
}

function setupQuotationDetails() {
  // Set quotation number
  const quotationInput = document.getElementById("quotationNo");

  // Set today's date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("quotationDate").value = today;
}

// Trigger when Sales Quotes tab is shown
function handleSalesChange(value) {
  const sections = document.querySelectorAll(".sales-section");
  sections.forEach(section => section.style.display = "none");

  if (!value) return;

  const selectedSection = document.getElementById(value);
  if (selectedSection) selectedSection.style.display = "block";

  // Section-specific logic
  switch (value) {
    // case "quotes":
    //     renderCustomers
    //     populateCustomerDropdown();
    //     setupQuotationDetails();
    //     break;
    case "quotes":
      populateCustomerDropdown();
      setupQuotationDetails();

      // CHANGE: if no rows yet, create one default empty row
      const itemsBody = document.getElementById("itemsBody");
      if (itemsBody && itemsBody.rows.length === 0) {
        addQuotationItem();
      }
      break;

    case "orders":
      populateOrderCustomerDropdown();
      document.getElementById("orderDate").value = new Date().toISOString().split("T")[0];
      break;
    // case "invoices":
    //     populateInvoiceCustomerDropdown();
    //     document.getElementById("invoiceDate").value = new Date().toISOString().split("T")[0];
    //     break;
    case "invoices":
      populateInvoiceCustomerDropdown();
      document.getElementById("invoiceDate").value = new Date().toISOString().split("T")[0];

      // CHANGE: Show one empty invoice row by default when Invoice section opens
      const hasInvoiceRows = document.querySelector("#invoiceItemsBody tr");
      if (!hasInvoiceRows) {
        addInvoiceItem();
      }
      break;

    case "returns":
      // future logic for returns (if needed)
      break;
    case "customers":
      renderCustomers();
      break;
  }
}
window.handleSalesChange = handleSalesChange; // ✅ expose globally




// CHANGE: Quotation row with editable Tax & Total
// // CHANGE: Quotation row with editable Tax and Total
function addQuotationItem() {
  const tbody = document.getElementById("itemsBody");
  if (!tbody) return;

  const rowCount = tbody.rows.length + 1;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="serial">${rowCount}</td>
    <td><textarea class="desc" placeholder="Item Description"></textarea></td>
    <td><input type="text" class="code" placeholder="Item Code"></td>
    <td><input type="text" class="hsn" placeholder="HSN/SAC"></td>

    <!-- Qty (no auto calculation) -->
    <td>
      <input 
        type="number" 
        class="qty" 
        min="0" 
        placeholder="Qty">
    </td>

    <!-- Rate (only formatting, no auto total) -->
    <td>
      <input 
        type="text" 
        class="rate amount-input" 
        placeholder="Rate"
        oninput="formatIndianNumber(this)">
    </td>

    <!-- GST % editable -->
    <td>
      <input 
        type="number" 
        class="gst-input" 
        min="0" 
        placeholder="GST %">
    </td>

    <!-- Tax: fully editable textbox -->
    <td>
      <input 
        type="text" 
        class="tax-amount" 
        placeholder="Tax">
    </td>

    <!-- Total: fully editable textbox, only used for Grand Total -->
    <td>
      <input 
        type="text" 
        class="line-total" 
        placeholder="Total"
        oninput="calculateTotals()">
    </td>

    <!-- Action: remove current row -->
    <td>
      <button type="button" onclick="removeQuotationItem(this)">✖</button>
    </td>
  `;

  tbody.appendChild(row);
  tbody.appendChild(row);

  // CHANGE: auto-expand description for this row
  attachAutoResize(row.querySelector(".desc"));

  renumberRows();
  calculateTotals();

  renumberRows();
}


// CHANGE: Expose addQuotationItem globally so the + Add Item button (inline onclick) works
window.addQuotationItem = addQuotationItem;
// CHANGE: expose quotation item functions for inline HTML onclick
window.addQuotationItem = addQuotationItem;
window.removeQuotationItem = removeQuotationItem;
window.calculateTotals = calculateTotals;
window.formatIndianNumber = formatIndianNumber;
window.addInvoiceItem = addInvoiceItem;
window.removeInvoiceItem = removeInvoiceItem;
window.calculateInvoiceTotals = calculateInvoiceTotals;


function addOrderItem() {
  const tbody = document.getElementById("orderItemsBody");
  const rowCount = tbody.rows.length + 1;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="order-serial">${rowCount}</td>
    <td><textarea class="order-desc" placeholder="Item Description"></textarea></td>
    <td><input type="text" class="order-code" placeholder="Item Code"></td>
    <td><input type="text" class="order-hsn" placeholder="HSN/SAC"></td>
    <td><input type="number" class="order-qty" value="1" min="1" onchange="calculateOrderTotals()"></td>
    <td><input type="text" class="order-rate amount-input" value="0" oninput="formatIndianNumber(this); calculateOrderTotals();"></td>
    <td class="order-gst-label">18%</td>
    <td class="order-tax-amount">₹0.00</td>
    <td class="order-line-total">₹0.00</td>
    <td><button class="order-remove-btn" onclick="removeOrderItem(this)">✖</button></td>
  `;
  tbody.appendChild(row);
  renumberOrderRows();
  calculateOrderTotals();
}

function removeOrderItem(btn) {
  btn.closest("tr").remove();
  renumberOrderRows();
  calculateOrderTotals();
}

function renumberOrderRows() {
  document.querySelectorAll("#orderItemsBody .order-serial").forEach((cell, idx) => {
    cell.textContent = idx + 1;
  });
}

function calculateOrderTotals() {
  const rows = document.querySelectorAll("#orderItemsBody tr");
  let grandTotal = 0;

  const customers = JSON.parse(localStorage.getItem("customers") || "[]");
  const selectedIndex = document.getElementById("orderCustomer").value;
  const gstNo = customers[selectedIndex]?.gstPan || "";
  const isGujarat = gstNo.startsWith("24");

  rows.forEach((row, index) => {
    const qtyInput = row.querySelector(".order-qty");
    const rateInput = row.querySelector(".order-rate");

    let qty = parseFloat(qtyInput.value) || 0;
    let rate = parseFloat(rateInput.value.replace(/,/g, "")) || 0;

    if (qty <= 0) {
      alert(`Row ${index + 1}: Quantity must be greater than zero.`);
      qtyInput.value = 1;
      qty = 1;
    }

    if (rate < 0) {
      alert(`Row ${index + 1}: Rate cannot be negative.`);
      rateInput.value = 0;
      rate = 0;
    }

    const gstPercent = 18;
    const taxAmount = (qty * rate * gstPercent) / 100;
    const total = qty * rate + taxAmount;

    row.querySelector(".order-tax-amount").textContent = isGujarat
      ? `₹${(taxAmount / 2).toLocaleString("en-IN")} + ₹${(taxAmount / 2).toLocaleString("en-IN")}`
      : `₹${taxAmount.toLocaleString("en-IN")} (IGST)`;

    row.querySelector(".order-line-total").textContent = `₹${total.toLocaleString("en-IN")}`;
    grandTotal += total;
  });

  document.getElementById("orderGrandTotal").textContent = grandTotal.toLocaleString("en-IN");
}

function removeQuotationItem(btn) {
  btn.closest("tr").remove();
  renumberRows();
  calculateTotals();
}

function renumberRows() {
  document.querySelectorAll("#itemsBody .serial").forEach((cell, idx) => {
    cell.textContent = idx + 1;
  });
}



// // CHANGE: Only sum editable "Total" inputs and update grand total
function calculateTotals() {
  const rows = document.querySelectorAll("#itemsBody tr");
  let grandTotal = 0;

  rows.forEach((row) => {
    const totalInput = row.querySelector(".line-total");
    if (!totalInput) return;

    // Remove ₹ sign and commas, then convert to number
    const raw = (totalInput.value || "").replace(/₹/g, "").replace(/,/g, "").trim();
    const num = parseFloat(raw);

    if (!isNaN(num)) {
      grandTotal += num;
    }
  });

  const grandEl = document.getElementById("grandTotal");
  if (grandEl) {
    grandEl.textContent = grandTotal.toLocaleString("en-IN");
  }
}

function removeItemRow(button) {
  const row = button.closest("tr");
  row.remove();
  updateGrandTotal();
}
/* Add commas in Indian format */
function formatIndianNumber(input) {
  const raw = input.value.replace(/,/g, "").trim();
  if (!raw || isNaN(raw)) {
    input.value = "";
    return;
  }
  const num = parseFloat(raw);
  input.value = num.toLocaleString("en-IN");
}

function previewQuotation() {
  // grab your fields:
  const quote = {
    customerName: document.getElementById("custName").textContent,
    address: document.getElementById("custAddress").textContent,
    gst: document.getElementById("custId").textContent,
    mobile: document.getElementById("custMob").textContent,
    quotationNo: document.getElementById("quotationNo").value,
    quotationDate: document.getElementById("quotationDate").value,
    items: []
  };

  // loop through items table:
  document.querySelectorAll("#itemsBody tr").forEach(row => {
    quote.items.push({
      desc: row.querySelector(".desc")?.value || "",
      code: row.querySelector(".code")?.value || "",
      hsn: row.querySelector(".hsn")?.value || "",
      qty: row.querySelector(".qty")?.value || "",
      rate: row.querySelector(".rate")?.value || "",
      total: row.querySelector(".line-total")?.textContent || ""
    });
  });

  // store:
  localStorage.setItem("currentQuote", JSON.stringify(quote));
  window.open("sales_quotes.html", "_blank");
}
function populateOrderCustomerDropdown() {
  const customers = JSON.parse(localStorage.getItem("customers") || "[]");
  const dropdown = document.getElementById("orderCustomer");

  if (!dropdown) return;

  dropdown.innerHTML = `<option value="">-- Select Customer --</option>`;

  customers.forEach((cust, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = cust.name;
    dropdown.appendChild(opt);
  });
}

function showOrderCustomerDetails() {
  const index = document.getElementById("orderCustomer").value;
  const customers = JSON.parse(localStorage.getItem("customers") || "[]");

  if (index === "") {
    document.getElementById("orderCustomerInfo").style.display = "none";
    return;
  }

  const cust = customers[index];
  document.getElementById("orderCustName").textContent = cust.name;
  document.getElementById("orderCustAddress").textContent = cust.billingAddress;
  document.getElementById("orderCustId").textContent = cust.gstPan || "-";
  document.getElementById("orderCustMob").textContent = cust.mobile;
  document.getElementById("orderCustomerInfo").style.display = "block";
}
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("customerSearchInput");
  const optionsUl = document.getElementById("customerOptions");
  const wrapper = document.querySelector(".customer-dropdown");

  if (!searchInput || !optionsUl || !wrapper) return;

  // List open on focus
  searchInput.addEventListener("focus", () => {
    optionsUl.style.display = "block";
  });
  document.addEventListener("DOMContentLoaded", () => {


    const custInput = document.getElementById("customerSelect");
    if (custInput) {
      // Details update as the user types
      custInput.addEventListener("input", showCustomerDetails);
    }
  });

  // Filter on typing
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();

    const filtered = customersCache.filter(c =>
      (c.name || "").toLowerCase().includes(term)
    );

    renderCustomerOptions(filtered);
    optionsUl.style.display = "block";
  });

  // List Close on click
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      optionsUl.style.display = "none";
    }
  });
});

// Trigger dropdown population if "Sales Orders" is the default loaded section
document.addEventListener("DOMContentLoaded", () => {
  const currentSelection = document.getElementById("salesSelector").value;
  if (currentSelection === "orders") {
    populateOrderCustomerDropdown();
  }
});

function populateInvoiceCustomerDropdown() {
  const customers = JSON.parse(localStorage.getItem("customers") || "[]");

  const list = document.getElementById("invoiceCustomerList");
  const searchInput = document.getElementById("invoiceCustomerSearch");

  if (!list || !searchInput) return;

  // Clear List
  list.innerHTML = "";

  customers.forEach((cust, index) => {
    const li = document.createElement("li");
    li.textContent = cust.name || "(No name)";
    li.dataset.index = index; // localStorage index store
    list.appendChild(li);
  });

  // 🔍 Search logic (each time function run, listener reset )
  searchInput.value = "";
  searchInput.oninput = () => {
    const term = searchInput.value.toLowerCase();
    list.querySelectorAll("li").forEach(li => {
      const text = li.textContent.toLowerCase();
      li.style.display = text.includes(term) ? "" : "none";
    });
  };

  // Option click → select, label update, hidden input set, details show
  list.onclick = (e) => {
    const li = e.target.closest("li");
    if (!li) return;

    const idx = li.dataset.index;
    const selectedCustomer = customers[idx];


    const hidden = document.getElementById("invoiceCustomer");
    hidden.value = idx;
    hidden.dispatchEvent(new Event("change")); // showInvoiceCustomerDetails call 

    // Button label update
    const labelSpan = document.getElementById("invoiceCustomerLabel");
    labelSpan.textContent = selectedCustomer.name || "(No name)";

    // Close Dropdown
    document.getElementById("invoiceCustomerMenu").classList.remove("open");
  };
}


function showInvoiceCustomerDetails() {
  const index = document.getElementById("invoiceCustomer").value;
  const customers = JSON.parse(localStorage.getItem("customers") || "[]");

  if (index === "") {
    document.getElementById("invoiceCustomerInfo").style.display = "none";
    return;
  }

  const cust = customers[index];
  document.getElementById("invoiceCustName").textContent = cust.name;
  document.getElementById("invoiceCustAddress").textContent = cust.billingAddress;
  document.getElementById("invoiceCustId").textContent = cust.gstPan || "-";
  document.getElementById("invoiceCustMob").textContent = cust.mobile;
  document.getElementById("invoiceCustomerInfo").style.display = "block";
}


function addInvoiceItem() {
  const tbody = document.getElementById("invoiceItemsBody");
  const rowCount = tbody.rows.length + 1;

  const row = document.createElement("tr");
  row.innerHTML = `
    <td class="invoice-serial">${rowCount}</td>
    <td><textarea class="invoice-desc" placeholder="Item Description"></textarea></td>
    <td><input type="text" class="invoice-code" placeholder="Item Code"></td>
    <td><input type="text" class="invoice-hsn" placeholder="HSN/SAC"></td>
    <td><input type="number" class="invoice-qty" value="1" min="1" onchange="calculateInvoiceTotals()"></td>

    <!-- CHANGE: Rate editable input -->
    <td>
      <input 
        type="text" 
        class="invoice-rate amount-input" 
        value="0" 
        oninput="formatIndianNumber(this); calculateInvoiceTotals();">
    </td>

    <!-- CHANGE: GST ab input hai, 18% fix nahi -->
    <td>
      <input 
        type="number" 
        class="invoice-gst-input" 
        min="0" 
        placeholder="GST %" 
        oninput="calculateInvoiceTotals()">
    </td>

    <!-- CHANGE: Tax / Total initially empty -->
    <td class="invoice-tax-amount"></td>
    <td class="invoice-line-total"></td>

    <td><button class="invoice-remove-btn" type="button" onclick="removeInvoiceItem(this)">✖</button></td>
  `;
  tbody.appendChild(row);
  tbody.appendChild(row);

  // CHANGE: auto-expand description for this invoice row
  attachAutoResize(row.querySelector(".invoice-desc"));

  renumberInvoiceRows();
  calculateInvoiceTotals();

  renumberInvoiceRows();
  calculateInvoiceTotals();
}


function removeInvoiceItem(btn) {
  btn.closest("tr").remove();
  renumberInvoiceRows();
  calculateInvoiceTotals();
}

function renumberInvoiceRows() {
  document.querySelectorAll("#invoiceItemsBody .invoice-serial").forEach((cell, idx) => {
    cell.textContent = idx + 1;
  });
}


function calculateInvoiceTotals() {
  const rows = document.querySelectorAll("#invoiceItemsBody tr");
  let grandTotal = 0;

  const customers = JSON.parse(localStorage.getItem("customers") || "[]");
  const selectedIndex = document.getElementById("invoiceCustomer").value;
  const gstNo = customers[selectedIndex]?.gstPan || "";
  const isGujarat = gstNo.startsWith("24");

  rows.forEach((row, index) => {
    const qtyInput = row.querySelector(".invoice-qty");
    const rateInput = row.querySelector(".invoice-rate");
    const gstInput = row.querySelector(".invoice-gst-input");

    let qty = parseFloat(qtyInput?.value) || 0;
    let rate = parseFloat((rateInput?.value || "").replace(/,/g, "")) || 0;
    let gstPercent = parseFloat(gstInput?.value) || 0;

    // Negative / invalid values normalize
    if (qty < 0) {
      qty = 0;
      qtyInput.value = 0;
    }
    if (rate < 0) {
      rate = 0;
      rateInput.value = "0";
    }
    if (gstPercent < 0) {
      gstPercent = 0;
      gstInput.value = "0";
    }

    const baseTotal = qty * rate;
    const taxAmount = (baseTotal * gstPercent) / 100;
    const total = baseTotal + taxAmount;

    const taxCell = row.querySelector(".invoice-tax-amount");
    const totalCell = row.querySelector(".invoice-line-total");

    // Leave cell empty when no input is provided
    if (baseTotal === 0 && gstPercent === 0) {
      taxCell.textContent = "";
      totalCell.textContent = "";
    } else {
      taxCell.textContent = isGujarat
        ? `₹${(taxAmount / 2).toLocaleString("en-IN")} + ₹${(taxAmount / 2).toLocaleString("en-IN")}`
        : `₹${taxAmount.toLocaleString("en-IN")} (IGST)`;

      totalCell.textContent = `₹${total.toLocaleString("en-IN")}`;
    }

    grandTotal += total;
  });

  const grandEl = document.getElementById("grandTotal");
  if (grandEl) {
    grandEl.textContent = grandTotal.toLocaleString("en-IN");
  }
}
// ===== Debug + robust initializer for Sales Orders customer dropdown =====
(function() {
  function log(...args) { console.log("[OrdersDropdown]", ...args); }

  // Helper: get customers from localStorage (fallback to empty)
  function getCustomers() {
    try {
      const arr = JSON.parse(localStorage.getItem("customers") || "[]");
      if (!Array.isArray(arr)) return [];
      return arr;
    } catch (e) {
      console.error("[OrdersDropdown] invalid customers in localStorage:", e);
      return [];
    }
  }

  // 1) Fill plain <select id="orderCustomer">
  function fillPlainSelect() {
    const sel = document.getElementById("orderCustomer");
    if (!sel || sel.tagName.toLowerCase() !== "select") return false;
    const customers = getCustomers();
    sel.innerHTML = '<option value="">-- Select Customer --</option>';
    customers.forEach((c, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = c.name || "(No name)";
      sel.appendChild(opt);
    });
    log("Plain select populated:", customers.length, "customers");
    return true;
  }

  // 2) Fill searchable custom dropdown (orderCustomerWrapper + orderCustomerIndex hidden)
  function fillSearchable() {
    const wrapper = document.getElementById("orderCustomerWrapper");
    const list = document.getElementById("orderCustomerList");
    const search = document.getElementById("orderCustomerSearch");
    const menu = document.getElementById("orderCustomerMenu");
    const toggle = document.getElementById("orderCustomerToggle");
    const label = document.getElementById("orderCustomerLabel");
    const hidden = document.getElementById("orderCustomerIndex");

    if (!wrapper || !list || !search || !menu || !toggle || !label || !hidden) return false;

    const customers = getCustomers();
    list.innerHTML = "";
    search.value = "";
    label.textContent = "-- Select Customer --";
    hidden.value = "";

    customers.forEach((c, idx) => {
      const li = document.createElement("li");
      li.textContent = c.name || "(No name)";
      li.dataset.index = idx;
      li.style.padding = "6px 8px";
      li.style.cursor = "pointer";
      list.appendChild(li);
    });

    // Safe event wiring (avoid duplicate attaches)
    toggle.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = (menu.style.display === "block") ? "none" : "block";
      if (menu.style.display === "block") search.focus();
    };

    // Click outside closes
    document.onclick = (e) => {
      if (!wrapper.contains(e.target)) menu.style.display = "none";
    };

    // Filter
    search.oninput = () => {
      const term = (search.value || "").toLowerCase().trim();
      list.querySelectorAll("li").forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(term) ? "" : "none";
      });
    };

    // Click select
    list.onclick = (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const idx = li.dataset.index;
      const sel = getCustomers()[idx];
      if (!sel) return;
      hidden.value = idx;
      hidden.dispatchEvent(new Event("change")); // will call showOrderCustomerDetailsFromIndex if exists
      label.textContent = sel.name || "(No name)";
      menu.style.display = "none";
    };

    log("Searchable dropdown populated:", customers.length, "customers");
    return true;
  }

  // 3) If neither present, show helpful log
  function init() {
    const customers = getCustomers();
    if (customers.length === 0) {
      log("No customers in localStorage. Please run renderCustomers() or add customers first.");
    }

    const usedPlain = fillPlainSelect();
    const usedSearch = fillSearchable();

    if (!usedPlain && !usedSearch) {
      log("No order customer UI found. Expected either:\n  - <select id='orderCustomer'>\n  OR\n  - searchable block with id 'orderCustomerWrapper' and hidden input 'orderCustomerIndex'");
    } else {
      log("Initialization done. PlainSelect:", usedPlain, "Searchable:", usedSearch);
    }
  }

  // Expose small helper for manual re-init
  window.initOrdersDropdown = init;

  // Run on DOMContentLoaded (safe)
  document.addEventListener("DOMContentLoaded", init);

})();
// Quick patch: ensure selecting customer DOES NOT show details (only sets value & label)
(function() {
  function getCustomersSafe() {
    try { return JSON.parse(localStorage.getItem("customers") || "[]"); } 
    catch(e) { return []; }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Plain select behaviour (if exists)
    const sel = document.getElementById("orderCustomer");
    if (sel && sel.tagName.toLowerCase() === "select") {
      // Populate options if empty
      const customers = getCustomersSafe();
      sel.innerHTML = '<option value="">-- Select Customer --</option>';
      customers.forEach((c, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = c.name || "(No name)";
        sel.appendChild(opt);
      });

      // Attach safe change handler that DOES NOT show details
      sel.onchange = () => {
        const idx = sel.value;
        const hidden = document.getElementById("orderCustomerIndex");
        if (hidden) hidden.value = idx;
        console.log("[OrdersDropdown] plain select chosen index:", idx);
      };
    }

    // Searchable dropdown behaviour (if exists)
    const wrapper = document.getElementById("orderCustomerWrapper");
    const list = document.getElementById("orderCustomerList");
    const search = document.getElementById("orderCustomerSearch");
    const menu = document.getElementById("orderCustomerMenu");
    const toggle = document.getElementById("orderCustomerToggle");
    const label = document.getElementById("orderCustomerLabel");
    const hidden = document.getElementById("orderCustomerIndex");

    if (wrapper && list && search && menu && toggle && label && hidden) {
      // populate
      const customers = getCustomersSafe();
      list.innerHTML = "";
      customers.forEach((c, i) => {
        const li = document.createElement("li");
        li.textContent = c.name || "(No name)";
        li.dataset.index = i;
        li.style.padding = "6px 8px";
        li.style.cursor = "pointer";
        list.appendChild(li);
      });

      // safe toggle
      toggle.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = (menu.style.display === "block") ? "none" : "block";
        if (menu.style.display === "block") search.focus();
      };

      // filter
      search.oninput = () => {
        const term = (search.value || "").toLowerCase().trim();
        list.querySelectorAll("li").forEach(li => {
          li.style.display = li.textContent.toLowerCase().includes(term) ? "" : "none";
        });
      };

      // selection: set hidden + label only — DO NOT call showOrderCustomerDetails
      list.onclick = (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const idx = li.dataset.index;
        const cust = customers[idx];
        if (!cust) return;
        hidden.value = idx;                // store index
        label.textContent = cust.name;     // show selection
        menu.style.display = "none";
        console.log("[OrdersDropdown] searchable chosen index:", idx);
      };

      // close on outside click (safe)
      document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) menu.style.display = "none";
      });
    }
  });
})();

// ===== Searchable dropdown for Sales Quotes (safe) =====
(function() {
  function getCustomersSafe() {
    try { 
      const arr = JSON.parse(localStorage.getItem("customers") || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.error("[QuotesDropdown] invalid customers in localStorage:", e);
      return [];
    }
  }

  function initQuotesDropdown() {
    const wrapper = document.getElementById("quoteCustomerWrapper");
    const list = document.getElementById("quoteCustomerList");
    const search = document.getElementById("quoteCustomerSearch");
    const menu = document.getElementById("quoteCustomerMenu");
    const toggle = document.getElementById("quoteCustomerToggle");
    const label = document.getElementById("quoteCustomerLabel");
    const hidden = document.getElementById("quoteCustomerIndex");

    if (!wrapper || !list || !search || !menu || !toggle || !label || !hidden) {
      // If any element missing, nothing to do (safe)
      return;
    }

    const customers = getCustomersSafe();
    list.innerHTML = "";
    search.value = "";
    label.textContent = "-- Select Customer --";
    hidden.value = "";

    customers.forEach((c, i) => {
      const li = document.createElement("li");
      li.textContent = c.name || "(No name)";
      li.dataset.index = i;
      li.style.padding = "6px 8px";
      li.style.cursor = "pointer";
      li.addEventListener("mouseenter", () => li.style.background = "#f0f0f0");
      li.addEventListener("mouseleave", () => li.style.background = "");
      list.appendChild(li);
    });

    // Toggle dropdown (idempotent)
    toggle.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = (menu.style.display === "block") ? "none" : "block";
      if (menu.style.display === "block") search.focus();
    };

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) menu.style.display = "none";
    });

    // Filter as user types
    search.oninput = () => {
      const term = (search.value || "").toLowerCase().trim();
      list.querySelectorAll("li").forEach(li => {
        li.style.display = li.textContent.toLowerCase().includes(term) ? "" : "none";
      });
    };

    // Select: set hidden + label only (no auto-show of details)
    list.onclick = (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const idx = li.dataset.index;
      const cust = getCustomersSafe()[idx];
      if (!cust) return;

      hidden.value = idx;             // store index for later if needed
      label.textContent = cust.name || "(No name)";
      menu.style.display = "none";

      console.log("[QuotesDropdown] selected index:", idx, "name:", cust.name);
    };
  }

  // Run on DOMContentLoaded (safe)
  document.addEventListener("DOMContentLoaded", initQuotesDropdown);

  // Expose for manual re-init (if customers list changes)
  window.populateQuoteCustomerDropdown = initQuotesDropdown;
})();


// ===== Safe Orders item handlers (defensive, drop-in) =====
(function() {
  // helper: safe parse customers (not used here but kept for parity)
  function getCustomersSafe() {
    try { return JSON.parse(localStorage.getItem("customers") || "[]") || []; }
    catch (e) { return []; }
  }

  // helper: attachAutoResize must exist; if not, provide a minimal fallback
  if (typeof attachAutoResize !== "function") {
    window.attachAutoResize = function(el) {
      if (!el) return;
      el.style.height = "38px";
      try { el.style.height = el.scrollHeight + "px"; } catch (e) {}
      el.addEventListener && el.addEventListener("input", function() {
        el.style.height = "38px";
        el.style.height = (el.scrollHeight || 38) + "px";
      });
    };
  }

  // safe formatIndianNumber fallback
  if (typeof formatIndianNumber !== "function") {
    window.formatIndianNumber = function(input) {
      if (!input) return;
      const raw = (input.value || "").toString().replace(/,/g, "").trim();
      if (!raw || isNaN(raw)) { input.value = raw; return; }
      try { input.value = parseFloat(raw).toLocaleString("en-IN"); } catch (e) {}
    };
  }

  // ADD ORDER ITEM (defensive)
  function addOrderItem() {
    try {
      const tbody = document.getElementById("orderItemsBody");
      if (!tbody) { console.warn("[Orders] #orderItemsBody not found"); return; }

      const rowCount = tbody.rows.length + 1;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="order-serial">${rowCount}</td>
        <td><textarea class="order-desc" placeholder="Item Description"></textarea></td>
        <td><input type="text" class="order-code" placeholder="Item Code" /></td>
        <td><input type="text" class="order-hsn" placeholder="HSN/SAC" /></td>
        <td><input type="number" class="order-qty" value="1" min="0" placeholder="Qty" /></td>
        <td><input type="text" class="order-rate amount-input" placeholder="Rate" value="0" /></td>
        <td><input type="number" class="order-gst-input" min="0" placeholder="GST %" /></td>
        <td class="order-tax-amount"></td>
        <td class="order-line-total"></td>
        <td><button type="button" class="order-remove-btn">✖</button></td>
      `;

      // append row
      tbody.appendChild(tr);

      // wire remove button safely
      const removeBtn = tr.querySelector(".order-remove-btn");
      if (removeBtn) {
        removeBtn.onclick = function() { removeOrderItem(this); };
      }

      // wire rate input to format + recalc
      const rateInput = tr.querySelector(".order-rate");
      if (rateInput) {
        rateInput.addEventListener("input", function() {
          try { formatIndianNumber(rateInput); } catch (e) {}
          try { calculateOrderTotals(); } catch (e) {}
        });
      }

      // wire qty/gst to recalc
      const qtyInput = tr.querySelector(".order-qty");
      const gstInput = tr.querySelector(".order-gst-input");
      [qtyInput, gstInput].forEach(inp => {
        if (inp) inp.addEventListener("input", () => { try { calculateOrderTotals(); } catch (e) {} });
      });

      // auto resize description
      attachAutoResize(tr.querySelector(".order-desc"));

      // renumber + recalc
      renumberOrderRows();
      calculateOrderTotals();
    } catch (err) {
      console.error("[Orders:addOrderItem] error:", err);
    }
  }

  // REMOVE ORDER ITEM (defensive)
  function removeOrderItem(btn) {
    try {
      if (!btn) return;
      const tr = btn.closest ? btn.closest("tr") : (btn.parentNode && btn.parentNode.parentNode);
      if (!tr) return;
      tr.remove();
      renumberOrderRows();
      calculateOrderTotals();
    } catch (err) {
      console.error("[Orders:removeOrderItem] error:", err);
    }
  }

  // RENUMBERR
  function renumberOrderRows() {
    try {
      const cells = document.querySelectorAll("#orderItemsBody .order-serial");
      cells.forEach((cell, idx) => { cell.textContent = idx + 1; });
    } catch (err) {
      console.error("[Orders:renumberOrderRows] error:", err);
    }
  }

  // CALCULATE TOTALS (
})(); 
// ===== Quick wiring for Add Item buttons (defensive) =====
(function(){
  // helper to safe-call a function name if it exists
  function safeCall(fnName) {
    try {
      const fn = window[fnName];
      if (typeof fn === "function") { fn(); return true; }
      console.warn(`[AddItemWire] function ${fnName} not found.`);
      return false;
    } catch (e) {
      console.error(`[AddItemWire] error calling ${fnName}:`, e);
      return false;
    }
  }

  // Fallback simple add row for orderItemsBody (if real function missing)
  function fallbackAddOrderItem() {
    const tbody = document.getElementById("orderItemsBody");
    if (!tbody) { console.warn("[Fallback] #orderItemsBody missing"); return; }
    const r = tbody.insertRow();
    r.innerHTML = `
      <td class="order-serial">${tbody.rows.length}</td>
      <td><textarea class="order-desc" placeholder="Item Description"></textarea></td>
      <td><input type="text" class="order-code" placeholder="Item Code"></td>
      <td><input type="text" class="order-hsn" placeholder="HSN/SAC"></td>
      <td><input type="number" class="order-qty" value="1" min="0"></td>
      <td><input type="text" class="order-rate" value="0"></td>
      <td><input type="number" class="order-gst-input" min="0"></td>
      <td class="order-tax-amount"></td>
      <td class="order-line-total"></td>
      <td><button type="button" class="order-remove-btn">✖</button></td>
    `;
    // attach remove
    r.querySelector(".order-remove-btn")?.addEventListener("click", function(){ r.remove(); });
    // auto-resize if available
    if (typeof attachAutoResize === "function") attachAutoResize(r.querySelector(".order-desc"));
    // try recalc if exists
    window.calculateOrderTotals?.();
  }

  // Fallback add for invoice items
  function fallbackAddInvoiceItem() {
    const tbody = document.getElementById("invoiceItemsBody");
    if (!tbody) { console.warn("[Fallback] #invoiceItemsBody missing"); return; }
    const r = tbody.insertRow();
    r.innerHTML = `
      <td class="invoice-serial">${tbody.rows.length}</td>
      <td><textarea class="invoice-desc" placeholder="Item Description"></textarea></td>
      <td><input type="text" class="invoice-code" placeholder="Item Code"></td>
      <td><input type="text" class="invoice-hsn" placeholder="HSN/SAC"></td>
      <td><input type="number" class="invoice-qty" value="1" min="0"></td>
      <td><input type="text" class="invoice-rate" value="0"></td>
      <td><input type="number" class="invoice-gst-input" min="0"></td>
      <td class="invoice-tax-amount"></td>
      <td class="invoice-line-total"></td>
      <td><button type="button" class="invoice-remove-btn">✖</button></td>
    `;
    r.querySelector(".invoice-remove-btn")?.addEventListener("click", function(){ r.remove(); });
    if (typeof attachAutoResize === "function") attachAutoResize(r.querySelector(".invoice-desc"));
    window.calculateInvoiceTotals?.();
  }

  // Fallback add for quotation items
  function fallbackAddQuotationItem() {
    const tbody = document.getElementById("itemsBody");
    if (!tbody) { console.warn("[Fallback] #itemsBody missing"); return; }
    const r = tbody.insertRow();
    r.innerHTML = `
      <td class="serial">${tbody.rows.length}</td>
      <td><textarea class="desc" placeholder="Item Description"></textarea></td>
      <td><input type="text" class="code" placeholder="Item Code"></td>
      <td><input type="text" class="hsn" placeholder="HSN/SAC"></td>
      <td><input type="number" class="qty" value="1" min="0"></td>
      <td><input type="text" class="rate" value="0"></td>
      <td><input type="number" class="gst-input" min="0"></td>
      <td class="tax-amount"></td>
      <td class="line-total"></td>
      <td><button type="button" class="remove-btn">✖</button></td>
    `;
    r.querySelector(".remove-btn")?.addEventListener("click", function(){ r.remove(); });
    if (typeof attachAutoResize === "function") attachAutoResize(r.querySelector(".desc"));
    window.calculateTotals?.();
  }

  // Wire buttons by ID / text search / class
  function wireButtons() {
    // Quotes: try existing function name addQuotationItem, else fallback
    const quoteBtn = document.querySelector("#quotes button[onclick*='addQuotationItem'], #quotes button:contains('+ Add Item')");
    // Since :contains doesn't exist, fallback to query by position
    const quoteAdd = document.querySelector("#quotes button") || null;
    if (quoteAdd) {
      quoteAdd.addEventListener("click", function(e){
        if (!safeCall("addQuotationItem")) fallbackAddQuotationItem();
      });
    }

    // Orders: the Add Item button is present; find the one inside #orders
    const orderAdd = document.querySelector("#orders button[onclick*='addOrderItem'], #orders button");
    if (orderAdd) {
      orderAdd.addEventListener("click", function(e){
        if (!safeCall("addOrderItem")) fallbackAddOrderItem();
      });
    }

    // Invoices: find Add Item inside #invoices
    const invoiceAdd = document.querySelector("#invoices button[onclick*='addInvoiceItem'], #invoices button");
    if (invoiceAdd) {
      invoiceAdd.addEventListener("click", function(e){
        if (!safeCall("addInvoiceItem")) fallbackAddInvoiceItem();
      });
    }

    console.log("[AddItemWire] wired buttons (if present).");
  }

  // Run at DOM ready
  document.addEventListener("DOMContentLoaded", function(){
    try {
      wireButtons();
      // Also try to populate plain selects if they exist (safe helper)
      if (typeof window.populateOrderCustomerDropdown === "function") {
        try { window.populateOrderCustomerDropdown(); } catch(e) {}
      }
      if (typeof window.populateCustomerDropdown === "function") {
        try { window.populateCustomerDropdown(); } catch(e) {}
      }
    } catch (e) {
      console.error("[AddItemWire:init] error", e);
    }
  });
})();

// ===== Permanent safe wiring: only + Add Item buttons (place near end of Sales.js) =====
(function(){
  function findAddButtonInSection(sectionId){
    const sec = document.getElementById(sectionId);
    if(!sec) return null;
    const buttons = Array.from(sec.querySelectorAll('button'));
    return buttons.find(b => (b.textContent || "").trim().startsWith('+') || b.dataset.role === 'add-item') || null;
  }

  function safeAttach(btn, fnName, fallback) {
    if(!btn) return console.warn("No Add Item button found for", fnName);
    btn.onclick = null;
    btn.removeEventListener && btn.removeEventListener('click', btn._attachedHandler);
    const handler = function(e){
      e.preventDefault();
      if(typeof window[fnName] === 'function') {
        try { window[fnName](); return; } catch(err){ console.error(fnName, "error:", err); }
      }
      try { fallback(); } catch(err) { console.error("fallback error:", err); }
    };
    btn.addEventListener('click', handler);
    btn._attachedHandler = handler;
    console.log("Wired", fnName, "to button:", btn.textContent.trim());
  }

  // fallback functions (same as console version)
  function fallbackAddOrderItem() {
    const tbody = document.getElementById("orderItemsBody"); if(!tbody) return;
    const idx = tbody.rows.length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="order-serial">${idx}</td><td><textarea class="order-desc" placeholder="Item Description"></textarea></td><td><input type="text" class="order-code"></td><td><input type="text" class="order-hsn"></td><td><input type="number" class="order-qty" value="1"></td><td><input type="text" class="order-rate" value="0"></td><td><input type="number" class="order-gst-input"></td><td class="order-tax-amount"></td><td class="order-line-total"></td><td><button type="button" class="order-remove-btn btn btn-danger btn-sm">✖</button></td>`;
    tbody.appendChild(tr);
    tr.querySelector('.order-remove-btn')?.addEventListener('click', function(){ tr.remove(); });
    if (typeof window.calculateOrderTotals === 'function') try { window.calculateOrderTotals(); } catch(e){}
    console.log("[fallbackAddOrderItem] row added");
  }

  function fallbackAddQuotationItem() {
    const tbody = document.getElementById("itemsBody"); if(!tbody) return;
    const idx = tbody.rows.length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="serial">${idx}</td><td><textarea class="desc"></textarea></td><td><input class="code"></td><td><input class="hsn"></td><td><input class="qty" value="1" type="number"></td><td><input class="rate" value="0"></td><td><input class="gst-input" type="number"></td><td class="tax-amount"></td><td class="line-total"></td><td><button type="button" class="remove-btn btn btn-danger btn-sm">✖</button></td>`;
    tbody.appendChild(tr);
    tr.querySelector('.remove-btn')?.addEventListener('click', () => tr.remove());
    if (typeof window.calculateTotals === 'function') try { window.calculateTotals(); } catch(e){}
    console.log("[fallbackAddQuotationItem] row added");
  }

  function fallbackAddInvoiceItem() {
    const tbody = document.getElementById("invoiceItemsBody"); if(!tbody) return;
    const idx = tbody.rows.length + 1;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="invoice-serial">${idx}</td><td><textarea class="invoice-desc"></textarea></td><td><input class="invoice-code"></td><td><input class="invoice-hsn"></td><td><input class="invoice-qty" value="1" type="number"></td><td><input class="invoice-rate" value="0"></td><td><input class="invoice-gst-input" type="number"></td><td class="invoice-tax-amount"></td><td class="invoice-line-total"></td><td><button type="button" class="invoice-remove-btn btn btn-danger btn-sm">✖</button></td>`;
    tbody.appendChild(tr);
    tr.querySelector('.invoice-remove-btn')?.addEventListener('click', () => tr.remove());
    if (typeof window.calculateInvoiceTotals === 'function') try { window.calculateInvoiceTotals(); } catch(e){}
    console.log("[fallbackAddInvoiceItem] row added");
  }

  // run on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    safeAttach(findAddButtonInSection('quotes'), 'addQuotationItem', fallbackAddQuotationItem);
    safeAttach(findAddButtonInSection('orders'), 'addOrderItem', fallbackAddOrderItem);
    safeAttach(findAddButtonInSection('invoices'), 'addInvoiceItem', fallbackAddInvoiceItem);
    console.log("Permanent wiring done: only + Add Item buttons are wired.");
  });

  // expose rewire helper
  window.rewireAddItemButtons = function(){ 
    safeAttach(findAddButtonInSection('quotes'), 'addQuotationItem', fallbackAddQuotationItem);
    safeAttach(findAddButtonInSection('orders'), 'addOrderItem', fallbackAddOrderItem);
    safeAttach(findAddButtonInSection('invoices'), 'addInvoiceItem', fallbackAddInvoiceItem);
  };
})();

// ===== Orders: single drop-in: ensure 1 row on load + live calc + auto-resize + invoice-style action =====
(function() {
  // --- Small helpers (safe fallbacks if your file didn't include them) ---
  if (typeof window.attachAutoResize !== "function") {
    window.attachAutoResize = function(el) {
      if (!el) return;
      const base = 38;
      el.style.height = base + "px";
      try { el.style.height = el.scrollHeight + "px"; } catch(e){}
      if (!el._autoResizeAttached) {
        el.addEventListener("input", function() {
          el.style.height = base + "px";
          el.style.height = (el.scrollHeight || base) + "px";
        });
        el._autoResizeAttached = true;
      }
    };
  }

  if (typeof window.formatIndianNumber !== "function") {
    window.formatIndianNumber = function(input) {
      if (!input) return;
      const raw = (input.value || "").toString().replace(/,/g, "").trim();
      if (raw === "" || isNaN(raw)) { input.value = raw; return; }
      try { input.value = parseFloat(raw).toLocaleString("en-IN"); } catch(e) {}
    };
  }

  // --- Build a standard order row (returns <tr>) ---
  function createOrderRow() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="order-serial">1</td>

      <td>
        <textarea class="order-desc" placeholder="Item Description" rows="1" style="min-height:38px; resize:none;"></textarea>
      </td>

      <td>
        <input type="text" class="order-code" placeholder="Item Code" />
      </td>

      <td>
        <input type="text" class="order-hsn" placeholder="HSN/SAC" />
      </td>

      <td>
        <input type="number" class="order-qty" value="1" min="0" />
      </td>

      <td>
        <input type="text" class="order-rate amount-input" value="0" placeholder="0" />
      </td>

      <td>
        <input type="number" class="order-gst-input" min="0" placeholder="GST %" />
      </td>

      <td class="order-tax-amount"></td>
      <td class="order-line-total"></td>

      <td>
        <button type="button" class="order-remove-btn btn btn-danger btn-sm" title="Remove row">✖</button>
      </td>
    `;
    return tr;
  }

  // --- Exposed functions (add / remove / renumber / calculate) ---
  function addOrderItem() {
    try {
      const tbody = document.getElementById("orderItemsBody");
      if (!tbody) {
        console.warn("[orders] #orderItemsBody not found");
        return;
      }

      const tr = createOrderRow();
      tbody.appendChild(tr);

      // Wire remove button
      const removeBtn = tr.querySelector(".order-remove-btn");
      if (removeBtn) removeBtn.addEventListener("click", function() { removeOrderItem(this); });

      // Wire inputs: rate formatting + recalc, qty/gst recalc, attach auto-resize
      const rateInput = tr.querySelector(".order-rate");
      const qtyInput = tr.querySelector(".order-qty");
      const gstInput = tr.querySelector(".order-gst-input");
      const desc = tr.querySelector(".order-desc");

      if (rateInput) {
        rateInput.addEventListener("input", function() {
          try { formatIndianNumber(rateInput); } catch(e) {}
          try { calculateOrderTotals(); } catch(e) {}
        });
      }

      [qtyInput, gstInput].forEach(inp => {
        if (inp) inp.addEventListener("input", function() { try { calculateOrderTotals(); } catch(e) {} });
      });

      if (desc) {
        // attach auto resize and set initial height
        attachAutoResize(desc);
      }

      // ensure style matches invoice remove button classes (in case CSS uses those classes)
      if (removeBtn) {
        removeBtn.classList.add("btn", "btn-danger", "btn-sm");
      }

      renumberOrderRows();
      calculateOrderTotals();
    } catch (err) {
      console.error("[orders:addOrderItem] error:", err);
    }
  }

  function removeOrderItem(btn) {
    try {
      if (!btn) return;
      const tr = btn.closest ? btn.closest("tr") : (btn.parentNode && btn.parentNode.parentNode);
      if (!tr) return;
      tr.remove();
      renumberOrderRows();
      calculateOrderTotals();
    } catch (err) {
      console.error("[orders:removeOrderItem] error:", err);
    }
  }

  function renumberOrderRows() {
    try {
      const cells = document.querySelectorAll("#orderItemsBody .order-serial");
      cells.forEach((cell, idx) => { cell.textContent = idx + 1; });
    } catch (err) {
      console.error("[orders:renumberOrderRows] error:", err);
    }
  }

  function calculateOrderTotals() {
    try {
      const rows = document.querySelectorAll("#orderItemsBody tr");
      let grandTotal = 0;

      // Detect if customer GST indicates Gujarat for splitting tax — optional; default false
      let isGujarat = false;
      try {
        const idx = document.getElementById("orderCustomerIndex")?.value;
        const customers = JSON.parse(localStorage.getItem("customers") || "[]");
        if (idx !== undefined && customers && customers[idx] && typeof customers[idx].gstPan === "string") {
          isGujarat = customers[idx].gstPan.startsWith("24");
        }
      } catch (e) { isGujarat = false; }

      rows.forEach((row) => {
        try {
          const qtyInput = row.querySelector(".order-qty");
          const rateInput = row.querySelector(".order-rate");
          const gstInput = row.querySelector(".order-gst-input");
          const taxCell = row.querySelector(".order-tax-amount");
          const totalCell = row.querySelector(".order-line-total");

          let qty = parseFloat(qtyInput?.value) || 0;
          let rate = parseFloat((rateInput?.value || "").replace(/,/g, "")) || 0;
          let gstPercent = parseFloat(gstInput?.value) || 0;

          if (qty < 0) { qty = 0; if (qtyInput) qtyInput.value = 0; }
          if (rate < 0) { rate = 0; if (rateInput) rateInput.value = "0"; }
          if (gstPercent < 0) { gstPercent = 0; if (gstInput) gstInput.value = "0"; }

          const baseTotal = qty * rate;
          const taxAmount = (baseTotal * gstPercent) / 100;
          const total = baseTotal + taxAmount;

          // show nothing if empty
          if ((baseTotal === 0) && (gstPercent === 0)) {
            if (taxCell) taxCell.textContent = "";
            if (totalCell) totalCell.textContent = "";
          } else {
            if (isGujarat) {
              const half = taxAmount / 2;
              if (taxCell) taxCell.textContent = `₹${half.toLocaleString("en-IN")} + ₹${half.toLocaleString("en-IN")}`;
            } else {
              if (taxCell) taxCell.textContent = `₹${taxAmount.toLocaleString("en-IN")} (GST)`;
            }
            if (totalCell) totalCell.textContent = `₹${total.toLocaleString("en-IN")}`;
          }

          grandTotal += isNaN(total) ? 0 : total;
        } catch (inner) {
          console.warn("[orders:calc row] row error", inner);
        }
      });

      const grandEl = document.getElementById("orderGrandTotal");
      if (grandEl) grandEl.textContent = grandTotal.toLocaleString("en-IN");
    } catch (err) {
      console.error("[orders:calculateOrderTotals] error:", err);
    }
  }

  // --- Ensure global exposure so inline HTML onclicks don't crash ---
  window.addOrderItem = addOrderItem;
  window.removeOrderItem = removeOrderItem;
  window.renumberOrderRows = renumberOrderRows;
  window.calculateOrderTotals = calculateOrderTotals;

  // --- On load: ensure exactly one row exists, wire the + Add Item button safely (only that button),
  // and style remove buttons like invoice ---
  document.addEventListener("DOMContentLoaded", function() {
    try {
      const tbody = document.getElementById("orderItemsBody");
      if (!tbody) return;

      // If empty, add a default row
      if (tbody.rows.length === 0) addOrderItem();

      // Ensure remove buttons have same classes as invoice's action button
      document.querySelectorAll("#orderItemsBody .order-remove-btn").forEach(btn => {
        btn.classList.add("btn", "btn-danger", "btn-sm");
      });

      // Wire only the "+ Add Item" button inside #orders (avoid toggles)
      (function wireAddButton() {
        const sec = document.getElementById("orders");
        if (!sec) return;
        const buttons = Array.from(sec.querySelectorAll("button"));
        // find the button whose visible text starts with '+' (e.g. "+ Add Item")
        const addBtn = buttons.find(b => (b.textContent || "").trim().startsWith("+"));
        if (!addBtn) return;
        // remove previous handlers
        addBtn.onclick = null;
        addBtn._attachedHandler && addBtn.removeEventListener("click", addBtn._attachedHandler);
        const handler = function(e) {
          e.preventDefault();
          addOrderItem();
        };
        addBtn.addEventListener("click", handler);
        addBtn._attachedHandler = handler;
      })();

      // Calculate once on load
      calculateOrderTotals();

      console.log("[orders] ready: one row ensured, calc wired, auto-resize enabled.");
    } catch (e) {
      console.error("[orders:init] error:", e);
    }
  });

})(); // end IIFE

/* ===== SAFE restore + minimal same-as-billing + search ===== */
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Try to re-render customers if function exists (restores list)
    try {
      if (typeof renderCustomers === 'function') {
        renderCustomers();
      }
    } catch(e){ console.warn('restore: renderCustomers failed', e); }

    // 2) Ensure customer table rows shown (in case hidden)
    try {
      const tbody = document.getElementById('customerTableBody');
      if (tbody) {
        tbody.querySelectorAll('tr').forEach(r => r.style.display = '');
      }
    } catch(e){ console.warn('restore: unhide rows error', e); }

    // 3) Minimal same-as-billing behavior
    const billingTa = document.querySelector("textarea[name='billingAddress']");
    const shippingName = "shippingAddress[]";

    function applyCopyForCheckbox(cb) {
      try {
        const group = cb.closest('.shipping-group');
        if (!group) return;
        const ta = group.querySelector(`textarea[name="${shippingName}"]`);
        if (!ta) return;
        if (cb.checked) {
          ta.value = billingTa ? billingTa.value : ta.value;
          ta.readOnly = true;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          ta.readOnly = false;
        }
      } catch(e){ console.warn('applyCopyForCheckbox', e); }
    }

    // When billing changes, update checked shipping boxes
    if (billingTa) {
      billingTa.addEventListener('input', () => {
        document.querySelectorAll('.same-as-billing').forEach(cb => {
          if (cb.checked) applyCopyForCheckbox(cb);
        });
      });
    }

    // Delegate change events so dynamic rows also work
    document.addEventListener('change', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('same-as-billing')) {
        applyCopyForCheckbox(e.target);
      }
    });

    // Apply initial state for any existing checked boxes
    document.querySelectorAll('.same-as-billing').forEach(cb => {
      if (cb.checked) applyCopyForCheckbox(cb);
    });

    // 4) Simple search: wire only if both search input and table body exist
    const search = document.getElementById('searchInput') || document.getElementById('customerSearchInput');
    const tbody = document.getElementById('customerTableBody');
    if (search && tbody) {
      // show all on click
      search.addEventListener('click', () => tbody.querySelectorAll('tr').forEach(r => r.style.display = ''));
      // filter on input
      search.addEventListener('input', () => {
        const q = (search.value || '').toLowerCase().trim();
        tbody.querySelectorAll('tr').forEach(r => {
          r.style.display = (r.innerText || '').toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }

    console.log('SAFE helper loaded: customers re-render attempted, same-as-billing & search wired.');
  });
})();

/* ===== Auto-expand billing + shipping textareas (paste at end of sales.js) ===== */
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const MIN_HEIGHT_PX = 38;

    function makeAutoExpand(textarea){
      if(!textarea || textarea._autoExpandAttached) return;
      // disable manual resize and hide overflow
      textarea.style.resize = 'none';
      textarea.style.overflow = 'hidden';
      textarea.style.boxSizing = 'border-box';
      textarea.style.minHeight = MIN_HEIGHT_PX + 'px';

      const resize = () => {
        try {
          textarea.style.height = MIN_HEIGHT_PX + 'px'; // reset base
          // use scrollHeight to grow
          textarea.style.height = (textarea.scrollHeight) + 'px';
        } catch(e){ /* ignore */ }
      };

      // initial adjust
      resize();

      // attach listeners
      textarea.addEventListener('input', resize);
      textarea.addEventListener('change', resize);
      // mark as attached so we don't double attach
      textarea._autoExpandAttached = true;
    }

    // attach to existing billing + shipping textareas
    function attachAll() {
      const billing = document.querySelector("textarea[name='billingAddress']");
      if(billing) makeAutoExpand(billing);

      document.querySelectorAll("textarea[name='shippingAddress[]']").forEach(t => makeAutoExpand(t));
    }

    attachAll();

    // Observe shippingAddresses container for new rows (so dynamically added shipping textareas get auto-expand)
    const shippingContainer = document.getElementById('shippingAddresses') || document.body;
    try {
      const mo = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if(node.nodeType !== 1) return;
            // if a shipping-group or textarea was added, attach
            if(node.matches && node.matches('.shipping-group')) {
              node.querySelectorAll("textarea[name='shippingAddress[]']").forEach(t => makeAutoExpand(t));
            } else {
              node.querySelectorAll && node.querySelectorAll("textarea[name='shippingAddress[]']").forEach(t => makeAutoExpand(t));
            }
          });
        });
      });
      mo.observe(shippingContainer, { childList: true, subtree: true });
    } catch(e){ /* MutationObserver not supported? ignore */ }

    // When "same-as-billing" is checked and we copy billing -> shipping, ensure resize runs after value set
    document.addEventListener('change', (e) => {
      if(e.target && e.target.classList && e.target.classList.contains('same-as-billing')) {
        const group = e.target.closest('.shipping-group');
        const ta = group && group.querySelector("textarea[name='shippingAddress[]']");
        if(ta) {
          // small timeout to allow value to be set by other code
          setTimeout(() => {
            try {
              ta.style.height = MIN_HEIGHT_PX + 'px';
              ta.style.height = (ta.scrollHeight) + 'px';
            } catch(err){}
          }, 10);
        }
      }
    });

    // also re-run attachAll if someone calls renderCustomers or resets form externally
    window.attachBillingShippingAutoExpand = attachAll;
    console.log('Auto-expand for billing & shipping textareas initialized.');
  });
})();
