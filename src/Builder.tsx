import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { collection, doc, getDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firestore } from './firebase/client';
import { loadCatalog } from './catalog/repository';
import { getOfferEndAt, getOfferRemainingMs, formatOfferCountdown } from './lib/offer';
import { attachAmbassadorReferralToOrder, clearAmbassadorReferral, getOrCreateAmbassadorCredentials, hashAmbassadorToken, readAmbassadorReferral, readAmbassadorReferralTrackingToken, saveAmbassadorContext } from './lib/ambassador';

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
  category, title, mark: marks[(ci + ti) % marks.length], tone: tones[(ci * 2 + ti) % tones.length], imageSrc: '',
})));
const covers = [
  { id: 'calm', title: 'الهدوء', subtitle: 'لحظة لنفسي', tone: 'cover-calm', mark: '☾' , imageSrc: '' },
  { id: 'fun', title: 'فكّيها', subtitle: 'الدنيا مش مستاهلة', tone: 'cover-fun', mark: '✿' , imageSrc: '' },
  { id: 'flowers', title: 'على رواق', subtitle: 'براحة وبمزاجي', tone: 'cover-flowers', mark: '❀' , imageSrc: '' },
  { id: 'bold', title: 'مش ناقصة', subtitle: 'بس مكملة', tone: 'cover-bold', mark: '✦' , imageSrc: '' },
  { id: 'space', title: 'مساحة لنفسي', subtitle: 'وقت ليا أنا', tone: 'cover-space', mark: '☾' , imageSrc: '' },
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
  const [catalogItems, setCatalogItems] = useState([] as typeof catalog);
  const [coverItems, setCoverItems] = useState([] as typeof covers);
  const [categoryItems, setCategoryItems] = useState<string[]>([]);
  const [catalogWarning, setCatalogWarning] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<(typeof catalog)[number] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState<'artworks' | 'cover' | 'book' | 'checkout'>('artworks');
  const [checkout, setCheckout] = useState({ name: '', phone: '', governorate: '', area: '', address: '', notes: '', paymentMethod: 'cod' as 'cod' | 'instapay' });
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [draft, setDraft] = useState<Draft>({ coverId: 'calm', name: '' });
  const [offerRemainingMs, setOfferRemainingMs] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState<number | null>(null);

  useEffect(() => {
    if (!firestore) return;
    return onSnapshot(doc(firestore, 'settings', 'public'), snapshot => {
      const value = snapshot.exists() ? snapshot.data().shippingFee : null;
      setShippingFee(typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null);
    }, () => setShippingFee(null));
  }, []);

  // Reuse the homepage's original deadline; entering or changing builder stages never restarts the offer.
  useEffect(() => {
    const endAt = getOfferEndAt(localStorage, 'anti-pressure-intro-offer-end-v2', Date.now());
    const update = () => setOfferRemainingMs(getOfferRemainingMs(endAt, Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCatalog().then(result => {
      if (cancelled) return;
      setCatalogWarning(result.warning || '');
      if (result.source === 'firestore') {
        const categoryTitles = new Map(result.data.categories.map(item => [item.id, item.title]));
        const tones = ['peach', 'lilac', 'mint', 'yellow', 'pink', 'blue'];
        const marks = ['✿','☕','♡','☼','☁','✧','❀','⌂','♫','☆'];
        setCategoryItems(result.data.categories.map(item => item.title));
        setCatalogItems(result.data.artworks.map((item, index) => ({
          id: item.id, title: item.title, category: categoryTitles.get(item.categoryId) || 'تصنيفات أخرى',
          mark: marks[index % marks.length], tone: tones[index % tones.length], imageSrc: item.previewAssetRef || '',
        })));
        setCoverItems(result.data.covers.map((item, index) => ({
          id: item.id, title: item.title, subtitle: item.subtitle || '', imageSrc: item.previewAssetRef || '',
          tone: ['cover-calm','cover-fun','cover-flowers','cover-bold','cover-space'][index % 5],
          mark: ['☾','✿','❀','✦','☾'][index % 5],
        })));
        setSelected(current => current.filter(id => result.data.artworks.some(item => item.id === id)).slice(0, 30));
        setDraft(current => result.data.covers.some(item => item.id === current.coverId) ? current : { ...current, coverId: result.data.covers[0]?.id || '' });
      }
    }).catch(() => setCatalogWarning('تعذر تحميل مكتبة الرسومات حاليًا.'));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) setSelected([...new Set(saved.filter((id: unknown) => typeof id === 'string' && catalogItems.some(item => item.id === id)) as string[])].slice(0, 30));
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

  const visible = useMemo(() => catalogItems.filter(item =>
    (activeCategory === 'الكل' || item.category === activeCategory) &&
    (item.title.includes(search.trim()) || item.category.includes(search.trim()) || item.id.toLowerCase().includes(search.trim().toLowerCase()))
  ), [catalogItems, activeCategory, search]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const remaining = 30 - selected.length;
  const activeCover = coverItems.find(c => c.id === draft.coverId) || coverItems[0];
  const fittedNameSize = Math.max(13, Math.min(25, 25 - Math.max(0, draft.name.trim().length - 8) * 0.55));

  function toggle(id: string) {
    setNotice('');
    if (selectedSet.has(id)) { setSelected(current => current.filter(item => item !== id)); return; }
    if (selected.length >= 30) { setNotice('اختيارك اكتمل 30 رسمة. شيلي رسمة الأول لو حابة تختاري غيرها.'); return; }
    setSelected(current => [...current, id]);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderError(''); setOrderSuccess('');
    if (!firestore) { setOrderError('خدمة الطلبات غير متاحة حاليًا. جرّبي مرة أخرى لاحقًا.'); return; }
    if (shippingFee === null) { setOrderError('سعر الشحن لم يتم ضبطه بعد. تواصلي معنا أو حاولي لاحقًا.'); return; }
    if (selected.length !== 30 || new Set(selected).size !== 30 || !draft.name.trim() || !activeCover) {
      setOrderError('راجعي اختيارات الكتاب: لازم 30 رسمة مختلفة وغلاف واسم.'); return;
    }
    const phone = checkout.phone.replace(/[\\s()-]/g, '');
    if (!/^(01[0125][0-9]{8}|\\+201[0125][0-9]{8}|201[0125][0-9]{8})$/.test(phone)) {
      setOrderError('اكتبي رقم موبايل مصري صحيح.'); return;
    }
    if (!checkout.name.trim() || !checkout.governorate.trim() || !checkout.area.trim() || !checkout.address.trim()) {
      setOrderError('كمّلي الاسم والمحافظة والمنطقة والعنوان.'); return;
    }
    setOrderBusy(true);
    try {
      const price = offerRemainingMs !== null && offerRemainingMs > 0 ? 190 : 240;
      const totalAmount = price + shippingFee;
      const artworkSnapshot = selected.map((artworkId, index) => {
        const item = catalogItems.find(entry => entry.id === artworkId);
        return { artworkId, titleSnapshot: item?.title || artworkId, printOrder: index + 1 };
      });
      const referralCode = new URLSearchParams(window.location.search).get('ref') || null;
      const ambassadorCredentials = await getOrCreateAmbassadorCredentials();
      const ambassadorAccessTokenHash = await hashAmbassadorToken(ambassadorCredentials.accessToken);
      let ambassadorReferralCode = readAmbassadorReferral();
      const pendingReferralTrackingToken = readAmbassadorReferralTrackingToken();
      if (ambassadorReferralCode && pendingReferralTrackingToken) {
        try {
          const previousReferralOrder = await getDoc(doc(firestore, 'orderTracking', pendingReferralTrackingToken));
          if (previousReferralOrder.exists() && previousReferralOrder.data().fulfillmentStatus === 'delivered') {
            clearAmbassadorReferral(ambassadorReferralCode);
            ambassadorReferralCode = null;
          }
        } catch { /* Keep attribution if status cannot be checked; the backend still validates delivery. */ }
      }
      const publicReference = 'AP-' + Date.now().toString(36).toUpperCase();
      const orderRef = doc(collection(firestore, 'orders'));
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const trackingToken = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
      const trackingRef = doc(firestore, 'orderTracking', trackingToken);
      const batch = writeBatch(firestore);
      batch.set(orderRef, {
        publicReference,
        customer: { name: checkout.name.trim(), phone },
        shipping: { governorateName: checkout.governorate.trim(), areaName: checkout.area.trim(), address: checkout.address.trim(), deliveryNotes: checkout.notes.trim(), fee: shippingFee },
        book: { artworks: artworkSnapshot, cover: { coverId: activeCover.id, titleSnapshot: activeCover.title }, personalizedName: draft.name.trim() },
        pricing: { currency: 'EGP', standardBookPrice: 240, bookPrice: price, shippingFee, totalAmount, offerApplied: price === 190 },
        paymentMethod: checkout.paymentMethod,
        paymentStatus: checkout.paymentMethod === 'instapay' ? 'pending_review' : 'unpaid',
        fulfillmentStatus: 'new',
        partnerCode: referralCode,
        ambassadorReferralCode,
        ambassadorSetup: { code: ambassadorCredentials.code, accessTokenHash: ambassadorAccessTokenHash },
        trackingToken,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      batch.set(trackingRef, {
        publicReference,
        fulfillmentStatus: 'new',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await batch.commit();
      saveAmbassadorContext({ ...ambassadorCredentials, sourceOrderId: orderRef.id, trackingToken });
      try {
        const key = 'anti-pressure:customer-tracking-tokens:v1';
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        const tokens = Array.isArray(saved) ? saved.filter((value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)) : [];
        localStorage.setItem(key, JSON.stringify([...new Set([trackingToken, ...tokens])].slice(0, 20)));
      } catch { /* The tracking link remains available in the order confirmation. */ }
      attachAmbassadorReferralToOrder(ambassadorReferralCode, trackingToken);
      const url = new URL(window.location.href);
      url.hash = '';
      url.searchParams.delete('ref');
      url.searchParams.delete('amb');
      url.searchParams.set('track', trackingToken);
      setTrackingUrl(url.toString());
      setOrderSuccess('تم استلام طلبك بنجاح! رقم الطلب: ' + orderRef.id + ' — رابط متابعة طلبك محفوظ على هذا الجهاز، وتقدري ترجعي له من «طلباتي».');
      setNotice('');
      setSelected([]);
      setDraft({coverId:'calm',name:''});
      setCheckout({name:'',phone:'',governorate:'',area:'',address:'',notes:'',paymentMethod:'cod'});
      setStep('checkout');
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch {
      setOrderError('مقدرناش نسجل الطلب. تأكدي من اتصال الإنترنت وإعدادات الطلبات ثم حاولي مرة أخرى.');
    } finally { setOrderBusy(false); }
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
          <p>خدي وقتك، قلّبي في التصنيفات، واختاري الرسومات اللي حابة تكون في كتابك، وترتيب الصفحات بيتحدد تلقائيًا حسب اختيارك.</p>
          <div className="catalog-live-note"><span>✦</span><div><b>مكتبة الرسومات المعتمدة</b><small>كل رسمة معروضة بصورتها الفعلية وكودها المستخدم في تجهيز الطباعة.</small></div></div>
        </div>
        <section className="selection-toolbar" aria-label="أدوات البحث والتصفية">
          <label className="art-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="دوري على رسمة أو تصنيف..." aria-label="ابحثي عن رسمة" /></label>
          <div className="filter-chips"><button className={activeCategory === 'الكل' ? 'chosen' : ''} onClick={() => setActiveCategory('الكل')}>كل الرسومات <small>{catalogItems.length}</small></button>{categoryItems.map((category, i) => <button key={category} className={activeCategory === category ? 'chosen' : ''} onClick={() => setActiveCategory(category)}>{category}<small>{String(i + 1).padStart(2, '0')}</small></button>)}</div>
        </section>
        {catalogWarning && <div className="catalog-live-note" role="status"><span>✦</span><div><b>تنبيه المكتبة</b><small>{catalogWarning}</small></div></div>}
        <div className="builder-results"><span>{visible.length} رسمة في العرض</span><span>اختاري 30 رسمة مختلفة فقط</span></div>
        <section className="builder-grid" aria-label="مكتبة الرسومات">
          {visible.map(item => {
            const isSelected = selectedSet.has(item.id);
            const locked = !isSelected && selected.length === 30;
            return <article className={'builder-art-card ' + (isSelected ? 'selected' : '')} key={item.id}>
              <button className="art-preview-button" type="button" onClick={() => setPreview(item)} aria-label={'معاينة ' + item.title}>
                {item.imageSrc ? <img src={item.imageSrc} alt={item.title} style={{width:'100%',height:'100%',objectFit:'contain',background:'#fff'}} /> : <div className="builder-art-unavailable">الصورة غير متاحة</div>}
              </button>
              <div className="builder-card-meta"><div><b>{item.title}</b><small>{item.category}</small></div><button type="button" className={'select-art-button ' + (isSelected ? 'is-selected' : '')} disabled={locked} onClick={() => toggle(item.id)}>{isSelected ? '✓ تم الاختيار' : '+ اختاري'}</button></div>
              <span className="art-code">{item.id}</span>
            </article>;
          })}
        </section>
        {visible.length === 0 && <div className="builder-empty">لا توجد رسومات معتمدة متاحة حاليًا. يرجى المحاولة لاحقًا.</div>}
      </main>

    </> : step === 'cover' ? <>
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
              {coverItems.map(cover => <button type="button" key={cover.id} className={'cover-picker ' + (draft.coverId === cover.id ? 'active' : '')} onClick={() => setDraft(current => ({ ...current, coverId: cover.id }))} aria-pressed={draft.coverId === cover.id}>
                <span className={'cover-picker-art ' + cover.tone}>{cover.imageSrc ? <img src={cover.imageSrc} alt={cover.title} style={{width:'100%',height:'100%',objectFit:'contain',background:'#fff'}} /> : <span>صورة الغلاف غير متاحة</span>}</span>
                <span className="cover-picker-label">{cover.title}{draft.coverId === cover.id ? ' ✓' : ''}</span>
              </button>)}
            </div>
            <label className="personal-name-label" htmlFor="book-personal-name">الاسم اللي يظهر على الغلاف</label>
            <input id="book-personal-name" className="personal-name-input" value={draft.name} maxLength={40} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} placeholder="اكتبي اسمك بالعربي أو English" dir="auto" />
            <div className="name-help">ممكن تكتبي الاسم بالعربي أو بالإنجليزي · 40 حرف كحد أقصى</div>
            <div className="cover-step-actions">
              <button type="button" className="clear-selection" onClick={() => { setStep('artworks'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>→ تعديل الرسومات</button>
              <button type="button" className="continue-selection" disabled={!draft.name.trim()} onClick={() => { setNotice(''); setStep('book'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>حفظ اختيارات الغلاف <span>✓</span></button>
            </div>
            {notice && <div className="cover-save-note" role="status">{notice}</div>}
          </div>
          <div className="cover-live-panel">
            <span className="cover-preview-caption">معاينة الغلاف المختار</span>
            <div className={'cover-live-art ' + activeCover.tone}>{activeCover.imageSrc && <img src={activeCover.imageSrc} alt={activeCover.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />}
              {activeCover.imageSrc && <img src={activeCover.imageSrc} alt={activeCover.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />}
              {!activeCover.imageSrc && <><span className="cover-live-decoration">{activeCover.mark}</span><span className="cover-live-brand">ANTI PRESSURE · فُكّي الضغط</span><strong>كتابك... على مزاجك!</strong><span className="cover-live-bottom">{activeCover.subtitle}</span></>}
              <span className="cover-live-name" style={{ fontSize: fittedNameSize + 'px' }}>{draft.name.trim() || 'اسمك هنا'}</span>
            </div>
            <p>دي معاينة الغلاف الفعلي مع الاسم اللي اخترتيه.</p>
            <div className="cover-selected-summary"><b>اختيارات كتابك</b><span>30 رسمة مختارة</span><span>غلاف: {activeCover.title}</span><span>الاسم: {draft.name.trim() || 'لم يُكتب بعد'}</span></div>
          </div>
        </section>
      </main>
    </> : step === 'book' ? <>
      <main className="builder-main book-preview-main">
        <div className="builder-intro">
          <span className="eyebrow">الخطوة الثالثة · كتابك بقى جاهز للمعاينة</span>
          <h1>بصي على كتابك قبل ما نكمل</h1>
          <p>راجعي الغلاف والاسم والـ30 رسمة اللي اخترتيهم. ترتيب الرسومات بيكون تلقائي، وتقدري ترجعي لأي خطوة وتعدلي اختياراتك.</p>
        </div>
        <section className="book-preview-layout">
          <div className="book-preview-cover-column">
            <span className="cover-preview-caption">الغلاف المختار</span>
            <div className={'cover-live-art book-final-cover ' + activeCover.tone}>
              {activeCover.imageSrc && <img src={activeCover.imageSrc} alt={activeCover.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />}
              <span className="cover-live-decoration">{activeCover.mark}</span>
              <span className="cover-live-brand">ANTI PRESSURE · فُكّي الضغط</span>
              <strong>كتابك... على مزاجك!</strong>
              <span className="cover-live-name" style={{ fontSize: fittedNameSize + 'px' }}>{draft.name.trim()}</span>
              <span className="cover-live-bottom">{activeCover.subtitle}</span>
            </div>
            <button type="button" className="clear-selection" onClick={() => setStep('cover')}>تعديل الغلاف أو الاسم</button>
          </div>
          <div className="book-artwork-review">
            <div className="book-review-heading"><div><b>رسومات كتابك</b><small>ترتيب تلقائي · 30 رسمة</small></div><button type="button" className="clear-selection" onClick={() => setStep('artworks')}>تعديل الرسومات</button></div>
            <div className="book-review-grid">{selected.map((id, index) => { const item = catalogItems.find(entry => entry.id === id); if (!item) return null; return <div className="book-review-item" key={id}><span className={'book-review-art ' + item.tone}>{item.imageSrc ? <img src={item.imageSrc} alt={item.title} /> : item.mark}</span><span><b>{item.title}</b><small>{item.id} · صفحة {index + 1}</small></span></div>; })}</div>
            <div className="book-preview-note">راجعي أكواد الرسومات وترتيبها قبل تأكيد الطلب. تجهيز الطباعة بيتم باستخدام الأكواد المسجلة في طلبك.</div>
            <div className="book-preview-actions"><button type="button" className="clear-selection" onClick={() => setStep('cover')}>رجوع</button><button type="button" className="continue-selection" disabled={selected.length !== 30 || !draft.name.trim()} onClick={() => { setOrderError(''); setOrderSuccess(''); setStep('checkout'); window.scrollTo({top:0,behavior:'smooth'}); }}>إدخال بيانات الطلب ←</button></div>
            {notice && step === 'book' && <div className="cover-save-note" role="status">{notice}</div>}
          </div>
        </section>
      </main>
    </> : <>
      <main className="builder-main checkout-main">
        <div className="builder-intro">
          <span className="eyebrow">الخطوة الرابعة · بيانات الطلب</span>
          <h1>هنوصّل كتابك لحد عندك</h1>
          <p>اكتبي بيانات التواصل والعنوان بدقة. الطلب هيوصل مباشرة للوحة الإدارة لمراجعته وتأكيده.</p>
        </div>
        <section className="checkout-layout">
          <form className="product-form checkout-form" onSubmit={submitOrder}>
            <h2>بيانات العميل والتوصيل</h2>
            <label>اسم العميل<input value={checkout.name} onChange={e => setCheckout(v => ({...v,name:e.target.value}))} maxLength={80} required /></label>
            <label>رقم الموبايل<input value={checkout.phone} onChange={e => setCheckout(v => ({...v,phone:e.target.value}))} inputMode="tel" placeholder="01xxxxxxxxx" maxLength={20} required /></label>
            <label>المحافظة<input value={checkout.governorate} onChange={e => setCheckout(v => ({...v,governorate:e.target.value}))} maxLength={60} required /></label>
            <label>المنطقة / المدينة<input value={checkout.area} onChange={e => setCheckout(v => ({...v,area:e.target.value}))} maxLength={80} required /></label>
            <label>العنوان بالتفصيل<textarea value={checkout.address} onChange={e => setCheckout(v => ({...v,address:e.target.value}))} maxLength={300} rows={3} required /></label>
            <label>ملاحظات للتوصيل (اختياري)<textarea value={checkout.notes} onChange={e => setCheckout(v => ({...v,notes:e.target.value}))} maxLength={300} rows={2} /></label>
            <fieldset className="checkout-payment"><legend>طريقة الدفع</legend><label><input type="radio" name="paymentMethod" value="cod" checked={checkout.paymentMethod==='cod'} onChange={() => setCheckout(v=>({...v,paymentMethod:'cod'}))}/> الدفع عند الاستلام</label><label><input type="radio" name="paymentMethod" value="instapay" checked={checkout.paymentMethod==='instapay'} onChange={() => setCheckout(v=>({...v,paymentMethod:'instapay'}))}/> InstaPay (تأكيد يدوي من الإدارة)</label></fieldset>
            <p className="backup-help">سعر الشحن ثابت حاليًا: {shippingFee === null ? 'لم يتم تحديده بعد' : shippingFee + ' جنيه'}. اختيار InstaPay لا يعني أن الدفع تم.</p>
            {orderError && <p className="form-error" role="alert">{orderError}</p>}
            {orderSuccess && <div className="form-success ap-tracking-success" role="status"><p>{orderSuccess}</p>{trackingUrl && <><a href={trackingUrl}>افتحي صفحة متابعة الطلب</a><button type="button" className="secondary-button" onClick={() => void navigator.clipboard.writeText(trackingUrl)}>نسخ رابط المتابعة</button><small>الرابط خاص بطلبك. هتلاقي الطلب محفوظًا في قسم «طلباتي» على نفس الجهاز.</small></>}</div>}
            <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStep('book')} disabled={orderBusy}>رجوع للمعاينة</button><button type="submit" className="primary-button" disabled={orderBusy || shippingFee === null}>{orderBusy ? 'جارٍ إرسال الطلب...' : 'تأكيد الطلب'}</button></div>
          </form>
          <aside className="checkout-summary">
            <h2>ملخص كتابك</h2>
            <div className={'cover-live-art ' + activeCover.tone}>{activeCover.imageSrc && <img src={activeCover.imageSrc} alt={activeCover.title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />}{!activeCover.imageSrc && <><span className="cover-live-decoration">{activeCover.mark}</span><span className="cover-live-brand">ANTI PRESSURE · فُكّي الضغط</span><strong>كتابك... على مزاجك!</strong><span className="cover-live-bottom">{activeCover.subtitle}</span></>}<span className="cover-live-name">{draft.name.trim()}</span></div>
            <p>30 رسمة مختارة · غلاف {activeCover.title}</p>
            <div className="checkout-price"><span>سعر الكتاب</span><strong>{offerRemainingMs !== null && offerRemainingMs > 0 ? '190' : '240'} جنيه</strong></div>
            {offerRemainingMs !== null && offerRemainingMs > 0 && <small>عرض الـ24 ساعة · ينتهي خلال {formatOfferCountdown(offerRemainingMs)}</small>}
            <div className="checkout-price"><span>الشحن</span><strong>{shippingFee === null ? 'غير محدد' : shippingFee + ' جنيه'}</strong></div>
            <div className="checkout-price"><span>الإجمالي</span><strong>{(offerRemainingMs !== null && offerRemainingMs > 0 ? 190 : 240) + (shippingFee ?? 0)} جنيه</strong></div>
          </aside>
        </section>
      </main>
    </>}
    <aside className={'selection-dock journey-dock journey-' + step} aria-label="تقدم تصميم كتابك والعرض السعري" aria-live="polite">
      <div className="journey-count"><strong>{selected.length}<i>/30</i></strong><span>{remaining === 0 ? 'اختياراتك اكتملت' : 'رسمة مختارة'}</span></div>
      <div className="journey-progress-area">
        <div className="journey-progress-copy"><b>{remaining === 0 ? 'يا سلام! خلصتي اختيار الرسومات' : 'كتابك بيتكوّن واحدة واحدة'}</b><span>{remaining === 0 ? '30 من 30 رسمة' : 'فاضلك ' + remaining + ' رسمة'}</span></div>
        <div className="selection-progress" role="progressbar" aria-label="عدد الرسومات المختارة" aria-valuemin={0} aria-valuemax={30} aria-valuenow={selected.length}><span style={{width: (selected.length / 30 * 100) + '%'}} /></div>
        <div className="journey-steps"><span className={step === 'artworks' ? 'current' : 'done'}>١ · الرسومات</span><span className={step === 'cover' ? 'current' : ['book','checkout'].includes(step) ? 'done' : ''}>٢ · الغلاف والاسم</span><span className={step === 'book' ? 'current' : step === 'checkout' ? 'done' : ''}>٣ · المعاينة</span><span className={step === 'checkout' ? 'current' : ''}>٤ · الطلب</span></div>
        <div className={'journey-offer ' + (offerRemainingMs !== null && offerRemainingMs > 0 ? 'is-active' : 'is-ended')} role="timer" aria-live="off">
          <span>{offerRemainingMs !== null && offerRemainingMs > 0 ? 'عرضك مستمر طوال رحلتك' : 'انتهى العرض الترحيبي'}</span>
          <strong>{offerRemainingMs !== null && offerRemainingMs > 0 ? '190 جنيه' : '240 جنيه'}</strong>
          {offerRemainingMs !== null && offerRemainingMs > 0 && <small>عرض الـ24 ساعة · ينتهي خلال {formatOfferCountdown(offerRemainingMs)}</small>}
        </div>
      </div>
      <div className="journey-actions">{step === 'artworks' ? <><button type="button" className="clear-selection" onClick={clearAll} disabled={!selected.length}>مسح</button><button type="button" className="continue-selection" disabled={selected.length !== 30 || !coverItems.length} onClick={() => {setStep('cover');setNotice('');window.scrollTo({top:0,behavior:'smooth'});}}>اختاري الغلاف ←</button></> : step === 'cover' ? <><button type="button" className="clear-selection" onClick={() => {setStep('artworks');window.scrollTo({top:0,behavior:'smooth'});}}>الرسومات</button><button type="button" className="continue-selection" disabled={!draft.name.trim()} onClick={() => {setNotice('');setStep('book');window.scrollTo({top:0,behavior:'smooth'});}}>معاينة كتابي ←</button></> : step === 'book' ? <><button type="button" className="clear-selection" onClick={() => {setStep('cover');window.scrollTo({top:0,behavior:'smooth'});}}>تعديل الغلاف</button><button type="button" className="continue-selection" onClick={() => {setStep('checkout');window.scrollTo({top:0,behavior:'smooth'});}}>إتمام الطلب ←</button></> : <><button type="button" className="clear-selection" onClick={() => {setStep('book');window.scrollTo({top:0,behavior:'smooth'});}}>المعاينة</button><button type="button" className="continue-selection" onClick={() => {setStep('artworks');window.scrollTo({top:0,behavior:'smooth'});}}>تعديل الرسومات</button></>}</div>
    </aside>
    {preview && step === 'artworks' && <div className="preview-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPreview(null); }}>
      <section className="art-preview-modal" role="dialog" aria-modal="true" aria-label="معاينة الرسمة">
        <button className="preview-close" type="button" onClick={() => setPreview(null)} aria-label="إغلاق">×</button>
        {preview.imageSrc ? <img src={preview.imageSrc} alt={preview.title} style={{width:'100%',maxHeight:360,objectFit:'contain',background:'#fff'}} /> : <div className="builder-art-unavailable">الصورة غير متاحة</div>}
        <h2>{preview.title}</h2><p>{preview.category} · {preview.id}</p>
        <button type="button" className="continue-selection modal-select" onClick={() => { toggle(preview.id); setPreview(null); }}>{selectedSet.has(preview.id) ? 'إزالة من اختياراتي' : 'اختاري الرسمة دي'}</button>
      </section>
    </div>}
    {notice && step === 'artworks' && <div className="builder-toast" role="status">{notice}</div>}
  </div>;
}
