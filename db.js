// طبقة الداتابيز: كل الكلام مع Supabase هنا في مكان واحد.
// All database calls live in this file.
const HAS_DB = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;

// الهيدر المشترك: المفتاح العام + (لو فيه توكن دخول) التوكن بتاع صاحب المتجر
function headers(token) {
  const h = { apikey: CONFIG.SUPABASE_ANON_KEY, "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// حفظ طلب جديد (بيستخدمه الزبون)
async function saveOrder(order, token) {
  if (!HAS_DB) {
    // وضع تجريبي: نخزن في المتصفح
    const all = JSON.parse(localStorage.getItem("demo_orders") || "[]");
    all.push({ ...order, created_at: new Date().toISOString(), status: "new" });
    localStorage.setItem("demo_orders", JSON.stringify(all));
    return;
  }
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: headers(token), // لو الزبون مسجّل دخول الطلب بيتربط بحسابه
    body: JSON.stringify(order),
  });
  if (!res.ok) throw orderError(await res.text());
}

// رسائل الأخطاء من السيرفر (المخزون / الكوبون) بالعربي
function orderError(text) {
  let msg = "";
  try { msg = JSON.parse(text).message || ""; } catch (_) { msg = text; }
  const [kind, ...rest] = msg.split(":");
  const arg = rest.join(":").trim();
  const e = new Error("save failed: " + text);
  e.kind = kind;
  if (kind === "out_of_stock") e.userMsg = `"${arg}" الكمية المتاحة خلصت أو أقل من المطلوب. عدّل السلة وجرّب تاني.`;
  else if (kind === "unavailable") e.userMsg = `"${arg}" مش متاح حاليًا. شيله من السلة وكمّل.`;
  else if (kind === "coupon_invalid") e.userMsg = arg || "الكوبون غير صالح.";
  else if (kind === "order_invalid") e.userMsg = arg || "الطلب غير صالح.";
  return e;
}

// تسجيل دخول صاحب المتجر (Supabase Auth)
async function adminLogin(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("بيانات الدخول غلط");
  return (await res.json()).access_token;
}

// هل المستخدم ده هو صاحب المتجر؟ (السيرفر هو اللي بيحدد، مش الصفحة)
async function isOwner(token) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/is_owner`, {
    method: "POST", headers: headers(token), body: "{}",
  });
  return res.ok && (await res.json()) === true;
}

// ================= حسابات الزباين =================
// الجلسة بتتخزن في المتصفح (التوكن بتاع الزبون هو بس، مفيش أي سر).
const SESSION_KEY = "lamsa_session";

function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
// الجلسة بتفضل شهر (30 يوم) من وقت تسجيل الدخول، وبعدها لازم تدخل تاني.
// التوكن بيتجدد لوحده في الخلفية (refresh token).
const SESSION_DAYS = 30;
function setSession(data, keepLoginTime) {
  const old = getSession();
  const s = { access_token: data.access_token, refresh_token: data.refresh_token,
              expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600), user: data.user,
              login_at: keepLoginTime && old && old.login_at ? old.login_at : Date.now() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}
function signOut() { localStorage.removeItem(SESSION_KEY); }

// توكن صالح (لو قرب يخلص بنجدده)
async function getToken() {
  let s = getSession();
  if (!s) return null;
  if (!s.login_at) { s.login_at = Date.now(); localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  if (Date.now() - s.login_at > SESSION_DAYS * 86400000) { signOut(); return null; } // عدّى الشهر
  if (s.expires_at - 60 < Date.now() / 1000) {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: headers(), body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { signOut(); return null; }
    s = setSession(await res.json(), true);
  }
  return s.access_token;
}

async function authError(res, fallback) {
  const j = await res.json().catch(() => ({}));
  const m = (j.msg || j.message || j.error_description || "").toLowerCase();
  if (m.includes("already")) return "الإيميل ده مسجّل قبل كده، جرّب تسجيل الدخول.";
  if (m.includes("password") && m.includes("6")) return "الباسورد لازم 6 حروف على الأقل.";
  if (m.includes("invalid login")) return "الإيميل أو الباسورد غلط.";
  if (m.includes("rate") || res.status === 429) return "محاولات كتير، استنى شوية وجرّب تاني.";
  if (m.includes("not allowed") || m.includes("disabled")) return "التسجيل مقفول حاليًا.";
  return fallback;
}

async function signUp(email, password, fullName) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });
  if (!res.ok) throw new Error(await authError(res, "مقدرناش نعمل الحساب."));
  const data = await res.json();
  if (!data.access_token) throw new Error("بعتنالك إيميل تأكيد، افتحه وبعدين سجّل دخول.");
  return setSession(data);
}

async function signIn(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: headers(), body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await authError(res, "مقدرناش نسجّل دخولك."));
  return setSession(await res.json());
}

// بيانات الزبون (الاسم/الموبايل/العنوان)
async function loadProfile(token, userId) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers: headers(token) });
  if (!res.ok) return null;
  return (await res.json())[0] || null;
}
async function saveProfile(token, profile) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers(token), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ ...profile, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("مقدرناش نحفظ بياناتك.");
}

// طلبات الزبون الحالي بس
async function loadMyOrders(token, userId) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders?user_id=eq.${userId}&select=*&order=created_at.desc`, { headers: headers(token) });
  if (!res.ok) return [];
  return res.json();
}

