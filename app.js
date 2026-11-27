// منطق صفحة المتجر: المنتجات، البحث، السلة، الحساب، وإرسال الطلب.
let cart = JSON.parse(localStorage.getItem("cart") || "{}"); // { productId: quantity }
let activeCategory = "الكل";
let searchText = "";
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

// ---- أدوات صغيرة للمنتجات ----
const CAT_ICONS = { "ملابس": "👕", "مستحضرات تجميل": "💄" };
const discountPct = (p) => (p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
function stars(r) {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

// كارت منتج واحد (بيتستخدم في العروض وفي الشبكة)
function cardHTML(p) {
  const d = discountPct(p);
  return `
    <div class="card">
      ${d ? `<span class="disc">-${d}%</span>` : ""}
      ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
      <div class="pic" onclick="openProduct(${p.id})">${p.emoji}<img src="${p.image}" alt="${esc(p.name)}" loading="lazy" onerror="this.remove()"></div>
      <div class="info">
        <h3 onclick="openProduct(${p.id})">${esc(p.name)}</h3>
        <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} (${p.reviews})</div>
        <div class="prices"><span class="price">${money(p.price)}</span>${d ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div>
        <button class="add" onclick="addToCart(${p.id})">أضف للسلة</button>
      </div>
    </div>`;
}

// ---- الأقسام والبحث والترتيب ----
function renderCats() {
  const cats = ["الكل", ...new Set(PRODUCTS.map((p) => p.category))];
  $("cats").innerHTML = cats.map((c) =>
    `<button class="cat ${c === activeCategory ? "active" : ""}" data-cat="${esc(c)}">${CAT_ICONS[c] || "🛍️"} ${esc(c)}</button>`).join("");
  $("cats").querySelectorAll("button").forEach((b) => {
    b.onclick = () => { activeCategory = b.dataset.cat; renderCats(); renderProducts(); $("all").scrollIntoView(); };
  });
}

function renderDeals() {
  const deals = PRODUCTS.filter((p) => discountPct(p) > 0).sort((a, b) => discountPct(b) - discountPct(a));
  $("deals").classList.toggle("hidden", !deals.length);
  $("deals-list").innerHTML = deals.map(cardHTML).join("");
}

function renderProducts() {
  let list = PRODUCTS.filter((p) => activeCategory === "الكل" || p.category === activeCategory);
  const q = searchText.trim().toLowerCase();
  if (q) list = list.filter((p) => (p.name + " " + p.desc + " " + p.category).toLowerCase().includes(q));
  const sort = $("sort").value;
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
  if (sort === "discount") list.sort((a, b) => discountPct(b) - discountPct(a));
  $("list-title").textContent = q ? `نتائج البحث عن "${searchText.trim()}"` : activeCategory === "الكل" ? "كل المنتجات" : activeCategory;
  $("products").innerHTML = list.map(cardHTML).join("");
  $("no-results").classList.toggle("hidden", list.length > 0);
}

$("sort").onchange = renderProducts;
$("search").oninput = (e) => { searchText = e.target.value; renderProducts(); };
$("search-form").onsubmit = (e) => { e.preventDefault(); renderProducts(); $("all").scrollIntoView(); };

// ---- صفحة تفاصيل المنتج ----
let detailQty = 1;
function openProduct(id) {
  const p = PRODUCTS.find((x) => x.id == id);
  const d = discountPct(p);
  detailQty = 1;
  $("product-detail").innerHTML = `
    <div class="detail">
      <div class="pic">${p.emoji}<img src="${p.image}" alt="${esc(p.name)}" onerror="this.remove()"></div>
      <div>
        <p class="muted">${esc(p.category)}</p>
        <h2>${esc(p.name)}</h2>
        <div class="rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} (${p.reviews} تقييم)</div>
        <div class="prices" style="margin:12px 0"><span class="price">${money(p.price)}</span>
          ${d ? `<span class="old">${money(p.oldPrice)}</span><span class="disc" style="position:static">-${d}%</span>` : ""}</div>
        <p>${esc(p.desc)}</p>
        <p class="muted">🚚 توصيل لحد باب البيت • 💵 الدفع عند الاستلام</p>
        <div class="qty">الكمية:
          <button class="small" onclick="detailChange(-1)">−</button><b id="detail-qty">1</b><button class="small" onclick="detailChange(1)">+</button>
        </div>
        <div class="actions">
          <button onclick="addFromDetail(${p.id}, false)">أضف للسلة</button>
          <button class="buy" onclick="addFromDetail(${p.id}, true)">اشتري الآن</button>
        </div>
      </div>
    </div>`;
  $("product-modal").classList.remove("hidden");
}
function detailChange(d) { detailQty = Math.max(1, detailQty + d); $("detail-qty").textContent = detailQty; }
function addFromDetail(id, buyNow) {
  cart[id] = (cart[id] || 0) + detailQty;
  saveCart();
  closeAll();
  if (buyNow) showPanel("cart");
  else toast("اتضاف للسلة ✅");
}
$("close-product").onclick = closeAll;
$("product-modal").onclick = (e) => { if (e.target === $("product-modal")) closeAll(); };

// رسالة صغيرة بتظهر وتختفي
function toast(text) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

// ---- السلة ----
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
function addToCart(id) { cart[id] = (cart[id] || 0) + 1; saveCart(); toast("اتضاف للسلة ✅"); }
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
  const count = lines.reduce((s, l) => s + l.qty, 0);
  $("cart-count").textContent = count;
  $("cart-count2").textContent = count;
  $("cart-items").innerHTML = lines.length ? lines.map((l) => {
    const p = PRODUCTS.find((x) => x.id == l.id);
    return `
    <div class="cart-line">
      <div class="ph">${p.emoji}<img src="${p.image}" alt="" onerror="this.remove()" style="position:absolute;width:56px;height:56px;border-radius:8px;object-fit:cover"></div>
      <div class="grow">${esc(l.name)}<br><small class="muted">${money(l.price)}</small></div>
      <span><button class="small" onclick="changeQty(${l.id},-1)">−</button> ${l.qty}
      <button class="small" onclick="changeQty(${l.id},1)">+</button></span>
      <strong>${money(l.price * l.qty)}</strong>
    </div>`;
  }).join("") : "<p class='center muted'>🛒 السلة فاضية</p>";
  $("cart-total").textContent = money(cartTotal());
}

// ---- فتح وقفل اللوحات الجانبية ----
function showPanel(name) {
  $("product-modal").classList.add("hidden");
  $("cart-panel").classList.toggle("hidden", name !== "cart");
  $("account-panel").classList.toggle("hidden", name !== "account");
  $("backdrop").classList.toggle("hidden", !name);
}
function closeAll() { showPanel(null); }
$("open-cart").onclick = () => showPanel("cart");
$("bn-cart").onclick = () => showPanel("cart");
$("close-cart").onclick = closeAll;
$("open-account").onclick = () => showPanel("account");
$("bn-account").onclick = () => showPanel("account");
$("close-account").onclick = closeAll;
$("backdrop").onclick = closeAll;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

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

renderContact(); renderCats(); renderDeals(); renderProducts(); renderCart(); refreshAccount();
