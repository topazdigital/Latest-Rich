/**
 * Detects contact information (phone numbers, emails, social handles, URLs)
 * in user-submitted text. Used to block sharing outside of premium chat.
 *
 * Handles many obfuscation tricks:
 *  - Spaces/dots between digits: "07 12 34 56 78", "0.7.1.2..."
 *  - Word-substituted digits: "zero seven one two..."  (basic)
 *  - Mixed separators: "+254-712.345 678"
 *  - Social keyword with any separator before handle: "ig: username", "wa=07xxx"
 *  - Handles without @ when preceded by a social keyword
 */
export function containsContactInfo(text: string): boolean {
  if (!text || text.length < 3) return false

  const t = text

  // ── Email addresses ────────────────────────────────────────────────
  if (/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/.test(t)) return true

  // ── Phone numbers ──────────────────────────────────────────────────
  // Standard: 7+ consecutive digits with optional separators (spaces, dots, dashes, parens)
  // Catches: +254712345678 / 0712 345 678 / (0712) 345-678 / 07.12.34.56.78
  if (/(\+?[\d][\d\s.\-()]{5,}[\d])/.test(t)) return true

  // Digits separated by dots (0.7.1.2.3.4.5.6.7.8)
  if (/\d(\.\d){5,}/.test(t)) return true

  // ── Social media keywords followed by a handle ────────────────────
  // Catches: "ig: john", "whatsapp: 0712...", "telegram @john", "snap=john123"
  const SOCIAL =
    /\b(instagram|insta|ig|whatsapp|whats\s*app|wa\b|telegram|tg\b|t\.me|snapchat|snap\b|sc\b|facebook|fb\b|twitter|x\.com|tiktok|tt\b|wechat|we\s*chat|line\b|kik\b|skype|discord|viber|signal|linktree|onlyfans|imo\b|zalo\b|bbm\b|hangouts?)\s*[:=@\/\-\s]*[\w.@+\-]{2,}/i
  if (SOCIAL.test(t)) return true

  // ── Standalone @handle (3+ chars) ─────────────────────────────────
  if (/@[\w.]{3,}/.test(t)) return true

  // ── URLs ───────────────────────────────────────────────────────────
  if (/https?:\/\/[^\s]{4,}/.test(t)) return true
  if (/\bwww\.[a-zA-Z0-9\-]{2,}\.[a-zA-Z]{2,}/.test(t)) return true

  // ── Domain-like patterns (domain.tld without www) ─────────────────
  // e.g. "find me at john.com" or "add me on t.me/john"
  if (/\b[a-zA-Z0-9\-]{2,}\.(com|net|org|io|co|me|app|link|ly|to|gg|tv)\b/i.test(t)) return true

  // ── Numeric obfuscation: words for digits near phone-length runs ──
  // "zero seven one two three four five six seven eight" → 10 digit-words in a row
  const DIGIT_WORDS = /\b(zero|one|two|three|four|five|six|seven|eight|nine|oh\b)[\s,]*(zero|one|two|three|four|five|six|seven|eight|nine|oh\b){5,}/i
  if (DIGIT_WORDS.test(t)) return true

  return false
}

/**
 * Detects content used to request financial help or share off-platform
 * payment details. This is separate from contact info so the chat entitlement
 * can begin at Priority 3 without changing Priority 2 contact sharing.
 */
export function containsFinancialSharingInfo(text: string): boolean {
  if (!text || text.length < 3) return false

  const PAYMENT_METHOD =
    /\b(pay\s*pal|venmo|cash\s*app|cashapp|zelle|western\s*union|money\s*gram|transferwise|wise\s+(?:account|payment|transfer|app)|remitly|world\s*remit|payoneer|skrill|neteller|revolut|m[\s-]?pesa|airtel\s*money|mtn\s*mobile\s*money|mobile\s*money|bank\s+transfer|wire\s+transfer|bitcoin|btc|crypto(?:currency)?\s+wallet|wallet\s+address|payment\s+(?:link|handle|tag))\b/i
  if (PAYMENT_METHOD.test(text)) return true

  const BANK_DETAILS =
    /\b(?:bank\s+details?|bank\s+account|account\s+(?:number|no\.?|details?)|iban|swift(?:\s*\/\s*bic)?|bic\s+code|routing\s+(?:number|no\.?)|sort\s+code|account\s+no\.?)\b/i
  if (BANK_DETAILS.test(text)) return true

  // Require an explicit request for financial help rather than blocking
  // ordinary conversation that merely mentions money.
  const MONEY_REQUEST =
    /\b(?:send|transfer|lend|loan|pay|give)\s+(?:me\s+)?(?:some\s+)?(?:money|cash|funds|a\s+loan|rent|bills?|fees|airtime|fare)\b|\b(?:i\s+(?:need|want|could\s+use|am\s+looking\s+for|would\s+like)\s+(?:some\s+)?(?:money|cash|funds|financial\s+(?:help|assistance)|a\s+loan)|(?:can|could|would)\s+you\s+(?:help|lend|send|transfer|give|pay)\s+me\b.{0,40}\b(?:money|cash|funds|rent|bills?|fees|airtime|fare|loan)|help\s+me\s+with\s+(?:my\s+)?(?:rent|bills?|fees|airtime|fare|medical\s+costs)|borrow(?:ing)?\s+money)\b/i
  return MONEY_REQUEST.test(text)
}

export function isActivePremium(user: {
  premium?: number | null
  premiumExpiry?: number | null
}): boolean {
  const expiry = user.premiumExpiry || 0
  return user.premium === 1 && (expiry === 0 || expiry > Math.floor(Date.now() / 1000))
}

/** Active Priority 2+ Premium members can share contact details in chat. */
export function canShareContactInfo(user: {
  fake?: number | null
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
}): boolean {
  return user.fake === 1 || (isActivePremium(user) && (user.premiumPriority || 0) >= 2)
}

/** Active Priority 3+ Premium members can discuss financial help and payment details in chat. */
export function canShareFinancialInfo(user: {
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
}): boolean {
  return isActivePremium(user) && (user.premiumPriority || 0) >= 3
}

/** Error payload to send when contact info is detected in bio/name */
export const CONTACT_INFO_BIO_ERROR = {
  error: "Your bio cannot contain phone numbers, email addresses, social media handles, or links.",
  code: "contact_info_in_bio" as const,
}

/** Error payload for registration name field */
export const CONTACT_INFO_NAME_ERROR = {
  error: "Your display name cannot contain contact information.",
  code: "contact_info_in_name" as const,
}

/** Error payload for non-premium chat */
export const CONTACT_INFO_CHAT_ERROR = {
  error: "premium_required",
  message: "A Priority 2 Premium plan or higher is required to share contact details, social handles, or links in chat.",
  code: "contact_info_blocked" as const,
}

/** Error payload for financial-help and payment-detail sharing below Priority 3. */
export const FINANCIAL_INFO_CHAT_ERROR = {
  error: "premium_required",
  message: "A Priority 3 Premium plan or higher is required to discuss financial help or share payment details in chat.",
  code: "financial_info_blocked" as const,
}
