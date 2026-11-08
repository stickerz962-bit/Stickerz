import { useCallback, useEffect, useState, type FormEvent } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "./firebase/client";
import { buildAmbassadorReferralUrl, hashAmbassadorToken } from "./lib/ambassador";
import { submitPayout, MIN_PAYOUT } from "./lib/freeTierRewards";

type Portal = {
  code: string; name: string; status: string; availableBalance: number; reservedBalance: number;
  lifetimeEarned: number; lifetimeReversed: number; lifetimePaidOut: number; deliveredReferralOrders: number;
};
type Ledger = { id: string; orderId?: string; amount: number; status: string; method?: string; requestedAt?: { toDate?: () => Date }; createdAt?: { toDate?: () => Date }; paidAt?: { toDate?: () => Date }; rejectionReason?: string };

export default function AmbassadorApp({ code, accessToken }: { code: string; accessToken: string }) {
  const [data, setData] = useState<Portal | null>(null);
  const [commissions, setCommissions] = useState<Ledger[]>([]);
  const [payouts, setPayouts] = useState<Ledger[]>([]);
  const [amount, setAmount] = useState("50");
  const [method, setMethod] = useState<"instapay" | "wallet">("instapay");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accessHash, setAccessHash] = useState("");

  const load = useCallback(async () => {
    if (!firestore) { setError("خدمة المكافآت غير متاحة حاليًا."); setBusy(false); return; }
    setBusy(true); setError("");
    try {
      const hash = await hashAmbassadorToken(accessToken);
      setAccessHash(hash);
      const ref = doc(firestore, "ambassadorPortals", hash);
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().code !== code || snap.data().status !== "active") throw new Error("INVALID_ACCESS");
      setData(snap.data() as Portal);
      const [commissionSnap, payoutSnap] = await Promise.all([
        getDocs(query(collection(firestore, "ambassadorPortals", hash, "commissions"), orderBy("createdAt", "desc"))),
        getDocs(query(collection(firestore, "ambassadorPortals", hash, "payouts"), orderBy("requestedAt", "desc"))),
      ]);
      setCommissions(commissionSnap.docs.map(item => ({ id: item.id, ...item.data() } as Ledger)));
      setPayouts(payoutSnap.docs.map(item => ({ id: item.id, ...item.data() } as Ledger)));
    } catch {
      setError("رابط مساحتك غير صالح أو لم يتم تفعيلها بعد. لو طلبك اتسلّم للتو، حدّثي الصفحة بعد قليل.");
      setData(null);
    } finally { setBusy(false); }
  }, [code, accessToken]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!firestore || !accessHash) return;
    const unsubscribe = onSnapshot(doc(firestore, "ambassadorPortals", accessHash), snap => {
      if (snap.exists() && snap.data().code === code) setData(snap.data() as Portal);
    });
    return unsubscribe;
  }, [accessHash, code]);

  async function payout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!firestore || !data || !accessHash) return;
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < MIN_PAYOUT || value > data.availableBalance) {
      setError("اكتبي مبلغًا صحيحًا لا يقل عن 50 جنيهًا ولا يتجاوز رصيدك المتاح."); return;
    }
    setSending(true);
    try {
      const requestId = window.crypto.randomUUID();
      await submitPayout(firestore, code, accessHash, value, method, details.trim(), requestId);
      setNotice("تم استلام طلب صرف مكافآتك وحجز المبلغ من رصيدك لحين المراجعة.");
      setDetails(""); setAmount("50"); await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(message === "INSUFFICIENT_BALANCE" ? "الرصيد المتاح اتغير. حدّثي الصفحة واختاري مبلغًا أقل."
        : message === "MINIMUM_PAYOUT" ? "الحد الأدنى لطلب الصرف 50 جنيهًا."
        : "تعذر تقديم طلب الصرف. راجعي بيانات التحويل وحاولي مرة أخرى.");
    } finally { setSending(false); }
  }

  const shareUrl = buildAmbassadorReferralUrl(code);
  const copy = async (value: string, message: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(message); }
    catch { setError("تعذر النسخ تلقائيًا. انسخي الرابط يدويًا."); }
  };
  const date = (value: any) => value?.toDate ? value.toDate().toLocaleDateString("ar-EG") : "—";

  return <div className="anti-shell ap-ambassador-page" dir="rtl">
    <header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><a className="header-cta" href="./">الرئيسية</a></header>
    <main className="ap-ambassador-wrap">
      <section className="ap-ambassador-hero"><span className="eyebrow">مكافأة التلوين ♡</span><h1>كل واحدة ليها حكاية.. ودي حكايتك!</h1><p>شاركي رابطك، وكل طلب يوصل من خلالك ويتسلّم بنجاح يضيف 15 جنيهًا لرصيدك.</p></section>
      {busy && <p className="ap-ambassador-message">جارٍ تحميل مساحتك...</p>}
      {error && <div><p className="form-error" role="alert">{error}</p><button className="secondary-button" onClick={() => void load()}>إعادة المحاولة</button></div>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {data && <>
        <section className="ap-ambassador-stats">
          <article><small>رصيد متاح للصرف</small><strong>{data.availableBalance} جنيه</strong></article>
          <article><small>طلبات تم تسليمها من رابطك</small><strong>{data.deliveredReferralOrders}</strong></article>
          <article><small>إجمالي المكافآت</small><strong>{data.lifetimeEarned} جنيه</strong></article>
          <article><small>رصيد قيد الصرف</small><strong>{data.reservedBalance} جنيه</strong></article>
        </section>
        <section className="ap-ambassador-panel"><span className="eyebrow">رابطك الشخصي</span><h2>ابعتي الحكاية لصاحباتك ♡</h2><p>أي طلب جديد من الرابط ده، وبعد تسليمه بنجاح، يضيف 15 جنيهًا لرصيدك.</p><div className="ap-ambassador-link" dir="ltr">{shareUrl}</div><div className="ap-ambassador-actions"><button className="primary-button" onClick={() => void copy(shareUrl, "تم نسخ رابطك الشخصي.")}>نسخ الرابط</button><a className="secondary-button" href={"https://wa.me/?text=" + encodeURIComponent("لقيت كتاب تلوين لطيف أوي اسمه فُكّي الضغط، شوفيه واعملي كتابك على مزاجك ♡ " + shareUrl)} target="_blank" rel="noreferrer">مشاركة واتساب</a></div></section>
        <section className="ap-ambassador-panel"><h2>اطلبي صرف مكافآتك</h2><p>الحد الأدنى 50 جنيهًا، وتقدري تطلبي أي مبلغ من رصيدك المتاح.</p><form onSubmit={payout}><label>المبلغ المطلوب<input type="number" min="50" step="1" max={data.availableBalance} value={amount} onChange={e => setAmount(e.target.value)} required /></label><label>طريقة الاستلام<select value={method} onChange={e => setMethod(e.target.value as "instapay" | "wallet")}><option value="instapay">InstaPay</option><option value="wallet">محفظة إلكترونية</option></select></label><label>بيانات التحويل<input value={details} onChange={e => setDetails(e.target.value)} maxLength={120} placeholder="رقم المحفظة أو عنوان InstaPay" required /></label><button className="primary-button" disabled={sending || data.availableBalance < MIN_PAYOUT}>{sending ? "جارٍ إرسال الطلب..." : "طلب صرف المكافأة"}</button></form></section>
        <section className="ap-ambassador-grid"><div className="ap-ambassador-panel"><h2>سجل مكافآتي</h2>{commissions.length ? <div className="ap-ambassador-history">{commissions.map(item => <article key={item.id}><div><b>{item.orderId || item.id}</b><small>{date(item.createdAt)}</small></div><strong className={item.status === "reversed" ? "is-reversed" : ""}>{item.status === "reversed" ? "−" : "+"}{item.amount} جنيه</strong></article>)}</div> : <p>لسه مفيش مكافآت. أول طلب يتسلّم من خلال رابطك هيظهر هنا.</p>}</div>
          <div className="ap-ambassador-panel"><h2>طلبات الصرف</h2>{payouts.length ? <div className="ap-ambassador-history">{payouts.map(item => <article key={item.id}><div><b>{item.amount} جنيه</b><small>{date(item.requestedAt)} · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</small></div><strong>{item.status === "paid" ? "تم الصرف" : item.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</strong></article>)}</div> : <p>طلبات الصرف اللي هتقدميها هتظهر هنا.</p>}</div></section>
      </>}
      <p className="ap-ambassador-footnote">رابط مساحتك خاص بيكي. احتفظي بيه وما تشاركيهوش؛ شاركي رابط الدعوة العام فقط.</p>
    </main>
  </div>;
}
