import { collection, doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { attachAmbassadorReferralToOrder, getOrCreateAmbassadorCredentials, hashAmbassadorToken, readAmbassadorReferral, readAmbassadorReferralTrackingToken, saveAmbassadorContext, clearAmbassadorReferral } from './ambassador';
import type { SuperMePage } from './supermePages';

export type SuperMeCheckout = {
  name: string;
  phone: string;
  governorate: string;
  area: string;
  address: string;
  notes: string;
  paymentMethod: 'cod' | 'instapay';
};

export type SuperMeOrderPricing = { bookPrice: number; shippingFee: number };

export function validateSuperMeOrder(input: {
  pages: SuperMePage[];
  coverId: string;
  coverTitle: string;
  personalizedName: string;
  checkout: SuperMeCheckout;
  pricing: SuperMeOrderPricing;
}) {
  const { pages, coverId, coverTitle, personalizedName, checkout, pricing } = input;
  if (pages.length !== 60 || new Set(pages.map(page => page.id)).size !== 60) throw new Error('BOOK_MUST_HAVE_60_UNIQUE_PAGES');
  if (!coverId.trim() || !coverTitle.trim() || !personalizedName.trim() || personalizedName.trim().length > 40) throw new Error('INVALID_COVER_OR_NAME');
  const phone = checkout.phone.replace(/[\s()-]/g, '');
  if (!/^(01[0125][0-9]{8}|\+201[0125][0-9]{8}|201[0125][0-9]{8})$/.test(phone)) throw new Error('INVALID_EGYPT_PHONE');
  if (checkout.name.trim().length < 2 || checkout.name.trim().length > 80 ||
      checkout.governorate.trim().length < 2 || checkout.area.trim().length < 2 ||
      checkout.address.trim().length < 5 || checkout.address.trim().length > 300 ||
      checkout.notes.trim().length > 300) throw new Error('INVALID_SHIPPING_DETAILS');
  if (!Number.isSafeInteger(pricing.bookPrice) || pricing.bookPrice <= 0 ||
      !Number.isSafeInteger(pricing.shippingFee) || pricing.shippingFee < 0) throw new Error('PRICE_NOT_CONFIGURED');
  return { phone, totalAmount: pricing.bookPrice + pricing.shippingFee };
}

export async function createSuperMeOrder(db: Firestore, input: {
  pages: SuperMePage[];
  coverId: string;
  coverTitle: string;
  personalizedName: string;
  checkout: SuperMeCheckout;
  pricing: SuperMeOrderPricing;
}) {
  const validated = validateSuperMeOrder(input);
  const credentials = await getOrCreateAmbassadorCredentials();
  const accessTokenHash = await hashAmbassadorToken(credentials.accessToken);
  let referralCode = readAmbassadorReferral();
  const pendingTracking = readAmbassadorReferralTrackingToken();
  if (referralCode && pendingTracking) {
    try {
      // Referral attribution remains attached until the earlier order is delivered.
      const previous = await getDoc(doc(db, 'orderTracking', pendingTracking));
      if (previous.exists() && previous.data().fulfillmentStatus === 'delivered') {
        clearAmbassadorReferral(referralCode);
        referralCode = null;
      }
    } catch { /* Keep the original referral when the status lookup is unavailable. */ }
  }

  const orderRef = doc(collection(db, 'orders'));
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  const trackingToken = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const trackingRef = doc(db, 'orderTracking', trackingToken);
  const phone = validated.phone.replace(/^\+/, '');
  const publicReference = 'SM-' + Date.now().toString(36).toUpperCase();
  const pageSnapshot = input.pages.map((page, index) => ({
    pageId: page.id,
    sectionId: page.sectionId,
    sectionTitle: page.sectionTitle.slice(0, 80),
    titleSnapshot: page.title.slice(0, 120),
    kind: page.kind,
    description: page.description.slice(0, 1200),
    items: page.items.slice(0, 40).map(item => item.slice(0, 100)),
    prompt: page.prompt.slice(0, 300),
    ...(page.quote ? { quote: page.quote.slice(0, 300) } : {}),
    ...(page.qrUrl ? { qrUrl: page.qrUrl.slice(0, 500) } : {}),
    ...(page.legacyArtworkId ? { legacyArtworkId: page.legacyArtworkId } : {}),
    ...(page.previewAssetRef && !page.previewAssetRef.startsWith('data:') ? { previewAssetRef: page.previewAssetRef.slice(0, 500) } : {}),
    printOrder: index + 1,
  }));

  const batch = writeBatch(db);
  batch.set(orderRef, {
    productType: 'superme',
    publicReference,
    customer: { name: input.checkout.name.trim(), phone },
    shipping: {
      governorateName: input.checkout.governorate.trim(),
      areaName: input.checkout.area.trim(),
      address: input.checkout.address.trim(),
      deliveryNotes: input.checkout.notes.trim(),
      fee: input.pricing.shippingFee,
    },
    book: {
      pages: pageSnapshot,
      cover: { coverId: input.coverId, titleSnapshot: input.coverTitle },
      personalizedName: input.personalizedName.trim(),
    },
    pricing: {
      currency: 'EGP',
      standardBookPrice: input.pricing.bookPrice,
      bookPrice: input.pricing.bookPrice,
      shippingFee: input.pricing.shippingFee,
      totalAmount: validated.totalAmount,
      offerApplied: false,
    },
    paymentMethod: input.checkout.paymentMethod,
    paymentStatus: input.checkout.paymentMethod === 'instapay' ? 'pending_review' : 'unpaid',
    fulfillmentStatus: 'new',
    partnerCode: null,
    ambassadorReferralCode: referralCode,
    ambassadorSetup: { code: credentials.code, accessTokenHash },
    trackingToken,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(trackingRef, {
    publicReference,
    fulfillmentStatus: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  saveAmbassadorContext({ ...credentials, sourceOrderId: orderRef.id, trackingToken });
  attachAmbassadorReferralToOrder(referralCode, trackingToken);
  return { orderId: orderRef.id, publicReference, trackingToken };
}
