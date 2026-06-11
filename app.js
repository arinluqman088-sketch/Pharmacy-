const LS = "AR_PHARMACY_POS_V1";

const DEFAULT = {
  settings: {
    pharmacyName: "AR Pharmacy POS",
    phone: "0773 214 1551",
    address: "Sulaymaniyah",
    receiptNote: "سوپاس بۆ کڕینتان"
  },
  suppliers: [
    { id: "S1", name: "دابینکەری سەرەکی", phone: "0770 000 0000", address: "Sulaymaniyah", note: "" }
  ],
  customers: [
    { id: "C1", name: "کڕیاری ئاسایی", phone: "", address: "" }
  ],
  medicines: [
    { id: "M1", code: "M001", barcode: "1000001", name: "Paracetamol 500mg", scientificName: "Paracetamol", category: "Painkiller", company: "Generic", unit: "box", sellPrice: 2000, buyPrice: 1200, minStock: 10, requiresPrescription: false },
    { id: "M2", code: "M002", barcode: "1000002", name: "Amoxicillin 500mg", scientificName: "Amoxicillin", category: "Antibiotic", company: "Generic", unit: "box", sellPrice: 5000, buyPrice: 3200, minStock: 8, requiresPrescription: true },
    { id: "M3", code: "M003", barcode: "1000003", name: "Vitamin C", scientificName: "Ascorbic Acid", category: "Vitamin", company: "Generic", unit: "box", sellPrice: 3000, buyPrice: 1800, minStock: 10, requiresPrescription: false }
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
      <div class="login card" dir="rtl">
        <div class="logo">PH</div>
        <h2>چوونەژوورەوە</h2>
        <p class="muted">AR Pharmacy POS</p>
        <div class="notice">سیستەمی بەڕێوەبردنی دەرمانخانە، کاشێر، ستۆک، بەرواری بەسەرچوون و ڕاپۆرت</div>
        <label>Email</label>
        <input id="loginUser" placeholder="Email" autocomplete="email" dir="ltr">
        <label>Password</label>
        <input id="loginPass" type="password" placeholder="Password" dir="ltr">
        <button onclick="login()" style="margin-top:12px">چوونەژوورەوە</button>
        <p class="small muted">بە Firebase Email و Password بچۆ ژوورەوە.</p>
      </div>
    `;
    return;
  }

  app.innerHTML = `
    <div class="app" dir="rtl">
      <div class="topbar">
        <div class="brand">
          <span class="brandmark">PH</span>
          ${esc(db.settings.pharmacyName)}
          <span class="badge blue">${esc(state.role)}</span>
        </div>
        <div class="actions">
          <span class="badge">${new Date().toLocaleDateString()}</span>
          <button class="secondary" onclick="logout()">چوونەدەرەوە</button>
        </div>
      </div>

      <div class="layout">
        <div class="sidebar">
          ${nav("dashboard", "داشبۆرد")}
          ${nav("pos", "فرۆشتن / POS")}
          ${nav("medicines", "دەرمانەکان")}
          ${nav("batches", "کۆگا و بەسەرچوون")}
          ${nav("purchases", "کڕین")}
          ${nav("suppliers", "دابینکەران")}
          ${nav("customers", "کڕیاران")}
          ${nav("prescriptions", "ڕەچەتەکان")}
          ${nav("expenses", "مەسروفات")}
          ${nav("reports", "ڕاپۆرت")}
          ${nav("settings", "ڕێکخستن")}
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
      alert("Firebase ئامادە نییە");
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
    alert("هەڵە: " + (err.code || err.message || String(err)));
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
      <div class="card"><div class="muted">فرۆشتنی ئەمڕۆ</div><div class="kpi">${money(todayTotal)}</div></div>
      <div class="card"><div class="muted">قازانجی ئەمڕۆ</div><div class="kpi">${money(profitToday)}</div></div>
      <div class="card"><div class="muted">فرۆشتنی مانگ</div><div class="kpi">${money(monthTotal)}</div></div>
      <div class="card"><div class="muted">ئاگاداری</div><div class="kpi">${low + exp}</div></div>
    </div>

    <div class="grid two" style="margin-top:14px">
      <div class="card"><h2>ستۆکی کەم</h2>${lowStockTable()}</div>
      <div class="card"><h2>بەسەرچوون نزیک</h2>${expiryTable()}</div>
    </div>

    <div class="card" style="margin-top:14px">
      <h2>دوایین فرۆشتنەکان</h2>
      ${salesTable(12)}
    </div>
  `;
}

function lowStockTable() {
  const rows = db.medicines
    .filter(m => totalStock(m.id) <= Number(m.minStock || 0))
    .map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${totalStock(m.id)}</td><td>${m.minStock}</td></tr>`)
    .join("");

  return `
    <div class="tablewrap">
      <table>
        <thead><tr><th>کۆد</th><th>دەرمان</th><th>ستۆک</th><th>ئاگاداری</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="muted">هیچ دەرمانێک کەم نییە</td></tr>'}</tbody>
      </table>
    </div>
  `;
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

  return `
    <div class="tablewrap">
      <table>
        <thead><tr><th>دەرمان</th><th>Batch</th><th>بەسەرچوون</th><th>ڕۆژ</th><th>دانە</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">هیچ بەسەرچوونێکی نزیک نییە</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function posHtml() {
  if (!canSell()) return `<div class="card"><h2>ڕێگەپێنەدراوە</h2></div>`;

  const subtotal = state.cart.reduce((s, i) => s + i.qty * i.sellPrice, 0);
  const discount = Number(byId("discount")?.value || 0);
  const total = Math.max(0, subtotal - discount);

  return `
    <div class="grid two">
      <div class="card">
        <h2>فرۆشتن / POS</h2>
        <div class="row">
          <input id="posSearch" placeholder="گەڕان بە ناو، کۆد یان بارکۆد..." oninput="renderMedGrid()">
          <button class="secondary" onclick="byId('posSearch').value='';renderMedGrid()">پاک</button>
        </div>
        <div class="actions" style="margin-top:10px">
          <button class="secondary" onclick="state.selectedCategory='';renderMedGrid()">هەموو</button>
          ${[...new Set(db.medicines.map(x => x.category || "Other"))].map(c => `<button class="secondary" onclick="state.selectedCategory='${esc(c)}';renderMedGrid()">${esc(c)}</button>`).join("")}
        </div>
        <div id="medGrid" class="medicine-grid"></div>
      </div>

      <div class="card">
        <h2>سەبەتە</h2>
        <label>کڕیار</label>
        <select id="saleCustomer">
          ${db.customers.map(c => `<option value="${c.id}">${esc(c.name)}${c.phone ? " - " + esc(c.phone) : ""}</option>`).join("")}
        </select>

        <div class="tablewrap" style="margin-top:12px">
          <table>
            <thead><tr><th>دەرمان</th><th>Batch</th><th>دانە</th><th>کۆ</th><th></th></tr></thead>
            <tbody>
              ${state.cart.map((i, idx) => `
                <tr>
                  <td>${esc(i.name)}</td>
                  <td>${esc(i.batchNo)}</td>
                  <td><input type="number" min="1" max="${i.available}" value="${i.qty}" style="width:75px" onchange="setCartQty(${idx},this.value)"></td>
                  <td>${money(i.qty * i.sellPrice)}</td>
                  <td><button class="red" onclick="removeCart(${idx})">X</button></td>
                </tr>
              `).join("") || '<tr><td colspan="5" class="muted">سەبەتە بەتاڵە</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="row">
          <div><label>داشکاندن</label><input id="discount" type="number" value="0" oninput="render()"></div>
          <div><label>پارەی وەرگیراو</label><input id="paid" type="number" value="${total}"></div>
        </div>

        <div class="kpi">${money(total)}</div>
        <div class="actions" style="margin-top:12px">
          <button class="green" onclick="checkout()">فرۆشتن و چاپ</button>
          <button class="secondary" onclick="clearCart()">پاککردنەوە</button>
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
    (
      String(m.name).toLowerCase().includes(q) ||
      String(m.code).toLowerCase().includes(q) ||
      String(m.barcode || "").includes(q)
    )
  );

  box.innerHTML = items.map(m => `
    <button class="medbtn" onclick="addToCart('${m.id}')">
      <b>${esc(m.name)}</b>
      <span>${esc(m.code)} / ${esc(m.category)}</span>
      <span>Stock: ${totalStock(m.id)}</span>
      <strong>${money(m.sellPrice)}</strong>
      ${m.requiresPrescription ? '<span class="badge amber">ڕەچەتە پێویستە</span>' : ""}
    </button>
  `).join("");
}

