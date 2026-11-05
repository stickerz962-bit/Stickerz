import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import {
  AMBASSADOR_COMMISSION_EGP,
  AMBASSADOR_MIN_PAYOUT_EGP,
  isValidAmbassadorCode,
  normalizeEgyptianPhone,
  safeHashEqual,
  sha256,
  validatePayoutRequest,
} from "./domain.js";

initializeApp();
const db = getFirestore();

function fail(code, message) {
  throw new HttpsError(code, message);
}

function requireAccessPayload(data) {
  const code = data?.code;
  const accessToken = data?.accessToken;
  if (!isValidAmbassadorCode(code) || typeof accessToken !== "string" || !/^[a-f0-9]{64}$/.test(accessToken)) {
    fail("invalid-argument", "رابط المساحة الشخصية غير صالح.");
  }
  return { code, tokenHash: sha256(accessToken) };
}

async function getAuthorizedAmbassador(transaction, code, tokenHash) {
  const ref = db.collection("ambassadors").doc(code);
  const snap = await transaction.get(ref);
  if (!snap.exists || snap.data()?.status !== "active" || !safeHashEqual(snap.data()?.accessTokenHash, tokenHash)) {
    fail("permission-denied", "تعذر التحقق من رابط مساحتك الشخصية.");
  }
  return { ref, data: snap.data() };
}

