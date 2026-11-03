/** Fixed partner reward for one successfully delivered order. */
export const PARTNER_COMMISSION_EGP = 15;

export function formatPartnerCommission(value = PARTNER_COMMISSION_EGP): string {
  return `${value} جنيه`;
}
