import assert from "node:assert/strict"
import test from "node:test"
import { containsFinancialSharingInfo } from "../src/index.ts"

test("blocks payment brands despite common spelling obfuscation", () => {
  const blocked = [
    "PayPal",
    "Pay Pal",
    "P.A.Y.P.A.L",
    "P A Y P A L",
    "P@yp@l",
    "P4yP4l",
    "Páypál",
    "раураl",
    "PAAyPALL",
    "W.E.S.T.E.R.N U.N.I.O.N",
    "W E S T E R N U N I O N",
    "we$tern union",
    "w3$tern un!0n",
    "western\u200bunion",
    "ＰａｙＰａｌ",
    "Money.Gram",
    "M-Pesa",
    "Cash_App",
    "Bank-Transfer",
  ]

  for (const message of blocked) {
    assert.equal(
      containsFinancialSharingInfo(message),
      true,
      `Expected payment term to be blocked: ${message}`,
    )
  }
})

test("blocks obfuscated borrowing and financial-help requests", () => {
  const blocked = [
    "Can I borrow money?",
    "Could you lend me $50?",
    "Please b.o.r.r.o.w some m0ney",
    "I need mo n e y urgently",
    "Help me pay my school fees",
    "Can you s3nd me c@sh?",
    "I can't afford my medical bills",
  ]

  for (const message of blocked) {
    assert.equal(
      containsFinancialSharingInfo(message),
      true,
      `Expected financial request to be blocked: ${message}`,
    )
  }
})

test("does not block ordinary conversation without a payment term or request", () => {
  const allowed = [
    "I had a lovely day at the beach.",
    "I paid my rent yesterday.",
    "Could you help me move this weekend?",
    "I like western movies and union history.",
    "The app is cash-flowing well.",
  ]

  for (const message of allowed) {
    assert.equal(
      containsFinancialSharingInfo(message),
      false,
      `Expected ordinary conversation to pass: ${message}`,
    )
  }
})
