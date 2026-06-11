const LS = "AR_PHARMACY_POS_V1";

const DEFAULT = {
  settings: {
    pharmacyName: "AR Pharmacy POS",
    phone: "0773 214 1551",
    address: "Sulaymaniyah",
    receiptNote: "Thank you for choosing us"
  },
  suppliers: [
    { id: "S1", name: "Main Supplier", phone: "0770 000 0000", address: "Sulaymaniyah", note: "" }
  ],
  customers: [
    { id: "C1", name: "Walk-in Customer", phone: "", address: "" }
  ],
  medicines: [
    {
      id: "M1",
      code: "M001",
      barcode: "1000001",
      name: "Paracetamol 500mg",
      scientificName: "Paracetamol",
      category: "Painkiller",
      company: "Generic",
      unit: "box",
      sellPrice: 2000,
      buyPrice: 1200,
      minStock: 10,
      requiresPrescription: false
    },
    {
      id: "M2",
      code: "M002",
      barcode: "1000002",
      name: "Amoxicillin 500mg",
      scientificName: "Amoxicillin",
      category: "Antibiotic",
      company: "Generic",
      unit: "box",
      sellPrice: 5000,
      buyPrice: 3200,
      minStock: 8,
      requiresPrescription: true
    },
    {
      id: "M3",
      code: "M003",
      barcode: "1000003",
      name: "Vitamin C",
      scientificName: "Ascorbic Acid",
      category: "Vitamin",
      company: "Generic",
      unit: "box",
      sellPrice: 3000,
      buyPrice: 1800,
      minStock: 10,
      requiresPrescription: false
    }
  ],
  batches: [
    { id: "B1", medicineId: "M1", batchNo: "P-2026-A", expiryDate: "2027-12-31", quantity: 100, buyPrice: 1200, sellPrice: 2000 },
    { id: "B2", medicineId: "M2", batchNo: "A-2026-B", expiryDate: "2026-12-31", quantity: 50, buyPrice: 3200, sellPrice: 5000 },
    { id: "B3", medicineId: "M3", batchNo: "V-2026-C", expiryDate: "2028-01-15", quantity: 75, buyPrice: 1800, sellPrice: 3000 }
  ],
  sales: [],
  saleItems: [],
  purchases: [],
  purchaseItems: [],
  prescriptions: [],
  expenses: []
};

let db = load();
let state = { logged: false, role: "", username: "", page: "dashboard", cart: [], selectedCategory: "" };

function clone(x) { return JSON.parse(JSON.stringify(x)); }

function load() {
  const r = localStorage.getItem(LS);

  if (!r) {
    localStorage.setItem(LS, JSON.stringify(DEFAULT));
    return clone(DEFAULT);
  }

  try {
    const parsed = JSON.parse(r);
    return {
      ...clone(DEFAULT),
      ...parsed,
      settings: { ...clone(DEFAULT).settings, ...(parsed.settings || {}) },
      suppliers: parsed.suppliers || [],
      customers: parsed.customers || [],
      medicines: parsed.medicines || [],
      batches: parsed.batches || [],
      sales: parsed.sales || [],
      saleItems: parsed.saleItems || [],
      purchases: parsed.purchases || [],
      purchaseItems: parsed.purchaseItems || [],
      prescriptions: parsed.prescriptions || [],
      expenses: parsed.expenses || []
    };
  } catch {
    return clone(DEFAULT);
  }
}

function save() {
  localStorage.setItem(LS, JSON.stringify(db));

  if (window.AR_PHARMACY_CLOUD) {
    window.AR_PHARMACY_CLOUD.save(db).catch(console.log);
  }
}

