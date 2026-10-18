import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { firebaseConfigured } from './firebase';
import { subscribeToActiveProducts, type Product } from './firebase-products';

type CategoryId = 'school' | 'gifts' | 'bundles' | 'coloring' | 'moms' | 'party';
const categories: { id: CategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'كل المنتجات' }, { id: 'school', label: 'المدرسة والحضانة' },
  { id: 'party', label: 'أعياد الميلاد' }, { id: 'coloring', label: 'كتب التلوين' },
  { id: 'moms', label: 'ركن الأم' }, { id: 'gifts', label: 'هدايا مخصصة' }, { id: 'bundles', label: 'مجموعات وباقات' },
];
const categoryNames: Record<CategoryId, string> = { school: 'المدرسة والحضانة', gifts: 'هدايا مخصصة', bundles: 'مجموعات وباقات', coloring: 'كتب التلوين', moms: 'ركن الأم', party: 'أعياد الميلاد' };
const STORAGE_KEY = 'stickerz-preview-products-v1';
function readProducts(): Product[] {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as Product[] : []; }
  catch { return []; }
}
const money = (price: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(price);

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [cartNotice, setCartNotice] = useState(false);
  const [childPhoto, setChildPhoto] = useState('');
  const [childName, setChildName] = useState('');
  const [previewKind, setPreviewKind] = useState<'school' | 'birthday' | 'tag'>('school');
  const [photoNotice, setPhotoNotice] = useState('');
  const [products, setProducts] = useState<Product[]>(() => firebaseConfigured ? [] : readProducts());
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => {
    if (!firebaseConfigured) return;
    return subscribeToActiveProducts(setProducts, () => {
      setCatalogError('تعذر تحميل المنتجات من قاعدة البيانات. راجع إعداد Firebase وقواعد Firestore؛ لم نعرض بيانات الجهاز كبديل.');
    });
  }, []);
  const visibleProducts = useMemo(() => products.filter(p => p.active && (category === 'all' || p.category === category) && (p.name + ' ' + p.description).toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar'))), [products, category, query]);

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoNotice('اختار صورة بصيغة صورة مثل JPG أو PNG.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoNotice('الصورة كبيرة؛ اختار صورة أقل من 5 ميجابايت.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setChildPhoto(String(reader.result || '')); setPhotoNotice('دي معاينة تجريبية على الشاشة؛ الصورة لا تُرسل إلى خادم.'); };
    reader.onerror = () => setPhotoNotice('ما قدرناش نقرأ الصورة. جرّب صورة تانية.');
    reader.readAsDataURL(file);
  };

  return <div className="app-shell">
    <div className="announcement">مصممة بحب، لتفاصيل تشبه طفلك ✦</div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="ستيكرز — الرئيسية"><span className="brand-mark" aria-hidden="true">✳</span><span><strong>ستيكرز</strong><small>حاجات صغيرة، فرحة كبيرة</small></span></a>
      <nav className="main-nav" aria-label="التنقل الرئيسي"><a href="#catalog">تسوّق</a><a href="#customizer">صمّم منتجك</a><a href="#how-it-works">إزاي بنشتغل؟</a><a href="#moms">ركن الأم</a></nav>
      <div className="header-actions"><button className="cart-button" type="button" onClick={() => setCartNotice(!cartNotice)} aria-expanded={cartNotice}>السلة <span className="cart-count">0</span></button></div>
    </header>
    {cartNotice && <div className="cart-notice" role="status">السلة تجريبية حاليًا؛ تأكيد الطلبات لم يتم تفعيله بعد.</div>}
    <main>
      <section className="hero" id="home">
        <div className="hero-copy"><span className="eyebrow">✦ مش مجرد استيكر… دي صورة طفلك!</span><h1>شوف صورة طفلك<br /><span>على منتجه قبل ما تطلبه</span></h1><p>اختار منتجك، ارفع صورة طفلك، وشوف معاينة شخصية لستيكرات المدرسة وزينة أعياد الميلاد. وكمان هتلاقي كتب تلوين ومنتجات مخصوص للأم.</p><a className="primary-button" href="#customizer">جرّب تخصّص منتجك <span aria-hidden="true">←</span></a><div className="hero-notes"><span>♡ تخصيص بصورتك</span><span>✿ اختيارات للطفل والأم</span></div></div>
        <div className="hero-art" aria-label="رسم توضيحي لمنتجات ستيكرز" role="img"><div className="sun-shape"/><div className="sticker sticker-star">✦</div><div className="sticker sticker-heart">♥</div><div className="sticker sticker-flower">✿</div><div className="name-card"><span className="tiny-label">MADE JUST FOR YOU</span><strong>حكاية<br />بصورتك ✨</strong><span className="name-card-footer">little things, big smiles</span></div><div className="sticker sticker-smile">☺</div><div className="floating-caption">ارفع · شوف · خصّص</div></div>
      </section>
      <section className="trust-strip" aria-label="مميزات ستيكرز"><div><span>◎</span><span><strong>معاينة بالصورة</strong><small>شوف الفكرة قبل الطلب</small></span></div><div><span>♡</span><span><strong>للطفل وللأم</strong><small>منتجات متنوعة</small></span></div><div><span>✿</span><span><strong>للمدرسة والمناسبات</strong><small>تفاصيل على ذوقك</small></span></div></section>

      <section className="customizer-section" id="customizer">
        <div className="section-heading"><div><span className="eyebrow">جرّب بنفسك</span><h2>صمّم منتج بصورة طفلك</h2><p>ارفع صورة من جهازك، واختار نوع التصميم، وشوف معاينة مباشرة.</p></div></div>
        <div className="customizer-grid">
          <div className="customizer-controls">
            <label className="upload-drop"><span className="upload-icon">↑</span><strong>{childPhoto ? 'غيّر صورة الطفل' : 'ارفع صورة الطفل'}</strong><small>JPG أو PNG — بحد أقصى 5 ميجابايت</small><input type="file" accept="image/*" onChange={uploadPhoto} aria-label="ارفع صورة الطفل" /></label>
            <label className="field-label">اسم الطفل (اختياري)<input type="text" value={childName} maxLength={32} onChange={event => setChildName(event.target.value)} placeholder="مثال: ياسين" /></label>
            <span className="field-label">اختار شكل المنتج</span>
            <div className="preview-options">
              <button type="button" className={previewKind === 'school' ? 'preview-option selected' : 'preview-option'} onClick={() => setPreviewKind('school')}>استيكر مدرسة</button>
              <button type="button" className={previewKind === 'birthday' ? 'preview-option selected' : 'preview-option'} onClick={() => setPreviewKind('birthday')}>زينة عيد ميلاد</button>
              <button type="button" className={previewKind === 'tag' ? 'preview-option selected' : 'preview-option'} onClick={() => setPreviewKind('tag')}>تيكت شنطة</button>
            </div>
            {photoNotice && <p className="photo-notice" role="status">{photoNotice}</p>}
            <p className="privacy-note">🔒 المعاينة دي بتتم داخل متصفحك فقط. ما ترفعش صور أطفال حساسة أو خاصة. الميزة دي نموذج تجريبي وليست طلب شراء.</p>
          </div>
          <div className="preview-stage" aria-label="معاينة التصميم">
            <div className={'product-mockup mockup-' + previewKind}>
              <span className="mockup-caption">{previewKind === 'school' ? 'ملصق مدرسي' : previewKind === 'birthday' ? 'عيد ميلاد سعيد' : 'تيكت الشنطة'}</span>
              <div className="mockup-photo">{childPhoto ? <img src={childPhoto} alt="معاينة صورة الطفل على المنتج" /> : <span className="photo-placeholder">صورة<br />طفلك</span>}</div>
              <strong>{childName.trim() || 'اسم الطفل'}</strong>
              <span className="mockup-subtitle">{previewKind === 'school' ? 'أدواتي المدرسية' : previewKind === 'birthday' ? 'يوم مميز 🎉' : 'دي شنطتي!'}</span>
              <span className="mockup-spark">✦</span>
            </div>
            <p>معاينة شكلية للتصميم — الشكل النهائي يعتمد على قالب الطباعة.</p>
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading"><div><span className="eyebrow">اختار اللي يناسبك</span><h2>اكتشف أقسام ستيكرز</h2><p>الكتالوج الفعلي هيتعرض هنا بعد إضافة المنتجات والأسعار من لوحة الإدارة.</p></div><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">ابحث في المنتجات</span><input type="search" aria-label="ابحث في المنتجات" placeholder="بتدور على إيه؟" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
        <div className="category-list" aria-label="تصنيفات المنتجات">{categories.map(item => <button className={category === item.id ? 'category-chip active' : 'category-chip'} key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id as CategoryId | 'all')}>{item.label}</button>)}</div>
        {catalogError && <p className="photo-notice" role="alert">{catalogError}</p>}
        {!firebaseConfigured && <p className="backup-help">وضع معاينة محلي: المنتجات محفوظة على هذا الجهاز فقط.</p>}
        {visibleProducts.length ? <div className="store-product-grid">{visibleProducts.map(p => <article className="store-product-card" key={p.id}><div className="store-product-image">{(p.imageUrl || p.image) ? <img src={p.imageUrl || p.image} alt={p.name} /> : <span>✳</span>}</div><div className="store-product-copy"><small>{categoryNames[p.category]}</small><h3>{p.name}</h3>{p.description && <p>{p.description}</p>}<strong>{money(p.price)}</strong></div></article>)}</div> : <div className="empty-catalog"><div className="empty-illustration" aria-hidden="true"><span className="empty-sheet">✦<br /><small>ستيكر</small></span><span className="empty-spark spark-one">✧</span><span className="empty-spark spark-two">✿</span></div><h3>{query.trim() ? 'مفيش منتجات مطابقة للبحث' : 'لسه مفيش منتجات مضافة'}</h3><p>{query.trim() ? 'جرّب كلمة تانية أو امسح البحث.' : 'أقسام المدرسة، أعياد الميلاد، كتب التلوين وركن الأم جاهزة للتنظيم؛ المنتجات والأسعار الحقيقية لسه محتاجة إضافة.'}</p>{query.trim() && <button className="text-button" type="button" onClick={() => setQuery('')}>مسح البحث</button>}</div>}
      </section>
      <section className="how-section" id="how-it-works"><span className="eyebrow">بكل بساطة</span><h2>من الصورة للمنتج</h2><div className="steps-grid"><article><span className="step-number">01</span><h3>اختار القسم والمنتج</h3><p>مدرسة، عيد ميلاد، كتب تلوين أو منتجات للأم.</p></article><article><span className="step-number">02</span><h3>خصّص وشوف المعاينة</h3><p>ارفع الصورة وعدّل الاسم وشوف الشكل على الشاشة.</p></article><article><span className="step-number">03</span><h3>راجع التصميم قبل الطلب</h3><p>الربط بالإنتاج والطلبات والدفع هيتم في مرحلة لاحقة.</p></article></div><p className="coming-note">المعاينة التفاعلية نموذج أولي؛ الطلبات والدفع وحفظ ملفات الطباعة غير مفعّلين.</p></section>
      <section className="about-section" id="moms"><div className="about-icon" aria-hidden="true">♡</div><div><h2>ركن الأم كمان له مكان</h2><p>ستيكرز مش للطفل بس؛ هنضيف منتجات للأم وكتب تلوين وأنشطة وهدايا للمناسبات، مع تخصيص يناسب كل نوع منتج.</p></div></section>
    </main>
    <footer className="site-footer"><a className="footer-brand" href="#home">✳ ستيكرز</a><span>تفاصيل صغيرة، ذكريات كبيرة.</span><span>© {new Date().getFullYear()} ستيكرز</span></footer>
  </div>;
}
