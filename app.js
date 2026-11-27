// منطق صفحة المتجر: عرض المنتجات، السلة، وإرسال الطلب.
let cart = JSON.parse(localStorage.getItem("cart") || "{}"); // { productId: quantity }
let activeCategory = "الكل";

const $ = (id) => document.getElementById(id);
const money = (n) => `${n} ${CONFIG.CURRENCY}`;

document.title = CONFIG.STORE_NAME;
$("store-name").textContent = CONFIG.STORE_NAME;

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
      <div class="pic">${p.emoji}</div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="price">${money(p.price)}</div>
      <button onclick="addToCart(${p.id})">أضف للسلة</button>
    </div>`).join("");
}

// ---- السلة ----
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
function addToCart(id) { cart[id] = (cart[id] || 0) + 1; saveCart(); $("cart-panel").classList.remove("hidden"); }
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

$("open-cart").onclick = () => $("cart-panel").classList.remove("hidden");
$("close-cart").onclick = () => $("cart-panel").classList.add("hidden");

// ---- إرسال الطلب ----
$("order-form").onsubmit = async (e) => {
  e.preventDefault();
  if (!cartLines().length) { $("result").innerHTML = '<div class="err">السلة فاضية</div>'; return; }
  const f = new FormData(e.target);
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
    await saveOrder(order);
    cart = {}; saveCart(); e.target.reset();
    $("result").innerHTML = '<div class="msg">✅ تم استلام طلبك! هنكلمك على الموبايل لتأكيد الشحن.</div>';
  } catch (err) {
    console.error(err);
    $("result").innerHTML = '<div class="err">حصلت مشكلة، جرّب تاني.</div>';
  }
  $("submit-btn").disabled = false;
};

renderFilters(); renderProducts(); renderCart();
