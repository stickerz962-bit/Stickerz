import { useEffect, useState } from 'react';
import Builder from './Builder';

const steps = [
  { number: '01', icon: '✎', title: 'اختاري 30 رسمة', text: 'من مكتبتنا اختاري الرسومات اللي شبه يومك ومزاجك.' },
  { number: '02', icon: '♡', title: 'اختاري الغلاف', text: 'خمسة تصميمات مبهجة، وكل غلاف له حكاية مختلفة.' },
  { number: '03', icon: 'Aa', title: 'اكتبي اسمك', text: 'اسمك يظهر على الغلاف بلمسة شخصية.' },
  { number: '04', icon: '⌕', title: 'عايني كتابك', text: 'راجعي شكل الغلاف واختياراتك قبل تأكيد الطلب.' },
  { number: '05', icon: '⌂', title: 'اكتبي عنوانك', text: 'حددي بيانات التوصيل والمنطقة.' },
  { number: '06', icon: '♡', title: 'اختاري الدفع', text: 'الدفع عند الاستلام أو InstaPay بعد مراجعة التحويل.' },
];

const categories = ['فوضى المسؤوليات', 'تقلبات المزاج', 'الناس والعلاقات', 'قهوة وأكل', 'حب وعلاقات', 'شغل وفلوس', 'البيت والعيلة', 'اهتمام بنفسي', 'تفكير زيادة', 'حكمة وضحك'];
const artworks = [
  { title: 'قهوة وراحة', mark: '☕', tone: 'peach' },
  { title: 'يوم طويل', mark: '☼', tone: 'lilac' },
  { title: 'مساحة هادية', mark: '✿', tone: 'mint' },
  { title: 'دماغ مشغولة', mark: '☁', tone: 'yellow' },
  { title: 'على رواق', mark: '♡', tone: 'pink' },
  { title: 'أنا أهو', mark: '✧', tone: 'blue' },
];
const covers = [
  { title: 'الهدوء', subtitle: 'لحظة لنفسي', tone: 'cover-calm', mark: '☾' },
  { title: 'فكّيها', subtitle: 'الدنيا مش مستاهلة', tone: 'cover-fun', mark: '✿' },
  { title: 'على رواق', subtitle: 'براحة وبمزاجي', tone: 'cover-flowers', mark: '❀' },
  { title: 'مش ناقصة', subtitle: 'بس مكملة', tone: 'cover-bold', mark: '✦' },
  { title: 'مساحة لنفسي', subtitle: 'وقت ليا أنا', tone: 'cover-space', mark: '☾' },
];
const faqs = [
  { q: 'الكتاب فيه كام رسمة؟', a: 'الكتاب بيتكوّن من 30 رسمة مختلفة، وإنتِ بتختاريهم بنفسك من مكتبة الرسومات.' },
  { q: 'ينفع أختار ترتيب الرسومات؟', a: 'ترتيب الصفحات بيحدده النظام تلقائيًا؛ إنتِ تركزي بس في اختيار الرسومات اللي بتحبيها.' },
  { q: 'هل أقدر أكتب اسمي على الغلاف؟', a: 'أكيد، اكتبي الاسم وشوفي معاينة الغلاف قبل ما تأكدي الطلب.' },
  { q: 'إيه طرق الدفع المتاحة؟', a: 'الدفع عند الاستلام أو InstaPay. تحويل InstaPay بيحتاج مراجعة يدوية قبل تأكيد الدفع.' },
  { q: 'الشحن بكام؟', a: 'تكلفة الشحن بتظهر حسب المحافظة والمنطقة قبل تأكيد الطلب النهائي.' },
  { q: 'هل محتاجة أعمل حساب؟', a: 'لأ، تقدري تصممي كتابك وتطلبي كزائرة من غير إنشاء حساب.' },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return <a className={footer ? 'brand brand-footer' : 'brand'} href="#home" aria-label="ANTI PRESSURE الرئيسية">
    <span className="brand-spark">✳</span><span className="brand-word">ANTI<br />PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span>
  </a>;
}

