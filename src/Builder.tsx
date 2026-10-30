import { useEffect, useMemo, useState } from 'react';

const categories = [
  'فوضى المسؤوليات', 'تقلبات المزاج', 'الناس والعلاقات', 'قهوة وأكل', 'حب وعلاقات',
  'شغل وفلوس', 'البيت والعيلة', 'اهتمام بنفسي', 'تفكير زيادة', 'حكمة وضحك',
];
const titles = [
  ['قائمة مش بتخلص','خمس دقايق كمان','كل حاجة مرة واحدة','مشوار ورا مشوار','أنا والوقت','يوم على الله','دماغي زحمة','هنلحق إن شاء الله','استراحة محارب','مهمة مستحيلة'],
  ['مود الصبح','ضحكة من القلب','مش طايقة دوشة','يوم رايق','قلبي عامل حفلة','عايزة أهدى','شوية لخبطة','مزاج متقلب','ضحكة رغم الزحمة','أنا كويسة أهو'],
  ['الناس حكايات','كل واحد وله طبعه','لمة حلوة','صحاب العمر','كلام كتير','حد يفهمني','مساحة شخصية','الجدعنة مواقف','ناس شبهنا','على قد المحبة'],
  ['قهوة الأول','حتة حلوة','مزاج وسكر','فطار متأخر','آخر قطعة','كوباية وهدوء','جعانة ومحتارة','ريحة القهوة','حلو اليوم','سناك سريع'],
  ['قلب خفيف','حكاية لطيفة','حب من بعيد','تفاصيل صغيرة','ورد وكلام','ضحكة مشتركة','قلوب طيبة','رسالة حلوة','مودة','حاجة شبهنا'],
  ['شغل كتير','آخر الشهر','الحسبة مش مظبوطة','إيميل جديد','بكرة نبدأ','فلوس وطلبات','اجتماع طويل','إنجاز صغير','استراحة شغل','المرتب وصل'],
  ['البيت بيتي','يوم الغسيل','لمة العيلة','المطبخ بيناديني','ترتيب مؤجل','ركن هادي','زرعتي الصغيرة','البيت دافي','مشوار البيت','حكايات البيت'],
  ['وقت ليا','روتين بسيط','شوية دلع','نفَس عميق','يوم من غير استعجال','أنا أستاهل','هدوء داخلي','وردة لنفسي','خطوة صغيرة','مساحة خاصة'],
  ['أفكار آخر الليل','ماذا لو؟','سيناريوهات كتير','دماغ شغالة','تفكير زيادة','هتعدي','نقطة ونبدأ','مش لازم دلوقتي','بكرة أوضح','اقفلي الدائرة'],
  ['خديها ببساطة','الدنيا ماشية','ضحكة وخلاص','حكمة جدتي','مش مستاهلة','على رواق','كلها بتعدي','إحنا بنحاول','عادي يعني','ابتسمي بس'],
];
const marks = ['✿','☕','♡','☼','☁','✧','❀','⌂','♫','☆'];
const tones = ['peach','lilac','mint','yellow','pink','blue'];
const catalog = categories.flatMap((category, ci) => titles[ci].map((title, ti) => ({
  id: 'AP-' + String(ci * 10 + ti + 1).padStart(3, '0'),
  category, title, mark: marks[(ci + ti) % marks.length], tone: tones[(ci * 2 + ti) % tones.length],
})));
const covers = [
  { id: 'calm', title: 'الهدوء', subtitle: 'لحظة لنفسي', tone: 'cover-calm', mark: '☾' },
  { id: 'fun', title: 'فكّيها', subtitle: 'الدنيا مش مستاهلة', tone: 'cover-fun', mark: '✿' },
  { id: 'flowers', title: 'على رواق', subtitle: 'براحة وبمزاجي', tone: 'cover-flowers', mark: '❀' },
  { id: 'bold', title: 'مش ناقصة', subtitle: 'بس مكملة', tone: 'cover-bold', mark: '✦' },
  { id: 'space', title: 'مساحة لنفسي', subtitle: 'وقت ليا أنا', tone: 'cover-space', mark: '☾' },
];
const STORAGE_KEY = 'anti-pressure:selected-artworks:v1';
const DRAFT_KEY = 'anti-pressure:cover-draft:v1';

type Draft = { coverId: string; name: string };
function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return { coverId: covers.some(c => c.id === value.coverId) ? value.coverId : 'calm', name: typeof value.name === 'string' ? value.name.slice(0, 40) : '' };
  } catch { return { coverId: 'calm', name: '' }; }
}

