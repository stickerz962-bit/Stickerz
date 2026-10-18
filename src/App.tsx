import { useEffect, useMemo, useState } from 'react';

type CategoryId = 'school' | 'gifts' | 'bundles';
type Product = { id: string; name: string; price: number; category: CategoryId; description: string; image: string; active: boolean };
const categories: { id: CategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'كل المنتجات' }, { id: 'school', label: 'ملصقات مدرسية' },
  { id: 'gifts', label: 'هدايا مخصصة' }, { id: 'bundles', label: 'مجموعات وباقات' },
];
const categoryNames: Record<CategoryId, string> = { school: 'ملصقات مدرسية', gifts: 'هدايا مخصصة', bundles: 'مجموعات وباقات' };
const STORAGE_KEY = 'stickerz-preview-products-v1';
const starterProducts: Product[] = [];
function readProducts(): Product[] {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) as Product[] : starterProducts; }
  catch { return starterProducts; }
}
const money = (price: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(price);

export default function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [cartNotice, setCartNotice] = useState(false);
  const [admin, setAdmin] = useState(window.location.hash === '#admin');
  const [products, setProducts] = useState<Product[]>(readProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [productCategory, setProductCategory] = useState<CategoryId>('school');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const onHash = () => setAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch { setNotice('مساحة التخزين ممتلئة؛ جرّب صورة أصغر.'); } }, [products]);
  const visibleProducts = useMemo(() => products.filter(p => p.active && (category === 'all' || p.category === category) && (p.name + ' ' + p.description).toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar'))), [products, category, query]);
  const resetForm = () => { setEditingId(null); setName(''); setPrice(''); setProductCategory('school'); setDescription(''); setImage(''); setFormError(''); };
  const editProduct = (p: Product) => { setEditingId(p.id); setName(p.name); setPrice(String(p.price)); setProductCategory(p.category); setDescription(p.description); setImage(p.image); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const saveProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) { setFormError('اكتب اسم المنتج وسعرًا صحيحًا بالجنيه.'); return; }
    const product: Product = { id: editingId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())), name: name.trim(), price: numericPrice, category: productCategory, description: description.trim(), image, active: true };
    setProducts(old => editingId ? old.map(p => p.id === editingId ? product : p) : [product, ...old]);
    setNotice(editingId ? 'تم تحديث المنتج وسعره على هذا الجهاز.' : 'تمت إضافة المنتج وسعره على هذا الجهاز.');
    resetForm();
  };
  const pickImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('اختار ملف صورة صالح.'); return; }
    if (file.size > 1200000) { setFormError('حجم الصورة لازم يكون أقل من 1.2 ميجابايت للمعاينة.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result ?? '')); setFormError(''); };
    reader.onerror = () => setFormError('حصلت مشكلة أثناء قراءة الصورة.');
    reader.readAsDataURL(file);
  };

  return <div className="app-shell">
    <div className="announcement">مصممة بحب، لتفاصيل تشبه طفلك ✦</div>
    <header className="site-header">
      <a className="brand" href="#home" aria-label="ستيكرز — الرئيسية"><span className="brand-mark" aria-hidden="true">✳</span><span><strong>ستيكرز</strong><small>حاجات صغيرة، فرحة كبيرة</small></span></a>
      <nav className="main-nav" aria-label="التنقل الرئيسي"><a href="#catalog">تسوّق</a><a href="#how-it-works">إزاي بنشتغل؟</a><a href="#about">عن ستيكرز</a></nav>
      <div className="header-actions"><a className="admin-link" href="#admin" onClick={() => setAdmin(true)}>لوحة الإدارة</a><button className="cart-button" type="button" onClick={() => setCartNotice(!cartNotice)} aria-expanded={cartNotice}>السلة <span className="cart-count">0</span></button></div>
    </header>
    {admin ? <main className="admin-page">
      <div className="admin-title"><div><span className="eyebrow">إدارة الكتالوج</span><h1>لوحة إدارة المنتجات</h1><p>أضف المنتجات وعدّل الأسعار والصور، ثم اعرضها في واجهة المتجر.</p></div><a className="primary-button" href="#catalog" onClick={() => setAdmin(false)}>عرض المتجر ←</a></div>
      <div className="preview-warning"><strong>تنبيه مهم للمعاينة:</strong> التغييرات محفوظة في متصفحك وعلى جهازك فقط. لوحة الإدارة دي تجريبية بدون تسجيل دخول أو قاعدة بيانات مشتركة؛ ما تستخدمهاش لإدارة بيانات أو طلبات حقيقية لحد ربط Firebase وتأمين صلاحيات المدير.</div>
      <div className="admin-layout"><form className="product-form" onSubmit={saveProduct}>
        <h2>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
        <label>اسم المنتج<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: ملصقات اسم للمدرسة" /></label>
        <label>السعر بالجنيه المصري<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 120" /></label>
        <label>التصنيف<select value={productCategory} onChange={e => setProductCategory(e.target.value as CategoryId)}>{categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label>وصف المنتج<textarea rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل المنتج والمقاس والخامة..." /></label>
        <label>صورة المنتج<input type="file" accept="image/*" onChange={e => pickImage(e.target.files?.[0])} /></label>
        {image && <div className="image-preview"><img src={image} alt="معاينة صورة المنتج" /><button type="button" className="text-button" onClick={() => setImage('')}>إزالة الصورة</button></div>}
        {formError && <p className="form-error" role="alert">{formError}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>{editingId && <button type="button" className="secondary-button" onClick={resetForm}>إلغاء</button>}</div>
      </form>
      <section className="admin-products"><div className="admin-list-heading"><h2>المنتجات ({products.length})</h2><span>السعر بالجنيه المصري</span></div>
        {products.length === 0 ? <div className="admin-empty"><span>✳</span><h3>لسه مفيش منتجات</h3><p>املأ النموذج لإضافة أول منتج وسعره.</p></div> : <div className="admin-product-list">{products.map(p => <article className="admin-product-row" key={p.id}><div className="admin-thumb">{p.image ? <img src={p.image} alt="" /> : <span>✳</span>}</div><div className="admin-product-info"><strong>{p.name}</strong><span>{categoryNames[p.category]}</span><b>{money(p.price)}</b><small>{p.active ? 'ظاهر في المتجر' : 'مخفي من المتجر'}</small></div><div className="admin-product-actions"><button type="button" className="secondary-button" onClick={() => editProduct(p)}>تعديل</button><button type="button" className="secondary-button" onClick={() => setProducts(old => old.map(x => x.id === p.id ? {...x, active: !x.active} : x))}>{p.active ? 'إخفاء' : 'إظهار'}</button><button type="button" className="danger-button" onClick={() => { if (window.confirm('متأكد إنك عاوز تحذف المنتج؟')) setProducts(old => old.filter(x => x.id !== p.id)); }}>حذف</button></div></article>)}</div>}
      </section></div>
    </main> : <>
      {cartNotice && <div className="cart-notice" role="status">السلة تجريبية حاليًا؛ تأكيد الطلبات لم يتم تفعيله بعد.</div>}
      <main>
        <section className="hero" id="home">
          <div className="hero-copy"><span className="eyebrow">✦ لمسة شخصية في كل تفصيلة</span><h1>خلي حاجات طفلك<br /><span>تشبهه هو!</span></h1><p>ملصقات مدرسية وهدايا بتصميم مخصص، معمولة عشان تضيف لمسة فرحة وحكاية صغيرة لكل حاجة بيحبها طفلك.</p><a className="primary-button" href="#catalog">اكتشف منتجاتنا <span aria-hidden="true">←</span></a><div className="hero-notes"><span>♡ تفاصيل على ذوقك</span><span>✿ تصميم بحب</span></div></div>
          <div className="hero-art" aria-label="رسم توضيحي لملصقات ملونة" role="img"><div className="sun-shape"/><div className="sticker sticker-star">✦</div><div className="sticker sticker-heart">♥</div><div className="sticker sticker-flower">✿</div><div className="name-card"><span className="tiny-label">MADE JUST FOR YOU</span><strong>حاجتك<br />باسمك ✨</strong><span className="name-card-footer">little things, big smiles</span></div><div className="sticker sticker-smile">☺</div><div className="floating-caption">اختار · خصّص · افرح</div></div>
        </section>
        <section className="trust-strip" aria-label="مميزات ستيكرز"><div><span>✎</span><span><strong>تصميم مخصص</strong><small>تفاصيل على ذوقك</small></span></div><div><span>♡</span><span><strong>معمولة بحب</strong><small>كل تفصيلة تفرق</small></span></div><div><span>✿</span><span><strong>للحظات الحلوة</strong><small>مدرسة، هدايا، ومناسبات</small></span></div></section>
        <section className="catalog-section" id="catalog">
          <div className="section-heading"><div><span className="eyebrow">اختار اللي يشبهه</span><h2>حاجات حلوة، بتفاصيلك</h2><p>اختار منتجك وشوف سعره، والطلب الإلكتروني هيتفعل في مرحلة لاحقة.</p></div><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">ابحث في المنتجات</span><input type="search" aria-label="ابحث في المنتجات" placeholder="بتدور على إيه؟" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
          <div className="category-list" aria-label="تصنيفات المنتجات">{categories.map(item => <button className={category === item.id ? 'category-chip active' : 'category-chip'} key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id as CategoryId | 'all')}>{item.label}</button>)}</div>
          {visibleProducts.length ? <div className="store-product-grid">{visibleProducts.map(p => <article className="store-product-card" key={p.id}><div className="store-product-image">{p.image ? <img src={p.image} alt={p.name} /> : <span>✳</span>}</div><div className="store-product-copy"><small>{categoryNames[p.category]}</small><h3>{p.name}</h3>{p.description && <p>{p.description}</p>}<strong>{money(p.price)}</strong></div></article>)}</div> : <div className="empty-catalog"><div className="empty-illustration" aria-hidden="true"><span className="empty-sheet">✦<br /><small>ستيكر</small></span><span className="empty-spark spark-one">✧</span><span className="empty-spark spark-two">✿</span></div><h3>{query.trim() ? 'مفيش منتجات مطابقة للبحث' : 'الكتالوج لسه فاضي'}</h3><p>{query.trim() ? 'جرّب كلمة تانية أو امسح البحث.' : 'المنتجات والأسعار هتظهر هنا بعد إضافتها من لوحة الإدارة.'}</p>{query.trim() && <button className="text-button" type="button" onClick={() => setQuery('')}>مسح البحث</button>}<a className="text-button" href="#admin" onClick={() => setAdmin(true)}>إدارة المنتجات</a></div>}
        </section>
        <section className="how-section" id="how-it-works"><span className="eyebrow">بكل بساطة</span><h2>حكاية تصميمك بتبدأ هنا</h2><div className="steps-grid"><article><span className="step-number">01</span><h3>اختار المنتج</h3><p>حدد نوع الملصقات أو الهدية اللي محتاجها.</p></article><article><span className="step-number">02</span><h3>خليه بتفاصيلك</h3><p>أضف الاسم والتفاصيل المتاحة وشوف المعاينة.</p></article><article><span className="step-number">03</span><h3>راجع طلبك</h3><p>راجع التفاصيل قبل تأكيد الطلب والدفع.</p></article></div><p className="coming-note">الطلبات والدفع لسه مش مفعّلين.</p></section>
        <section className="about-section" id="about"><div className="about-icon" aria-hidden="true">✳</div><div><h2>كل طفل له حكاية مختلفة</h2><p>وفكرتنا إن الحاجات اللي حواليه تعكس الحكاية دي. بنبني ستيكرز خطوة بخطوة عشان نوفر تجربة تخصيص سهلة وواضحة للأهل.</p></div></section>
      </main>
    </>}
    <footer className="site-footer"><a className="footer-brand" href="#home">✳ ستيكرز</a><span>تفاصيل صغيرة، ذكريات كبيرة.</span><span>© {new Date().getFullYear()} ستيكرز</span></footer>
  </div>;
}