function byId(id) { return document.getElementById(id); }
function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function money(n) { return Number(n || 0).toLocaleString() + " IQD"; }
function today() { return new Date().toISOString().slice(0, 10); }
function month() { return new Date().toISOString().slice(0, 7); }
function dateStr(d) { return new Date(d).toLocaleString(); }
function med(id) { return db.medicines.find(x => x.id === id); }
function batch(id) { return db.batches.find(x => x.id === id); }
function customer(id) { return db.customers.find(x => x.id === id); }
function totalStock(mid) { return db.batches.filter(b => b.medicineId === mid).reduce((s, b) => s + Number(b.quantity || 0), 0); }
function validBatches(mid) { return db.batches.filter(b => b.medicineId === mid && Number(b.quantity) > 0).sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate))); }
function daysToExpiry(date) { return Math.ceil((new Date(date + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24)); }
function canManage() { return state.role === "admin" || state.role === "pharmacist"; }
function canSell() { return state.role === "admin" || state.role === "cashier" || state.role === "pharmacist"; }

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
}

function render() {
  const app = byId("app");

  if (!state.logged) {
    app.innerHTML = `
      <div class="login card" dir="ltr">
        <div class="logo">PH</div>
        <h2>Login</h2>
        <p class="muted">AR Pharmacy POS</p>
        <div class="notice">Pharmacy management system for cashier, stock, expiry dates and reports.</div>
        <label>Email</label>
        <input id="loginUser" placeholder="Email" autocomplete="email">
        <label>Password</label>
        <input id="loginPass" type="password" placeholder="Password">
        <button onclick="login()" style="margin-top:12px">Login</button>
        <p class="small muted">Use Firebase Email and Password.</p>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="app" dir="ltr">
      <div class="topbar">
        <div class="brand">
          <span class="brandmark">PH</span>
          ${esc(db.settings.pharmacyName)}
          <span class="badge blue">${esc(state.role)}</span>
        </div>
        <div class="actions">
          <span class="badge">${new Date().toLocaleDateString()}</span>
          <button class="secondary" onclick="logout()">Logout</button>
        </div>
      </div>

      <div class="layout">
        <div class="sidebar">
          ${nav("dashboard", "Dashboard")}
          ${nav("pos", "Sales / POS")}
          ${nav("medicines", "Medicines")}
          ${nav("batches", "Stock & Expiry")}
          ${nav("purchases", "Purchases")}
          ${nav("suppliers", "Suppliers")}
          ${nav("customers", "Customers")}
          ${nav("prescriptions", "Prescriptions")}
          ${nav("expenses", "Expenses")}
          ${nav("reports", "Reports")}
          ${nav("settings", "Settings")}
        </div>
        <div class="content">${pageHtml()}</div>
      </div>
    </div>
    <div id="printArea" class="hidden"></div>
  `;

  afterRender();
}

function nav(p, t) { return `<button class="navbtn ${state.page === p ? "active" : ""}" onclick="go('${p}')">${t}</button>`; }
function go(p) { state.page = p; render(); }

async function login() {
  const email = byId("loginUser").value.trim();
  const p = byId("loginPass").value;

  try {
    if (!window.AR_PHARMACY_CLOUD) {
      alert("Firebase is not ready");
      return;
    }

    const cloudUser = await window.AR_PHARMACY_CLOUD.login(email, p);
    db = load();
    state.logged = true;
    state.role = cloudUser.role || "admin";
    state.username = cloudUser.email || email;
    state.page = "dashboard";
    save();
    render();
  } catch (err) {
    console.log(err);
    alert("Error: " + (err.code || err.message || String(err)));
  }
}

async function logout() {
  if (window.AR_PHARMACY_CLOUD) {
    await window.AR_PHARMACY_CLOUD.logout().catch(console.log);
  }
  state.logged = false;
  state.role = "";
  state.cart = [];
  render();
}

function pageHtml() {
  if (state.page === "dashboard") return dashboardHtml();
  if (state.page === "pos") return posHtml();
  if (state.page === "medicines") return medicinesHtml();
  if (state.page === "batches") return batchesHtml();
  if (state.page === "purchases") return purchasesHtml();
  if (state.page === "suppliers") return suppliersHtml();
  if (state.page === "customers") return customersHtml();
  if (state.page === "prescriptions") return prescriptionsHtml();
  if (state.page === "expenses") return expensesHtml();
  if (state.page === "reports") return reportsHtml();
  return settingsHtml();
}

function afterRender() {
  if (state.page === "pos") renderMedGrid();
  if (state.page === "medicines") renderMedicineTable();
  if (state.page === "batches") renderBatchTable();
  if (state.page === "suppliers") renderSupplierTable();
  if (state.page === "customers") renderCustomerTable();
  if (state.page === "expenses") renderExpenseTable();
}

function dashboardHtml() {
  const salesToday = db.sales.filter(s => String(s.date).slice(0, 10) === today());
  const salesMonth = db.sales.filter(s => String(s.date).slice(0, 7) === month());
  const todayTotal = salesToday.reduce((s, x) => s + Number(x.total || 0), 0);
  const monthTotal = salesMonth.reduce((s, x) => s + Number(x.total || 0), 0);
  const profitToday = salesToday.reduce((s, x) => s + Number(x.profit || 0), 0);
  const low = db.medicines.filter(m => totalStock(m.id) <= Number(m.minStock || 0)).length;
  const exp = db.batches.filter(b => Number(b.quantity) > 0 && daysToExpiry(b.expiryDate) <= 60).length;

  return `
    <div class="grid four">
      <div class="card"><div class="muted">Today Sales</div><div class="kpi">${money(todayTotal)}</div></div>
      <div class="card"><div class="muted">Today Profit</div><div class="kpi">${money(profitToday)}</div></div>
      <div class="card"><div class="muted">Monthly Sales</div><div class="kpi">${money(monthTotal)}</div></div>
      <div class="card"><div class="muted">Alerts</div><div class="kpi">${low + exp}</div></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><h2>Low Stock</h2>${lowStockTable()}</div>
      <div class="card"><h2>Near Expiry</h2>${expiryTable()}</div>
    </div>
    <div class="card" style="margin-top:14px"><h2>Latest Sales</h2>${salesTable(12)}</div>
  `;
}

function lowStockTable() {
  const rows = db.medicines
    .filter(m => totalStock(m.id) <= Number(m.minStock || 0))
    .map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${totalStock(m.id)}</td><td>${m.minStock}</td></tr>`)
    .join("");
  return `<div class="tablewrap"><table><thead><tr><th>Code</th><th>Medicine</th><th>Stock</th><th>Alert</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No low stock items</td></tr>'}</tbody></table></div>`;
}

function expiryTable() {
  const rows = db.batches
    .filter(b => Number(b.quantity) > 0 && daysToExpiry(b.expiryDate) <= 60)
    .sort((a, b) => daysToExpiry(a.expiryDate) - daysToExpiry(b.expiryDate))
    .map(b => {
      const m = med(b.medicineId) || {};
      const days = daysToExpiry(b.expiryDate);
      return `<tr class="${days < 0 ? "expired" : "expiry-warn"}"><td>${esc(m.name || "")}</td><td>${esc(b.batchNo)}</td><td>${esc(b.expiryDate)}</td><td>${days}</td><td>${b.quantity}</td></tr>`;
    })
    .join("");
  return `<div class="tablewrap"><table><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Days</th><th>Qty</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">No near expiry items</td></tr>'}</tbody></table></div>`;
}

function posHtml() {
  if (!canSell()) return `<div class="card"><h2>Access denied</h2></div>`;

  const subtotal = state.cart.reduce((s, i) => s + i.qty * i.sellPrice, 0);
  const discount = Number(byId("discount")?.value || 0);
  const total = Math.max(0, subtotal - discount);

  return `
    <div class="grid two">
      <div class="card">
        <h2>Sales / POS</h2>
        <div class="row">
          <input id="posSearch" placeholder="Search by name, code or barcode..." oninput="renderMedGrid()">
          <button class="secondary" onclick="byId('posSearch').value='';renderMedGrid()">Clear</button>
        </div>
        <div class="actions" style="margin-top:10px">
          <button class="secondary" onclick="state.selectedCategory='';renderMedGrid()">All</button>
          ${[...new Set(db.medicines.map(x => x.category || "Other"))].map(c => `<button class="secondary" onclick="state.selectedCategory='${esc(c)}';renderMedGrid()">${esc(c)}</button>`).join("")}
        </div>
        <div id="medGrid" class="medicine-grid"></div>
      </div>
      <div class="card">
        <h2>Cart</h2>
        <label>Customer</label>
        <select id="saleCustomer">${db.customers.map(c => `<option value="${c.id}">${esc(c.name)}${c.phone ? " - " + esc(c.phone) : ""}</option>`).join("")}</select>
        <div class="tablewrap" style="margin-top:12px">
          <table>
            <thead><tr><th>Medicine</th><th>Batch</th><th>Qty</th><th>Total</th><th></th></tr></thead>
            <tbody>${state.cart.map((i, idx) => `<tr><td>${esc(i.name)}</td><td>${esc(i.batchNo)}</td><td><input type="number" min="1" max="${i.available}" value="${i.qty}" style="width:75px" onchange="setCartQty(${idx},this.value)"></td><td>${money(i.qty * i.sellPrice)}</td><td><button class="red" onclick="removeCart(${idx})">X</button></td></tr>`).join("") || '<tr><td colspan="5" class="muted">Cart is empty</td></tr>'}</tbody>
          </table>
        </div>
        <div class="row">
          <div><label>Discount</label><input id="discount" type="number" value="0" oninput="render()"></div>
          <div><label>Paid</label><input id="paid" type="number" value="${total}"></div>
        </div>
        <div class="kpi">${money(total)}</div>
        <div class="actions" style="margin-top:12px">
          <button class="green" onclick="checkout()">Sell & Print</button>
          <button class="secondary" onclick="clearCart()">Clear</button>
        </div>
      </div>
    </div>
  `;
}

function renderMedGrid() {
  const box = byId("medGrid");
  if (!box) return;
  const q = (byId("posSearch")?.value || "").toLowerCase();
  const items = db.medicines.filter(m =>
    (!state.selectedCategory || m.category === state.selectedCategory) &&
    (String(m.name).toLowerCase().includes(q) || String(m.code).toLowerCase().includes(q) || String(m.barcode || "").includes(q))
  );
  box.innerHTML = items.map(m => `<button class="medbtn" onclick="addToCart('${m.id}')"><b>${esc(m.name)}</b><span>${esc(m.code)} / ${esc(m.category)}</span><span>Stock: ${totalStock(m.id)}</span><strong>${money(m.sellPrice)}</strong>${m.requiresPrescription ? '<span class="badge amber">Prescription</span>' : ""}</button>`).join("");
}

function addToCart(mid) {
  const m = med(mid);
  if (!m) return;
  const batches = validBatches(mid);
  if (!batches.length) return alert("This medicine is out of stock");
  const b = batches[0];
  const ex = state.cart.find(x => x.batchId === b.id);
  if (ex) {
    if (ex.qty + 1 > Number(b.quantity)) return alert("Not enough stock");
    ex.qty++;
  } else {
    state.cart.push({ medicineId: m.id, batchId: b.id, batchNo: b.batchNo, name: m.name, qty: 1, available: Number(b.quantity), sellPrice: Number(b.sellPrice || m.sellPrice), buyPrice: Number(b.buyPrice || m.buyPrice) });
  }
  render();
}

function setCartQty(idx, v) { const i = state.cart[idx]; if (!i) return; i.qty = Math.max(1, Math.min(Number(i.available), Number(v || 1))); render(); }
function removeCart(idx) { state.cart.splice(idx, 1); render(); }
function clearCart() { state.cart = []; render(); }

function checkout() {
  if (!state.cart.length) return alert("Cart is empty");
  const subtotal = state.cart.reduce((s, i) => s + i.qty * i.sellPrice, 0);
  const discount = Number(byId("discount")?.value || 0);
  const total = Math.max(0, subtotal - discount);
  const paid = Number(byId("paid")?.value || 0);
  const change = paid - total;
  if (paid < total) return alert("Paid amount is not enough");
  const saleId = uid("SA");
  const sale = { id: saleId, date: new Date().toISOString(), customerId: byId("saleCustomer").value, subtotal, discount, total, paid, change, profit: 0, user: state.username };
  for (const item of state.cart) {
    const b = batch(item.batchId);
    if (!b || Number(b.quantity) < item.qty) return alert("Not enough stock");
    b.quantity = Number(b.quantity) - item.qty;
    const profit = (item.sellPrice - item.buyPrice) * item.qty;
    sale.profit += profit;
    db.saleItems.push({ id: uid("SI"), saleId, medicineId: item.medicineId, batchId: item.batchId, batchNo: item.batchNo, name: item.name, qty: item.qty, sellPrice: item.sellPrice, buyPrice: item.buyPrice, total: item.qty * item.sellPrice, profit });
  }
  db.sales.push(sale);
  state.cart = [];
  save();
  printReceipt(saleId);
  render();
}

function printReceipt(saleId) {
  const sale = db.sales.find(x => x.id === saleId);
  if (!sale) return;
  const items = db.saleItems.filter(x => x.saleId === saleId);
  const c = customer(sale.customerId) || {};
  const html = `<div style="font-family:Arial;padding:12px;direction:ltr"><h2>${esc(db.settings.pharmacyName)}</h2><p>${esc(db.settings.address)}<br>${esc(db.settings.phone)}</p><hr><p>Receipt No: ${sale.id}</p><p>Customer: ${esc(c.name || "")}</p><p>Date: ${dateStr(sale.date)}</p><table style="width:100%;border-collapse:collapse" border="1"><thead><tr><th>Medicine</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.sellPrice)}</td><td>${money(i.total)}</td></tr>`).join("")}</tbody></table><h3>Total: ${money(sale.total)}</h3><p>${esc(db.settings.receiptNote)}</p></div>`;
  const w = window.open("", "_blank");
  if (!w) return alert("Popup is blocked");
  w.document.write(html);
  w.document.close();
  w.print();
}

function salesTable(limit = 50) {
  const rows = [...db.sales].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limit).map(s => {
    const c = customer(s.customerId) || {};
    return `<tr><td>${dateStr(s.date)}</td><td>${esc(c.name || "")}</td><td>${money(s.total)}</td><td>${money(s.profit)}</td><td>${esc(s.user || "")}</td></tr>`;
  }).join("");
  return `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Total</th><th>Profit</th><th>User</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="muted">No sales yet</td></tr>'}</tbody></table></div>`;
}

