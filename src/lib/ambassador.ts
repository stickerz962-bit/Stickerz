export const AMBASSADOR_CREDENTIALS_KEY = "anti-pressure:ambassador-access:v1";
export const AMBASSADOR_REFERRAL_KEY = "anti-pressure:ambassador-referral:v1";

export type AmbassadorCredentials = { code: string; accessToken: string };
export type AmbassadorContext = AmbassadorCredentials & { sourceOrderId: string; trackingToken: string };

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}

function isValidCode(value: unknown): value is string {
  return typeof value === "string" && /^AP[A-F0-9]{20}$/.test(value);
}

function isValidToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export async function getOrCreateAmbassadorCredentials(): Promise<AmbassadorCredentials> {
  try {
    const saved = JSON.parse(localStorage.getItem(AMBASSADOR_CREDENTIALS_KEY) || "null");
    if (isValidCode(saved?.code) && isValidToken(saved?.accessToken)) {
      return { code: saved.code, accessToken: saved.accessToken };
    }
  } catch { /* Create a fresh private key below. */ }

  const code = "AP" + randomHex(10).toUpperCase();
  const accessToken = randomHex(32);
  return { code, accessToken };
}

export async function hashAmbassadorToken(accessToken: string): Promise<string> {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export function saveAmbassadorContext(context: AmbassadorContext) {
  try {
    localStorage.setItem(AMBASSADOR_CREDENTIALS_KEY, JSON.stringify({
      code: context.code,
      accessToken: context.accessToken,
      sourceOrderId: context.sourceOrderId,
      trackingToken: context.trackingToken,
    }));
  } catch { /* The order remains valid even if private dashboard storage is unavailable. */ }
}

export function readAmbassadorContext(): AmbassadorContext | null {
  try {
    const value = JSON.parse(localStorage.getItem(AMBASSADOR_CREDENTIALS_KEY) || "null");
    if (!isValidCode(value?.code) || !isValidToken(value?.accessToken) ||
        typeof value?.sourceOrderId !== "string" || typeof value?.trackingToken !== "string") return null;
    return value as AmbassadorContext;
  } catch { return null; }
}

export function captureAmbassadorReferral(search: string) {
  const incoming = new URLSearchParams(search).get("amb");
  if (!isValidCode(incoming)) return;
  try {
    // First valid referral stays attached until the referred order is delivered.
    const current = localStorage.getItem(AMBASSADOR_REFERRAL_KEY);
    if (!current) localStorage.setItem(AMBASSADOR_REFERRAL_KEY, incoming);
  } catch { /* Referral capture is best-effort when browser storage is unavailable. */ }
}

export function readAmbassadorReferral(): string | null {
  try {
    const value = localStorage.getItem(AMBASSADOR_REFERRAL_KEY);
    return isValidCode(value) ? value : null;
  } catch { return null; }
}

export function clearAmbassadorReferral(code?: string | null) {
  try {
    const current = localStorage.getItem(AMBASSADOR_REFERRAL_KEY);
    if (!code || current === code) localStorage.removeItem(AMBASSADOR_REFERRAL_KEY);
  } catch { /* Ignore unavailable storage. */ }
}

export function buildAmbassadorReferralUrl(code: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("amb", code);
  return url.toString();
}

export function buildAmbassadorDashboardUrl(code: string, accessToken: string) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "#ambassador/" + code + "/" + accessToken;
  return url.toString();
}