function addToCart(mid) {
  const m = med(mid);
  if (!m) return;

  const batches = validBatches(mid);
  if (!batches.length) return alert("ئەم دەرمانە ستۆکی نییە");

  const b = batches[0];
  const ex = state.cart.find(x => x.batchId === b.id);

  if (ex) {
    if (ex.qty + 1 > Number(b.quantity)) return alert("ستۆک بەس نییە");
    ex.qty++;
  } else {
    state.cart.push({
      medicineId: m.id,
      batchId: b.id,
      batchNo: b.batchNo,
      name: m.name,
      qty: 1,
      available: Number(b.quantity),
      sellPrice: Number(b.sellPrice || m.sellPrice),
      buyPrice: Number(b.buyPrice || m.buyPrice)
    });
  }
  render();
}

function setCartQty(idx, v) {
  const i = state.cart[idx];
  if (!i) return;
  i.qty = Math.max(1, Math.min(Number(i.available), Number(v || 1)));
  render();
}

function removeCart(idx) { state.cart.splice(idx, 1); render(); }
function clearCart() { state.cart = []; render(); }

function checkout() {
  if (!state.cart.length) return alert("سەبەتە بەتاڵە");

  const subtotal = state.cart.reduce((s, i) => s + i.qty * i.sellPrice, 0);
  const discount = Number(byId("discount")?.value || 0);
  const total = Math.max(0, subtotal - discount);
  const paid = Number(byId("paid")?.value || 0);
  const change = paid - total;

  if (paid < total) return alert("پارەی وەرگیراو کەمە");

  const saleId = uid("SA");
  const sale = { id: saleId, date: new Date().toISOString(), customerId: byId("saleCustomer").value, subtotal, discount, total, paid, change, profit: 0, user: state.username };

  for (const item of state.cart) {
    const b = batch(item.batchId);
    if (!b || Number(b.quantity) < item.qty) return alert("ستۆک بەس نییە");

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

  const html = `
    <div style="font-family:Arial;padding:12px;direction:rtl">
      <h2>${esc(db.settings.pharmacyName)}</h2>
      <p>${esc(db.settings.address)}<br>${esc(db.settings.phone)}</p>
      <hr>
      <p>ژمارەی وەسل: ${sale.id}</p>
      <p>کڕیار: ${esc(c.name || "")}</p>
      <p>بەروار: ${dateStr(sale.date)}</p>
      <table style="width:100%;border-collapse:collapse" border="1">
        <thead><tr><th>دەرمان</th><th>دانە</th><th>نرخ</th><th>کۆ</th></tr></thead>
        <tbody>${items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.sellPrice)}</td><td>${money(i.total)}</td></tr>`).join("")}</tbody>
      </table>
      <h3>کۆی گشتی: ${money(sale.total)}</h3>
      <p>${esc(db.settings.receiptNote)}</p>
    </div>
  `;

  const w = window.open("", "_blank");
  if (!w) return alert("Popup ڕێگەپێنەدراوە");
  w.document.write(html);
  w.document.close();
  w.print();
}

function salesTable(limit = 50) {
  const rows = [...db.sales]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit)
    .map(s => {
      const c = customer(s.customerId) || {};
      return `<tr><td>${dateStr(s.date)}</td><td>${esc(c.name || "")}</td><td>${money(s.total)}</td><td>${money(s.profit)}</td><td>${esc(s.user || "")}</td></tr>`;
    })
    .join("");

  return `
    <div class="tablewrap">
      <table>
        <thead><tr><th>بەروار</th><th>کڕیار</th><th>کۆ</th><th>قازانج</th><th>User</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">هیچ فرۆشتنێک نییە</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

