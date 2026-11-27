// PWA: تسجيل الـ Service Worker + زرار/بانر تثبيت التطبيق + لوجو ريڤو في الهيدر.
(function () {
  // لوجو في الهيدر والفوتر (من غير ما نغيّر اسم المتجر)
  ["store-name", "footer-name"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el || el.querySelector("img")) return;
    var name = el.textContent;
    el.innerHTML = '<img class="brand-mark" src="logo.svg" alt="" width="30" height="30"><span></span>';
    el.lastChild.textContent = name;
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;
  var KEY = "revo_install_dismissed", WEEK = 7 * 864e5;
  function dismissed() { var t = +localStorage.getItem(KEY) || 0; return Date.now() - t < WEEK; }
  function bar(html, onInstall) {
    if (dismissed() || document.getElementById("install-bar")) return;
    var b = document.createElement("div");
    b.id = "install-bar";
    b.innerHTML = '<img src="icon-192.png" alt="" width="44" height="44"><div class="ib-text">' + html + '</div>' +
      (onInstall ? '<button type="button" id="ib-go">تثبيت</button>' : '') + '<button type="button" id="ib-x" aria-label="إغلاق">✕</button>';
    document.body.appendChild(b);
    document.getElementById("ib-x").onclick = function () { localStorage.setItem(KEY, Date.now()); b.remove(); };
    if (onInstall) document.getElementById("ib-go").onclick = onInstall;
  }
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    bar("<b>ثبّت تطبيق ريڤو</b><small>فتح أسرع وتسوّق بضغطة من الشاشة الرئيسية</small>", function () {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; var b = document.getElementById("install-bar"); if (b) b.remove(); });
    });
  });
  window.addEventListener("appinstalled", function () { var b = document.getElementById("install-bar"); if (b) b.remove(); });
  var ua = navigator.userAgent;
  var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) {
    setTimeout(function () {
      bar("<b>ثبّت ريڤو على الآيفون</b><small>اضغط زرار المشاركة ⬆️ وبعدين «إضافة إلى الشاشة الرئيسية»</small>");
    }, 2500);
  }
})();
