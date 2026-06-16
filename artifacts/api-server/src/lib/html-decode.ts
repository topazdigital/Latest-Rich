/**
 * Server-side HTML entity decoder (no DOM required).
 * Used to clean up text migrated from the old PHP site which ran htmlspecialchars()
 * before storing values in the database.
 */
export function decodeHtml(str: string | null | undefined): string {
  if (!str) return str ?? ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

/** Decode HTML entities AND strip all HTML tags — safe for plain-text contexts. */
export function decodeHtmlStrip(str: string | null | undefined): string {
  return decodeHtml(str).replace(/<[^>]*>/g, '')
}