function medicinesHtml() {
  if (!canManage()) return `<div class="card"><h2>ڕێگەپێنەدراوە</h2></div>`;

  return `
    <div class="card">
      <h2>زیادکردنی دەرمان</h2>
      <div class="grid two">
        <div><label>کۆد</label><input id="mCode" placeholder="M004"></div>
        <div><label>بارکۆد</label><input id="mBarcode"></div>
        <div><label>ناو</label><input id="mName"></div>
        <div><label>ناوی زانستی</label><input id="mScientific"></div>
        <div><label>جۆر</label><input id="mCategory"></div>
        <div><label>کۆمپانیا</label><input id="mCompany"></div>
        <div><label>یەکە</label><input id="mUnit" value="box"></div>
        <div><label>نرخی فرۆشتن</label><input id="mSell" type="number"></div>
        <div><label>نرخی کڕین</label><input id="mBuy" type="number"></div>
        <div><label>ئاگاداری ستۆک</label><input id="mMin" type="number" value="5"></div>
      </div>
      <label><input id="mPrescription" type="checkbox"> ڕەچەتە پێویستە</label>
      <button onclick="addMedicine()" style="margin-top:12px">زیادکردن</button>
    </div>
    <div class="card" style="margin-top:14px">
      <h2>دەرمانەکان</h2>
      <div id="medicineTable"></div>
    </div>
  `;
}

