import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, firebaseConfigured, firestore } from './firebase/client';
import './styles.css';

type Category = { id: string; title: string; slug: string; sortOrder: number; active: boolean };
type Artwork = { id: string; title: string; categoryId: string; phrase: string; previewAssetRef: string; sortOrder: number; version: number; active: boolean };
type Cover = { id: string; title: string; subtitle: string; previewAssetRef: string; sortOrder: number; version: number; active: boolean };
type Order = { id: string; trackingToken?: string; publicReference?: string; customer?: { name?: string; phone?: string }; shipping?: { governorateName?: string; areaName?: string; address?: string; deliveryNotes?: string }; book?: { artworks?: Array<{ artworkId?: string; titleSnapshot?: string; printOrder?: number }>; cover?: { titleSnapshot?: string }; personalizedName?: string }; pricing?: { bookPrice?: number; standardBookPrice?: number; shippingFee?: number | null; totalAmount?: number | null; offerApplied?: boolean }; paymentMethod?: string; paymentStatus?: string; fulfillmentStatus?: string; partnerCode?: string | null; ambassadorReferralCode?: string | null; deliveredAt?: { toDate?: () => Date }; createdAt?: { toDate?: () => Date } };
type Tab = 'orders' | 'categories' | 'artworks' | 'covers' | 'shipping';
const orderStatuses = ['new','confirmed','pdf_generating','ready_for_printing','printing','quality_check','ready_for_shipping','shipped','delivered','cancelled'] as const;
const orderStatusLabels: Record<string,string> = { new:'طلب جديد', confirmed:'تم التأكيد', pdf_generating:'تجهيز PDF', ready_for_printing:'جاهز للطباعة', printing:'قيد الطباعة', quality_check:'مراجعة الجودة', ready_for_shipping:'جاهز للشحن', shipped:'تم الشحن', delivered:'تم التسليم', cancelled:'ملغي' };
const paymentStatusLabels: Record<string,string> = { unpaid:'غير مدفوع (الدفع عند الاستلام)', pending_review:'InstaPay — مراجعة مطلوبة', paid:'مدفوع', rejected:'مرفوض', refunded:'مسترد' };

const starterCategories = [
  ['responsibilities', 'فوضى المسؤوليات'], ['moods', 'تقلبات المزاج'],
  ['people-relationships', 'الناس والعلاقات'], ['coffee-food', 'قهوة وأكل'],
  ['love-relationships', 'حب وعلاقات'], ['work-money', 'شغل وفلوس'],
  ['home-family', 'البيت والعيلة'], ['self-care', 'اهتمام بنفسي'],
  ['overthinking', 'تفكير زيادة'], ['wisdom-humor', 'حكمة وضحك'],
] as const;

