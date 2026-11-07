export const INTRO_OFFER_DURATION_MS = 24 * 60 * 60 * 1000;

export function getOfferEndAt(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, now: number): number {
  const saved = Number(storage.getItem(key));
  if (Number.isFinite(saved) && saved > 0) return saved;
  const endAt = now + INTRO_OFFER_DURATION_MS;
  storage.setItem(key, String(endAt));
  return endAt;
}

export function getOfferRemainingMs(endAt: number, now: number): number {
  return Math.max(0, endAt - now);
}

export function formatOfferCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}