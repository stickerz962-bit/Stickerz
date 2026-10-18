import { useState } from 'react';

const categories = [
  { id: 'all', label: 'كل المنتجات' },
  { id: 'school', label: 'ملصقات مدرسية' },
  { id: 'gifts', label: 'هدايا مخصصة' },
  { id: 'bundles', label: 'مجموعات وباقات' },
] as const;
type CategoryId = (typeof categories)[number]['id'];

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [cartNotice, setCartNotice] = useState(false);
  const selectedCategory = categories.find((item) => item.id === category)?.label ?? 'كل المنتجات';

  return <div className="app-shell">
    <div className="announcement">مصممة بحب، لتفاصيل تشبه طفلك ✦</div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="ستيكرز — الرئيسية"><span className="brand-mark" aria-hidden="true">✳</span><span><strong>ستيكرز</strong><small>حاجات صغيرة، فرحة كبيرة</small></span></a>
      <nav className="main-nav" aria-label="التنقل الرئيسي"><a href="#catalog">تسوّق</a><a href="#how-it-works">إزاي بنشتغل؟</a><a href="#about">عن ستيكرز</a></nav>
      <button className="cart-button" type="button" onClick={() => setCartNotice(!cartNotice)} aria-expanded={cartNotice}>السلة <span className="cart-count">0</span></button>
    </header>
    {cartNotice && <div className="cart-notice" role="status">سلتك لسه فاضية. استكشف المنتجات قريبًا!</div>}
    <main>
      <section className="hero" id="home">
        <div className="hero-copy"><span className="eyebrow">✦ لمسة شخصية في كل تفصيلة</span><h1>خلي حاجات طفلك<br /><span>تشبهه هو!</span></h1><p>ملصقات مدرسية وهدايا بتصميم مخصص، معمولة عشان تضيف لمسة فرحة وحكاية صغيرة لكل حاجة بيحبها طفلك.</p><a className="primary-button" href="#catalog">اكتشف منتجاتنا <span aria-hidden="true">←</span></a><div className="hero-notes"><span>♡ تفاصيل على ذوقك</span><span>✿ تصميم بحب</span></div></div>
        <div className="hero-art" aria-label="رسم توضيحي لملصقات ملونة" role="img"><div className="sun-shape"/><div className="sticker sticker-star">✦</div><div className="sticker sticker-heart">♥</div><div className="sticker sticker-flower">✿</div><div className="name-card"><span className="tiny-label">MADE JUST FOR YOU</span><strong>حاجتك<br />باسمك ✨</strong><span className="name-card-footer">little things, big smiles</span></div><div className="sticker sticker-smile">☺</div><div className="floating-caption">اختار · خصّص · افرح</div></div>
      </section>
      <section className="trust-strip" aria-label="مميزات ستيكرز"><div><span>✎</span><span><strong>تصميم مخصص</strong><small>تفاصيل على ذوقك</small></span></div><div><span>♡</span><span><strong>معمولة بحب</strong><small>كل تفصيلة تفرق</small></span></div><div><span>✿</span><span><strong>للحظات الحلوة</strong><small>مدرسة، هدايا، ومناسبات</small></span></div></section>
      <section className="catalog-section" id="catalog">
        <div className="section-heading"><div><span className="eyebrow">اختار اللي يشبهه</span><h2>حاجات حلوة، بتفاصيلك</h2><p>قريبًا هتقدر تختار المنتج وتضيف الاسم والتصميم اللي بتحبه.</p></div><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">ابحث في المنتجات</span><input type="search" aria-label="ابحث في المنتجات" placeholder="بتدور على إيه؟" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
        <div className="category-list" aria-label="تصنيفات المنتجات">{categories.map((item) => <button className={category === item.id ? 'category-chip active' : 'category-chip'} key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
        <div className="empty-catalog"><div className="empty-illustration" aria-hidden="true"><span className="empty-sheet">✦<br /><small>ستيكر</small></span><span className="empty-spark spark-one">✧</span><span className="empty-spark spark-two">✿</span></div><h3>{query.trim() ? 'لسه بنجهز الكتالوج' : 'قريبًا: ' + selectedCategory}</h3><p>{query.trim() ? 'بحثك عن «' + query.trim() + '» ظاهر هنا، لكن المنتجات لم تُربط بالكتالوج بعد.' : 'بنجهز المنتجات والتصميمات عشان تختار وتخصص طلبك بسهولة. مفيش منتجات أو أسعار منشورة لحد دلوقتي.'}</p>{query.trim() && <button className="text-button" type="button" onClick={() => setQuery('')}>مسح البحث</button>}</div>
      </section>
      <section className="how-section" id="how-it-works"><span className="eyebrow">بكل بساطة</span><h2>حكاية تصميمك بتبدأ هنا</h2><div className="steps-grid"><article><span className="step-number">01</span><h3>اختار المنتج</h3><p>حدد نوع الملصقات أو الهدية اللي محتاجها.</p></article><article><span className="step-number">02</span><h3>خليه بتفاصيلك</h3><p>أضف الاسم والتفاصيل المتاحة وشوف المعاينة.</p></article><article><span className="step-number">03</span><h3>راجع طلبك</h3><p>راجع التفاصيل قبل تأكيد الطلب والدفع.</p></article></div><p className="coming-note">الخطوات دي توضيحية للمرحلة القادمة؛ الطلبات والدفع لسه مش مفعّلين.</p></section>
      <section className="about-section" id="about"><div className="about-icon" aria-hidden="true">✳</div><div><h2>كل طفل له حكاية مختلفة</h2><p>وفكرتنا إن الحاجات اللي حواليه تعكس الحكاية دي. بنبني ستيكرز خطوة بخطوة عشان نوفر تجربة تخصيص سهلة وواضحة للأهل.</p></div></section>
    </main>
    <footer className="site-footer"><a className="footer-brand" href="#home">✳ ستيكرز</a><span>تفاصيل صغيرة، ذكريات كبيرة.</span><span>© {new Date().getFullYear()} ستيكرز</span></footer>
  </div>;
}
