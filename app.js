// منطق صفحة المتجر: المنتجات، السلة، الحساب، وإرسال الطلب.
let cart = JSON.parse(localStorage.getItem("cart") || "{}"); // { productId: quantity }
let activeCategory = "الكل";
let profile = null; // بيانات الزبون المسجّل (لو فيه)

const $ = (id) => document.getElementById(id);
const money = (n) => `${n} ${CONFIG.CURRENCY}`;
// نمنع أي HTML جاي من بيانات المستخدم
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

document.title = CONFIG.STORE_NAME;
$("store-name").textContent = CONFIG.STORE_NAME;
$("footer-name").textContent = CONFIG.STORE_NAME;
$("year").textContent = new Date().getFullYear();

// ---- من نحن / تواصل / سوشيال (من config.js) ----
function renderContact() {
  const c = CONFIG.CONTACT;
  $("contact-list").innerHTML = `
    <li>📞 <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></li>
    <li>💬 <a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">واتساب</a></li>
    <li>✉️ <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>
    <li>📍 ${esc(c.address)}</li>
    <li>🕒 ${esc(c.hours)}</li>`;
  const names = { facebook: "فيسبوك", instagram: "إنستجرام", tiktok: "تيك توك" };
  $("social").innerHTML = Object.entries(CONFIG.SOCIAL)
    .map(([k, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${names[k] || k}</a>`).join("");
}

// ---- المنتجات ----
function renderFilters() {
  const cats = ["الكل", ...new Set(PRODUCTS.map((p) => p.category))];
  $("filters").innerHTML = "";
  cats.forEach((c) => {
    const b = document.createElement("button");
    b.textContent = c;
    if (c === activeCategory) b.className = "active";
    b.onclick = () => { activeCategory = c; renderFilters(); renderProducts(); };
    $("filters").appendChild(b);
  });
}

function renderProducts() {
  const list = PRODUCTS.filter((p) => activeCategory === "الكل" || p.category === activeCategory);
  $("products").innerHTML = list.map((p) => `
    <div class="card">
      <div class="pic">${p.emoji}<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()"></div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="price">${money(p.price)}</div>
      <button onclick="addToCart(${p.id})">أضف للسلة</button>
    </div>`).join("");
}

// ---- السلة ----
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
function addToCart(id) { cart[id] = (cart[id] || 0) + 1; saveCart(); showPanel("cart"); }
function changeQty(id, d) { cart[id] += d; if (cart[id] <= 0) delete cart[id]; saveCart(); }

function cartLines() {
  return Object.keys(cart).map((id) => {
    const p = PRODUCTS.find((x) => x.id == id);
    return { id: p.id, name: p.name, price: p.price, qty: cart[id] };
  });
}
function cartTotal() { return cartLines().reduce((s, l) => s + l.price * l.qty, 0); }

function renderCart() {
  const lines = cartLines();
  $("cart-count").textContent = lines.reduce((s, l) => s + l.qty, 0);
  $("cart-items").innerHTML = lines.length ? lines.map((l) => `
    <div class="row">
      <span>${l.name}</span>
      <span><button class="small" onclick="changeQty(${l.id},-1)">−</button> ${l.qty}
      <button class="small" onclick="changeQty(${l.id},1)">+</button></span>
      <span>${money(l.price * l.qty)}</span>
    </div>`).join("") : "<p>السلة فاضية</p>";
  $("cart-total").textContent = money(cartTotal());
}

// ---- فتح وقفل اللوحات الجانبية ----
function showPanel(name) {
  $("cart-panel").classList.toggle("hidden", name !== "cart");
  $("account-panel").classList.toggle("hidden", name !== "account");
}
$("open-cart").onclick = () => showPanel("cart");
$("close-cart").onclick = () => showPanel(null);
$("open-account").onclick = () => showPanel("account");
$("close-account").onclick = () => showPanel(null);

// ---- الحساب ----
function setAccountMsg(text, isError) {
  $("account-msg").innerHTML = text ? `<div class="${isError ? "err" : "msg"}">${esc(text)}</div>` : "";
}

$("tab-login").onclick = () => switchTab("login");
$("tab-signup").onclick = () => switchTab("signup");
function switchTab(t) {
  $("login-form").classList.toggle("hidden", t !== "login");
  $("signup-form").classList.toggle("hidden", t !== "signup");
  $("tab-login").classList.toggle("active", t === "login");
  $("tab-signup").classList.toggle("active", t === "signup");
  setAccountMsg("");
}

// بيحدّث الشاشة حسب حالة الدخول ويملا بيانات الزبون في فورم الطلب
async function refreshAccount() {
  const s = getSession();
  const token = s && (await getToken());
  if (!token) {
    profile = null;
    $("auth-box").classList.remove("hidden");
    $("profile-box").classList.add("hidden");
    $("account-label").textContent = "دخول / حساب جديد";
    $("cart-hint").textContent = "سجّل دخول عشان بياناتك تتملا لوحدها وتتابع طلباتك.";
    return;
  }
  const user = getSession().user;
  profile = (await loadProfile(token, user.id)) || {};
  $("auth-box").classList.add("hidden");
  $("profile-box").classList.remove("hidden");
  $("who").textContent = user.email;
  $("account-label").textContent = profile.full_name || "حسابي";
  $("cart-hint").textContent = "بياناتك اتملت من حسابك، راجعها قبل التأكيد.";
  const pf = $("profile-form");
  pf.full_name.value = profile.full_name || (user.user_metadata && user.user_metadata.full_name) || "";
  pf.phone.value = profile.phone || "";
  pf.city.value = profile.city || "";
  pf.address.value = profile.address || "";
  prefillOrderForm();
  renderMyOrders(token, user.id);
}

function prefillOrderForm() {
  if (!profile) return;
  const f = $("order-form");
  if (!f.name.value) f.name.value = profile.full_name || "";
  if (!f.phone.value) f.phone.value = profile.phone || "";
  if (!f.city.value) f.city.value = profile.city || "";
  if (!f.address.value) f.address.value = profile.address || "";
}

const STATUS_AR = { new: "جديد", shipped: "اتشحن", delivered: "اتسلّم", canceled: "ملغي" };
async function renderMyOrders(token, userId) {
  const list = await loadMyOrders(token, userId);
  $("my-orders").innerHTML = list.length ? list.map((o) => `
    <div class="order-card">
      <div class="row"><span>${new Date(o.created_at).toLocaleDateString("ar-EG")}</span><strong>${money(o.total)}</strong></div>
      <small>${esc(o.items.map((i) => `${i.name} x${i.qty}`).join(" + "))}</small><br>
      <small>الحالة: ${STATUS_AR[o.status] || esc(o.status)}</small>
    </div>`).join("") : "<p class='muted'>لسه مفيش طلبات.</p>";
}

$("login-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { await signIn(f.get("email"), f.get("password")); e.target.reset(); setAccountMsg(""); await refreshAccount(); }
  catch (err) { setAccountMsg(err.message, true); }
};

$("signup-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const s = await signUp(f.get("email"), f.get("password"), f.get("name"));
    await saveProfile(s.access_token, { id: s.user.id, full_name: f.get("name") });
    e.target.reset(); setAccountMsg(""); await refreshAccount();
  } catch (err) { setAccountMsg(err.message, true); }
};

$("profile-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    const token = await getToken();
    await saveProfile(token, { id: getSession().user.id, full_name: f.get("full_name"), phone: f.get("phone"), city: f.get("city"), address: f.get("address") });
    setAccountMsg("اتحفظت بياناتك ✅");
    await refreshAccount();
  } catch (err) { setAccountMsg(err.message, true); }
};

$("logout").onclick = () => {
  signOut();
  $("order-form").reset();
  setAccountMsg("");
  refreshAccount();
};

// ---- إرسال الطلب ----
$("order-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!cartLines().length) { $("result").innerHTML = '<div class="err">السلة فاضية</div>'; return; }
  const f = new FormData(e.target);
  const s = getSession();
  const order = {
    id: crypto.randomUUID(),
    customer_name: f.get("name"),
    phone: f.get("phone"),
    city: f.get("city"),
    address: f.get("address"),
    notes: f.get("notes") || "",
    items: cartLines(),
    total: cartTotal(),
  };
  $("submit-btn").disabled = true;
  try {
    const token = s ? await getToken() : null;
    if (token) order.user_id = getSession().user.id; // نربط الطلب بالحساب
    await saveOrder(order, token);
    // نحفظ العنوان في حساب الزبون عشان الطلب الجاي يتملا لوحده
    if (token) {
      try { await saveProfile(token, { id: order.user_id, full_name: order.customer_name, phone: order.phone, city: order.city, address: order.address }); } catch (_) {}
    }
    cart = {}; saveCart(); e.target.reset();
    $("result").innerHTML = '<div class="msg">✅ تم استلام طلبك! هنكلمك على الموبايل لتأكيد الشحن.</div>';
    if (token) await refreshAccount();
  } catch (err) {
    console.error(err);
    $("result").innerHTML = '<div class="err">حصلت مشكلة، جرّب تاني.</div>';
  }
  $("submit-btn").disabled = false;
};

renderContact(); renderFilters(); renderProducts(); renderCart(); refreshAccount();
