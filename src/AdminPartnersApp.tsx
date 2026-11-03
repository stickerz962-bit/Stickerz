import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore, firebaseConfigured } from './firebase/client';

type Application={uid:string;name:string;whatsapp:string;social:string;status:'pending'|'approved'|'rejected';createdAt?:unknown};
type Partner={uid:string;name:string;whatsapp:string;code:string;status:'approved'|'paused';commissionRate:number;createdAt:unknown;updatedAt:unknown};

function makeCode(uid:string){return 'AP-'+uid.replace(/[^a-zA-Z0-9]/g,'').slice(0,8).toUpperCase();}

export default function AdminPartnersApp(){
 const [user,setUser]=useState<User|null>(null);const [admin,setAdmin]=useState(false);const [ready,setReady]=useState(false);
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [rows,setRows]=useState<Application[]>([]);
 const [filter,setFilter]=useState('pending');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(!auth){setReady(true);return;}return onAuthStateChanged(auth,async u=>{setUser(u);setAdmin(false);if(u){try{const token=await u.getIdTokenResult(true);setAdmin(token.claims.admin===true);}catch{setError('تعذر التحقق من صلاحيات المدير.');}}setReady(true);});},[]);
 const load=async()=>{if(!firestore||!admin)return;setBusy(true);try{const snap=await getDocs(query(collection(firestore,'partnerApplications')));setRows(snap.docs.map(d=>({uid:d.id,...d.data()} as Application)));}catch{setError('تعذر تحميل طلبات الشركاء. تأكدي من صلاحية admin:true ونشر القواعد.');}finally{setBusy(false);}};
 useEffect(()=>{if(admin)void load();},[admin]);
 const login=async(e:React.FormEvent)=>{e.preventDefault();setError('');try{if(!auth)throw new Error();await signInWithEmailAndPassword(auth,email.trim(),password);setPassword('');}catch{setError('تعذر تسجيل الدخول. راجعي البريد وكلمة المرور.');}};
 const approve=async(a:Application)=>{if(!firestore)return;setBusy(true);setError('');try{const code=makeCode(a.uid);await updateDoc(doc(firestore,'partnerApplications',a.uid),{status:'approved',updatedAt:serverTimestamp()});const profile:Partner={uid:a.uid,name:a.name,whatsapp:a.whatsapp,code,status:'approved',commissionRate:20,createdAt:serverTimestamp(),updatedAt:serverTimestamp()} as Partner;await setDoc(doc(firestore,'partners',a.uid),profile);await load();}catch{setError('تعذر اعتماد الشريك. تأكدي من صلاحيات المدير والقواعد المنشورة.');}finally{setBusy(false);}};
 const pause=async(a:Application)=>{if(!firestore)return;setBusy(true);try{await updateDoc(doc(firestore,'partners',a.uid),{status:'paused',updatedAt:serverTimestamp()});await load();}catch{setError('تعذر إيقاف الشريك.');}finally{setBusy(false);}};
 const visible=rows.filter(a=>filter==='all'||a.status===filter);
 return <div className="anti-shell" dir="rtl"><div className="top-note">إدارة الشركاء — لوحة موصولة بفايربيز</div><header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><a className="header-cta" href="./admin.html">لوحة المحتوى</a></header><main className="section-wrap">
 {!ready?<p>جارٍ التحقق…</p>:!firebaseConfigured?<p>Firebase غير مُهيأ.</p>:!user?<section className="ap-admin-form"><h1>دخول إدارة الشركاء</h1><form onSubmit={login}><label>البريد<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<p role="alert">{error}</p>}<button className="primary-button">دخول</button></form></section>:!admin?<section className="ap-admin-form"><h1>غير مصرح</h1><p>هذا الحساب ليس مديرًا. يلزم Firebase custom claim admin:true.</p><button onClick={()=>auth&&void signOut(auth)}>تسجيل الخروج</button></section>:
 <><div className="section-heading"><h1>إدارة طلبات الشركاء</h1><p>الاعتماد ينشئ ملف شريك وكود إحالة ثابت. العمولة 20 جنيه/طلب مُسلّم.</p></div>
 <label>الحالة <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="pending">طلبات معلقة</option><option value="approved">معتمد</option><option value="rejected">مرفوض</option><option value="all">الكل</option></select></label>
 {error&&<p role="alert">{error}</p>}{busy&&<p>جارٍ تنفيذ العملية…</p>}
 <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right',background:'#fff'}}><thead><tr><th>الاسم</th><th>واتساب</th><th>السوشيال</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{visible.map(a=><tr key={a.uid}><td>{a.name}</td><td><a href={'https://wa.me/'+a.whatsapp} target="_blank" rel="noreferrer">{a.whatsapp}</a></td><td>{a.social}</td><td>{a.status}</td><td>{a.status==='pending'&&<button disabled={busy} onClick={()=>void approve(a)}>اعتماد</button>}{a.status==='approved'&&<button disabled={busy} onClick={()=>void pause(a)}>إيقاف الشريك</button>}</td></tr>)}</tbody></table></div>
 <button className="header-cta" onClick={()=>void load()} disabled={busy}>تحديث</button><button className="header-cta" onClick={()=>auth&&void signOut(auth)}>خروج</button></>}
 </main></div>;
}
