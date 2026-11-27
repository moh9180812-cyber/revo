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
    </tr>`).join("");
}
// نمنع أي HTML جاي من بيانات الزبون
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

async function changeStatus(id, status) { await setStatus(token, id, status); }

async function show() {
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "orders.csv";
  a.click();
};

$("login").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { token = await adminLogin(f.get("email"), f.get("password")); show(); }
  catch (err) { $("login-err").innerHTML = `<div class="err">${err.message}</div>`; }
};

if (HAS_DB) $("login").classList.remove("hidden"); else show(); // وضع تجريبي بدون دخول
