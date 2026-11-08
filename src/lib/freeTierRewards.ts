import {
  doc, runTransaction,
  serverTimestamp, type Firestore,
} from "firebase/firestore";

export const REWARD_PER_ORDER = 15;
export const MIN_PAYOUT = 50;
export const isAmbassadorCode = (value: unknown): value is string =>
  typeof value === "string" && /^AP[A-F0-9]{20}$/.test(value);

const number = (value: unknown) => Number.isSafeInteger(value) ? Number(value) : 0;
const phone = (value: unknown) => {
  const digits = String(value ?? "").replace(/[\s()+-]/g, "");
  if (/^01[0125]\d{8}$/.test(digits)) return "20" + digits.slice(1);
  if (/^201[0125]\d{8}$/.test(digits)) return digits;
  return "";
};

type RewardOrder = {
  id: string; trackingToken?: string; customer?: { name?: string; phone?: string };
  ambassadorSetup?: { code?: string; accessTokenHash?: string };
  ambassadorReferralCode?: string | null;
  fulfillmentStatus?: string; paymentStatus?: string;
};

function profileRef(db: Firestore, code: string) { return doc(db, "ambassadors", code); }
function portalRef(db: Firestore, hash: string) { return doc(db, "ambassadorPortals", hash); }

function portalSummary(code: string, profile: Record<string, any>) {
  return {
    code, name: profile.name || "", status: profile.status || "active",
    availableBalance: number(profile.availableBalance), reservedBalance: number(profile.reservedBalance),
    lifetimeEarned: number(profile.lifetimeEarned), lifetimeReversed: number(profile.lifetimeReversed),
    lifetimePaidOut: number(profile.lifetimePaidOut), deliveredReferralOrders: number(profile.deliveredReferralOrders),
    updatedAt: serverTimestamp(),
  };
}

