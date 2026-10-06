const CONFUSABLES: Record<string, string> = {
  // Common Cyrillic look-alikes.
  а: "a",
  ɑ: "a",
  е: "e",
  о: "o",
  р: "p",
  с: "c",
  ѕ: "s",
  х: "x",
  у: "y",
  і: "i",
  ı: "i",
  ј: "j",
  к: "k",
  м: "m",
  т: "t",
  в: "b",
  н: "h",
  ӏ: "l",
  // Common Greek look-alikes.
  α: "a",
  β: "b",
  ϲ: "c",
  ε: "e",
  ι: "i",
  κ: "k",
  ν: "v",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "y",
  χ: "x",
}

const LEET_SUBSTITUTIONS: Record<string, string> = {
  "@": "a",
  "4": "a",
  "3": "e",
  "€": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "$": "s",
  "5": "s",
  "7": "t",
  "8": "b",
  "6": "g",
  "9": "g",
}

const PAYMENT_METHOD_TERMS = [
  "pay pal",
  "venmo",
  "cash app",
  "cashapp",
  "zelle",
  "western union",
  "money gram",
  "transferwise",
  "wise account",
  "wise payment",
  "wise transfer",
  "wise app",
  "remitly",
  "world remit",
  "payoneer",
  "skrill",
  "neteller",
  "revolut",
  "m pesa",
  "airtel money",
  "mtn mobile money",
  "mobile money",
  "mobile wallet",
  "digital wallet",
  "bank transfer",
  "wire transfer",
  "bitcoin",
  "btc",
  "crypto wallet",
  "cryptocurrency wallet",
  "wallet address",
  "payment link",
  "payment handle",
  "payment tag",
]

const BANK_DETAIL_TERMS = [
  "bank detail",
  "bank details",
  "bank account",
  "account number",
  "account no",
  "account detail",
  "account details",
  "iban",
  "swift",
  "swift bic",
  "bic code",
  "routing number",
  "routing no",
  "sort code",
]

const PAYMENT_TERM_PATTERNS = [
  ...PAYMENT_METHOD_TERMS,
  ...BANK_DETAIL_TERMS,
].map(makeObfuscatedTermPattern)

// Match common direct requests and offers to cover expenses. These patterns
// require money-related wording rather than a generic mention of "help".
const FINANCIAL_EXPENSE =
  "(?:rent|bills?|fees|airtime|fare|school\\s+(?:fees|tuition|costs?|expenses?)|college\\s+(?:fees|tuition|costs?|expenses?)|university\\s+(?:fees|tuition|costs?|expenses?)|tuition|medical\\s+(?:costs?|bills?|expenses?)|treatment\\s+(?:costs?|expenses?))"
const MONEY_TERMS = "(?:money|cash|funds|financial\\s+(?:help|assistance)|(?:a\\s+)?loan)"
const MONEY_AMOUNT =
  "(?:[$€£]\\s*\\d+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?\\s*(?:dollars?|bucks?|usd|cad|aud|(?:kenyan\\s+)?shillings?|shs?|kshs?|kes|tshs?|tzs|ugx|ngn|naira|cedis?|ghs|rand|zar|pounds?|euros?))"
const MONEY_OR_EXPENSE = `(?:${MONEY_TERMS}|${FINANCIAL_EXPENSE})`
const MONEY_REQUEST_PATTERNS = [
  new RegExp(`\\b(?:send|transfer|lend|loan|pay|give|cover)\\s+(?:(?:me|my)\\s+)?(?:some\\s+)?${MONEY_OR_EXPENSE}\\b`, "i"),
  new RegExp(`\\b(?:send|transfer|lend|loan|pay|give)\\s+(?:me\\s+)?${MONEY_AMOUNT}\\b`, "i"),
  new RegExp(`\\b(?:give|send|transfer|pay)\\s+me\\s+(?:what|whatever)\\s+you\\s+can\\s+afford\\b`, "i"),
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

/**
 * Normalize common obfuscation classes while preserving word boundaries:
 * Unicode compatibility forms, combining marks, look-alike letters, and
 * frequent number/symbol substitutions. Punctuation becomes a separator so
 * inserted dots, underscores, or symbols cannot split a protected word.
 */
function normalizeFinancialText(text: string, mapLeet: boolean): string {
  const normalized = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
  const mapped = Array.from(normalized, (character) => {
    const lookalike = CONFUSABLES[character] ?? character
    return mapLeet ? (LEET_SUBSTITUTIONS[lookalike] ?? lookalike) : lookalike
  }).join("")

  return mapped
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * If a word is typed one letter at a time ("p a y p a l"), also check the
 * version with runs of single-letter tokens joined. Ordinary multi-letter
 * words and their spaces remain untouched.
 */
function joinSpelledOutLetters(text: string): string {
  // Also join a short word fragment followed by individually spaced letters,
  // such as "mo n e y", without merging normal multi-letter words.
  const fragmentsJoined = text.replace(
    /\b[a-z0-9]{1,3}(?:\s+[a-z0-9]){2,}\b/g,
    (run) => run.replace(/\s+/g, ""),
  )

  return fragmentsJoined.replace(
    /\b(?:[a-z0-9]\s+){2,}[a-z0-9]\b/g,
    (run) => run.replace(/\s+/g, ""),
  )
}

function makeObfuscatedTermPattern(term: string): RegExp {
  const compactTerm = term.replace(/[^a-z0-9]/gi, "").toLowerCase()
  const flexibleLetters = Array.from(compactTerm, (letter) => `${letter}+`)
    .join("\\s*")

  // Boundaries prevent short terms such as "btc" from matching inside an
  // unrelated word. Between letters, whitespace is optional and repeats are
  // accepted, covering separators and repeated-character evasion.
  return new RegExp(`(?:^|\\s)${flexibleLetters}(?=$|\\s)`, "i")
}

/**
 * Detects financial-help requests and off-platform payment details.
 *
 * Keep this matcher in the shared package so client hints, REST requests, and
 * WebSocket messages use exactly the same rules. No finite matcher can predict
 * every invented abbreviation, but this catches common separator, leetspeak,
 * Unicode-lookalike, single-letter-spacing, and repeated-letter variants.
 */
export function containsFinancialSharingInfo(text: string): boolean {
  if (!text || text.length < 3) return false

  const variants = new Set<string>([
    text,
    normalizeFinancialText(text, false),
    normalizeFinancialText(text, true),
  ])

  for (const variant of variants) {
    const joinedLetters = joinSpelledOutLetters(variant)
    const squeezed = joinedLetters.replace(/([a-z])\1+/g, "$1")

    if (
      PAYMENT_TERM_PATTERNS.some(
        (pattern) =>
          pattern.test(variant) ||
          pattern.test(joinedLetters) ||
          pattern.test(squeezed),
      )
    ) {
      return true
    }

    if (
      MONEY_REQUEST_PATTERNS.some(
        (pattern) =>
          pattern.test(variant) ||
          pattern.test(joinedLetters) ||
          pattern.test(squeezed),
      )
    ) {
      return true
    }
  }

  return false
}
