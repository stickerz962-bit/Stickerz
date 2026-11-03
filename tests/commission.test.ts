import { describe, expect, it } from 'vitest';
import { formatPartnerCommission, PARTNER_COMMISSION_EGP } from '../src/lib/commission';

describe('partner commission', () => {
  it('uses a fixed 15 EGP reward per delivered order', () => {
    expect(PARTNER_COMMISSION_EGP).toBe(15);
    expect(formatPartnerCommission()).toBe('15 جنيه');
  });

  it('formats an explicit EGP amount without implying a percentage', () => {
    expect(formatPartnerCommission(30)).toBe('30 جنيه');
  });
});
