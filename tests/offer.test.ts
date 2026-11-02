import { describe, expect, it } from 'vitest';
import { formatOfferCountdown, getOfferEndAt, getOfferRemainingMs, INTRO_OFFER_DURATION_MS } from '../src/lib/offer';

describe('one-hour introductory offer', () => {
  it('starts at 60 minutes and persists the original end timestamp', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const firstEnd = getOfferEndAt(storage, 'offer', 1000);
    expect(firstEnd).toBe(1000 + INTRO_OFFER_DURATION_MS);
    expect(getOfferEndAt(storage, 'offer', 5000)).toBe(firstEnd);
  });
  it('never returns a negative remaining time', () => {
    expect(getOfferRemainingMs(5000, 6000)).toBe(0);
  });
  it('formats the countdown as HH:MM:SS', () => {
    expect(formatOfferCountdown(3_661_000)).toBe('01:01:01');
    expect(formatOfferCountdown(0)).toBe('00:00:00');
  });
});