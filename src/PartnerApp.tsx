import { useMemo, useState, type FormEvent } from 'react';

const referralCodePattern = /^[A-Za-z0-9_-]{4,32}$/;

function normalizeEgyptianWhatsApp(value: string): string {
  const digits = value.replace(/\\D/g, '');
  if (digits.startsWith('0020')) return digits.slice(2);
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return '20' + digits.slice(1);
  return digits;
}

export default function PartnerApp() {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [social, setSocial] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const normalizedPhone = useMemo(() => normalizeEgyptianWhatsApp(whatsapp), [whatsapp]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('اكتبي اسمك بشكل صحيح.');
    if (!/^20\\d{10}$/.test(normalizedPhone)) return setError('اكتبي رقم واتساب مصري صحيح (11 رقم محليًا).');
    if (social.trim().length < 2) return setError('اكتبي رابط أو اسم حسابك على السوشيال ميديا.');
    setSubmitted(true);
  };

  return <div className="anti-shell" dir="rtl">
    <div className="top-note">كل مشاركة بتساعد كتابنا يوصل لحد أكتر ♡</div>
    <header className="site-header">
      <a className="brand" href="./" aria-label="ANTI PRESSURE الرئيسية"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a>
      <a className="header-cta" href="./">العودة للموقع ←</a>
    </header>
    <main className="section-wrap" style={{maxWidth:760}}>
      <div className="section-heading">
        <span className="eyebrow">♡ شراكة لطيفة ومكسب واضح</span>
        <h1 style={{fontSize:'clamp(32px,5vw,48px)'}}>انضم كشريك</h1>
        <p>شاركي كتاب «فُكّي الضغط» مع جمهورك، وخدي <strong>20 جنيه عن كل طلب يتم تسليمه بنجاح</strong>.</p>
      </div>
      <div className="promise-strip" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:28}}>
        <div><span>♡</span><p><b>20 جنيه</b><small>عن كل طلب مستلَم</small></p></div>
        <div><span>↗</span><p><b>لينك خاص</b><small>لمتابعة الإحالات</small></p></div>
        <div><span>☏</span><p><b>واتساب</b><small>للتواصل مع الإدارة</small></p></div>
      </div>
      {submitted ? <section className="section-heading" role="status">
        <h2>تم التحقق من البيانات مبدئيًا ♡</h2>
        <p>دي معاينة فقط. التسجيل الفعلي وإنشاء لينك الشريك متوقفين لحين تجهيز التخزين الآمن واعتماد الحساب.</p>
        <button className="primary-button" onClick={() => setSubmitted(false)}>تعديل البيانات</button>
      </section> : <form className="ap-admin-form" onSubmit={submit}>
        <label>الاسم<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} autoComplete="name" placeholder="اسمك" /></label>
        <label>رقم واتساب<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
        <label>حسابك أو رابطك على السوشيال ميديا<input value={social} onChange={e=>setSocial(e.target.value)} required placeholder="Instagram / Facebook / TikTok..." /></label>
        <p style={{fontSize:12,color:'#77798a'}}>رقم واتساب هيكون وسيلة التواصل من إدارة فُكّي الضغط. التسجيل هنا لا يحفظ بياناتك أو ينشئ حسابًا حقيقيًا في المرحلة الحالية.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">مراجعة بياناتي <span>←</span></button>
      </form>}
      <div className="section-heading" style={{marginTop:40}}>
        <h2>إزاي الشراكة بتشتغل؟</h2>
        <p>بعد اعتمادك، هتحصلي على لينك خاص. العمولة تُحتسب مرة واحدة فقط عند تسليم الطلب بنجاح، ولا تُحتسب للطلبات الملغاة أو غير المستلمة. صرف المستحقات يتم بعد مراجعة الإدارة.</p>
      </div>
      <p style={{textAlign:'center',fontSize:11,color:'#9b7b84'}}>تنبيه: الصفحة الحالية واجهة تجريبية وليست تسجيلًا فعليًا أو وعدًا بعمولة مستحقة.</p>
    </main>
    <footer className="site-footer"><a href="./">ANTI PRESSURE – فُكّي الضغط</a></footer>
  </div>;
}
