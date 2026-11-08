import { describe, expect, it } from 'vitest';
import { getCheckoutDiagnostic } from '../src/lib/checkoutDiagnostics';

describe('guest checkout diagnostics', () => {
  it('returns a stable stage reference and safe Firebase code', () => {
    expect(getCheckoutDiagnostic({ code: 'permission-denied', message: 'private customer data' }, 'write_order_batch')).toEqual({
      stage: 'write_order_batch',
      firebaseCode: 'permission-denied',
      reference: 'AP-CHK-WRITE_ORDER_BATCH',
    });
  });

  it('normalizes Firebase namespace prefixes', () => {
    expect(getCheckoutDiagnostic({ code: 'firestore/unavailable' }, 'check_referral_tracking').firebaseCode).toBe('unavailable');
  });

  it('does not expose arbitrary codes or error messages', () => {
    const result = getCheckoutDiagnostic({ code: 'secret-token-01012345678', message: 'customer name and tracking token' }, 'hash_reward_token');
    expect(result).toEqual({
      stage: 'hash_reward_token',
      firebaseCode: 'unknown',
      reference: 'AP-CHK-HASH_REWARD_TOKEN',
    });
    expect(JSON.stringify(result)).not.toMatch(/secret-token|01012345678|customer name|tracking token/);
  });

  it('handles non-Error values without throwing', () => {
    expect(getCheckoutDiagnostic('failure', 'prepare_reward_credentials').firebaseCode).toBe('unknown');
  });
});