const emptyArtwork = { id: '', title: '', categoryId: '', phrase: '', previewAssetRef: '' };
const emptyCover = { id: '', title: '', subtitle: 'كتابك... على مزاجك!', previewAssetRef: '' };

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('orders');
  const [categories, setCategories] = useState<Category[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [covers, setCovers] = useState<Cover[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingFee, setShippingFee] = useState('');
  const [artworkForm, setArtworkForm] = useState(emptyArtwork);
  const [coverForm, setCoverForm] = useState(emptyCover);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [editingArtwork, setEditingArtwork] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      setAdminVerified(false);
      setAuthReady(true);
      if (!nextUser) return;
      try {
        const token = await nextUser.getIdTokenResult(true);
        setAdminVerified(token.claims.admin === true);
      } catch {
        setError('تعذر التحقق من صلاحيات الحساب. سجّلي الخروج ثم حاولي مرة أخرى.');
      }
    });
  }, []);

  const loadData = async () => {
    if (!firestore) return;
    setBusy(true); setError('');
    try {
      // Read the full collections and sort client-side. Firestore orderBy excludes
      // documents that don't have sortOrder, which can make legacy drafts disappear.
      const [categorySnap, artworkSnap, coverSnap, settingsSnap] = await Promise.all([
        getDocs(collection(firestore, 'categories')),
        getDocs(collection(firestore, 'artworks')),
        getDocs(collection(firestore, 'covers')),
        getDocs(collection(firestore, 'settings')),
      ]);
      const sortByOrder = <T extends { sortOrder?: number; id: string }>(items: T[]) =>
        items.sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id));
      setCategories(sortByOrder(categorySnap.docs.map(d => ({ id: d.id, ...d.data() } as Category))));
      setArtworks(sortByOrder(artworkSnap.docs.map(d => ({ id: d.id, ...d.data() } as Artwork))));
      setCovers(sortByOrder(coverSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cover))));
      const publicSettings = settingsSnap.docs.find(d => d.id === 'public')?.data();
      setShippingFee(typeof publicSettings?.shippingFee === 'number' ? String(publicSettings.shippingFee) : '');
    } catch {
      setError('تعذر تحميل بيانات الكتالوج. تأكدي من صلاحية admin:true ومن إعدادات Firestore.');
    } finally { setBusy(false); }
  };

  const saveShippingFee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;
    const fee = Number(shippingFee);
    if (!Number.isFinite(fee) || fee < 0 || fee > 5000 || !Number.isInteger(fee)) { setError('اكتبي سعر شحن صحيح من 0 إلى 5000 جنيه.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await setDoc(doc(firestore, 'settings', 'public'), { shippingFee: fee, updatedAt: serverTimestamp() }, { merge: true });
      setShippingFee(String(fee));
      setNotice('تم حفظ سعر الشحن. هيظهر تلقائيًا للعميلات في صفحة الطلبات الجديدة.');
    } catch { setError('تعذر حفظ سعر الشحن. تأكدي من صلاحية الأدمن وقواعد Firestore.'); }
    finally { setBusy(false); }
  };

  const loadOrders = async () => {
    if (!firestore) return;
    setBusy(true); setError('');
    try {
      const snap = await getDocs(query(collection(firestore, 'orders'), orderBy('createdAt', 'desc')));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    } catch {
      setError('تعذر تحميل الطلبات. تأكدي من صلاحية admin:true ومن قواعد Firestore المنشورة.');
    } finally { setBusy(false); }
  };

  const updateOrderPaymentStatus = async (order: Order, status: 'paid' | 'refunded') => {
    if (!firestore) return;
    const message = status === 'refunded'
      ? 'تأكدي أن قيمة الطلب تم ردها بالفعل للعميلة قبل تسجيل الاسترداد. سيتم عكس مكافأة السفيرة إن وُجدت. متابعة؟'
      : 'تأكيد استلام قيمة هذا الطلب؟';
    if (!window.confirm(message)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateDoc(doc(firestore, 'orders', order.id), { paymentStatus: status, updatedAt: serverTimestamp() });
      await loadOrders();
      setNotice(status === 'refunded' ? 'تم تسجيل رد قيمة الطلب، وسيتم عكس مكافأة الإحالة تلقائيًا.' : 'تم تسجيل استلام قيمة الطلب.');
    } catch { setError('تعذر تحديث حالة الدفع.'); }
    finally { setBusy(false); }
  };

  const updateOrderStatus = async (order: Order, status: string) => {
    if (!firestore) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'orders', order.id), { fulfillmentStatus: status, ...(status === 'delivered' ? { deliveredAt: serverTimestamp() } : {}), updatedAt: serverTimestamp() });
      if (order.trackingToken) batch.update(doc(firestore, 'orderTracking', order.trackingToken), { fulfillmentStatus: status, updatedAt: serverTimestamp() });
      await batch.commit();
      await loadOrders();
      setNotice('تم تحديث حالة الطلب ' + (order.publicReference || order.id));
    } catch { setError('تعذر تحديث حالة الطلب. راجعي صلاحيات الأدمن وقواعد Firestore.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (user && adminVerified) { void loadData(); void loadOrders(); }
  }, [user, adminVerified]);

  const filteredArtworks = useMemo(() => artworks.filter(item =>
    (filterCategory === 'all' || item.categoryId === filterCategory) &&
    (item.id.toLowerCase().includes(search.toLowerCase()) || item.title.includes(search) || item.phrase.includes(search))
  ), [artworks, filterCategory, search]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!auth) throw new Error('Firebase Auth غير مهيأ.');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch {
      setError('تعذر تسجيل الدخول. راجعي البريد وكلمة المرور وتفعيل Email/Password في Firebase Authentication.');
    } finally { setBusy(false); }
  };

  const logout = async () => { if (auth) await signOut(auth); setUser(null); setAdminVerified(false); };

  const seedCategories = async () => {
    if (!firestore) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const existing = new Set(categories.map(item => item.id));
      const batch = writeBatch(firestore);
      let added = 0;
      starterCategories.forEach(([id, title], index) => {
        if (existing.has(id)) return;
        batch.set(doc(firestore!, 'categories', id), { title, slug: id, sortOrder: index + 1, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        added++;
      });
      if (added) await batch.commit();
      await loadData();
      setNotice(added ? `تم إنشاء ${added} تصنيفًا أساسيًا.` : 'التصنيفات الأساسية موجودة بالفعل؛ لم يتم استبدال أي تعديل سابق.');
    } catch { setError('تعذر إنشاء التصنيفات.'); }
    finally { setBusy(false); }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !categoryTitle.trim()) return;
    const slug = slugify(categoryTitle) || `category-${Date.now()}`;
    if (categories.some(item => item.id === slug)) { setError('التصنيف موجود بالفعل.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await setDoc(doc(firestore, 'categories', slug), { title: categoryTitle.trim(), slug, sortOrder: categories.length + 1, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setCategoryTitle(''); await loadData(); setNotice('تم حفظ التصنيف.');
    } catch { setError('تعذر حفظ التصنيف. قد يكون المعرف مستخدمًا بالفعل.'); }
    finally { setBusy(false); }
  };

  const compressImageForFirestore = async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) throw new Error('اختاري ملف صورة فقط.');
    if (file.size > 12 * 1024 * 1024) throw new Error('حجم الصورة قبل الضغط يجب ألا يتجاوز 12 ميجابايت.');
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز الصورة.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let quality = 0.72;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > 430_000 && quality > 0.35) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > 430_000) throw new Error('الصورة كبيرة جدًا حتى بعد الضغط. اختاري صورة أصغر.');
    return dataUrl;
  };

  const saveArtwork = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;
    const id = artworkForm.id.trim().toUpperCase();
    if (!/^AP-\d{3}$/.test(id) || !artworkForm.title.trim() || !artworkForm.categoryId) {
      setError('الكود يجب أن يكون AP-001 إلى AP-100، مع اسم وتصنيف.');
      return;
    }
    const existing = artworks.find(item => item.id === id);
    if (existing && !editingArtwork) { setError('هذا الكود موجود بالفعل. افتحيه من القائمة للتعديل.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await setDoc(doc(firestore, 'artworks', id), {
        title: artworkForm.title.trim(), categoryId: artworkForm.categoryId,
        phrase: artworkForm.phrase.trim(), previewAssetRef: artworkForm.previewAssetRef.trim(),
        sortOrder: existing?.sortOrder ?? artworks.length + 1, version: (existing?.version ?? 0) + 1,
        active: existing?.active ?? false, updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
      setArtworkForm(emptyArtwork); setEditingArtwork(false); await loadData();
      setNotice(existing ? 'تم تحديث الرسمة. حالة النشر لم تتغير.' : 'تم حفظ الرسمة كمسودة مخفية؛ راجعيها ثم انشريها.');
    } catch (err) { const detail = err instanceof Error ? err.message : String(err); setError('تعذر حفظ الرسمة في Firestore. (' + detail + ')'); }
    finally { setBusy(false); }
  };

  const editArtwork = (item: Artwork) => {
    setArtworkForm({ id: item.id, title: item.title, categoryId: item.categoryId, phrase: item.phrase || '', previewAssetRef: item.previewAssetRef || '' });
    setEditingArtwork(true); setTab('artworks'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setArtworkActive = async (item: Artwork) => {
    if (!firestore) return;
    setBusy(true); setError('');
    try {
      await setDoc(doc(firestore, 'artworks', item.id), { active: !item.active, updatedAt: serverTimestamp(), version: (item.version || 0) + 1 }, { merge: true });
      await loadData(); setNotice(!item.active ? 'تم نشر الرسمة.' : 'تم إخفاء الرسمة.');
    } catch { setError('تعذر تغيير حالة النشر.'); }
    finally { setBusy(false); }
  };

  const saveCover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore) return;
    const id = coverForm.id.trim().toUpperCase();
    if (!/^AP-COVER-0[1-5]$/.test(id) || !coverForm.title.trim()) {
      setError('كود الغلاف يجب أن يكون AP-COVER-01 إلى AP-COVER-05، مع اسم الغلاف.');
      return;
    }
    const existing = covers.find(item => item.id === id);
    if (existing && !editingCover) { setError('هذا الغلاف موجود بالفعل. افتحيه من القائمة للتعديل.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await setDoc(doc(firestore, 'covers', id), {
        title: coverForm.title.trim(), subtitle: coverForm.subtitle.trim(),
        previewAssetRef: coverForm.previewAssetRef.trim(),
        sortOrder: existing?.sortOrder ?? covers.length + 1, version: (existing?.version ?? 0) + 1,
        active: existing?.active ?? false, updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true });
      setCoverForm(emptyCover); setEditingCover(false); await loadData();
      setNotice(existing ? 'تم تحديث الغلاف. حالة النشر لم تتغير.' : 'تم حفظ الغلاف كمسودة مخفية؛ راجعيه ثم انشريه.');
    } catch { setError('تعذر حفظ الغلاف.'); }
    finally { setBusy(false); }
  };

  const editCover = (item: Cover) => {
    setCoverForm({ id: item.id, title: item.title, subtitle: item.subtitle || '', previewAssetRef: item.previewAssetRef || '' });
    setEditingCover(true); setTab('covers'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setCoverActive = async (item: Cover) => {
    if (!firestore) return;
    setBusy(true); setError('');
    try {
      await setDoc(doc(firestore, 'covers', item.id), { active: !item.active, updatedAt: serverTimestamp(), version: (item.version || 0) + 1 }, { merge: true });
      await loadData(); setNotice(!item.active ? 'تم نشر الغلاف.' : 'تم إخفاء الغلاف.');
    } catch { setError('تعذر تغيير حالة الغلاف.'); }
    finally { setBusy(false); }
  };

  if (!firebaseConfigured) return <div className="ap-admin-shell"><main className="ap-admin-page"><h1>إعداد Firebase مطلوب</h1><p>أضيفي إعدادات تطبيق الويب في متغيرات البيئة VITE_FIREBASE_* ثم أعيدي البناء.</p></main></div>;
  if (!authReady) return <div className="ap-admin-shell"><main className="ap-admin-page">جارٍ التحقق من تسجيل الدخول...</main></div>;
  if (!user) return <div className="ap-admin-shell" dir="rtl"><main className="ap-admin-page ap-auth-card"><a className="brand ap-admin-brand" href="./"><span className="brand-mark">✿</span><span><strong>ANTI PRESSURE</strong><small>فُكّي الضغط</small></span></a><h1>دخول لوحة الإدارة</h1><p>الدخول متاح للحسابات التي أُنشئت مسبقًا في Firebase Authentication فقط.</p><form onSubmit={login}><label>البريد الإلكتروني<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الدخول...' : 'تسجيل الدخول'}</button></form>{error && <p className="form-error" role="alert">{error}</p>}<a className="secondary-button" href="./">العودة للموقع</a></main></div>;
  if (!adminVerified) return <div className="ap-admin-shell" dir="rtl"><main className="ap-admin-page ap-auth-card"><h1>لا توجد صلاحية إدارة</h1><p>تم تسجيل الدخول، لكن الحساب لا يحمل صلاحية الإدارة الموثوقة admin:true. لا يمكن منح الصلاحية من هذه الصفحة.</p><button className="secondary-button" onClick={() => void logout()}>تسجيل الخروج</button>{error && <p className="form-error">{error}</p>}</main></div>;

  return <div className="app-shell ap-admin-shell" dir="rtl">
    <div className="announcement">ANTI PRESSURE · فُكّي الضغط — لوحة الإدارة الآمنة</div>
    <header className="site-header"><a className="brand ap-admin-brand" href="./"><span className="brand-mark">✿</span><span><strong>ANTI PRESSURE</strong><small>فُكّي الضغط</small></span></a><div className="ap-admin-user"><span>{user.email}</span><a className="secondary-button" href="./admin-ambassadors.html">إدارة السفيرات</a><button className="secondary-button" onClick={() => void logout()}>خروج</button></div></header>
    <main className="admin-page ap-admin-page">
      <div className="admin-title"><div><span className="eyebrow">إدارة المحتوى المنشور</span><h1>كتالوج فُكّي الضغط</h1><p>إدارة التصنيفات والرسومات والأغلفة. العناصر الجديدة تُحفظ مخفية حتى اعتمادها.</p></div></div>
      <div className="preview-warning"><strong>حدود آمنة:</strong> هذه اللوحة تدير بيانات الكتالوج فقط. لا يوجد رفع ملفات في هذه المرحلة؛ لا تضعي روابط الرسومات الأصلية أو ملفات الطباعة. استخدمي مرجع معاينة عامًّا معتمدًا فقط.</div>
      <div className="ap-admin-stats"><div><b>{categories.length}</b><span>تصنيف</span></div><div><b>{artworks.length}/100</b><span>رسمة مسجلة</span></div><div><b>{artworks.filter(x => x.active).length}</b><span>رسمة منشورة</span></div><div><b>{covers.filter(x => x.active).length}/5</b><span>غلاف منشور</span></div></div>
      <div className="ap-admin-tabs">{(['orders','categories','artworks','covers','shipping'] as Tab[]).map(item => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item === 'orders' ? 'الطلبات (' + orders.length + ')' : item === 'categories' ? 'التصنيفات' : item === 'artworks' ? 'الرسومات' : item === 'covers' ? 'الأغلفة' : 'الشحن'}</button>)}</div>
      {notice && <p className="form-success" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      <div className="ap-admin-toolbar"><button className="secondary-button" disabled={busy} onClick={() => tab === 'orders' ? void loadOrders() : void loadData()}>تحديث البيانات</button>{tab === 'categories' && <button className="secondary-button" disabled={busy} onClick={() => void seedCategories()}>إضافة التصنيفات العشرة الأساسية</button>}</div>
      {busy && <p className="backup-help">جارٍ تنفيذ العملية...</p>}
      {tab === 'shipping' && <section className="admin-layout ap-admin-layout"><form className="product-form" onSubmit={saveShippingFee}><h2>سعر الشحن الموحد</h2><p>اكتبي السعر بالجنيه المصري. سيتم تحديث صفحة الطلب تلقائيًا وحفظ السعر في الطلبات الجديدة.</p><label>سعر الشحن (جنيه)<input type="number" min="0" max="5000" step="1" inputMode="numeric" value={shippingFee} onChange={e => setShippingFee(e.target.value)} required /></label><button className="primary-button" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ سعر الشحن'}</button><p className="backup-help">السعر الحالي: {shippingFee !== '' ? shippingFee + ' جنيه' : 'لم يتم ضبطه بعد'}. الطلبات القديمة تحتفظ بسعر الشحن المسجل وقت الطلب.</p></form></section>}
      {tab === 'orders' && <>
        <section className="ap-order-stats">
          <button className={orderFilter === 'all' ? 'selected' : ''} onClick={() => setOrderFilter('all')}><b>{orders.length}</b><span>كل الطلبات</span></button>
          <button className={orderFilter === 'new' ? 'selected' : ''} onClick={() => setOrderFilter('new')}><b>{orders.filter(x => x.fulfillmentStatus === 'new').length}</b><span>طلبات جديدة</span></button>
          <button className={orderFilter === 'active' ? 'selected' : ''} onClick={() => setOrderFilter('active')}><b>{orders.filter(x => !['new','delivered','cancelled'].includes(x.fulfillmentStatus || 'new')).length}</b><span>قيد التنفيذ</span></button>
          <button className={orderFilter === 'delivered' ? 'selected' : ''} onClick={() => setOrderFilter('delivered')}><b>{orders.filter(x => x.fulfillmentStatus === 'delivered').length}</b><span>تم التسليم</span></button>
          <button className={orderFilter === 'cancelled' ? 'selected' : ''} onClick={() => setOrderFilter('cancelled')}><b>{orders.filter(x => x.fulfillmentStatus === 'cancelled').length}</b><span>ملغاة</span></button>
        </section>
        <section className="admin-products ap-orders-list">
        <div className="admin-list-heading"><h2>طلبات العملاء ({orders.length})</h2><span>الأحدث أولًا · اختاري بطاقة لتحديث الحالة</span></div>
        {orders.length === 0 && <div className="builder-empty">مفيش طلبات لسه. أول طلب يتسجل من الموقع هيظهر هنا تلقائيًا.</div>}
        {orders.filter(order => orderFilter === 'all' || (orderFilter === 'active' ? !['new','delivered','cancelled'].includes(order.fulfillmentStatus || 'new') : order.fulfillmentStatus === orderFilter)).map(order => <article className="admin-product-row ap-order-row" key={order.id}>
          <div className="admin-product-info ap-order-info">
            <strong>{order.publicReference || order.id}</strong>
            <span>{order.customer?.name || 'اسم غير متاح'} · {order.customer?.phone || 'رقم غير متاح'}</span>
            <small>العنوان: {order.shipping?.governorateName || '—'} — {order.shipping?.areaName || '—'} · {order.shipping?.address || '—'}</small>{order.shipping?.deliveryNotes && <small>ملاحظات التوصيل: {order.shipping.deliveryNotes}</small>}
            <small>الغلاف: {order.book?.cover?.titleSnapshot || '—'} · الاسم على الغلاف: {order.book?.personalizedName || '—'}</small>
            <details className="ap-order-artwork-details"><summary>تفاصيل الرسومات ({order.book?.artworks?.length || 0}/30) — اضغطي لعرض الأكواد والأسماء</summary><ol>{(order.book?.artworks || []).map((art, index) => <li key={(art.artworkId || 'art') + index}><b>{art.artworkId || 'كود غير متاح'}</b><span>{art.titleSnapshot || 'اسم غير متاح'}</span></li>)}</ol></details>
            <small>سعر الكتاب: {order.pricing?.bookPrice ?? '—'} جنيه · الشحن: {order.pricing?.shippingFee ?? 'يُحدد'} · الإجمالي: {order.pricing?.totalAmount ?? 'يُحدد'} جنيه</small>
            <small>الدفع: {paymentStatusLabels[order.paymentStatus || ''] || order.paymentStatus || '—'} · {order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'InstaPay'}</small>
            <small>كود الشريك: {order.partnerCode || 'بدون كود'} · كود سفيرة العميلة: {order.ambassadorReferralCode || 'بدون إحالة'} · {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('ar-EG') : 'وقت التسجيل غير متاح'}</small>
          </div>
          <div className="admin-product-actions ap-order-status">
            {order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && <button className="secondary-button" disabled={busy} onClick={() => void updateOrderPaymentStatus(order,'paid')}>تأكيد استلام المبلغ</button>}
            {order.paymentStatus === 'paid' && (order.fulfillmentStatus === 'delivered' || !!order.deliveredAt) && <button className="secondary-button" disabled={busy} onClick={() => void updateOrderPaymentStatus(order,'refunded')}>تسجيل رد قيمة الطلب</button>}
            <label>حالة الطلب<select value={order.fulfillmentStatus || 'new'} disabled={busy} onChange={e => void updateOrderStatus(order,e.target.value)}>{orderStatuses.map(status => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label>
          </div>
        </article>)}
      </section></>}
      {tab === 'categories' && <div className="admin-layout ap-admin-layout"><form className="product-form" onSubmit={saveCategory}><h2>إضافة تصنيف</h2><label>اسم التصنيف<input value={categoryTitle} onChange={e => setCategoryTitle(e.target.value)} maxLength={70} required /></label><button className="primary-button" disabled={busy}>حفظ التصنيف</button><p className="backup-help">المعرف يُنشأ تلقائيًا من الاسم الإنجليزي/الحروف المتاحة؛ للتصنيفات العربية استخدمي زر إضافة التصنيفات الأساسية.</p></form><section className="admin-products"><h2>التصنيفات ({categories.length})</h2>{categories.map(item => <article className="admin-product-row" key={item.id}><div className="admin-product-info"><strong>{item.title}</strong><small>{item.id} · {item.active ? 'مفعّل' : 'مخفي'}</small></div></article>)}</section></div>}
      {tab === 'artworks' && <div className="admin-layout ap-admin-layout"><form className="product-form" onSubmit={saveArtwork}><h2>{editingArtwork ? 'تعديل الرسمة' : 'إضافة رسمة'}</h2><label>كود الرسمة<input value={artworkForm.id} onChange={e => setArtworkForm({ ...artworkForm, id: e.target.value })} placeholder="AP-001" required /></label><label>اسم الرسمة<input value={artworkForm.title} onChange={e => setArtworkForm({ ...artworkForm, title: e.target.value })} maxLength={100} required /></label><label>التصنيف<select value={artworkForm.categoryId} onChange={e => setArtworkForm({ ...artworkForm, categoryId: e.target.value })} required><option value="">اختاري تصنيفًا</option>{categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>الجملة المصرية<input value={artworkForm.phrase} onChange={e => setArtworkForm({ ...artworkForm, phrase: e.target.value })} maxLength={160} /></label><label>رفع صورة الرسمة (اختياري)<input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError(''); try { const image = await compressImageForFirestore(file); setArtworkForm(current => ({ ...current, previewAssetRef: image })); setNotice('تم تجهيز الصورة. اضغطي حفظ المسودة لحفظها.'); } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تجهيز الصورة.'); } finally { setBusy(false); e.target.value = ''; } }} /></label><label>رابط صورة بديل<input value={artworkForm.previewAssetRef.startsWith('data:image/') ? '' : artworkForm.previewAssetRef} onChange={e => setArtworkForm({ ...artworkForm, previewAssetRef: e.target.value })} maxLength={500} placeholder="https://..." /></label>{artworkForm.previewAssetRef && <img src={artworkForm.previewAssetRef} alt="معاينة صورة الرسمة" style={{maxWidth:'100%',maxHeight:220,objectFit:'contain'}} />}<p className="backup-help">يتم ضغط الصورة وحفظ نسخة صغيرة داخل Firestore (حتى نحو 430KB). لا ترفعي ملفات الطباعة الأصلية أو صورًا عالية الدقة هنا.</p><div className="form-actions"><button className="primary-button" disabled={busy || categories.length === 0}>{editingArtwork ? 'حفظ التعديل' : 'حفظ كمسودة'}</button>{editingArtwork && <button type="button" className="secondary-button" onClick={() => { setArtworkForm(emptyArtwork); setEditingArtwork(false); }}>إلغاء</button>}</div></form><section className="admin-products"><div className="admin-list-heading"><h2>الرسومات ({filteredArtworks.length})</h2><span>من أصل 100</span></div><div className="ap-admin-filters"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالكود أو الاسم أو الجملة" /><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div><div className="admin-product-list">{filteredArtworks.map(item => <article className="admin-product-row" key={item.id}><div className="admin-thumb ap-thumb ap-artwork-thumbnail">{item.previewAssetRef ? <img src={item.previewAssetRef} alt={`معاينة ${item.title}`} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} /> : <span aria-label="لا توجد صورة">✿</span>}</div><div className="admin-product-info"><strong>{item.id} · {item.title}</strong><span>{categories.find(c => c.id === item.categoryId)?.title || 'تصنيف غير معروف'}</span><small>{item.phrase || 'بدون جملة'}</small><small>{item.active ? 'منشورة' : 'مسودة مخفية'}</small></div><div className="admin-product-actions ap-publish-actions"><button className="secondary-button" disabled={busy} onClick={() => editArtwork(item)}>تعديل</button><button className={item.active ? "secondary-button ap-publish-button ap-publish-button-active" : "primary-button ap-publish-button"} disabled={busy || !item.phrase?.trim()} onClick={() => void setArtworkActive(item)}>{item.active ? 'إخفاء الرسمة من الموقع' : item.phrase?.trim() ? 'نشر الرسمة على الموقع' : 'أضيفي الجملة أولًا'}</button>{!item.phrase?.trim() && <small className="ap-publish-help" role="status">النشر متوقف لأن الجملة المصرية غير مكتوبة. اضغطي «تعديل»، أضيفي الجملة، ثم احفظي التعديل.</small>}</div></article>)}</div></section></div>}
      {tab === 'covers' && <div className="admin-layout ap-admin-layout"><form className="product-form" onSubmit={saveCover}><h2>{editingCover ? 'تعديل الغلاف' : 'إضافة غلاف'}</h2><label>كود الغلاف<input value={coverForm.id} onChange={e => setCoverForm({ ...coverForm, id: e.target.value })} placeholder="AP-COVER-01" required /></label><label>اسم الغلاف<input value={coverForm.title} onChange={e => setCoverForm({ ...coverForm, title: e.target.value })} maxLength={50} required /></label><label>النص الفرعي<input value={coverForm.subtitle} onChange={e => setCoverForm({ ...coverForm, subtitle: e.target.value })} maxLength={80} /></label><label>رفع صورة الغلاف (اختياري)<input type="file" accept="image/*" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); setError(''); try { const image = await compressImageForFirestore(file); setCoverForm(current => ({ ...current, previewAssetRef: image })); setNotice('تم تجهيز الصورة. اضغطي حفظ المسودة لحفظها.'); } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تجهيز الصورة.'); } finally { setBusy(false); e.target.value = ''; } }} /></label><label>رابط صورة بديل<input value={coverForm.previewAssetRef.startsWith('data:image/') ? '' : coverForm.previewAssetRef} onChange={e => setCoverForm({ ...coverForm, previewAssetRef: e.target.value })} maxLength={500} /></label>{coverForm.previewAssetRef && <img src={coverForm.previewAssetRef} alt="معاينة صورة الغلاف" style={{maxWidth:'100%',maxHeight:220,objectFit:'contain'}} />}<p className="backup-help">يتم ضغط الصورة وحفظ نسخة صغيرة داخل Firestore (حتى نحو 430KB). لا ترفعي ملفات الطباعة الأصلية.</p><div className="form-actions"><button className="primary-button" disabled={busy}>{editingCover ? 'حفظ التعديل' : 'حفظ كمسودة'}</button>{editingCover && <button type="button" className="secondary-button" onClick={() => { setCoverForm(emptyCover); setEditingCover(false); }}>إلغاء</button>}</div></form><section className="admin-products"><h2>الأغلفة ({covers.length}/5)</h2>{covers.map(item => <article className="admin-product-row" key={item.id}><div className="admin-thumb ap-thumb">✿</div><div className="admin-product-info"><strong>{item.id} · {item.title}</strong><small>{item.subtitle}</small><small>{item.active ? 'منشور' : 'مسودة مخفية'}</small></div><div className="admin-product-actions"><button className="secondary-button" onClick={() => editCover(item)}>تعديل</button><button className="secondary-button" disabled={busy} onClick={() => void setCoverActive(item)}>{item.active ? 'إخفاء' : 'نشر'}</button></div></article>)}</section></div>}
    </main>
    <footer className="site-footer ap-admin-footer"><strong>ANTI PRESSURE · فُكّي الضغط</strong><span>صلاحيات الإدارة تتحقق من Firebase Authentication custom claim.</span></footer>
  </div>;
}