function addMedicine() {
  const name = byId("mName").value.trim();
  if (!name) return alert("ناوی دەرمان بنووسە");

  db.medicines.push({ id: uid("M"), code: byId("mCode").value.trim() || uid("C"), barcode: byId("mBarcode").value.trim(), name, scientificName: byId("mScientific").value.trim(), category: byId("mCategory").value.trim() || "Other", company: byId("mCompany").value.trim(), unit: byId("mUnit").value.trim() || "box", sellPrice: Number(byId("mSell").value || 0), buyPrice: Number(byId("mBuy").value || 0), minStock: Number(byId("mMin").value || 0), requiresPrescription: byId("mPrescription").checked });

  save();
  render();
}

function deleteMedicine(id) {
  if (!confirm("دڵنیایت؟")) return;
  db.medicines = db.medicines.filter(x => x.id !== id);
  db.batches = db.batches.filter(x => x.medicineId !== id);
  save();
  render();
}

function renderMedicineTable() {
  const box = byId("medicineTable");
  if (!box) return;
  box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>کۆد</th><th>ناو</th><th>جۆر</th><th>ستۆک</th><th>نرخ</th><th></th></tr></thead><tbody>${db.medicines.map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${esc(m.category)}</td><td>${totalStock(m.id)}</td><td>${money(m.sellPrice)}</td><td><button class="red" onclick="deleteMedicine('${m.id}')">سڕینەوە</button></td></tr>`).join("")}</tbody></table></div>`;
}

function batchesHtml() {
  if (!canManage()) return `<div class="card"><h2>ڕێگەپێنەدراوە</h2></div>`;

  return `
    <div class="card">
      <h2>زیادکردنی Batch / ستۆک</h2>
      <div class="grid two">
        <div><label>دەرمان</label><select id="bMed">${db.medicines.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></div>
        <div><label>Batch No</label><input id="bNo"></div>
        <div><label>Expiry Date</label><input id="bExp" type="date"></div>
        <div><label>Quantity</label><input id="bQty" type="number"></div>
        <div><label>Buy Price</label><input id="bBuy" type="number"></div>
        <div><label>Sell Price</label><input id="bSell" type="number"></div>
      </div>
      <button onclick="addBatch()" style="margin-top:12px">زیادکردن</button>
    </div>
    <div class="card" style="margin-top:14px">
      <h2>کۆگا</h2>
      <div id="batchTable"></div>
    </div>
  `;
}

function addBatch() {
  const medicineId = byId("bMed").value;
  const m = med(medicineId);
  db.batches.push({ id: uid("B"), medicineId, batchNo: byId("bNo").value.trim() || uid("B"), expiryDate: byId("bExp").value || today(), quantity: Number(byId("bQty").value || 0), buyPrice: Number(byId("bBuy").value || m.buyPrice || 0), sellPrice: Number(byId("bSell").value || m.sellPrice || 0) });
  save();
  render();
}

function deleteBatch(id) {
  if (!confirm("دڵنیایت؟")) return;
  db.batches = db.batches.filter(x => x.id !== id);
  save();
  render();
}

function renderBatchTable() {
  const box = byId("batchTable");
  if (!box) return;
  box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>دەرمان</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Buy</th><th>Sell</th><th></th></tr></thead><tbody>${db.batches.map(b => { const m = med(b.medicineId) || {}; return `<tr><td>${esc(m.name || "")}</td><td>${esc(b.batchNo)}</td><td>${esc(b.expiryDate)}</td><td>${b.quantity}</td><td>${money(b.buyPrice)}</td><td>${money(b.sellPrice)}</td><td><button class="red" onclick="deleteBatch('${b.id}')">سڕینەوە</button></td></tr>`; }).join("")}</tbody></table></div>`;
}

function purchasesHtml() { return `<div class="card"><h2>کڕین</h2><p class="muted">بۆ کڕین، لە بەشی کۆگا و Batch ستۆک زیاد بکە.</p></div>`; }

function suppliersHtml() {
  return `
    <div class="card">
      <h2>زیادکردنی دابینکەر</h2>
      <div class="grid two">
        <div><label>ناو</label><input id="sName"></div>
        <div><label>مۆبایل</label><input id="sPhone"></div>
        <div><label>ناونیشان</label><input id="sAddress"></div>
        <div><label>تێبینی</label><input id="sNote"></div>
      </div>
      <button onclick="addSupplier()" style="margin-top:12px">زیادکردن</button>
    </div>
    <div class="card" style="margin-top:14px"><h2>دابینکەران</h2><div id="supplierTable"></div></div>
  `;
}

function addSupplier() {
  const name = byId("sName").value.trim();
  if (!name) return alert("ناو بنووسە");
  db.suppliers.push({ id: uid("S"), name, phone: byId("sPhone").value.trim(), address: byId("sAddress").value.trim(), note: byId("sNote").value.trim() });
  save();
  render();
}

function deleteSupplier(id) { if (!confirm("دڵنیایت؟")) return; db.suppliers = db.suppliers.filter(x => x.id !== id); save(); render(); }
function renderSupplierTable() { const box = byId("supplierTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>ناو</th><th>مۆبایل</th><th>ناونیشان</th><th></th></tr></thead><tbody>${db.suppliers.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone)}</td><td>${esc(s.address)}</td><td><button class="red" onclick="deleteSupplier('${s.id}')">سڕینەوە</button></td></tr>`).join("")}</tbody></table></div>`; }

function customersHtml() {
  return `
    <div class="card">
      <h2>زیادکردنی کڕیار</h2>
      <div class="grid two">
        <div><label>ناو</label><input id="cName"></div>
        <div><label>مۆبایل</label><input id="cPhone"></div>
        <div><label>ناونیشان</label><input id="cAddress"></div>
      </div>
      <button onclick="addCustomer()" style="margin-top:12px">زیادکردن</button>
    </div>
    <div class="card" style="margin-top:14px"><h2>کڕیاران</h2><div id="customerTable"></div></div>
  `;
}

function addCustomer() { const name = byId("cName").value.trim(); if (!name) return alert("ناو بنووسە"); db.customers.push({ id: uid("C"), name, phone: byId("cPhone").value.trim(), address: byId("cAddress").value.trim() }); save(); render(); }
function deleteCustomer(id) { if (!confirm("دڵنیایت؟")) return; db.customers = db.customers.filter(x => x.id !== id); save(); render(); }
function renderCustomerTable() { const box = byId("customerTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>ناو</th><th>مۆبایل</th><th>ناونیشان</th><th></th></tr></thead><tbody>${db.customers.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td><button class="red" onclick="deleteCustomer('${c.id}')">سڕینەوە</button></td></tr>`).join("")}</tbody></table></div>`; }

function prescriptionsHtml() {
  return `<div class="card"><h2>ڕەچەتەکان</h2><p class="muted">ئەو دەرمانانەی ڕەچەتەیان پێویستە لە دەرمانەکان دیاری بکە.</p><div class="tablewrap"><table><thead><tr><th>کۆد</th><th>دەرمان</th><th>ناوی زانستی</th></tr></thead><tbody>${db.medicines.filter(m => m.requiresPrescription).map(m => `<tr><td>${esc(m.code)}</td><td>${esc(m.name)}</td><td>${esc(m.scientificName)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">هیچ دەرمانێک نییە</td></tr>'}</tbody></table></div></div>`;
}

function expensesHtml() {
  return `
    <div class="card"><h2>مەسروفات</h2><div class="grid two"><div><label>ناونیشان</label><input id="eTitle"></div><div><label>بڕی پارە</label><input id="eAmount" type="number"></div></div><button onclick="addExpense()" style="margin-top:12px">زیادکردن</button></div>
    <div class="card" style="margin-top:14px"><h2>لیستی مەسروفات</h2><div id="expenseTable"></div></div>
  `;
}

function addExpense() { const title = byId("eTitle").value.trim(); const amount = Number(byId("eAmount").value || 0); if (!title || !amount) return alert("زانیاری پڕ بکەوە"); db.expenses.push({ id: uid("E"), date: new Date().toISOString(), title, amount }); save(); render(); }
function deleteExpense(id) { if (!confirm("دڵنیایت؟")) return; db.expenses = db.expenses.filter(x => x.id !== id); save(); render(); }
function renderExpenseTable() { const box = byId("expenseTable"); if (!box) return; box.innerHTML = `<div class="tablewrap"><table><thead><tr><th>بەروار</th><th>ناونیشان</th><th>بڕ</th><th></th></tr></thead><tbody>${db.expenses.map(e => `<tr><td>${dateStr(e.date)}</td><td>${esc(e.title)}</td><td>${money(e.amount)}</td><td><button class="red" onclick="deleteExpense('${e.id}')">سڕینەوە</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">هیچ مەسروفێک نییە</td></tr>'}</tbody></table></div>`; }

function reportsHtml() {
  const totalSales = db.sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const totalProfit = db.sales.reduce((s, x) => s + Number(x.profit || 0), 0);
  const totalExpenses = db.expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const net = totalProfit - totalExpenses;

  return `<div class="grid four"><div class="card"><div class="muted">هەموو فرۆشتن</div><div class="kpi">${money(totalSales)}</div></div><div class="card"><div class="muted">هەموو قازانج</div><div class="kpi">${money(totalProfit)}</div></div><div class="card"><div class="muted">مەسروفات</div><div class="kpi">${money(totalExpenses)}</div></div><div class="card"><div class="muted">قازانجی پاک</div><div class="kpi">${money(net)}</div></div></div><div class="card" style="margin-top:14px"><h2>هەموو فرۆشتنەکان</h2>${salesTable(1000)}</div>`;
}

function settingsHtml() {
  return `<div class="card"><h2>ڕێکخستن</h2><label>ناوی دەرمانخانە</label><input id="setName" value="${esc(db.settings.pharmacyName)}"><label>مۆبایل</label><input id="setPhone" value="${esc(db.settings.phone)}"><label>ناونیشان</label><input id="setAddress" value="${esc(db.settings.address)}"><label>تێبینی وەسل</label><input id="setNote" value="${esc(db.settings.receiptNote)}"><button onclick="saveSettings()" style="margin-top:12px">پاشەکەوتکردن</button><button class="red" onclick="resetData()" style="margin-top:12px">ڕیسێتکردنی داتا</button></div>`;
}

function saveSettings() {
  db.settings.pharmacyName = byId("setName").value.trim();
  db.settings.phone = byId("setPhone").value.trim();
  db.settings.address = byId("setAddress").value.trim();
  db.settings.receiptNote = byId("setNote").value.trim();
  save();
  render();
}

function resetData() {
  if (!confirm("دڵنیایت؟ هەموو داتا دەسڕدرێتەوە")) return;
  db = clone(DEFAULT);
  state.cart = [];
  save();
  render();
}

render();
