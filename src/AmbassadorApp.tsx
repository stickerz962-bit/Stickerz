import { useCallback, useEffect, useState, type FormEvent } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase/client";
import { buildAmbassadorReferralUrl } from "./lib/ambassador";

type DashboardData = {
  profile: {
    name: string; code: string; availableBalance: number; reservedBalance: number;
    lifetimeEarned: number; lifetimeReversed: number; lifetimePaidOut: number; deliveredReferralOrders: number;
  };
  commissions: Array<{ orderId: string; amount: number; status: string; createdAt: string | null; reversedAt: string | null }>;
  payouts: Array<{ id: string; amount: number; method: string; status: string; requestedAt: string | null; paidAt: string | null; rejectionReason?: string | null }>;
  minimumPayout: number;
  commissionPerDeliveredOrder: number;
};

export default function AmbassadorApp({ code, accessToken }: { code: string; accessToken: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [amount, setAmount] = useState("50");
  const [method, setMethod] = useState<"instapay" | "wallet">("instapay");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!functions) { setError("خدمة المكافآت غير مفعّلة حاليًا."); setBusy(false); return; }
    setBusy(true); setError("");
    try {
      const call = httpsCallable(functions, "getAmbassadorDashboard");
      const result = await call({ code, accessToken });
      setData(result.data as DashboardData);
    } catch {
      setError("رابط مساحتك غير صالح أو خدمة المكافآت لم يتم تفعيلها بعد.");
    } finally { setBusy(false); }
  }, [code, accessToken]);

  useEffect(() => { void load(); }, [load]);

  async function submitPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!functions || !data) return;
    const requestedAmount = Number(amount);
    if (!Number.isSafeInteger(requestedAmount) || requestedAmount < 50 || requestedAmount > data.profile.availableBalance) {
      setError("اكتبي مبلغًا صحيحًا لا يقل عن 50 جنيهًا ولا يتجاوز رصيدك المتاح.");
      return;
    }
    setSending(true);
    try {
      const call = httpsCallable(functions, "requestAmbassadorPayout");
      await call({ code, accessToken, amount: requestedAmount, method, details: details.trim() });
      setNotice("تم استلام طلب صرف مكافآتك، وهنراجع بيانات التحويل.");
      setDetails("");
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(message.includes("50") ? "الحد الأدنى لطلب الصرف 50 جنيهًا." : "تعذر تقديم طلب الصرف. راجعي الرصيد وبيانات التحويل.");
    } finally { setSending(false); }
  }

  const shareUrl = buildAmbassadorReferralUrl(code);
  const copy = async (value: string, message: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(message); }
    catch { setError("تعذر النسخ تلقائيًا. انسخي الرابط يدويًا."); }
  };

  return <div className="anti-shell ap-ambassador-page" dir="rtl">
    <header className="site-header">
      <a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a>
      <a className="header-cta" href="./">الرئيسية</a>
    </header>
    <main className="ap-ambassador-wrap">
      <section className="ap-ambassador-hero">
        <span className="eyebrow">مساحتك الحلوة ♡</span>
        <h1>كل واحدة ليها حكاية.. ودي حكايتك!</h1>
        <p>شاركي كتابك مع صاحباتك، وكل طلب يوصل من خلال رابطك ويُسلّم بنجاح يضيف 15 جنيهًا لرصيدك.</p>
      </section>
      {busy && <p className="ap-ambassador-message">جارٍ تحميل مساحتك...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-success" role="status">{notice}</p>}
      {data && <>
        <section className="ap-ambassador-stats">
          <article><small>رصيد متاح للصرف</small><strong>{data.profile.availableBalance} جنيه</strong></article>
          <article><small>طلبات تم تسليمها من رابطك</small><strong>{data.profile.deliveredReferralOrders}</strong></article>
          <article><small>إجمالي المكافآت</small><strong>{data.profile.lifetimeEarned} جنيه</strong></article>
          <article><small>رصيد قيد الصرف</small><strong>{data.profile.reservedBalance} جنيه</strong></article>
        </section>
        <section className="ap-ambassador-panel">
          <span className="eyebrow">رابطك الشخصي</span><h2>ابعتي الحكاية لصاحباتك ♡</h2>
          <p>أي طلب جديد من الرابط ده، وبعد تسليمه بنجاح، يضيف 15 جنيهًا لرصيدك.</p>
          <div className="ap-ambassador-link" dir="ltr">{shareUrl}</div>
          <div className="ap-ambassador-actions">
            <button className="primary-button" onClick={() => void copy(shareUrl, "تم نسخ رابطك الشخصي.")}>نسخ الرابط</button>
            <a className="secondary-button" href={"https://wa.me/?text=" + encodeURIComponent("لقيت كتاب تلوين لطيف أوي اسمه فُكّي الضغط، شوفيه واعملي كتابك على مزاجك ♡ " + shareUrl)} target="_blank" rel="noreferrer">مشاركة واتساب</a>
          </div>
        </section>
        <section className="ap-ambassador-grid">
          <div className="ap-ambassador-panel">
            <h2>اطلبي صرف مكافآتك</h2>
            <p>تقدري تطلبي صرف أي مبلغ من رصيدك، بداية من 50 جنيهًا.</p>
            <form onSubmit={submitPayout}>
              <label>المبلغ المطلوب<input type="number" min="50" step="1" max={data.profile.availableBalance} value={amount} onChange={e => setAmount(e.target.value)} required /></label>
              <label>طريقة الاستلام<select value={method} onChange={e => setMethod(e.target.value as "instapay" | "wallet")}><option value="instapay">InstaPay</option><option value="wallet">محفظة إلكترونية</option></select></label>
              <label>بيانات التحويل<input value={details} onChange={e => setDetails(e.target.value)} maxLength={120} placeholder="رقم المحفظة أو عنوان InstaPay" required /></label>
              <button className="primary-button" disabled={sending || data.profile.availableBalance < 50}>{sending ? "جارٍ إرسال الطلب..." : "طلب صرف المكافأة"}</button>
            </form>
          </div>
          <div className="ap-ambassador-panel">
            <h2>سجل مكافآتي</h2>
            {data.commissions.length ? <div className="ap-ambassador-history">{data.commissions.map(item => <article key={item.orderId}><div><b>{item.orderId.slice(0, 12)}</b><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-EG") : "—"}</small></div><strong className={item.status === "reversed" ? "is-reversed" : ""}>{item.status === "reversed" ? "−" : "+"}{item.amount} جنيه</strong></article>)}</div> : <p>لسه مفيش مكافآت. أول طلب يتسلّم من خلال رابطك هيظهر هنا.</p>}
          </div>
        </section>
        <section className="ap-ambassador-panel">
          <h2>طلبات الصرف</h2>
          {data.payouts.length ? <div className="ap-ambassador-history">{data.payouts.map(item => <article key={item.id}><div><b>{item.amount} جنيه</b><small>{item.requestedAt ? new Date(item.requestedAt).toLocaleDateString("ar-EG") : "—"} · {item.method === "instapay" ? "InstaPay" : "محفظة إلكترونية"}</small></div><strong>{item.status === "paid" ? "تم الصرف" : item.status === "rejected" ? "مرفوض" : "قيد المراجعة"}</strong></article>)}</div> : <p>طلبات الصرف اللي هتقدميها هتظهر هنا.</p>}
        </section>
      </>}
      <p className="ap-ambassador-footnote">رابط مساحتك خاص بيكي. احتفظي بيه وما تشاركيهوش؛ شاركي رابط الدعوة العام فقط.</p>
    </main>
  </div>;
}
