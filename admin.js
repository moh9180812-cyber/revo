// لوحة صاحب المتجر: عرض الطلبات وتصديرها CSV.
const $ = (id) => document.getElementById(id);
let orders = [];
let token = null;

const STATUSES = { new: "جديد", shipped: "اتشحن", delivered: "اتسلّم", canceled: "ملغي" };
const itemsText = (o) => o.items.map((i) => `${i.name} x${i.qty}`).join(" + ");

function render() {
  $("count").textContent = `${orders.length} طلب`;
  $("rows").innerHTML = orders.map((o) => `
    <tr>
      <td>${new Date(o.created_at).toLocaleString("ar-EG")}</td>
      <td>${esc(o.customer_name)}</td><td>${esc(o.phone)}</td><td>${esc(o.city)}</td>
      <td>${esc(o.address)}${o.notes ? "<br><small>" + esc(o.notes) + "</small>" : ""}</td>
      <td>${esc(itemsText(o))}</td><td>${o.total}</td>
      <td><select onchange="changeStatus('${o.id}', this.value)">
        ${Object.entries(STATUSES).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}
      </select></td>
      <td><button onclick="showLabel('${o.id}')">بوليصة</button></td>
    </tr>`).join("");
}
// نمنع أي HTML جاي من بيانات الزبون
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// توكن صالح دايمًا (بيتجدد لوحده). لو الشهر خلص بيطلب دخول تاني.
async function tk() {
  token = await getToken();
  if (!token) { alert("انتهت الجلسة، سجّل دخول تاني."); location.reload(); throw new Error("no session"); }
  return token;
}
async function changeStatus(id, status) { await setStatus(await tk(), id, status); const o = orders.find((x) => x.id === id); if (o) o.status = status; loadProductsTab(true); }

async function show() {
  // الصفحة دي لصاحب المتجر بس (السيرفر بيتأكد، والداتا نفسها محمية بصلاحيات Supabase)
  if (HAS_DB && !(await isOwner(token))) {
    $("login-err").innerHTML = '<div class="err">الحساب ده مش صاحب المتجر.</div>';
    token = null; $("login").classList.remove("hidden"); return;
  }
  try { orders = await loadOrders(token); } catch (e) { alert(e.message); return; }
  $("login").classList.add("hidden");
  $("panel").classList.remove("hidden");
  $("logout-admin").classList.toggle("hidden", !HAS_DB);
  render();
  loadProductsTab(true);
}

