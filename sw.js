// Service Worker لمتجر ريڤو: بيخزّن شكل الموقع الأساسي بس.
// ما بنخزّنش أي طلب لـ Supabase (الطلبات والحسابات والمنتجات) ولا صفحة الأدمن.
const CACHE = "revo-shell-v1";
const SHELL = ["./", "index.html", "offline.html", "shop.css", "config.js", "products.js", "db.js", "app.js", "pwa.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  // أي حاجة مش من نفس الموقع (Supabase وغيره) أو مش GET: السيرفس ووركر مايلمسهاش.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  // صفحة الأدمن بتفضل زي ما هي من النت دايمًا.
  if (url.pathname.endsWith("/admin.html") || url.pathname.endsWith("/admin.js")) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("offline.html") : Response.error())))
  );
});
