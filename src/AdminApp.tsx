import { useMemo, useState, type FormEvent } from 'react';

type Category = { id: string; title: string };
type Artwork = { id: string; title: string; categoryId: string; phrase: string; previewAssetRef: string; sortOrder: number; active: boolean };
type Cover = { id: string; title: string; subtitle: string; previewAssetRef: string; sortOrder: number; active: boolean };
const categories: Category[] = [
  { id: 'responsibilities', title: 'فوضى المسؤوليات' }, { id: 'moods', title: 'تقلبات المزاج' },
  { id: 'people', title: 'الناس والعلاقات' }, { id: 'coffee-food', title: 'قهوة وأكل' },
  { id: 'love', title: 'حب وعلاقات' }, { id: 'work-money', title: 'شغل وفلوس' },
  { id: 'home-family', title: 'البيت والعيلة' }, { id: 'self-care', title: 'اهتمام بنفسي' },
  { id: 'overthinking', title: 'تفكير زيادة' }, { id: 'wisdom-laughter', title: 'حكمة وضحك' },
];
const coverTitles = ['الهدوء', 'فكّيها', 'على رواق', 'مش ناقصة', 'مساحة لنفسي'];
const key = 'anti-pressure-admin-preview-v1';
const seedArtworks: Artwork[] = Array.from({ length: 100 }, (_, i) => ({
  id: `AP-${String(i + 1).padStart(3, '0')}`, title: `رسمة تجريبية ${i + 1}`,
  categoryId: categories[Math.floor(i / 10)].id, phrase: '', previewAssetRef: '',
  sortOrder: i + 1, active: true,
}));
const seedCovers: Cover[] = coverTitles.map((title, i) => ({
  id: `AP-COVER-0${i + 1}`, title, subtitle: 'كتابك... على مزاجك!',
  previewAssetRef: '', sortOrder: i + 1, active: true,
}));
function loadSeed<T>(field: 'artworks' | 'covers', fallback: T[]): T[] {
  try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); return Array.isArray(saved[field]) ? saved[field] as T[] : fallback; }
  catch { return fallback; }
}
function savePreview(artworks: Artwork[], covers: Cover[]) {
  try { localStorage.setItem(key, JSON.stringify({ artworks, covers, savedAt: new Date().toISOString() })); return true; }
  catch { return false; }
}
export default function AdminApp() {
  const [tab, setTab] = useState<'artworks' | 'covers'>('artworks');
  const [artworks, setArtworks] = useState<Artwork[]>(() => loadSeed('artworks', seedArtworks));
  const [covers, setCovers] = useState<Cover[]>(() => loadSeed('covers', seedCovers));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [phrase, setPhrase] = useState('');
  const [assetRef, setAssetRef] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const persist = (nextArt: Artwork[], nextCovers: Cover[]) => {
    setArtworks(nextArt); setCovers(nextCovers);
    setNotice(savePreview(nextArt, nextCovers) ? 'اتحفظ التعديل على هذا المتصفح فقط.' : 'تعذر الحفظ المحلي. جرّب تقليل البيانات.');
  };
  const visibleArtworks = useMemo(() => artworks.filter(item =>
    (categoryFilter === 'all' || item.categoryId === categoryFilter) &&
    (item.id.toLowerCase().includes(search.toLowerCase()) || item.title.includes(search) || item.phrase.includes(search))
  ), [artworks, categoryFilter, search]);
  const reset = () => { setEditingId(null); setTitle(''); setCategoryId(categories[0].id); setPhrase(''); setAssetRef(''); setError(''); };
  const editArtwork = (item: Artwork) => {
    setTab('artworks'); setEditingId(item.id); setTitle(item.title); setCategoryId(item.categoryId);
    setPhrase(item.phrase); setAssetRef(item.previewAssetRef); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saveArtwork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) { setError('اكتب اسمًا أو وصفًا مختصرًا للرسمة.'); return; }
    const next = editingId
      ? artworks.map(item => item.id === editingId ? { ...item, title: title.trim(), categoryId, phrase: phrase.trim(), previewAssetRef: assetRef.trim() } : item)
      : [{ id: `AP-DRAFT-${Date.now()}`, title: title.trim(), categoryId, phrase: phrase.trim(), previewAssetRef: assetRef.trim(), sortOrder: artworks.length + 1, active: false }, ...artworks];
    persist(next, covers); setNotice(editingId ? 'تم تحديث بيانات الرسمة محليًا.' : 'تمت إضافة مسودة محلية غير منشورة.'); reset();
  };
  const updateCover = (id: string, field: 'title' | 'subtitle' | 'previewAssetRef', value: string) =>
    persist(artworks, covers.map(item => item.id === id ? { ...item, [field]: value } : item));
  const toggleArtwork = (id: string) => persist(artworks.map(item => item.id === id ? { ...item, active: !item.active } : item), covers);
  const toggleCover = (id: string) => persist(artworks, covers.map(item => item.id === id ? { ...item, active: !item.active } : item));
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ format: 'anti-pressure-admin-preview', version: 1, artworks, covers }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'anti-pressure-catalog-preview.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importBackup = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (parsed.format !== 'anti-pressure-admin-preview' || parsed.version !== 1 || !Array.isArray(parsed.artworks) || !Array.isArray(parsed.covers)) throw new Error('invalid');
        if (parsed.artworks.length > 500 || parsed.covers.length > 50) throw new Error('limit');
        persist(parsed.artworks, parsed.covers); setNotice('تم استيراد النسخة محليًا على هذا المتصفح.');
      } catch { setError('ملف النسخة الاحتياطية غير صالح.'); }
    };
    reader.onerror = () => setError('تعذرت قراءة الملف.');
    reader.readAsText(file);
  };
  return <div className="app-shell ap-admin-shell">
    <div className="announcement">ANTI PRESSURE · فُكّي الضغط — لوحة إنشاء تجريبية</div>
    <header className="site-header"><a className="brand ap-admin-brand" href="./" aria-label="فكّي الضغط"><span className="brand-mark">✿</span><span><strong>ANTI PRESSURE</strong><small>فُكّي الضغط</small></span></a><a className="secondary-button" href="./">معاينة الموقع</a></header>
    <main className="admin-page ap-admin-page">
      <div className="admin-title"><div><span className="eyebrow">مساحة تجهيز المحتوى</span><h1>إدارة الرسومات والأغلفة</h1><p>جهّزي مكتبة كتابك قبل الإطلاق، خطوة بخطوة وبمزاج هادي 🌷</p></div></div>
      <div className="preview-warning"><strong>تنبيه مهم — نسخة تطوير فقط:</strong> اللوحة غير محمية بتسجيل دخول، وكل التغييرات محفوظة محليًا في نفس المتصفح والجهاز. لن تظهر للعملاء ولن تُكتب في Firestore. لا تضعي بيانات عملاء أو ملفات أصلية عالية الدقة هنا. سنربطها بقاعدة البيانات ونضيف صلاحيات الدخول لاحقًا قبل أي استخدام فعلي.</div>
      <div className="ap-admin-stats"><div><b>{artworks.length}</b><span>رسمة في المعاينة</span></div><div><b>{artworks.filter(x => x.active).length}</b><span>رسمة مفعّلة محليًا</span></div><div><b>{covers.length}</b><span>غلاف تجريبي</span></div></div>
      <div className="ap-admin-tabs"><button className={tab === 'artworks' ? 'active' : ''} onClick={() => { setTab('artworks'); reset(); }}>الرسومات AP-001 إلى AP-100</button><button className={tab === 'covers' ? 'active' : ''} onClick={() => { setTab('covers'); reset(); }}>الأغلفة الخمسة</button></div>
      <div className="catalog-backup-actions ap-backup"><button className="secondary-button" type="button" onClick={exportBackup}>تصدير نسخة احتياطية</button><label className="secondary-button catalog-import-button">استيراد نسخة<input hidden type="file" accept=".json,application/json" onChange={e => { importBackup(e.target.files?.[0]); e.target.value = ''; }} /></label><button className="secondary-button" type="button" onClick={() => { if (window.confirm('سيتم حذف التعديلات المحلية وإعادة بيانات المعاينة الأصلية. هل نكمل؟')) { persist(seedArtworks, seedCovers); reset(); } }}>إعادة بيانات البداية</button></div>
      {notice && <p className="form-success" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      {tab === 'artworks' ? <div className="admin-layout ap-admin-layout">
        <form className="product-form" onSubmit={saveArtwork}>
          <h2>{editingId ? `تعديل ${editingId}` : 'إضافة رسمة جديدة'}</h2>
          <label>اسم / وصف الرسمة<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required placeholder="مثال: قعدة هادية مع فنجان قهوة" /></label>
          <label>التصنيف<select value={categoryId} onChange={e => setCategoryId(e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          <label>الجملة المصرية المصاحبة<textarea rows={3} maxLength={160} value={phrase} onChange={e => setPhrase(e.target.value)} placeholder="جملة قصيرة مرتبطة بمشهد الرسمة..." /></label>
          <label>مسار صورة المعاينة<input value={assetRef} onChange={e => setAssetRef(e.target.value)} placeholder="catalog/previews/AP-001.webp" /></label>
          <p className="backup-help">المسار نص تجريبي فقط. رفع الملفات وإدارة النسخ عالية الدقة ستُضاف في مرحلة التخزين الآمن.</p>
          <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'حفظ التعديلات' : 'إضافة كمسودة'}</button>{editingId && <button className="secondary-button" type="button" onClick={reset}>إلغاء</button>}</div>
        </form>
        <section className="admin-products"><div className="admin-list-heading"><h2>مكتبة الرسومات ({visibleArtworks.length})</h2><span>من أصل {artworks.length}</span></div>
          <div className="ap-admin-filters"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحثي بالكود أو الاسم أو الجملة..." /><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">كل التصنيفات</option>{categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
          <div className="admin-product-list">{visibleArtworks.map(item => <article className="admin-product-row" key={item.id}><div className="admin-thumb ap-thumb">{item.previewAssetRef ? <span>صورة</span> : <span>✿</span>}</div><div className="admin-product-info"><strong>{item.id} · {item.title}</strong><span>{categories.find(c => c.id === item.categoryId)?.title || 'بدون تصنيف'}</span><small>{item.phrase || 'لم تُضف جملة بعد'}</small><small>{item.active ? 'مفعّلة محليًا فقط' : 'مسودة / مخفية'}</small></div><div className="admin-product-actions"><button className="secondary-button" type="button" onClick={() => editArtwork(item)}>تعديل</button><button className="secondary-button" type="button" onClick={() => toggleArtwork(item.id)}>{item.active ? 'إخفاء' : 'تفعيل تجريبي'}</button></div></article>)}</div>
        </section>
      </div> : <section className="ap-cover-admin"><div className="admin-list-heading"><h2>إعدادات الأغلفة</h2><span>اختاري وعدّلي النصوص</span></div><div className="ap-cover-grid">{covers.map((cover, index) => <article className="ap-cover-card" key={cover.id}><div className={`ap-cover-swatch swatch-${index % 5}`}><span>✿</span><b>{cover.title}</b><small>{cover.subtitle}</small></div><label>اسم الغلاف<input value={cover.title} maxLength={50} onChange={e => updateCover(cover.id, 'title', e.target.value)} /></label><label>النص الفرعي<input value={cover.subtitle} maxLength={80} onChange={e => updateCover(cover.id, 'subtitle', e.target.value)} /></label><label>مسار صورة المعاينة<input value={cover.previewAssetRef} onChange={e => updateCover(cover.id, 'previewAssetRef', e.target.value)} placeholder="catalog/covers/cover-01.webp" /></label><button className="secondary-button" type="button" onClick={() => toggleCover(cover.id)}>{cover.active ? 'إخفاء تجريبي' : 'تفعيل تجريبي'}</button><small className="backup-help">{cover.id} · {cover.active ? 'مفعّل محليًا' : 'مخفي محليًا'}</small></article>)}</div></section>}
    </main>
    <footer className="site-footer ap-admin-footer"><strong>ANTI PRESSURE · فُكّي الضغط</strong><span>أداة تجهيز داخلية للمعاينة — ليست لوحة تشغيل فعلية</span></footer>
  </div>;
}