function medicinesHtml() {
  if (!canManage()) return `<div class="card"><h2>Access denied</h2></div>`;
  return `<div class="card"><h2>Add Medicine</h2><div class="grid two"><div><label>Code</label><input id="mCode" placeholder="M004"></div><div><label>Barcode</label><input id="mBarcode"></div><div><label>Name</label><input id="mName"></div><div><label>Scientific Name</label><input id="mScientific"></div><div><label>Category</label><input id="mCategory"></div><div><label>Company</label><input id="mCompany"></div><div><label>Unit</label><input id="mUnit" value="box"></div><div><label>Sell Price</label><input id="mSell" type="number"></div><div><label>Buy Price</label><input id="mBuy" type="number"></div><div><label>Min Stock</label><input id="mMin" type="number" value="5"></div></div><label><input id="mPrescription" type="checkbox"> Requires prescription</label><button onclick="addMedicine()" style="margin-top:12px">Add</button></div><div class="card" style="margin-top:14px"><h2>Medicines</h2><div id="medicineTable"></div></div>`;
}

function addMedicine() {
  const name = byId("mName").value.trim();
  if (!name) return alert("Enter medicine name");
  db.medicines.push({ id: uid("M"), code: byId("mCode").value.trim() || uid("C"), barcode: byId("mBarcode").value.trim(), name, scientificName: byId("mScientific").value.trim(), category: byId("mCategory").value.trim() || "Other", company: byId("mCompany").value.trim(), unit: byId("mUnit").value.trim() || "box", sellPrice: Number(byId("mSell").value || 0), buyPrice: Number(byId("mBuy").value || 0), minStock: Number(byId("mMin").value || 0), requiresPrescription: byId("mPrescription").checked });
  save();
  render();
}

