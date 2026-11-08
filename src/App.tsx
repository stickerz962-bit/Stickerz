import { useEffect, useState } from 'react';
import { getOfferEndAt, getOfferRemainingMs, formatOfferCountdown } from './lib/offer';
import Builder from './Builder';
import HeroBookAnimation from './HeroBookAnimation';
import { loadCatalog } from './catalog/repository';
import CatalogImage from './catalog/CatalogImage';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase/client';
import type { CatalogData } from './catalog/types';
import AmbassadorApp from './AmbassadorApp';
import { buildAmbassadorDashboardUrl, captureAmbassadorReferral, clearAmbassadorReferral, readAmbassadorContext, readAmbassadorReferralTrackingToken } from './lib/ambassador';
const CUSTOMER_TRACKING_KEY = 'anti-pressure:customer-tracking-tokens:v1';

const steps = [
  { number: '01', icon: '✎', title: 'اختاري 30 رسمة', text: 'من مكتبتنا اختاري الرسومات اللي شبه يومك ومزاجك.' },
  { number: '02', icon: '♡', title: 'اختاري الغلاف', text: 'خمسة تصميمات مبهجة، وكل غلاف له حكاية مختلفة.' },
  { number: '03', icon: 'Aa', title: 'اكتبي اسمك', text: 'اسمك يظهر على الغلاف بلمسة شخصية.' },
  { number: '04', icon: '⌕', title: 'عايني كتابك', text: 'راجعي شكل الغلاف واختياراتك قبل تأكيد الطلب.' },
  { number: '05', icon: '⌂', title: 'اكتبي عنوانك', text: 'حددي بيانات التوصيل والمنطقة.' },
  { number: '06', icon: '♡', title: 'اختاري الدفع', text: 'الدفع عند الاستلام أو InstaPay بعد مراجعة التحويل.' },
];

const faqs = [
  { q: 'الكتاب فيه كام رسمة؟', a: 'الكتاب بيتكوّن من 30 رسمة مختلفة، وإنتِ بتختاريهم بنفسك من مكتبة الرسومات.' },
  { q: 'ترتيب الرسومات بيتحدد إزاي؟', a: 'ترتيب صفحات الكتاب بيتحدد تلقائيًا حسب ترتيب اختيارك للرسومات، ومفيش ترتيب يدوي في المعاينة.' },
  { q: 'هل أقدر أكتب اسمي على الغلاف؟', a: 'أكيد، اكتبي الاسم وشوفي معاينة الغلاف قبل ما تأكدي الطلب.' },
  { q: 'إيه طرق الدفع المتاحة؟', a: 'الدفع عند الاستلام أو InstaPay. تحويل InstaPay بيحتاج مراجعة يدوية قبل تأكيد الدفع.' },
  { q: 'الشحن بكام؟', a: 'سعر الشحن الموحد بيظهر في صفحة الطلب قبل التأكيد، وبيتحدث حسب السعر المحدد من الإدارة.' },
  { q: 'هل محتاجة أعمل حساب؟', a: 'لأ، تقدري تصممي كتابك وتطلبي كزائرة من غير إنشاء حساب.' },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return <a className={footer ? 'brand brand-footer' : 'brand'} href="#home" aria-label="ANTI PRESSURE الرئيسية">
    <span className="brand-spark">✳</span><span className="brand-word">ANTI<br />PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span>
  </a>;
}


const trackingSteps = [
  ['new', 'تم استلام الطلب'], ['confirmed', 'تم تأكيد الطلب'], ['artwork_codes_review', 'مراجعة أكواد الرسومات'],
  ['ready_for_printing', 'جاهز للطباعة'], ['printing', 'قيد الطباعة'], ['quality_check', 'مراجعة الجودة'],
  ['ready_for_shipping', 'جاهز للشحن'], ['shipped', 'خرج للشحن'], ['delivered', 'تم التسليم'],
];
const trackingLabels: Record<string,string> = trackingSteps.reduce<Record<string,string>>((labels, [key, label]) => ({ ...labels, [key]: label }), { cancelled: 'تم إلغاء الطلب' });

