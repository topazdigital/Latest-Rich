/**
 * Client-side hint for the server's contact-info moderation rule.
 *
 * The server remains authoritative. This is only used to show the upgrade
 * prompt before a send and to keep the prompt visible after a rejection.
 */
export const CONTACT_INFO_PATTERN =
  /(?:[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s().-]{5,}\d|\d(?:\.\d){5,}|(?:instagram|insta|ig|whatsapp|whats\s*app|wa\b|telegram|tg\b|t\.me|snapchat|snap\b|facebook|fb|twitter|x\.com|tiktok|wechat|we\s*chat|line\b|kik\b|skype|discord|viber|signal|linktree|onlyfans|imo\b|zalo|bbm|hangouts?)\s*[:=@\/\-\s]*[\w.@+-]{2,}|@[\w.]{3,}|https?:\/\/[^\s]{4,}|www\.[a-z0-9-]{2,}\.[a-z]{2,}|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|me|app|link|ly|to|gg|tv)\b)/i

/** Shared copy shown when a member without Priority 3+ hits the financial-content gate. */
export const FINANCIAL_INFO_UPGRADE_MESSAGE =
  "To help protect members from money-request scams, borrowing or lending money and sharing payment details in chat requires an active Priority 3+ Premium plan."

/** Client-side hint matching the server's payment and financial-help rules. */
const FINANCIAL_EXPENSE =
  "(?:rent|bills?|fees|airtime|fare|school\\s+(?:fees|tuition|costs?|expenses?)|college\\s+(?:fees|tuition|costs?|expenses?)|university\\s+(?:fees|tuition|costs?|expenses?)|tuition|medical\\s+(?:costs?|bills?|expenses?)|treatment\\s+(?:costs?|expenses?))"
const MONEY_TERMS = "(?:money|cash|funds|financial\\s+(?:help|assistance)|(?:a\\s+)?loan)"
const MONEY_AMOUNT =
  "(?:[$€£]\\s*\\d+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?\\s*(?:dollars?|bucks?|usd|cad|aud|(?:kenyan\\s+)?shillings?|shs?|kshs?|kes|tshs?|tzs|ugx|ngn|naira|cedis?|ghs|rand|zar|pounds?|euros?))"
const MONEY_OR_EXPENSE = `(?:${MONEY_TERMS}|${FINANCIAL_EXPENSE})`
const FINANCIAL_INFO_PATTERNS = [
  /\b(pay\s*pal|venmo|cash\s*app|cashapp|zelle|western\s*union|money\s*gram|transferwise|wise\s+(?:account|payment|transfer|app)|remitly|world\s*remit|payoneer|skrill|neteller|revolut|m[\s-]?pesa|airtel\s*money|mtn\s*mobile\s*money|mobile\s*money|bank\s+transfer|wire\s+transfer|bitcoin|btc|crypto(?:currency)?\s+wallet|wallet\s+address|payment\s+(?:link|handle|tag))\b/i,
  /\b(?:bank\s+details?|bank\s+account|account\s+(?:number|no\.?|details?)|iban|swift(?:\s*\/\s*bic)?|bic\s+code|routing\s+(?:number|no\.?)|sort\s+code|account\s+no\.?)\b/i,
  new RegExp(`\\b(?:send|transfer|lend|loan|pay|give|cover)\\s+(?:(?:me|my)\\s+)?(?:some\\s+)?${MONEY_OR_EXPENSE}\\b`, "i"),
  new RegExp(`\\b(?:send|transfer|lend|loan|pay|give)\\s+(?:me\\s+)?${MONEY_AMOUNT}\\b`, "i"),
  new RegExp(`\\b(?:can|could|may|would)\\s+i\\s+(?:please\\s+)?borrow\\s+(?:(?:some|any|a\\s+little|a\\s+bit\\s+of)\\s+)?(?:${MONEY_TERMS}|${MONEY_AMOUNT})\\b`, "i"),
  new RegExp(`\\b(?:i|we)\\s+(?:really\\s+)?(?:want|need|would\\s+like|am\\s+looking)\\s+to\\s+borrow\\s+(?:(?:some|any|a\\s+little|a\\s+bit\\s+of)\\s+)?(?:money|cash|funds|${MONEY_AMOUNT})\\b`, "i"),
  new RegExp(`\\b(?:i|we)\\s+(?:(?:really|urgently)\\s+)?(?:need|want|could\\s+use|would\\s+(?:like|appreciate)|am\\s+looking\\s+for)\\s+(?:(?:some|a\\s+little|a\\s+bit\\s+of)\\s+)?${MONEY_TERMS}\\b`, "i"),
  new RegExp(`\\b(?:help|assist(?:ance)?)\\s+(?:me\\s+)?(?:with|pay(?:ing)?|cover(?:ing)?)\\s+(?:some\\s+|my\\s+)?${FINANCIAL_EXPENSE}\\b`, "i"),
  new RegExp(`\\b(?:sponsor|fund|finance|cover|pay\\s+for)\\s+(?:(?:me|my|our)\\s+)?${FINANCIAL_EXPENSE}\\b`, "i"),
  new RegExp(`\\b(?:can|could|would|will)\\s+you\\s+(?:please\\s+)?(?:help|assist|lend|send|transfer|give|pay|cover)\\s+me\\b.{0,40}\\b(?:${MONEY_TERMS}|${FINANCIAL_EXPENSE})\\b`, "i"),
  new RegExp(`\\bborrow(?:ing)?\\s+(?:(?:some|any|a\\s+little)\\s+)?(?:money|cash|funds|${MONEY_AMOUNT})\\b`, "i"),
  new RegExp(`\\b(?:i|we)\\s+(?:can't|cannot)\\s+(?:afford|pay|cover)\\s+(?:my\\s+)?${FINANCIAL_EXPENSE}\\b`, "i"),
  new RegExp(`\\b(?:i\\s+am|i['’]m|we\\s+are|we['’]re)\\s+(?:short\\s+on|struggling\\s+to\\s+(?:pay|cover)|unable\\s+to\\s+(?:pay|cover|afford))\\s+(?:my\\s+)?${FINANCIAL_EXPENSE}\\b`, "i"),
]

export function containsFinancialInfo(text: string): boolean {
  return !!text && FINANCIAL_INFO_PATTERNS.some((pattern) => pattern.test(text))
}

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