function deleteMedicine(id) { if (!confirm("Are you sure?")) return; db.medicines = db.medicines.filter(x => x.id !== id); db.batches = db.batches.filter(x => x.medicineId !== id); save(); render(); }
function renderMedicineTable() { const box = byId("medicineTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Stock</th><th>Price</th><th></th></tr></thead><tbody>${db.medicines.map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${esc(m.category)}</td><td>${totalStock(m.id)}</td><td>${money(m.sellPrice)}</td><td><button class="red" onclick="deleteMedicine('${m.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`; }

function batchesHtml() {
  if (!canManage()) return `<div class="card"><h2>Access denied</h2></div>`;
  return `<div class="card"><h2>Add Batch / Stock</h2><div class="grid two"><div><label>Medicine</label><select id="bMed">${db.medicines.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></div><div><label>Batch No</label><input id="bNo"></div><div><label>Expiry Date</label><input id="bExp" type="date"></div><div><label>Quantity</label><input id="bQty" type="number"></div><div><label>Buy Price</label><input id="bBuy" type="number"></div><div><label>Sell Price</label><input id="bSell" type="number"></div></div><button onclick="addBatch()" style="margin-top:12px">Add</button></div><div class="card" style="margin-top:14px"><h2>Stock</h2><div id="batchTable"></div></div>`;
}

function addBatch() { const medicineId = byId("bMed").value; const m = med(medicineId); db.batches.push({ id: uid("B"), medicineId, batchNo: byId("bNo").value.trim() || uid("B"), expiryDate: byId("bExp").value || today(), quantity: Number(byId("bQty").value || 0), buyPrice: Number(byId("bBuy").value || m.buyPrice || 0), sellPrice: Number(byId("bSell").value || m.sellPrice || 0) }); save(); render(); }
function deleteBatch(id) { if (!confirm("Are you sure?")) return; db.batches = db.batches.filter(x => x.id !== id); save(); render(); }
function renderBatchTable() { const box = byId("batchTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Buy</th><th>Sell</th><th></th></tr></thead><tbody>${db.batches.map(b => { const m = med(b.medicineId) || {}; return `<tr><td>${esc(m.name || "")}</td><td>${esc(b.batchNo)}</td><td>${esc(b.expiryDate)}</td><td>${b.quantity}</td><td>${money(b.buyPrice)}</td><td>${money(b.sellPrice)}</td><td><button class="red" onclick="deleteBatch('${b.id}')">Delete</button></td></tr>`; }).join("")}</tbody></table></div>`; }

function purchasesHtml() { return `<div class="card"><h2>Purchases</h2><p class="muted">To add purchase stock, use Stock & Expiry and create a new batch.</p></div>`; }

function suppliersHtml() { return `<div class="card"><h2>Add Supplier</h2><div class="grid two"><div><label>Name</label><input id="sName"></div><div><label>Phone</label><input id="sPhone"></div><div><label>Address</label><input id="sAddress"></div><div><label>Note</label><input id="sNote"></div></div><button onclick="addSupplier()" style="margin-top:12px">Add</button></div><div class="card" style="margin-top:14px"><h2>Suppliers</h2><div id="supplierTable"></div></div>`; }
function addSupplier() { const name = byId("sName").value.trim(); if (!name) return alert("Enter name"); db.suppliers.push({ id: uid("S"), name, phone: byId("sPhone").value.trim(), address: byId("sAddress").value.trim(), note: byId("sNote").value.trim() }); save(); render(); }
function deleteSupplier(id) { if (!confirm("Are you sure?")) return; db.suppliers = db.suppliers.filter(x => x.id !== id); save(); render(); }
function renderSupplierTable() { const box = byId("supplierTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th></th></tr></thead><tbody>${db.suppliers.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone)}</td><td>${esc(s.address)}</td><td><button class="red" onclick="deleteSupplier('${s.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`; }

function customersHtml() { return `<div class="card"><h2>Add Customer</h2><div class="grid two"><div><label>Name</label><input id="cName"></div><div><label>Phone</label><input id="cPhone"></div><div><label>Address</label><input id="cAddress"></div></div><button onclick="addCustomer()" style="margin-top:12px">Add</button></div><div class="card" style="margin-top:14px"><h2>Customers</h2><div id="customerTable"></div></div>`; }
function addCustomer() { const name = byId("cName").value.trim(); if (!name) return alert("Enter name"); db.customers.push({ id: uid("C"), name, phone: byId("cPhone").value.trim(), address: byId("cAddress").value.trim() }); save(); render(); }
function deleteCustomer(id) { if (!confirm("Are you sure?")) return; db.customers = db.customers.filter(x => x.id !== id); save(); render(); }
function renderCustomerTable() { const box = byId("customerTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th></th></tr></thead><tbody>${db.customers.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td><button class="red" onclick="deleteCustomer('${c.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`; }

function prescriptionsHtml() { return `<div class="card"><h2>Prescriptions</h2><p class="muted">Medicines that require prescription are listed here.</p><div class="tablewrap"><table><thead><tr><th>Code</th><th>Medicine</th><th>Scientific Name</th></tr></thead><tbody>${db.medicines.filter(m => m.requiresPrescription).map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${esc(m.scientificName)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">No items</td></tr>'}</tbody></table></div></div>`; }

function expensesHtml() { return `<div class="card"><h2>Expenses</h2><div class="grid two"><div><label>Title</label><input id="eTitle"></div><div><label>Amount</label><input id="eAmount" type="number"></div></div><button onclick="addExpense()" style="margin-top:12px">Add</button></div><div class="card" style="margin-top:14px"><h2>Expense List</h2><div id="expenseTable"></div></div>`; }
function addExpense() { const title = byId("eTitle").value.trim(); const amount = Number(byId("eAmount").value || 0); if (!title || !amount) return alert("Fill the fields"); db.expenses.push({ id: uid("E"), date: new Date().toISOString(), title, amount }); save(); render(); }
function deleteExpense(id) { if (!confirm("Are you sure?")) return; db.expenses = db.expenses.filter(x => x.id !== id); save(); render(); }
function renderExpenseTable() { const box = byId("expenseTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Title</th><th>Amount</th><th></th></tr></thead><tbody>${db.expenses.map(e => `<tr><td>${dateStr(e.date)}</td><td>${esc(e.title)}</td><td>${money(e.amount)}</td><td><button class="red" onclick="deleteExpense('${e.id}')">Delete</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">No expenses</td></tr>'}</tbody></table></div>`; }

function reportsHtml() {
  const totalSales = db.sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const totalProfit = db.sales.reduce((s, x) => s + Number(x.profit || 0), 0);
  const totalExpenses = db.expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const net = totalProfit - totalExpenses;
  return `<div class="grid four"><div class="card"><div class="muted">Total Sales</div><div class="kpi">${money(totalSales)}</div></div><div class="card"><div class="muted">Total Profit</div><div class="kpi">${money(totalProfit)}</div></div><div class="card"><div class="muted">Expenses</div><div class="kpi">${money(totalExpenses)}</div></div><div class="card"><div class="muted">Net Profit</div><div class="kpi">${money(net)}</div></div></div><div class="card" style="margin-top:14px"><h2>All Sales</h2>${salesTable(1000)}</div>`;
}

function settingsHtml() { return `<div class="card"><h2>Settings</h2><label>Pharmacy Name</label><input id="setName" value="${esc(db.settings.pharmacyName)}"><label>Phone</label><input id="setPhone" value="${esc(db.settings.phone)}"><label>Address</label><input id="setAddress" value="${esc(db.settings.address)}"><label>Receipt Note</label><input id="setNote" value="${esc(db.settings.receiptNote)}"><button onclick="saveSettings()" style="margin-top:12px">Save</button><button class="red" onclick="resetData()" style="margin-top:12px">Reset Data</button></div>`; }
function saveSettings() { db.settings.pharmacyName = byId("setName").value.trim(); db.settings.phone = byId("setPhone").value.trim(); db.settings.address = byId("setAddress").value.trim(); db.settings.receiptNote = byId("setNote").value.trim(); save(); render(); }
function resetData() { if (!confirm("Are you sure? All data will be deleted.")) return; db = clone(DEFAULT); state.cart = []; save(); render(); }

render();
