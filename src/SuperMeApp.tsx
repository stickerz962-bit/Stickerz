import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from './firebase/client';
import { createSuperMeOrder, type SuperMeCheckout } from './lib/supermeOrders';
import CatalogImage from './catalog/CatalogImage';
import { loadCatalog } from './catalog/repository';
import type { CatalogArtwork } from './catalog/types';
import { BUILT_IN_PAGES, SUPERME_SECTIONS, mapLegacyArtwork, type SuperMePage } from './lib/supermePages';

const STORAGE_KEY = 'superme:builder-draft:v1';
const covers = [
  { id: 'signature', title: 'SuperMe', subtitle: 'Your Life. Your Way.', tone: 'sm-cover-signature' },
  { id: 'bloom', title: 'Bloom', subtitle: 'Grow at your own pace', tone: 'sm-cover-bloom' },
  { id: 'focus', title: 'My Next Chapter', subtitle: 'One step at a time', tone: 'sm-cover-focus' },
  { id: 'soft', title: 'مساحتي الخاصة', subtitle: 'كل اللي يهمني في مكان واحد', tone: 'sm-cover-soft' },
];

type CatalogState = { pages: SuperMePage[]; warning: string; loaded: boolean };
type Draft = { selected: string[]; coverId: string; name: string; customBrief: string; customPages: SuperMePage[] };

function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      selected: Array.isArray(value.selected) ? value.selected.filter((id: unknown) => typeof id === 'string').slice(0, 60) : [],
      coverId: covers.some(item => item.id === value.coverId) ? value.coverId : covers[0].id,
      name: typeof value.name === 'string' ? value.name.slice(0, 40) : '',
      customBrief: typeof value.customBrief === 'string' ? value.customBrief.slice(0, 1200) : '',
      customPages: Array.isArray(value.customPages) ? value.customPages.filter((page: any) => page && typeof page.id === 'string' && page.id.startsWith('SM-CUSTOM-')).slice(0, 60) : [],
    };
  } catch {
    return { selected: [], coverId: covers[0].id, name: '', customBrief: '', customPages: [] };
  }
}

function PagePreview({ page, onClose }: { page: SuperMePage; onClose: () => void }) {
  const qrSrc = page.qrUrl ? 'https://api.qrserver.com/v1/create-qr-code/?size=116x116&margin=2&data=' + encodeURIComponent(page.qrUrl) : '';
  return <div className="sm-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sm-preview-modal" role="dialog" aria-modal="true" aria-label={'معاينة ' + page.title}>
      <button className="sm-close" type="button" onClick={onClose} aria-label="إغلاق">×</button>
      <div className="sm-preview-paper">
        <div className="sm-paper-top"><span>SUPERME</span><span>{page.sectionTitle}</span></div>
        <div className="sm-paper-symbol">{page.kind === 'learning' ? '✦' : page.kind === 'project' ? '◇' : page.kind === 'tracker' ? '☾' : page.kind === 'drawing' ? '✎' : '✿'}</div>
        <h2>{page.title}</h2>
        <p className="sm-paper-description">{page.description}</p>
        {page.previewAssetRef && <div className="sm-paper-art"><CatalogImage source={page.previewAssetRef} alt={page.title} fit="contain" /></div>}
        {page.id === 'SM-FAITH-01' ? <div className="sm-year-prayer-grid">
          {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map(month => <div className="sm-month-card" key={month}><strong>{month}</strong><div className="sm-month-days">{Array.from({ length: 31 }, (_, day) => <span key={day}><b>{day + 1}</b><i/><i/><i/><i/><i/></span>)}</div></div>)}
          <small className="sm-prayer-legend">كل يوم: الفجر · الظهر · العصر · المغرب · العشاء</small>
        </div> : page.id === 'SM-FAITH-02' ? <div className="sm-surah-table">
          <div className="sm-surah-head"><b>السورة</b><b>حفظ</b><b>مراجعة</b><b>تسميع</b></div>
          {page.items.map(item => <div className="sm-surah-row" key={item}><span>{item}</span><i/><i/><i/></div>)}
        </div> : page.id === 'SM-PROJECTS-01' ? <div className="sm-project-layout">
          <div className="sm-project-top"><div><b>اسم المشروع</b><span/></div><div className="sm-project-logo"><span>ارسم لوجو مشروعك هنا</span></div></div>
          <div className="sm-project-field"><b>فكرة المشروع</b><span/><span/><span/></div>
          <div className="sm-project-field"><b>الجمهور المستهدف والقيمة</b><span/><span/></div>
          <div className="sm-project-field"><b>خطوات التنفيذ</b>{['الخطوة الأولى','الخطوة الثانية','الخطوة الثالثة','الخطوة الرابعة'].map(item => <div key={item}><i/>{item}</div>)}</div>
        </div> : <div className="sm-paper-items">
          {page.items.map((item, index) => <div className="sm-paper-item" key={item + index}><span className="sm-check"></span><span>{item}</span></div>)}
        </div>}
        {page.qrUrl && <div className="sm-qr-area"><img src={qrSrc} alt="QR Code تجريبي للمحتوى التعليمي" /><div><strong>افتح المحتوى وابدأ التعلّم</strong><small>امسح الكود بكاميرا الموبايل</small><a href={page.qrUrl} target="_blank" rel="noreferrer">فتح رابط المحتوى</a></div></div>}
        {page.id !== 'SM-FAITH-01' && page.id !== 'SM-FAITH-02' && page.id !== 'SM-PROJECTS-01' && <div className="sm-paper-writing"><strong>{page.prompt}</strong><div></div><div></div></div>}
        {page.quote && <blockquote>{page.quote}</blockquote>}
        <div className="sm-paper-footer">THIS NOTEBOOK IS ABOUT YOU</div>
      </div>
      <p className="sm-preview-note">معاينة مبدئية لفكرة الصفحة — المقاسات وتجهيز الطباعة النهائية تأتي في مرحلة إعداد ملفات الإنتاج.</p>
    </section>
  </div>;
}

