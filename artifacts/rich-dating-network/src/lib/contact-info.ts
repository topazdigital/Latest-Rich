/**
 * Client-side hint for the server's contact-info moderation rule.
 *
 * The server remains authoritative. This is only used to show the upgrade
 * prompt before a send and to keep the prompt visible after a rejection.
 */
import { containsFinancialSharingInfo } from "@workspace/financial-content"

export const CONTACT_INFO_PATTERN =
  /(?:[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s().-]{5,}\d|\d(?:\.\d){5,}|(?:instagram|insta|ig|whatsapp|whats\s*app|wa\b|telegram|tg\b|t\.me|snapchat|snap\b|facebook|fb|twitter|x\.com|tiktok|wechat|we\s*chat|line\b|kik\b|skype|discord|viber|signal|linktree|onlyfans|imo\b|zalo|bbm|hangouts?)\s*[:=@\/\-\s]*[\w.@+-]{2,}|@[\w.]{3,}|https?:\/\/[^\s]{4,}|www\.[a-z0-9-]{2,}\.[a-z]{2,}|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|me|app|link|ly|to|gg|tv)\b)/i

/** Shared copy shown when a member without Priority 3+ hits the financial-content gate. */
export const FINANCIAL_INFO_UPGRADE_MESSAGE =
  "To help protect members from money-request scams, borrowing or lending money and sharing payment details in chat requires an active Priority 3+ Premium plan."

/** Client-side hint uses the same matcher as REST and WebSocket enforcement. */
export const containsFinancialInfo = containsFinancialSharingInfo

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