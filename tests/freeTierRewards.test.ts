import { describe, expect, it } from "vitest";
import { shouldCreditReferralReward } from "../src/lib/freeTierRewards";

describe("coloring referral reward eligibility", () => {
  const base = { fulfillmentStatus: "delivered", paymentStatus: "paid", referralCode: "APAAAAAAAAAAAAAAAAAAAA", ownCode: "APBBBBBBBBBBBBBBBBBBBB", commissionExists: false };

  it("credits an eligible referral once the order is delivered", () => {
    expect(shouldCreditReferralReward(base)).toBe(true);
  });
  it("does not credit the same order twice", () => {
    expect(shouldCreditReferralReward({ ...base, commissionExists: true })).toBe(false);
  });
  it("rejects self-referrals", () => {
    expect(shouldCreditReferralReward({ ...base, ownCode: base.referralCode })).toBe(false);
  });
  it("does not credit undelivered or refunded orders", () => {
    expect(shouldCreditReferralReward({ ...base, fulfillmentStatus: "shipped" })).toBe(false);
    expect(shouldCreditReferralReward({ ...base, paymentStatus: "refunded" })).toBe(false);
  });
});
