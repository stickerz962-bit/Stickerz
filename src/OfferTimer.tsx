import { useEffect, useState } from 'react';

const OFFER_KEY = 'anti-pressure:launch-offer-start:v1';
const DURATION_MS = 60 * 60 * 1000;

export function useLaunchOffer() {
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    let start = 0;
    try {
      const saved = Number(localStorage.getItem(OFFER_KEY));
      if (Number.isFinite(saved) && saved > 0) start = saved;
      else {
        start = Date.now();
        localStorage.setItem(OFFER_KEY, String(start));
      }
    } catch {
      start = Date.now();
    }
    setStartedAt(start);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = startedAt === null ? DURATION_MS : Math.max(0, startedAt + DURATION_MS - now);
  const active = startedAt !== null && remainingMs > 0;
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return { active, remainingMs, countdown: hours + ':' + minutes + ':' + seconds, price: active ? 190 : 240, originalPrice: 240 };
}

export function OfferTimer({ compact = false }: { compact?: boolean }) {
  const offer = useLaunchOffer();
  return <div className={'launch-offer ' + (compact ? 'launch-offer-compact' : '')} aria-live="polite">
    {offer.active ? <>
      <span className="offer-kicker">عرض ترحيبي لأول ساعة من زيارتك</span>
      <strong><del>240</del> 190 جنيه</strong>
      <span className="offer-count-label">الوقت المتبقي للعرض</span>
      <b className="offer-countdown" dir="ltr">{offer.countdown}</b>
    </> : <>
      <span className="offer-kicker">سعر الكتاب</span>
      <strong>240 جنيه</strong>
      <span className="offer-count-label">السعر بعد انتهاء العرض</span>
    </>}
    <small>الشحن يُحسب بشكل منفصل قبل تأكيد الطلب.</small>
  </div>;
}