function LegacyPageImage({ page }: { page: SuperMePage }) {
  if (!page.previewAssetRef) return <div className="sm-page-art-placeholder">✎<small>رسمة محفوظة</small></div>;
  return <CatalogImage source={page.previewAssetRef} alt={page.title} fit="contain" className="sm-page-art-image" />;
}

export default function SuperMeApp() {
  const [catalog, setCatalog] = useState<CatalogState>({ pages: [], warning: '', loaded: false });
  const [selected, setSelected] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<SuperMePage | null>(null);
  const [coverId, setCoverId] = useState(covers[0].id);
  const [name, setName] = useState('');
  const [customBrief, setCustomBrief] = useState('');
  const [customPages, setCustomPages] = useState<SuperMePage[]>([]);
  const [customFileName, setCustomFileName] = useState('');
  const [customFilePreview, setCustomFilePreview] = useState('');
  const [showBook, setShowBook] = useState(false);
  const [notice, setNotice] = useState('');
  const [checkout, setCheckout] = useState<SuperMeCheckout>({ name: '', phone: '', governorate: '', area: '', address: '', notes: '', paymentMethod: 'cod' });
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [bookPrice, setBookPrice] = useState<number | null>(null);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  useEffect(() => {
    if (!firestore) { setPriceLoaded(true); return; }
    return onSnapshot(doc(firestore, 'settings', 'public'), snapshot => {
      const data = snapshot.exists() ? snapshot.data() : {};
      setShippingFee(Number.isSafeInteger(data.shippingFee) && data.shippingFee >= 0 ? data.shippingFee : null);
      setBookPrice(Number.isSafeInteger(data.superMeBookPrice) && data.superMeBookPrice > 0 ? data.superMeBookPrice : null);
      setPriceLoaded(true);
    }, () => setPriceLoaded(true));
  }, []);

  useEffect(() => {
    document.title = 'SuperMe — Your Life. Your Way.';
    return () => { document.title = 'ANTI PRESSURE – فُكّي الضغط | كتابك على مزاجك'; };
  }, []);

  useEffect(() => {
    const draft = readDraft();
    setSelected(draft.selected);
    setCoverId(draft.coverId);
    setName(draft.name);
    setCustomBrief(draft.customBrief);
    setCustomPages(draft.customPages);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, coverId, name, customBrief, customPages })); } catch { /* private browsing may disable storage */ }
  }, [selected, coverId, name, customBrief, customPages]);

  useEffect(() => {
    let alive = true;
    loadCatalog().then(result => {
      if (!alive) return;
      const categoryTitles = new Map(result.data.categories.map(item => [item.id, item.title]));
      const legacy = result.data.artworks.map((artwork: CatalogArtwork) => mapLegacyArtwork({
        id: artwork.id, title: artwork.title,
        category: categoryTitles.get(artwork.categoryId) || 'رسومات محفوظة',
        previewAssetRef: artwork.previewAssetRef,
      }));
      setCatalog({ pages: legacy, warning: result.warning || '', loaded: true });
    }).catch(() => {
      if (alive) setCatalog({ pages: [], warning: 'لم نتمكن من تحميل الرسومات القديمة من المكتبة الحالية.', loaded: true });
    });
    return () => { alive = false; };
  }, []);

  const allPages = useMemo(() => [...BUILT_IN_PAGES, ...catalog.pages, ...customPages], [catalog.pages, customPages]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visiblePages = useMemo(() => allPages.filter(page =>
    (activeSection === 'all' || page.sectionId === activeSection || (activeSection === 'art' && page.legacyArtworkId)) &&
    (!search.trim() || page.title.includes(search.trim()) || page.description.includes(search.trim()) || page.sectionTitle.includes(search.trim()))
  ), [allPages, activeSection, search]);
  const selectedPages = useMemo(() => selected.map(id => allPages.find(page => page.id === id)).filter(Boolean) as SuperMePage[], [selected, allPages]);
  const activeCover = covers.find(item => item.id === coverId) || covers[0];

  function togglePage(page: SuperMePage) {
    setNotice('');
    if (selectedSet.has(page.id)) {
      setSelected(current => current.filter(id => id !== page.id));
      return;
    }
    if (selected.length >= 60) {
      setNotice('وصلت إلى 60 صفحة. احذف صفحة قبل إضافة صفحة أخرى.');
      return;
    }
    setSelected(current => [...current, page.id]);
  }

  function movePage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    setSelected(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleCustomFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCustomFileName(file.name);
    setCustomFilePreview('');
    if (file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => setCustomFilePreview(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsDataURL(file);
    }
  }

  function addCustomPage() {
    if (!customBrief.trim() && !customFileName) {
      setNotice('اكتب فكرة الصفحة أو أرفق تصميمًا جاهزًا أولًا.');
      return;
    }
    if (selected.length >= 60) {
      setNotice('وصلت إلى 60 صفحة. احذف صفحة قبل إضافة الصفحة الخاصة.');
      return;
    }
    const customPage: SuperMePage = {
      id: 'SM-CUSTOM-' + Date.now(),
      sectionId: 'custom',
      sectionTitle: 'صفحاتي الخاصة',
      title: 'صفحة خاصة من تصميمك',
      kind: 'writing',
      description: customBrief.trim() || 'تصميم جاهز أرسله العميل لفريق SuperMe لمراجعته وتجهيزه للطباعة.',
      items: ['مراجعة الفكرة أو التصميم', 'تجهيز التصميم للطباعة', 'اعتماد المعاينة'],
      prompt: customFileName ? 'الملف المرفق: ' + customFileName : 'مساحة لتفاصيل الصفحة',
    };
    setCustomPages(current => [...current, customPage]);
    setSelected(current => [...current, customPage.id]);
    setNotice('أضفنا الصفحة الخاصة إلى ترتيب كتابك في هذه المعاينة. إرسالها للإدارة ورفع الملف سيتم ربطهما لاحقًا.');
    setActiveSection('all');
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderError('');
    setOrderSuccess('');
    if (!firestore) { setOrderError('خدمة الطلبات غير متاحة حاليًا.'); return; }
    if (selectedPages.length !== 60 || new Set(selected).size !== 60) { setOrderError('لازم تختار 60 صفحة مختلفة بالضبط.'); return; }
    if (bookPrice === null || shippingFee === null) { setOrderError('سعر الكتاب أو الشحن لم يتم ضبطه من الإدارة بعد.'); return; }
    setOrderBusy(true);
    try {
      const result = await createSuperMeOrder(firestore, {
        pages: selectedPages,
        coverId: activeCover.id,
        coverTitle: activeCover.title,
        personalizedName: name,
        checkout,
        pricing: { bookPrice, shippingFee },
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('superme');
      url.searchParams.set('track', result.trackingToken);
      url.hash = '';
      setTrackingUrl(url.toString());
      setOrderSuccess('تم تسجيل طلبك بنجاح. احتفظ برابط المتابعة التالي لمراجعة حالة الطلب.');
      try {
        const key = 'superme:customer-tracking-tokens:v1';
        const previous = JSON.parse(localStorage.getItem(key) || '[]');
        const tokens = Array.isArray(previous) ? previous.filter((value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) : [];
        localStorage.setItem(key, JSON.stringify([...new Set([result.trackingToken, ...tokens])].slice(0, 20)));
      } catch { /* Tracking link is shown below even if local storage is unavailable. */ }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      setOrderError(code === 'BOOK_MUST_HAVE_60_UNIQUE_PAGES' ? 'الكتاب يجب أن يحتوي على 60 صفحة مختلفة.' :
        code === 'INVALID_EGYPT_PHONE' ? 'اكتب رقم موبايل مصري صحيح.' :
        code === 'INVALID_SHIPPING_DETAILS' ? 'راجع الاسم وبيانات العنوان.' :
        code === 'PRICE_NOT_CONFIGURED' ? 'سعر الكتاب لم يتم ضبطه بعد.' :
        'تعذر تسجيل الطلب. راجع البيانات وحاول مرة أخرى.');
    } finally { setOrderBusy(false); }
  }

  return <main className="sm-shell" dir="rtl">
    <header className="sm-header">
      <a className="sm-logo" href="#top"><span className="sm-logo-mark">✦</span><span>SuperMe<small>YOUR LIFE. YOUR WAY.</small></span></a>
      <nav><a href="#library">مكتبة الصفحات</a><a href="#custom">صفحات خاصة</a><a href="#my-book">كتابي</a></nav>
      <a className="sm-header-cta" href="#my-book">كوّن كتابك <span>↗</span></a>
    </header>

    <section className="sm-hero" id="top">
      <div className="sm-hero-copy">
        <span className="sm-eyebrow">A NOTEBOOK MADE BY YOU</span>
        <h1>مش لازم كتابك<br/><em>يشبه كتاب حد تاني.</em></h1>
        <p>اختار الصفحات اللي تشبه اهتماماتك وطموحاتك. من عباداتك وتعلّمك، لمشاريعك وسفرك وهواياتك… اجمع كل اللي يهمك في نوت بوك واحد معمول على مزاجك.</p>
        <div className="sm-hero-actions"><a className="sm-primary" href="#library">ابدأ تكوين كتابك <span>←</span></a><span className="sm-hero-meta">60 صفحة · اختياراتك أنت · طباعة خاصة</span></div>
      </div>
      <div className="sm-hero-visual">
        <div className="sm-orbit sm-orbit-one"></div><div className="sm-orbit sm-orbit-two"></div>
        <div className="sm-hero-book"><div className="sm-book-spine"></div><span>SuperMe</span><strong>Your Life.<br/>Your Way.</strong><small>PERSONAL NOTEBOOK</small><i>✦</i></div>
        <div className="sm-floating sm-floating-one">✎ <span>خططي</span></div><div className="sm-floating sm-floating-two">☾ <span>ديني</span></div><div className="sm-floating sm-floating-three">◇ <span>مشاريعي</span></div>
      </div>
    </section>

    <section className="sm-intro-strip"><div><strong>مش مجرد نوت بوك</strong><span>مساحة تجمع اهتماماتك وأفكارك وتقدمك في كتاب واحد.</span></div><div><strong>أنت تختار</strong><span>من مكتبة متنوعة من الصفحات والتصميمات.</span></div><div><strong>60 صفحة بالضبط</strong><span>رتّبها بالطريقة اللي تناسبك.</span></div></section>

    <section className="sm-library-section" id="library">
      <div className="sm-section-heading"><div><span className="sm-eyebrow">BUILD YOUR OWN NOTEBOOK</span><h2>اختار اللي يهمك</h2><p>كل قسم جواه صفحات بأفكار واستخدامات مختلفة. افتح المعاينة قبل ما تضيف أي صفحة.</p></div><div className="sm-counter"><strong>{selected.length}<small>/60</small></strong><span>صفحة مختارة</span><div><i style={{ width: (selected.length / 60 * 100) + '%' }} /></div></div></div>
      <div className="sm-filters">
        <button type="button" className={activeSection === 'all' ? 'active' : ''} onClick={() => setActiveSection('all')}>كل الصفحات</button>
        {SUPERME_SECTIONS.map(section => <button type="button" key={section.id} className={activeSection === section.id ? 'active' : ''} onClick={() => setActiveSection(section.id)}>{section.icon} {section.title}</button>)}
      </div>
      <div className="sm-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="دوّر على صفحة أو فكرة..." /></div>
      {catalog.warning && <div className="sm-catalog-note">{catalog.warning} <span>التصميمات الأصلية تظل محفوظة في مكتبة فُكّي الضغط ولا يتم تعديلها.</span></div>}
      <div className="sm-page-grid">
        {visiblePages.map(page => <article className={'sm-page-card ' + (selectedSet.has(page.id) ? 'is-selected' : '')} key={page.id}>
          <button className="sm-page-preview" type="button" onClick={() => setPreview(page)} aria-label={'معاينة ' + page.title}>
            {page.previewAssetRef ? <LegacyPageImage page={page} /> : <div className={'sm-mini-paper sm-mini-' + page.kind}>
              <span className="sm-mini-kicker">{page.sectionTitle}</span><b>{page.title}</b><p>{page.description}</p>
              {page.qrUrl && <span className="sm-mini-qr">▦ QR</span>}
              <div className="sm-mini-lines"><i/><i/><i/></div><small>SUPERME</small>
            </div>}
            <span className="sm-preview-hint">معاينة الصفحة ↗</span>
          </button>
          <div className="sm-page-card-info"><div><small>{page.sectionTitle}</small><h3>{page.title}</h3></div><button type="button" className="sm-add-page" onClick={() => togglePage(page)}>{selectedSet.has(page.id) ? '✓' : '+'}</button></div>
          {page.legacyArtworkId && <span className="sm-legacy-tag">من مكتبة فُكّي الضغط الأصلية</span>}
        </article>)}
      </div>
      {!visiblePages.length && <div className="sm-empty">مفيش صفحات مطابقة للبحث ده.</div>}
      {catalog.loaded && catalog.pages.length > 0 && <p className="sm-legacy-count">تم تحميل {catalog.pages.length} تصميمًا منشورًا من مكتبة فُكّي الضغط للعرض والاختيار، دون تعديل أي سجل أصلي.</p>}
    </section>

    <section className="sm-custom-section" id="custom">
      <div className="sm-custom-copy"><span className="sm-eyebrow">MAKE IT PERSONAL</span><h2>عندك فكرة صفحة<br/><em>مش موجودة عندنا؟</em></h2><p>ابعتلنا تصميم جاهز، أو احكيلنا فكرتك وإحنا نجهزها لك بتصميم مناسب للطباعة ونبعتلك معاينة قبل اعتمادها.</p><div className="sm-custom-steps"><span>01 <b>ابعت الفكرة أو التصميم</b></span><span>02 <b>نجهز التصميم ونراجع التفاصيل</b></span><span>03 <b>توافق على المعاينة</b></span></div></div>
      <div className="sm-custom-form">
        <label>اشرح لنا الصفحة اللي في خيالك<textarea value={customBrief} onChange={event => setCustomBrief(event.target.value)} placeholder="مثلاً: عايز صفحة لمتابعة قراءة الكتب، فيها اسم الكتاب وتاريخ البداية والنهاية وتقييم ومكان لكتابة اقتباس..." rows={5}/></label>
        <label className="sm-upload-box"><span>＋</span><strong>أو ارفع تصميم جاهز</strong><small>صورة أو PDF — معاينة محلية فقط في هذه النسخة</small><input type="file" accept="image/*,.pdf" onChange={handleCustomFile}/>{customFileName && <b className="sm-file-name">{customFileName}</b>}</label>
        {customFilePreview && <img className="sm-custom-file-preview" src={customFilePreview} alt="معاينة الملف المرفوع محليًا"/>}
        <button type="button" className="sm-primary" onClick={addCustomPage}>إضافة تفاصيل الصفحة الخاصة <span>←</span></button>
        <small className="sm-form-footnote">في هذه المعاينة لا يتم رفع الملفات أو إرسال الطلبات إلى الإدارة.</small>
      </div>
    </section>

    <section className="sm-book-section" id="my-book">
      <div className="sm-section-heading"><div><span className="sm-eyebrow">YOUR NOTEBOOK, YOUR RULES</span><h2>كتابك بيتكوّن</h2><p>راجع الصفحات، رتّبها، واختار الغلاف اللي يعجبك.</p></div><button type="button" className="sm-outline-button" onClick={() => setSelected([])}>مسح الاختيارات</button></div>
      <div className="sm-book-builder">
        <div className="sm-book-options">
          <label>الاسم على الغلاف<input value={name} onChange={event => setName(event.target.value)} maxLength={40} placeholder="اكتب اسمك هنا"/></label>
          <h3>اختار الغلاف</h3><div className="sm-cover-options">{covers.map(cover => <button key={cover.id} type="button" className={coverId === cover.id ? 'active' : ''} onClick={() => setCoverId(cover.id)}><div className={'sm-cover-swatch ' + cover.tone}><strong>{cover.title}</strong><small>{cover.subtitle}</small></div><span>{coverId === cover.id ? '✓ تم الاختيار' : 'اختار الغلاف'}</span></button>)}</div>
        </div>
        <div className="sm-book-summary"><div className={'sm-final-cover ' + activeCover.tone}><span>SUPERME</span><strong>{activeCover.title}</strong><small>{name || activeCover.subtitle}</small><i>✦</i></div><div className="sm-summary-content"><div><strong>{selected.length} / 60</strong><span>صفحة في كتابك</span></div><p>{selected.length === 60 ? 'كتابك جاهز للمعاينة.' : 'اختار ' + (60 - selected.length) + ' صفحة كمان عشان تكمل كتابك.'}</p><button type="button" className="sm-primary" onClick={() => setShowBook(true)} disabled={selected.length !== 60 || !name.trim()}>معاينة كتابي <span>←</span></button></div></div>
      </div>
      <div className="sm-selected-list"><div className="sm-selected-title"><h3>ترتيب صفحاتك</h3><span>{selectedPages.length} صفحة</span></div>
        {selectedPages.length ? <ol>{selectedPages.map((page, index) => <li key={page.id}><span className="sm-order-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{page.title}</strong><small>{page.sectionTitle}</small></div><button type="button" onClick={() => movePage(index, -1)} disabled={index === 0} aria-label="تحريك لأعلى">↑</button><button type="button" onClick={() => movePage(index, 1)} disabled={index === selectedPages.length - 1} aria-label="تحريك لأسفل">↓</button><button type="button" className="sm-remove" onClick={() => togglePage(page)} aria-label="حذف الصفحة">×</button></li>)}</ol> : <div className="sm-empty">لسه مفيش صفحات. اختار من المكتبة عشان تبدأ تكوّن كتابك.</div>}
      </div>
      {notice && <div className="sm-notice">{notice}</div>}
    </section>

    <section className="sm-book-section sm-checkout-section" id="checkout">
      <div className="sm-section-heading"><div><span className="sm-eyebrow">READY WHEN YOU ARE</span><h2>بيانات التوصيل وتأكيد الطلب</h2><p>الكتاب بيتسجل كطلب جديد في نفس قاعدة البيانات، ويظهر لفريق الإدارة لمراجعته.</p></div></div>
      <form className="sm-checkout-form" onSubmit={submitOrder}>
        <div className="sm-checkout-price">
          <span>سعر الكتاب: {bookPrice === null ? 'لم يحدد بعد' : bookPrice + ' جنيه'}</span>
          <span>الشحن: {shippingFee === null ? 'لم يحدد بعد' : shippingFee + ' جنيه'}</span>
          <strong>الإجمالي: {bookPrice === null || shippingFee === null ? '—' : (bookPrice + shippingFee) + ' جنيه'}</strong>
        </div>
        {!priceLoaded && <p>جارٍ تحميل الأسعار من إعدادات الإدارة...</p>}
        {priceLoaded && (bookPrice === null || shippingFee === null) && <p className="sm-form-footnote">الطلب غير متاح حتى تضبط الإدارة سعر كتاب SuperMe وسعر الشحن في لوحة الإدارة.</p>}
        <div className="sm-checkout-fields">
          <label>الاسم بالكامل<input value={checkout.name} onChange={event => setCheckout(current => ({ ...current, name: event.target.value }))} maxLength={80} required /></label>
          <label>رقم الموبايل<input value={checkout.phone} onChange={event => setCheckout(current => ({ ...current, phone: event.target.value }))} inputMode="tel" maxLength={20} required /></label>
          <label>المحافظة<input value={checkout.governorate} onChange={event => setCheckout(current => ({ ...current, governorate: event.target.value }))} maxLength={60} required /></label>
          <label>المنطقة<input value={checkout.area} onChange={event => setCheckout(current => ({ ...current, area: event.target.value }))} maxLength={80} required /></label>
          <label className="sm-checkout-wide">العنوان بالتفصيل<input value={checkout.address} onChange={event => setCheckout(current => ({ ...current, address: event.target.value }))} maxLength={300} required /></label>
          <label className="sm-checkout-wide">ملاحظات التوصيل (اختياري)<textarea value={checkout.notes} onChange={event => setCheckout(current => ({ ...current, notes: event.target.value }))} maxLength={300} rows={3} /></label>
        </div>
        <div className="sm-payment-choice"><label><input type="radio" name="sm-payment" checked={checkout.paymentMethod === 'cod'} onChange={() => setCheckout(current => ({ ...current, paymentMethod: 'cod' }))}/> الدفع عند الاستلام</label><label><input type="radio" name="sm-payment" checked={checkout.paymentMethod === 'instapay'} onChange={() => setCheckout(current => ({ ...current, paymentMethod: 'instapay' }))}/> InstaPay — مراجعة التحويل يدويًا</label></div>
        {orderError && <p className="form-error" role="alert">{orderError}</p>}
        {orderSuccess && <div className="sm-order-success"><strong>{orderSuccess}</strong>{trackingUrl && <a href={trackingUrl}>افتح رابط متابعة طلبك</a>}<button type="button" onClick={() => { void navigator.clipboard?.writeText(trackingUrl); }}>نسخ رابط المتابعة</button></div>}
        <button className="sm-primary" type="submit" disabled={orderBusy || selectedPages.length !== 60 || !name.trim() || !priceLoaded || bookPrice === null || shippingFee === null}>{orderBusy ? 'جارٍ تسجيل الطلب...' : 'تأكيد الطلب' } <span>←</span></button>
        <small className="sm-form-footnote">الطلب الجديد لا يخصم أي مبلغ تلقائيًا. الدفع عند الاستلام أو مراجعة تحويل InstaPay تتم حسب سياسة الإدارة.</small>
      </form>
    </section>

    <footer className="sm-footer"><a className="sm-logo" href="#top"><span className="sm-logo-mark">✦</span><span>SuperMe<small>YOUR LIFE. YOUR WAY.</small></span></a><p>مساحتك الخاصة… اختار اللي يشبهك.</p><small>SuperMe · Concept preview</small></footer>

    {preview && <PagePreview page={preview} onClose={() => setPreview(null)}/>}
    {showBook && <div className="sm-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowBook(false); }}><section className="sm-book-modal" role="dialog" aria-modal="true"><button className="sm-close" onClick={() => setShowBook(false)} type="button">×</button><div className={'sm-final-cover ' + activeCover.tone}><span>SUPERME</span><strong>{activeCover.title}</strong><small>{name}</small><i>✦</i></div><div><h2>ده كتابك يا {name}!</h2><p>اخترت 60 صفحة ورتبتها بنفسك. راجع بيانات كتابك ثم انتقل إلى بيانات التوصيل لتسجيل الطلب.</p><strong>الصفحات المختارة: 60</strong><button className="sm-primary" onClick={() => { setShowBook(false); window.location.hash = '#checkout'; }} type="button">استكمال بيانات الطلب</button><button className="sm-outline-button" onClick={() => setShowBook(false)} type="button">رجوع للتعديل</button></div></section></div>}
  </main>;
}
