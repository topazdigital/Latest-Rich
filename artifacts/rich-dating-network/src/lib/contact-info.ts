/**
 * Client-side hint for the server's contact-info moderation rule.
 *
 * The server remains authoritative. This is only used to show the upgrade
 * prompt before a send and to keep the prompt visible after a rejection.
 */
export const CONTACT_INFO_PATTERN =
  /(?:[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s().-]{5,}\d|\d(?:\.\d){5,}|(?:instagram|insta|ig|whatsapp|whats\s*app|wa\b|telegram|tg\b|t\.me|snapchat|snap\b|facebook|fb|twitter|x\.com|tiktok|wechat|we\s*chat|line\b|kik\b|skype|discord|viber|signal|linktree|onlyfans|imo\b|zalo|bbm|hangouts?)\s*[:=@\/\-\s]*[\w.@+-]{2,}|@[\w.]{3,}|https?:\/\/[^\s]{4,}|www\.[a-z0-9-]{2,}\.[a-z]{2,}|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|me|app|link|ly|to|gg|tv)\b)/i

/** Client-side hint for payment details and explicit requests for financial help. */
export const FINANCIAL_INFO_PATTERN =
  /\b(pay\s*pal|venmo|cash\s*app|cashapp|zelle|western\s*union|money\s*gram|transferwise|wise\s+(?:account|payment|transfer|app)|remitly|world\s*remit|payoneer|skrill|neteller|revolut|m[\s-]?pesa|airtel\s*money|mtn\s*mobile\s*money|mobile\s*money|bank\s+transfer|wire\s+transfer|bitcoin|btc|crypto(?:currency)?\s+wallet|wallet\s+address|payment\s+(?:link|handle|tag)|bank\s+details?|bank\s+account|account\s+(?:number|no\.?|details?)|iban|swift(?:\s*\/\s*bic)?|bic\s+code|routing\s+(?:number|no\.?)|sort\s+code|account\s+no\.?|(?:send|transfer|lend|loan|pay|give)\s+(?:me\s+)?(?:some\s+)?(?:money|cash|funds|a\s+loan|rent|bills?|fees|airtime|fare)|i\s+(?:need|want|could\s+use|am\s+looking\s+for|would\s+like)\s+(?:some\s+)?(?:money|cash|funds|financial\s+(?:help|assistance)|a\s+loan)|(?:can|could|would)\s+you\s+(?:help|lend|send|transfer|give|pay)\s+me\b.{0,40}\b(?:money|cash|funds|rent|bills?|fees|airtime|fare|loan)|help\s+me\s+with\s+(?:my\s+)?(?:rent|bills?|fees|airtime|fare|medical\s+costs)|borrow(?:ing)?\s+money)\b/i

export function isActivePremium(user: {
  premium?: number | null
  premiumExpiry?: number | null
} | null | undefined): boolean {
  const expiry = user?.premiumExpiry || 0
  return user?.premium === 1 && (expiry === 0 || expiry * 1000 > Date.now())
}

export function canShareContactInfo(user: {
  fake?: number | null
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
} | null | undefined): boolean {
  return user?.fake === 1 || (isActivePremium(user) && (user?.premiumPriority || 0) >= 2)
}

export function canShareFinancialInfo(user: {
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
} | null | undefined): boolean {
  return isActivePremium(user) && (user?.premiumPriority || 0) >= 3
}