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

async function changeStatus(id, status) { await setStatus(token, id, status); }

async function show() {
  // الصفحة دي لصاحب المتجر بس (السيرفر بيتأكد، والداتا نفسها محمية بصلاحيات Supabase)
  if (HAS_DB && !(await isOwner(token))) {
    $("login-err").innerHTML = '<div class="err">الحساب ده مش صاحب المتجر.</div>';
    token = null; return;
  }
  try { orders = await loadOrders(token); } catch (e) { alert(e.message); return; }
  $("login").classList.add("hidden");
  $("panel").classList.remove("hidden");
  render();
}

// تصدير CSV (BOM عشان إكسل يقرا العربي صح)
$("csv").onclick = () => {
  const head = ["التاريخ", "الاسم", "الموبايل", "المدينة", "العنوان", "ملاحظات", "المنتجات", "الإجمالي (الدفع عند الاستلام)", "الحالة"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = orders.map((o) => [o.created_at, o.customer_name, o.phone, o.city, o.address, o.notes, itemsText(o), o.total, o.status].map(q).join(","));
  const blob = new Blob(["\ufeff" + [head.map(q).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  saveBlob(blob, "orders.csv");
};

$("login").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { token = await adminLogin(f.get("email"), f.get("password")); show(); }
  catch (err) { $("login-err").innerHTML = `<div class="err">${err.message}</div>`; }
};

if (HAS_DB) $("login").classList.remove("hidden"); else show(); // وضع تجريبي بدون دخول

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
    { header: "المنتجات", key: "i", width: 44 }, { header: "الإجمالي (الدفع عند الاستلام)", key: "s", width: 18 },
    { header: "الحالة", key: "st", width: 12 },
  ];
  orders.forEach((o) => ws.addRow({
    d: fmtDate(o.created_at), n: o.customer_name, p: String(o.phone ?? ""), c: o.city,
    a: o.address, t: o.notes || "", i: o.items.map((i) => `${i.name} × ${i.qty}`).join("\n"),
    s: Number(o.total), st: STATUSES[o.status] || o.status,
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
