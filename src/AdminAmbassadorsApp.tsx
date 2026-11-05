import { useCallback, useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, firebaseConfigured, firestore, functions } from "./firebase/client";

type Ambassador = {
  code: string; name?: string; status: string; availableBalance?: number; reservedBalance?: number;
  lifetimeEarned?: number; lifetimePaidOut?: number; deliveredReferralOrders?: number;
};
type Payout = {
  id: string; ambassadorCode: string; amount: number; method: string; payoutDetails: string;
  status: string; requestedAt?: { toDate?: () => Date }; transferReference?: string;
};

export default function AdminAmbassadorsApp() {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [references, setReferences] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!firestore || !admin) return;
    setBusy(true); setError("");
    try {
      const [ambassadorSnap, payoutSnap] = await Promise.all([
        getDocs(query(collection(firestore, "ambassadors"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(firestore, "ambassadorPayouts"), orderBy("requestedAt", "desc"))),
      ]);
      setAmbassadors(ambassadorSnap.docs.map(item => ({ code: item.id, ...item.data() } as Ambassador)));
      setPayouts(payoutSnap.docs.map(item => ({ id: item.id, ...item.data() } as Payout)));
    } catch {
      setError("تعذر تحميل بيانات السفيرات. تأكدي من نشر قواعد Firestore وصلاحية المدير.");
    } finally { setBusy(false); }
  }, [admin]);

  useEffect(() => {
    if (!auth) { setReady(true); return; }
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser); setAdmin(false);
      if (nextUser) {
        try { const token = await nextUser.getIdTokenResult(true); setAdmin(token.claims.admin === true); }
        catch { setError("تعذر التحقق من صلاحيات المدير."); }
      }
      setReady(true);
    });
  }, []);
  useEffect(() => { if (admin) void load(); }, [admin, load]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (!auth) throw new Error("Firebase Auth غير مهيأ");
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch { setError("تعذر تسجيل الدخول. راجعي البريد وكلمة المرور."); }
    finally { setBusy(false); }
  }

  async function review(payout: Payout, decision: "paid" | "rejected") {
    if (!functions) { setError("خدمة المكافآت الخلفية غير مفعّلة."); return; }
    const reference = (references[payout.id] || "").trim();
    if (decision === "paid" && reference.length < 3) { setError("أدخلي مرجع التحويل قبل تأكيد الصرف."); return; }
    if (decision === "rejected" && !reference) { setError("اكتبي سبب رفض طلب الصرف."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const call = httpsCallable(functions, "reviewAmbassadorPayout");
      await call({ payoutId: payout.id, decision, transferReference: reference });
      setNotice(decision === "paid" ? "تم تسجيل صرف المكافأة." : "تم رفض الطلب وإعادة المبلغ إلى رصيد السفيرة.");
      await load();
    } catch { setError("تعذر مراجعة طلب الصرف. تأكدي من صلاحية المدير وحالة الطلب."); }
    finally { setBusy(false); }
  }

  if (!firebaseConfigured) return <main className="ap-amb-admin"><h1>إعداد Firebase مطلوب</h1></main>;
  if (!ready) return <main className="ap-amb-admin">جارٍ التحقق...</main>;
  if (!user) return <main className="ap-amb-admin" dir="rtl"><section className="ap-amb-admin-login"><h1>إدارة سفيرات فُكّي الضغط</h1><form onSubmit={login}><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="primary-button" disabled={busy}>دخول الإدارة</button></form>{error && <p className="form-error">{error}</p>}</section></main>;
  if (!admin) return <main className="ap-amb-admin" dir="rtl"><h1>غير مصرح</h1><p>الحساب لا يحمل صلاحية admin:true.</p><button onClick={()=>auth&&void signOut(auth)}>تسجيل الخروج</button></main>;

  const pending = payouts.filter(item => item.status === "pending");
  const available = ambassadors.reduce((sum, item) => sum + (Number(item.availableBalance) || 0), 0);
  return <div className="anti-shell ap-amb-admin" dir="rtl">
    <header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><nav className="ap-amb-admin-nav"><a href="./admin.html">إدارة الطلبات</a><button onClick={()=>auth&&void signOut(auth)}>خروج</button></nav></header>
    <main className="ap-amb-admin-main">
      <div className="section-heading"><span className="eyebrow">برنامج سفيرات فُكّي الضغط</span><h1>إدارة السفيرات والمكافآت</h1><p>المكافأة 15 جنيهًا لكل طلب مُسلّم، والحد الأدنى للصرف 50 جنيهًا.</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
      <div className="ap-amb-admin-stats"><article><small>عدد السفيرات</small><strong>{ambassadors.length}</strong></article><article><small>طلبات الصرف المعلقة</small><strong>{pending.length}</strong></article><article><small>إجمالي الرصيد المتاح</small><strong>{available} جنيه</strong></article><article><small>طلبات الإحالة المسلّمة</small><strong>{ambassadors.reduce((sum,item)=>sum+(Number(item.deliveredReferralOrders)||0),0)}</strong></article></div>
      <section className="ap-amb-admin-panel"><div className="ap-amb-admin-heading"><h2>طلبات الصرف</h2><button className="secondary-button" disabled={busy} onClick={()=>void load()}>تحديث</button></div>
        {pending.length === 0 ? <p>لا توجد طلبات صرف معلقة حاليًا.</p> : pending.map(item=><article className="ap-amb-payout-row" key={item.id}>
          <div><b>{item.amount} جنيه · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</b><small>السفيرة: {item.ambassadorCode} · {item.requestedAt?.toDate ? item.requestedAt.toDate().toLocaleString("ar-EG") : "—"}</small><strong>{item.payoutDetails}</strong></div>
          <div className="ap-amb-payout-actions"><input value={references[item.id] || ""} onChange={e=>setReferences(current=>({...current,[item.id]:e.target.value}))} placeholder="مرجع التحويل أو سبب الرفض" maxLength={100}/><div><button className="primary-button" disabled={busy} onClick={()=>void review(item,"paid")}>تم الصرف</button><button className="secondary-button" disabled={busy} onClick={()=>void review(item,"rejected")}>رفض الطلب</button></div></div>
        </article>)}
      </section>
      <section className="ap-amb-admin-panel"><h2>سجل عمليات الصرف</h2>
        {payouts.length ? <div className="ap-ambassador-history">{payouts.map(item=><article key={item.id}><div><b>{item.amount} جنيه · {item.ambassadorCode}</b><small>{item.requestedAt?.toDate ? item.requestedAt.toDate().toLocaleString("ar-EG") : "—"} · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</small><small>{item.transferReference || (item as Payout & { rejectionReason?: string }).rejectionReason || "—"}</small></div><strong>{item.status === "paid" ? "تم الصرف" : item.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</strong></article>)}</div> : <p>لا توجد عمليات صرف مسجلة.</p>}
      </section>
      <section className="ap-amb-admin-panel"><h2>السفيرات المسجلات</h2><div className="ap-amb-admin-table-wrap"><table><thead><tr><th>السفيرة</th><th>كود الإحالة</th><th>الطلبات المسلّمة</th><th>الرصيد المتاح</th><th>قيد الصرف</th><th>إجمالي المكتسب</th><th>الحالة</th></tr></thead><tbody>{ambassadors.map(item=><tr key={item.code}><td>{item.name || "—"}</td><td dir="ltr">{item.code}</td><td>{item.deliveredReferralOrders || 0}</td><td>{item.availableBalance || 0} ج</td><td>{item.reservedBalance || 0} ج</td><td>{item.lifetimeEarned || 0} ج</td><td>{item.status === "active" ? "نشطة" : item.status}</td></tr>)}</tbody></table></div></section>
    </main>
  </div>;
}
