import { useEffect, useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import { firebaseConfigured } from './firebase';
import {
  hasAdminClaim, observeAuth, removeProduct, saveProduct, setProductActive,
  signInAdmin, signOutAdmin, subscribeToAllProducts, uploadProductImage,
  type CategoryId, type Product,
} from './firebase-products';

const categories: { id: CategoryId; label: string }[] = [
  { id: 'school', label: 'المدرسة والحضانة' }, { id: 'party', label: 'أعياد الميلاد' },
  { id: 'coloring', label: 'كتب التلوين' }, { id: 'moms', label: 'ركن الأم' },
  { id: 'gifts', label: 'هدايا مخصصة' }, { id: 'bundles', label: 'مجموعات وباقات' },
];
const categoryNames: Record<CategoryId, string> = {
  school: 'المدرسة والحضانة', gifts: 'هدايا مخصصة', bundles: 'مجموعات وباقات',
  coloring: 'كتب التلوين', moms: 'ركن الأم', party: 'أعياد الميلاد',
};
const money = (price: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(price);

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<CategoryId>('school');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => observeAuth(async current => {
    setUser(current); setAuthReady(true); setIsAdmin(false); setProducts([]);
    if (current) {
      try { setIsAdmin(await hasAdminClaim(current)); }
      catch { setError('تعذر التحقق من صلاحيات الحساب. سجّل الدخول مرة أخرى.'); }
    }
  }), []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    return subscribeToAllProducts(setProducts, () => setError('تعذر تحميل كتالوج Firestore. تحقق من قواعد البيانات وإعدادها.'));
  }, [user, isAdmin]);

  const resetForm = () => {
    setEditingId(undefined); setName(''); setPrice(''); setCategory('school');
    setDescription(''); setImageUrl(''); setImageFile(null); setFormError('');
  };
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const verified = await signInAdmin(email.trim(), password); setUser(verified); setIsAdmin(true); setPassword(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول. راجع البيانات وإعداد Firebase.'); }
    finally { setBusy(false); }
  };
  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setFormError(''); setNotice('');
    try {
      const numericPrice = Number(price);
      if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) throw new Error('اكتب اسم المنتج وسعرًا صحيحًا بالجنيه.');
      let finalImageUrl = imageUrl;
      if (imageFile) finalImageUrl = await uploadProductImage(imageFile);
      await saveProduct({ name: name.trim(), price: numericPrice, category, description: description.trim(), imageUrl: finalImageUrl, active: editingId ? products.find(p => p.id === editingId)?.active ?? true : true }, editingId);
      setNotice(editingId ? 'تم حفظ التعديلات في قاعدة البيانات.' : 'تمت إضافة المنتج إلى قاعدة البيانات.');
      resetForm();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'تعذر حفظ المنتج. تحقق من اتصال Firebase وصلاحيات المدير.'); }
    finally { setBusy(false); }
  };
  const editProduct = (product: Product) => {
    setEditingId(product.id); setName(product.name); setPrice(String(product.price));
    setCategory(product.category); setDescription(product.description); setImageUrl(product.imageUrl || '');
    setImageFile(null); setFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!firebaseConfigured) return <div className="app-shell"><main className="admin-page"><h1>لوحة إدارة ستيكرز</h1><div className="preview-warning">إعداد Firebase غير مكتمل في هذا البناء؛ الإدارة مقفولة حفاظًا على أمان البيانات.</div><a className="secondary-button" href="./">العودة للمتجر</a></main></div>;
  if (!authReady) return <div className="app-shell"><main className="admin-page"><p role="status">جارٍ التحقق من تسجيل الدخول…</p></main></div>;
  if (!user || !isAdmin) return <div className="app-shell"><main className="admin-page">
    <div className="admin-title"><div><span className="eyebrow">دخول آمن</span><h1>لوحة إدارة ستيكرز</h1><p>سجّل الدخول بحساب المدير المعتمد فقط.</p></div></div>
    {user && <div className="preview-warning">الحساب لا يحمل صلاحية المدير المطلوبة. يجب ضبط custom claim باسم admin من بيئة موثوقة.</div>}
    <form className="product-form" onSubmit={submitLogin}>
      <label>البريد الإلكتروني<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>كلمة المرور<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'جارٍ التحقق…' : 'تسجيل الدخول'}</button>
    </form>
    <p className="backup-help">لا يوجد إنشاء حساب مدير من هذه الصفحة. فعّل Email/Password واضبط صلاحية المدير من Firebase بشكل منفصل.</p>
    <a className="secondary-button" href="./">العودة للمتجر</a>
  </main></div>;

  return <div className="app-shell">
    <div className="announcement">منطقة إدارة ستيكرز — قاعدة بيانات مشتركة</div>
    <header className="site-header"><a className="brand" href="./" aria-label="ستيكرز"><span className="brand-mark">✳</span><span><strong>ستيكرز</strong><small>إدارة المنتجات</small></span></a><div className="header-actions"><a className="secondary-button" href="./">العودة للمتجر</a><button className="secondary-button" type="button" onClick={() => { void signOutAdmin(); }}>تسجيل الخروج</button></div></header>
    <main className="admin-page">
      <div className="admin-title"><div><span className="eyebrow">إدارة الكتالوج السحابي</span><h1>لوحة إدارة المنتجات</h1><p>التعديلات تُحفظ في Firestore، والصور في Firebase Storage.</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-layout">
        <form className="product-form" onSubmit={submitProduct}>
          <h2>{editingId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
          <label>اسم المنتج<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: ملصقات اسم للمدرسة" /></label>
          <label>السعر بالجنيه المصري<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="مثال: 120" /></label>
          <label>التصنيف<select value={category} onChange={e => setCategory(e.target.value as CategoryId)}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label>وصف المنتج<textarea rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="تفاصيل المنتج والمقاس والخامة..." /></label>
          <label>صورة المنتج<input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} /></label>
          {imageFile && <p className="backup-help">الصورة المختارة: {imageFile.name}</p>}
          {!imageFile && imageUrl && <div className="image-preview"><img src={imageUrl} alt="صورة المنتج الحالية" /><button type="button" className="text-button" onClick={() => setImageUrl('')}>إزالة الصورة</button></div>}
          {formError && <p className="form-error" role="alert">{formError}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
          <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : editingId ? 'حفظ التعديلات' : 'إضافة المنتج'}</button>{editingId && <button type="button" className="secondary-button" onClick={resetForm}>إلغاء</button>}</div>
        </form>
        <section className="admin-products"><div className="admin-list-heading"><h2>المنتجات ({products.length})</h2><span>السعر بالجنيه المصري</span></div>
          {products.length === 0 ? <div className="admin-empty"><span>✳</span><h3>لسه مفيش منتجات في قاعدة البيانات</h3><p>أضف أول منتج من النموذج.</p></div> : <div className="admin-product-list">{products.map(p => <article className="admin-product-row" key={p.id}><div className="admin-thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span>✳</span>}</div><div className="admin-product-info"><strong>{p.name}</strong><span>{categoryNames[p.category]}</span><b>{money(p.price)}</b><small>{p.active ? 'ظاهر في المتجر' : 'مخفي من المتجر'}</small></div><div className="admin-product-actions"><button type="button" className="secondary-button" onClick={() => editProduct(p)}>تعديل</button><button type="button" className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await setProductActive(p.id, !p.active); } catch { setError('تعذر تغيير حالة المنتج. تحقق من صلاحيات المدير.'); } finally { setBusy(false); } }}>{p.active ? 'إخفاء' : 'إظهار'}</button><button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!window.confirm('متأكد إنك عاوز تحذف المنتج من قاعدة البيانات؟')) return; setBusy(true); setError(''); try { await removeProduct(p.id); setNotice('تم حذف المنتج.'); } catch { setError('تعذر حذف المنتج. تحقق من صلاحيات المدير.'); } finally { setBusy(false); } }}>حذف</button></div></article>)}</div>}
        </section>
      </div>
    </main>
    <footer className="site-footer"><a className="footer-brand" href="./">✳ ستيكرز</a><span>إدارة الكتالوج عبر Firebase</span></footer>
  </div>;
}
