import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebase/client';

type Application = { name: string; status: string; whatsapp: string; social: string };
type Partner = { code?: string; status?: string; commissionRate?: number };

export default function PartnerDashboardApp() {
  const [user,setUser]=useState<User|null>(null);
  const [appData,setAppData]=useState<Application|null>(null);
  const [partner,setPartner]=useState<Partner|null>(null);
  const [loading,setLoading]=useState(true);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!auth){setLoading(false);return;}
    return onAuthStateChanged(auth,async next=>{
      setUser(next);setAppData(null);setPartner(null);setError('');
      if(next&&firestore){
        try{
          const [application,profile]=await Promise.all([
            getDoc(doc(firestore,'partnerApplications',next.uid)),
            getDoc(doc(firestore,'partners',next.uid)),
          ]);
          if(application.exists())setAppData(application.data() as Application);
          if(profile.exists())setPartner(profile.data() as Partner);
        }catch{setError('تعذر تحميل ملف الشريك. تأكدي من إعدادات قواعد Firestore.');}
      }
      setLoading(false);
    });
  },[]);
  const login=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    try{if(!auth)throw new Error();await signInWithEmailAndPassword(auth,email.trim(),password);setPassword('');}
    catch{setError('تعذر تسجيل الدخول. راجعي البريد وكلمة المرور.');}
  };
  const copyReferral=async()=>{
    if(!partner?.code)return;
    const url=new URL('./',window.location.href);url.searchParams.set('ref',partner.code);
    try{await navigator.clipboard.writeText(url.toString());setError('تم نسخ لينك الإحالة.');}
    catch{setError('انسخي الرابط يدويًا: '+url.toString());}
  };
  return <div className="anti-shell" dir="rtl">
    <div className="top-note">لوحة الشريك — بيانات الحساب الحقيقية</div>
    <header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><a className="header-cta" href="./partner.html">التسجيل كشريك</a></header>
    <main className="section-wrap">
      {loading?<p>جارٍ تحميل الحساب…</p>:!firebaseConfigured?<p className="form-error">Firebase غير مُهيأ. لوحة الشريك غير متاحة.</p>:!user?
      <section className="ap-admin-form"><h1>تسجيل دخول الشريك</h1><form onSubmit={login}>
        <label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
        <label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label>
        {error&&<p role="alert">{error}</p>}<button className="primary-button">دخول</button>
      </form></section>:
      <><div className="section-heading"><span className="eyebrow">مساحتك الخاصة ♡</span><h1>أهلًا {appData?.name||user.email}</h1><p>حالة طلب الشراكة: <b>{partner?.status==='approved'?'معتمد':appData?.status==='pending'?'قيد مراجعة الإدارة':appData?.status||'لم يتم العثور على الطلب'}</b></p></div>
      {partner?.status==='approved'?<section className="ap-admin-form"><h2>لينك الإحالة الخاص بك</h2><p>كود الشريك: <b>{partner.code||'لم يتم إنشاء الكود بعد'}</b></p><button className="primary-button" disabled={!partner.code} onClick={()=>void copyReferral()}>نسخ لينك الإحالة</button><p>العمولة تُحتسب بعد تأكيد تسليم الطلب من الإدارة، ولا تُحتسب للطلبات الملغاة أو غير المستلمة.</p></section>:<section className="ap-admin-form"><h2>طلبك تحت المراجعة</h2><p>بعد اعتماد الإدارة هيتفعّل لينك الإحالة. لا توجد عمولات أو طلبات معتمدة قبل الموافقة.</p></section>}
      {error&&<p role="status">{error}</p>}<button className="header-cta" onClick={()=>auth&&void signOut(auth)}>تسجيل الخروج</button></>}
    </main><footer className="site-footer"><a href="./">ANTI PRESSURE – فُكّي الضغط</a></footer>
  </div>;
}