function OrderTracking({ token }: { token: string }) {
  const [record, setRecord] = useState<{ publicReference?: string; fulfillmentStatus?: string; updatedAt?: { toDate?: () => Date } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ambassadorDashboardUrl, setAmbassadorDashboardUrl] = useState('');
  const refresh = async () => {
    if (!firestore || !/^[a-f0-9]{64}$/.test(token)) { setFailed(true); setLoading(false); return; }
    setLoading(true); setFailed(false);
    try {
      const snap = await getDoc(doc(firestore, 'orderTracking', token));
      if (!snap.exists()) setFailed(true);
      else setRecord(snap.data() as typeof record);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, [token]);
  useEffect(() => {
    if (record?.fulfillmentStatus !== 'delivered') return;
    const context = readAmbassadorContext();
    if (context) setAmbassadorDashboardUrl(buildAmbassadorDashboardUrl(context.code, context.accessToken));
    if (readAmbassadorReferralTrackingToken() === token) clearAmbassadorReferral();
  }, [record, token]);
  const storedStatus = record?.fulfillmentStatus || 'new';
  const status = storedStatus === 'pdf_generating' ? 'artwork_codes_review' : storedStatus;
  const currentIndex = trackingSteps.findIndex(item => item[0] === status);
  return <div className="anti-shell ap-tracking-page" dir="rtl"><header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><a className="header-cta" href="./">الرئيسية</a></header><main className="ap-tracking-card"><span className="eyebrow">ANTI PRESSURE · متابعة الطلب</span><h1>طلبك فين دلوقتي؟</h1>{loading ? <p>جارٍ تحميل حالة الطلب...</p> : failed ? <><p>رابط المتابعة غير صحيح أو لم يعد متاحًا.</p><a className="primary-button" href="./">العودة للموقع</a></> : <><strong className="ap-tracking-reference">{record?.publicReference}</strong><p className="ap-tracking-current">{status === 'cancelled' ? 'تم إلغاء الطلب' : trackingLabels[status] || 'جارٍ تحديث الحالة'}</p><div className="ap-tracking-timeline">{trackingSteps.map(([key,label],index) => <div key={key} className={'ap-tracking-step ' + (status === 'cancelled' ? '' : index <= currentIndex ? 'done' : '')}><i>{index < currentIndex ? '✓' : index + 1}</i><span>{label}</span></div>)}</div>{status === 'cancelled' && <p className="ap-tracking-cancelled">تم إلغاء هذا الطلب.</p>}{status === 'delivered' && ambassadorDashboardUrl && <section className="ap-ambassador-unlock"><span>♡</span><h2>كتابك وصل.. وبقت ليكي مساحة حلوة!</h2><p>اتفعّلت مساحتك في مكافأة التلوين. شاركي رابطك واكسبي 15 جنيهًا عن كل طلب يتسلّم من خلالك.</p><a className="primary-button" href={ambassadorDashboardUrl}>افتحي مساحتي الحلوة</a><small>احتفظي برابط المساحة الخاصة، وشاركي رابط الدعوة من داخلها فقط.</small></section>}<small>آخر تحديث: {record?.updatedAt?.toDate ? record.updatedAt.toDate().toLocaleString('ar-EG') : 'قيد التحديث'}</small><button className="secondary-button" onClick={() => void refresh()}>تحديث الحالة</button><p className="ap-tracking-privacy">صفحة المتابعة تعرض حالة الطلب فقط، ولا تعرض بياناتك الشخصية أو عنوان الشحن.</p></>}</main></div>;
}

export default function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const trackingToken = new URLSearchParams(window.location.search).get('track');
  const [routeHash, setRouteHash] = useState(window.location.hash);
  const [savedTrackingTokens, setSavedTrackingTokens] = useState<string[]>([]);
  const [savedAmbassadorUrl, setSavedAmbassadorUrl] = useState('');
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(CUSTOMER_TRACKING_KEY) || '[]');
      if (Array.isArray(value)) setSavedTrackingTokens([...new Set(value.filter((token: unknown) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)))].slice(0, 20));
    } catch { setSavedTrackingTokens([]); }
    const context = readAmbassadorContext();
    if (context) {
      setSavedAmbassadorUrl(buildAmbassadorDashboardUrl(context.code, context.accessToken));
      if (/^[a-f0-9]{64}$/.test(context.trackingToken)) {
        setSavedTrackingTokens(current => [...new Set([context.trackingToken, ...current])].slice(0, 20));
        try { localStorage.setItem(CUSTOMER_TRACKING_KEY, JSON.stringify([...new Set([context.trackingToken, ...JSON.parse(localStorage.getItem(CUSTOMER_TRACKING_KEY) || '[]')])].slice(0, 20))); } catch { /* keep in-memory fallback */ }
      }
    }
  }, []);
  const ambassadorMatch = /^#ambassador\/(AP[A-F0-9]{20})\/([a-f0-9]{64})$/.exec(routeHash);
  useEffect(() => {
    const pendingTrackingToken = readAmbassadorReferralTrackingToken();
    if (pendingTrackingToken && firestore) {
      getDoc(doc(firestore, 'orderTracking', pendingTrackingToken)).then(snapshot => {
        if (snapshot.exists() && snapshot.data().fulfillmentStatus === 'delivered') {
          clearAmbassadorReferral();
          captureAmbassadorReferral(window.location.search);
        }
      }).catch(() => {});
    } else {
      captureAmbassadorReferral(window.location.search);
    }
  }, []);

  const [offerRemainingMs, setOfferRemainingMs] = useState<number | null>(null);
  useEffect(() => {
    const storageKey = 'anti-pressure-intro-offer-end-v2';
    const endAt = getOfferEndAt(localStorage, storageKey, Date.now());
    const update = () => setOfferRemainingMs(getOfferRemainingMs(endAt, Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const offerActive = offerRemainingMs !== null && offerRemainingMs > 0;
  const [catalogData, setCatalogData] = useState<CatalogData>({ categories: [], artworks: [], covers: [] });
  const [catalogNotice, setCatalogNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadCatalog().then(result => {
      if (cancelled) return;
      setCatalogData(result.data);
      setCatalogNotice(result.warning || '');
    }).catch(() => setCatalogNotice('تعذر تحميل المكتبة حاليًا.'));
    return () => { cancelled = true; };
  }, []);
  const [builderOpen, setBuilderOpen] = useState(window.location.hash === '#design');
  useEffect(() => {
    const syncRoute = () => { setRouteHash(window.location.hash); setBuilderOpen(window.location.hash === '#design'); };
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  if (trackingToken) return <OrderTracking token={trackingToken} />;
  if (ambassadorMatch) return <AmbassadorApp code={ambassadorMatch[1]} accessToken={ambassadorMatch[2]} />;
  if (builderOpen) return <Builder />;
  return <div className="anti-shell" dir="rtl">
    <div className="top-note">مساحتك الصغيرة للضحك والتلوين ♡</div>
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="القائمة الرئيسية">
        <a className="active" href="#home">الرئيسية</a><a href="#how">كيف تصممي كتابك؟</a><a href="#covers">الأغلفة</a><a href="#gallery">الرسومات</a><a href="#about">عنّا</a><a href="#faq">الأسئلة الشائعة</a><a href="#customer-area">طلباتي ومكافأة التلوين</a>
      </nav>
      <a className="header-cta" href="#design">صممي كتابك <span>←</span></a>
    </header>

    <main>
      <section className="hero-section" id="home">
        <div className="hero-doodles doodle-one">✧</div><div className="hero-doodles doodle-two">♡</div><div className="hero-doodles doodle-three">✿</div>
        <div className="hero-copy">
          <span className="eyebrow"><i /> مساحة صغيرة على مزاجك</span>
          <h1>فُكّي الضغط!</h1>
          <p className="hero-tagline">كتابك... <em>على مزاجك!</em></p>
          <p className="hero-description">اختاري 30 رسمة من مكتبتنا، اكتبي اسمك على الغلاف، واعملي كتاب تلوين شخصي مطبوع ومجلّد يوصل لحد باب بيتك.</p>
          <div className="hero-actions"><a className="primary-button" href="#design">صممي كتابك الآن <span>←</span></a><a className="quiet-link" href="#gallery">اتفرجي على الرسومات <span>↓</span></a></div>
          <div className="hero-facts"><span>♡ 30 رسمة من اختيارك</span><span>✿ غلاف باسمك</span><span>✦ توصيل لحد البيت</span></div>
        </div>
        <HeroBookAnimation />
      </section>

      <section className="promise-strip" aria-label="مميزات الكتاب">
        <div><span>♡</span><p><b>كتاب معمول ليكي</b><small>اختياراتك واسمك</small></p></div>
        <div><span>✎</span><p><b>رسومات متنوعة</b><small>10 تصنيفات مختلفة</small></p></div>
        <div><span>✿</span><p><b>تجربة سهلة</b><small>من الموبايل أو الكمبيوتر</small></p></div>
        <div><span>⌂</span><p><b>يوصل لحد البيت</b><small>والشحن واضح قبل الطلب</small></p></div>
      </section>

      <section className="how-section section-wrap" id="how">
        <div className="section-heading"><span className="eyebrow">خطوات بسيطة ورايقة</span><h2>كتابك بيبدأ من اختياراتك</h2><p>من أول رسمة لحد ما كتابك يوصل، كل حاجة واضحة وفي إيدك.</p></div>
        <div className="steps-grid">{steps.map(step => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><span className="step-icon">{step.icon}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="gallery-section section-wrap" id="gallery">
        <div className="section-heading heading-row"><div><span className="eyebrow">كل رسمة ليها مود</span><h2>اختاري اللي شبهك</h2><p>مكتبة متنوعة فيها تفاصيل من يومنا وضحكنا وحاجات بنفكر فيها.</p></div><span className="side-note">{catalogData.categories.length} تصنيفات · {catalogData.artworks.length} رسمة متاحة</span></div>
        {catalogNotice && <p className="gallery-disclaimer" role="status">{catalogNotice}</p>}
        <div className="category-chips">{catalogData.categories.map((category, index) => <span key={category.id}>{category.title}<i>{String(index + 1).padStart(2, '0')}</i></span>)}</div>
        <div className="artwork-grid">{catalogData.artworks.slice(0, 6).map(art => <article className="artwork-card" key={art.id}><div className="artwork-preview">{art.previewAssetRef ? <CatalogImage source={art.previewAssetRef} alt={art.title} fit="cover" /> : <span>معاينة غير متاحة</span>}</div><div className="artwork-caption"><b>{art.title}</b><span>{art.id}</span></div></article>)}</div>
        {!catalogData.artworks.length && <p className="gallery-disclaimer">سيتم عرض الرسومات المعتمدة هنا فور إتاحتها.</p>}
      </section>

      <section className="covers-section" id="covers">
        <div className="section-wrap">
          <div className="section-heading"><span className="eyebrow">الغلاف اللي على مزاجك</span><h2>اختاري حكاية الغلاف</h2><p>اختاري التصميم الأقرب ليكي، واسمك هيكون جزء منه.</p></div>
          <div className="covers-grid">{catalogData.covers.map(cover => <article className="cover-option" key={cover.id}><div className="cover-art">{cover.previewAssetRef ? <CatalogImage source={cover.previewAssetRef} alt={cover.title} fit="cover" /> : <span>معاينة غير متاحة</span>}</div><strong>{cover.title}</strong></article>)}</div>
          {!catalogData.covers.length && <p className="gallery-disclaimer">سيتم عرض الأغلفة المعتمدة هنا فور إتاحتها.</p>}
        </div>
      </section>

      <section className="price-section section-wrap" id="about">
        <div className="price-copy"><span className="eyebrow">تفصيلة صغيرة تفرق</span><h2>مساحتك... وكتابك... ومزاجك</h2><p>كتاب تلوين متفصّل على اختياراتك، بغلاف مخصص و30 رسمة مختلفة، علشان تاخدي وقت لنفسك وتلوّني على رواق.</p><a className="primary-button" href="#design">ابدئي تصميم كتابك <span>←</span></a></div>
        <div className="price-card"><span className="price-label">سعر الكتاب</span><div className="offer-price-row"><div className="price-number">{offerActive ? "190" : "240"} <small>جنيه</small></div>{offerActive && <span className="old-price">240 جنيه</span>}</div><span className="offer-status">{offerActive ? "عرض ترحيبي لمدة 24 ساعة" : "انتهى العرض — السعر الأساسي"}</span>{offerActive && <div className="offer-countdown" role="timer" aria-live="off"><span>الوقت المتبقي للعرض</span><strong>{formatOfferCountdown(offerRemainingMs ?? 0)}</strong></div>}<span className="price-includes">30 رسمة + غلاف باسمك + تجليد سلك</span><div className="price-divider"></div><p>الشحن بيتحسب حسب منطقتك وبيظهر قبل تأكيد الطلب.</p><small className="price-footnote">طرق الدفع: عند الاستلام أو InstaPay بعد مراجعة التحويل.</small></div>
      </section>

      <section className="customer-quick-access section-wrap" id="customer-area" aria-label="طلباتي ومكافأة التلوين"><div className="section-heading"><span className="eyebrow">مساحتك الخاصة ♡</span><h2>طلباتي وسفيراتي</h2><p>روابطك محفوظة على نفس الجهاز علشان ترجعي لها بسهولة.</p></div><div className="customer-quick-grid">{savedTrackingTokens.length ? savedTrackingTokens.map((token,index) => <a className="secondary-button" key={token} href={'?track=' + token}>متابعة الطلب {savedTrackingTokens.length > 1 ? (index + 1) : ''} ←</a>) : <p>لما تعملي طلب، رابط متابعته هيظهر هنا تلقائيًا.</p>}{savedAmbassadorUrl ? <a className="primary-button" href={savedAmbassadorUrl}>مساحة سفيراتي ♡</a> : <p>رابط مساحة السفيرات هيظهر هنا بعد إنشاء طلبك، ويُتاح البرنامج بعد استيفاء شروط التأهيل وتفعيل المكافآت.</p>}</div></section>
      <section className="faq-section section-wrap" id="faq">
        <div className="section-heading"><span className="eyebrow">حاجات ممكن تسألي عنها</span><h2>الأسئلة الشائعة</h2></div>
        <div className="faq-list">{faqs.map((faq, index) => <article className={'faq-item ' + (openFaq === index ? 'is-open' : '')} key={faq.q}><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{faq.q}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index && <p>{faq.a}</p>}</article>)}</div>
      </section>
      <section className="final-cta"><span>♡</span><h2>جاهزة تفكّي الضغط؟</h2><p>اعملي كتابك بطريقتك، واختاري كل رسمة على مزاجك.</p><a className="primary-button" href="#design">يلا نصمم كتابي <span>←</span></a></section>
    </main>

    <footer className="site-footer"><div className="footer-main"><Brand footer /><p>مساحة لطيفة، رسومات على مزاجك، وكتاب معمول ليكي.</p><nav><a href="#how">كيف تصممي كتابك؟</a><a href="#gallery">الرسومات</a><a href="#covers">الأغلفة</a><a href="#faq">الأسئلة الشائعة</a><a href="#customer-area">طلباتي وسفيراتي</a></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ANTI PRESSURE — فُكّي الضغط</span><span>كتابك... على مزاجك! ♡</span></div></footer>
  </div>;
}
