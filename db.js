// طبقة الداتابيز: كل الكلام مع Supabase هنا في مكان واحد.
// All database calls live in this file.
const HAS_DB = CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;

// حفظ طلب جديد (بيستخدمه الزبون)
async function saveOrder(order) {
  if (!HAS_DB) {
    // وضع تجريبي: نخزن في المتصفح
    const all = JSON.parse(localStorage.getItem("demo_orders") || "[]");
    all.push({ ...order, created_at: new Date().toISOString(), status: "new" });
    localStorage.setItem("demo_orders", JSON.stringify(all));
    return;
  }
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders`, {
    method: "POST",
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
  if (!res.ok) throw new Error("save failed: " + (await res.text()));
}

// تسجيل دخول صاحب المتجر (Supabase Auth)
async function adminLogin(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("بيانات الدخول غلط");
  return (await res.json()).access_token;
}

// قراءة كل الطلبات (للصاحب بس)
async function loadOrders(token) {
  if (!HAS_DB) return JSON.parse(localStorage.getItem("demo_orders") || "[]").reverse();
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
    headers: { apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("مش قادر أقرأ الطلبات");
  return res.json();
}

// تغيير حالة الطلب
async function setStatus(token, id, status) {
  if (!HAS_DB) return;
  await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
}
