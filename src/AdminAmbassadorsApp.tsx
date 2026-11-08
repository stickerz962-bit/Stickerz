import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, firebaseConfigured, firestore } from "./firebase/client";
import { migrateLegacyRewardPortals, reviewPayout, setRewardProfileStatus } from "./lib/freeTierRewards";

type Ambassador = {
  code: string; name?: string; status?: string; availableBalance?: number; reservedBalance?: number;
  lifetimeEarned?: number; deliveredReferralOrders?: number; createdAt?: { toDate?: () => Date };
};
type Payout = {
  id: string; amount: number; ambassadorCode: string; method: string; payoutDetails: string; status: string;
  requestedAt?: { toDate?: () => Date }; transferReference?: string; rejectionReason?: string;
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

  useEffect(() => {
    if (!auth) { setReady(true); return; }
    return onAuthStateChanged(auth, async next => {
      setUser(next); setAdmin(false);
      if (next) {
        try { const token = await next.getIdTokenResult(true); setAdmin(token.claims.admin === true); }
        catch { setError("تعذر التحقق من صلاحية الإدارة."); }
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!firestore || !user || !admin) return;
    setBusy(true); setError("");
    let aReady = false, pReady = false;
    const finish = () => { if (aReady && pReady) setBusy(false); };
    const ua = onSnapshot(collection(firestore, "ambassadors"), snap => {
      setAmbassadors(snap.docs.map(d => ({ code: d.id, ...d.data() } as Ambassador))
        .sort((a,b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0)));
      aReady = true; finish();
    }, e => { setError("تعذر قراءة ملفات المكافآت (" + (e.code || "unknown") + ")."); aReady = true; finish(); });
    const up = onSnapshot(collection(firestore, "ambassadorPayouts"), snap => {
      setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payout))
        .sort((a,b) => (b.requestedAt?.toDate?.().getTime() || 0) - (a.requestedAt?.toDate?.().getTime() || 0)));
      pReady = true; finish();
    }, e => { setError("تعذر قراءة طلبات الصرف (" + (e.code || "unknown") + ")."); pReady = true; finish(); });
    return () => { ua(); up(); };
  }, [user, admin]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try { if (!auth) throw new Error("Firebase Auth غير مهيأ"); await signInWithEmailAndPassword(auth, email.trim(), password); setPassword(""); }
    catch { setError("تعذر تسجيل الدخول. راجعي البريد وكلمة المرور."); }
    finally { setBusy(false); }
  }
  async function setStatus(item: Ambassador, status: "active" | "paused") {
    if (!firestore) return;
    setBusy(true); setError(""); setNotice("");
    try { await setRewardProfileStatus(firestore, item.code, status); setNotice(status === "paused" ? "تم إيقاف المشتركة." : "تمت إعادة تفعيل المشتركة."); }
    catch { setError("تعذر تحديث الحالة. راجعي صلاحيات المدير واتصال Firebase."); }
    finally { setBusy(false); }
  }
  async function review(item: Payout, decision: "paid" | "rejected") {
    if (!firestore || !user) return;
    const reference = (references[item.id] || "").trim();
    if (reference.length < 3) { setError(decision === "paid" ? "اكتبي مرجع التحويل أولًا." : "اكتبي سبب الرفض."); return; }
    if (decision === "paid" && !window.confirm("تأكدي أنك حولتِ المبلغ بالفعل عبر InstaPay أو المحفظة. تسجيل الصرف سيخصم المبلغ من الرصيد. متابعة؟")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await reviewPayout(firestore, item.id, decision, reference, user.uid);
      setNotice(decision === "paid" ? "تم تسجيل صرف المكافأة." : "تم رفض الطلب وإعادة المبلغ إلى الرصيد المتاح.");
      setReferences(current => ({ ...current, [item.id]: "" }));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(message === "PAYOUT_ALREADY_REVIEWED" ? "تمت مراجعة طلب الصرف بالفعل."
        : "تعذر مراجعة طلب الصرف. تأكدي من الرصيد المحجوز وحالة الطلب.");
    } finally { setBusy(false); }
  }
  async function copy(item: Payout) {
    try { await navigator.clipboard.writeText(item.payoutDetails); setNotice("تم نسخ بيانات التحويل."); }
    catch { setError("تعذر النسخ تلقائيًا."); }
  }
  async function migrateLegacy() {
    if (!firestore || !window.confirm("سيتم تجهيز صفحات المكافآت للمشتركات المسجلات سابقًا ونسخ ملخصات آمنة للعرض فقط. لن يتم حذف أو تعديل سجلات المكافآت الأصلية. متابعة؟")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await migrateLegacyRewardPortals(firestore);
      setNotice("تم تجهيز " + result.profiles + " مساحة قديمة ومزامنة " + result.documents + " سجلًا. لم يتم حذف أي بيانات.");
    } catch { setError("تعذرت تهيئة المساحات القديمة. راجعي اتصال Firebase ثم أعيدي المحاولة."); }
    finally { setBusy(false); }
  }


  if (!firebaseConfigured) return <main className="ap-amb-admin"><h1>إعداد Firebase مطلوب</h1></main>;
  if (!ready) return <main className="ap-amb-admin">جارٍ التحقق...</main>;
  if (!user) return <main className="ap-amb-admin" dir="rtl"><section className="ap-amb-admin-login"><h1>إدارة مكافأة التلوين</h1><form onSubmit={login}><label>البريد الإلكتروني<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button className="primary-button" disabled={busy}>دخول الإدارة</button></form>{error && <p className="form-error">{error}</p>}</section></main>;
  if (!admin) return <main className="ap-amb-admin" dir="rtl"><h1>غير مصرح</h1><p>الحساب لا يحمل صلاحية admin:true.</p><button onClick={()=>auth&&void signOut(auth)}>تسجيل الخروج</button></main>;

  const pending = payouts.filter(item => item.status === "pending");
  const available = ambassadors.reduce((sum, item) => sum + (Number(item.availableBalance) || 0), 0);
  return <div className="anti-shell ap-amb-admin" dir="rtl">
    <header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><nav className="ap-amb-admin-nav"><a href="./admin.html">إدارة الطلبات</a><button onClick={()=>auth&&void signOut(auth)}>خروج</button></nav></header>
    <main className="ap-amb-admin-main">
      <div className="section-heading"><span className="eyebrow">برنامج مكافأة التلوين</span><h1>إدارة مكافأة التلوين</h1><p>15 جنيهًا لكل طلب إحالة تم تسليمه بنجاح، والحد الأدنى للصرف 50 جنيهًا.</p><button className="secondary-button" disabled={busy} onClick={()=>void migrateLegacy()}>تجهيز المساحات القديمة</button></div>
      {error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}
      <p className="backup-help">البيانات بتتحدث تلقائيًا. العمليات المالية تُنفّذ مباشرة داخل Firestore بصلاحيات الإدارة، من غير Cloud Functions.</p>
      <div className="ap-amb-admin-stats"><article><small>عدد المشتركات</small><strong>{ambassadors.length}</strong></article><article><small>طلبات الصرف المعلقة</small><strong>{pending.length}</strong></article><article><small>إجمالي الرصيد المتاح</small><strong>{available} جنيه</strong></article><article><small>طلبات الإحالة المسلّمة</small><strong>{ambassadors.reduce((sum,item)=>sum+(Number(item.deliveredReferralOrders)||0),0)}</strong></article></div>
      <section className="ap-amb-admin-panel"><div className="ap-amb-admin-heading"><h2>طلبات الصرف</h2><span>{pending.length} طلب معلق</span></div>
        {pending.length === 0 ? <p>لا توجد طلبات صرف معلقة حاليًا.</p> : pending.map(item=><article className="ap-amb-payout-row" key={item.id}>
          <div><b>{item.amount} جنيه · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</b><small>المشتركة: {item.ambassadorCode} · {item.requestedAt?.toDate ? item.requestedAt.toDate().toLocaleString("ar-EG") : "—"}</small><strong>{item.payoutDetails}</strong><button type="button" className="secondary-button" onClick={()=>void copy(item)}>نسخ بيانات التحويل</button></div>
          <div className="ap-amb-payout-actions"><input value={references[item.id] || ""} onChange={e=>setReferences(current=>({...current,[item.id]:e.target.value}))} placeholder="مرجع التحويل أو سبب الرفض" maxLength={100}/><div><button className="primary-button" disabled={busy} onClick={()=>void review(item,"paid")}>تم التحويل</button><button className="secondary-button" disabled={busy} onClick={()=>void review(item,"rejected")}>رفض الطلب</button></div></div>
        </article>)}
      </section>
      <section className="ap-amb-admin-panel"><h2>سجل عمليات الصرف</h2>
        {payouts.length ? <div className="ap-ambassador-history">{payouts.map(item=><article key={item.id}><div><b>{item.amount} جنيه · {item.ambassadorCode}</b><small>{item.requestedAt?.toDate ? item.requestedAt.toDate().toLocaleString("ar-EG") : "—"} · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</small><small>{item.transferReference || item.rejectionReason || "—"}</small></div><strong>{item.status === "paid" ? "تم الصرف" : item.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</strong></article>)}</div> : <p>لا توجد عمليات صرف مسجلة.</p>}
      </section>
      <section className="ap-amb-admin-panel"><h2>المشتركات في مكافأة التلوين</h2><div className="ap-amb-admin-table-wrap"><table><thead><tr><th>المشتركة</th><th>كود الإحالة</th><th>الطلبات المسلّمة</th><th>الرصيد المتاح</th><th>قيد الصرف</th><th>إجمالي المكتسب</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{ambassadors.map(item=><tr key={item.code}><td>{item.name || "—"}</td><td dir="ltr">{item.code}</td><td>{item.deliveredReferralOrders || 0}</td><td>{item.availableBalance || 0} ج</td><td>{item.reservedBalance || 0} ج</td><td>{item.lifetimeEarned || 0} ج</td><td>{item.status === "active" ? "نشطة" : "موقوفة"}</td><td><button className="secondary-button" disabled={busy} onClick={()=>void setStatus(item,item.status === "active" ? "paused" : "active")}>{item.status === "active" ? "إيقاف" : "إعادة تفعيل"}</button></td></tr>)}</tbody></table></div></section>
    </main>
  </div>;
}