// تصدير CSV (BOM عشان إكسل يقرا العربي صح)
$("csv").onclick = () => {
  const head = ["التاريخ", "الاسم", "الموبايل", "المدينة", "العنوان", "ملاحظات", "المنتجات", "الكوبون", "الخصم", "الإجمالي (الدفع عند الاستلام)", "الحالة"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = orders.map((o) => [o.created_at, o.customer_name, o.phone, o.city, o.address, o.notes, itemsText(o), o.coupon_code || "", o.discount || 0, o.total, o.status].map(q).join(","));
  const blob = new Blob(["\ufeff" + [head.map(q).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, "orders.csv");
};

$("login").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await signIn(f.get("email"), f.get("password")); token = await getToken(); show(); }
  catch (err) { $("login-err").innerHTML = `<div class="err">${err.message}</div>`; }
};

// الدخول بيفضل محفوظ شهر: لو فيه جلسة صالحة بندخل على طول
$("logout-admin").onclick = () => { signOut(); location.reload(); };
(async () => {
  if (!HAS_DB) return show(); // وضع تجريبي بدون دخول
  token = await getToken();
  if (token) show(); else $("login").classList.remove("hidden");
})();

// ===== تصدير Excel (مكتبة ExcelJS من CDN، كله في المتصفح) =====
// تحميل المكتبات وقت الاستخدام، ولو CDN مش شغال بنجرب التاني
const LIBS = {
  ExcelJS: ["https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js", "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js", "https://unpkg.com/exceljs@4.4.0/dist/exceljs.min.js"],
  html2canvas: ["https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js", "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"],
};
function loadScript(src) {
  return new Promise((ok, no) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = () => no(new Error("load " + src));
    document.head.appendChild(s);
  });
}
async function needLib(name) {
  if (window[name]) return;
  for (const src of LIBS[name]) { try { await loadScript(src); if (window[name]) return; } catch (e) {} }
  throw new Error("مش قادر يحمّل مكتبة " + name + ". اتأكد من النت وجرب تاني، أو استخدم تصدير CSV.");
}
function say(t) { $("msg").textContent = t || ""; }
// تنزيل ملف: بنحط الرابط في الصفحة الأول عشان موبايل كروم يقبله
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 15000);
}
const fmtDate = (d) => { const x = new Date(d), p = (n) => String(n).padStart(2, "0"); return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`; };

$("xlsx").onclick = async () => {
 say("جاري تجهيز ملف Excel...");
 try {
  await needLib("ExcelJS");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("الطلبات", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "التاريخ", key: "d", width: 20 }, { header: "الاسم", key: "n", width: 22 },
    { header: "الموبايل", key: "p", width: 16 }, { header: "المدينة", key: "c", width: 16 },
    { header: "العنوان", key: "a", width: 40 }, { header: "ملاحظات", key: "t", width: 24 },
    { header: "المنتجات", key: "i", width: 44 }, { header: "الكوبون", key: "cp", width: 14 }, { header: "الخصم", key: "dc", width: 10 },
    { header: "الإجمالي (الدفع عند الاستلام)", key: "s", width: 18 },
    { header: "الحالة", key: "st", width: 12 },
  ];
  orders.forEach((o) => ws.addRow({
    d: fmtDate(o.created_at), n: o.customer_name, p: String(o.phone ?? ""), c: o.city,
    a: o.address, t: o.notes || "", i: o.items.map((i) => `${i.name} × ${i.qty}`).join("\n"),
    cp: o.coupon_code || "", dc: Number(o.discount) || 0, s: Number(o.total), st: STATUSES[o.status] || o.status,
  }));
  const total = ws.addRow({ n: "الإجمالي", s: orders.reduce((x, o) => x + Number(o.total || 0), 0) });
  const thin = { style: "thin", color: { argb: "FFBBBBBB" } };
  ws.eachRow((row, r) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true, readingOrder: "rtl" };
      cell.border = { top: thin, left: thin, bottom: thin, right: thin };
      if (r === 1) { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7A2E4A" } }; }
    });
  });
  total.font = { bold: true };
  total.eachCell({ includeEmpty: true }, (c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E6EC" } }; });
  ws.getColumn("s").numFmt = "#,##0";
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "orders.xlsx");
  say("");
 } catch (e) { say(e.message); alert(e.message); }
};

// ===== بوليصة شحن لكل طلب: طباعة أو حفظ كصورة =====
let labelOrder = null;
function showLabel(id) {
  const o = orders.find((x) => x.id === id);
  if (!o) return;
  labelOrder = o;
  $("label-card").innerHTML = `
    <h2>${CONFIG.STORE_NAME} | طلب شحن</h2>
    <div class="row big">${esc(o.customer_name)}</div>
    <div class="row">📞 ${esc(o.phone)}</div>
    <div class="row">📍 ${esc(o.city)} - ${esc(o.address)}</div>
    ${o.notes ? `<div class="row">ملاحظات: ${esc(o.notes)}</div>` : ""}
    <div class="row">📦 ${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join("<br>")}</div>
    <div class="row"><small>${new Date(o.created_at).toLocaleString("ar-EG")} | رقم: ${esc(String(o.id).slice(0, 8))}</small></div>
    ${Number(o.discount) > 0 ? `<div class="row">🏷️ كوبون ${esc(o.coupon_code || "")}: -${o.discount} ${CONFIG.CURRENCY}</div>` : ""}
    <div class="cod">المطلوب تحصيله: ${o.total} ${CONFIG.CURRENCY}</div>`;
  $("label-modal").classList.remove("hidden");
}
$("lbl-close").onclick = () => $("label-modal").classList.add("hidden");
$("lbl-print").onclick = () => window.print();
$("lbl-img").onclick = async () => {
  try {
    await needLib("html2canvas");
    const canvas = await html2canvas($("label-card"), { scale: 2, backgroundColor: "#fff" });
    canvas.toBlob((b) => saveBlob(b, `label-${String(labelOrder.id).slice(0, 8)}.png`), "image/png");
  } catch (e) { alert(e.message); }
};

// اسم المتجر في الصفحة
document.getElementById("admin-title").textContent = `لوحة الطلبات | ${CONFIG.STORE_NAME}`;


// ===== التابات =====
function tab(name) {
  for (const t of ["orders", "products", "coupons"]) {
    $("tab-" + t).classList.toggle("hidden", t !== name);
    $("t-" + t).classList.toggle("on", t === name);
  }
  if (name === "products") loadProductsTab();
  if (name === "coupons") loadCouponsTab();
}
$("t-orders").onclick = () => tab("orders");
$("t-products").onclick = () => tab("products");
$("t-coupons").onclick = () => tab("coupons");

// ===== المنتجات =====
let products = [];
const LOW = 5;
async function loadProductsTab(quiet) {
  if (!HAS_DB) return;
  try { products = await adminLoadProducts(await tk()); } catch (e) { if (!quiet) alert(e.message); return; }
  renderProducts();
}
function stockPill(p) {
  if (p.stock <= 0) return `<span class="pill p-out">نفذ</span>`;
  if (p.stock <= LOW) return `<span class="pill p-low">منخفض (${p.stock})</span>`;
  return `<span class="pill p-ok">${p.stock}</span>`;
}
function renderProducts() {
  $("p-count").textContent = `${products.length} منتج`;
  const low = products.filter((p) => p.active && p.stock <= LOW);
  $("stock-warn").innerHTML = low.length ? `<div class="warnbox">⚠️ مخزون منخفض أو خلصان: ${low.map((p) => `${esc(p.name)} (${p.stock})`).join("، ")}</div>` : "";
  $("p-rows").innerHTML = products.map((p) => `
    <tr>
      <td>${p.image ? `<img class="thumb" src="${esc(p.image)}" alt="" onerror="this.remove()">` : esc(p.emoji)}</td>
      <td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${p.price}</td><td>${Number(p.old_price) > 0 ? p.old_price : "-"}</td>
      <td>${stockPill(p)}</td>
      <td><label><input type="checkbox" ${p.active ? "checked" : ""} onchange="toggleProduct(${p.id}, this.checked)" style="width:auto"> ${p.active ? "ظاهر" : "مخفي"}</label></td>
      <td><button class="small" onclick="editProduct(${p.id})">تعديل</button> <button class="small" onclick="removeProduct(${p.id})">مسح</button></td>
    </tr>`).join("");
}
async function toggleProduct(id, active) {
  try { await saveProduct(await tk(), { id, active }); await loadProductsTab(); } catch (e) { alert(e.message); }
}
async function removeProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!confirm(`مسح "${p.name}" نهائيًا؟ (لو عايز بس تخفيه من المتجر استخدم خانة "ظاهر")`)) return;
  try { await deleteProduct(await tk(), id); await loadProductsTab(); } catch (e) { alert(e.message); }
}
let editingId = null;
function ratingPreview() {
  const r = Math.min(5, Math.max(0, Number($("p-form").rating.value) || 0)), full = Math.round(r);
  $("rating-prev").textContent = "★".repeat(full) + "☆".repeat(5 - full);
}
$("p-form").elements.rating.oninput = ratingPreview;
function openProductForm(p) {
  editingId = p ? p.id : null;
  const f = $("p-form");
  $("pm-title").textContent = p ? "تعديل منتج" : "إضافة منتج";
  f.reset();
  f.name.value = p ? p.name : ""; f.category.value = p ? p.category : "";
  f.price.value = p ? p.price : ""; f.old_price.value = p ? p.old_price : 0;
  f.stock.value = p ? p.stock : 0; f.badge.value = p ? p.badge || "" : "";
  f.description.value = p ? p.description || "" : ""; f.emoji.value = p ? p.emoji || "🛍️" : "🛍️";
  f.image.value = p ? p.image || "" : ""; f.active.checked = p ? p.active : true;
  f.rating.value = p ? Number(p.rating) || 0 : 0; f.reviews.value = p ? parseInt(p.reviews, 10) || 0 : 0; ratingPreview();
  $("p-prev").src = f.image.value; $("p-prev").style.display = f.image.value ? "" : "none";
  $("cats").innerHTML = [...new Set(products.map((x) => x.category))].map((c) => `<option value="${esc(c)}">`).join("");
  $("pf-msg").textContent = "";
  $("pm").classList.remove("hidden");
}
function editProduct(id) { openProductForm(products.find((x) => x.id === id)); }
$("p-add").onclick = () => openProductForm(null);
$("p-cancel").onclick = () => $("pm").classList.add("hidden");
$("p-file").onchange = (e) => {
  const file = e.target.files[0];
  if (file) { $("p-prev").src = URL.createObjectURL(file); $("p-prev").style.display = ""; }
};
$("p-form").elements.image.oninput = (e) => { $("p-prev").src = e.target.value; $("p-prev").style.display = e.target.value ? "" : "none"; };

// نصغّر الصورة قبل الرفع (أقصى 900px) عشان تفضل خفيفة
function shrinkImage(file) {
  return new Promise((ok, no) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? ok(b) : no(new Error("الصورة مش مقبولة"))), "image/jpeg", 0.85);
    };
    img.onerror = () => no(new Error("الصورة مش مقبولة"));
    img.src = URL.createObjectURL(file);
  });
}
$("p-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $("p-save").disabled = true; $("pf-msg").textContent = "جاري الحفظ...";
  try {
    const t = await tk();
    let image = f.image.value.trim();
    const file = $("p-file").files[0];
    if (file) image = await uploadProductImage(t, await shrinkImage(file));
    await saveProduct(t, {
      id: editingId || undefined, name: f.name.value.trim(), category: f.category.value.trim(),
      price: Number(f.price.value), old_price: Number(f.old_price.value) || 0, stock: Math.max(0, parseInt(f.stock.value, 10) || 0),
      badge: f.badge.value.trim(), description: f.description.value.trim(), emoji: f.emoji.value.trim() || "🛍️",
      image, active: f.active.checked,
      rating: Math.min(5, Math.max(0, Number(f.rating.value) || 0)), reviews: Math.max(0, parseInt(f.reviews.value, 10) || 0),
    });
    $("pm").classList.add("hidden");
    await loadProductsTab();
  } catch (err) { $("pf-msg").textContent = err.message; }
  $("p-save").disabled = false;
};

// ===== الكوبونات =====
let coupons = [];
async function loadCouponsTab() {
  if (!HAS_DB) return;
  try { coupons = await adminLoadCoupons(await tk()); } catch (e) { alert(e.message); return; }
  $("c-rows").innerHTML = coupons.map((c) => {
    const expired = c.expires_at && new Date(c.expires_at) < new Date();
    return `<tr>
      <td><b>${esc(c.code)}</b></td>
      <td>${c.kind === "percent" ? c.value + "%" : c.value + " " + CONFIG.CURRENCY}</td>
      <td>${Number(c.min_total) > 0 ? c.min_total : "-"}</td>
      <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar-EG") + (expired ? " (منتهي)" : "") : "-"}</td>
      <td>${c.used_count}${c.max_uses ? " / " + c.max_uses : ""}</td>
      <td><label><input type="checkbox" ${c.active ? "checked" : ""} onchange="toggleCoupon('${esc(c.code)}', this.checked)" style="width:auto"> ${c.active ? "شغّال" : "موقوف"}</label></td>
      <td><button class="small" onclick="removeCoupon('${esc(c.code)}')">مسح</button></td></tr>`;
  }).join("") || `<tr><td colspan="7">لسه مفيش كوبونات.</td></tr>`;
}
async function toggleCoupon(code, active) { try { await patchCoupon(await tk(), code, { active }); await loadCouponsTab(); } catch (e) { alert(e.message); } }
async function removeCoupon(code) {
  if (!confirm(`مسح الكوبون ${code}؟ (الأفضل توقفه بدل ما تمسحه)`)) return;
  try { await deleteCoupon(await tk(), code); await loadCouponsTab(); } catch (e) { alert(e.message); }
}
$("c-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  $("c-msg").textContent = "";
  try {
    const value = Number(f.value.value);
    if (f.kind.value === "percent" && value > 100) throw new Error("النسبة لازم تكون من 1 لـ 100.");
    await addCoupon(await tk(), {
      code: f.code.value.trim().toUpperCase(), kind: f.kind.value, value, min_total: Number(f.min_total.value) || 0,
      expires_at: f.expires.value ? new Date(f.expires.value + "T23:59:59").toISOString() : null,
      max_uses: f.max_uses.value ? parseInt(f.max_uses.value, 10) : null,
    });
    f.reset(); await loadCouponsTab();
  } catch (err) { $("c-msg").textContent = err.message; }
};
