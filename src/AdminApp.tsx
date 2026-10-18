import { useEffect, useState, type FormEvent } from 'react';

type CategoryId = 'school' | 'gifts' | 'bundles' | 'coloring' | 'moms' | 'party';
type Product = { id: string; name: string; price: number; category: CategoryId; description: string; image: string; active: boolean };
const categories: { id: CategoryId; label: string }[] = [{ id: 'school', label: 'المدرسة والحضانة' }, { id: 'party', label: 'أعياد الميلاد' }, { id: 'coloring', label: 'كتب التلوين' }, { id: 'moms', label: 'ركن الأم' }, { id: 'gifts', label: 'هدايا مخصصة' }, { id: 'bundles', label: 'مجموعات وباقات' }];
const categoryNames: Record<CategoryId, string> = { school: 'المدرسة والحضانة', gifts: 'هدايا مخصصة', bundles: 'مجموعات وباقات', coloring: 'كتب التلوين', moms: 'ركن الأم', party: 'أعياد الميلاد' };
const STORAGE_KEY = 'stickerz-preview-products-v1';
const money = (price: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(price);
function readProducts(): Product[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Product[]; } catch { return []; } }

export default function AdminApp() {
  const [products, setProducts] = useState<Product[]>(readProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [price, setPrice] = useState('');
  const [productCategory, setProductCategory] = useState<CategoryId>('school');
  const [description, setDescription] = useState(''); const [image, setImage] = useState('');
  const [formError, setFormError] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); } catch { setNotice('مساحة التخزين ممتلئة؛ جرّب صورة أصغر.'); } }, [products]);
  const resetForm = () => { setEditingId(null); setName(''); setPrice(''); setProductCategory('school'); setDescription(''); setImage(''); setFormError(''); };
  const editProduct = (p: Product) => { setEditingId(p.id); setName(p.name); setPrice(String(p.price)); setProductCategory(p.category); setDescription(p.description); setImage(p.image); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const saveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) { setFormError('اكتب اسم المنتج وسعرًا صحيحًا بالجنيه.'); return; }
    const product: Product = { id: editingId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())), name: name.trim(), price: numericPrice, category: productCategory, description: description.trim(), image, active: editingId ? products.find(p => p.id === editingId)?.active ?? true : true };
    setProducts(old => editingId ? old.map(p => p.id === editingId ? product : p) : [product, ...old]);
    setNotice(editingId ? 'تم تحديث المنتج على هذا الجهاز.' : 'تمت إضافة المنتج على هذا الجهاز.'); resetForm();
  };
  const pickImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFormError('اختار ملف صورة صالح.'); return; }
    if (file.size > 1200000) { setFormError('حجم الصورة لازم يكون أقل من 1.2 ميجابايت للمعاينة.'); return; }
    const reader = new FileReader(); reader.onload = () => { setImage(String(reader.result ?? '')); setFormError(''); }; reader.onerror = () => setFormError('حصلت مشكلة أثناء قراءة الصورة.'); reader.readAsDataURL(file);
  };
  return <div className="app-shell">
    <div className="announcement">منطقة إدارة ستيكرز — للمعاينة فقط</div>
    <header className="site-header"><a className="brand" href="./" aria-label="ستيكرز"><span className="brand-mark">✳</span><span><strong>ستيكرز</strong><small>إدارة المنتجات</small></span></a><div className="header-actions"><a className="secondary-button" href="./">العودة للمتجر</a></div></header>
    <main className="admin-page">
      <div className="admin-title"><div><span className="eyebrow">إدارة الكتالوج</span><h1>لوحة إدارة المنتجات</h1><p>أضف المنتجات وعدّل الأسعار والصور.</p></div></div>
      <div className="preview-warning"><strong>تنبيه أمان:</strong> هذه لوحة تجريبية غير محمية بتسجيل دخول، والبيانات محفوظة في المتصفح الحالي فقط. لا تدخل بيانات عملاء أو طلبات حقيقية ولا تعتبرها لوحة إدارة آمنة.</div>
      <div className="admin-layout"><form className="product-form" onSubmit={saveProduct}>
        <h2>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
        <label>اسم المنتج<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: ملصقات اسم للمدرسة" /></label>
        <label>السعر بالجنيه المصري<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 120" /></label>
        <label>التصنيف<select value={productCategory} onChange={e => setProductCategory(e.target.value as CategoryId)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label>وصف المنتج<textarea rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل المنتج والمقاس والخامة..." /></label>
        <label>صورة المنتج<input type="file" accept="image/*" onChange={e => pickImage(e.target.files?.[0])} /></label>
        {image && <div className="image-preview"><img src={image} alt="معاينة صورة المنتج" /><button type="button" className="text-button" onClick={() => setImage('')}>إزالة الصورة</button></div>}
        {formError && <p className="form-error" role="alert">{formError}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
        <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>{editingId && <button type="button" className="secondary-button" onClick={resetForm}>إلغاء</button>}</div>
      </form>
      <section className="admin-products"><div className="admin-list-heading"><h2>المنتجات ({products.length})</h2><span>السعر بالجنيه المصري</span></div>
        {products.length === 0 ? <div className="admin-empty"><span>✳</span><h3>لسه مفيش منتجات</h3><p>املأ النموذج لإضافة أول منتج.</p></div> : <div className="admin-product-list">{products.map(p => <article className="admin-product-row" key={p.id}><div className="admin-thumb">{p.image ? <img src={p.image} alt="" /> : <span>✳</span>}</div><div className="admin-product-info"><strong>{p.name}</strong><span>{categoryNames[p.category]}</span><b>{money(p.price)}</b><small>{p.active ? 'ظاهر في المتجر' : 'مخفي من المتجر'}</small></div><div className="admin-product-actions"><button type="button" className="secondary-button" onClick={() => editProduct(p)}>تعديل</button><button type="button" className="secondary-button" onClick={() => setProducts(old => old.map(x => x.id === p.id ? {...x, active: !x.active} : x))}>{p.active ? 'إخفاء' : 'إظهار'}</button><button type="button" className="danger-button" onClick={() => { if (window.confirm('متأكد إنك عاوز تحذف المنتج؟')) setProducts(old => old.filter(x => x.id !== p.id)); }}>حذف</button></div></article>)}</div>}
      </section></div>
    </main>
    <footer className="site-footer"><a className="footer-brand" href="./">✳ ستيكرز</a><span>لوحة معاينة غير متصلة بقاعدة بيانات</span></footer>
  </div>;
}