/** Called only from an authenticated admin action, in the same transaction as the order status change. */
export async function updateOrderAndRewards(db: Firestore, order: RewardOrder, patch: Record<string, unknown>) {
  const orderRef = doc(db, "orders", order.id);
  const trackingRef = order.trackingToken ? doc(db, "orderTracking", order.trackingToken) : null;
  const commissionRef = doc(db, "ambassadorCommissions", order.id);
  await runTransaction(db, async tx => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error("ORDER_NOT_FOUND");
    const current = { id: order.id, ...orderSnap.data() } as RewardOrder;
    const next = { ...current, ...patch } as RewardOrder;
    const commissionSnap = await tx.get(commissionRef);

    const ownCode = isAmbassadorCode(current.ambassadorSetup?.code) ? current.ambassadorSetup!.code! : "";
    const ownHash = typeof current.ambassadorSetup?.accessTokenHash === "string" && /^[a-f0-9]{64}$/.test(current.ambassadorSetup.accessTokenHash) ? current.ambassadorSetup.accessTokenHash : "";
    const referralCode = isAmbassadorCode(current.ambassadorReferralCode) ? current.ambassadorReferralCode : "";
    const codes = [...new Set([ownCode, referralCode, commissionSnap.exists && isAmbassadorCode(commissionSnap.data().ambassadorCode) ? commissionSnap.data().ambassadorCode : ""].filter(Boolean))];
    const profileSnaps = new Map<string, any>();
    for (const code of codes) profileSnaps.set(code, await tx.get(profileRef(db, code)));
    const portalHashes = new Set<string>();
    for (const code of codes) {
      const data = profileSnaps.get(code)?.data();
      if (data?.accessTokenHash) portalHashes.add(data.accessTokenHash);
    }
    if (ownHash) portalHashes.add(ownHash);
    const portalSnaps = new Map<string, any>();
    for (const hash of portalHashes) portalSnaps.set(hash, await tx.get(portalRef(db, hash)));

    const now = serverTimestamp();
    tx.update(orderRef, { ...patch, updatedAt: now });
    if (trackingRef) tx.update(trackingRef, { ...(typeof patch.fulfillmentStatus === "string" ? { fulfillmentStatus: patch.fulfillmentStatus } : {}), updatedAt: now });

    // A delivered customer gets her private portal, but the raw access key never enters Firestore.
    if (next.fulfillmentStatus === "delivered" && next.paymentStatus !== "refunded" && ownCode && ownHash) {
      const existing = profileSnaps.get(ownCode);
      const customerPhone = phone(current.customer?.phone);
      if (!existing?.exists()) {
        const created = {
          code: ownCode, name: String(current.customer?.name || "").slice(0, 80), phoneNormalized: customerPhone,
          phoneNumbers: customerPhone ? [customerPhone] : [], accessTokenHash: ownHash, sourceOrderId: current.id,
          status: "active", availableBalance: 0, reservedBalance: 0, lifetimeEarned: 0,
          lifetimeReversed: 0, lifetimePaidOut: 0, deliveredReferralOrders: 0, createdAt: now, updatedAt: now,
        };
        tx.set(profileRef(db, ownCode), created);
        tx.set(portalRef(db, ownHash), portalSummary(ownCode, created));
      } else {
        const data = existing.data();
        const ownPortal = portalSnaps.get(ownHash);
        if (!ownPortal?.exists()) tx.set(portalRef(db, ownHash), portalSummary(ownCode, data));
        if (customerPhone) {
          const phones = Array.isArray(data.phoneNumbers) ? data.phoneNumbers : [];
          if (!phones.includes(customerPhone)) tx.update(profileRef(db, ownCode), { phoneNumbers: [...phones, customerPhone], updatedAt: now });
        }
      }
    }

    // One referrer per order, no self-referral, and one immutable ledger row per order.
    if (next.fulfillmentStatus === "delivered" && !["refunded", "rejected"].includes(next.paymentStatus || "") && referralCode && referralCode !== ownCode && !commissionSnap.exists) {
      const refSnap = profileSnaps.get(referralCode);
      if (refSnap?.exists() && refSnap.data().status === "active") {
        const refProfile = refSnap.data();
        const customerPhone = phone(current.customer?.phone);
        const isSelf = !!customerPhone && (customerPhone === refProfile.phoneNormalized || (Array.isArray(refProfile.phoneNumbers) && refProfile.phoneNumbers.includes(customerPhone)));
        if (!isSelf) {
          const nextProfile = {
            ...refProfile,
            availableBalance: number(refProfile.availableBalance) + REWARD_PER_ORDER,
            lifetimeEarned: number(refProfile.lifetimeEarned) + REWARD_PER_ORDER,
            deliveredReferralOrders: number(refProfile.deliveredReferralOrders) + 1,
          };
          tx.set(commissionRef, { orderId: current.id, ambassadorCode: referralCode, amount: REWARD_PER_ORDER, currency: "EGP", status: "credited", createdAt: now });
          tx.update(profileRef(db, referralCode), { availableBalance: nextProfile.availableBalance, lifetimeEarned: nextProfile.lifetimeEarned, deliveredReferralOrders: nextProfile.deliveredReferralOrders, updatedAt: now });
          const hash = refProfile.accessTokenHash;
          if (hash) {
            const portal = portalSnaps.get(hash);
            if (portal?.exists() && portal.data().code !== referralCode) throw new Error("PORTAL_CODE_MISMATCH");
            tx.set(portalRef(db, hash), portalSummary(referralCode, nextProfile), { merge: true });
            tx.set(doc(db, "ambassadorPortals", hash, "commissions", current.id), { orderId: current.id, amount: REWARD_PER_ORDER, status: "credited", createdAt: now });
          }
        }
      }
    }

    // Refund reverses a credited commission once, even if the order status is edited repeatedly.
    if (next.paymentStatus === "refunded" && commissionSnap.exists() && commissionSnap.data().status === "credited") {
      const commission = commissionSnap.data();
      const code = commission.ambassadorCode;
      const refSnap = profileSnaps.get(code);
      if (refSnap?.exists()) {
        const data = refSnap.data();
        const amount = number(commission.amount) || REWARD_PER_ORDER;
        const updated = { ...data, availableBalance: number(data.availableBalance) - amount, lifetimeReversed: number(data.lifetimeReversed) + amount };
        tx.update(profileRef(db, code), { availableBalance: updated.availableBalance, lifetimeReversed: updated.lifetimeReversed, updatedAt: now });
        const hash = data.accessTokenHash;
        if (hash) {
          const portal = portalSnaps.get(hash);
          if (portal?.exists() && portal.data().code !== code) throw new Error("PORTAL_CODE_MISMATCH");
          tx.set(portalRef(db, hash), portalSummary(code, updated), { merge: true });
          tx.set(doc(db, "ambassadorPortals", hash, "commissions", current.id), { orderId: current.id, amount, status: "reversed", reversedAt: now }, { merge: true });
        }
        tx.update(commissionRef, { status: "reversed", reversedAt: now, reversalReason: "order_refunded" });
      }
    }
  });
}

