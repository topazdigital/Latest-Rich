import { createHmac, randomBytes } from "crypto"

const SECRET = process.env.JWT_SECRET || "rdn-secret-key-change-in-prod"

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export function signToken(payload: object): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }))
  const sig = base64url(createHmac("sha256", SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${sig}`
}

export function verifyToken(token: string): any | null {
  try {
    const [header, body, sig] = token.split(".")
    const expected = base64url(createHmac("sha256", SECRET).update(`${header}.${body}`).digest())
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(body, "base64").toString())
  } catch {
    return null
  }
}
