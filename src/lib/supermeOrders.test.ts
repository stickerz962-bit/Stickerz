import { describe, expect, it } from 'vitest';
import { validateSuperMeOrder } from './supermeOrders';
import type { SuperMePage } from './supermePages';

const pages = Array.from({ length: 60 }, (_, index) => ({
  id: 'SM-PAGE-' + index,
  sectionId: 'plans',
  sectionTitle: 'خططي',
  title: 'صفحة ' + index,
  kind: 'tracker' as const,
  description: 'وصف',
  items: ['هدف', 'متابعة'],
  prompt: 'اكتب هنا',
})) satisfies SuperMePage[];

const validInput = {
  pages,
  coverId: 'signature',
  coverTitle: 'SuperMe',
  personalizedName: 'Test Name',
  checkout: {
    name: 'Test Customer',
    phone: '01012345678',
    governorate: 'Cairo',
    area: 'Nasr City',
    address: 'Test street 123',
    notes: '',
    paymentMethod: 'cod' as const,
  },
  pricing: { bookPrice: 350, shippingFee: 50 },
};

describe('SuperMe checkout validation', () => {
  it('accepts exactly 60 unique pages and valid Egyptian delivery details', () => {
    expect(validateSuperMeOrder(validInput)).toEqual({ phone: '01012345678', totalAmount: 400 });
  });

  it('rejects a book that does not contain exactly 60 unique pages', () => {
    expect(() => validateSuperMeOrder({ ...validInput, pages: pages.slice(0, 59) })).toThrow('BOOK_MUST_HAVE_60_UNIQUE_PAGES');
    expect(() => validateSuperMeOrder({ ...validInput, pages: [...pages.slice(0, 59), pages[0]] })).toThrow('BOOK_MUST_HAVE_60_UNIQUE_PAGES');
  });

  it('rejects invalid mobile numbers and unconfigured pricing', () => {
    expect(() => validateSuperMeOrder({ ...validInput, checkout: { ...validInput.checkout, phone: '123' } })).toThrow('INVALID_EGYPT_PHONE');
    expect(() => validateSuperMeOrder({ ...validInput, pricing: { bookPrice: 0, shippingFee: 50 } })).toThrow('PRICE_NOT_CONFIGURED');
  });
});
