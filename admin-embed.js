// لوحة التحكم جوه نفس التطبيق: زرار بيظهر لصاحب المتجر بس (السيرفر بيتأكد من is_owner والداتا محمية بصلاحيات Supabase).
(function () {
  let ownerFor = null, isOwnerNow = false, opened = false;

  function ensureUI() {
    if ($("open-admin")) return;
    const b = document.createElement("button");
    b.className = "hbtn hidden"; b.id = "open-admin"; b.type = "button";
    b.innerHTML = '🛠️ <span class="hide-m">لوحة التحكم</span>';
    b.onclick = openAdmin;
    $("open-account").before(b);
    const o = document.createElement("div");
    o.id = "admin-overlay"; o.className = "hidden";
    o.innerHTML = '<iframe id="admin-frame" title="لوحة التحكم"></iframe>';
    document.body.appendChild(o);
  }
  function openAdmin() {
    if (!isOwnerNow) return;
    ensureUI();
    const f = $("admin-frame");
    if (!f.getAttribute("src")) f.src = "admin.html?embed=1";
    $("admin-overlay").classList.remove("hidden");
    document.body.classList.add("admin-open");
    if (location.hash !== "#admin") history.replaceState(null, "", "#admin");
    opened = true;
  }
  window.closeAdmin = function () {
    const o = $("admin-overlay");
    if (o) o.classList.add("hidden");
    document.body.classList.remove("admin-open");
    if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search);
    opened = false;
  };
  function reset() { // خروج: نقفل اللوحة ونفضّي الإطار
    const f = $("admin-frame"); if (f) f.removeAttribute("src");
    window.closeAdmin();
  }

  async function checkOwner() {
    ensureUI();
    const s = getSession();
    const token = s && (await getToken());
    if (!token) { ownerFor = null; isOwnerNow = false; $("open-admin").classList.add("hidden"); reset(); return; }
    if (ownerFor !== s.user.id) {
      ownerFor = s.user.id;
      try { isOwnerNow = !!(await isOwner(token)); } catch (e) { isOwnerNow = false; }
    }
    $("open-admin").classList.toggle("hidden", !isOwnerNow);
    if (location.hash === "#admin" && isOwnerNow && !opened) openAdmin();
  }

  const orig = window.refreshAccount;
  window.refreshAccount = async function () { const r = await orig.apply(this, arguments); checkOwner(); return r; };
  ensureUI();
  checkOwner();
  // لو حد فتح #admin وهو مش مسجل دخول: نفتح شاشة الدخول العادية
  if (location.hash === "#admin" && !getSession()) { try { showPanel("account"); } catch (e) {} }
})();
