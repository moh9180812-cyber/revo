// ⚙️ الإعدادات: المفتاح هنا عام (publishable) وآمن إنه يفضل في الكود.
// Settings. The Supabase key below is the public one and is safe to keep in the code.
const CONFIG = {
  SUPABASE_URL: "https://ancavpuephqjqbcvzoly.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_27IJ4U5VB9v9ofWy79BQLQ_RdL8nVqN",
  STORE_NAME: "ريڤو",
  CURRENCY: "ج.م",

  // ✏️✏️ بيانات التواصل: غيّر القيم اللي بين العلامتين " " بس، وسيب باقي الكود زي ما هو.
  // EDIT HERE: change only the text between the quotes. Leave a value empty ("") to hide that item.
  // الأرقام: اكتب الموبايل عادي (01012345678). الواتساب بالكود الدولي من غير + (مصر: 201012345678).
  CONTACT: {
    phone: "01000000000",          // رقم الموبايل (مثال مؤقت)
    whatsapp: "201000000000",      // رقم الواتساب بالكود الدولي من غير + (مثال مؤقت)
    email: "info@example.com",     // الإيميل (مثال مؤقت)
    address: "القاهرة، مصر",        // العنوان
    hours: "يوميًا من 10 صباحًا إلى 10 مساءً", // مواعيد العمل
  },
  // روابط السوشيال: حط رابط صفحتك الكامل. سيب أي رابط فاضي "" لو مش عايزه يظهر.
  SOCIAL: {
    facebook: "https://www.facebook.com/your-page",    // (مثال مؤقت)
    instagram: "https://www.instagram.com/your-page",  // (مثال مؤقت)
    tiktok: "https://www.tiktok.com/@your-page",       // (مثال مؤقت)
    youtube: "",                                       // اختياري
  },
};
