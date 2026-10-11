import { createElement, type ReactNode } from "react"

export type LegalPageSlug = "terms" | "privacy"

export interface LegalPageDocument {
  slug: LegalPageSlug
  title: string
  content: string
  noIndex: boolean
  updatedAt: string | null
}

export const DEFAULT_LEGAL_PAGES: Record<LegalPageSlug, LegalPageDocument> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    noIndex: false,
    updatedAt: null,
    content: `## 1. Acceptance and the service

These Terms apply to your access to and use of Rich Dating Network, including its website and related services (the "Service"). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service. "Rich Dating Network Limited", "we", "us", and "our" refer to the provider of the Service.

## 2. Eligibility and accounts

The Service is for adults aged 18 or older. By registering, you confirm that you are at least 18 and that the information you provide is accurate and kept up to date. You are responsible for maintaining the security of your account and for activity carried out through it. Contact us promptly if you believe your account has been accessed without permission.

## 3. User conduct

Use the Service lawfully and respectfully. You must not harass, threaten, defraud, impersonate, exploit, or unlawfully contact another person; solicit money or financial information; publish unlawful or infringing content; scrape member data; use bots to access the Service; or interfere with its security or operation. We may investigate reports and restrict or remove content or accounts when appropriate.

## 4. User content

You retain any rights you have in content you submit. You give us permission to host, display, and process that content as reasonably necessary to operate, secure, and improve the Service. You confirm that you have the rights needed to submit it and that it does not violate another person's rights or applicable law.

## 5. Paid features, subscriptions, and credits

Some features require payment, a subscription, or credits. Prices, billing intervals, renewal terms, cancellation instructions, and applicable refund rules are provided at the point of purchase. Credits are for use within the Service and are not cash unless applicable law requires otherwise. Payment processing may be handled by third-party providers under their own terms. Nothing in these Terms limits rights that cannot legally be waived, including mandatory consumer refund or cancellation rights.

## 6. Safety and member interactions

You are responsible for your interactions with other users and should use caution when sharing information or meeting someone in person. We may provide reporting and verification tools, but a verification badge or profile information is not a guarantee of identity, safety, or accuracy. We do not guarantee that a profile is genuine or that the Service will produce a particular outcome.

## 7. Content

Certain content and interactions on the Service are provided for entertainment purposes. Some profiles, profile details, images, messages, or other interactions may be fictitious, simulated, AI-generated, or operated or assisted by our staff, moderators, or automated systems. A profile or message may not represent a real member personally communicating with you, and it is not a promise that you will meet someone, form a relationship, or receive a response from a real person.

## 8. Availability and liability

We work to keep the Service available but do not promise uninterrupted or error-free operation. To the extent permitted by applicable law, the Service is provided without warranties that cannot be excluded by law. Nothing in these Terms excludes liability that cannot legally be excluded, including liability for fraud, intentional misconduct, or legally protected consumer rights.

## 9. Suspension and account closure

You may stop using the Service and request account deletion through the available account settings or by contacting support. We may suspend or close an account for a serious or repeated breach of these Terms, security concerns, or where required by law. Data handling after closure is described in the Privacy Policy and remains subject to applicable retention obligations.

## 10. Changes and applicable law

We may update these Terms and will post the current version here. Where required, we will give notice of material changes or obtain renewed consent. These Terms are governed by applicable law, subject to any mandatory consumer rights that apply in your place of residence.

## 11. Contact

For questions about these Terms, contact support@richdatingnetwork.com or use the Contact page on the Service.`,
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    noIndex: false,
    updatedAt: null,
    content: `## 1. About this policy

This policy describes how Rich Dating Network Limited ("we", "us", or "our") may collect, use, and share information when you use the Service. It applies to the website and related services.

## 2. Information we may collect

Depending on how you use the Service, information may include:

- Account and contact details, such as your name, email address, username, and phone number.
- Profile details, such as age or date of birth, photos, biography, preferences, and location information you provide.
- Messages, reports, support requests, and other content you submit or exchange through the Service.
- Transaction details and purchase history. Payment processing may be handled by third-party providers; the information we receive depends on the payment method you use.
- Technical and usage information, such as IP address, device and browser details, log data, and how you interact with the Service.
- Cookie and analytics information. If enabled, this may include information collected through services such as Google Analytics or Microsoft Clarity, subject to your consent choices where required.

## 3. How information may be used

Information may be used to create and manage accounts, provide profiles and messaging, process purchases, respond to support requests, protect users and the Service, detect fraud or abuse, understand service performance, send service communications, and comply with legal obligations. We send marketing communications as permitted by law, and you can opt out using the instructions in those communications.

## 4. Profiles, messages, and moderation

Profile information you choose to make visible may be shown to other members according to the Service's features and settings. Messages are not public by default, but may be accessed by authorized staff or moderators when needed for safety, support, service operation, or legal compliance. Some profiles or interactions may be fictional, simulated, or staff- or automated-system-assisted, as explained in the Terms of Service.

## 5. When information may be shared

Information may be shared with other members as part of the features you use; with hosting, payment, communications, analytics, and other service providers that help operate the Service; when needed to protect users or the Service; when required by law; or as part of a business transfer. These providers may process information on our behalf under their own privacy terms.

## 6. Cookies and analytics

The Service may use necessary storage to support login and core features, and may use analytics or similar tools to understand usage. Where required, we will ask for consent before using non-essential cookies or tracking tools. You can also manage cookies in your browser, though disabling necessary cookies may affect the Service.

## 7. Retention and security

Information is retained for as long as needed for the purposes described here, and longer where required or permitted by law. Retention periods may differ by data type and purpose. We use safeguards intended to protect information, but no method of storage or transmission can be guaranteed completely secure.

## 8. Your choices and rights

Depending on where you live, you may be able to request access to, correction of, deletion of, or a copy of your personal information, or object to or restrict certain processing. You may also withdraw consent where processing is based on consent. Contact privacy@richdatingnetwork.com to make a request. We may need to verify your identity before acting on a request.

## 9. International processing

Information may be processed in countries other than your own. Where required, we use appropriate safeguards for international transfers.

## 10. Children

The Service is intended for adults aged 18 and older and is not directed to children. If you believe a person under 18 has provided information to the Service, contact support so the operator can review and take appropriate action.

## 11. Updates and contact

We may update this policy and will post the current version here. Where required, we will give notice of material changes. For privacy questions or requests, contact privacy@richdatingnetwork.com or use the Contact page on the Service.`,
  },
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pieces = text.split(/(\*\*.*?\*\*)/g)
  return pieces.map((piece, index) =>
    piece.startsWith("**") && piece.endsWith("**")
      ? createElement("strong", { key: `${keyPrefix}-${index}` }, piece.slice(2, -2))
      : piece
  )
}

export function renderLegalContent(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let list: { type: "ul" | "ol"; items: string[] } | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    const text = paragraph.join(" ").trim()
    if (text) blocks.push(createElement("p", { key: `p-${blocks.length}` }, renderInline(text, `p-${blocks.length}`)))
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    const ListTag = list.type
    blocks.push(createElement(
      ListTag,
      { key: `list-${blocks.length}` },
      list.items.map((item, index) => createElement("li", { key: index }, renderInline(item, `list-${blocks.length}-${index}`)))
    ))
    list = null
  }

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const Tag = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h2" : "h3"
      blocks.push(createElement(Tag, { key: `h-${index}` }, renderInline(heading[2], `h-${index}`)))
      continue
    }

    const unordered = line.match(/^[-*]\s+(.+)$/)
    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      flushParagraph()
      const type = unordered ? "ul" : "ol"
      if (list && list.type !== type) flushList()
      if (!list) list = { type, items: [] }
      list.items.push((unordered || ordered)![1])
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushParagraph()
  flushList()
  return blocks
}
