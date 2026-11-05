import test from "node:test";
import assert from "node:assert/strict";
import {
  AMBASSADOR_COMMISSION_EGP,
  AMBASSADOR_MIN_PAYOUT_EGP,
  isValidAmbassadorCode,
  normalizeEgyptianPhone,
  safeHashEqual,
  sha256,
  validatePayoutRequest,
} from "../src/domain.js";

test("ambassador reward settings are fixed", () => {
  assert.equal(AMBASSADOR_COMMISSION_EGP, 15);
  assert.equal(AMBASSADOR_MIN_PAYOUT_EGP, 50);
});

test("normalizes valid Egyptian mobile numbers and rejects invalid values", () => {
  assert.equal(normalizeEgyptianPhone("01012345678"), "201012345678");
  assert.equal(normalizeEgyptianPhone("+201012345678"), "201012345678");
  assert.equal(normalizeEgyptianPhone("01112345678"), "201112345678");
  assert.equal(normalizeEgyptianPhone("01912345678"), null);
});

test("validates ambassador code and constant-time hash comparison inputs", () => {
  const code = "AP" + "A".repeat(20);
  assert.equal(isValidAmbassadorCode(code), true);
  assert.equal(isValidAmbassadorCode("AP-short"), false);
  assert.equal(safeHashEqual(sha256("secret"), sha256("secret")), true);
  assert.equal(safeHashEqual(sha256("secret"), sha256("other")), false);
  assert.equal(safeHashEqual("bad", sha256("secret")), false);
});

test("payout request enforces minimum, balance, method and details", () => {
  const valid = { amount: 50, availableBalance: 80, method: "instapay", details: "name@instapay" };
  assert.equal(validatePayoutRequest(valid).ok, true);
  assert.equal(validatePayoutRequest({ ...valid, amount: 49 }).reason, "MINIMUM_PAYOUT");
  assert.equal(validatePayoutRequest({ ...valid, amount: 81 }).reason, "INSUFFICIENT_BALANCE");
  assert.equal(validatePayoutRequest({ ...valid, method: "cash" }).reason, "INVALID_METHOD");
  assert.equal(validatePayoutRequest({ ...valid, details: "x" }).reason, "INVALID_PAYOUT_DETAILS");
});
