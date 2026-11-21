import { useEffect, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase/client';
import { SUPERME_SECTIONS, type SuperMePage } from './lib/supermePages';
import './styles.css';

type ManagedPage = SuperMePage & { active: boolean; sortOrder: number };
const blank = { id: '', sectionId: 'plans', title: '', description: '', kind: 'writing' as SuperMePage['kind'], items: '', prompt: '', quote: '', qrUrl: '', previewAssetRef: '', sortOrder: '100' };
const safeUrl = (value: string) => !value.trim() || /^https:\/\//i.test(value.trim());

export default function SuperMeAdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!firestore) return;
    setBusy(true); setError('');
    try {
      const snap = await getDocs(query(collection(firestore, 'supermePages'), orderBy('sortOrder', 'asc')));
      setPages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ManagedPage)));
    } catch { setError('تعذر تحميل صفحات SuperMe. تحققي من صلاحيات الإدارة وقواعد Firestore.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async next => {
      setUser(next); setVerified(false);
      if (!next) return;
      try {
        const token = await next.getIdTokenResult(true);
        setVerified(token.claims.admin === true);
      } catch { setError('تعذر التحقق من صلاحيات الحساب.'); }
    });
  }, []);

  useEffect(() => { if (user && verified) void load(); }, [user, verified]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!auth) throw new Error('Firebase Auth غير مهيأ');
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword('');
    } catch { setError('تعذر تسجيل الدخول. راجعي بيانات الحساب.'); }
    finally { setBusy(false); }
  };

  const reset = () => { setForm(blank); setEditing(false); };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !verified) return;
    const title = form.title.trim();
    const section = SUPERME_SECTIONS.find(item => item.id === form.sectionId);
    const items = form.items.split(/\n|,/).map(item => item.trim()).filter(Boolean).slice(0, 40);
    const sortOrder = Number(form.sortOrder);
    if (!title || !section || !form.description.trim() || !form.prompt.trim() || !items.length || !Number.isSafeInteger(sortOrder) || sortOrder < 0) {
      setError('أكملي العنوان والقسم والوصف والتعليمات والعناصر، واكتبي ترتيبًا صحيحًا.'); return;
    }
    if (!safeUrl(form.qrUrl) || !safeUrl(form.previewAssetRef)) { setError('روابط QR والصورة يجب أن تبدأ بـ https://.'); return; }
    const id = editing ? form.id : 'SM-CUSTOM-' + title.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) + '-' + Date.now().toString(36);
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = {
        sectionId: section.id, sectionTitle: section.title, title, kind: form.kind,
        description: form.description.trim(), items, prompt: form.prompt.trim(),
        ...(form.quote.trim() ? { quote: form.quote.trim() } : {}),
        ...(form.qrUrl.trim() ? { qrUrl: form.qrUrl.trim() } : {}),
        ...(form.previewAssetRef.trim() ? { previewAssetRef: form.previewAssetRef.trim() } : {}),
        sortOrder, active: editing ? (pages.find(page => page.id === id)?.active ?? false) : false,
        updatedAt: serverTimestamp(),
        ...(!editing ? { createdAt: serverTimestamp() } : {}),
      };
      await setDoc(doc(firestore, 'supermePages', id), payload, { merge: editing });
      await load(); reset(); setNotice(editing ? 'تم حفظ تعديل الصفحة كمسودة/بحالتها الحالية.' : 'تم إنشاء الصفحة كمسودة. راجعيها ثم انشريها.');
    } catch { setError('تعذر حفظ الصفحة. لم يتم تغيير أي صفحة قديمة.'); }
    finally { setBusy(false); }
  };

  const edit = (page: ManagedPage) => {
    setForm({ id: page.id, sectionId: page.sectionId, title: page.title, description: page.description, kind: page.kind,
      items: page.items.join('\n'), prompt: page.prompt, quote: page.quote || '', qrUrl: page.qrUrl || '',
      previewAssetRef: page.previewAssetRef || '', sortOrder: String(page.sortOrder) });
    setEditing(true); setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleActive = async (page: ManagedPage) => {
    if (!firestore || !verified) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateDoc(doc(firestore, 'supermePages', page.id), { active: !page.active, updatedAt: serverTimestamp() });
      await load(); setNotice(page.active ? 'تم إخفاء الصفحة من مكتبة العملاء.' : 'تم نشر الصفحة في مكتبة العملاء.');
    } catch { setError('تعذر تغيير حالة النشر.'); }
    finally { setBusy(false); }
  };

  const remove = async (page: ManagedPage) => {
    if (!firestore || !verified || !window.confirm('حذف صفحة SuperMe هذه نهائيًا؟ لا يؤثر ذلك على صفحات الطلبات المسجلة سابقًا.')) return;
    setBusy(true); setError(''); setNotice('');
    try { await deleteDoc(doc(firestore, 'supermePages', page.id)); await load(); setNotice('تم حذف قالب المكتبة.'); }
    catch { setError('تعذر حذف القالب.'); }
    finally { setBusy(false); }
  };

  if (!user) return <main className="admin-page"><section className="product-form" style={{maxWidth:480,margin:'60px auto'}}><h1>إدارة صفحات SuperMe</h1><p>الدخول مخصص لحساب الإدارة فقط.</p><form onSubmit={login}><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="primary-button" disabled={busy}>دخول الإدارة</button></form>{error && <p className="form-error">{error}</p>}</section></main>;
  if (!verified) return <main className="admin-page"><p className="form-error">هذا الحساب لا يحمل صلاحية الإدارة.</p><button className="secondary-button" onClick={()=>void signOut(auth!)}>تسجيل الخروج</button></main>;

  return <div className="admin-shell"><header className="admin-header"><a href="./?superme=1" className="brand"><strong>SuperMe</strong><small>إدارة مكتبة الصفحات</small></a><div className="ap-admin-user"><span>{user.email}</span><button className="secondary-button" onClick={()=>void signOut(auth!)}>خروج</button></div></header>
    <main className="admin-page ap-admin-page">
      <div className="admin-title"><div><span className="eyebrow">SUPERME CONTENT STUDIO</span><h1>مكتبة صفحات SuperMe</h1><p>أنشئي قوالب جديدة، راجعيها كمسودات، ثم انشريها. الصفحات القديمة ورسومات فُكّي الضغط لا تتغير.</p></div></div>
      {notice && <p className="form-success" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-layout ap-admin-layout">
        <form className="product-form" onSubmit={save}><h2>{editing ? 'تعديل قالب الصفحة' : 'إنشاء قالب صفحة جديد'}</h2>
          <label>عنوان الصفحة<input value={form.title} maxLength={90} onChange={e=>setForm({...form,title:e.target.value})} required /></label>
          <label>القسم<select value={form.sectionId} onChange={e=>setForm({...form,sectionId:e.target.value})}>{SUPERME_SECTIONS.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
          <label>نوع الصفحة<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value as SuperMePage['kind']})}>{[['tracker','متابعة وعادات'],['learning','تعلم'],['project','مشروع'],['writing','كتابة'],['creative','هوايات'],['game','لعبة'],['drawing','رسم']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>وصف الصفحة<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={500} required /></label>
          <label>العناصر (كل عنصر في سطر)<textarea value={form.items} onChange={e=>setForm({...form,items:e.target.value})} maxLength={1600} required /></label>
          <label>التوجيه/السؤال المطبوع<input value={form.prompt} onChange={e=>setForm({...form,prompt:e.target.value})} maxLength={220} required /></label>
          <label>اقتباس اختياري<input value={form.quote} onChange={e=>setForm({...form,quote:e.target.value})} maxLength={180} /></label>
          <label>رابط QR اختياري<input type="url" value={form.qrUrl} onChange={e=>setForm({...form,qrUrl:e.target.value})} placeholder="https://..." /></label>
          <label>رابط معاينة صورة اختياري<input type="url" value={form.previewAssetRef} onChange={e=>setForm({...form,previewAssetRef:e.target.value})} placeholder="https://..." /></label>
          <label>ترتيب الظهور<input type="number" min="0" step="1" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:e.target.value})} required /></label>
          <div className="form-actions"><button className="primary-button" disabled={busy}>{busy?'جارٍ الحفظ…':editing?'حفظ التعديلات':'حفظ كمسودة'}</button>{editing && <button type="button" className="secondary-button" onClick={reset}>إلغاء</button>}</div>
        </form>
        <section className="admin-products"><div className="admin-list-heading"><h2>قوالب المكتبة ({pages.length})</h2><button className="secondary-button" disabled={busy} onClick={()=>void load()}>تحديث</button></div>
          {pages.map(page=><article className="admin-product-row" key={page.id}><div className="admin-product-info"><strong>{page.title}</strong><span>{page.sectionTitle} · {page.kind}</span><small>{page.id} · ترتيب {page.sortOrder} · {page.active?'منشورة':'مسودة مخفية'}</small><small>{page.description}</small></div><div className="admin-product-actions"><button className="secondary-button" disabled={busy} onClick={()=>edit(page)}>تعديل</button><button className="secondary-button" disabled={busy} onClick={()=>void toggleActive(page)}>{page.active?'إخفاء':'نشر'}</button><button className="secondary-button" disabled={busy} onClick={()=>void remove(page)}>حذف</button></div></article>)}
          {!pages.length && <div className="builder-empty">لا توجد قوالب إضافية بعد. صفحات البداية المدمجة ستظل متاحة للعملاء.</div>}
        </section>
      </div>
    </main>
  </div>;
}