export default function Builder() {
  const [selected, setSelected] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<(typeof catalog)[number] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState<'artworks' | 'cover'>('artworks');
  const [draft, setDraft] = useState<Draft>({ coverId: 'calm', name: '' });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setSelected([...new Set(saved.filter((id: unknown) => typeof id === 'string' && catalog.some(item => item.id === id)) as string[])].slice(0, 30));
    } catch { setSelected([]); }
    setDraft(readDraft());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch { setNotice('تعذر حفظ التصميم على هذا الجهاز.'); }
    }
  }, [selected, draft, loaded]);

  const visible = useMemo(() => catalog.filter(item =>
    (activeCategory === 'الكل' || item.category === activeCategory) &&
    (item.title.includes(search.trim()) || item.category.includes(search.trim()) || item.id.toLowerCase().includes(search.trim().toLowerCase()))
  ), [activeCategory, search]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const remaining = 30 - selected.length;
  const activeCover = covers.find(c => c.id === draft.coverId) || covers[0];
  const fittedNameSize = Math.max(13, Math.min(25, 25 - Math.max(0, draft.name.trim().length - 8) * 0.55));

  function toggle(id: string) {
    setNotice('');
    if (selectedSet.has(id)) { setSelected(current => current.filter(item => item !== id)); return; }
    if (selected.length >= 30) { setNotice('اختيارك اكتمل 30 رسمة. شيلي رسمة الأول لو حابة تختاري غيرها.'); return; }
    setSelected(current => [...current, id]);
  }
  function clearAll() {
    if (selected.length && window.confirm('متأكدة إنك عايزة تمسحي كل الرسومات المختارة؟')) setSelected([]);
  }

  return <div className="builder-shell" dir="rtl">
    <header className="builder-header">
      <a className="builder-brand" href="#home"><span>✳</span><b>ANTI PRESSURE</b><small>فُكّي الضغط</small></a>
      <a className="builder-back" href="#home">← الرجوع للرئيسية</a>
    </header>

    {step === 'artworks' ? <>
      <main className="builder-main">
        <div className="builder-intro">
          <span className="eyebrow">الخطوة الأولى · اختياراتك على مزاجك</span>
          <h1>اختاري 30 رسمة بتحبيها</h1>
          <p>خدي وقتك، قلّبي في التصنيفات، واختاري الرسومات اللي حابة تكون في كتابك. ترتيب الصفحات هيتحدد تلقائيًا.</p>
          <div className="demo-alert"><span>✦</span><div><b>معاينة تجريبية للمكتبة</b><small>الأشكال الحالية نماذج مؤقتة لا تمثل الرسومات النهائية. هنستبدلها بالرسومات الأصلية بعد اعتمادها.</small></div></div>
        </div>
        <section className="selection-toolbar" aria-label="أدوات البحث والتصفية">
          <label className="art-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="دوري على رسمة أو تصنيف..." aria-label="ابحثي عن رسمة" /></label>
          <div className="filter-chips"><button className={activeCategory === 'الكل' ? 'chosen' : ''} onClick={() => setActiveCategory('الكل')}>كل الرسومات <small>100</small></button>{categories.map((category, i) => <button key={category} className={activeCategory === category ? 'chosen' : ''} onClick={() => setActiveCategory(category)}>{category}<small>{String(i + 1).padStart(2, '0')}</small></button>)}</div>
        </section>
        <div className="builder-results"><span>{visible.length} رسمة في العرض</span><span>اختاري 30 رسمة مختلفة فقط</span></div>
        <section className="builder-grid" aria-label="مكتبة الرسومات">
          {visible.map(item => {
            const isSelected = selectedSet.has(item.id);
            const locked = !isSelected && selected.length === 30;
            return <article className={'builder-art-card ' + (isSelected ? 'selected' : '')} key={item.id}>
              <button className="art-preview-button" type="button" onClick={() => setPreview(item)} aria-label={'معاينة ' + item.title}>
                <div className={'builder-art-visual ' + item.tone}><span className="demo-stamp">نموذج</span><span className="demo-main-mark">{item.mark}</span><span className="demo-line">﹏  ◡  ﹏</span><small>{item.title}</small><span className="demo-spark">✧</span></div>
              </button>
              <div className="builder-card-meta"><div><b>{item.title}</b><small>{item.category}</small></div><button type="button" className={'select-art-button ' + (isSelected ? 'is-selected' : '')} disabled={locked} onClick={() => toggle(item.id)}>{isSelected ? '✓ تم الاختيار' : '+ اختاري'}</button></div>
              <span className="art-code">{item.id}</span>
            </article>;
          })}
        </section>
        {visible.length === 0 && <div className="builder-empty">ملقيناش رسومات بالكلمة دي. جربي كلمة تانية أو اختاري تصنيف مختلف.</div>}
      </main>
      <aside className="selection-dock" aria-live="polite">
        <div className="selection-count"><strong>{selected.length}<i>/30</i></strong><span>{remaining === 0 ? 'اختيارك اكتمل!' : 'رسمة مختارة'}</span></div>
        <div className="selection-progress"><span style={{width: (selected.length / 30 * 100) + '%'}} /></div>
        <div className="selection-message">{remaining === 0 ? 'عاش! اخترتي 30 رسمة مختلفة.' : 'فاضلك ' + remaining + ' رسمة علشان تكملي اختيارك.'}</div>
        <div className="selection-actions"><button type="button" className="clear-selection" onClick={clearAll} disabled={!selected.length}>مسح الاختيارات</button><button type="button" className="continue-selection" disabled={selected.length !== 30} onClick={() => { setStep('cover'); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>اختاري الغلاف <span>←</span></button></div>
      </aside>
    </> : <>
      <main className="builder-main cover-builder-main">
        <div className="builder-intro">
          <span className="eyebrow">الخطوة الثانية · لمستك الشخصية</span>
          <h1>اختاري غلاف كتابك واكتبي اسمك</h1>
          <p>اختاري واحد من 5 أغلفة، واكتبي الاسم اللي تحبي يظهر عليه. تقدري ترجعي تعدلي الرسومات في أي وقت من غير ما اختياراتك تضيع.</p>
        </div>
        <section className="cover-builder-layout">
          <div className="cover-controls">
            <h2>اختاري الغلاف اللي شبهك</h2>
            <div className="cover-picker-grid">
              {covers.map(cover => <button type="button" key={cover.id} className={'cover-picker ' + (draft.coverId === cover.id ? 'active' : '')} onClick={() => setDraft(current => ({ ...current, coverId: cover.id }))} aria-pressed={draft.coverId === cover.id}>
                <span className={'cover-picker-art ' + cover.tone}><i>{cover.mark}</i><b>{cover.title}</b><small>{cover.subtitle}</small></span>
                <span className="cover-picker-label">{cover.title}{draft.coverId === cover.id ? ' ✓' : ''}</span>
              </button>)}
            </div>
            <label className="personal-name-label" htmlFor="book-personal-name">الاسم اللي يظهر على الغلاف</label>
            <input id="book-personal-name" className="personal-name-input" value={draft.name} maxLength={40} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} placeholder="اكتبي اسمك بالعربي أو English" dir="auto" />
            <div className="name-help">ممكن تكتبي الاسم بالعربي أو بالإنجليزي · 40 حرف كحد أقصى</div>
            <div className="cover-step-actions">
              <button type="button" className="clear-selection" onClick={() => { setStep('artworks'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>→ تعديل الرسومات</button>
              <button type="button" className="continue-selection" disabled={!draft.name.trim()} onClick={() => setNotice('تم حفظ اختيار الغلاف والاسم في معاينة التصميم على هذا الجهاز.')}>حفظ اختيارات الغلاف <span>✓</span></button>
            </div>
            {notice && <div className="cover-save-note" role="status">{notice}</div>}
          </div>
          <div className="cover-live-panel">
            <span className="cover-preview-caption">معاينة تقريبية للغلاف</span>
            <div className={'cover-live-art ' + activeCover.tone}>
              <span className="cover-live-decoration">{activeCover.mark}</span>
              <span className="cover-live-brand">ANTI PRESSURE · فُكّي الضغط</span>
              <strong>كتابك... على مزاجك!</strong>
              <span className="cover-live-name" style={{ fontSize: fittedNameSize + 'px' }}>{draft.name.trim() || 'اسمك هنا'}</span>
              <span className="cover-live-bottom">{activeCover.subtitle}</span>
            </div>
            <p>دي معاينة تصميمية مبدئية، مش ملف الطباعة النهائي. شكل الغلاف النهائي هيتراجع بعد اعتماد الرسومات والأغلفة الأصلية.</p>
            <div className="cover-selected-summary"><b>اختيارات كتابك</b><span>30 رسمة مختارة</span><span>غلاف: {activeCover.title}</span><span>الاسم: {draft.name.trim() || 'لم يُكتب بعد'}</span></div>
          </div>
        </section>
      </main>
    </>}
    {preview && step === 'artworks' && <div className="preview-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(null); }}>
      <section className="art-preview-modal" role="dialog" aria-modal="true" aria-label="معاينة الرسمة">
        <button className="preview-close" type="button" onClick={() => setPreview(null)} aria-label="إغلاق">×</button>
        <div className={'builder-art-visual preview-large ' + preview.tone}><span className="demo-stamp">نموذج تجريبي</span><span className="demo-main-mark">{preview.mark}</span><span className="demo-line">﹏  ◡  ﹏</span><small>{preview.title}</small><span className="demo-spark">✧</span></div>
        <h2>{preview.title}</h2><p>{preview.category} · {preview.id}</p>
        <button type="button" className="continue-selection modal-select" onClick={() => { toggle(preview.id); setPreview(null); }}>{selectedSet.has(preview.id) ? 'إزالة من اختياراتي' : 'اختاري الرسمة دي'}</button>
      </section>
    </div>}
    {notice && step === 'artworks' && <div className="builder-toast" role="status">{notice}</div>}
  </div>;
}