// قراءة كل الطلبات (للصاحب بس)
async function loadOrders(token) {
  if (!HAS_DB) return JSON.parse(localStorage.getItem("demo_orders") || "[]").reverse();
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error("مش قادر أقرأ الطلبات");
  return res.json();
}

// تغيير حالة الطلب
async function setStatus(token, id, status) {
  if (!HAS_DB) return;
  await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify({ status }),
  });
}


// ================= المنتجات =================
// قراءة المنتجات المفعّلة للزباين (من غير تسجيل دخول)
async function loadProducts() {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?select=*&active=eq.true&order=sort.asc,id.asc`, { headers: headers() });
  if (!res.ok) throw new Error("products");
  return res.json();
}
// للأدمن: كل المنتجات حتى الغير مفعّلة
async function adminLoadProducts(token) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?select=*&order=sort.asc,id.asc`, { headers: headers(token) });
  if (!res.ok) throw new Error("مش قادر أقرأ المنتجات");
  return res.json();
}
// إضافة (من غير id) أو تعديل (بـ id)
async function saveProduct(token, p) {
  const isNew = !p.id;
  const url = `${CONFIG.SUPABASE_URL}/rest/v1/products` + (isNew ? "" : `?id=eq.${p.id}`);
  const body = { ...p }; delete body.id;
  const res = await fetch(url, { method: isNew ? "POST" : "PATCH", headers: { ...headers(token), Prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("مقدرناش نحفظ المنتج: " + (await res.text()));
  return (await res.json())[0];
}
async function deleteProduct(token, id) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/products?id=eq.${id}`, { method: "DELETE", headers: headers(token) });
  if (!res.ok) throw new Error("مقدرناش نمسح المنتج");
}
// رفع صورة منتج (Supabase Storage). بيرجّع رابط الصورة العام.
async function uploadProductImage(token, blob) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const res = await fetch(`${CONFIG.SUPABASE_URL}/storage/v1/object/product-images/${name}`, {
    method: "POST", headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": blob.type || "image/jpeg" }, body: blob,
  });
  if (!res.ok) throw new Error("مقدرناش نرفع الصورة: " + (await res.text()));
  return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/product-images/${name}`;
}

// ================= الكوبونات =================
// الزبون: الكوبون صالح وبكام خصم؟
async function checkCoupon(code, subtotal) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/check_coupon`, {
    method: "POST", headers: headers(), body: JSON.stringify({ p_code: code, p_subtotal: subtotal }),
  });
  if (!res.ok) return { ok: false, message: "مقدرناش نتحقق من الكوبون." };
  return res.json();
}
async function adminLoadCoupons(token) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/coupons?select=*&order=created_at.desc`, { headers: headers(token) });
  if (!res.ok) throw new Error("مش قادر أقرأ الكوبونات");
  return res.json();
}
async function addCoupon(token, c) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/coupons`, { method: "POST", headers: headers(token), body: JSON.stringify(c) });
  if (!res.ok) throw new Error((await res.text()).includes("duplicate") ? "الكود ده موجود قبل كده." : "مقدرناش نحفظ الكوبون.");
}
async function patchCoupon(token, code, fields) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/coupons?code=eq.${encodeURIComponent(code)}`, { method: "PATCH", headers: headers(token), body: JSON.stringify(fields) });
  if (!res.ok) throw new Error("مقدرناش نعدّل الكوبون");
}
async function deleteCoupon(token, code) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/coupons?code=eq.${encodeURIComponent(code)}`, { method: "DELETE", headers: headers(token) });
  if (!res.ok) throw new Error("مقدرناش نمسح الكوبون");
}
