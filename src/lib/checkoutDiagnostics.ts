export const CHECKOUT_FAILURE_STAGES = [
  'prepare_order',
  'prepare_reward_credentials',
  'hash_reward_token',
  'check_referral_tracking',
  'prepare_order_batch',
  'write_order_batch',
  'finalize_order',
] as const;

export type CheckoutFailureStage = typeof CHECKOUT_FAILURE_STAGES[number];

const SAFE_FIREBASE_CODES = new Set([
  'aborted', 'already-exists', 'cancelled', 'data-loss', 'deadline-exceeded',
  'failed-precondition', 'internal', 'invalid-argument', 'not-found',
  'out-of-range', 'permission-denied', 'resource-exhausted', 'unauthenticated',
  'unavailable', 'unimplemented', 'unknown',
]);

export function getCheckoutDiagnostic(error: unknown, stage: CheckoutFailureStage) {
  const candidate = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
  const normalizedCode = candidate.replace(/^firestore\//, '').replace(/^auth\//, '');
  const firebaseCode = SAFE_FIREBASE_CODES.has(normalizedCode) ? normalizedCode : 'unknown';
  return {
    stage,
    firebaseCode,
    reference: `AP-CHK-${stage.toUpperCase()}`,
  };
}