export default function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [builderOpen, setBuilderOpen] = useState(window.location.hash === '#design');
  useEffect(() => {
    const syncRoute = () => setBuilderOpen(window.location.hash === '#design');
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);
  if (builderOpen) return <Builder />;
  return <div className="anti-shell" dir="rtl">
    <div className="top-note">مساحتك الصغيرة للضحك والتلوين ♡</div>
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="القائمة الرئيسية">
        <a className="active" href="#home">الرئيسية</a><a href="#how">كيف تصممي كتابك؟</a><a href="#covers">الأغلفة</a><a href="#gallery">الرسومات</a><a href="#about">عنّا</a><a href="#faq">الأسئلة الشائعة</a>
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
        <div className="hero-visual" aria-label="رسم توضيحي لكتاب تلوين مخصص" role="img">
          <div className="hero-sun"></div><span className="float-star star-a">✦</span><span className="float-star star-b">✧</span><span className="float-heart">♡</span>
          <div className="hero-book"><div className="book-spiral">••••••••••••</div><div className="book-cover-art"><span className="cover-mini-flower">✿</span><span className="cover-mini-heart">♡</span><span className="cover-girl">☺</span><strong>فُكّي الضغط</strong><small>كتابك... على مزاجك!</small><span className="cover-leaf">❧</span></div><span className="book-name">كتاب سارة</span></div>
          <div className="pencil pencil-one"></div><div className="pencil pencil-two"></div>
          <div className="hero-sticker">30 رسمة<br /><b>من اختيارك</b></div>
        </div>
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
        <div className="section-heading heading-row"><div><span className="eyebrow">كل رسمة ليها مود</span><h2>اختاري اللي شبهك</h2><p>مكتبة متنوعة فيها تفاصيل من يومنا وضحكنا وحاجات بنفكر فيها.</p></div><span className="side-note">10 تصنيفات · 100 رسمة عند اكتمال المكتبة</span></div>
        <div className="category-chips">{categories.map((category, index) => <span key={category}>{category}<i>{String(index + 1).padStart(2, '0')}</i></span>)}</div>
        <div className="artwork-grid">{artworks.map((art, index) => <article className="artwork-card" key={art.title}><div className={'artwork-preview ' + art.tone}><span className="artwork-sun">✧</span><span className="artwork-symbol">{art.mark}</span><span className="artwork-line">﹏﹏﹏</span><small>فُكّي الضغط</small></div><div className="artwork-caption"><b>{art.title}</b><span>نموذج توضيحي</span></div></article>)}</div>
        <p className="gallery-disclaimer">دي معاينات توضيحية لروح المكتبة؛ الرسومات النهائية هتتعرض بعد تجهيزها واعتمادها.</p>
      </section>

      <section className="covers-section" id="covers">
        <div className="section-wrap">
          <div className="section-heading"><span className="eyebrow">الغلاف اللي على مزاجك</span><h2>اختاري حكاية الغلاف</h2><p>اختاري التصميم الأقرب ليكي، واسمك هيكون جزء منه.</p></div>
          <div className="covers-grid">{covers.map(cover => <article className="cover-option" key={cover.title}><div className={'cover-art ' + cover.tone}><span className="cover-decoration">{cover.mark}</span><b>{cover.title}</b><small>{cover.subtitle}</small><span className="cover-person">☺</span></div><strong>{cover.title}</strong></article>)}</div>
        </div>
      </section>

      <section className="price-section section-wrap" id="about">
        <div className="price-copy"><span className="eyebrow">تفصيلة صغيرة تفرق</span><h2>مساحتك... وكتابك... ومزاجك</h2><p>كتاب تلوين متفصّل على اختياراتك، بغلاف مخصص و30 رسمة مختلفة، علشان تاخدي وقت لنفسك وتلوّني على رواق.</p><a className="primary-button" href="#design">ابدئي تصميم كتابك <span>←</span></a></div>
        <div className="price-card"><span className="price-label">سعر الكتاب</span><div className="price-number">230 <small>جنيه</small></div><span className="price-includes">30 رسمة + غلاف باسمك + تجليد سلك</span><div className="price-divider"></div><p>الشحن بيتحسب حسب منطقتك وبيظهر قبل تأكيد الطلب.</p><small className="price-footnote">طرق الدفع: عند الاستلام أو InstaPay بعد مراجعة التحويل.</small></div>
      </section>

      <section className="faq-section section-wrap" id="faq">
        <div className="section-heading"><span className="eyebrow">حاجات ممكن تسألي عنها</span><h2>الأسئلة الشائعة</h2></div>
        <div className="faq-list">{faqs.map((faq, index) => <article className={'faq-item ' + (openFaq === index ? 'is-open' : '')} key={faq.q}><button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{faq.q}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index && <p>{faq.a}</p>}</article>)}</div>
      </section>
      <section className="final-cta"><span>♡</span><h2>جاهزة تفكّي الضغط؟</h2><p>اعملي كتابك بطريقتك، واختاري كل رسمة على مزاجك.</p><a className="primary-button" href="#design">يلا نصمم كتابي <span>←</span></a></section>
    </main>

    <footer className="site-footer"><div className="footer-main"><Brand footer /><p>مساحة لطيفة، رسومات على مزاجك، وكتاب معمول ليكي.</p><nav><a href="#how">كيف تصممي كتابك؟</a><a href="#gallery">الرسومات</a><a href="#covers">الأغلفة</a><a href="#faq">الأسئلة الشائعة</a></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} ANTI PRESSURE — فُكّي الضغط</span><span>كتابك... على مزاجك! ♡</span></div></footer>
  </div>;
}
