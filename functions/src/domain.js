import { createHash, timingSafeEqual } from "node:crypto";

export const AMBASSADOR_COMMISSION_EGP = 15;
export const AMBASSADOR_MIN_PAYOUT_EGP = 50;

export function normalizeEgyptianPhone(value) {
  const digits = String(value ?? "").replace(/[\s()+-]/g, "");
  if (/^01[0125]\d{8}$/.test(digits)) return "20" + digits.slice(1);
  if (/^201[0125]\d{8}$/.test(digits)) return digits;
  return null;
}

export function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function safeHashEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function validatePayoutRequest({ amount, availableBalance, method, details }) {
  if (!Number.isSafeInteger(amount) || amount < AMBASSADOR_MIN_PAYOUT_EGP) {
    return { ok: false, reason: "MINIMUM_PAYOUT" };
  }
  if (!Number.isSafeInteger(availableBalance) || amount > availableBalance) {
    return { ok: false, reason: "INSUFFICIENT_BALANCE" };
  }
  if (!["instapay", "wallet"].includes(method)) return { ok: false, reason: "INVALID_METHOD" };
  if (typeof details !== "string" || details.trim().length < 5 || details.trim().length > 120) {
    return { ok: false, reason: "INVALID_PAYOUT_DETAILS" };
  }
  return { ok: true };
}

export function isValidAmbassadorCode(code) {
  return typeof code === "string" && /^AP[A-F0-9]{20}$/.test(code);
}

export function shouldCreditAmbassadorCommission({ fulfillmentStatus, paymentStatus, referrerStatus, selfReferral, commissionExists }) {
  return fulfillmentStatus === "delivered"
    && paymentStatus !== "refunded"
    && paymentStatus !== "rejected"
    && referrerStatus === "active"
    && selfReferral !== true
    && commissionExists !== true;
}

export function canCompletePayoutAfterReversals(availableBalance) {
  return Number.isSafeInteger(availableBalance) && availableBalance >= 0;
}

export function balanceAfterCommissionReversal(currentBalance, amount) {
  if (!Number.isSafeInteger(currentBalance) || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new TypeError("Commission reversal requires integer EGP values.");
  }
  return currentBalance - amount;
}
