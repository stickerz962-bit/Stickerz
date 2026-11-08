import { describe, expect, it } from 'vitest';
import { MIN_PAYOUT, REWARD_PER_ORDER } from '../src/lib/freeTierRewards';

describe('Coloring Rewards amounts', () => {
  it('uses a fixed 15 EGP reward per delivered referral order', () => {
    expect(REWARD_PER_ORDER).toBe(15);
  });

  it('keeps the minimum payout at 50 EGP', () => {
    expect(MIN_PAYOUT).toBe(50);
  });
});
