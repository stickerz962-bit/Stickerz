import { useMemo, useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebase/client';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalizedPhone = useMemo(() => normalizeEgyptianWhatsApp(whatsapp), [whatsapp]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!firebaseConfigured || !auth || !firestore) {
      setError('التسجيل غير متاح حاليًا: إعدادات Firebase أو خدمة تسجيل الدخول لم تكتمل.');
      return;
    }
    if (name.trim().length < 2) return setError('اكتبي اسمك بشكل صحيح.');
    if (!/^20\\d{10}$/.test(normalizedPhone)) return setError('اكتبي رقم واتساب مصري صحيح (11 رقم محليًا).');
    if (social.trim().length < 2) return setError('اكتبي رابط أو اسم حسابك على السوشيال ميديا.');
    if (password.length < 8) return setError('كلمة المرور لازم تكون 8 أحرف على الأقل.');
    setBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await setDoc(doc(firestore, 'partnerApplications', credential.user.uid), {
        uid: credential.user.uid,
        name: name.trim(),
        whatsapp: normalizedPhone,
        social: social.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      setPassword('');
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') setError('البريد مسجل بالفعل. سجّلي الدخول أو تواصلي مع الإدارة لو سبق وقدمتِ طلبًا.');
      else if (code === 'auth/weak-password') setError('اختاري كلمة مرور أقوى (8 أحرف على الأقل).');
      else if (code === 'auth/invalid-email') setError('البريد الإلكتروني غير صحيح.');
      else setError('لم نتمكن من حفظ طلب الشراكة. تأكدي من اتصال الإنترنت وتفعيل Email/Password في Firebase ثم حاولي مرة أخرى.');
    } finally {
      setBusy(false);
    }
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
        <div><span>↗</span><p><b>لينك خاص</b><small>بعد اعتماد الحساب</small></p></div>
        <div><span>☏</span><p><b>واتساب</b><small>للتواصل مع الإدارة</small></p></div>
      </div>
      {submitted ? <section className="section-heading" role="status">
        <h2>وصل طلب الشراكة بنجاح ♡</h2>
        <p>حسابك اتسجل وطلبك قيد مراجعة الإدارة. مش هيتفعّل لينك الإحالة أو العمولة إلا بعد اعتماد الشراكة.</p>
        <p>احتفظي بالبريد وكلمة المرور للدخول لاحقًا إلى لوحة الشريك.</p>
      </section> : <form className="ap-admin-form" onSubmit={submit}>
        <label>الاسم<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" placeholder="اسمك" /></label>
        <label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="name@example.com" /></label>
        <label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="8 أحرف على الأقل" /></label>
        <label>رقم واتساب<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="01xxxxxxxxx" /></label>
        <label>حسابك أو رابطك على السوشيال ميديا<input value={social} onChange={e=>setSocial(e.target.value)} required maxLength={250} placeholder="Instagram / Facebook / TikTok..." /></label>
        <p style={{fontSize:12,color:'#77798a'}}>بياناتك تُستخدم لمراجعة طلب الشراكة والتواصل بشأنه. الحساب لا يحصل على صلاحية أو عمولة قبل موافقة الإدارة.</p>
        {!firebaseConfigured && <p className="form-error" role="status">التسجيل الفعلي متوقف مؤقتًا لحين اكتمال إعداد Firebase.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={busy || !firebaseConfigured}>{busy ? 'جارٍ إرسال الطلب…' : 'إرسال طلب الشراكة ←'}</button>
      </form>}
      <div className="section-heading" style={{marginTop:40}}>
        <h2>إزاي الشراكة بتشتغل؟</h2>
        <p>بعد اعتمادك، هتحصلي على لينك خاص. العمولة تُحتسب مرة واحدة فقط عند تسليم الطلب بنجاح، ولا تُحتسب للطلبات الملغاة أو غير المستلمة. صرف المستحقات يتم بعد مراجعة الإدارة.</p>
      </div>
    </main>
    <footer className="site-footer"><a href="./">ANTI PRESSURE – فُكّي الضغط</a></footer>
  </div>;
}
