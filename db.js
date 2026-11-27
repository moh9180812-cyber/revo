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
  if (!res.ok) throw new Error("save failed: " + (await res.text()));
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
function setSession(data) {
  const s = { access_token: data.access_token, refresh_token: data.refresh_token,
              expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600), user: data.user };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}
function signOut() { localStorage.removeItem(SESSION_KEY); }

// توكن صالح (لو قرب يخلص بنجدده)
async function getToken() {
  let s = getSession();
  if (!s) return null;
  if (s.expires_at - 60 < Date.now() / 1000) {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: headers(), body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (!res.ok) { signOut(); return null; }
    s = setSession(await res.json());
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