export async function submitPayout(db: Firestore, code: string, accessHash: string, amount: number, method: "instapay" | "wallet", details: string, requestId: string) {
  if (!isAmbassadorCode(code) || !/^[a-f0-9]{64}$/.test(accessHash)) throw new Error("INVALID_ACCESS");
  if (!Number.isSafeInteger(amount) || amount < MIN_PAYOUT) throw new Error("MINIMUM_PAYOUT");
  if (!["instapay", "wallet"].includes(method) || details.trim().length < 5 || details.trim().length > 120) throw new Error("INVALID_DETAILS");
  const profile = portalRef(db, accessHash);
  const payout = doc(db, "ambassadorPayouts", requestId);
  const portalPayout = doc(db, "ambassadorPortals", accessHash, "payouts", requestId);
  await runTransaction(db, async tx => {
    const [profileSnap, existingPayout] = await Promise.all([tx.get(profile), tx.get(portalPayout)]);
    if (existingPayout.exists()) return;
    if (!profileSnap.exists() || profileSnap.data().code !== code || profileSnap.data().status !== "active") throw new Error("INVALID_ACCESS");
    const data = profileSnap.data();
    const available = number(data.availableBalance);
    if (amount > available) throw new Error("INSUFFICIENT_BALANCE");
    tx.update(profile, {
      availableBalance: available - amount,
      reservedBalance: number(data.reservedBalance) + amount,
      lastPayoutId: requestId,
      updatedAt: serverTimestamp(),
    });
    tx.set(payout, {
      ambassadorCode: code, accessTokenHash: accessHash, amount, method, payoutDetails: details.trim(),
      status: "pending", requestedAt: serverTimestamp(), reviewedAt: null, paidAt: null,
    });
    tx.set(portalPayout, {
      id: requestId, amount, method, status: "pending", requestedAt: serverTimestamp(),
    });
  });
}

export async function reviewPayout(db: Firestore, payoutId: string, decision: "paid" | "rejected", reference: string, adminUid: string) {
  const payoutRef = doc(db, "ambassadorPayouts", payoutId);
  await runTransaction(db, async tx => {
    const payoutSnap = await tx.get(payoutRef);
    if (!payoutSnap.exists()) throw new Error("PAYOUT_NOT_FOUND");
    const payout = payoutSnap.data();
    if (payout.status !== "pending") throw new Error("PAYOUT_ALREADY_REVIEWED");
    const profileRef = doc(db, "ambassadors", payout.ambassadorCode);
    const profileSnap = await tx.get(profileRef);
    if (!profileSnap.exists()) throw new Error("PROFILE_NOT_FOUND");
    const profile = profileSnap.data();
    const amount = number(payout.amount);
    if (number(profile.reservedBalance) < amount) throw new Error("RESERVED_BALANCE_MISMATCH");
    const hash = payout.accessTokenHash || profile.accessTokenHash;
    const portalSnap = hash ? await tx.get(portalRef(db, hash)) : null;
    const nextAvailable = number(profile.availableBalance) + (decision === "rejected" ? amount : 0);
    if (decision === "paid" && nextAvailable < 0) throw new Error("REFUND_OFFSET_PENDING");
    const nextReserved = number(profile.reservedBalance) - amount;
    const nextProfile = { ...profile, availableBalance: nextAvailable, reservedBalance: nextReserved, lifetimePaidOut: number(profile.lifetimePaidOut) + (decision === "paid" ? amount : 0) };
    tx.update(profileRef, { availableBalance: nextAvailable, reservedBalance: nextReserved, lifetimePaidOut: nextProfile.lifetimePaidOut, updatedAt: serverTimestamp() });
    tx.update(payoutRef, {
      status: decision, ...(decision === "paid" ? { transferReference: reference.trim(), paidAt: serverTimestamp() } : { rejectionReason: reference.trim() }),
      reviewedBy: adminUid, reviewedAt: serverTimestamp(),
    });
    if (hash) {
      if (portalSnap?.exists() && portalSnap.data().code !== payout.ambassadorCode) throw new Error("PORTAL_CODE_MISMATCH");
      tx.set(portalRef(db, hash), portalSummary(payout.ambassadorCode, nextProfile), { merge: true });
      tx.set(doc(db, "ambassadorPortals", hash, "payouts", payoutId), {
        id: payoutId, amount, method: payout.method, status: decision, requestedAt: payout.requestedAt || null,
        ...(decision === "paid" ? { paidAt: serverTimestamp() } : { rejectionReason: reference.trim() }),
      }, { merge: true });
    }
  });
}

export async function setRewardProfileStatus(db: Firestore, code: string, status: "active" | "paused") {
  const ref = profileRef(db, code);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("PROFILE_NOT_FOUND");
    const data = snap.data();
    const portalSnap = data.accessTokenHash ? await tx.get(portalRef(db, data.accessTokenHash)) : null;
    if (portalSnap && portalSnap.exists() && portalSnap.data().code !== code) throw new Error("PORTAL_CODE_MISMATCH");
    tx.update(ref, { status, updatedAt: serverTimestamp() });
    if (data.accessTokenHash) tx.set(portalRef(db, data.accessTokenHash), { status, updatedAt: serverTimestamp() }, { merge: true });
  });
}
