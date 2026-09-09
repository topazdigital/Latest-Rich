/**
 * Client-side hint for the server's contact-info moderation rule.
 *
 * The server remains authoritative. This is only used to show the upgrade
 * prompt before a send and to keep the prompt visible after a rejection.
 */
export const CONTACT_INFO_PATTERN =
  /(?:[\w.+-]+@[\w-]+\.[a-z]{2,}|\+?\d[\d\s().-]{5,}\d|\d(?:\.\d){5,}|(?:instagram|insta|ig|whatsapp|whats\s*app|wa\b|telegram|tg\b|t\.me|snapchat|snap\b|facebook|fb|twitter|x\.com|tiktok|wechat|we\s*chat|line\b|kik\b|skype|discord|viber|signal|linktree|onlyfans|imo\b|zalo|bbm|hangouts?)\s*[:=@\/\-\s]*[\w.@+-]{2,}|@[\w.]{3,}|https?:\/\/[^\s]{4,}|www\.[a-z0-9-]{2,}\.[a-z]{2,}|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|me|app|link|ly|to|gg|tv)\b)/i

export function canShareContactInfo(user: {
  fake?: number | null
  premium?: number | null
  premiumPriority?: number | null
} | null | undefined): boolean {
  return user?.fake === 1 || (user?.premium === 1 && (user?.premiumPriority || 0) >= 2)
}