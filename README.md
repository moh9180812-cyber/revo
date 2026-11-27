# متجر لمسة (Lamsa Shop)
متجر بسيط (ملابس + مستحضرات تجميل). HTML + CSS + JavaScript عادي بدون أي أدوات بناء، والطلبات بتتخزن في داتابيز Supabase.

## الملفات
- `index.html` + `app.js`: صفحة المتجر والسلة وتأكيد الطلب
- `products.js`: المنتجات (عدّلها بسهولة)
- `db.js`: كل الكلام مع الداتابيز
- `admin.html` + `admin.js`: لوحة الطلبات وتصدير CSV لشركة الشحن
- `schema.sql`: جدول الطلبات وصلاحياته
- `config.js`: رابط ومفتاح Supabase

## التشغيل
1. افتح `index.html` في المتصفح (وضع تجريبي: الطلبات في المتصفح بس).
2. اعمل مشروع مجاني على supabase.com، وشغّل `schema.sql` في SQL Editor.
3. من Authentication > Users أضف حساب لصاحب المتجر (إيميل وباسورد).
4. حط `SUPABASE_URL` و `SUPABASE_ANON_KEY` في `config.js`.
5. افتح `admin.html` وسجّل دخول، هتشوف الطلبات وتنزّل CSV.

الموقع على GitHub Pages (مجاني): Settings > Pages > Deploy from branch `main`.