export const processAmbassadorOrder = onDocumentWritten("orders/{orderId}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  if (!after) return;

  const orderId = event.params.orderId;
  const isDelivered = after.fulfillmentStatus === "delivered";
  const isRefunded = after.paymentStatus === "refunded";
  const setup = after.ambassadorSetup;

  if (!isDelivered && !isRefunded) return;

  const ownCode = isValidAmbassadorCode(setup?.code) ? setup.code : null;
  const referralCode = isValidAmbassadorCode(after.ambassadorReferralCode) ? after.ambassadorReferralCode : null;
  const ownRef = ownCode ? db.collection("ambassadors").doc(ownCode) : null;
  const referralRef = referralCode ? db.collection("ambassadors").doc(referralCode) : null;
  const commissionRef = db.collection("ambassadorCommissions").doc(orderId);
  const partnerQuery = typeof after.partnerCode === "string" && after.partnerCode
    ? db.collection("partners").where("code", "==", after.partnerCode).where("status", "==", "approved").limit(1)
    : null;

  await db.runTransaction(async (tx) => {
    // Complete every transaction read before issuing any writes.
    const commissionSnap = await tx.get(commissionRef);
    const partnerSnap = partnerQuery ? await tx.get(partnerQuery) : null;
    const hasApprovedPartner = !!partnerSnap?.docs?.length;
    const ownSnap = ownRef ? await tx.get(ownRef) : null;
    const referrerSnap = referralRef
      ? (ownRef && referralRef.path === ownRef.path ? ownSnap : await tx.get(referralRef))
      : null;

    let reversalProfileRef = null;
    let reversalProfileSnap = null;
    if (isRefunded && commissionSnap.exists && commissionSnap.data()?.status === "credited") {
      reversalProfileRef = db.collection("ambassadors").doc(commissionSnap.data().ambassadorCode);
      if (ownRef && reversalProfileRef.path === ownRef.path) reversalProfileSnap = ownSnap;
      else if (referralRef && reversalProfileRef.path === referralRef.path) reversalProfileSnap = referrerSnap;
      else reversalProfileSnap = await tx.get(reversalProfileRef);
    }

    // A delivered customer becomes an ambassador automatically. The browser stores
    // the raw access token; only its SHA-256 hash is present in the order/profile.
    if (isDelivered && !isRefunded && ownRef && !ownSnap?.exists && typeof setup.accessTokenHash === "string" && /^[a-f0-9]{64}$/.test(setup.accessTokenHash)) {
      const phone = normalizeEgyptianPhone(after.customer?.phone);
      tx.create(ownRef, {
        code: ownCode,
        name: String(after.customer?.name ?? "").slice(0, 80),
        phoneNormalized: phone,
        phoneNumbers: phone ? [phone] : [],
        accessTokenHash: setup.accessTokenHash,
        sourceOrderId: orderId,
        status: "active",
        availableBalance: 0,
        reservedBalance: 0,
        lifetimeEarned: 0,
        lifetimeReversed: 0,
        lifetimePaidOut: 0,
        deliveredReferralOrders: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Professional partner attribution takes precedence. The two programs never
    // pay a double reward for the same order.
    if (isDelivered && !isRefunded && !hasApprovedPartner && referralRef && !commissionSnap.exists) {
      const referrer = referrerSnap?.exists ? referrerSnap.data() : null;
      const customerPhone = normalizeEgyptianPhone(after.customer?.phone);
      const isSelfReferral = (ownRef && referralRef && ownRef.path === referralRef.path) || (!!customerPhone && (customerPhone === referrer?.phoneNormalized || (Array.isArray(referrer?.phoneNumbers) && referrer.phoneNumbers.includes(customerPhone))));
      if (referrer?.status === "active" && !isSelfReferral) {
        tx.create(commissionRef, {
          orderId,
          ambassadorCode: referralCode,
          amount: AMBASSADOR_COMMISSION_EGP,
          currency: "EGP",
          status: "credited",
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(referralRef, {
          availableBalance: (Number(referrer.availableBalance) || 0) + AMBASSADOR_COMMISSION_EGP,
          lifetimeEarned: (Number(referrer.lifetimeEarned) || 0) + AMBASSADOR_COMMISSION_EGP,
          deliveredReferralOrders: (Number(referrer.deliveredReferralOrders) || 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // A full refund reverses an already credited reward exactly once. If the
    // ambassador has already withdrawn the money, the balance may become negative
    // and future rewards first offset that amount.
    if (reversalProfileRef && reversalProfileSnap?.exists) {
      const commission = commissionSnap.data();
      const owner = reversalProfileSnap.data();
      const amount = Number(commission.amount) || AMBASSADOR_COMMISSION_EGP;
      tx.update(reversalProfileRef, {
        availableBalance: (Number(owner.availableBalance) || 0) - amount,
        lifetimeReversed: (Number(owner.lifetimeReversed) || 0) + amount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(commissionRef, { status: "reversed", reversedAt: FieldValue.serverTimestamp(), reversalReason: "order_refunded" });
    }
  });

  logger.info("Ambassador order event processed", { orderId, delivered: isDelivered, refunded: isRefunded, previousStatus: before?.fulfillmentStatus ?? null });
});

export const getAmbassadorDashboard = onCall(async (request) => {
  const { code, tokenHash } = requireAccessPayload(request.data);
  const profileRef = db.collection("ambassadors").doc(code);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists || profileSnap.data()?.status !== "active" || !safeHashEqual(profileSnap.data()?.accessTokenHash, tokenHash)) {
    fail("permission-denied", "تعذر التحقق من رابط مساحتك الشخصية.");
  }
  const [commissionsSnap, payoutsSnap] = await Promise.all([
    db.collection("ambassadorCommissions").where("ambassadorCode", "==", code).orderBy("createdAt", "desc").limit(50).get(),
    db.collection("ambassadorPayouts").where("ambassadorCode", "==", code).orderBy("requestedAt", "desc").limit(30).get(),
  ]);
  const profile = profileSnap.data();
  return {
    profile: {
      name: profile.name ?? "",
      code,
      status: profile.status,
      availableBalance: Number(profile.availableBalance) || 0,
      reservedBalance: Number(profile.reservedBalance) || 0,
      lifetimeEarned: Number(profile.lifetimeEarned) || 0,
      lifetimeReversed: Number(profile.lifetimeReversed) || 0,
      lifetimePaidOut: Number(profile.lifetimePaidOut) || 0,
      deliveredReferralOrders: Number(profile.deliveredReferralOrders) || 0,
    },
    commissions: commissionsSnap.docs.map((item) => {
      const row = item.data();
      return { orderId: row.orderId, amount: row.amount, status: row.status, createdAt: row.createdAt?.toDate?.().toISOString?.() ?? null, reversedAt: row.reversedAt?.toDate?.().toISOString?.() ?? null };
    }),
    payouts: payoutsSnap.docs.map((item) => {
      const row = item.data();
      return { id: item.id, amount: row.amount, method: row.method, status: row.status, requestedAt: row.requestedAt?.toDate?.().toISOString?.() ?? null, paidAt: row.paidAt?.toDate?.().toISOString?.() ?? null, rejectionReason: row.rejectionReason ?? null };
    }),
    minimumPayout: AMBASSADOR_MIN_PAYOUT_EGP,
    commissionPerDeliveredOrder: AMBASSADOR_COMMISSION_EGP,
  };
});

export const requestAmbassadorPayout = onCall(async (request) => {
  const { code, tokenHash } = requireAccessPayload(request.data);
  const amount = request.data?.amount;
  const method = request.data?.method;
  const details = request.data?.details;
  const requestId = request.data?.requestId;
  if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/.test(requestId)) {
    fail("invalid-argument", "معرّف طلب الصرف غير صالح.");
  }
  const profileRef = db.collection("ambassadors").doc(code);
  const payoutRef = db.collection("ambassadorPayouts").doc(requestId);

  const result = await db.runTransaction(async (tx) => {
    const { data: profile } = await getAuthorizedAmbassador(tx, code, tokenHash);
    const existingPayout = await tx.get(payoutRef);
    if (existingPayout.exists) {
      const existing = existingPayout.data();
      if (existing.ambassadorCode !== code) fail("already-exists", "معرّف طلب الصرف مستخدم.");
      return { payoutId: payoutRef.id, status: existing.status, amount: existing.amount, duplicate: true };
    }
    const validation = validatePayoutRequest({ amount, availableBalance: Number(profile.availableBalance) || 0, method, details });
    if (!validation.ok) {
      if (validation.reason === "MINIMUM_PAYOUT") fail("failed-precondition", "الحد الأدنى لطلب الصرف 50 جنيهًا.");
      if (validation.reason === "INSUFFICIENT_BALANCE") fail("failed-precondition", "المبلغ المطلوب أكبر من رصيدك المتاح.");
      fail("invalid-argument", "راجعي وسيلة الصرف والبيانات المدخلة.");
    }
    tx.update(profileRef, {
      availableBalance: (Number(profile.availableBalance) || 0) - amount,
      reservedBalance: (Number(profile.reservedBalance) || 0) + amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(payoutRef, {
      ambassadorCode: code,
      amount,
      method,
      payoutDetails: details.trim(),
      status: "pending",
      requestedAt: FieldValue.serverTimestamp(),
      reviewedAt: null,
      paidAt: null,
    });
    return { payoutId: payoutRef.id, status: "pending", amount, duplicate: false };
  });
  return result;
});

export const reviewAmbassadorPayout = onCall(async (request) => {
  if (request.auth?.token?.admin !== true) fail("permission-denied", "هذه العملية متاحة للإدارة فقط.");
  const payoutId = request.data?.payoutId;
  const decision = request.data?.decision;
  const transferReference = typeof request.data?.transferReference === "string" ? request.data.transferReference.trim().slice(0, 100) : "";
  if (typeof payoutId !== "string" || !/^[A-Za-z0-9-]{10,80}$/.test(payoutId) || !["paid", "rejected"].includes(decision)) {
    fail("invalid-argument", "بيانات مراجعة طلب الصرف غير صحيحة.");
  }
  if (transferReference.length < 3) {
    fail("invalid-argument", decision === "paid" ? "أدخلي مرجع التحويل قبل تأكيد الصرف." : "اكتبي سبب رفض طلب الصرف.");
  }
  const payoutRef = db.collection("ambassadorPayouts").doc(payoutId);
  await db.runTransaction(async (tx) => {
    const payoutSnap = await tx.get(payoutRef);
    if (!payoutSnap.exists) fail("not-found", "طلب الصرف غير موجود.");
    const payout = payoutSnap.data();
    if (payout.status === decision) return;
    if (payout.status !== "pending") fail("failed-precondition", "تمت مراجعة طلب الصرف بالفعل.");
    const profileRef = db.collection("ambassadors").doc(payout.ambassadorCode);
    const profileSnap = await tx.get(profileRef);
    if (!profileSnap.exists) fail("not-found", "ملف السفيرة غير موجود.");
    const profile = profileSnap.data();
    const amount = Number(payout.amount) || 0;
    const reserved = Number(profile.reservedBalance) || 0;
    if (reserved < amount) fail("failed-precondition", "الرصيد المحجوز لا يطابق طلب الصرف.");
    if (decision === "paid") {
      if (!transferReference) fail("invalid-argument", "أدخلي مرجع التحويل قبل تأكيد الصرف.");
      tx.update(profileRef, {
        reservedBalance: reserved - amount,
        lifetimePaidOut: (Number(profile.lifetimePaidOut) || 0) + amount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(payoutRef, { status: "paid", transferReference, reviewedBy: request.auth.uid, reviewedAt: FieldValue.serverTimestamp(), paidAt: FieldValue.serverTimestamp() });
    } else {
      tx.update(profileRef, {
        reservedBalance: reserved - amount,
        availableBalance: (Number(profile.availableBalance) || 0) + amount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(payoutRef, { status: "rejected", rejectionReason: transferReference, reviewedBy: request.auth.uid, reviewedAt: FieldValue.serverTimestamp() });
    }
  });
  return { payoutId, status: decision };
});
