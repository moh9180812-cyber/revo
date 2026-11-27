// قائمة المنتجات. عدّل أو زوّد منتجات من هنا بس.
// oldPrice: السعر قبل الخصم (0 = مفيش خصم). rating/reviews: التقييم وعدد المراجعات. badge: شارة اختيارية.
// To add a product, copy one block and change the values.
// image: رابط الصورة (صور Unsplash مجانية). لو الرابط وقع هيظهر الإيموجي بداله.
const img = (id) => `https://images.unsplash.com/photo-${id}?w=500&h=500&fit=crop&auto=format`;
const PRODUCTS = [
  { id: 1, name: "تيشيرت قطن أبيض", category: "ملابس", price: 250, emoji: "👕", image: img("1521572163474-6864f9cf17ab"), desc: "قطن 100% مريح للاستخدام اليومي", oldPrice: 320, rating: 4.6, reviews: 128, badge: "الأكثر مبيعًا" },
  { id: 2, name: "هودي رمادي", category: "ملابس", price: 600, emoji: "🧥", image: img("1556821840-3a63f95609a7"), desc: "هودي شتوي بطبقة داخلية دافئة", oldPrice: 750, rating: 4.8, reviews: 96, badge: "" },
  { id: 3, name: "جينز كلاسيك", category: "ملابس", price: 750, emoji: "👖", image: img("1542272604-787c3835535d"), desc: "قصّة مستقيمة وخامة قوية", oldPrice: 900, rating: 4.5, reviews: 210, badge: "" },
  { id: 4, name: "لوشن ترطيب للجسم", category: "مستحضرات تجميل", price: 320, emoji: "🧴", image: img("1620916566398-39f1143ab7be"), desc: "ترطيب خفيف مناسب لكل أنواع البشرة", oldPrice: 400, rating: 4.3, reviews: 64, badge: "" },
  { id: 5, name: "أحمر شفاه ولاكيه", category: "مستحضرات تجميل", price: 180, emoji: "💄", image: img("1586495777744-4413f21062fa"), desc: "لون ثابت يدوم ساعات طويلة", oldPrice: 240, rating: 4.7, reviews: 342, badge: "عرض" },
  { id: 6, name: "عطر 50 مل", category: "مستحضرات تجميل", price: 900, emoji: "🌸", image: img("1541643600914-78b084683601"), desc: "رائحة ناعمة ومنعشة", oldPrice: 1200, rating: 4.9, reviews: 57, badge: "" },
  { id: 7, name: "مجموعة مكياج", category: "مستحضرات تجميل", price: 650, emoji: "💋", image: img("1596462502278-27bfdc403348"), desc: "فرش وبودرة وروج في علبة واحدة", oldPrice: 800, rating: 4.4, reviews: 88, badge: "جديد" },
  { id: 8, name: "تيشيرت مطبوع", category: "ملابس", price: 300, emoji: "👚", image: img("1576566588028-4147f3842f27"), desc: "طبعة عصرية على قطن ناعم", oldPrice: 0, rating: 4.2, reviews: 41, badge: "" },
];
